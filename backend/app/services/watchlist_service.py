from decimal import Decimal
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ErrorDetail
from app.crud import product_crud, notification_crud, tracked_product_crud, user_crud
from app.helper.amazon_link_parser import parse_amazon_link
from app.helper.rapidapi_client import rapidapi_client
from app.models.product_model import Product as ProductModel
from app.models.user_model import User
from app.schemas.notification_schema import NotificationKind
from app.schemas.watchlist_schema import (
    PriceDataPoint,
    PriceHistoryResponse,
    Product,
    ProductCreate,
    ProductList,
)
from app.services.notification_service import enqueue_price_email


WATCHLIST_LIMIT_REACHED = ErrorDetail(
    "WATCHLIST_LIMIT_REACHED", 400, "You can track at most 10 products."
)
INVALID_PRODUCT_LINK = ErrorDetail(
    "INVALID_PRODUCT_LINK", 400, "A supported product link with a product ID is required."
)
MARKETPLACE_PRODUCT_MISMATCH = ErrorDetail(
    "MARKETPLACE_PRODUCT_MISMATCH", 502, "Marketplace returned a different product than requested."
)
TRACKING_NOT_FOUND = ErrorDetail(
    "TRACKING_NOT_FOUND", 404, "Sản phẩm không nằm trong danh sách theo dõi của người dùng này."
)
DUPLICATE_TRACKING = ErrorDetail(
    "PRODUCT_ALREADY_TRACKED", 409, "This product is already in your watchlist."
)
INVALID_TARGET_PRICE = ErrorDetail(
    "INVALID_TARGET_PRICE", 400, "Target must be lower than the current price."
)


class WatchlistService:
    MIN_DAYS_FOR_ASSESSMENT = 7

    async def list_products(self, db: AsyncSession, user: User) -> ProductList:
        rows = await tracked_product_crud.list_with_product_statistics(db, user.id)
        products = [
            self._to_summary_response(
                product=row[0],
                target_price=row[1],
                buy_when_good=row[2],
                distinct_days=row[3],
                median_price=row[4],
            )
            for row in rows
        ]
        return ProductList(total=len(products), products=products)

    async def get_product(
        self, db: AsyncSession, user: User, product_id: int
    ) -> Product:
        row = await tracked_product_crud.get_with_product_statistics(
            db, user.id, product_id
        )
        if row is None:
            raise TRACKING_NOT_FOUND.throw()

        return self._to_summary_response(
            product=row[0],
            target_price=row[1],
            buy_when_good=row[2],
            distinct_days=row[3],
            median_price=row[4],
        )

    async def add_product(
        self, db: AsyncSession, user: User, request: ProductCreate
    ) -> Product:
        """Add one product to a user's watchlist, keeping product writes atomic."""
        try:
            # Serialize additions for this user so concurrent requests cannot pass BR8 together.
            locked_user = await user_crud.get_by_id(db, user.id, for_update=True)
            if locked_user is None:
                raise ErrorDetail("USER_NOT_FOUND", 404, "User not found.").throw()

            parsed_link = await parse_amazon_link(request.url)
            if not parsed_link.asin:
                raise INVALID_PRODUCT_LINK.throw()

            product = await product_crud.get_by_marketplace_id(
                db, "amazon", parsed_link.asin, for_update=True
            )
            tracking = (
                await tracked_product_crud.get(db, user.id, product.id) if product is not None else None
            )
            if tracking is not None:
                raise DUPLICATE_TRACKING.throw()

            if await tracked_product_crud.count_for_user(db, user.id) >= 10:
                raise WATCHLIST_LIMIT_REACHED.throw()

            within_reuse_grace = False
            if product is not None and product.tracked_by_count == 0 and product.untracked_since is not None:
                untracked_since = product.untracked_since
                if untracked_since.tzinfo is None:
                    untracked_since = untracked_since.replace(tzinfo=timezone.utc)
                within_reuse_grace = datetime.now(timezone.utc) - untracked_since < timedelta(
                    days=self.MIN_DAYS_FOR_ASSESSMENT
                )

            if product is None or (product.tracked_by_count == 0 and not within_reuse_grace):
                item = await rapidapi_client.fetch_product(parsed_link.asin, country="US")
                if item.external_id != parsed_link.asin:
                    raise MARKETPLACE_PRODUCT_MISMATCH.throw()
                item = item.model_copy(update={"url": parsed_link.url})

                if product is None:
                    product = await product_crud.create_with_first_price(db, "amazon", item)
                else:
                    product = await product_crud.refresh_untracked(db, product, item)
            elif within_reuse_grace:
                await product_crud.clear_untracked(db, product)

            tracking = await tracked_product_crud.create(
                db,
                user_id=user.id,
                product_id=product.id,
                target_price=request.target_price,
                buy_when_good=request.buy_when_good,
            )
            if request.target_price is not None:
                await notification_crud.create(
                    db,
                    user_id=user.id,
                    product_id=product.id,
                    kind="target_price_set",
                    title="Đã lưu giá mục tiêu",
                    message=(
                        f"Đã đặt giá mục tiêu cho {product.name}: "
                        f"{request.target_price} {product.currency}."
                    ),
                )
            await product_crud.increment_tracked_count(db, product)
            await db.commit()
            await db.refresh(product)
            rows = await tracked_product_crud.list_with_product_statistics(db, user.id)
            row = next((row for row in rows if row[0].id == product.id), None)
            if row is None:
                return self._to_summary_response(
                    product,
                    tracking.target_price,
                    tracking.buy_when_good,
                    0,
                    None,
                )
            return self._to_summary_response(
                product=row[0],
                target_price=row[1],
                buy_when_good=row[2],
                distinct_days=row[3],
                median_price=row[4],
            )
        except Exception:
            await db.rollback()
            raise

    async def remove_product(self, db: AsyncSession, user: User, product_id: int) -> None:
        try:
            product = await product_crud.get_by_id(db, product_id, for_update=True)
            if product is None:
                raise TRACKING_NOT_FOUND.throw()

            tracking = await tracked_product_crud.get(
                db, user.id, product_id, for_update=True
            )
            if tracking is None:
                raise TRACKING_NOT_FOUND.throw()

            await tracked_product_crud.delete(db, tracking)
            await product_crud.decrement_tracked_count_or_untrack(db, product)
            await db.commit()
        except Exception:
            await db.rollback()
            raise

    async def update_target_price(
        self,
        db: AsyncSession,
        user: User,
        product_id: int,
        target_price: Decimal,
    ) -> Product:
        try:
            product = await product_crud.get_by_id(db, product_id)
            if product is None:
                raise TRACKING_NOT_FOUND.throw()

            tracking = await tracked_product_crud.get(
                db, user.id, product_id, for_update=True
            )
            if tracking is None:
                raise TRACKING_NOT_FOUND.throw()

            if target_price >= product.current_price:
                raise INVALID_TARGET_PRICE.throw(
                    f"Target must be lower than the current price {product.current_price} {product.currency}"
                )

            await tracked_product_crud.update_target_price(db, tracking, target_price)

            await notification_crud.create(
                db,
                user_id=user.id,
                product_id=product.id,
                kind="target_price_set",
                title="Đã lưu giá mục tiêu",
                message=(
                    f"Đã đặt giá mục tiêu cho {product.name}: "
                    f"{target_price} {product.currency}."
                ),
            )

            await enqueue_price_email(
                db,
                user_id=user.id,
                kind=NotificationKind.TARGET_PRICE_SET.value,
                product_name=product.name,
                current_price=product.current_price,
                currency=product.currency,
                product_url=product.url,
                target_price=target_price,
            )

            await db.commit()
            await db.refresh(product)

            rows = await tracked_product_crud.list_with_product_statistics(db, user.id)
            row = next((row for row in rows if row[0].id == product.id), None)
            if row is None:
                return self._to_summary_response(
                    product,
                    tracking.target_price,
                    tracking.buy_when_good,
                    0,
                    None,
                )
            return self._to_summary_response(
                product=row[0],
                target_price=row[1],
                buy_when_good=row[2],
                distinct_days=row[3],
                median_price=row[4],
            )
        except Exception:
            await db.rollback()
            raise

    @classmethod
    def _to_summary_response(
        cls,
        product: ProductModel,
        target_price,
        buy_when_good: bool,
        distinct_days: int,
        median_price: Decimal | None,
    ) -> Product:
        enough_data = distinct_days >= cls.MIN_DAYS_FOR_ASSESSMENT
        price_label = None
        fake_discount = False
        fake_discount_percent = None

        if enough_data and median_price is not None:
            current_price = Decimal(product.current_price)
            lowest_price = Decimal(product.price_low)
            median_price = Decimal(median_price)

            if current_price <= lowest_price * Decimal("1.05"):
                price_label = "Good price"
            elif current_price > median_price * Decimal("1.10"):
                price_label = "Expensive - wait"
            else:
                price_label = "Normal"

            has_marketplace_discount = (
                product.original_price is not None
                and Decimal(product.original_price) > current_price
            )
            if has_marketplace_discount and current_price > median_price * Decimal("1.10"):
                fake_discount = True
                fake_discount_percent = (
                    (current_price - median_price) / median_price * Decimal("100")
                ).quantize(Decimal("0.01"))

        if not enough_data:
            price_label = "Not enough data to assess"

        # Shop trust label logic (BR10)
        shop_rating = getattr(product, "shop_rating", None) or product.product_rating
        shop_review_count = getattr(product, "shop_review_count", None) or product.review_count
        shop_trust_label = None
        if shop_rating is not None and shop_review_count is not None:
            r = Decimal(str(shop_rating))
            c = int(shop_review_count)
            if r >= Decimal("4.7") and c >= 500:
                shop_trust_label = "Trusted"
            elif r < Decimal("4.3") or c < 50:
                shop_trust_label = "Risky: few ratings"
            else:
                shop_trust_label = "Needs caution"

        top_reviews = (getattr(product, "top_reviews", None) or [])[:5]

        return Product(
            id=product.id,
            name=product.name,
            product_name=product.name,
            url=product.url,
            image_url=product.image_url,
            marketplace=product.marketplace,
            brand=product.brand,
            shop_name=product.shop_name,
            shop_rating=getattr(product, "shop_rating", None),
            shop_review_count=getattr(product, "shop_review_count", None),
            shop_trust_label=shop_trust_label,
            product_rating=product.product_rating,
            review_count=product.review_count,
            current_price=product.current_price,
            original_price=product.original_price,
            currency=product.currency,
            in_stock=product.in_stock,
            price_low=product.price_low,
            price_high=product.price_high,
            target_price=target_price,
            buy_when_good=buy_when_good,
            price_label=price_label,
            fake_discount=fake_discount,
            fake_discount_percent=fake_discount_percent,
            top_reviews=top_reviews,
        )

    async def get_price_history(
        self,
        db: AsyncSession,
        user: User,
        product_id: int,
        *,
        days: int = 7,
        gap_threshold_minutes: int = 30,
    ) -> PriceHistoryResponse:
        tracking = await tracked_product_crud.get(db, user.id, product_id)
        if tracking is None:
            raise TRACKING_NOT_FOUND.throw()

        # 1. Tính tổng số ngày dương lịch riêng biệt đã theo dõi (BR3, BR5)
        tracked_days = await product_crud.get_history_distinct_days(db, product_id)

        # 2. Lấy dữ liệu trong khung thời gian yêu cầu (mặc định 7 ngày gần nhất)
        since = datetime.now(timezone.utc) - timedelta(days=days) if days > 0 else None
        records = await product_crud.get_price_history(db, product_id, since=since)

        if not records:
            return PriceHistoryResponse(
                min_price=None,
                max_price=None,
                tracked_days=tracked_days,
                data_points=[],
            )

        # 3. Tính min_price và max_price trong khung thời gian biểu đồ
        min_price = min(r.price for r in records)
        max_price = max(r.price for r in records)

        # 4. Thuật toán phát hiện Gap (BR15)
        gap_threshold = timedelta(minutes=gap_threshold_minutes)
        data_points: list[PriceDataPoint] = []

        for i, record in enumerate(records):
            is_gap = False
            if i > 0:
                dt_curr = (
                    record.recorded_at
                    if record.recorded_at.tzinfo is not None
                    else record.recorded_at.replace(tzinfo=timezone.utc)
                )
                dt_prev = (
                    records[i - 1].recorded_at
                    if records[i - 1].recorded_at.tzinfo is not None
                    else records[i - 1].recorded_at.replace(tzinfo=timezone.utc)
                )
                interval = dt_curr - dt_prev
                if interval > gap_threshold:
                    is_gap = True

            data_points.append(
                PriceDataPoint(
                    price=record.price,
                    timestamp=record.recorded_at,
                    is_gap=is_gap,
                )
            )

        return PriceHistoryResponse(
            min_price=min_price,
            max_price=max_price,
            tracked_days=tracked_days,
            data_points=data_points,
        )


watchlist_service = WatchlistService()

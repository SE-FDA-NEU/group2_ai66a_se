from decimal import Decimal
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ErrorDetail
from app.crud import product_crud, notification_crud, tracked_product_crud, user_crud
from app.helper.amazon_link_parser import parse_amazon_link
from app.helper.rapidapi_client import rapidapi_client
from app.services.exchange_rate_service import exchange_rate_service
from app.models.product_model import Product as ProductModel
from app.models.user_model import User
from app.schemas.watchlist_schema import (
    PriceDataPoint,
    PriceHistoryResponse,
    Product,
    ProductCreate,
    ProductList,
)


WATCHLIST_LIMIT_REACHED = ErrorDetail(
    "WATCHLIST_LIMIT_REACHED", 400, "Bạn chỉ có thể theo dõi tối đa 10 sản phẩm."
)
INVALID_PRODUCT_LINK = ErrorDetail(
    "INVALID_PRODUCT_LINK", 400, "Cần có một liên kết sản phẩm hợp lệ kèm mã sản phẩm."
)
MARKETPLACE_PRODUCT_MISMATCH = ErrorDetail(
    "MARKETPLACE_PRODUCT_MISMATCH", 502, "Sàn thương mại điện tử trả về sản phẩm khác với yêu cầu."
)
TRACKING_NOT_FOUND = ErrorDetail(
    "TRACKING_NOT_FOUND", 404, "Sản phẩm không nằm trong danh sách theo dõi của người dùng này."
)
DUPLICATE_TRACKING = ErrorDetail(
    "PRODUCT_ALREADY_TRACKED", 409, "Sản phẩm này đã có trong danh sách theo dõi của bạn."
)
INVALID_TARGET_PRICE = ErrorDetail(
    "INVALID_TARGET_PRICE", 400, "Giá mục tiêu phải thấp hơn giá hiện tại."
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
                raise ErrorDetail("USER_NOT_FOUND", 404, "Không tìm thấy người dùng.").throw()

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

            is_demo = product is not None and (
                str(product.marketplace) == "demo"
                or str(product.external_id).startswith(("DEMO-", "SEED-"))
            )

            within_reuse_grace = False
            if product is not None and product.tracked_by_count == 0 and product.untracked_since is not None:
                untracked_since = product.untracked_since
                if untracked_since.tzinfo is None:
                    untracked_since = untracked_since.replace(tzinfo=timezone.utc)
                within_reuse_grace = datetime.now(timezone.utc) - untracked_since < timedelta(
                    days=self.MIN_DAYS_FOR_ASSESSMENT
                )

            should_fetch_marketplace = not is_demo and (
                product is None or (product.tracked_by_count == 0 and not within_reuse_grace)
            )

            if should_fetch_marketplace:
                item = await rapidapi_client.fetch_product(parsed_link.asin, country="US")
                if item.external_id != parsed_link.asin:
                    raise MARKETPLACE_PRODUCT_MISMATCH.throw()
                item = item.model_copy(update={"url": parsed_link.url})
                item = await exchange_rate_service.convert_marketplace_product_to_vnd(item)

                if product is None:
                    product = await product_crud.create_with_first_price(db, "amazon", item)
                else:
                    product = await product_crud.refresh_untracked(db, product, item)
            elif product is not None:
                if within_reuse_grace or product.untracked_since is not None:
                    await product_crud.clear_untracked(db, product)

            normalized_target_price = None
            if request.target_price is not None:
                normalized_target_price = round(Decimal(str(request.target_price)))
                if normalized_target_price >= product.current_price:
                    formatted_curr = (
                        f"{int(product.current_price):,} ₫".replace(",", ".")
                        if str(product.currency).upper() == "VND"
                        else f"{product.current_price} {product.currency}"
                    )
                    raise INVALID_TARGET_PRICE.throw(
                        f"Giá mục tiêu phải thấp hơn giá hiện tại ({formatted_curr})."
                    )

            tracking = await tracked_product_crud.create(
                db,
                user_id=user.id,
                product_id=product.id,
                target_price=normalized_target_price,
                buy_when_good=request.buy_when_good,
            )
            if normalized_target_price is not None:
                if str(product.currency).upper() == "VND":
                    formatted_target = f"{int(normalized_target_price):,} ₫".replace(",", ".")
                elif str(product.currency).upper() == "USD":
                    vnd_equiv = round(normalized_target_price * Decimal("26000"))
                    formatted_target = f"{vnd_equiv:,.0f} ₫ ({normalized_target_price:.2f} USD)".replace(",", ".")
                else:
                    formatted_target = f"{normalized_target_price:.0f} {product.currency}"
                await notification_crud.create(
                    db,
                    user_id=user.id,
                    product_id=product.id,
                    kind="target_price_set",
                    title="Đã lưu giá mục tiêu",
                    message=(
                        f"Đã đặt giá mục tiêu cho {product.name}: "
                        f"{formatted_target}."
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
            await notification_crud.delete_for_user_product(db, user.id, product_id)
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

            normalized_target_price = round(Decimal(str(target_price)))
            if normalized_target_price >= product.current_price:
                formatted_curr = (
                    f"{int(product.current_price):,} ₫".replace(",", ".")
                    if str(product.currency).upper() == "VND"
                    else f"{product.current_price} {product.currency}"
                )
                raise INVALID_TARGET_PRICE.throw(
                    f"Giá mục tiêu phải thấp hơn giá hiện tại ({formatted_curr})."
                )

            await tracked_product_crud.update_target_price(db, tracking, normalized_target_price)

            if str(product.currency).upper() == "VND":
                formatted_target = f"{int(normalized_target_price):,} ₫".replace(",", ".")
            elif str(product.currency).upper() == "USD":
                vnd_equiv = round(normalized_target_price * Decimal("26000"))
                formatted_target = f"{vnd_equiv:,.0f} ₫ ({normalized_target_price:.2f} USD)".replace(",", ".")
            else:
                formatted_target = f"{normalized_target_price:.0f} {product.currency}"
            await notification_crud.create(
                db,
                user_id=user.id,
                product_id=product.id,
                kind="target_price_set",
                title="Đã lưu giá mục tiêu",
                message=(
                    f"Đã đặt giá mục tiêu cho {product.name}: "
                    f"{formatted_target}."
                ),
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
        shop_rating = getattr(product, "shop_rating", None)
        if shop_rating is None:
            shop_rating = product.product_rating
        shop_review_count = getattr(product, "shop_review_count", None)
        if shop_review_count is None:
            shop_review_count = product.review_count
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
        hours: float | None = None,
        gap_threshold_minutes: int = 30,
    ) -> PriceHistoryResponse:
        tracking = await tracked_product_crud.get(db, user.id, product_id)
        if tracking is None:
            raise TRACKING_NOT_FOUND.throw()

        # 1. Tính tổng số ngày dương lịch riêng biệt đã theo dõi (BR3, BR5)
        tracked_days = await product_crud.get_history_distinct_days(db, product_id)

        # 2. Lấy dữ liệu trong khung thời gian yêu cầu (hỗ trợ theo giờ hoặc ngày)
        if hours is not None and hours > 0:
            since = datetime.now(timezone.utc) - timedelta(hours=hours)
        elif days > 0:
            since = datetime.now(timezone.utc) - timedelta(days=days)
        else:
            since = None
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

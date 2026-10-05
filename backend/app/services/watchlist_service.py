from decimal import Decimal
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ErrorDetail
from app.crud.product_crud import product_crud
from app.crud.tracked_product_crud import tracked_product_crud
from app.helper.amazon_link_parser import parse_amazon_link
from app.helper.rapidapi_client import rapidapi_client
from app.models.product_model import Product as ProductModel
from app.models.user_model import User
from app.schemas.watchlist_schema import ProductList, Product, ProductCreate


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

    async def add_product(
        self, db: AsyncSession, user: User, request: ProductCreate
    ) -> Product:
        """Add one product to a user's watchlist, keeping product writes atomic."""
        try:
            # Serialize additions for this user so concurrent requests cannot pass BR8 together.
            locked_user = await db.scalar(select(User).where(User.id == user.id).with_for_update())
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
                product.untracked_since = None

            tracking = await tracked_product_crud.create(
                db,
                user_id=user.id,
                product_id=product.id,
                target_price=request.target_price,
                buy_when_good=request.buy_when_good,
            )
            product.tracked_by_count += 1
            db.add(product)
            await db.commit()
            await db.refresh(product)
            return self._to_response(product, tracking)
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

            await db.delete(tracking)
            await db.flush()
            product.tracked_by_count -= 1
            if product.tracked_by_count == 0:
                product.untracked_since = func.now()
            db.add(product)
            await db.commit()
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    def _to_response(product: ProductModel, tracking) -> Product:
        return Product(
            id=product.id,
            name=product.name,
            url=product.url,
            image_url=product.image_url,
            marketplace=product.marketplace,
            brand=product.brand,
            shop_name=product.shop_name,
            product_rating=product.product_rating,
            review_count=product.review_count,
            current_price=product.current_price,
            original_price=product.original_price,
            currency=product.currency,
            in_stock=product.in_stock,
            price_low=product.price_low,
            price_high=product.price_high,
            target_price=tracking.target_price,
            buy_when_good=tracking.buy_when_good,
        )

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

        return Product(
            id=product.id,
            name=product.name,
            url=product.url,
            image_url=product.image_url,
            marketplace=product.marketplace,
            brand=product.brand,
            shop_name=product.shop_name,
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
        )


watchlist_service = WatchlistService()

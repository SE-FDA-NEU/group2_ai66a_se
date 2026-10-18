from datetime import datetime
from decimal import Decimal

from sqlalchemy import Date, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product_model import PriceHistory, Product
from app.schemas.watchlist_schema import ProductMarketplace


class CRUDProduct:
    async def get_by_id(
        self, db: AsyncSession, product_id: int, *, for_update: bool = False
    ) -> Product | None:
        statement = select(Product).where(Product.id == product_id)
        if for_update:
            statement = statement.with_for_update()
        if hasattr(db, "scalar"):
            return await db.scalar(statement)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_marketplace_id(
        self, db: AsyncSession, marketplace: str, external_id: str, *, for_update: bool = False
    ) -> Product | None:
        statement = select(Product).where(
            Product.marketplace == marketplace,
            Product.external_id == external_id,
        )
        if for_update:
            statement = statement.with_for_update()
        if hasattr(db, "scalar"):
            return await db.scalar(statement)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create_with_first_price(
        self, db: AsyncSession, marketplace: str, item: ProductMarketplace
    ) -> Product:
        product = Product(
            marketplace=marketplace,
            external_id=item.external_id,
            url=item.url,
            name=item.name,
            image_url=item.image_url,
            brand=item.brand,
            shop_name=item.shop_name,
            product_rating=item.product_rating,
            review_count=item.review_count,
            current_price=item.current_price,
            original_price=item.original_price,
            currency=item.currency,
            in_stock=item.in_stock,
            top_reviews=item.top_reviews,
            tracked_by_count=0,
            price_low=item.current_price,
            price_high=item.current_price,
            untracked_since=None,
        )
        db.add(product)
        await db.flush()
        db.add(PriceHistory(product_id=product.id, price=item.current_price))
        await db.flush()
        return product

    async def refresh_untracked(
        self, db: AsyncSession, product: Product, item: ProductMarketplace
    ) -> Product:
        product.url = item.url
        product.name = item.name
        product.image_url = item.image_url
        product.brand = item.brand
        product.shop_name = item.shop_name
        product.product_rating = item.product_rating
        product.review_count = item.review_count
        product.current_price = item.current_price
        product.original_price = item.original_price
        product.currency = item.currency
        product.in_stock = item.in_stock
        product.top_reviews = item.top_reviews
        product.price_low = min(Decimal(product.price_low), item.current_price)
        product.price_high = max(Decimal(product.price_high), item.current_price)
        product.last_refreshed_at = func.now()
        product.untracked_since = None
        db.add(product)
        db.add(PriceHistory(product_id=product.id, price=item.current_price))
        await db.flush()
        return product

    async def delete_expired_untracked(
        self, db: AsyncSession, cutoff: datetime
    ) -> list[int]:
        """Xóa vĩnh viễn các sản phẩm có 0 người theo dõi và đã quá thời hạn ân hạn (7 ngày)."""
        statement = (
            select(Product.id)
            .where(
                Product.tracked_by_count == 0,
                Product.untracked_since.is_not(None),
                Product.untracked_since <= cutoff,
            )
            .with_for_update()
        )
        result = await db.scalars(statement)
        expired_ids = list(result)
        if not expired_ids:
            return []

        await db.execute(delete(Product).where(Product.id.in_(expired_ids)))
        await db.commit()
        return expired_ids

    async def get_active_product_ids(self, db: AsyncSession) -> list[int]:
        """Lấy danh sách ID của các sản phẩm đang được theo dõi ít nhất bởi 1 người dùng."""
        statement = (
            select(Product.id)
            .where(Product.tracked_by_count > 0)
            .order_by(Product.id)
        )
        result = await db.scalars(statement)
        return list(result)

    async def record_price_snapshot(
        self, db: AsyncSession, product: Product, item: ProductMarketplace
    ) -> Product:
        """Cập nhật thông tin chi tiết và ghi lại một snapshot giá mới vào lịch sử."""
        product.url = item.url
        product.name = item.name
        product.image_url = item.image_url
        product.brand = item.brand
        product.shop_name = item.shop_name
        product.product_rating = item.product_rating
        product.review_count = item.review_count
        product.current_price = item.current_price
        product.original_price = item.original_price
        product.currency = item.currency
        product.in_stock = item.in_stock
        product.top_reviews = item.top_reviews
        product.price_low = min(Decimal(product.price_low), item.current_price)
        product.price_high = max(Decimal(product.price_high), item.current_price)
        product.last_refreshed_at = func.now()
        db.add(product)
        db.add(PriceHistory(product_id=product.id, price=item.current_price))
        await db.flush()
        return product

    async def increment_tracked_count(self, db: AsyncSession, product: Product) -> Product:
        """Tăng số lượng người theo dõi sản phẩm."""
        product.tracked_by_count += 1
        db.add(product)
        return product

    async def decrement_tracked_count_or_untrack(self, db: AsyncSession, product: Product) -> Product:
        """Giảm số lượng người theo dõi; nếu không còn ai theo dõi thì gắn mốc untracked_since."""
        product.tracked_by_count = max(0, product.tracked_by_count - 1)
        if product.tracked_by_count == 0:
            product.untracked_since = func.now()
        db.add(product)
        return product

    async def clear_untracked(self, db: AsyncSession, product: Product) -> Product:
        """Xóa mốc thời gian untracked_since khi có người theo dõi lại."""
        product.untracked_since = None
        db.add(product)
        return product

    async def get_history_distinct_days(self, db: AsyncSession, product_id: int) -> int:
        """Đếm số ngày riêng biệt có ghi nhận lịch sử giá của sản phẩm."""
        statement = select(
            func.count(func.distinct(func.cast(PriceHistory.recorded_at, Date)))
        ).where(PriceHistory.product_id == product_id)
        distinct_days = await db.scalar(statement)
        return int(distinct_days or 0)

    async def delete_by_id(self, db: AsyncSession, product_id: int) -> bool:
        """Xóa vĩnh viễn một sản phẩm theo ID."""
        statement = delete(Product).where(Product.id == product_id)
        result = await db.execute(statement)
        await db.commit()
        return result.rowcount > 0

    async def get_price_history(
        self, db: AsyncSession, product_id: int, *, since: datetime | None = None
    ) -> list[PriceHistory]:
        """Lấy danh sách lịch sử giá của sản phẩm sắp xếp theo thứ tự thời gian tăng dần."""
        statement = select(PriceHistory).where(PriceHistory.product_id == product_id)
        if since is not None:
            statement = statement.where(PriceHistory.recorded_at >= since)
        statement = statement.order_by(PriceHistory.recorded_at.asc(), PriceHistory.id.asc())
        result = await db.scalars(statement)
        return list(result)


product_crud = CRUDProduct()

from decimal import Decimal

from sqlalchemy import func, select
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


product_crud = CRUDProduct()

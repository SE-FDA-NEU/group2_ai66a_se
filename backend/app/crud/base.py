from typing import Any, Generic, Type, TypeVar, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import Base

# Khai báo kiểu dữ liệu động ràng buộc với Base Class của SQLAlchemy
ModelType = TypeVar("ModelType", bound=Base)

class CRUDBase(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: Any, *, for_update: bool = False) -> Optional[ModelType]:
        """Lấy một thực thể theo ID khóa chính"""
        statement = select(self.model).where(self.model.id == id)
        if for_update:
            statement = statement.with_for_update()
        if hasattr(db, "scalar"):
            return await db.scalar(statement)
        result = await db.execute(statement)
        return result.scalars().first()
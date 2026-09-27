from sqlalchemy import Column, CheckConstraint, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import synonym
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    nickname = Column(String, nullable=False)
    password_hashed = Column(String, nullable=True)

    auth_provider = Column(String, default="email", server_default="email", nullable=False)
    google_sub = Column(String, unique=True, index=True, nullable=True)

    is_activate = Column(Boolean, default=True, server_default="true", nullable=False)
    is_developer = Column(Boolean, default=False, server_default="false", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "password_hashed IS NOT NULL OR google_sub IS NOT NULL",
            name="chk_users_auth_method_not_both_null"
        ),
    )
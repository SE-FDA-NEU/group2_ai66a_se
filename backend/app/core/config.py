from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # 1. Cấu hình API chung
    PROJECT_NAME: str
    API_V1_STR: str

    # 2. Tài khoản Admin
    ADMIN_USERNAME: str
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str

    # 2. Cấu hình Bảo mật (JWT)
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # 3. Cấu hình kết nối Cơ sở dữ liệu
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    HOST_PORT_DB: str
    
    # DATABASE_URL do Docker truyền vào, nếu không có sẽ tự ghép
    DATABASE_URL: Optional[str] = None

    # 4. Cấu hình kết nối Redis
    HOST_PORT_REDIS: str
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None

    @property
    def get_redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        password_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{password_part}localhost:{self.HOST_PORT_REDIS}/0"

    @property
    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@localhost:{self.HOST_PORT_DB}/{self.POSTGRES_DB}"

    # Chỉ định cấu hình để Pydantic đọc file .env
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Khởi tạo một đối tượng settings duy nhất để dùng chung cho toàn bộ hệ thống Backend
settings = Settings()
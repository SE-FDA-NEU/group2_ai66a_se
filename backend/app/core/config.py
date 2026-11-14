import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # 1. Cấu hình API chung
    PROJECT_NAME: str = "Trakora"
    API_V1_STR: str = "/api/v1"

    # 2. Tài khoản Admin
    ADMIN_USERNAME: str = "Admin"
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    # Prefer a dedicated Gmail App Password; retain ADMIN_PASSWORD as a local fallback.
    SMTP_PASSWORD: Optional[str] = None

    # 2. Cấu hình Bảo mật (JWT)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520

    # 3. Cấu hình kết nối Cơ sở dữ liệu
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    HOST_PORT_DB: Optional[str] = None
    
    # DATABASE_URL do Docker truyền vào, nếu không có sẽ tự ghép
    DATABASE_URL: Optional[str] = None

    # 4. Cấu hình kết nối Redis
    HOST_PORT_REDIS: Optional[str] = None
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None

    # 5. Cấu hình Google Auth
    GOOGLE_CLIENT_ID: str
    # Comma-separated or JSON array of browser origins allowed to call this API.
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # RapidAPI product lookup adapter (optional in local/test environments)
    RAPIDAPI_KEY: Optional[str] = None
    RAPIDAPI_HOST: str = "real-time-amazon-data.p.rapidapi.com"
    RAPIDAPI_PRODUCT_ENDPOINT: str = "https://real-time-amazon-data.p.rapidapi.com/product-details"

    # Real-time Exchange Rate service configuration
    EXCHANGE_RATE_API_URL: str = "https://open.er-api.com/v6/latest/USD"
    EXCHANGE_RATE_FALLBACK_URL: str = "https://api.exchangerate-api.com/v4/latest/USD"
    DEFAULT_USD_TO_VND_RATE: str = "25800"
    EXCHANGE_RATE_CACHE_TTL_SECONDS: int = 3600

    # 6. Cấu hình OTP & Chống Spam
    OTP_EXPIRE_SECONDS: int = 300
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_ATTEMPTS: int = 5
    OTP_MAX_REQUESTS_PER_HOUR: int = 5

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(origin).strip().rstrip("/") for origin in parsed if str(origin).strip()]
            return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip().rstrip("/") for origin in value if str(origin).strip()]
        return []

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value).strip()
        if not normalized:
            return None
        if normalized.startswith("postgres://"):
            return "postgresql+asyncpg://" + normalized[len("postgres://"):]
        if normalized.startswith("postgresql://"):
            return "postgresql+asyncpg://" + normalized[len("postgresql://"):]
        return normalized

    @property
    def cors_origins(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS if origin.strip()]
        return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def get_redis_url(self) -> str:
        if self.REDIS_URL:
            redis_url = self.REDIS_URL.strip()
            if not redis_url.startswith(("redis://", "rediss://")):
                raise ValueError("REDIS_URL must use redis:// or rediss://.")
            return redis_url
        if not self.HOST_PORT_REDIS:
            raise ValueError("Set REDIS_URL or HOST_PORT_REDIS for local Redis.")
        password_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{password_part}localhost:{self.HOST_PORT_REDIS}/0"

    @property
    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            database_url = self.DATABASE_URL.strip()
            if database_url.startswith("postgres://"):
                database_url = "postgresql+asyncpg://" + database_url[len("postgres://"):]
            elif database_url.startswith("postgresql://"):
                database_url = "postgresql+asyncpg://" + database_url[len("postgresql://"):]
            elif not database_url.startswith("postgresql+asyncpg://"):
                raise ValueError("DATABASE_URL must use a PostgreSQL URL scheme.")

            # asyncpg expects `ssl`, while some providers expose libpq's `sslmode`.
            from sqlalchemy.engine import make_url
            url = make_url(database_url)
            query = dict(url.query)
            sslmode = query.pop("sslmode", None)
            if sslmode and "ssl" not in query:
                query["ssl"] = "require" if sslmode in {"require", "verify-ca", "verify-full"} else "prefer"
            return url.set(query=query).render_as_string(hide_password=False)

        if not all((self.POSTGRES_USER, self.POSTGRES_PASSWORD, self.POSTGRES_DB, self.HOST_PORT_DB)):
            raise ValueError("Set DATABASE_URL or provide all local PostgreSQL settings.")
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

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from contextlib import asynccontextmanager

from main import app
from app.core.database import get_db
from app.core.redis import get_redis

@pytest_asyncio.fixture
async def db_session():
    # Provide a mock async session
    session = AsyncMock()
    yield session

@pytest_asyncio.fixture
async def redis_client():
    # Provide a mock redis client
    redis = AsyncMock()
    yield redis

@pytest.fixture
def client(db_session, redis_client, monkeypatch):
    @asynccontextmanager
    async def test_lifespan(_app):
        yield

    monkeypatch.setattr(app.router, "lifespan_context", test_lifespan)
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_redis] = lambda: redis_client
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

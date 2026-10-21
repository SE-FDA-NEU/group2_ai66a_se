import asyncio
import sys
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def wait_db() -> None:
    engine = create_async_engine(settings.get_database_url)
    for attempt in range(1, 31):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            print("-> Ket noi Database thanh cong!")
            await engine.dispose()
            return
        except Exception as e:
            print(f"-> Cho Database san sang (lan {attempt}/30): {e}")
            await asyncio.sleep(2)
    print("-> Loi: Het thoi gian cho Database sau 30 lan thu (60s)!")
    sys.exit(1)

if __name__ == "__main__":
    asyncio.run(wait_db())

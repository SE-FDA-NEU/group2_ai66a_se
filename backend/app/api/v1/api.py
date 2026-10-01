from fastapi import APIRouter

from app.api.v1.endpoints import users_router
from app.api.v1.endpoints import auth_router, dev_router, otp_router, watchlist_router

api_router = APIRouter()

api_router.include_router(otp_router.router, prefix="/otp", tags=["OTP"])
api_router.include_router(users_router.router, prefix="/user", tags=["User"])
api_router.include_router(auth_router.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dev_router.router, prefix="/dev", tags=["Developer"])
api_router.include_router(watchlist_router.router, prefix="/watchlist", tags=["Watchlist"])

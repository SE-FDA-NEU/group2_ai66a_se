from fastapi import APIRouter

from app.api.v1.endpoints import users, dev, otp, auth

api_router = APIRouter()

api_router.include_router(otp.router, prefix="/otp", tags=["OTP"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dev.router, prefix="/dev", tags=["Developer"])

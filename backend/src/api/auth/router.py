from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

import src.services.authentication.auth as auth_service
from src.core.rate_limiter import limiter
from src.db.mongo_db import get_db
from src.schemas.user_login import UserLoginRequest, UserLoginResponse
from src.schemas.user_registration import (
    RefreshRequest,
    RefreshResponse,
    UserRegistrationRequest,
    UserRegistrationResponse,
)

router = APIRouter()


@router.post("/register", response_model=UserRegistrationResponse, status_code=201)
async def register_user(payload: UserRegistrationRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    response = await auth_service.register_user(payload, db)
    return response


@router.get("/verify-email", status_code=200)
async def verify_email(token: str = Query(..., description="The verification token sent to the user's email"), db: AsyncIOMotorDatabase = Depends(get_db)) -> HTMLResponse:
    """Verify the user's email using the provided token."""

    return await auth_service.verify_email(token, db)

@router.post("/login", response_model=UserLoginResponse)
@limiter.limit("10000/minute")
async def login_user(request: Request, response: Response, payload: UserLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Authenticate the user and return a JWT token if successful."""

    return await auth_service.login_user(payload, request, db)

@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Refresh the user's JWT tokens."""

    return await auth_service.refresh_token(payload, db)


@router.post("/logout", status_code=200)
async def logout_user(request: RefreshRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    """Logout the user by invalidating their refresh token."""

    return await auth_service.logout_user(request, db)
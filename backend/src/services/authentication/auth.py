from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext
from src.config.logging import get_logger
from src.config.settings import get_settings
from src.core.auth import create_user_token
from src.core.email import generate_token, hash_token, send_verification_email
from src.schemas.user_login import UserLoginRequest, UserLoginResponse
from src.schemas.user_registration import (
    UserRegistrationRequest,
    UserRegistrationResponse,
)

logger = get_logger(__name__)
settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """hash a plain text using bcrypt."""

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""

    return pwd_context.verify(plain_password, hashed_password)


async def register_user(payload: UserRegistrationRequest, db: AsyncIOMotorDatabase) -> UserRegistrationResponse:
    """Register a new user in the database."""

    # Check if the user already exists
    existing_user = await db.users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this email already exists.")

    # Create a new user document
    user_doc = {
        "username": payload.username,
        "full_name": payload.full_name,
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "is_active": True,
        "is_email_verified": False,
    }

    # Insert the new user into the database
    result = await db.users.insert_one(user_doc)

    # Generate a verfication token for email and send a verification email
    raw_token = generate_token()

    # Store the verification token in the database
    token_record = {
        "user_id": result.inserted_id,
        "token_hash": hash_token(raw_token),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFY_EXPIRE_HOURS),
        "used_at": None,
    }
    await db.email_verification_tokens.insert_one(token_record)

    # Send the verification email to the user
    send_verification_email(payload.email, payload.username, raw_token)

    logger.info("user registered", user_id=str(result.inserted_id), username=payload.username)

    return UserRegistrationResponse(
        id=str(result.inserted_id),
        username=payload.username,
        email=payload.email,
        is_active=True,
        is_email_verified=False,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


async def verify_email(token: str, db: AsyncIOMotorDatabase) -> HTMLResponse:
    """Verify a user's email using the provided token."""

    # Hash the provided token to compare with stored hash
    token_hash = hash_token(token)

    # Find the token record in the database
    token_record = await db.email_verification_tokens.find_one({"token_hash": token_hash})

    if not token_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token.")

    if token_record["used_at"] is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token has already been used.")

    if token_record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token has expired.")

    # Mark the user's email as verified
    await db.users.update_one(
        {"_id": token_record["user_id"]},
        {
            "$set": {
                "is_email_verified": True,
            }
        },
    )

    # Mark the token as used
    await db.email_verification_tokens.update_one({"_id": token_record["_id"]}, {"$set": {"used_at": datetime.now(timezone.utc)}})

    logger.info("email verified", user_id=str(token_record["user_id"]))

    return HTMLResponse(content="<h1>Email verified successfully!</h1><p>You can now log in to your account.</p>", status_code=status.HTTP_200_OK)


async def login_user(payload: UserLoginRequest, request: Request, db: AsyncIOMotorDatabase) -> UserLoginResponse:
    """Authenticate a user and return a JWT token."""

    client_ip = request.client.host if request.client else "unknown"
    logger.info("user attempting login", email=payload.email, client_ip=client_ip)

    user = await db.users.find_one({"email": payload.email})

    dummy_hash = pwd_context.hash("dummy-password-for-timing-attack-prevention")
    password_valid = verify_password(payload.password, user["hashed_password"]) if user else pwd_context.verify(payload.password, dummy_hash)

    if not user or not password_valid:
        logger.warning("user login failed", email=payload.email, client_ip=client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user.get("is_email_verified", False):
        logger.warning("user login failed - email not verified", email=payload.email, client_ip=client_ip)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email address has not been verified.")

    if not user.get("is_active", False):
        logger.warning("user login failed - account inactive", email=payload.email, client_ip=client_ip)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")

    token = create_user_token(user["_id"])
    logger.info("user login successful", user_id=str(user["_id"]), email=payload.email, client_ip=client_ip)

    return UserLoginResponse(
        access_token=token,
        token_type="bearer",
        expire_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    )

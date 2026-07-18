import asyncio
from datetime import datetime, timedelta, timezone
from time import perf_counter

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, Request, status
from fastapi.responses import HTMLResponse
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext
from src.config.logging import get_logger
from src.config.settings import get_settings
from src.core.auth import create_refresh_token, create_user_token
from src.core.email import generate_token, hash_token, send_verification_email

# from src.core.metrics import (
#     login_create_access_token,
#     login_create_refresh_token,
#     login_find_user,
#     login_store_refresh_token,
#     login_total,
#     login_verify_password,
# )
from src.core.metrics import record_timing
from src.schemas.user_login import UserLoginRequest, UserLoginResponse
from src.schemas.user_registration import (
    RefreshRequest,
    RefreshResponse,
    UserRegistrationRequest,
    UserRegistrationResponse,
)

logger = get_logger(__name__)
settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)

dummy_hash = pwd_context.hash("dummy-password-for-timing-attack-prevention")


def hash_password(password: str) -> str:
    """hash a plain text using bcrypt."""

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""

    return pwd_context.verify(plain_password, hashed_password)

async def _store_refresh_token(db: AsyncIOMotorDatabase, refresh_token_jti: str, user_id: str):
    start = perf_counter()
    await db.refresh_tokens.insert_one(
        {
            "jti": refresh_token_jti,
            "user_id": user_id,
            "revoked": False,
            "replaced_by": None,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        }
    )
    record_timing("login.store_refresh_token", (perf_counter() - start) * 1000)


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

    start = perf_counter()
    user = await db.users.find_one({"email": payload.email})
    record_timing("login.find_user", (perf_counter() - start) * 1000)

    # dummy_hash = pwd_context.hash("dummy-password-for-timing-attack-prevention")
    # password_valid = verify_password(payload.password, user["hashed_password"]) if user else pwd_context.verify(payload.password, dummy_hash)
    start = perf_counter()
    password_valid = await asyncio.to_thread(verify_password, payload.password, user["hashed_password"]) if user else await asyncio.to_thread(pwd_context.verify, payload.password, dummy_hash)
    record_timing("login.verify_password", (perf_counter() - start) * 1000)

    if not user or not password_valid:
        logger.warning("user login failed", email=payload.email, client_ip=client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user.get("is_email_verified", False):
        logger.warning("user login failed - email not verified", email=payload.email, client_ip=client_ip)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email address has not been verified.")

    if not user.get("is_active", False):
        logger.warning("user login failed - account inactive", email=payload.email, client_ip=client_ip)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")

    start = perf_counter()
    token = create_user_token(user["_id"])
    record_timing("login.create_access_token", (perf_counter() - start) * 1000)

    start = perf_counter()
    refresh_token, refresh_token_jti = create_refresh_token(user["_id"])
    record_timing("login.create_refresh_token", (perf_counter() - start) * 1000)

    # start = perf_counter()
    # await db.refresh_tokens.insert_one(
    #     {
    #         "jti": refresh_token_jti,
    #         "user_id": str(user["_id"]),
    #         "revoked": False,
    #         "replaced_by": None,
    #         "created_at": datetime.now(timezone.utc),
    #         "expires_at": datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    #     }
    # )
    # record_timing("login.store_refresh_token", (perf_counter() - start) * 1000)

    asyncio.create_task(_store_refresh_token(db, refresh_token_jti, user["_id"]))

    logger.info("user login successful", user_id=str(user["_id"]), email=payload.email, client_ip=client_ip)

    return UserLoginResponse(
        access_token=token,
        refresh_token=refresh_token,
        token_type="bearer",
        expire_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
        full_name=user.get("full_name", ""),
        username=user.get("username", ""),
    )


async def refresh_token(data: RefreshRequest, db: AsyncIOMotorDatabase) -> RefreshResponse:
    """Refresh the user's access token using a valid refresh token."""

    try:
        start = perf_counter()
        payload = jwt.decode(data.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        record_timing("refresh.jwt_decode", (perf_counter() - start) * 1000)

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    except JWTError as e:
        logger.error("refresh_token_decoding_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from e

    jti = payload.get("jti")
    user_id = payload.get("sub")

    if not jti or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload.")

    try:
        user_object_id = ObjectId(user_id)
    except InvalidId:
        logger.warning("refresh_token_invalid_user_id", user_id=user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload.")

    start = perf_counter()
    new_access_token = create_user_token(user_id)
    new_refresh_token, new_refresh_token_jti = create_refresh_token(user_id)
    record_timing("refresh.create_tokens", (perf_counter() - start) * 1000)

    start = perf_counter()
    token_doc = await db.refresh_tokens.find_one_and_update(
        {"jti": jti, "revoked": False},
        {
            "$set": {
                "revoked": True,
                "replaced_by": new_refresh_token_jti,
                "revoked_at": datetime.now(timezone.utc),
            },
        },
    )
    record_timing("refresh.find_and_update_database", (perf_counter() - start) * 1000)

    if token_doc is None:
        existing = await db.refresh_tokens.find_one({"jti": jti})
        if not existing:
            logger.warning("refresh_token_not_found", jti=jti, user_id=user_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found.")

        logger.warning("refresh_token_already_revoked", jti=jti, user_id=user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has already been revoked.")

    start = perf_counter()
    user = await db.users.find_one({"_id": user_object_id}, {"_id": 1})
    record_timing("refresh.find_user", (perf_counter() - start) * 1000)

    if not user:
        logger.warning("refresh_token_user_not_found", user_id=user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    
    start = perf_counter()
    await db.refresh_tokens.insert_one(
        {
            "jti": new_refresh_token_jti,
            "user_id": user_id,
            "revoked": False,
            "replaced_by": None,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        }
    )
    record_timing("refresh.store_refresh_token", (perf_counter() - start) * 1000)

    return RefreshResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


async def logout_user(data: RefreshRequest, db: AsyncIOMotorDatabase) -> dict:
    """Logout the user by invalidating their refresh token."""

    try:
        payload = jwt.decode(data.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    except JWTError as e:
        logger.error("logout_token_decoding_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from e

    jti = payload.get("jti")
    user_id = payload.get("sub")

    if not jti or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload.")

    updated_doc = await db.refresh_tokens.find_one_and_update(
        {"jti": jti, "revoked": False},
        {
            "$set": {
                "revoked": True,
                "revoked_at": datetime.now(timezone.utc),
            }
        },
    )

    if updated_doc is None:
        existing = await db.refresh_tokens.find_one({"jti": jti})
        if not existing:
            logger.warning("logout_failed_refresh_token_not_found", jti=jti, user_id=user_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found.")

        logger.warning("logout_failed_already_revoked", jti=jti, user_id=user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has already been revoked.")

    logger.info("user logged out", user_id=user_id)

    return {"message": "User logged out successfully."}

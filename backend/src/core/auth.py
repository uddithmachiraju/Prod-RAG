from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.db.mongo_db import get_db

settings = get_settings()
logger = get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


def create_user_token(user_id: str) -> str:
    """Generate a JWT token for the given user id."""

    user_sub = str(user_id)
    now = datetime.now(timezone.utc)
    issued_at = int(now.timestamp())
    expires_at = int((now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())

    return jwt.encode(
        {
            "sub": user_sub,
            "iat": issued_at,
            "exp": expires_at,
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


# Utility function to decode a JWT token and extract the user_id (subject) from it.
def decode_user_token(token: str) -> Any:
    """Decode a JWT token and return the user_id if valid."""

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        logger.error("token_decoding_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e


# Dependency to get the current authenticated user from the JWT token in the Authorization header.
async def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)], db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    """Extract and validate the user ID from the JWT token in the Authorization header."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials.")

    payload = decode_user_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    logger.info("user_authenticated", user_id=str(user["_id"]))
    return user

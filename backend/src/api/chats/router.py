from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.auth import get_current_user
from src.db.mongo_db import get_db
from src.services.chats.chat_service import get_user_chats, get_user_recent_chats

router = APIRouter()


@router.get("/chats")
async def get_chats(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Endpoint to retrieve the list of chats for the authenticated user."""

    return await get_user_chats(user, db)


@router.get("/recent-chats")
async def get_recent_chats(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> List[Dict[str, Any]]:
    """Endpoint to retrieve recent chats for the authenticated user."""

    return await get_user_recent_chats(user, db)
from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_user_chat_history(user: dict, db: AsyncIOMotorDatabase) -> list:
    """Service function to retrieve the list of chats for the authenticated user."""

    results = await db["chats"].find({"user_id": str(user["_id"]), "deleted": False}).to_list(length=100)

    serialized_chats = [
        {
            "chat_id": str(chat["_id"]),
            "title": chat.get("title"),
            "document_id": chat.get("document_id"),
            "last_message_preview": chat.get("last_message_preview"),
            "updated_at": chat.get("updated_at"),
            "created_at": chat.get("created_at"),
            "pinned": chat.get("pinned", False),
        }
        for chat in results
    ]

    return serialized_chats


async def create_chat(user: dict, db: AsyncIOMotorDatabase, chat_data: dict) -> str:
    """Service function to create a new chat."""

    result = await db["chats"].insert_one(chat_data)

    return str(result.inserted_id)


async def get_user_chat(chat_id: str, user: dict, db: AsyncIOMotorDatabase) -> Any:
    """Service function to retrieve a specific chat by ID for the authenticated user."""

    try:
        chat = await db["chats"].find_one({"_id": ObjectId(chat_id), "user_id": str(user["_id"]), "deleted": False})
    except Exception:
        return None
    
    if not chat:
        return None

    messages = await db["messages"].find({"chat_id": chat_id, "deleted": False}).sort("received_at", 1).to_list(length=1000)

    serialized_messages = [
        {
            "message_id": str(message.get("_id", "")),
            "role": message["role"],
            "content": message["content"],
            "received_at": message["received_at"],
        }
        for message in messages
    ]

    return {
        "chat_id": str(chat["_id"]),
        "title": chat.get("title"),
        "document_id": chat.get("document_id"),
        "last_message_preview": chat.get("last_message_preview"),
        "updated_at": chat.get("updated_at"),
        "created_at": chat.get("created_at"),
        "pinned": chat.get("pinned", False),
        "messages": serialized_messages,
    }


async def get_user_recent_chats(user: dict, db: AsyncIOMotorDatabase, limit: int = 10) -> List[Dict[str, Any]]:
    """Retrieve recent chats for authenticated user."""

    chats_collection = db["chats"]

    chats_cursor = (
        chats_collection
        .find(
            {
                "user_id": str(user["_id"]),
                "deleted": False,
            }
        )
        .sort("updated_at", -1)
        .limit(limit)
    )

    chats = await chats_cursor.to_list(length=limit)

    serialized_chats = [
        {
            "chat_id": str(chat["_id"]),
            "title": chat.get("title"),
            "document_id": chat.get("document_id"),
            "last_message_preview": chat.get("last_message_preview"),
            "updated_at": chat.get("updated_at"),
            "created_at": chat.get("created_at"),
            "pinned": chat.get("pinned", False),
        }
        for chat in chats
    ]

    return serialized_chats


async def add_message_to_chat(chat_id: str, payload: Dict[str, Any], db: AsyncIOMotorDatabase) -> None:
    """Update chat with the latest message preview and timestamp."""

    content = payload["content"]
    if isinstance(content, dict):
        content = str(content)

    message_data: Dict[str, Any] = {
        "chat_id": chat_id,
        "user_id": payload["user_id"],
        "role": payload["role"],
        "content": content,
        "received_at": datetime.now(timezone.utc),
    }

    if message_data["role"] == "assistant":
        message_data.update(
            {
            "input_tokens": payload.get("input_tokens"),
            "output_tokens": payload.get("output_tokens"),
            "model": payload.get("model"),
            "latency": payload.get("latency"),
            }
        )

    await db["messages"].insert_one(message_data)

    try:
        await db["chats"].update_one(
            {
                "_id": ObjectId(chat_id),
                "deleted": False,
                "user_id": payload["user_id"],
            },
            {
                "$set": {
                    "last_message_preview": content[:100] if isinstance(content, str) else str(content)[:100],
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )
    except Exception:
        pass
from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_user_chats(user: dict, db: AsyncIOMotorDatabase) -> list:
    """Service function to retrieve the list of chats for the authenticated user."""

    user_id = user["_id"]
    chats_collection = db["chats"]

    # Query the database for chats where the user is a participant
    chats_cursor = chats_collection.find({"user_id": user_id})
    chats = await chats_cursor.to_list(length=100)

    return chats


async def create_chat(user: dict, db: AsyncIOMotorDatabase, chat_data: dict) -> str:
    """Service function to create a new chat."""

    result = await db["chats"].insert_one(chat_data)

    return str(result.inserted_id)


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
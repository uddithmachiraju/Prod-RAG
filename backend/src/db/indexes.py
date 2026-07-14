from pymongo import ASCENDING

from src.db.mongo_db import get_db


async def create_indexes():
    """Create indexes for the MongoDB collections."""

    db = await get_db()

    await db.users.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="idx_email",
    )

    await db.refresh_tokens.create_index(
        [("jti", ASCENDING)],
        unique=True,
        name="idx_jti",
    )

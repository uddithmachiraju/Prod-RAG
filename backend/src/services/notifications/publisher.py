import json
from typing import Any, Dict

from src.config.logging import get_logger
from src.services.notifications.client import redis_client

logger = get_logger(__name__)


async def publish_document_ready(document_id: str, user_id: str, channel: str = "document_events") -> bool:
    """Publish a DOCUMENT_READY event to the document_events channel."""

    payload: Dict[str, Any] = {
        "event": "DOCUMENT_READY",
        "document_id": document_id,
        "user_id": user_id,
    }

    try:
        subscriber_count = await redis_client.publish(channel, json.dumps(payload))
    except Exception:
        logger.exception(
            "Failed to publish document ready event",
            channel=channel,
            document_id=document_id,
            user_id=user_id,
        )
        return False

    if subscriber_count == 0:
        logger.warning(
            "Published event with no active subscribers",
            channel=channel,
            document_id=document_id,
            user_id=user_id,
        )
    else:
        logger.info(
            "Published document ready event",
            channel=channel,
            document_id=document_id,
            user_id=user_id,
            subscriber_count=subscriber_count,
        )

    return subscriber_count > 0

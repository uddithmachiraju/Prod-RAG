import asyncio
import json
from typing import Any, Dict

from redis.exceptions import ConnectionError as RedisConnectionError

from src.config.logging import get_logger
from src.core.container import get_connection_manager
from src.services.notifications.client import redis_client

logger = get_logger(__name__)
manager = get_connection_manager()


def _parse_payload(raw_data: Any) -> Dict[str, Any] | None:
    """Parse and validate a single pub/sub message payload."""

    try:
        payload = json.loads(raw_data)
    except (TypeError, json.JSONDecodeError):
        logger.warning("Received malformed pubsub payload", raw_data=raw_data)
        return None

    if not isinstance(payload, dict) or "user_id" not in payload:
        logger.warning("Pubsub payload missing user_id", payload=payload)
        return None

    return payload


async def _consume(pubsub) -> None:
    """Read and dispatch messages until the connection drops or we're cancelled."""

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue

        payload = _parse_payload(message.get("data"))
        if payload is None:
            continue

        try:
            await manager.notify(payload["user_id"], payload)
        except Exception:
            logger.exception("Failed to notify user", user_id=payload["user_id"])


async def subscribe(channel: str = "document_events") -> None:
    """Subscribe to document_events and dispatch messages, with auto-reconnect."""

    delay = 2

    while True:
        pubsub = redis_client.pubsub()
        try:
            await pubsub.subscribe(channel)
            logger.info("Subscribed to channel", channel=channel)
            delay = 2  # reset backoff after a successful (re)connect

            await _consume(pubsub)

        except asyncio.CancelledError:
            logger.info("Subscriber cancelled, shutting down", channel=channel)
            raise

        except RedisConnectionError:
            logger.warning(
                "Redis connection lost, retrying",
                channel=channel,
                retry_in_seconds=delay,
            )

        except Exception:
            logger.exception("Unexpected error in subscriber loop, retrying", channel=channel)

        else:
            # pubsub.listen() ended without an exception (connection closed cleanly).
            logger.warning("Pubsub listen loop ended unexpectedly, reconnecting", channel=channel)

        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
            except Exception:
                logger.exception("Error while closing pubsub connection", channel=channel)

        await asyncio.sleep(delay)
        delay = min(delay * 2, 30)

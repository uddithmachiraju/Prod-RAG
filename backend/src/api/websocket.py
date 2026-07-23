from typing import Dict

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from src.config.logging import get_logger
from src.core.auth import get_current_user
from src.core.container import get_connection_manager

router = APIRouter()
manager = get_connection_manager()
logger = get_logger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user: Dict = Depends(get_current_user)) -> None:
    """Websocket endpoint for a user's real-time notification stream."""

    user_id = str(user["_id"])

    await manager.connect(user_id=user_id, websocket=websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        logger.info("Websocket disconnected", user_id=user_id)

    except Exception:
        logger.exception("Unexpected error in websocket loop", user_id=user_id)

    finally:
        await manager.disconnect(user_id=user_id, websocket=websocket)

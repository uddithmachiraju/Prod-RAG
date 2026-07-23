import asyncio
from collections import defaultdict
from typing import Any, DefaultDict, Dict, Set

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from src.config.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections grouped by user ID."""

    def __init__(self) -> None:
        """Initialize the manager."""

        self._connections: DefaultDict[str, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Accept a websocket and register it under the given user_id."""

        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)
        logger.debug("Connected user", user_id=user_id)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        """Remove a websocket from the registry."""

        async with self._lock:
            conns = self._connections.get(user_id)
            if conns is None:
                return
            conns.discard(websocket)
            if not conns:
                del self._connections[user_id]
        logger.debug("Disconnected user", user_id=user_id)

    async def notify(self, user_id: str, message: Dict[str, Any]) -> None:
        """Send a JSON-serializable message to all of a user's active connections."""

        async with self._lock:
            targets = list(self._connections.get(user_id, ()))

        if not targets:
            return

        stale: list[WebSocket] = []
        for ws in targets:
            if ws.client_state != WebSocketState.CONNECTED:
                stale.append(ws)
                continue
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning("Failed to send marking as stale", user_id=user_id, error=e)
                stale.append(ws)

        for ws in stale:
            await self.disconnect(user_id, ws)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Send a message to every connected user."""

        async with self._lock:
            user_ids = list(self._connections.keys())
        await asyncio.gather(*(self.notify(uid, message) for uid in user_ids))

    def connection_count(self, user_id: str) -> int:
        """Return the number of active connections for a user."""

        return len(self._connections.get(user_id, ()))

    def is_connected(self, user_id: str) -> bool:
        """Return whether a user has at least one active connection."""

        return self.connection_count(user_id) > 0

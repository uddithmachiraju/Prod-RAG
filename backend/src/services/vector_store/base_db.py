from abc import ABC, abstractmethod
from typing import Any, Dict, List


class VectorDB(ABC):
    """Abstract class for vector database."""

    @abstractmethod
    async def query(self, document_id: str, query_embedd: List[float], top_k: int) -> Any:
        """Query the database"""

        raise NotImplementedError

    @abstractmethod
    async def get_user_documents(self, user_id: str) -> Dict[str, Any]:
        """Get all documents belonging to a specific user."""

        raise NotImplementedError

    @abstractmethod
    async def get_document_data(self, document_id: str) -> Dict[str, Any]:
        """Retrieve all chunks, metadata, and embeddings for a specific document."""

        raise NotImplementedError

    @abstractmethod
    async def health_check(self, timeout_sec: float = 3.0) -> bool:
        """Return True if the backend is reachable and healthy, False otherwise."""

        raise NotImplementedError

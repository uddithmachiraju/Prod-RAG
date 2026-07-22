import asyncio
from typing import Any, Dict, List

from qdrant_client import AsyncQdrantClient, models

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.services.vector_store.base_db import VectorDB

logger = get_logger(__name__)
settings = get_settings()

qdrant_client = AsyncQdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
)


class Qdrant(VectorDB):

    def __init__(self) -> None:
        super().__init__()

        self.client = qdrant_client
        self.collection_name = settings.QDRANT_COLLECTION
        self._collection_ready = False
        self._collection_lock = asyncio.Lock()

    async def _ensure_collection(self) -> None:
        """Lazily verify the collection exists once, mirroring the old _get_collection cache."""
        if not self._collection_ready:
            async with self._collection_lock:
                if not self._collection_ready:
                    exists = await self.client.collection_exists(self.collection_name)
                    if not exists:
                        raise ValueError(f"Qdrant collection '{self.collection_name}' does not exist")
                    self._collection_ready = True

    async def create_collection(self) -> None:
        """Create the Qdrant collection if it doesn't already exist, with the correct vector size."""

        vector_size = 1024

        exists = await self.client.collection_exists(self.collection_name)
        if exists:
            logger.info("Qdrant collection already exists, skipping creation", collection=self.collection_name)
            return

        await self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection", collection=self.collection_name, size=vector_size)

    async def create_payload_indexes(self) -> None:
        """Create payload indexes required for filtered queries (document_id, user_id)."""

        await self.client.create_payload_index(
            collection_name=self.collection_name,
            field_name="document_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        await self.client.create_payload_index(
            collection_name=self.collection_name,
            field_name="user_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        logger.info("Created Qdrant payload indexes", collection=self.collection_name)

    async def query(self, document_id: str, query_embedd: List[float], top_k: int) -> Any:
        """Query the database to get similar chunks."""

        try:
            await self._ensure_collection()

            results = await self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedd,
                limit=top_k,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=document_id),
                        )
                    ]
                ),
                with_payload=True,
            )

            documents: List[str] = []
            metadatas: List[Dict[str, Any]] = []
            ids: List[str] = []
            distances: List[float] = []

            for point in results.points:
                payload = point.payload or {}
                documents.append(payload.get("content", ""))
                metadatas.append(payload.get("metadata", {}))
                ids.append(str(point.id))
                distances.append(1 - point.score)

            return {
                "documents": [documents],
                "metadatas": [metadatas],
                "ids": [ids],
                "distances": [distances],
            }

        except Exception as e:
            logger.error("failed to execute search query", error=str(e))

    async def get_user_documents(self, user_id: str) -> Dict[str, Any]:
        """Get all documents for a specific user."""

        try:
            await self._ensure_collection()

            points, _next_offset = await self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="user_id",
                            match=models.MatchValue(value=user_id),
                        )
                    ]
                ),
                with_payload=True,
                with_vectors=False,
                limit=1000,  # adjust / paginate with _next_offset if collections can exceed this
            )

            documents = [p.payload.get("content", "") for p in points]  # type: ignore
            metadatas = [p.payload.get("metadata", {}) for p in points]  # type: ignore
            ids = [str(p.id) for p in points]

            logger.info(
                "pulled user documents from qdrant",
                user_id=user_id,
                collection=self.collection_name,
            )

            return {"documents": documents, "metadatas": metadatas, "ids": ids}

        except Exception as e:
            logger.error("Failed to fetch user documents", user_id=user_id, error=str(e))
            raise

    async def get_document_data(self, document_id: str) -> Dict[str, Any]:
        """Retrieve all chunks and embeddings for a specific document."""

        try:
            await self._ensure_collection()

            points, _next_offset = await self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=document_id),
                        )
                    ]
                ),
                with_payload=True,
                with_vectors=True,
                limit=1000,  # adjust / paginate with _next_offset if documents can exceed this
            )

            documents = [p.payload.get("content", "") for p in points]  # type: ignore
            metadatas = [p.payload.get("metadata", {}) for p in points]  # type: ignore
            embeddings = [p.vector for p in points]
            ids = [str(p.id) for p in points]

            logger.info(
                "pulled data from qdrant",
                document_id=document_id,
                collection=self.collection_name,
            )

            return {
                "documents": documents,
                "metadatas": metadatas,
                "embeddings": embeddings,
                "ids": ids,
            }

        except Exception as e:
            logger.error("Failed to fetch document chunks", document_id=document_id, error=str(e))
            raise

    async def health_check(self, timeout_sec: float = 3.0) -> bool:
        """Health check for the Qdrant client."""

        try:
            await asyncio.wait_for(
                self.client.get_collections(),
                timeout=timeout_sec,
            )
            logger.info("Qdrant health check passed.")
            return True
        except Exception as e:
            logger.error("Qdrant health check failed", error=str(e))
            return False

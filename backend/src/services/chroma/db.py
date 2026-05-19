from typing import Any, List

import chromadb
from chromadb.api.types import GetResult

from src.config.logging import get_logger
from src.config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()

chroma_client = chromadb.CloudClient(
    api_key=settings.CHROMA_DB_API_KEY,
    tenant=settings.CHROMA_DB_TENANT,
    database=settings.CHROMA_DB_DATABASE,
)


class ChromaDB:
    """ChromaDB is a wrapper around the Chroma vector database client."""

    def __init__(self) -> None:
        self.client = chroma_client

    async def query(self, document_id: str, query_embedd: List[float], top_k: int) -> Any:
        """Query the database to get similar chunks."""

        try:
            collection = self.client.get_collection(settings.CHROMA_DB_COLLECTION)

            results = collection.query(
                query_embeddings=query_embedd,
                n_results=top_k,
                where={"document_id": document_id},
                include=["documents", "metadatas", "distances"],
            )

            return results

        except Exception as e:
            logger.error("failed to execute search query", error=str(e))

    def get_document_data(self, document_id: str) -> GetResult:
        """Retrieve all chunks and embeddings for a specific document."""

        try:
            collection = self.client.get_collection(settings.CHROMA_DB_COLLECTION)

            result = collection.get(
                where={
                    "document_id": document_id,
                },
                include=["documents", "embeddings", "metadatas"],
            )
            logger.info("pulled data from chromadb", document_id=document_id, collection=collection.name)

            return result

        except Exception as e:
            logger.error("Failed to fetch document chunks", document_id=document_id, error=str(e))
            raise

    def health_check(self) -> bool:
        """Health check for the ChromaDB client."""

        try:
            self.client.heartbeat()
            logger.info("ChromaDB health check passed.")
            return True
        except Exception as e:
            logger.error("ChromaDB health check failed", error=str(e))
            return False

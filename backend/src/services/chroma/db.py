import asyncio
import time
from typing import Any, List

import chromadb
from chromadb.api.types import GetResult
from fastapi.concurrency import run_in_threadpool

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

    def get_user_documents(self, user_id: str) -> GetResult:
        """Get all documents for a specific user."""

        try:
            collection = self.client.get_collection(settings.CHROMA_DB_COLLECTION)

            result = collection.get(
                where={
                    "user_id": user_id,
                },
                include=["documents", "metadatas"],
            )
            logger.info("pulled user documents from chromadb", user_id=user_id, collection=collection.name)

            return result

        except Exception as e:
            logger.error("Failed to fetch user documents", user_id=user_id, error=str(e))
            raise

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

    # async def get_document_data(self, user_id: str, document_id: str, include_embeddings: bool = False, limit: int = 500, offset: int = 0, timeoust_sec: float = 15):
    #     """Get a page of documents belongs to the user."""

    #     if not user_id:
    #         raise

    #     if limit <= 0 and limit > 1000:
    #         raise

    #     if offset < 0:
    #         raise

    #     include = ["documents", "metadatas"]
    #     if include_embeddings:
    #         include.append("embeddings")

    #     start = time.perf_counter()
    #     try:
    #         raw = await asyncio.wait_for(
    #             run_in_threadpool()
    #         )

    async def health_check(self, timeout_sec: float = 3.0) -> bool:
        """Health check for the ChromaDB client."""

        try:
            await asyncio.wait_for(
                run_in_threadpool(self.client.heartbeat),
                timeout=timeout_sec,
            )
            logger.info("ChromaDB health check passed.")
            return True
        except Exception as e:
            logger.error("ChromaDB health check failed", error=str(e))
            return False

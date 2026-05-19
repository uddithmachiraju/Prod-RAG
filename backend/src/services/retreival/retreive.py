from typing import List

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.retrieval import RetrievalRequest, RetrievalResponse
from src.services.chroma.db import ChromaDB
from src.services.embeddings.embeds import Embeddings

logger = get_logger(__name__)
settings = get_settings()


class RetrivalService:
    """Service for retreiving data from the database."""

    def __init__(self, vector_store: ChromaDB, embeddings: Embeddings) -> None:
        self.vector_store = vector_store
        self.embeddings = embeddings

    async def search_query(self, payload: RetrievalRequest) -> List[RetrievalResponse]:
        """Search for relevant chunks based on the query and return the results."""

        try:
            query_embedding = await self.embeddings.get_embedding(payload.query)

            result = await self.vector_store.query(document_id=payload.document_id, query_embedd=query_embedding, top_k=payload.top_k)

            if not result or not result.get("documents"):
                return []

            documents = result["documents"][0]
            metadatas = result.get("metadatas", [[]])[0]
            ids = result.get("ids", [[]])[0]
            distances = result.get("distances", [[]])[0]

            responses: List[RetrievalResponse] = []

            for i in range(len(documents)):
                responses.append(
                    RetrievalResponse(
                        document_id=payload.document_id,
                        chunk_id=ids[i],
                        content=documents[i],
                        score=1 - distances[i],
                        metadata=metadatas[i] if i < len(metadatas) else {},
                    )
                )

            return responses

        except Exception as e:
            logger.error("Failed to execute search query", document_id=payload.document_id, error=str(e))
            raise

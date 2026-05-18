from typing import List

import numpy as np
from chromadb.api.types import GetResult

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.retrieval import RetrievalRequest, RetrievalResponse

logger = get_logger(__name__)
settings = get_settings()



class RetrivalService:
    """Service for retreiving data from the database."""

    def __init__(self) -> None:
        from src.core.container import get_chroma_db, get_embedddings
        self.vector_store = get_chroma_db()
        self.embeddings = get_embedddings()

    
    async def search_query(self, payload: RetrievalRequest) -> List[RetrievalResponse]:
        """Search for relevant chunks based on the query and return the results."""

        try:
            # Get the embedding for the query
            query_embedding = await self.embeddings.get_embedding(payload.query)

            # Search for document chunks in the vector store
            document_data: GetResult = self.vector_store.get_document_data(document_id=payload.document_id)

            if not document_data:
                logger.warning("No document data found for the given document ID", document_id=payload.document_id)
                return []
            
            embeddings = document_data.get("embeddings") or []
            documents = document_data.get("documents") or []
            metadatas = document_data.get("metadatas") or []
            ids = document_data.get("ids") or []

            simialrities = []

            for idx, embedding in enumerate(embeddings):
                score = np.dot(query_embedding, embedding) / (np.linalg.norm(query_embedding) * np.linalg.norm(embedding))
                simialrities.append((score, documents[idx]))

            simialrities.sort(key=lambda x: x[0], reverse=True)

            top_k = payload.top_k
            top_results = simialrities[:top_k]

            results: List[RetrievalResponse] = []

            for idx, score in enumerate(top_results):
                results.append(
                    RetrievalResponse(
                        document_id=payload.document_id, 
                        chunk_id=ids[idx] if idx < len(ids) else str(idx),
                        content=documents[idx], 
                        score=float(score), 
                        metadata=dict(metadatas[idx]) if idx < len(metadatas) else {},
                    )
                )


            return results

        except Exception as e:
            logger.error("Failed to execute search query", document_id=payload.document_id, error=str(e))
            raise
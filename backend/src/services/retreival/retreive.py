import asyncio
from time import perf_counter
from typing import List

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.core.metrics import record_timing
from src.schemas.retrieval import RetrievalRequest, RetrievalResponse

# from src.services.embeddings.embeds import Embeddings
# from src.services.embeddings.jina_embeds import JinaEmbeddings
from src.services.embeddings.openai_embeds import OpenAIEmbeddings

# from src.services.vector_store.chroma_db import ChromaDB
from src.services.vector_store.base_db import VectorDB

logger = get_logger(__name__)
settings = get_settings()


class RetrivalService:
    """Service for retreiving data from the database."""

    def __init__(self, vector_store: VectorDB, embeddings: OpenAIEmbeddings) -> None:
        self.vector_store = vector_store
        self.embeddings = embeddings

    async def search_query(self, payload: RetrievalRequest) -> List[RetrievalResponse]:
        """Search for relevant chunks based on the query and return the results."""

        total_time = perf_counter()

        try:
            start = perf_counter()
            query_embedding = await asyncio.wait_for(
                self.embeddings.get_embeddings(payload.query),
                timeout=5.0,
            )
            query_vector = query_embedding[0]
            record_timing("retrieval.get_embeddings", (perf_counter() - start) * 1000)

        except asyncio.TimeoutError:
            logger.error("retrieval.embedding_timeout", document_id=payload.document_id, timeout_s=5.0)
            raise

        except Exception as e:
            logger.error("retrieval.embedding_failed", document_id=payload.document_id, error=str(e))
            raise

        try:
            start = perf_counter()
            result = await asyncio.wait_for(
                self.vector_store.query(
                    document_id=payload.document_id,
                    query_embedd=query_vector,
                    top_k=payload.top_k,
                ),
                timeout=5.0,
            )
            record_timing("retrieval.search_vector_db", (perf_counter() - start) * 1000)
        except asyncio.TimeoutError:
            logger.error("retrieval.vector_query_timeout", document_id=payload.document_id, timeout_s=5.0)
            raise
        except Exception as e:
            logger.error("retrieval.vector_query_failed", document_id=payload.document_id, error=str(e))
            raise

        if not result or not result.get("documents"):
            return []

        documents = result["documents"][0]
        metadatas = result.get("metadatas", [[]])[0]
        ids = result.get("ids", [[]])[0]
        distances = result.get("distances", [[]])[0]

        responses: List[RetrievalResponse] = [
            RetrievalResponse(
                document_id=payload.document_id,
                chunk_id=ids[i],
                content=documents[i],
                score=1 - distances[i],
                metadata=metadatas[i] if i < len(metadatas) else {},
            )
            for i in range(len(documents))
        ]

        record_timing("retrieval.total_time", (perf_counter() - total_time) * 1000)
        logger.info(
            "retrieval.timing.total",
            document_id=payload.document_id,
            ms=round((perf_counter() - total_time) * 1000),
            chunks_returned=len(responses),
        )

        return responses

        # try:
        #     query_embedding = await self.embeddings.get_embeddings(payload.query)

        #     result = await self.vector_store.query(document_id=payload.document_id, query_embedd=query_embedding, top_k=payload.top_k)

        #     if not result or not result.get("documents"):
        #         return []

        #     documents = result["documents"][0]
        #     metadatas = result.get("metadatas", [[]])[0]
        #     ids = result.get("ids", [[]])[0]
        #     distances = result.get("distances", [[]])[0]

        #     responses: List[RetrievalResponse] = []

        #     for i in range(len(documents)):
        #         responses.append(
        #             RetrievalResponse(
        #                 document_id=payload.document_id,
        #                 chunk_id=ids[i],
        #                 content=documents[i],
        #                 score=1 - distances[i],
        #                 metadata=metadatas[i] if i < len(metadatas) else {},
        #             )
        #         )

        #     return responses

        # except Exception as e:
        #     logger.error("Failed to execute search query", document_id=payload.document_id, error=str(e))
        #     raise

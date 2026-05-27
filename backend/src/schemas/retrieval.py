from typing import Any, Dict

from pydantic import BaseModel, Field


class RetrievalRequest(BaseModel):
    """Request schema for retrieving relevant document chunks based on a query."""

    query: str = Field(..., description="The user's query for which relevant document chunks are to be retrieved.")
    chat_id: str = Field(..., description="Identifier of the chat session to which this query belongs.")
    user_id: str = Field(..., description="Identifier of the user making the query.")
    document_id: str = Field(..., description="Identifier of a specific document to search within. If not provided, search across all documents.")
    top_k: int = Field(default=5, description="The number of top relevant chunks to retrieve.")


class RetrievalResponse(BaseModel):
    """Response schema for the retrieved document chunks."""

    document_id: str = Field(..., description="Identifier of the document from which chunks were retrieved.")
    chunk_id: str = Field(..., description="Identifier of the retrieved chunk.")
    content: str = Field(..., description="Text content of the retrieved chunk.")
    metadata: Dict[str, Any] = Field(..., description="Metadata associated with the retrieved chunk, such asembedding model used, creation timestamp, etc.")
    score: float = Field(..., description="Relevance score of the retrieved chunk with respect to the query.")

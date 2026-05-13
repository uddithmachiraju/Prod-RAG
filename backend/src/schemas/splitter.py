from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar
from uuid import uuid4

from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseStatus(str, Enum):
    """Standard API response status."""

    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


class ErrorDetails(BaseModel):
    """Structured error response details."""

    error_code: str
    error_message: str
    error_type: Optional[str] = None
    error_details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class BaseResponse(BaseModel, Generic[T]):
    """Generic base API response wrapper."""

    request_id: str = Field(default_factory=lambda: str(uuid4()))
    status: ResponseStatus
    message: Optional[str] = None
    data: Optional[T] = None
    error: Optional[ErrorDetails] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "json_schema_serialization_defaults_required": True,
    }


# ============================================================
# Ingestion Response
# ============================================================


class IngestionResponse(BaseModel):
    """Response after document upload."""

    document_id: str
    file_name: str
    file_size: int
    file_format: str
    uploaded_at: datetime
    file_hash: str

    def get_file_hash_short(self) -> str:
        """Short version of file hash."""
        return self.file_hash[:12]


# ============================================================
# Parsing Response
# ============================================================


class ParsingResponse(BaseModel):
    """Response after parsing stage."""

    document_id: str
    paragraph_count: int
    word_count: int
    character_count: int
    parsing_time_ms: float
    parsed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# Chunking Response
# ============================================================


class ChunkResponse(BaseModel):
    """Response after semantic chunking."""

    document_id: str
    total_chunks: int
    chunk_sizes: List[int]
    chunking_time_ms: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def average_chunk_size(self) -> float:
        if not self.chunk_sizes:
            return 0.0
        return sum(self.chunk_sizes) / len(self.chunk_sizes)


# ============================================================
# Embedding Response
# ============================================================


class EmbeddingResponse(BaseModel):
    """Response after embedding generation."""

    document_id: str
    total_chunks_embedded: int
    embedding_model: str
    vector_dimension: int
    embedding_time_ms: float
    embedded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# Indexing Response
# ============================================================


class IndexingResponse(BaseModel):
    """Response after vector indexing."""

    document_id: str
    total_vectors_indexed: int
    index_name: str
    indexing_time_ms: float
    indexed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# Search / Retrieval Response
# ============================================================


class RetrievedChunk(BaseModel):
    """Individual retrieved chunk in search results."""

    chunk_id: str
    document_id: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Response for semantic search queries."""

    query: str
    total_results: int
    results: List[RetrievedChunk]
    search_time_ms: float
    searched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# RAG Answer Response
# ============================================================


class RAGAnswerResponse(BaseModel):
    """Final RAG-generated answer response."""

    query: str
    answer: str
    sources: List[RetrievedChunk]
    model_used: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    response_time_ms: float
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# Utility Factory Functions
# ============================================================


def success_response(
    data: T,
    message: Optional[str] = None,
) -> BaseResponse[T]:
    """Helper to create success responses."""

    return BaseResponse[T](
        status=ResponseStatus.SUCCESS,
        message=message,
        data=data,
    )


def error_response(
    error_code: str,
    error_message: str,
    error_type: Optional[str] = None,
    error_details: Optional[Dict[str, Any]] = None,
) -> BaseResponse[Any]:
    """Helper to create structured error responses."""

    return BaseResponse[Any](
        status=ResponseStatus.ERROR,
        error=ErrorDetails(
            error_code=error_code,
            error_message=error_message,
            error_type=error_type,
            error_details=error_details or {},
        ),
    )

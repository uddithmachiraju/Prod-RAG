import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class UploadURLRequest(BaseModel):
    """Request schema for generating presigned url."""

    document_id: str = Field(..., description="Unique identifier of the document.")
    file_name: str = Field(..., description="Name of the given document.")
    content_type: str = Field(..., description="MIME type of the file")


class UploadURLResponse(BaseModel):
    """Response schema for upload url generation."""

    url: str = Field(..., description="Upload URL used to upload the file.")
    file_key: str = Field(..., description="Unique key for the uploaded file in S3")


class ConformUploadRequest(BaseModel):
    """Request schema for the upload conformation and upserting in db."""

    document_id: str = Field(..., description="Unique identifier of the document.")
    file_name: str = Field(..., description="Name of the uploaded file")
    file_key: str = Field(..., description="Unique key for the uploaded file in S3")
    file_type: str = Field(..., description="MIME type of the uploaded file")
    file_size: int = Field(..., description="Size of the uploaded file in bytes")


class DocumentMetadata(BaseModel):
    """Metadata of the uploaded document."""

    file_name: str = Field(..., description="Original name of the uploaded file.")
    file_key: str = Field(..., description="Unique storage key used to retrieve the file.")
    file_type: str = Field(..., description="MIME type of the document.")
    file_size: int = Field(..., description="Size of the document in bytes.")

    processing_time: Optional[float] = Field(None, description="Total time taken to process the document in seconds.")
    parsing_time: Optional[float] = Field(None, description="Time taken to extract text from the document in seconds.")
    chunking_time: Optional[float] = Field(None, description="Time taken to split the document into chunks in seconds.")
    embedding_time: Optional[float] = Field(None, description="Time taken to generate embeddings in seconds.")


class DocumentChunk(BaseModel):
    """Individual processed chunk of a document."""

    chunk_id: uuid.UUID = Field(default_factory=lambda: uuid.uuid4(), description="Unique identifier for this chunk.")
    document_id: str = Field(..., description="Identifier of the parent document.")
    chunk_index: int = Field(..., description="Order of this chunk within the document.")
    content: str = Field(..., description="Text content of the chunk.")
    vector_id: Optional[str] = Field(None, description="Identifier of the embedding stored in the vector database.")
    embedding_model: Optional[str] = Field(None, description="Name of the embedding model used.")
    created_at: datetime = Field(..., description="Timestamp when the chunk was created.")


class Document(BaseModel):
    """Main schema representing a processed document."""

    user_id: str = Field(..., description="Identifier of the user who uploaded the document.")
    document_id: uuid.UUID = Field(default_factory=lambda: uuid.uuid4(), description="Unique identifier for the document.")
    chunks: List[DocumentChunk] = Field(..., description="List of processed chunks belonging to the document.")
    uploaded_at: datetime = Field(..., description="Timestamp when the document was uploaded.")
    processed_at: datetime = Field(..., description="Timestamp when document processing completed.")
    last_accessed: datetime = Field(..., description="Timestamp of the most recent document access.")
    metadata: DocumentMetadata = Field(..., description="File details and processing metrics.")
    error_message: Optional[str] = Field(None, description="Short error message if processing failed.")
    error_details: Dict[str, Any] = Field(default_factory=dict, description="Additional structured error details.")

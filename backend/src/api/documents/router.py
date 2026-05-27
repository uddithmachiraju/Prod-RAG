from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.auth import get_current_user
from src.core.container import get_chroma_db, get_sqs_producer
from src.db.mongo_db import get_db
from src.schemas.document import (
    ConformUploadRequest,
    UploadURLRequest,
    UploadURLResponse,
)
from src.services.chats.chat_service import create_chat
from src.services.storage.s3_service import generate_presigned_url, generate_view_url

router = APIRouter()


@router.post("/upload-url", status_code=status.HTTP_200_OK, response_model=UploadURLResponse)
async def get_upload_url(payload: UploadURLRequest, user: dict = Depends(get_current_user)) -> UploadURLResponse:
    """Generate a presigned S3 upload URL."""

    presigned_url, file_key = await generate_presigned_url(
        user_id=str(user["_id"]),
        filename=payload.file_name,
        document_id=payload.document_id,
        content_type=payload.content_type,
    )

    return UploadURLResponse(
        url=presigned_url,
        file_key=file_key,
    )


@router.post("/conform-upload", status_code=status.HTTP_201_CREATED)
async def conform_upload(payload: ConformUploadRequest, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """conform file upload and store the metadata in the db."""

    job_data: Dict[str, Any] = {
        "user_id": str(user["_id"]),
        "file_name": payload.file_name,
        "file_key": payload.file_key,
        "file_type": payload.file_type,
        "file_size": payload.file_size,
        "document_id": payload.document_id,
    }

    # Create a new chat 
    chat_data: Dict[str, Any] = {
        "user_id": str(user["_id"]),
        "document_id": payload.document_id,
        "title": payload.file_name,
        "title_generated": False,
        "last_message_preview": "",
        "deleted": False,
        "pinned": False,
        "status": "active",
        "metadata": {
            "latency": 0
        },

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    chat_id = await create_chat(user=user, db=db, chat_data=chat_data)

    producer = get_sqs_producer()
    message_id = producer.enqueue_job(job_data=job_data)

    return JSONResponse(
        status_code=201,
        content={
            "message": "Upload conformed and job enqueued successfully", 
            "message_id": message_id, 
            "chat_id": chat_id,
        },
    )


@router.get("/{document_id}/chunks", status_code=status.HTTP_200_OK)
async def get_document_chunks(document_id: str, user: dict = Depends(get_current_user)) -> Any:
    """Get all chunks for a specific document."""

    chroma_db = get_chroma_db()
    result = chroma_db.get_document_data(document_id=document_id)

    if not result or not result.get("documents"):
        return JSONResponse(status_code=404, content={"message": "Document not found"})

    documents = result["documents"] or []
    # metadatas = result.get("metadatas", [])
    ids = result.get("ids", [])
    # embeddings = result.get("embeddings", [])

    chunks = []
    for i in range(len(documents)):
        chunks.append(
            {
                "chunk_id": ids[i] if i < len(ids) else None,
                "content": documents[i],
                # "metadata": metadatas[i] if i < len(metadatas) else {},  # type: ignore
                # "embedding": embeddings[i] if i < len(embeddings) else [],  # type: ignore
            }
        )

    return {"document_id": document_id, "chunks": chunks}


@router.get("/documents", status_code=status.HTTP_200_OK)
async def get_documents(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """List all documents for the current user."""

    cursor = db.documents.find({"user_id": str(user["_id"])}).sort("uploaded_at", -1)
    documents = await cursor.to_list(length=100)

    # Convert ObjectId to string for JSON serialization
    for doc in documents:
        doc["_id"] = str(doc["_id"])

    return documents


@router.get("/", status_code=status.HTTP_200_OK)
async def list_documents(user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """List all documents for the current user."""

    cursor = db.documents.find({"user_id": str(user["_id"])}).sort("uploaded_at", -1)
    documents = await cursor.to_list(length=100)

    # Convert ObjectId to string for JSON serialization
    for doc in documents:
        doc["_id"] = str(doc["_id"])

    return documents


@router.get("/view-url/{file_key:path}", status_code=status.HTTP_200_OK)
async def get_view_url(file_key: str, user: dict = Depends(get_current_user)):
    """Generate a presigned GET URL for viewing a document."""

    url = await generate_view_url(file_key=file_key)

    return {"url": url}

from datetime import datetime
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.auth import get_current_user
from src.db.mongo_db import get_db
from src.schemas.document import (
    ConformUploadRequest,
    UploadURLRequest,
    UploadURLResponse,
)
from src.services.storage.s3_service import generate_presigned_url, generate_view_url

router = APIRouter()


@router.post("/upload-url", status_code=status.HTTP_200_OK, response_model=UploadURLResponse)
async def get_upload_url(payload: UploadURLRequest, user: dict = Depends(get_current_user)) -> UploadURLResponse:
    """Generate a presigned S3 upload URL."""

    presigned_url, file_key = await generate_presigned_url(
        user_id=user["_id"],
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

    document_data = {
        "user_id": str(user["_id"]),
        "document_id": payload.document_id,
        "file_name": payload.file_name,
        "file_key": payload.file_key,
        "file_type": payload.file_type,
        "file_size": payload.file_size,
        "status": "uploaded",
        "uploaded_at": datetime.utcnow(),
    }

    await db.documents.insert_one(document_data)

    return JSONResponse(
        status_code=201,
        content={"message": "File metadata recorded successfully"},
    )


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

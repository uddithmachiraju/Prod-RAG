from fastapi import APIRouter, Depends, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.auth import get_current_user
from src.db.mongo_db import get_db
from src.services.parsers.pdf_parser import PDFParser

router = APIRouter()
parser = PDFParser()


@router.post("/ingest")
async def ingest(file: UploadFile, user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Document ingestion endpoint."""

    file_bytes = await file.read()
    parsed_data = await parser.parse(file_bytes)

    return {
        "message": "File ingested successfully",
        "parsed_data": parsed_data,
    }

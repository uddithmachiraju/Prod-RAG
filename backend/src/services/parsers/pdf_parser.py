import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

import fitz  # type: ignore

from src.config.logging import get_logger
from src.schemas.document import Document, DocumentChunk, DocumentMetadata
from src.services.parsers.base_parser import BaseParser
from src.services.parsers.semantic_splitter import SemanticSplitter
from src.services.storage.s3_service import download_file_from_s3

logger = get_logger(__name__)


class PDFParser(BaseParser):
    """A class to parse PDF files and extract text content."""

    def __init__(self) -> None:
        """Initialize the PDFParser class."""

        super().__init__()
        self.semantic_splitter = SemanticSplitter()

    def _get_current_timestamp(self) -> datetime:
        """Get the current timestamp in ISO format."""

        return datetime.now(timezone.utc)

    async def parse(self, user_id: str, file_metadata: Dict[str, Any]) -> Document:
        """Parse the PDF file and return a dictionary with the full text and semantic chunks."""

        document_id = uuid4()
        uploaded_at = self._get_current_timestamp() 
        total_start = time.perf_counter()

        # Parsing
        parsing_start = time.perf_counter()
        file_bytes = await download_file_from_s3(file_metadata.get("file_key", ""))
        full_text = self._extract_data(file_bytes)
        parsing_time = round(time.perf_counter() - parsing_start, 4)

        # Chunking
        chunking_start = time.perf_counter()
        chunks: List[DocumentChunk] = await self.semantic_splitter.parse(document_id=str(document_id), text=full_text)
        chunking_time = round(time.perf_counter() - chunking_start, 4)

        processing_time = round(time.perf_counter() - total_start, 4)
        processed_at = self._get_current_timestamp()

        metadata = DocumentMetadata(
            file_name=file_metadata.get("file_name", "unknown.pdf"),
            file_key=file_metadata.get("file_key", ""),
            file_type=file_metadata.get("file_type", "application/pdf"),
            file_size=file_metadata.get("file_size", 0),
            processing_time=processing_time,
            parsing_time=parsing_time,
            chunking_time=chunking_time,
            embedding_time=None,
        )

        return Document(
            user_id=user_id,
            document_id=str(document_id),
            chunks=chunks,
            uploaded_at=uploaded_at,
            processed_at=processed_at,
            last_accessed=processed_at,
            metadata=metadata,
            error_message=None,
            error_details={},
        )

    def _extract_data(self, file_bytes: bytes) -> str:
        """Parse the PDF and extract text, joining broken lines into full paragraphs."""

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            pages_data = []

            for page_number in range(len(doc)):
                page = doc[page_number]

                blocks = page.get_text("blocks")

                page_paragraphs = []
                for block in blocks:
                    block_text = block[4].strip()
                    if not block_text:
                        continue

                    lines = block_text.split("\n")
                    joined_lines = []
                    buffer = ""

                    for line in lines:
                        line = line.strip()
                        if not line:
                            if buffer:
                                joined_lines.append(buffer.strip())
                                buffer = ""
                            continue

                        if buffer and not re.search(r"[.!?:,\-]$", buffer):
                            buffer += " " + line
                        else:
                            if buffer:
                                joined_lines.append(buffer.strip())
                            buffer = line

                    if buffer:
                        joined_lines.append(buffer.strip())

                    page_paragraphs.extend(joined_lines)

                pages_data.append("\n".join(page_paragraphs))

            return "\n".join(pages_data)

        except Exception as e:
            logger.exception("PDF parsing failed")
            raise RuntimeError("Failed to parse PDF") from e

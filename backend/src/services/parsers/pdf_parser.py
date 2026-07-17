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

# Compiled once at import time instead of recompiled on every call.
_END_PUNCT_PATTERN = re.compile(r"[.!?:,\-]$")


class PDFParser(BaseParser):

    def __init__(self) -> None:
        super().__init__()
        self.semantic_splitter = SemanticSplitter()

    def _get_current_timestamp(self) -> datetime:
        return datetime.now(timezone.utc)

    async def parse(self, user_id: str, file_metadata: Dict[str, Any]) -> Document:
        document_id = file_metadata.get("document_id", str(uuid4()))
        # uploaded_at and processed_at intentionally stay as two separate calls:
        # they mark genuinely different points in time (start vs. end of
        # processing), unlike the per-chunk created_at in SemanticSplitter,
        # which was redundant because all chunks are created in one batch.
        uploaded_at = self._get_current_timestamp()
        total_start = time.perf_counter()

        parsing_start = time.perf_counter()
        file_bytes = await download_file_from_s3(file_metadata.get("file_key", ""))
        download_time = round(time.perf_counter() - parsing_start, 4)

        extract_start = time.perf_counter()
        full_text = self._extract_data(file_bytes)
        extract_time = round(time.perf_counter() - extract_start, 4)
        parsing_time = round(time.perf_counter() - parsing_start, 4)

        logger.info(
            "pdf_parser",
            download_ms=download_time * 1000,
            extract_ms=extract_time * 1000,
        )

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

        doc = None
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")

            all_lines: list[str] = []
            end_punct = _END_PUNCT_PATTERN.search

            for page in doc:
                blocks = page.get_text("blocks")
                blocks.sort(key=lambda b: (b[1], b[0]))

                for block in blocks:
                    raw = block[4]
                    if not raw or not raw.strip():
                        continue

                    buffer: str | None = None

                    for line in raw.splitlines():
                        line = line.strip()
                        if not line:
                            continue

                        if buffer is None:
                            buffer = line
                            continue

                        prev_ends_mid_sentence = not end_punct(buffer)
                        next_is_lowercase = line[0].islower()

                        if prev_ends_mid_sentence and next_is_lowercase:
                            buffer += " " + line
                        else:
                            all_lines.append(buffer)
                            buffer = line

                    if buffer:
                        all_lines.append(buffer)

            return "\n".join(all_lines)

        except Exception as e:
            logger.exception("PDF parsing failed")
            raise RuntimeError("Failed to parse PDF") from e

        finally:
            if doc is not None:
                doc.close()

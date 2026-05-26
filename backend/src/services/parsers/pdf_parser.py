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

    def __init__(self) -> None:
        super().__init__()
        self.semantic_splitter = SemanticSplitter()

    def _get_current_timestamp(self) -> datetime:
        return datetime.now(timezone.utc)

    async def parse(self, user_id: str, file_metadata: Dict[str, Any]) -> Document:
        document_id = uuid4()
        uploaded_at = self._get_current_timestamp()
        total_start = time.perf_counter()

        parsing_start = time.perf_counter()
        file_bytes = await download_file_from_s3(file_metadata.get("file_key", ""))
        full_text = self._extract_data(file_bytes)
        parsing_time = round(time.perf_counter() - parsing_start, 4)

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
        """
        Extract text preserving one logical line per output line.

        From raw block output we know:
        - Role headers are 3 separate blocks: job title / date / company
        - Bullets are individual blocks
        - Section headings are individual blocks
        - Only true prose wraps (mid-sentence line breaks) should be joined

        We only join two lines if:
          - previous line does NOT end in sentence-ending punctuation
          - next line starts with a lowercase letter (true prose continuation)
        Everything else stays as separate lines.
        """
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            all_lines: list[str] = []

            for page in doc:
                blocks = sorted(page.get_text("blocks"), key=lambda b: (b[1], b[0]))

                for block in blocks:
                    raw = block[4].strip()
                    if not raw:
                        continue

                    sub_lines = [l.strip() for l in raw.split("\n") if l.strip()]
                    if not sub_lines:
                        continue

                    merged: list[str] = []
                    buffer = ""

                    for line in sub_lines:
                        if not buffer:
                            buffer = line
                            continue

                        prev_ends_mid_sentence = not re.search(r"[.!?:,\-]$", buffer)
                        next_is_lowercase = line[0].islower() if line else False

                        if prev_ends_mid_sentence and next_is_lowercase:
                            buffer += " " + line
                        else:
                            merged.append(buffer)
                            buffer = line

                    if buffer:
                        merged.append(buffer)

                    all_lines.extend(merged)

            return "\n".join(all_lines)

        except Exception as e:
            logger.exception("PDF parsing failed")
            raise RuntimeError("Failed to parse PDF") from e

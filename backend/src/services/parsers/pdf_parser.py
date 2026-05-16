import re
from typing import List

import fitz  # type: ignore

from src.config.logging import get_logger
from src.schemas.document import DocumentChunk
from src.services.parsers.base_parser import BaseParser
from src.services.parsers.semantic_splitter import SemanticSplitter

logger = get_logger(__name__)


class PDFParser(BaseParser):
    """A class to parse PDF files and extract text content."""

    def __init__(self) -> None:
        """Initialize the PDFParser class."""

        super().__init__()
        self.semantic_splitter = SemanticSplitter()

    async def parse(self, file_bytes: bytes) -> List[DocumentChunk]:
        """Parse the PDF file and return a dictionary with the full text and semantic chunks."""

        full_text = self._extract_data(file_bytes)
        semantic_chunks = await self.semantic_splitter.parse(full_text, document_id="1234")

        return semantic_chunks

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

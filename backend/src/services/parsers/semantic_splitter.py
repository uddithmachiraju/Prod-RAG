import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import numpy as np

# from src.services.embeddings.embeds import Embeddings
from backend.src.services.embeddings.jina_embeds import JinaEmbeddings
from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.document import DocumentChunk
from src.services.chroma.db import chroma_client

logger = get_logger(__name__)
settings = get_settings()
# embeddings = Embeddings()
embeddings = JinaEmbeddings()

_NOISE_PATTERNS = [
    r"^page\s+\d+\s+of\s+\d+$",
    r"^headquarters:",
    r"^\d+\.$",
    r"^(signature|full name|date)\s*:",
]

_SECTION_HEADING_PATTERN = re.compile(
    r"^(EXPERIENCE|EDUCATION|PROJECTS?|SKILLS?|CERTIFICATIONS?|AWARDS?|SUMMARY|OBJECTIVE|PUBLICATIONS?|LANGUAGES?|INTERESTS?|REFERENCES?)[\s:]*$",
    re.IGNORECASE,
)

_DATE_RANGE_PATTERN = re.compile(
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}",
    re.IGNORECASE,
)

_BULLET_PATTERN = re.compile(r"^[•\-\*\u2022\u2013\u2014]")

# Project title: a line with a | separator and no bullet, e.g. "Real-time Platform | GitHub"
_PROJECT_TITLE_PATTERN = re.compile(r"^[^•\-\*].+\|\s*(github|gitlab|demo|link|url)", re.IGNORECASE)


class SemanticSplitter:

    def __init__(self) -> None:
        super().__init__()
        self.collection = chroma_client.get_or_create_collection(
            name=settings.CHROMA_DB_COLLECTION,
            embedding_function=None,
            metadata={"hnsw:space": "cosine"},
        )

    def _clean_text(self, text: str) -> str:
        if not text or not text.strip():
            return ""
        text = re.sub(r"\s+", " ", text).strip()
        text = text.replace("\u00a0", " ")
        text = text.replace("\u200b", "")
        text = text.replace("\ufeff", "")
        text = text.replace("\r", "")
        text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]", "", text)
        return text.lstrip(" .\n\t")

    @staticmethod
    def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must be of the same length")
        return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))

    @staticmethod
    def _merge_orphan_chunks(chunks: list[str], min_words: int = 25) -> list[str]:
        if not chunks:
            return chunks
        merged: list[str] = []
        carry: str = ""
        for chunk in chunks:
            if len(chunk.split()) < min_words:
                carry += " " + chunk
            else:
                if carry:
                    merged.append(carry.strip())
                    carry = ""
                merged.append(chunk)
        if carry:
            if merged:
                merged[-1] += " " + carry.strip()
            else:
                merged.append(carry.strip())
        return merged

    def _is_noise(self, text: str) -> bool:
        lower = text.lower().strip()
        return any(re.match(p, lower) for p in _NOISE_PATTERNS)

    def _is_section_heading(self, text: str) -> bool:
        return bool(_SECTION_HEADING_PATTERN.match(text.strip()))

    def _is_date_range(self, text: str) -> bool:
        return bool(_DATE_RANGE_PATTERN.search(text.strip()))

    def _is_project_title(self, text: str) -> bool:
        """Project title line e.g. 'Real-time Content Intelligence Platform | GitHub'"""
        return bool(_PROJECT_TITLE_PATTERN.match(text.strip()))

    def _split_into_paragraphs(self, text: str) -> list[dict[str, Any]]:
        """
        Tag each line as one of:
        - is_section_heading: EXPERIENCE, EDUCATION, PROJECTS, SKILLS etc.
        - is_role_header:     3-line merged block (Job Title + Date + Company)
        - is_project_title:   project name line with | GitHub / | Demo etc.
        - plain content:      bullet points, descriptions
        """
        raw_lines: list[str] = []
        for line in text.split("\n"):
            cleaned = self._clean_text(line)
            if not cleaned:
                continue
            if self._is_noise(cleaned):
                continue
            raw_lines.append(cleaned)

        paragraphs: list[dict[str, Any]] = []
        i = 0

        while i < len(raw_lines):
            line = raw_lines[i]

            # 3-line role header: Job Title / Date Range / Company Name
            if (
                i + 2 < len(raw_lines)
                and not self._is_section_heading(line)
                and not _BULLET_PATTERN.match(line)
                and not self._is_date_range(line)
                and not self._is_project_title(line)
                and self._is_date_range(raw_lines[i + 1])
                and not self._is_section_heading(raw_lines[i + 2])
                and not _BULLET_PATTERN.match(raw_lines[i + 2])
                and not self._is_date_range(raw_lines[i + 2])
            ):
                role_header = f"{line} {raw_lines[i + 1]} {raw_lines[i + 2]}"
                paragraphs.append(
                    {
                        "content": role_header,
                        "is_section_heading": False,
                        "is_role_header": True,
                        "is_project_title": False,
                        "is_heading": False,
                    }
                )
                i += 3
                continue

            is_section_heading = self._is_section_heading(line)
            is_project_title = (not is_section_heading) and self._is_project_title(line)

            paragraphs.append(
                {
                    "content": line,
                    "is_section_heading": is_section_heading,
                    "is_role_header": False,
                    "is_project_title": is_project_title,
                    "is_heading": is_section_heading,
                }
            )
            i += 1

        return paragraphs

    async def _semantic_chunking(self, paragraphs: list[dict[str, Any]]) -> list[str]:
        try:
            chunks: list[str] = []
            section_heading: str = ""
            role_header: str = ""
            role_lines: list[str] = []
            max_len: int = 1200

            def _emit_role() -> None:
                nonlocal role_lines
                if not role_lines:
                    return
                full = "\n".join(role_lines)
                if len(full) <= max_len:
                    chunks.append(full)
                else:
                    anchor = role_lines[0]
                    current_lines = [anchor]
                    current_len = len(anchor)
                    for line in role_lines[1:]:
                        if current_len + len(line) > max_len:
                            chunks.append("\n".join(current_lines))
                            current_lines = [anchor, line]
                            current_len = len(anchor) + len(line)
                        else:
                            current_lines.append(line)
                            current_len += len(line)
                    if current_lines:
                        chunks.append("\n".join(current_lines))
                role_lines = []

            for para in paragraphs:
                text = para["content"]

                # New section heading — flush current role, update section context
                if para["is_section_heading"]:
                    _emit_role()
                    section_heading = text
                    role_header = ""
                    continue

                # New role header (Experience section) — flush previous, start fresh
                if para["is_role_header"]:
                    _emit_role()
                    role_header = text
                    header_line = f"{section_heading}\n{role_header}" if section_heading else role_header
                    role_lines = [header_line]
                    continue

                # Project title (Projects section) — each project is its own chunk
                if para["is_project_title"]:
                    _emit_role()
                    role_header = text
                    header_line = f"{section_heading}\n{role_header}" if section_heading else role_header
                    role_lines = [header_line]
                    continue

                # Regular content — append to current role/project
                role_lines.append(text)

            _emit_role()

            return self._merge_orphan_chunks(chunks, min_words=25)

        except Exception as e:
            logger.error(f"Error during semantic chunking: {e}")
            return []

    async def parse(self, text: str, document_id: str) -> list[DocumentChunk]:
        start = time.time()

        try:
            if not text or not text.strip():
                raise ValueError("Input text is empty or blank.")

            paragraphs = self._split_into_paragraphs(text)

            if not paragraphs:
                raise ValueError("No paragraphs found in text.")

            chunks = await self._semantic_chunking(paragraphs)

            structured_chunks: list[DocumentChunk] = []

            for index, chunk_text in enumerate(chunks):
                embedding = await embeddings.get_embeddings(chunk_text)
                vector_id = f"{document_id}.chunk.{index}"

                self.collection.add(
                    ids=[vector_id],
                    documents=[chunk_text],
                    embeddings=[embedding],  # type: ignore
                    metadatas=[{"document_id": document_id, "chunk_index": index}],
                )
                structured_chunks.append(
                    DocumentChunk(
                        chunk_id=str(uuid.uuid4()),
                        document_id=document_id,
                        chunk_index=index,
                        content=chunk_text,
                        created_at=datetime.now(timezone.utc),
                        vector_id=vector_id,
                        embedding_model=settings.AWS_BEDROCK_EMBED_MODEL_ID,
                    )
                )

            logger.info(
                "semantic_chunking_complete",
                word_count=len(text.split()),
                paragraph_count=len(paragraphs),
                chunk_count=len(chunks),
                parsed_at=datetime.utcnow().isoformat(),
                processing_time_ms=round((time.time() - start) * 1000, 2),
            )

            return structured_chunks

        except Exception as e:
            logger.error(f"Error during parsing: {e}")
            return []

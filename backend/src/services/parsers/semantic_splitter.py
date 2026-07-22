import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from qdrant_client import models

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.document import DocumentChunk

# from src.services.embeddings.embeds import Embeddings
# from src.services.embeddings.jina_embeds import JinaEmbeddings
from src.services.embeddings.openai_embeds import OpenAIEmbeddings
from src.services.vector_store.chroma_db import chroma_client
from src.services.vector_store.qdrant_db import qdrant_client

logger = get_logger(__name__)
settings = get_settings()
# embeddings = Embeddings()
# embeddings = JinaEmbeddings()
embeddings = OpenAIEmbeddings()

_NOISE_PATTERNS = [
    re.compile(r"^page\s+\d+\s+of\s+\d+$"),
    re.compile(r"^headquarters:"),
    re.compile(r"^\d+\.$"),
    re.compile(r"^(signature|full name|date)\s*:"),
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

_CONTROL_CHARS_PATTERN = re.compile(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]")
_WHITESPACE_PATTERN = re.compile(r"\s+")


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
        text = text.replace("\u00a0", " ").replace("\u200b", "").replace("\ufeff", "").replace("\r", "")
        text = _CONTROL_CHARS_PATTERN.sub("", text)
        text = _WHITESPACE_PATTERN.sub(" ", text).strip()
        return text.lstrip(" .\n\t")

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
        return any(p.match(lower) for p in _NOISE_PATTERNS)

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

        # Pre-compute the per-line boolean checks exactly once instead of
        # re-running the same regexes multiple times per line inside the loop.
        is_heading_flags = [self._is_section_heading(line) for line in raw_lines]
        is_bullet_flags = [bool(_BULLET_PATTERN.match(line)) for line in raw_lines]
        is_date_flags = [self._is_date_range(line) for line in raw_lines]
        is_project_flags = [(not is_heading_flags[idx]) and self._is_project_title(line) for idx, line in enumerate(raw_lines)]

        paragraphs: list[dict[str, Any]] = []
        i = 0

        while i < len(raw_lines):
            line = raw_lines[i]

            # 3-line role header: Job Title / Date Range / Company Name
            if (
                i + 2 < len(raw_lines)
                and not is_heading_flags[i]
                and not is_bullet_flags[i]
                and not is_date_flags[i]
                and not is_project_flags[i]
                and is_date_flags[i + 1]
                and not is_heading_flags[i + 2]
                and not is_bullet_flags[i + 2]
                and not is_date_flags[i + 2]
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

            is_section_heading = is_heading_flags[i]
            is_project_title = is_project_flags[i]

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
        start = time.perf_counter()

        try:
            if not text or not text.strip():
                raise ValueError("Input text is empty or blank.")

            t0 = time.perf_counter()
            paragraphs = self._split_into_paragraphs(text)
            t1 = time.perf_counter()

            if not paragraphs:
                raise ValueError("No paragraphs found in text.")

            chunks = await self._semantic_chunking(paragraphs)
            t2 = time.perf_counter()

            if len(set(chunks)) != len(chunks):
                logger.warning("duplicate_chunks_detected", document_id=document_id, chunk_count=len(chunks), unique_count=len(set(chunks)))

            embeddings_list = await embeddings.get_embeddings(chunks)
            if len(embeddings_list) != len(chunks):
                logger.error("embedding_count_mismatch", chunk_count=len(chunks), embedding_count=len(embeddings_list), document_id=document_id)
                raise ValueError(f"Expected {len(chunks)} embeddings, got {len(embeddings_list)}")

            t3 = time.perf_counter()

            # created_at computed once for the whole batch rather than once per chunk.
            created_at = datetime.now(timezone.utc)

            # ids = [f"{document_id}.chunk.{index}" for index in range(len(chunks))]
            ids = [str(uuid.uuid4()) for _ in chunks]
            documents = chunks
            metadatas = [{"document_id": document_id, "chunk_index": index} for index in range(len(chunks))]

            structured_chunks: list[DocumentChunk] = [
                DocumentChunk(
                    chunk_id=str(uuid.uuid4()),
                    document_id=document_id,
                    chunk_index=index,
                    content=chunk_text,
                    created_at=created_at,
                    vector_id=vector_id,
                    embedding_model=settings.OPENAI_EMBED_MODEL_ID,
                )
                for index, (chunk_text, vector_id) in enumerate(zip(chunks, ids))
            ]

            # Write to Chroma in bounded batches instead of one large add() call.
            # for batch_start in range(0, len(ids), 100):
            #     batch_end = batch_start + 100
            #     self.collection.add(
            #         ids=ids[batch_start:batch_end],
            #         documents=documents[batch_start:batch_end],
            #         embeddings=embeddings_list[batch_start:batch_end],
            #         metadatas=metadatas[batch_start:batch_end],  # type: ignore
            #     )

            for batch_start in range(0, len(ids), 100):
                batch_end = min(batch_start + 100, len(ids))  # cap at actual list length
                points = [
                    models.PointStruct(
                        id=ids[i],
                        vector=embeddings_list[i],
                        payload={
                            "content": documents[i],
                            "metadata": metadatas[i],
                            "document_id": metadatas[i].get("document_id"),
                            "user_id": metadatas[i].get("user_id"),
                        },
                    )
                    for i in range(batch_start, batch_end)
                ]

                await qdrant_client.upsert(
                    collection_name=settings.QDRANT_COLLECTION,
                    points=points,
                    wait=True,
                )

            t4 = time.perf_counter()

            logger.info(
                "semantic_chunking_complete",
                word_count=len(text.split()),
                paragraph_count=len(paragraphs),
                chunk_count=len(chunks),
                parsed_at=datetime.now(timezone.utc).isoformat(),
                split_ms=round((t1 - t0) * 1000, 2),
                chunk_ms=round((t2 - t1) * 1000, 2),
                embedding_ms=round((t3 - t2) * 1000, 2),
                chroma_ms=round((t4 - t3) * 1000, 2),
                total_ms=round((t4 - start) * 1000, 2),
            )

            return structured_chunks

        except Exception as e:
            logger.error(f"Error during parsing: {e}")
            return []

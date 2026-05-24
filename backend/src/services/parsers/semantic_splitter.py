import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from unstructured.documents.elements import (
    Footer,
    Header,
    PageBreak,
    Title,
)
from unstructured.partition.auto import partition

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.document import DocumentChunk
from src.services.chroma.db import chroma_client
from src.services.embeddings.embeds import Embeddings

logger = get_logger(__name__)
settings = get_settings()
embeddings = Embeddings()

# Element types that should never become chunk content
_SKIP_TYPES = (Footer, PageBreak)

# Element types that signal a new structural section
_HEADING_TYPES = (Title, Header)

# Soft token budget per chunk (characters ÷ 4 ≈ tokens)
_MAX_CHUNK_CHARS = 1500


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _element_text(el: Any) -> str:
    return (el.text or "").strip()


def _build_breadcrumb(stack: list[str]) -> str:
    return " > ".join(stack) if stack else ""


def _prompt_text(chunk_text: str, breadcrumb: str) -> str:
    """Construct the text that goes to the LLM — heading injected here only."""
    if breadcrumb:
        return f"{breadcrumb}\n{chunk_text}"
    return chunk_text


# ─────────────────────────────────────────────────────────────────────────────
# Main splitter
# ─────────────────────────────────────────────────────────────────────────────


class SemanticSplitter:
    """
    Production-grade document chunker.

    Accepts either:
      - A file path  → partitioned by Unstructured (PDF, DOCX, HTML, …)
      - Raw text     → partitioned as plain text via Unstructured

    Each DocumentChunk stores:
      - content      : clean chunk text with NO heading prefix
      - metadata     : section breadcrumb, element types, page numbers, etc.

    Heading context is prepended only when building the retrieval/LLM prompt,
    keeping the stored embeddings free of repetitive heading noise.
    """

    def __init__(self) -> None:
        super().__init__()

        self.collection = chroma_client.get_or_create_collection(
            name=settings.CHROMA_DB_COLLECTION,
            embedding_function=None,
            metadata={"hnsw:space": "cosine"},
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Unstructured partitioning
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _partition(source: str | None, is_file: bool = True) -> list[Any]:
        """
        Partition a document into typed Unstructured elements.

        Args:
            source:   File path (is_file=True) or raw text string (is_file=False).
            is_file:  When False, writes text to a temp buffer for partitioning.

        Returns:
            List of Unstructured Element objects, each with .text and .type.
        """
        if is_file:
            # Unstructured auto-detects PDF, DOCX, HTML, TXT, etc.
            elements = partition(filename=source)
        else:
            # Wrap raw text so Unstructured can still type the elements
            import io

            elements = partition(file=io.BytesIO(source.encode()), content_type="text/plain")

        # Drop footers, page breaks — pure layout noise
        return [el for el in elements if not isinstance(el, _SKIP_TYPES)]

    # ─────────────────────────────────────────────────────────────────────────
    # Structural chunking
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _structural_chunks(elements: list[Any]) -> list[dict[str, Any]]:
        """
        Group Unstructured elements into logical chunks.

        Strategy
        ────────
        - Maintain a heading breadcrumb stack (Title / Header elements).
        - Accumulate content elements under the current heading.
        - Flush into a new chunk when:
            (a) a new heading is encountered, OR
            (b) the accumulated text exceeds _MAX_CHUNK_CHARS.

        Each chunk dict:
          {
            "text":        str,          # clean content, NO heading prefix
            "breadcrumb":  str,          # "Experience > ML Intern Apr 2025..."
            "types":       list[str],    # element types present e.g. ["ListItem"]
            "pages":       list[int],    # page numbers spanned
          }
        """
        chunks: list[dict[str, Any]] = []
        heading_stack: list[str] = []
        heading_levels: dict[int, int] = {}   # id(el) → level tag

        current_texts: list[str] = []
        current_types: list[str] = []
        current_pages: list[int] = []
        current_chars: int = 0

        def _flush() -> None:
            if not current_texts:
                return
            chunks.append({
                "text":       " ".join(current_texts),
                "breadcrumb": _build_breadcrumb(heading_stack),
                "types":      list(dict.fromkeys(current_types)),  # deduped, ordered
                "pages":      sorted(set(current_pages)),
            })
            current_texts.clear()
            current_types.clear()
            current_pages.clear()

        def _get_page(el: Any) -> int | None:
            meta = getattr(el, "metadata", None)
            return getattr(meta, "page_number", None) if meta else None

        def _heading_depth(el: Any) -> int:
            """
            Infer heading depth from Unstructured metadata where available,
            otherwise fall back to a simple heuristic on text length.
            Title elements with very short text = high-level (depth 1).
            """
            meta = getattr(el, "metadata", None)
            category_depth = getattr(meta, "category_depth", None)
            if category_depth is not None:
                return int(category_depth)
            # Heuristic: short ALL-CAPS or very short titles = top-level
            text = _element_text(el)
            if text.isupper() or len(text.split()) <= 3:
                return 1
            return 2

        for el in elements:
            text = _element_text(el)
            if not text:
                continue

            page = _get_page(el)

            # ── Heading element → flush current, update breadcrumb stack ─────
            if isinstance(el, _HEADING_TYPES):
                _flush()
                depth = _heading_depth(el)
                # Pop headings at same or deeper depth
                # We track depth via a parallel list
                while heading_stack and heading_levels.get(id(heading_stack[-1]), 0) >= depth:
                    heading_stack.pop()
                heading_stack.append(text)
                heading_levels[id(text)] = depth
                continue

            # ── Content element → accumulate ─────────────────────────────────
            text_len = len(text)

            # Hard cap: flush before adding if budget exceeded
            if current_chars + text_len > _MAX_CHUNK_CHARS and current_texts:
                _flush()

            current_texts.append(text)
            current_types.append(type(el).__name__)
            current_chars += text_len
            if page is not None:
                current_pages.append(page)

        _flush()
        return chunks

    # ─────────────────────────────────────────────────────────────────────────
    # Cosine similarity (kept for any internal use)
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        import numpy as np
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must be of the same length")
        return float(
            np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Public entry point — accepts file path OR raw text
    # ─────────────────────────────────────────────────────────────────────────

    async def parse(
        self,
        document_id: str,
        file_path: str | None = None,
        text: str | None = None,
    ) -> list[DocumentChunk]:
        """
        Parse a document and return metadata-rich semantic chunks.

        Pass either `file_path` (preferred — Unstructured handles layout) or
        `text` (raw string fallback).
        """
        start = time.time()

        try:
            if not file_path and not text:
                raise ValueError("Provide either file_path or text.")

            # ── Step 1: Partition into typed elements ─────────────────────────
            elements = self._partition(
                source=file_path if file_path else text,
                is_file=bool(file_path),
            )

            if not elements:
                raise ValueError("No elements extracted from document.")

            # ── Step 2: Structural chunking ───────────────────────────────────
            raw_chunks = self._structural_chunks(elements)

            if not raw_chunks:
                raise ValueError("No chunks produced from elements.")

            # ── Step 3: Embed + store ─────────────────────────────────────────
            structured_chunks: list[DocumentChunk] = []

            async def embed_and_store(index: int, chunk: dict[str, Any]) -> DocumentChunk:
                chunk_text = chunk["text"]
                breadcrumb = chunk["breadcrumb"]

                # Embed CLEAN text only — no heading noise in the vector
                embedding = await embeddings.get_embedding(chunk_text)
                vector_id = f"{document_id}.chunk.{index}"

                self.collection.add(
                    ids=[vector_id],
                    documents=[chunk_text],
                    embeddings=[embedding],  # type: ignore
                    metadatas=[
                        {
                            "document_id":  document_id,
                            "chunk_index":  index,
                            # Heading stored as metadata — injected at prompt time
                            "breadcrumb":   breadcrumb,
                            "element_types": ",".join(chunk["types"]),
                            "pages":        ",".join(str(p) for p in chunk["pages"]),
                        }
                    ],
                )

                return DocumentChunk(
                    chunk_id=str(uuid.uuid4()),
                    document_id=document_id,
                    chunk_index=index,
                    content=chunk_text,          # clean — no heading prefix
                    created_at=datetime.now(timezone.utc),
                    vector_id=vector_id,
                    embedding_model=settings.AWS_BEDROCK_EMBED_MODEL_ID,
                )

            semaphore = asyncio.Semaphore(10)

            async def embed_with_semaphore(index: int, chunk: dict[str, Any]) -> DocumentChunk:
                async with semaphore:
                    return await embed_and_store(index, chunk)

            structured_chunks = list(
                await asyncio.gather(
                    *(embed_with_semaphore(i, c) for i, c in enumerate(raw_chunks))
                )
            )

            # Sort by chunk_index so order is deterministic
            structured_chunks.sort(key=lambda c: c.chunk_index)

            logger.info(
                "chunking_complete",
                element_count=len(elements),
                chunk_count=len(structured_chunks),
                parsed_at=datetime.utcnow().isoformat(),
                processing_time_ms=round((time.time() - start) * 1000, 2),
            )

            return structured_chunks

        except Exception as e:
            logger.error(f"Error during parsing: {e}")
            return []

    # ─────────────────────────────────────────────────────────────────────────
    # Prompt construction — heading injected HERE, not at index time
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def build_retrieval_context(chunks: list[DocumentChunk], metadatas: list[dict]) -> str:
        """
        Build the context block sent to the LLM.

        Heading (breadcrumb) is prepended here — it was stored in metadata,
        never baked into the embedded text.

        Args:
            chunks:    Retrieved DocumentChunk objects.
            metadatas: Corresponding ChromaDB metadata dicts (same order).

        Returns:
            A single formatted string ready to insert into the LLM prompt.
        """
        blocks: list[str] = []
        for chunk, meta in zip(chunks, metadatas):
            breadcrumb = meta.get("breadcrumb", "")
            blocks.append(_prompt_text(chunk.content, breadcrumb))
        return "\n\n---\n\n".join(blocks)
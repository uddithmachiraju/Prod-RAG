import asyncio
import re
import time
from datetime import datetime
from typing import Any

import numpy as np

from src.config.logging import get_logger
from src.services.embeddings.embeds import Embeddings

logger = get_logger(__name__)
embeddings = Embeddings()

# Patterns to filter out entirely
_NOISE_PATTERNS = [
    r"^page\s+\d+\s+of\s+\d+$",  # "Page 1 of 2"
    r"^headquarters:",  # Address headers
    r"^\d+\.$",  # Lone numbers like "1."
    r"^(signature|full name|date)\s*:",  # Signature block labels
]


class SemanticSplitter:
    """A class to split text into semantic chunks."""

    def __init__(self) -> None:
        super().__init__()

    def _clean_text(self, text: str) -> str:
        """Clean the text and remove any unwanted characters."""

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
        """Calculate the cosine similarity between two vectors."""

        if len(vec1) != len(vec2):
            raise ValueError("Vectors must be of the same length")

        return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))

    @staticmethod
    def _merge_orphan_chunks(chunks: list[str], min_words: int = 15) -> list[str]:
        """Merge orphan chunks that have fewer than min_words into the previous chunk."""

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
        """Return True if the line should be discarded."""
        lower = text.lower().strip()
        return any(re.match(p, lower) for p in _NOISE_PATTERNS)

    async def _semantic_chunking(self, paragraphs: list[dict[str, Any]]) -> list[str]:
        """Chunk the paragraphs into smaller pieces based on semantic meaning."""

        try:
            texts = [p["content"] for p in paragraphs if "content" in p and p["content"]]

            semaphore = asyncio.Semaphore(1)

            async def get_embedding_with_semaphore(text: str) -> list[float]:
                async with semaphore:
                    return await embeddings.get_embedding(text)

            embeddings_list = await asyncio.gather(*(get_embedding_with_semaphore(text) for text in texts))

            similarities = [self.cosine_similarity(embeddings_list[i], embeddings_list[i + 1]) for i in range(len(embeddings_list) - 1)]

            mean_sim = float(np.mean(similarities)) if similarities else 0.0
            std_sim = float(np.std(similarities)) if similarities else 0.0
            threshold = mean_sim - 0.75 * std_sim

            split_points = {i for i, sim in enumerate(similarities) if sim < threshold}

            chunks: list[str] = []
            current: list[str] = []
            current_len: int = 0
            max_len: int = 1000

            def _flush() -> None:
                nonlocal current, current_len
                if current:
                    chunks.append(" ".join(current))
                    current = []
                    current_len = 0

            for i, para in enumerate(paragraphs):
                text = para["content"]
                text_len = len(text)

                if para["is_heading"]:
                    _flush()
                elif current_len + text_len > max_len:
                    _flush()

                current.append(text)
                current_len += text_len

                if i in split_points:
                    _flush()

            _flush()

            return self._merge_orphan_chunks(chunks, min_words=15)

        except Exception as e:
            logger.error(f"Error during semantic chunking: {e}")
            return []

    async def parse(self, text: str) -> list[str]:
        """Parse raw text and return a list of semantic chunks."""

        start = time.time()

        try:
            if not text or not text.strip():
                raise ValueError("Input text is empty or blank.")

            # Split FIRST (preserves \n), then clean each paragraph individually
            paragraphs = self._split_into_paragraphs(text)

            if not paragraphs:
                raise ValueError("No paragraphs found in text.")

            chunks = await self._semantic_chunking(paragraphs)

            logger.info(
                "semantic_chunking_complete",
                word_count=len(text.split()),
                paragraph_count=len(paragraphs),
                chunk_count=len(chunks),
                parsed_at=datetime.utcnow().isoformat(),
                processing_time_ms=round((time.time() - start) * 1000, 2),
            )

            return chunks

        except Exception as e:
            logger.error(f"Error during parsing: {e}")
            return []

    def _split_into_paragraphs(self, text: str) -> list[dict[str, Any]]:
        """Split text into paragraph dicts, cleaning each line individually."""

        paragraphs = []
        for line in text.split("\n"):
            cleaned = self._clean_text(line)
            if not cleaned:
                continue
            if self._is_noise(cleaned):
                logger.debug(f"Filtered noise line: {cleaned!r}")
                continue

            # Headings: ALL CAPS, ends with colon, or short title-case lines < 6 words
            is_heading = cleaned.isupper() or cleaned.endswith(":") or (len(cleaned.split()) <= 5 and cleaned.istitle())

            paragraphs.append({"content": cleaned, "is_heading": is_heading})

        return paragraphs

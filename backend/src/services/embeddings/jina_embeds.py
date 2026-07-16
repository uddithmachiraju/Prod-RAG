import asyncio
import random
import time
from typing import Any, Dict, List, Literal, Union

import httpx

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.services.embeddings.base_embedding import Embeddings

logger = get_logger(__name__)
settings = get_settings()

task_type = Literal[
    "retrieval.query",
    "retrieval.passage",
    "text-matching",
    "classification",
    "separation",
]


class JinaEmbeddings(Embeddings):
    """Handles embeddings using the Jina AI embeddings API."""

    def __init__(self) -> None:
        super().__init__()

        if not settings.JINA_API_KEY:
            raise ValueError("JINA_API_KEY is not set in the environment variables.")

        self.model_id = getattr(settings, "JINA_EMBED_MODEL_ID", None) or "jina-embeddings-v5-text-small"
        self.url = "https://api.jina.ai/v1/embeddings"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.JINA_API_KEY}",
        }

        logger.info("initialized jina embedding client", model=self.model_id, env=settings.ENV)

        self._semaphore = asyncio.Semaphore(3)
        self._client = httpx.AsyncClient(timeout=30.0, headers=self.headers)

    async def aclose(self) -> None:
        """Close the HTTP client."""

        await self._client.aclose()

    async def get_embeddings(self, texts: Union[str, list[str]], task: task_type = "retrieval.passage"):
        """Get embeddings for a single string or a batch of strings."""

        if texts is None:
            logger.error("No text was provided in the input payload.", model=self.model_id, environment=settings.ENV)
            raise ValueError("No text was provided.")

        is_batch = isinstance(texts, list)
        inputs = texts if is_batch else [texts]  # type: ignore

        if is_batch and len(inputs) == 0:
            logger.error("Empty list was provided in the input payload.", model=self.model_id, environment=settings.ENV)
            raise ValueError("No text was provided.")

        embeddings_list = await self._fetch_embeddings(inputs, task)
        return embeddings_list if is_batch else embeddings_list[0]

    async def _fetch_embeddings(self, inputs: Union[str | List[str]], task: task_type) -> List[List[float]]:
        """Fetch embeddings for a single request-sized batch, with retries."""

        payload: Dict[str, Any] = {
            "model": self.model_id,
            "task": task,
            "normalized": True,
            "input": inputs,
        }

        async with self._semaphore:
            for attempt in range(4):
                is_last_attempt = attempt == 3
                start = time.monotonic()

                try:
                    response = await self._client.post(self.url, json=payload)
                except httpx.TimeoutException as e:
                    if is_last_attempt:
                        logger.error("Timed out calling Jina API, out of retries", error=str(e))
                        raise
                    wait = self._backoff_delay(attempt)
                    logger.warning("Timed out calling Jina API, retrying", attempt=attempt + 1, wait_seconds=wait)
                    await asyncio.sleep(wait)
                    continue
                except httpx.ConnectError as e:
                    if is_last_attempt:
                        logger.error("Connection error calling Jina API, out of retries", error=str(e))
                        raise
                    wait = self._backoff_delay(attempt)
                    logger.warning("Connection error calling Jina API, retrying", attempt=attempt + 1, wait_seconds=wait)
                    await asyncio.sleep(wait)
                    continue

                if response.status_code == 429:
                    if is_last_attempt:
                        logger.error("Rate limited by Jina API, out of retries", body=response.text)
                        raise RuntimeError(f"Rate limited by Jina API: {response.text}")

                    retry_after = response.headers.get("Retry-After")
                    wait = float(retry_after) if retry_after else self._backoff_delay(attempt, longer=True)
                    logger.warning(
                        "Rate limited by Jina API, retrying",
                        attempt=attempt + 1,
                        wait_seconds=wait,
                        used_retry_after_header=bool(retry_after),
                    )
                    await asyncio.sleep(wait)
                    continue

                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as e:
                    # Retry server-side errors (5xx); 4xx other than 429 means the
                    # request itself is bad and won't succeed on retry.
                    if response.status_code >= 500 and not is_last_attempt:
                        wait = self._backoff_delay(attempt)
                        logger.warning(
                            "Server error from Jina API, retrying",
                            status_code=response.status_code,
                            attempt=attempt + 1,
                            wait_seconds=wait,
                        )
                        await asyncio.sleep(wait)
                        continue
                    logger.error(
                        "Error fetching embedding, not retrying",
                        error=str(e),
                        status_code=response.status_code,
                    )
                    raise

                body = response.json()

                # Jina returns data items possibly out of input order — sort by index to be safe.
                data = sorted(body["data"], key=lambda d: d["index"])
                embeddings_list = [d["embedding"] for d in data]

                elapsed_ms = round((time.monotonic() - start) * 1000, 1)
                logger.info(
                    "Successfully fetched embedding(s) from Jina API.",
                    model=self.model_id,
                    count=len(embeddings_list),
                    usage=body.get("usage"),
                    elapsed_ms=elapsed_ms,
                )

                return embeddings_list

            raise RuntimeError("Failed to fetch embedding(s) after 4 attempts.")

    @staticmethod
    def _backoff_delay(attempt: int, longer: bool = False) -> float:
        """Exponential backoff with jitter. Rate-limit errors get a longer base wait."""

        base = min(2 ** (attempt + (2 if longer else 0)), 32)
        return base + random.uniform(0, base * 0.5)

    def health_check(self) -> bool:
        """Check health by embedding a trivial string."""

        try:
            with httpx.Client(timeout=10.0, headers=self.headers) as client:
                response = client.post(
                    self.url,
                    json={
                        "model": self.model_id,
                        "task": "retrieval.passage",
                        "normalized": True,
                        "input": ["health check"],
                    },
                )
                response.raise_for_status()
            logger.info("Embeddings service health check successful.")
            return True
        except Exception as e:
            import traceback

            traceback.print_exc()
            logger.exception("Health check failed")
            return False


async def _main() -> None:
    """Quick manual smoke test: fetch embeddings for a sample string and a batch."""

    embedder = JinaEmbeddings()

    if not embedder.health_check():
        print("Health check failed — check JINA_API_KEY / model id.")
        return

    sample_text = "hello world"
    embedding = await embedder.get_embeddings(sample_text)
    print(f"Single embedding length: {len(embedding)}")

    batch = ["hello world", "goodbye world", "jina embeddings"]
    batch_embeddings = await embedder.get_embeddings(batch, task="retrieval.passage")
    print(f"Batch size: {len(batch_embeddings)}, each length: {len(batch_embeddings[0])}")


if __name__ == "__main__":
    asyncio.run(_main())

import asyncio
import random
from typing import Any, Dict, Literal, Union

import requests

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

        # Jina rate-limits per API key/plan (RPM based) — cap concurrent live calls
        # so bursts don't trip 429s. Tune based on your plan's actual RPM.
        self._semaphore = asyncio.Semaphore(8)

    async def get_embeddings(self, texts: Union[str, list[str]], task: task_type = "retrieval.passage"):
        """Get embeddings for a single string or a batch of strings.

        - texts: str       -> returns list[float]
        - texts: list[str] -> returns list[list[float]]  (batched in one API call)
        """

        if texts is None:
            logger.error("No text was provided in the input payload.", model=self.model_id, environment=settings.ENV)
            raise ValueError("No text was provided.")

        is_batch = isinstance(texts, list)
        inputs = texts if is_batch else [texts]  # type: ignore

        if is_batch and len(inputs) == 0:
            logger.error("Empty list was provided in the input payload.", model=self.model_id, environment=settings.ENV)
            raise ValueError("No text was provided.")

        payload: Dict[str, Any] = {
            "model": self.model_id,
            "task": task,
            "normalized": True,
            "input": inputs,
        }

        # payload = json.dumps(payload)

        async with self._semaphore:
            for attempt in range(4):
                try:
                    loop = asyncio.get_running_loop()
                    response = await loop.run_in_executor(
                        None,
                        lambda: requests.post(self.url, headers=self.headers, json=payload, timeout=30),
                    )

                    if response.status_code == 429:
                        raise RuntimeError(f"Rate limited by Jina API: {response.text}")

                    response.raise_for_status()
                    body = response.json()

                    # Jina returns data items possibly out of input order — sort by index to be safe.
                    data = sorted(body["data"], key=lambda d: d["index"])
                    embeddings_list = [d["embedding"] for d in data]

                    logger.info(
                        "Successfully fetched embedding(s) from Jina API.",
                        model=self.model_id,
                        count=len(embeddings_list),
                        usage=body.get("usage"),
                    )

                    return embeddings_list if is_batch else embeddings_list[0]

                except Exception as e:
                    is_last_attempt = attempt == 3
                    is_rate_limit = "429" in str(e) or "Rate limited" in str(e)

                    if is_last_attempt:
                        logger.error("Error fetching embedding, out of retries", error=str(e))
                        raise

                    wait = self._backoff_delay(attempt, longer=is_rate_limit)
                    logger.warning(
                        "Error fetching embedding, retrying",
                        error=str(e),
                        attempt=attempt + 1,
                        wait_seconds=wait,
                    )
                    await asyncio.sleep(wait)

            raise RuntimeError("Failed to fetch embedding(s) after 4 attempts.")

    @staticmethod
    def _backoff_delay(attempt: int, longer: bool = False) -> float:
        """Exponential backoff with jitter. Rate-limit errors get a longer base wait."""

        base = min(2 ** (attempt + (2 if longer else 0)), 32)
        return base + random.uniform(0, base * 0.5)

    def health_check(self) -> bool:
        """Check health by embedding a trivial string."""

        try:
            response = requests.post(
                self.url,
                headers=self.headers,
                json={
                    "model": self.model_id,
                    "task": "retrieval.passage",
                    "normalized": True,
                    "input": ["health check"],
                },
                timeout=10,
            )
            response.raise_for_status()
            logger.info("Embeddings service health check successful.")
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
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

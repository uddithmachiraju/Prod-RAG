import asyncio
import random
import time
from typing import List, Union

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncClient,
    RateLimitError,
)

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.services.embeddings.base_embedding import Embeddings

logger = get_logger(__name__)
settings = get_settings()


class OpenAIEmbeddings(Embeddings):
    """Handles embeddings using the OpenAI embeddings API."""

    def __init__(self) -> None:
        super().__init__()

        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY was not configured in the settings.")

        self.model_id = settings.OPENAI_EMBED_MODEL_ID
        self._semaphore = asyncio.Semaphore(25)

        self._client = AsyncClient(
            api_key=settings.OPENAI_API_KEY,
            timeout=30.0,
            max_retries=0,
        )

    async def aclose(self) -> None:
        """Close the HTTP client."""

        await self._client.close()

    async def get_embeddings(self, texts: Union[str, List[str]]):
        """Get embeddings for a single string or a batch of strings."""

        if texts is None:
            logger.error("No text was provided in the input payload.", model=self.model_id, environment=settings.ENV)
            raise ValueError("No text was provided.")

        embeddings_list: List[List[float]] = []
        embeddings_list.extend(await self._fetch_embeddings(texts))

        return embeddings_list

    async def _fetch_embeddings(self, inputs: Union[str | List[str]]) -> List[List[float]]:
        """Fetch embeddings for a single request-sized batch, with retries."""

        async with self._semaphore:
            for attempt in range(4):
                is_last_attempt = attempt == 3
                start = time.monotonic()

                try:
                    response = await self._client.embeddings.create(
                        input=inputs,
                        model=self.model_id,
                        encoding_format="float",
                        dimensions=1024,
                    )
                except APITimeoutError as e:
                    if is_last_attempt:
                        logger.error("Timed out calling OpenAI API, out of retries", error=str(e))
                        raise
                    wait = self._backoff_delay(attempt)
                    logger.warning("Timed out calling OpenAI API, retrying", attempt=attempt + 1, wait_seconds=wait)
                    await asyncio.sleep(wait)
                    continue
                except APIConnectionError as e:
                    if is_last_attempt:
                        logger.error("Connection error calling OpenAI API, out of retries", error=str(e))
                        raise
                    wait = self._backoff_delay(attempt)
                    logger.warning("Connection error calling OpenAI API, retrying", attempt=attempt + 1, wait_seconds=wait)
                    await asyncio.sleep(wait)
                    continue
                except RateLimitError as e:
                    if is_last_attempt:
                        logger.error("Rate limited by OpenAI API, out of retries", error=str(e))
                        raise RuntimeError(f"Rate limited by OpenAI API: {e}")

                    retry_after = None
                    response_obj = getattr(e, "response", None)
                    if response_obj is not None:
                        retry_after = response_obj.headers.get("Retry-After")
                    wait = float(retry_after) if retry_after else self._backoff_delay(attempt, longer=True)
                    logger.warning(
                        "Rate limited by OpenAI API, retrying",
                        attempt=attempt + 1,
                        wait_seconds=wait,
                        used_retry_after_header=bool(retry_after),
                    )
                    await asyncio.sleep(wait)
                    continue
                except APIStatusError as e:
                    if e.status_code >= 500 and not is_last_attempt:
                        wait = self._backoff_delay(attempt)
                        logger.warning(
                            "Server error from OpenAI API, retrying",
                            status_code=e.status_code,
                            attempt=attempt + 1,
                            wait_seconds=wait,
                        )
                        await asyncio.sleep(wait)
                        continue
                    logger.error(
                        "Error fetching embedding, not retrying",
                        error=str(e),
                        status_code=e.status_code,
                    )
                    raise

                data = sorted(response.data, key=lambda d: d.index)
                embeddings_list = [d.embedding for d in data]

                elapsed_ms = round((time.monotonic() - start) * 1000, 1)
                logger.info(
                    "Successfully fetched embedding(s) from OpenAI API.",
                    model=self.model_id,
                    count=len(embeddings_list),
                    usage=response.usage.model_dump() if response.usage else None,
                    elapsed_ms=elapsed_ms,
                )

                return embeddings_list

            raise RuntimeError("Failed to fetch embedding(s) after 4 attempts.")

    @staticmethod
    def _backoff_delay(attempt: int, longer: bool = False) -> float:
        """Exponential backoff with jitter. Rate-limit errors get a longer base wait."""

        base = min(2 ** (attempt + (2 if longer else 0)), 32)
        return base + random.uniform(0, base * 0.5)

    async def health_check(self) -> bool:
        """Check health by embedding a trivial string."""

        try:
            await self._client.embeddings.create(
                model=self.model_id,
                input=["health check"],
                encoding_format="float",
            )
            logger.info("Embeddings service health check successful.")
            return True
        except Exception:
            logger.exception("Health check failed")
            return False


async def _main() -> None:
    """Quick manual smoke test: fetch embeddings for a sample string and a batch."""

    embedder = OpenAIEmbeddings()

    if not await embedder.health_check():
        print("Health check failed — check OPENAI_API_KEY / model id.")
        return

    sample_text = "hello world"
    embedding = await embedder.get_embeddings(sample_text)
    print(f"Single embedding length: {len(embedding)}")

    batch = ["hello world", "goodbye world", "openai embeddings"]
    batch_embeddings = await embedder.get_embeddings(batch)
    print(f"Batch size: {len(batch_embeddings)}, each length: {len(batch_embeddings[0])}")

    await embedder.aclose()


if __name__ == "__main__":
    asyncio.run(_main())

import asyncio
import random
from typing import Any, Dict

import requests

from src.config.logging import get_logger
from src.config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


class Embeddings:
    """Class to handle embeddings using AWS Bedrock long-term API key."""

    def __init__(self) -> None:
        """Initialize the Embeddings class."""
        super().__init__()

        if not settings.AWS_BEDROCK_API_KEY:
            raise ValueError("AWS_BEDROCK_API_KEY is not set in the environment variables.")
        if not settings.AWS_BEDROCK_REGION:
            raise ValueError("AWS_BEDROCK_REGION is not set in the environment variables.")
        if not settings.AWS_BEDROCK_EMBED_MODEL_ID:
            raise ValueError("AWS_BEDROCK_EMBED_MODEL_ID is not set in the environment variables.")

        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.AWS_BEDROCK_API_KEY}",
        }
        self.base_url = f"https://bedrock-runtime.{settings.AWS_BEDROCK_REGION}.amazonaws.com"
        self.model_id = settings.AWS_BEDROCK_EMBED_MODEL_ID

        self.session = requests.Session()
        self._semaphore = asyncio.Semaphore(10)

    async def get_embedding(self, text: str) -> list[float]:
        """Get the embedding for a given text."""

        url = f"{self.base_url}/model/{self.model_id}/invoke"
        payload: Dict[str, Any] = {"inputText": text}

        async with self._semaphore:
            for attempt in range(4):
                try:
                    loop = asyncio.get_running_loop()
                    response = await loop.run_in_executor(
                        None,
                        lambda: self.session.post(url, json=payload, headers=self.headers, timeout=30),
                    )

                    if response.status_code == 429:
                        wait = self._backoff_delay(attempt)
                        logger.warning("Bedrock API rate limit exceeded. Retrying after backoff.", status_code=response.status_code, wait_time=wait, attempt=attempt + 1)
                        await asyncio.sleep(wait)
                        continue

                    response.raise_for_status()
                    logger.info("Successfully fetched embedding from AWS Bedrock.", status_code=response.status_code, model=settings.AWS_BEDROCK_EMBED_MODEL_ID)
                    return response.json().get("embedding", [])

                except requests.exceptions.RequestException as e:

                    is_last_attempt = attempt == 3
                    status = getattr(e.response, "status_code", None) if hasattr(e, "response") else None

                    if status is not None and status < 500 and status != 429:
                        logger.error("Error fetching embedding, not retrying", error=str(e), status_code=status, attempt=attempt + 1)
                        raise

                    if is_last_attempt:
                        logger.error("Error fetching embedding, out of retries", error=str(e))
                        raise

                    wait = self._backoff_delay(attempt)
                    logger.warning("Error fetching embedding, retrying", error=str(e), attempt=attempt + 1, wait_seconds=wait)
                    await asyncio.sleep(wait)

            raise RuntimeError("Failed to fetch embedding after 4 attempts due to throttling.")

    @staticmethod
    def _backoff_delay(attempt: int) -> float:
        """Exponential backoff with jitter."""

        base = min(2**attempt, 16)
        return base + random.uniform(0, base * 0.5)

    def health_check(self) -> bool:
        """Check health by listing foundation models."""

        url = f"https://bedrock.{settings.AWS_BEDROCK_REGION}.amazonaws.com/foundation-models"

        try:
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            logger.info("Embeddings service health check successful.", status_code=response.status_code)
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Health check failed: {e}")
            return False

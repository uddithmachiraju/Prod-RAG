import asyncio
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

    async def get_embedding(self, text: str) -> list[float]:
        """Get the embedding for a given text."""

        url = f"{self.base_url}/model/{self.model_id}/invoke"
        payload: Dict[str, Any] = {"inputText": text}

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(url, json=payload, headers=self.headers, timeout=30),
            )
            response.raise_for_status()
            logger.info("Successfully fetched embedding from AWS Bedrock.", status_code=response.status_code, model=settings.AWS_BEDROCK_EMBED_MODEL_ID)
            return response.json().get("embedding", [])

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching embedding: {e}")
            return []

    def health_check(self) -> bool:
        """Check health by listing foundation models."""

        url = f"https://bedrock.{settings.AWS_BEDROCK_REGION}.amazonaws.com/foundation-models"

        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            logger.info("Embeddings service health check successful.", status_code=response.status_code)
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Health check failed: {e}")
            return False

import asyncio
import json
import random
from typing import Any, Dict, Literal

import boto3  # type: ignore
from botocore.exceptions import ClientError  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.services.embeddings.base_embedding import Embeddings

settings = get_settings()
logger = get_logger(__name__)

input_type = Literal["search_document", "search_query", "classification", "clustering"]


class CohereEmbeddings(Embeddings):
    """Class for handling Embeddings using Bedrock Cohere model."""

    def __init__(self) -> None:
        """Initialize the Embeddings class."""

        super().__init__()

        if not settings.AWS_BEDROCK_REGION:
            raise ValueError("AWS_BEDROCK_REGION is not set in the environment variables.")
        if not settings.AWS_BEDROCK_EMBED_MODEL_ID:
            raise ValueError("AWS_BEDROCK_EMBED_MODEL_ID is not set in the environment variables.")

        self.client = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_BEDROCK_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        self.model_id = settings.AWS_BEDROCK_EMBED_MODEL_ID
        logger.info("initialized bedrock client with explicit credentials for development environment", model=self.model_id, env=settings.ENV)

        self._semaphore = asyncio.Semaphore(96)

    async def get_embeddings(self, texts: str):
        """Get the embeddings for a given text."""

        if texts is None:
            logger.error("No text was provided in the input payload.", model=self.model_id, environment=settings.ENV)
            raise ValueError("No text was provided.")

        content: Dict[str, Any] = {
            "type": "text",
            "text": texts,
        }

        payload: Dict[str, Any] = {
            "input_type": "search_document",
            "inputs": [{"content": content}],
            "truncate": "RIGHT",
            "max_tokens": 128000,
        }

        body = json.dumps(payload)

        async with self._semaphore:
            for attempt in range(4):
                try:
                    loop = asyncio.get_running_loop()
                    response = await loop.run_in_executor(
                        None,
                        lambda: self.client.invoke_model(
                            modelId=self.model_id,
                            body=body,
                            accept="*/*",
                            contentType="application/json",
                        ),
                    )

                    response_body = json.loads(response.get("body").read())
                    logger.info(
                        "Successfully fetched embedding from AWS Bedrock.",
                        model=self.model_id,
                        response_id=response_body.get("id"),
                    )

                    embeddings = response_body.get("embeddings", {})
                    return embeddings.get("float", [])[0]

                except ClientError as e:
                    is_last_attempt = attempt == 3

                    if is_last_attempt:
                        logger.error("Error fetching embedding, out of retries", error=str(e))
                        raise

                    wait = self._backoff_delay(attempt)
                    logger.warning(
                        "Error fetching embedding, retrying",
                        error=str(e),
                        attempt=attempt + 1,
                        wait_seconds=wait,
                    )
                    await asyncio.sleep(wait)

            raise RuntimeError("Failed to fetch embedding after 4 attempts due to throttling.")

    @staticmethod
    def _backoff_delay(attempt: int) -> float:
        """Exponential backoff with jitter."""

        base = min(2**attempt, 16)
        return base + random.uniform(0, base * 0.5)

    def health_check(self) -> bool:
        """Check health by listing foundation models."""

        try:
            bedrock = boto3.client(
                service_name="bedrock",
                region_name=settings.AWS_BEDROCK_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )

            bedrock.list_foundation_models()
            logger.info("Embeddings service health check successful.")
            return True
        except ClientError as e:
            logger.error(f"Health check failed: {e}")
            return False


async def _main() -> None:
    """Quick manual smoke test: fetch an embedding for a sample string."""

    embedder = CohereEmbeddings()

    if not embedder.health_check():
        print("Health check failed — check AWS credentials/region/model id.")
        return

    sample_text = "hello world"
    embedding = await embedder.get_embeddings(sample_text)
    embedding2 = await embedder.get_embeddings(sample_text)

    print(f"Embedding length: {len(embedding)}")
    print(len(embedding2))
    print(f"First 10 values: {embedding[:10]}")


if __name__ == "__main__":
    asyncio.run(_main())

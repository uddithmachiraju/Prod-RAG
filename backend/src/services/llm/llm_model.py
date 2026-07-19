import asyncio
import threading
import time
from pathlib import Path
from time import perf_counter
from typing import Any, AsyncGenerator, Callable, Dict, List

import boto3  # type: ignore
from botocore.exceptions import ClientError  # type: ignore
from pydantic import ValidationError
from pystache import render  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.core.metrics import record_timing
from src.schemas.llm import LLMResponse, LLMStructuredResponse
from src.schemas.retrieval import RetrievalResponse

settings = get_settings()
logger = get_logger(__name__)

llm_prompt = (Path(__file__).parent / "prompts" / "llm_response.mustache").read_text("utf-8")
llm_stream_prompt = (Path(__file__).parent / "prompts" / "llm_response_stream.mustache").read_text("utf-8")


class LLMModel:
    """AWS Bedrock wrapper for LLM Model."""

    TOOL_NAME = "structured_response"

    TOOL_CONFIG = {
        "tools": [
            {
                "toolSpec": {
                    "name": TOOL_NAME,
                    "description": (
                        "Return a detailed, comprehensive, and thorough answer "
                        "based on ALL retrieved context passages. "
                        "The answer must be at minimum 5-7 sentences long, "
                        "covering every relevant detail found across all chunks. "
                        "Never give a brief or summarized response."
                    ),
                    "inputSchema": {"json": LLMStructuredResponse.model_json_schema()},
                }
            }
        ],
        "toolChoice": {"tool": {"name": TOOL_NAME}},  # Forces the model to always use the tool
    }

    def __init__(self):
        if not settings.AWS_ACCESS_KEY_ID:
            raise ValueError("AWS_ACCESS_KEY_ID is not set.")
        if not settings.AWS_SECRET_ACCESS_KEY:
            raise ValueError("AWS_SECRET_ACCESS_KEY is not set.")
        if not settings.AWS_BEDROCK_REGION:
            raise ValueError("AWS_BEDROCK_REGION is not set.")

        self.client = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_BEDROCK_MODEL_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        self.model_id = settings.AWS_BEDROCK_LLM_MODEL_ID

        self._semaphore = asyncio.Semaphore(1)

    def _map_context(self, user_question: str, retrievals: List[RetrievalResponse]) -> Dict[str, Any]:
        """Map RetrievalResponse list to mustache template variables."""
        return {
            "question": user_question,
            "content": [
                {
                    "doc_id": r.document_id,
                    "chunk_id": r.chunk_id,
                    "score": round(r.score, 4),
                    "content": r.content,
                    "question": user_question,
                }
                for r in retrievals
            ],
        }

    def render_prompt_template(self, user_question: str, retrievals: List[RetrievalResponse], template: str = llm_prompt) -> str:
        """Render the prompt template for the LLM."""
        context = self._map_context(user_question=user_question, retrievals=retrievals)
        return render(template=template, context=context)

    def _extract_tool_input(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Extract tool use input block from Bedrock converse response."""

        content_blocks = response.get("output", {}).get("message", {}).get("content", [])

        for block in content_blocks:
            if isinstance(block, dict) and block.get("toolUse", {}).get("name") == self.TOOL_NAME:
                return block["toolUse"]["input"]

        raise ValueError(f"No toolUse block named '{self.TOOL_NAME}' found in response.")

    def _parse_structured_response(self, tool_input: Dict[str, Any]) -> LLMStructuredResponse:
        """Validate tool input dict into LLMStructuredResponse."""

        try:
            return LLMStructuredResponse.model_validate(tool_input)
        except ValidationError as e:
            logger.error(f"Pydantic validation failed for tool input: {e}\nInput: {tool_input}")
            return LLMStructuredResponse(
                content="I don't have enough information in the retrieved documents to answer this accurately.",
                gaps=f"Response validation failed: {e}",
            )

    @staticmethod
    def _is_throtling_error(e: ClientError) -> bool:
        return e.response.get("Error", {}).get("Code") == "ThrottlingException"

    async def _call_with_retry(self, func: Callable, **kwargs) -> Any:
        """Retrying on Bedrock Throtling with exponential backoff."""

        last_exc: Exception | None = None

        for attempt in range(5):
            try:
                return await asyncio.to_thread(func, **kwargs)
            except ClientError as e:
                last_exc = e
                if self._is_throtling_error(e):
                    backoff = 1 * (2**attempt)
                    logger.warning("Bedrock throttled", attempt=attempt, max_retries=5, retry=backoff)
                    await asyncio.sleep(backoff)
                    continue
                raise

        logger.error("Bedrock retres exceeded", last_exception=last_exc)
        raise RuntimeError("Retries Exceeded") from last_exc

    def _call_with_retry_sync(self, func: Callable, **kwargs) -> Any:
        """Blocking-thread-safe variant of _call_with_retry for use inside sync generators (streaming)."""

        last_exc: Exception | None = None

        for attempt in range(5):
            try:
                return func(**kwargs)
            except ClientError as e:
                last_exc = e
                if self._is_throtling_error(e):
                    backoff = 1 * (2**attempt)
                    logger.warning("Bedrock throttled", attempt=attempt, max_retries=5, retry=backoff)
                    time.sleep(backoff)
                    continue
                raise

        logger.error("Bedrock retres exceeded", last_exception=last_exc)
        raise RuntimeError("Retries exceeded") from last_exc

    async def generate(self, query: str, retrievals: List[RetrievalResponse]) -> LLMResponse:
        """Generate a structured response from Bedrock using tool use."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals)

        logger.info("waiting for bedrock slot...")

        async with self._semaphore:
            logger.info("Bedrock slot acquired")

            try:
                response = await self._call_with_retry(
                    self.client.converse,
                    modelId=self.model_id,
                    messages=[
                        {
                            "role": "user",
                            "content": [{"text": prompt}],
                        }
                    ],
                    inferenceConfig={
                        "maxTokens": 5000,
                        "temperature": 0.2,
                        "topP": 0.9,
                    },
                    toolConfig=self.TOOL_CONFIG,
                )

                logger.debug("Raw bedrock response", response=response)

                usage = response.get("usage", {})
                stop_reason = response.get("stopReason", "Unknown")

                tool_input = self._extract_tool_input(response)
                structured_response = self._parse_structured_response(tool_input)

                return LLMResponse(
                    answer=structured_response,
                    model_id=self.model_id,
                    input_tokens=usage.get("inputTokens"),
                    output_tokens=usage.get("outputTokens"),
                    stop_reason=stop_reason,
                )

            except Exception as e:
                logger.error(f"Error invoking Bedrock LLM Model: {e}")
                raise
            finally:
                logger.info("Bedrock slot released")

    def stream(self, query: str, retrievals: List[RetrievalResponse], template: str = llm_stream_prompt) -> Any:
        """Generate a streaming response from Bedrock using tool use."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals, template=template)

        try:
            start = perf_counter()
            response = self._call_with_retry_sync(
                self.client.converse_stream,
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ],
                inferenceConfig={
                    "maxTokens": 5000,
                    "temperature": 0.2,
                    "topP": 0.9,
                },
                # toolConfig=self.TOOL_CONFIG,
            )

            for event in response["stream"]:

                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"]["delta"]
                    if "text" in delta:
                        yield {
                            "type": "text",
                            "content": delta["text"],
                        }

                elif "metadata" in event:
                    metadata = event["metadata"]

                    yield {
                        "type": "metadata",
                        "usage": metadata.get("usage", {}),
                        "latency": metadata.get("metrics", {}).get("latencyMs"),
                        "model": self.model_id,
                    }

                elif "messageStop" in event:
                    yield {
                        "type": "stop",
                        "reason": event["messageStop"]["stopReason"],
                    }
            
            record_timing("llm.chat_completion", (perf_counter() - start) * 1000)

        except Exception as e:
            logger.error(f"Error invoking Bedrock LLM Model stream: {e}")
            raise

    async def async_stream(self, query: str, retrievals: List[RetrievalResponse], template: str | None = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Async wrapper for llm to run calls parallely."""

        logger.info("Waiting for Bedrock slot...")
        async with self._semaphore:
            logger.info("Bedrock slot acquired.")

            loop = asyncio.get_running_loop()
            queue: asyncio.Queue = asyncio.Queue()
            SENTINEL = object()

            def producer():

                try:
                    kwargs = {"template": template} if template else {}
                    for chunk in self.stream(query, retrievals, **kwargs):
                        loop.call_soon_threadsafe(queue.put_nowait, chunk)
                except Exception as e:  # noqa: BLE001
                    loop.call_soon_threadsafe(queue.put_nowait, e)
                finally:
                    loop.call_soon_threadsafe(queue.put_nowait, SENTINEL)

            try:
                threading.Thread(target=producer, daemon=True).start()

                while True:
                    item = await queue.get()
                    if item is SENTINEL:
                        break
                    if isinstance(item, Exception):
                        logger.error(f"Error in Bedrock stream thread: {item}")
                        raise item
                    yield item
            finally:
                logger.info("Bedrock slot released.")

    def health_check(self) -> bool:
        try:
            self.client.converse(
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": "Hello, Bedrock! This is a health check."}],
                    }
                ],
                inferenceConfig={
                    "maxTokens": 10,
                    "temperature": 0,
                    "topP": 1,
                },
            )
            logger.info("Bedrock LLM health check successful.")
            return True

        except Exception as e:
            logger.error("Bedrock LLM health check failed", error=e)
            return False

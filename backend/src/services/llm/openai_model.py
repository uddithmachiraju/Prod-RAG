import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    RateLimitError,
)
from pystache import render  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.llm import LLMResponse
from src.schemas.retrieval import RetrievalResponse

logger = get_logger(__name__)
settings = get_settings()

llm_prompt = (Path(__file__).parent / "prompts" / "llm_response.mustache").read_text("utf-8")
llm_stream_prompt = (Path(__file__).parent / "prompts" / "llm_response_stream.mustache").read_text("utf-8")


class LLMModel:
    """OpenAI model for LLM response."""

    def __init__(self):
        """Initialize LLM client."""

        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key is not provided.")

        if not settings.OPENAI_MODEL:
            raise ValueError("OpenAI model was not provided")

        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            max_retries=0,
            timeout=60.0,
        )
        self.model_id = settings.OPENAI_MODEL
        self._max_retries = 3

        self._semaphore = asyncio.Semaphore(25)

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

    async def _sleep_backoff(self, attempt: int) -> None:
        """exponential backoff with jitter"""
        delay = min(0.5 * (2**attempt), 8.0)
        await asyncio.sleep(delay)

    async def generate(self, query: str, retrievals: List[RetrievalResponse], template: str = llm_prompt) -> LLMResponse:
        """Generate a single, non-streaming response from OpenAI."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals, template=template)

        last_error: Optional[Exception] = None
        async with self._semaphore:
            for attempt in range(self._max_retries + 1):
                try:
                    response = await self.client.chat.completions.create(
                        model=self.model_id,
                        messages=[
                            {"role": "user", "content": prompt},
                        ],
                        response_format=LLMResponse,
                    )

                    return response.choices[0].message.content
                except (RateLimitError, APITimeoutError, APIConnectionError, InternalServerError) as exc:
                    logger.warning(
                        "llm.complete.retryable_error",
                        extra={"attempt": attempt, "error_type": type(exc).__name__},
                    )
                    if attempt < self._max_retries:
                        await self._sleep_backoff(attempt)
                        continue
                    break

                except (BadRequestError, AuthenticationError) as exc:
                    logger.error("llm.complete.fatal_error", extra={"error_type": type(exc).__name__})
                    raise ValueError(f"Non-retryable LLM error: {exc}") from exc

        logger.error("llm.complete.exhausted_retries", extra={"error_type": type(last_error).__name__})
        raise ValueError(f"LLM call failed after {self._max_retries} retries: {last_error}") from last_error

    async def stream(self, query: str, retrievals: List[RetrievalResponse], template: str = llm_stream_prompt) -> Any:
        """Generate streaming response from OpenAI."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals, template=template)
        last_error: Optional[Exception] = None

        async with self._semaphore:
            for attempt in range(self._max_retries + 1):
                try:
                    stream_resp = await self.client.chat.completions.create(
                        model=self.model_id,
                        messages=[{"role": "user", "content": prompt}],
                        stream=True,
                        stream_options={"include_usage": True},
                    )
                    async for chunk in stream_resp:
                        if not chunk.choices:
                            continue
                        delta = chunk.choices[0].delta.content
                        if delta:
                            yield delta
                    return
                except (RateLimitError, APITimeoutError, APIConnectionError, InternalServerError) as exc:
                    last_error = exc
                    logger.warning(
                        "llm.stream.retryable_error",
                        extra={"attempt": attempt, "error_type": type(exc).__name__},
                    )
                    if attempt < self._max_retries:
                        await self._sleep_backoff(attempt)
                        continue
                    break
                except (BadRequestError, AuthenticationError) as exc:
                    logger.error("llm.stream.fatal_error", extra={"error_type": type(exc).__name__})
                    raise Exception(f"Non-retryable LLM error: {exc}") from exc

        logger.error("llm.stream.exhausted_retries", extra={"error_type": type(last_error).__name__})
        raise Exception(f"LLM stream failed after {self._max_retries} retries: {last_error}") from last_error

    async def health_check(self, timeout: float = 5.0) -> bool:

        try:
            await asyncio.wait_for(
                self.client.models.retrieve(self.model_id),
                timeout=timeout,
            )
            logger.info("llm.health_check.ok")
            return True

        except asyncio.TimeoutError:
            logger.error("llm.health_check.timeout", extra={"timeout_s": timeout})
            return False

        except AuthenticationError as exc:
            logger.error("llm.health_check.auth_failed", extra={"error_type": type(exc).__name__})
            return False

        except Exception as exc:
            logger.error("llm.health_check.failed", extra={"error_type": type(exc).__name__})
            return False

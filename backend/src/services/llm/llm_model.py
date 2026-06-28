from pathlib import Path
from typing import Any, Dict, List

import boto3  # type: ignore
from pydantic import ValidationError
from pystache import render  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.llm import LLMResponse, LLMStructuredResponse
from src.schemas.retrieval import RetrievalResponse

settings = get_settings()
logger = get_logger(__name__)

llm_prompt = (Path(__file__).parent / "prompts" / "llm_response.mustache").read_text("utf-8")


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

    def render_prompt_template(self, user_question: str, retrievals: List[RetrievalResponse]) -> str:
        """Render the prompt template for the LLM."""
        context = self._map_context(user_question=user_question, retrievals=retrievals)
        return render(template=llm_prompt, context=context)

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

    async def generate(self, query: str, retrievals: List[RetrievalResponse]) -> LLMResponse:
        """Generate a structured response from Bedrock using tool use."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals)

        logger.info(f"Invoking Bedrock LLM with prompt: {prompt}")

        try:
            response = self.client.converse(
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

            logger.debug(f"Raw Bedrock response: {response!r}")

            # Extract token usage and stop reason from response metadata
            usage = response.get("usage", {})
            stop_reason = response.get("stopReason", "Unknown")

            tool_input = self._extract_tool_input(response)
            structured_response = self._parse_structured_response(tool_input)

            return LLMResponse(
                answer=structured_response,
                model_id=self.model_id,  # self.model_id is always available
                input_tokens=usage.get("inputTokens"),
                output_tokens=usage.get("outputTokens"),
                stop_reason=stop_reason,
            )

        except Exception as e:
            logger.error(f"Error invoking Bedrock LLM Model: {e}")
            raise

    def stream(self, query: str, retrievals: List[RetrievalResponse]) -> Any:
        """Generate a streaming response from Bedrock using tool use."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals)
        logger.info(f"Invoking Bedrock LLM with prompt: {prompt}")

        try:
            response = self.client.converse_stream(
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

            for event in response["stream"]:
                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"]["delta"]
                    if "text" in delta:
                        yield delta["text"]
                elif "messageStop" in event:
                    logger.info("Bedrock LLM stream stopped.")
                    break

        except Exception as e:
            logger.error(f"Error invoking Bedrock LLM Model stream: {e}")
            raise

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
            logger.error(f"Bedrock LLM health check failed: {e}")
            return False

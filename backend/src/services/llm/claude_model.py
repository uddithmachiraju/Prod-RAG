from pathlib import Path
from typing import Any, Dict, List

import boto3  # type: ignore
from pystache import render  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.schemas.llm import LLMResponse
from src.schemas.retrieval import RetrievalResponse

settings = get_settings()
logger = get_logger(__name__)

llm_prompt = (Path(__file__).parent / "prompts" / "llm_response.mustache").read_text("utf-8")


class ClaudeModel:
    """AWS Bedrock LLM wrapper for Claude Model."""

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
            "context": [
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

    async def generate(self, query: str, retrievals: List[RetrievalResponse]) -> LLMResponse:
        """Generate response from Bedrock Claude Model."""

        prompt = self.render_prompt_template(user_question=query, retrievals=retrievals)

        try:
            response = self.client.converse(
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": prompt,
                            }
                        ],
                    }
                ],
                inferenceConfig={
                    "maxTokens": 1500,
                    "temperature": 0.7,
                    "topP": 0.9,
                    "stopSequences": ["THE END"],
                },
                additionalModelRequestFields={
                    "inferenceConfig": {
                        "topK": 50,
                    }
                },
            )

            # Extract text safely from Bedrock response structure
            content = response.get("output", {}).get("message", {}).get("content", "")
            if isinstance(content, list):
                content = "".join(item.get("text", "") if isinstance(item, dict) else str(item) for item in content)
            elif isinstance(content, dict):
                content = content.get("text", "")

            return LLMResponse(
                answer=content,
                model_id=self.model_id,
                input_tokens=0,
                output_tokens=0,
                stop_reason="Unknown",
            )

        except Exception as e:
            logger.error(f"Error invoking Bedrock Claude Model: {e}")
            raise

    def stream(self):
        pass

    def health_check(self):
        try:
            self.client.converse(
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": "Hello, Bedrock! This is a health check.",
                            }
                        ],
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

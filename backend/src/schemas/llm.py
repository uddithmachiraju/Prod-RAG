from typing import Optional

from pydantic import BaseModel, Field


class LLMResponse(BaseModel):
    """Response schema for the LLM Response."""

    answer: str = Field(..., description="Answer returned by the LLM.")
    model_id: str = Field(..., description="Model ID used for generation.")
    input_tokens: Optional[int] = Field(None, description="Number of input tokens consumed.")
    output_tokens: Optional[int] = Field(None, description="Number of output tokens generated.")
    stop_reason: Optional[str] = Field(None, description="Reason the model stopped generating (e.g. end_turn, max_tokens).")

from typing import Dict, List

from fastapi import APIRouter, Depends

from src.core.auth import get_current_user
from src.core.container import get_llm_service, get_retrieval_service
from src.schemas.llm import LLMResponse
from src.schemas.retrieval import RetrievalRequest, RetrievalResponse

router = APIRouter()
retrieval_service = get_retrieval_service()
llm_service = get_llm_service()


@router.post("/query", status_code=200, response_model=LLMResponse)
async def query_retrieval(request: RetrievalRequest, user: Dict = Depends(get_current_user)) -> LLMResponse:
    """Endpoint to handle retrieval queries."""

    response: List[RetrievalResponse] = await retrieval_service.search_query(request)

    return await llm_service.generate(query=request.query, retrievals=response)

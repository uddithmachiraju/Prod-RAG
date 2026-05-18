from fastapi import APIRouter

from src.core.container import get_retrieval_service
from src.schemas.retrieval import RetrievalQueryRequest, RetrievalQueryResponse

router = APIRouter()

@router.post("/query", status_code=200, response_model=RetrievalQueryResponse)
async def query_retrieval(request: RetrievalQueryRequest) -> RetrievalQueryResponse:
    """Endpoint to handle retrieval queries."""
    
    retrieval_service = get_retrieval_service()
    return await retrieval_service.search_query(request)
from typing import Dict, List

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.auth import get_current_user
from src.core.container import get_llm_service, get_retrieval_service
from src.db.mongo_db import get_db
from src.schemas.llm import LLMResponse
from src.schemas.retrieval import RetrievalRequest, RetrievalResponse
from src.services.chats.chat_service import add_message_to_chat

router = APIRouter()
retrieval_service = get_retrieval_service()
llm_service = get_llm_service()


@router.post("/query", status_code=200, response_model=LLMResponse)
async def query_retrieval(request: RetrievalRequest, user: Dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> LLMResponse:
    """Endpoint to handle retrieval queries."""

    await add_message_to_chat(
        chat_id=request.chat_id,
        payload={
            "user_id": str(user["_id"]),
            "role": "user",
            "content": request.query,
        },
        db=db,
    )
    retrieved_chunks: List[RetrievalResponse] = await retrieval_service.search_query(request)

    llm_response: LLMResponse = await llm_service.generate(query=request.query, retrievals=retrieved_chunks)

    await add_message_to_chat(
        chat_id=request.chat_id,
        payload={
            "user_id": str(user["_id"]),
            "role": "assistant",
            "content": llm_response.answer.content,
            "input_tokens": llm_response.input_tokens,
            "output_tokens": llm_response.output_tokens,
            "model": llm_response.model_id,
            "latency": 0,
        }, 
        db=db,
    )
    return llm_response

from typing import Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
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


# @router.post("/query/stream", status_code=200, response_class=StreamingResponse)
# async def query_retrieval_stream(request: RetrievalRequest, background_tasks: BackgroundTasks, user: Dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
#     """Endpoint to handle retrieval queries with streaming response."""

#     background_tasks.add_task(
#         add_message_to_chat,
#         chat_id=request.chat_id,
#         payload={
#             "user_id": str(user["_id"]),
#             "role": "user",
#             "content": request.query,
#         },
#         db=db,
#     )

#     async def stream_response():
#         assistant_response = ""

#         usage = {"inputTokens": 0, "outputTokens": 0}
#         stop_reason = "Unknown"
#         model = None
#         latency = None

#         try:

#             retrieved_chunks: List[RetrievalResponse] = await retrieval_service.search_query(request)  # type: ignore

#             async for chunk in llm_service.async_stream(query=request.query, retrievals=retrieved_chunks):
#                 if chunk["type"] == "text":
#                     assistant_response += chunk["content"]
#                     yield chunk["content"]

#                 elif chunk["type"] == "metadata":
#                     usage = chunk["usage"]
#                     latency = chunk["latency"]
#                     model = chunk["model"]

#                 elif chunk["type"] == "stop":
#                     stop_reason = chunk["reason"]

#         finally:
#             background_tasks.add_task(
#                 add_message_to_chat,
#                 chat_id=request.chat_id,
#                 payload={
#                     "user_id": str(user["_id"]),
#                     "role": "assistant",
#                     "content": assistant_response,
#                     "input_tokens": usage["inputTokens"],
#                     "output_tokens": usage["outputTokens"],
#                     "model": model,
#                     "latency(ms)": latency,
#                 },
#                 db=db,
#             )

#     return StreamingResponse(stream_response(), media_type="text/event-stream")


@router.post("/query/stream", status_code=200, response_class=StreamingResponse)
async def query_retrieval_stream(request: RetrievalRequest, background_tasks: BackgroundTasks, user: Dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Endpoint to handle retrieval queries with streaming response."""

    background_tasks.add_task(
        add_message_to_chat,
        chat_id=request.chat_id,
        payload={
            "user_id": str(user["_id"]),
            "role": "user",
            "content": request.query,
        },
        db=db,
    )

    async def stream_response():
        assistant_response = ""

        try:
            retrieved_chunks: List[RetrievalResponse] = await retrieval_service.search_query(request)  # type: ignore

            async for chunk in llm_service.stream(
                query=request.query,
                retrievals=retrieved_chunks,
            ):
                assistant_response += chunk
                yield chunk

        finally:
            background_tasks.add_task(
                add_message_to_chat,
                chat_id=request.chat_id,
                payload={
                    "user_id": str(user["_id"]),
                    "role": "assistant",
                    "content": assistant_response,
                    "input_tokens": None,
                    "output_tokens": None,
                    "model": llm_service.model_id,
                    "latency(ms)": None,
                },
                db=db,
            )

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
    )

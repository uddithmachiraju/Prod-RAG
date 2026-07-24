import asyncio
from time import perf_counter
from typing import Any

from src.config.logging import get_logger, setup_logging
from src.config.settings import get_settings
from src.core.container import get_parser
from src.core.metrics import flush_timings, record_timing
from src.db.mongo_db import get_db
from src.services.notifications.publisher import publish_document_ready
from src.services.sqs.consumer import Consumer, setup_signal_handlers

settings = get_settings()
setup_logging()
logger = get_logger(__name__)


class IngestionWorker(Consumer):
    """Worker that listens to the SQS queue for document ingestion jobs and processes them."""

    async def process_message(self, message: dict[str, Any]) -> None:
        """Process a single message from SQS queue."""

        payload = message
        user_id = payload.get("user_id", "")
        file_key = payload.get("file_key")
        document_id = payload.get("document_id", "")

        total_time = perf_counter()
        logger.info("Ingesting Document", user_id=user_id, file_key=file_key, document_id=document_id)

        db = await get_db()

        try:
            parser = get_parser()
            start = perf_counter()
            document = await parser.parse(
                user_id=str(user_id) if user_id is not None else None,  # type: ignore
                file_metadata={
                    "file_name": payload.get("file_name"),
                    "file_key": payload.get("file_key"),
                    "file_type": payload.get("file_type"),
                    "file_size": payload.get("file_size"),
                    "document_id": payload.get("document_id"),
                },
            )
            record_timing("ingestion_worker.chunk_embedd_index", (perf_counter() - start) * 1000)

            doc = document.model_dump()
            doc["_id"] = document_id

            start = perf_counter()
            await db.documents.replace_one(
                {"_id": document_id},
                doc,
                upsert=True,
            )
            record_timing("ingestion_worker.document_upload_mongodb", (perf_counter() - start) * 1000)

            await publish_document_ready(document_id=document_id, user_id=user_id)
            record_timing("ingestion_worker.document_ingestion", (perf_counter() - total_time) * 1000)
            logger.info("Document ingested successfully", user_id=user_id, file_key=file_key, document_id=document.document_id)
        except Exception as e:
            logger.error("Error ingesting document", user_id=user_id, file_key=file_key, document_id=document_id, error=str(e))


async def main() -> None:
    worker = IngestionWorker()
    shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    setup_signal_handlers(loop, shutdown_event)

    logger.info("Starting worker...")

    try:
        await worker.consume(shutdown_event)
    finally:
        flush_timings()
        logger.info("Worker stopped")


if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from typing import Any, Dict

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.core.container import get_parser
from src.db.mongo_db import get_db
from src.services.sqs.consumer import Consumer, setup_signal_handlers

settings = get_settings()
logger = get_logger(__name__)


class IngestionWorker(Consumer):
    """Worker that listens to the SQS queue for document ingestion jobs and processes them."""

    async def process_message(self, message: Dict[str, Any]) -> None:
        """Process a single message from SQS queue."""

        payload = message
        user_id = payload.get("user_id")
        file_key = payload.get("file_key")
        document_id = payload.get("document_id")

        logger.info("Ingesting Document", user_id=user_id, file_key=file_key, document_id=document_id)

        db = await get_db()

        try:
            parser = get_parser()
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

            doc = document.model_dump()
            doc["_id"] = document_id

            await db.documents.replace_one(
                {"_id": document_id},
                doc,
                upsert=True,
            )
            logger.info("Document ingested successfully", user_id=user_id, file_key=file_key, document_id=document.document_id)
        except Exception as e:
            logger.error("Error ingesting document", user_id=user_id, file_key=file_key, document_id=document_id, error=str(e))


async def main() -> None:
    worker = IngestionWorker()
    shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    setup_signal_handlers(loop, shutdown_event)

    logger.info("Starting worker...")

    await worker.consume(shutdown_event)

    logger.info("Worker stopped")


if __name__ == "__main__":
    asyncio.run(main())

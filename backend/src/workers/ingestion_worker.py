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

        logger.info("Ingesting Document", user_id=user_id, file_key=file_key)
        
        db = await get_db()

        try:
            parser = get_parser()
            document = await parser.parse(
                user_id=str(user_id) if user_id is not None else None, # type: ignore
                file_metadata={
                    "file_name": payload.get("file_name"),
                    "file_key": payload.get("file_key"),
                    "file_type": payload.get("file_type"),
                    "file_size": payload.get("file_size"),
                }
            )

            await db.documents.insert_one(document.model_dump())
            logger.info("Document ingested successfully", user_id=user_id, file_key=file_key, document_id=document.document_id)
        except Exception as e:
            logger.error("Error ingesting document", user_id=user_id, file_key=file_key, error=str(e))



async def main() -> None:
    worker = IngestionWorker()
    shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    setup_signal_handlers(loop, shutdown_event)

    await worker.consume(shutdown_event)


if __name__ == "__main__":
    asyncio.run(main())
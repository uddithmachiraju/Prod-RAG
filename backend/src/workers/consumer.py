import asyncio
import json
import signal
from typing import Any, Dict, List

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings

settings = get_settings()
logger = get_logger(__name__)



class Consumer:
    """Worker that consumes messages from the SQS queue and processes them."""

    def __init__(self) -> None:
        self.queue_url = settings.AWS_SQS_QUEUE_URL
        self.sqs_client = boto3.client(
            "sqs", 
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    def _receive_messages(self) -> Dict[str, Any]:
        """Receive messages from the SQS queue."""

        try:
            response = self.sqs_client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=20,
            )
            return response
        except (BotoCoreError, ClientError) as e:
            logger.error("Error receiving messages from SQS", error=str(e), queue_url=self.queue_url)
            return {}
        
    async def _handle_message(self, loop: asyncio.AbstractEventLoop, message: Dict[str, Any]) -> None:
        """Handle a single message from the SQS queue."""

        try:
            logger.info("Processing message", message_id=message.get("MessageId"), data=message)

            body = json.loads(message.get("Body", "{}"))

            await self.process_message(body) 

            await loop.run_in_executor(
                None, 
                lambda: self.sqs_client.delete_message(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=message["ReceiptHandle"],
                )
            )

            logger.info("Message processed and deleted", message_id=message.get("MessageId"))

        except json.JSONDecodeError as e:
            logger.error("Error decoding message body", error=str(e), message_id=message.get("MessageId"))

    async def consume(self, shutdown_event: asyncio.Event) -> None:
        """Continuously poll the SQS queue for messages and process them."""

        logger.info("Starting SQS consumer", queue_url=self.queue_url)
        loop = asyncio.get_running_loop()
        
        while not shutdown_event.is_set():
            try:
                response = await loop.run_in_executor(
                    None, 
                    self._receive_messages,
                )

                messages: List[Dict[str, Any]] = response.get("Messages", [])

                if not messages:
                    continue
                logger.info("Messages received", count=len(messages), queue_url=self.queue_url)
                
                tasks = [
                    self._handle_message(loop, message)
                    for message in messages
                ]
                await asyncio.gather(*tasks)    
                
            except Exception as e:
                logger.error("Error consuming messages", error=str(e), queue_url=self.queue_url)

    async def process_message(self, message: dict) -> None:
        """Process a single message from the SQS queue."""

        try:
            logger.info("Processing message", message_id=message.get("MessageId"), data=message)
        except json.JSONDecodeError as e:
            logger.error("Error decoding message body", error=str(e), message_id=message.get("MessageId"))


def setup_signal_handlers(loop, shutdown_event: asyncio.Event) -> None:
    def _shutdown():
        logger.info("Shutdown signal received")
        shutdown_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _shutdown)



async def main():
    consumer = Consumer()
    shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    setup_signal_handlers(loop, shutdown_event)

    consumer_task = asyncio.create_task(consumer.consume(shutdown_event))

    loop = asyncio.get_running_loop()

    def send_message():
        return consumer.sqs_client.send_message(
            QueueUrl=settings.AWS_SQS_QUEUE_URL, 
            MessageBody=json.dumps(
                {
                    "test": "message", 
                    "type": "rag_ingest", 
                    "payload":
                    {
                        "job_id": "test-123",
                        "data": "This is a test message for RAG ingestion",
                    },
                }
            )
        )
    
    try:
        await loop.run_in_executor(None, send_message)
        await consumer_task
    except Exception as e:
        logger.error("Error occured in main loop", error=str(e))

    await shutdown_event.wait()

    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass

if __name__ == "__main__":
    asyncio.run(main())
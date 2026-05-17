import json
from typing import Any, Dict

import boto3  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings

settings = get_settings()
logger = get_logger(__name__)

class SQSProducer:
    """Producer that sends messages to the SQS queue."""

    def __init__(self) -> None:
        self.queue_url = settings.AWS_SQS_QUEUE_URL
        self.sqs_client = boto3.client(
            "sqs", 
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    def enqueue_job(self, job_data: Dict[str, Any]) -> str:
        """Enqueue a job to the SQS queue."""
        
        response = self.sqs_client.send_message(
            QueueUrl=self.queue_url, 
            MessageBody=json.dumps(job_data)
        )
        logger.info("Enqueued job to SQS", job_data=job_data, message_id=response.get("MessageId"))

        return response["MessageId"]
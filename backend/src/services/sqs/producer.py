import json
from typing import Any, Dict

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore

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
    
    def health_check(self) -> bool:
        """Health check for the SQS producer."""
        try:
            self.sqs_client.get_queue_attributes(
                QueueUrl=self.queue_url,
                AttributeNames=["QueueArn"],
            )
            logger.info("SQS health check passed", queue_url=self.queue_url)
            return True
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "AWS.SimpleQueueService.NonExistentQueue":
                logger.error("SQS queue does not exist", queue_url=self.queue_url, error_code=error_code)
            else:
                logger.error("SQS health check failed", queue_url=self.queue_url, error_code=error_code, error=str(e))
            return False
        except BotoCoreError as e:
            logger.error("SQS unreachable", queue_url=self.queue_url, error=str(e))
            return False
import asyncio
from typing import Tuple

import boto3  # type: ignore

from src.config.logging import get_logger
from src.config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()


s3_client: boto3.client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
)


def generate_file_key(user_id: str, filename: str, document_id: str) -> str:
    """Generate a unique S3 key for storing the file."""

    safe_filename = filename.replace("/", "_")

    return f"{user_id}/{document_id}/{safe_filename}"

async def download_file_from_s3(file_key: str) -> bytes:
    """Download a file from S3 from its file key."""

    loop = asyncio.get_running_loop()
    try:
        response = await loop.run_in_executor(
            None,
            lambda: s3_client.get_object(
                Bucket=settings.AWS_S3_BUCKET_NAME, 
                Key=file_key,
            )
        )
        file_bytes = response["Body"].read()
        return file_bytes
    except Exception as e:
        logger.error("error downloading file from s3", file_key=file_key)
        raise RuntimeError(f"Error downloading file from S3: {str(e)}")


async def generate_presigned_url(user_id: str, filename: str, document_id: str, content_type: str) -> Tuple[str, str]:
    """Generates a presigned URL for uploading a file to S3."""

    file_key = generate_file_key(user_id=user_id, filename=filename, document_id=document_id)

    try:
        presigned_url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.AWS_S3_BUCKET_NAME,
                "Key": file_key,
                "ContentType": content_type,
            },
            ExpiresIn=settings.AWS_S3_FILE_EXPIRE_SECONDS,
        )
        logger.info("generated presigned url", user_id=user_id, document_id=document_id, filename=filename)
        return presigned_url, file_key
    except Exception as e:
        logger.error("error generating presigned url", user_id=user_id, document_id=document_id, filename=filename)
        raise RuntimeError(f"Error generating presigned url: {str(e)}")


async def generate_view_url(file_key: str) -> str:
    """Generates a presigned URL for viewing a file from S3."""

    try:
        presigned_url = s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.AWS_S3_BUCKET_NAME,
                "Key": file_key,
            },
            ExpiresIn=settings.AWS_S3_FILE_EXPIRE_SECONDS,
        )
        return presigned_url
    except Exception as e:
        logger.error("error generating view url", file_key=file_key)
        raise RuntimeError(f"Error generating view url: {str(e)}")

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Settings
    ENV: Literal["development", "production"] = Field(default="development", description="Application environment")
    APP_NAME: str = Field(default="RAG", description="Name of the application")
    DEBUG: bool = Field(default=False, description="Debug mode")
    HOST: str = Field(default="0.0.0.0", description="Host to run the application on")
    PORT: int = Field(default=8000, description="Port to run the application on")
    APP_BASE_URL: str = Field(default="http://localhost:8000", description="Base URL for the application")
    APP_VERSION: str = Field(default="1.0.0", description="Application version")

    # Database Settings
    MONGO_URI: str = Field(default=..., description="MongoDB connection URI")

    # CORS Settings
    CORS_ORIGIN: list[str] = Field(default=["*"], description="List of allowed CORS origins")

    # Authentication Settings
    JWT_SECRET_KEY: str = Field(default=..., description="Secret key for JWT token generation")
    JWT_ALGORITHM: str = Field(default="HS256", description="Algorithm used for JWT token generation")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, description="Access token expiration time in minutes")

    # Email Verification Settings
    SMTP_HOST: str = Field(default="smtp.gmail.com", description="SMTP server host")
    SMTP_PORT: int = Field(default=587, description="SMTP server port")
    SMTP_USE_TLS: bool = Field(default=True, description="Whether to use TLS for SMTP connection")
    SMTP_USERNAME: str = Field(default=..., description="SMTP server username")
    SMTP_PASSWORD: str = Field(default=..., description="SMTP server password")
    SMTP_FROM_EMAIL: str = Field(default=..., description="Email address used as the sender for outgoing emails")
    EMAIL_VERIFY_EXPIRE_HOURS: int = Field(default=24, description="Expiration time for email verification tokens in hours")

    # AWS Bedrock Settings
    AWS_BEDROCK_API_KEY: str = Field(default=..., description="API key for AWS Bedrock service")
    AWS_BEDROCK_REGION: str = Field(default="us-east-1", description="AWS region for Bedrock service")
    AWS_BEDROCK_MODEL_ID: str = Field(default=..., description="Model ID for AWS Bedrock embeddings")

    # AWS Settings
    AWS_ACCESS_KEY_ID: str = Field(default=..., description="AWS access key ID for S3")
    AWS_SECRET_ACCESS_KEY: str = Field(default=..., description="AWS secret access key for S3")
    AWS_REGION: str = Field(default=..., description="AWS region for S3")
    AWS_S3_BUCKET_NAME: str = Field(default=..., description="AWS S3 bucket name for storing files")
    AWS_S3_FILE_EXPIRE_SECONDS: int = Field(default=3600, description="Expiration time for S3 presigned URLs in seconds")

    # Observability Settings
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get application settings with caching."""
    return Settings()


settings: Settings = get_settings()

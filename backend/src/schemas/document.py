from pydantic import BaseModel, Field


class UploadURLRequest(BaseModel):
    """Request schema for generating presigned url."""

    file_name: str = Field(..., description="Name of the given document.")


class UploadURLResponse(BaseModel):
    """Response schema for upload url generation."""

    url: str = Field(..., description="Upload URL used to upload the file.")

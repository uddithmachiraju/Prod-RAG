from fastapi import APIRouter, Depends, status

from src.core.auth import get_current_user
from src.schemas.document import UploadURLRequest, UploadURLResponse

router = APIRouter()


@router.get("/uploadURL", status_code=status.HTTP_200_OK, response_model=UploadURLResponse)
async def get_upload_url(payload: UploadURLRequest, user: dict = Depends(get_current_user)) -> UploadURLResponse:
    """get a presigned url to upload the userfile."""

    return UploadURLResponse(url="")

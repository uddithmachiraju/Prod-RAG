from pydantic import BaseModel, Field


class UserLoginRequest(BaseModel):
    """Schema for user login request."""

    email: str = Field(..., description="Email address of the user")
    password: str = Field(..., description="Password for the user")


class UserLoginResponse(BaseModel):
    """Schema for user login response."""

    access_token: str = Field(..., description="JWT access token for the user")
    refresh_token: str = Field(..., description="JWT refresh token for the user")
    token_type: str = Field(..., description="Type of the token, typically 'bearer'")
    expire_in_minutes: int = Field(..., description="Expiration time of the access token in minutes")
    full_name: str = Field(..., description="Full name of the user")
    username: str = Field(..., description="Username of the user")

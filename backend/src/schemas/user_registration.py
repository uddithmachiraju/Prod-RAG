from pydantic import BaseModel, Field


class UserRegistrationRequest(BaseModel):
    """Request model for user registration."""

    username: str = Field(..., description="Username for the new user")
    full_name: str = Field(..., description="Full name of the new user")
    email: str = Field(..., description="Email address of the new user")
    password: str = Field(..., description="Password for the new user")


class UserRegistrationResponse(BaseModel):
    """Schema for user registration response."""

    id: str = Field(..., description="Unique identifier for the user")
    username: str = Field(..., description="Username of the user")
    email: str = Field(..., description="Email address of the user")
    is_active: bool = Field(..., description="Whether the user account is active")
    is_email_verified: bool = Field(..., description="Whether the user's email is verified")
    created_at: str = Field(..., description="Timestamp when the user account was created")

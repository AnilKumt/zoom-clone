"""
Auth schemas for OTP registration, login, refresh, and password reset.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RequestOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)


class VerifyRegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=100)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class VerifyForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reset_token: str
    new_password: str = Field(min_length=8, max_length=100)


class AuthResponse(BaseModel):
    message: str
    user_id: str | None = None

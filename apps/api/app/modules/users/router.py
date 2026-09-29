"""User profile endpoints."""
from fastapi import APIRouter, Depends
from app.modules.users.schemas import UserResponse
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)

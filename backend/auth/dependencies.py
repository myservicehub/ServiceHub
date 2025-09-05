from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from models.auth import User, UserRole
from auth.security import verify_token
from database import database

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    
    try:
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    
    # Get user from database
    user_data = await database.get_user_by_id(user_id)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return User(**user_data)

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current authenticated and active user."""
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return current_user

async def get_current_homeowner(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current authenticated homeowner."""
    if current_user.role != UserRole.HOMEOWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Homeowner access required."
        )
    return current_user

async def get_current_tradesperson(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current authenticated tradesperson."""
    if current_user.role != UserRole.TRADESPERSON:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Tradesperson access required."
        )
    return current_user

async def get_current_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current authenticated admin user."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin access required."
        )
    return current_user

def optional_authentication(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[User]:
    """Optional authentication - returns user if authenticated, None otherwise."""
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        # Note: In a real implementation, you'd want to cache this or make it async
        # For now, we'll return None to avoid blocking
        return None
    except:
        return None
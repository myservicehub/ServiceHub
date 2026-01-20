from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from ..models.auth import User, UserRole, UserStatus
from ..auth.security import verify_token
from ..database import database
# Additional imports for admin auth
import os
import jwt
from datetime import datetime, timedelta
from ..models.admin import AdminRole, AdminPermission, get_admin_permissions

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    
    try:
        # First try to verify as a regular user token
        try:
            payload = verify_token(token)
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(status_code=401)
        except Exception:
            # If standard verification fails, check if it's an admin token
            try:
                # Admin tokens use a different secret and structure
                # Import here to avoid circular imports
                from ..routes.admin_management import JWT_SECRET as ADMIN_JWT_SECRET, JWT_ALGORITHM as ADMIN_JWT_ALGORITHM
                
                payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
                admin_id = payload.get("admin_id")
                if not admin_id:
                    raise HTTPException(status_code=401)
                
                # It's an admin token! Create a synthetic User object with ADMIN role
                # This allows admins to pass through endpoints expecting a User object
                return User(
                    id=admin_id,
                    name=payload.get("username") or "Admin",
                    email="admin@servicehub.co",
                    phone="",
                    role=UserRole.ADMIN,
                    status=UserStatus.ACTIVE,
                    location="",
                    postcode=""
                )
            except Exception:
                # If both fail, raise the original error
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    except HTTPException:
        raise
    
    # If DB is connected, load from database (Regular User Flow)
    if getattr(database, "connected", False):
        user_data = await database.get_user_by_id(user_id)
        if user_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return User(**user_data)
    
    # Degraded mode: synthesize user from token claims
    role = payload.get("role")
    status_value = payload.get("status")
    try:
        role_enum = UserRole(role) if role else UserRole.HOMEOWNER
    except Exception:
        role_enum = UserRole.HOMEOWNER
    try:
        status_enum = UserStatus(status_value) if status_value else UserStatus.ACTIVE
    except Exception:
        status_enum = UserStatus.ACTIVE

    synthetic = User(
        id=user_id,
        name=payload.get("name") or "New User",
        email=payload.get("email") or "user@example.com",
        phone=payload.get("phone") or "+2340000000000",
        role=role_enum,
        status=status_enum,
        location=payload.get("location") or "",
        postcode=payload.get("postcode") or "",
        trade_categories=payload.get("trade_categories"),
        experience_years=payload.get("experience_years"),
        company_name=payload.get("company_name"),
        description=payload.get("description"),
        certifications=payload.get("certifications"),
        # Keep review/job stats defaulted by model
    )
    return synthetic

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current authenticated and active user."""
    if current_user.status != UserStatus.ACTIVE:
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

# =============================
# Admin authentication helpers
# =============================
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET", "servicehub_admin_secret_key_2024")
ADMIN_JWT_ALGORITHM = "HS256"
ADMIN_JWT_EXPIRATION_HOURS = 8

async def get_current_admin_account(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> dict:
    """Get current authenticated admin (admin-management system) from JWT token."""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
        admin_id = payload.get("admin_id")
        role = payload.get("role")
        if not admin_id or not role:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        admin = await database.get_admin_by_id(admin_id)
        if not admin:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
        
        if admin.get("status") != "active":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account is not active")
        
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except (jwt.InvalidTokenError, jwt.DecodeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_permission(permission: AdminPermission):
    """Dependency to require specific admin permission (admin-management system)."""
    def check_permission(admin: dict = Depends(get_current_admin_account)):
        admin_role = AdminRole(admin["role"])
        if permission not in get_admin_permissions(admin_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission.value}"
            )
        return admin
    return check_permission

def create_admin_access_token(admin_id: str, username: str, role: str) -> str:
    """Create admin JWT access token (admin-management system)."""
    payload = {
        "admin_id": admin_id,
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=ADMIN_JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ADMIN_JWT_ALGORITHM)

# =============================
# Verification status guards
# =============================
async def require_homeowner_contact_verified(current_user: User = Depends(get_current_homeowner)) -> User:
    """Require homeowner email verification only"""
    if not getattr(current_user, "email_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Homeowner must verify email")
    return current_user

async def require_tradesperson_verified(current_user: User = Depends(get_current_tradesperson)) -> User:
    """Require tradesperson fully verified (admin-approved)"""
    if not getattr(current_user, "verified_tradesperson", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tradesperson must complete verification")
    return current_user
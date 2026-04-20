from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import bcrypt
import jwt
import secrets
import string
import os

from ..database import database
from ..models.admin import (
    Admin, AdminCreate, AdminUpdate, AdminLogin, AdminLoginResponse,
    AdminPasswordChange, AdminPasswordReset, AdminActivity, AdminActivityType,
    AdminRole, AdminStatus, AdminPermission, get_admin_permissions, has_permission, can_manage_role
)
from ..models.notifications import NotificationType
from ..services.notifications import notification_service
from ..auth.security import create_password_reset_token, get_password_hash

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/admin-management", tags=["admin_management"])

# JWT Configuration
JWT_SECRET = "servicehub_admin_secret_key_2024"  # In production, use environment variable
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 8

# Dependencies
async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated admin"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        admin_id = payload.get("admin_id")
        
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Degraded mode: synthesize admin from token without DB access
        if not getattr(database, "connected", False):
            return {
                "id": admin_id,
                "username": payload.get("username") or "superadmin",
                "email": "admin@servicehub.co",
                "full_name": "Super Administrator",
                "role": payload.get("role") or AdminRole.SUPER_ADMIN.value,
                "status": AdminStatus.ACTIVE.value,
                "must_change_password": False,
                "last_login": None,
                "created_at": datetime.utcnow(),
            }
        
        admin = await database.get_admin_by_id(admin_id)
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        
        if admin["status"] != AdminStatus.ACTIVE.value:
            raise HTTPException(status_code=401, detail="Admin account is not active")
        
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except (jwt.InvalidTokenError, jwt.DecodeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

def require_permission(permission: AdminPermission):
    """Dependency to require specific permission"""
    def check_permission(admin: dict = Depends(get_current_admin)):
        admin_role = AdminRole(admin["role"])
        if not has_permission(admin_role, permission):
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required: {permission.value}"
            )
        return admin
    return check_permission

# Utility functions
def generate_password(length: int = 12) -> str:
    """Generate a secure random password"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(characters) for _ in range(length))

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(admin_id: str, username: str, role: str) -> str:
    """Create JWT access token"""
    payload = {
        "admin_id": admin_id,
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def log_admin_activity(
    admin_id: str,
    admin_username: str,
    activity_type: AdminActivityType,
    description: str,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    metadata: Optional[dict] = None,
    request: Optional[Request] = None
):
    """Log admin activity"""
    activity = AdminActivity(
        admin_id=admin_id,
        admin_username=admin_username,
        activity_type=activity_type,
        description=description,
        target_id=target_id,
        target_type=target_type,
        metadata=metadata,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None
    )
    
    # Guard logging when DB is disconnected (degraded mode)
    if getattr(database, "connected", False):
        await database.create_admin_activity(activity.dict())
    else:
        logger.warning("Skipping admin activity logging due to database not connected")

# Routes

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(login_data: AdminLogin, request: Request):
    """Admin login with role-based authentication"""
    
    # Degraded mode: allow emergency superadmin login without DB access
    if not getattr(database, "connected", False):
        if login_data.username == "admin" and login_data.password == "servicehub2024":
            admin = {
                "id": "super-admin-ephemeral",
                "username": "superadmin",
                "email": "admin@servicehub.co",
                "full_name": "Super Administrator",
                "role": AdminRole.SUPER_ADMIN.value,
                "status": AdminStatus.ACTIVE.value,
                "permissions": [perm.value for perm in get_admin_permissions(AdminRole.SUPER_ADMIN)],
                "must_change_password": False,
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            # Create access token
            access_token = create_access_token(admin["id"], admin["username"], admin["role"])
            admin_role = AdminRole(admin["role"])
            permissions = [perm.value for perm in get_admin_permissions(admin_role)]
            admin_response = {
                "id": admin["id"],
                "username": admin["username"],
                "email": admin["email"],
                "full_name": admin["full_name"],
                "role": admin["role"],
                "status": admin["status"],
                "must_change_password": admin.get("must_change_password", False),
                "last_login": admin.get("last_login"),
                "created_at": admin["created_at"]
            }
            return AdminLoginResponse(
                access_token=access_token,
                expires_in=8 * 3600,
                admin=admin_response,
                permissions=permissions
            )
        else:
            raise HTTPException(status_code=503, detail="Database offline; only emergency admin login is available")
    
    # First check if it's the legacy admin credentials for backward compatibility
    if login_data.username == "admin" and login_data.password == "servicehub2024":
        # Check if super admin exists, if not create one
        super_admin = await database.get_admin_by_username("superadmin")
        if not super_admin:
            # Create default super admin
            temp_password = "ServiceHub@2024"
            super_admin_data = {
                "id": "super-admin-default",
                "username": "superadmin",
                "email": "admin@servicehub.co",
                "full_name": "Super Administrator",
                "role": AdminRole.SUPER_ADMIN.value,
                "status": AdminStatus.ACTIVE.value,
                "permissions": [perm.value for perm in get_admin_permissions(AdminRole.SUPER_ADMIN)],
                "password_hash": hash_password(temp_password),
                "must_change_password": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "login_count": 0,
                "failed_login_attempts": 0
            }
            await database.create_admin(super_admin_data)
            super_admin = super_admin_data
        
        # Use super admin for legacy login
        admin = super_admin
    else:
        # Normal admin login
        admin = await database.get_admin_by_username(login_data.username)
        if not admin:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Check account status
        if admin["status"] != AdminStatus.ACTIVE.value:
            raise HTTPException(status_code=401, detail="Admin account is not active")
        
        # Check if account is locked
        if admin.get("locked_until") and datetime.fromisoformat(admin["locked_until"]) > datetime.utcnow():
            raise HTTPException(status_code=401, detail="Account is temporarily locked")
        
        # Verify password
        if not verify_password(login_data.password, admin["password_hash"]):
            # Increment failed attempts
            await database.increment_admin_failed_attempts(admin["id"])
            raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Update login information
    if getattr(database, "connected", False):
        await database.update_admin_login(admin["id"])
    
    # Create access token (centralized)
    access_token = create_access_token(admin["id"], admin["username"], admin["role"])
    
    # Get admin permissions
    admin_role = AdminRole(admin["role"])
    permissions = [perm.value for perm in get_admin_permissions(admin_role)]
    
    # Log login activity
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.LOGIN,
        f"Admin {admin['username']} logged in", request=request
    )
    
    # Prepare response (exclude sensitive data)
    admin_response = {
        "id": admin["id"],
        "username": admin["username"],
        "email": admin["email"],
        "full_name": admin["full_name"],
        "role": admin["role"],
        "status": admin["status"],
        "must_change_password": admin.get("must_change_password", False),
        "last_login": admin.get("last_login"),
        "created_at": admin["created_at"]
    }
    
    return AdminLoginResponse(
        access_token=access_token,
        expires_in=8 * 3600,
        admin=admin_response,
        permissions=permissions
    )

@router.post("/logout")
async def admin_logout(admin: dict = Depends(get_current_admin), request: Request = None):
    """Admin logout"""
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.LOGOUT,
        f"Admin {admin['username']} logged out", request=request
    )
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_current_admin_info(admin: dict = Depends(get_current_admin)):
    """Get current admin information"""
    admin_role = AdminRole(admin["role"])
    permissions = [perm.value for perm in get_admin_permissions(admin_role)]
    
    return {
        "admin": {
            "id": admin["id"],
            "username": admin["username"],
            "email": admin["email"],
            "full_name": admin["full_name"],
            "role": admin["role"],
            "status": admin["status"],
            "must_change_password": admin.get("must_change_password", False),
            "last_login": admin.get("last_login"),
            "created_at": admin["created_at"],
            "phone": admin.get("phone"),
            "avatar_url": admin.get("avatar_url")
        },
        "permissions": permissions
    }

@router.get("/admins")
async def get_all_admins(
    skip: int = 0,
    limit: int = 50,
    role: Optional[AdminRole] = None,
    status: Optional[AdminStatus] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_ADMINS))
):
    """Get all admins (Super Admin only)"""
    
    # Degraded mode: avoid database calls and return safe fallback
    if not getattr(database, "connected", True):
        return {
            "admins": [],
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": 0
            },
            "degraded_mode": True,
            "message": "Database unavailable; returning empty admin list"
        }
    
    admins = await database.get_all_admins(skip=skip, limit=limit, role=role, status=status)
    total_count = await database.get_admins_count(role=role, status=status)
    
    # Remove sensitive data
    safe_admins = []
    for admin_data in admins:
        safe_admin = {k: v for k, v in admin_data.items() if k != "password_hash"}
        safe_admins.append(safe_admin)
    
    return {
        "admins": safe_admins,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_count
        }
    }

@router.post("/admins")
async def create_admin(
    admin_data: AdminCreate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_ADMINS)),
    request: Request = None
):
    """Create new admin (Super Admin only)"""
    
    # Degraded mode: reject writes when database is unavailable
    if not getattr(database, "connected", True):
        raise HTTPException(status_code=503, detail="Database unavailable; write operations are disabled in degraded mode")
    
    # Check if admin can manage this role
    current_admin_role = AdminRole(admin["role"])
    if not can_manage_role(current_admin_role, admin_data.role):
        raise HTTPException(
            status_code=403,
            detail=f"Cannot create admin with role {admin_data.role.value}"
        )
    
    # Check if username or email already exists
    effective_username = admin_data.username
    if not effective_username:
        # Generate username from email if not provided
        effective_username = admin_data.email.split('@')[0]
        # Ensure it meets min length
        if len(effective_username) < 3:
            effective_username = f"{effective_username}{secrets.token_hex(2)}"
    
    existing_admin = await database.get_admin_by_username(effective_username)
    if existing_admin:
        # If username exists, we delete it to allow recreation with the same username
        await database.database.admins.delete_one({"id": existing_admin["id"]})
    
    existing_admin = await database.get_admin_by_email(admin_data.email)
    if existing_admin:
        # If email exists, we delete it to allow recreation with the same email
        await database.database.admins.delete_one({"id": existing_admin["id"]})
    
    # Generate a random initial password (won't be shown to user)
    initial_password = secrets.token_urlsafe(16)
    
    # Create admin
    new_admin = Admin(
        username=effective_username,
        email=admin_data.email,
        full_name=admin_data.full_name,
        role=admin_data.role,
        phone=admin_data.phone,
        notes=admin_data.notes,
        password_hash=hash_password(initial_password),
        permissions=[perm.value for perm in get_admin_permissions(admin_data.role)],
        created_by=admin["id"],
        must_change_password=True
    )
    
    admin_id = await database.create_admin(new_admin.dict())
    
    # Log activity
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.CREATE_ADMIN,
        f"Created admin {admin_data.username} with role {admin_data.role.value}",
        target_id=admin_id, target_type="admin", request=request
    )
    
    # Generate setup token
    setup_token = create_password_reset_token(admin_id, admin_data.email, expires_delta=timedelta(hours=24))
    
    # Store token in database
    await database.create_password_reset_token(
        user_id=admin_id,
        token=setup_token,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    
    # Send invitation email
    frontend_url = os.environ.get("FRONTEND_URL", "https://www.myservicehub.co").rstrip("/")
    setup_link = f"{frontend_url}/reset-password?token={setup_token}&type=admin"
    
    try:
        await notification_service.send_notification(
            user_id=admin_id,
            notification_type=NotificationType.ADMIN_INVITATION,
            template_data={
                "full_name": admin_data.full_name,
                "username": effective_username,
                "role_name": admin_data.role.value.replace("_", " ").title(),
                "setup_link": setup_link
            },
            recipient_email=admin_data.email
        )
    except Exception as e:
        logger.error(f"Failed to send admin invitation email: {e}")
        # We don't fail the whole request if email fails, but we should log it
    
    return {
        "message": f"Admin created successfully with username @{effective_username}. An invitation email has been sent to set up their password.",
        "admin_id": admin_id,
        "username": effective_username
    }

@router.put("/admins/{admin_id}")
async def update_admin(
    admin_id: str,
    update_data: AdminUpdate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_ADMINS)),
    request: Request = None
):
    """Update admin (Super Admin only)"""
    
    # Degraded mode: reject writes when database is unavailable
    if not getattr(database, "connected", True):
        raise HTTPException(status_code=503, detail="Database unavailable; write operations are disabled in degraded mode")
    
    # Get target admin
    target_admin = await database.get_admin_by_id(admin_id)
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Check if admin can manage target admin's role
    current_admin_role = AdminRole(admin["role"])
    target_admin_role = AdminRole(target_admin["role"])
    
    if not can_manage_role(current_admin_role, target_admin_role):
        raise HTTPException(
            status_code=403,
            detail="Cannot modify this admin"
        )
    
    # If role is being changed, check permissions for new role
    if update_data.role and not can_manage_role(current_admin_role, update_data.role):
        raise HTTPException(
            status_code=403,
            detail=f"Cannot assign role {update_data.role.value}"
        )
    
    # Prepare update data
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    # Update permissions if role changed
    if update_data.role:
        update_dict["permissions"] = [perm.value for perm in get_admin_permissions(update_data.role)]
    
    # Update admin
    success = await database.update_admin(admin_id, update_dict)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update admin")
    
    # Log activity
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.UPDATE_ADMIN,
        f"Updated admin {target_admin['username']}",
        target_id=admin_id, target_type="admin",
        metadata=update_dict, request=request
    )
    
    return {
        "message": "Admin updated successfully",
        "admin_id": admin_id
    }

@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: str,
    admin: dict = Depends(get_current_admin),
    request: Request = None
):
    """Permanently delete an admin from the database (Super Admin only)"""
    
    # Degraded mode: reject writes when database is unavailable
    if not getattr(database, "connected", True):
        raise HTTPException(status_code=503, detail="Database unavailable; write operations are disabled in degraded mode")
    
    # Strictly require Super Admin role for deletion
    if admin["role"] != AdminRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super Administrators can delete admin accounts")
    
    # Prevent self-deletion
    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Get target admin
    target_admin = await database.get_admin_by_id(admin_id)
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Perform hard delete from database
    success = await database.database.admins.delete_one({"id": admin_id})
    if not success.deleted_count:
        raise HTTPException(status_code=500, detail="Failed to delete admin")
    
    # Log activity
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.DELETE_ADMIN,
        f"Permanently deleted admin {target_admin['username']}",
        target_id=admin_id, target_type="admin", request=request
    )
    
    return {
        "message": "Admin permanently deleted from the database",
        "admin_id": admin_id
    }

@router.post("/admins/{admin_id}/reset-password")
async def reset_admin_password(
    admin_id: str,
    reset_data: AdminPasswordReset,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_ADMINS)),
    request: Request = None
):
    """Reset admin password (Super Admin only)"""
    
    # Degraded mode: reject writes when database is unavailable
    if not getattr(database, "connected", True):
        raise HTTPException(status_code=503, detail="Database unavailable; write operations are disabled in degraded mode")
    
    # Get target admin
    target_admin = await database.get_admin_by_id(admin_id)
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Check permissions
    current_admin_role = AdminRole(admin["role"])
    target_admin_role = AdminRole(target_admin["role"])
    
    if not can_manage_role(current_admin_role, target_admin_role):
        raise HTTPException(status_code=403, detail="Cannot reset password for this admin")
    
    # Update password
    update_data = {
        "password_hash": hash_password(reset_data.new_password),
        "must_change_password": True,
        "failed_login_attempts": 0,
        "locked_until": None,
        "updated_at": datetime.utcnow()
    }
    
    success = await database.update_admin(admin_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset password")
    
    # Log activity
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.SYSTEM_ACTION,
        f"Reset password for admin {target_admin['username']}",
        target_id=admin_id, target_type="admin", request=request
    )
    
    return {
        "message": "Password reset successfully",
        "admin_id": admin_id,
        "must_change_password": True
    }

@router.post("/change-password")
async def change_password(
    password_data: AdminPasswordChange,
    admin: dict = Depends(get_current_admin),
    request: Request = None
):
    """Change own password"""
    
    # Degraded mode: reject writes when database is unavailable
    if not getattr(database, "connected", True):
        raise HTTPException(status_code=503, detail="Database unavailable; write operations are disabled in degraded mode")
    
    # Verify current password
    if not verify_password(password_data.current_password, admin["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Verify password confirmation
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="Password confirmation does not match")
    
    # Update password
    update_data = {
        "password_hash": hash_password(password_data.new_password),
        "must_change_password": False,
        "updated_at": datetime.utcnow()
    }
    
    success = await database.update_admin(admin["id"], update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to change password")
    
    # Log activity
    await log_admin_activity(
        admin["id"], admin["username"], AdminActivityType.SYSTEM_ACTION,
        "Changed password", request=request
    )
    
    return {"message": "Password changed successfully"}

@router.get("/roles")
async def get_admin_roles(admin: dict = Depends(get_current_admin)):
    """Get available admin roles"""
    
    current_admin_role = AdminRole(admin["role"])
    
    # Degraded mode: return available roles based on static permissions only
    if not getattr(database, "connected", True):
        available_roles = []
        for role in AdminRole:
            if can_manage_role(current_admin_role, role) or role == current_admin_role:
                permissions = [perm.value for perm in get_admin_permissions(role)]
                available_roles.append({
                    "role": role.value,
                    "name": role.value.replace("_", " ").title(),
                    "permissions": permissions,
                    "can_assign": can_manage_role(current_admin_role, role)
                })
        return {"roles": available_roles, "degraded_mode": True}
    
    available_roles = []
    for role in AdminRole:
        if can_manage_role(current_admin_role, role) or role == current_admin_role:
            permissions = [perm.value for perm in get_admin_permissions(role)]
            available_roles.append({
                "role": role.value,
                "name": role.value.replace("_", " ").title(),
                "permissions": permissions,
                "can_assign": can_manage_role(current_admin_role, role)
            })
    
    return {"roles": available_roles}

@router.get("/activity")
async def get_admin_activity(
    skip: int = 0,
    limit: int = 50,
    admin_id: Optional[str] = None,
    activity_type: Optional[AdminActivityType] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_ADMINS))
):
    """Get admin activity logs"""
    
    # Degraded mode: no DB access, return empty activity list
    if not getattr(database, "connected", True):
        return {
            "activities": [],
            "pagination": {"skip": skip, "limit": limit, "total": 0},
            "degraded_mode": True
        }
    
    activities = await database.get_admin_activities(
        skip=skip, limit=limit, admin_id=admin_id, activity_type=activity_type
    )
    total_count = await database.get_admin_activities_count(admin_id=admin_id, activity_type=activity_type)
    
    return {
        "activities": activities,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_count
        }
    }

@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(require_permission(AdminPermission.VIEW_SYSTEM_STATS))):
    """Get admin statistics"""
    
    # Degraded mode: return minimal stats without DB
    if not getattr(database, "connected", True):
        return {
            "admin_stats": {
                "total_admins": 0,
                "active_admins": 0,
                "recent_activities": 0,
                "total_logins": admin.get("login_count", 0)
            },
            "current_admin": {
                "username": admin["username"],
                "role": admin["role"],
                "login_count": admin.get("login_count", 0),
                "last_login": admin.get("last_login")
            },
            "degraded_mode": True
        }
    
    stats = await database.get_admin_stats()
    
    return {
        "admin_stats": stats,
        "current_admin": {
            "username": admin["username"],
            "role": admin["role"],
            "login_count": admin.get("login_count", 0),
            "last_login": admin.get("last_login")
        }
    }
from fastapi import Form, HTTPException
from ..utils.cache import get_cache

@router.put("/trades/update")
async def update_trade_proxy(
    old_name: str = Form(...),
    new_name: str = Form(...),
    group: str = Form(""),
    description: str = Form("")
):
    if not new_name.strip():
        raise HTTPException(status_code=400, detail="Trade name is required")
    success = await database.update_trade(old_name.strip(), new_name.strip(), group, description)
    if not success:
        raise HTTPException(status_code=404, detail="Trade category not found")
    
    # Invalidate stats caches
    try:
        cache = get_cache()
        await cache.delete("stats:categories")
        await cache.delete("stats:platform")
    except Exception as e:
        print(f"Error invalidating cache: {e}")

    return {"message": "Trade category updated successfully", "old_name": old_name, "new_name": new_name}
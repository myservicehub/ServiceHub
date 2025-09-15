from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Admin Role Enums
class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"           # Full access to everything
    FINANCE_ADMIN = "finance_admin"       # Wallet funding, payments, financial reports
    CONTENT_ADMIN = "content_admin"       # Jobs, policies, content management
    USER_ADMIN = "user_admin"             # User management, verifications
    SUPPORT_ADMIN = "support_admin"       # Customer support, notifications
    READ_ONLY_ADMIN = "read_only_admin"   # View-only access for reporting

class AdminStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

# Admin Permissions
class AdminPermission(str, Enum):
    # Financial permissions
    VIEW_FINANCIAL_DATA = "view_financial_data"
    MANAGE_WALLET_FUNDING = "manage_wallet_funding"
    MANAGE_ACCESS_FEES = "manage_access_fees"
    VIEW_PAYMENT_PROOFS = "view_payment_proofs"
    
    # Job management permissions
    MANAGE_JOBS = "manage_jobs"
    APPROVE_JOBS = "approve_jobs"
    DELETE_JOBS = "delete_jobs"
    EDIT_JOB_FEES = "edit_job_fees"
    
    # User management permissions
    VIEW_USERS = "view_users"
    MANAGE_USERS = "manage_users"
    DELETE_USERS = "delete_users"
    VERIFY_USERS = "verify_users"
    
    # Content management permissions
    MANAGE_POLICIES = "manage_policies"
    MANAGE_CONTACTS = "manage_contacts"
    MANAGE_LOCATIONS = "manage_locations"
    MANAGE_TRADES = "manage_trades"
    
    # System administration
    MANAGE_ADMINS = "manage_admins"
    VIEW_SYSTEM_STATS = "view_system_stats"
    MANAGE_NOTIFICATIONS = "manage_notifications"
    SEND_NOTIFICATIONS = "send_notifications"
    
    # Support permissions
    VIEW_SUPPORT_TICKETS = "view_support_tickets"
    MANAGE_SUPPORT_TICKETS = "manage_support_tickets"

# Role-based permission mapping
ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: [perm for perm in AdminPermission],  # All permissions
    
    AdminRole.FINANCE_ADMIN: [
        AdminPermission.VIEW_FINANCIAL_DATA,
        AdminPermission.MANAGE_WALLET_FUNDING,
        AdminPermission.MANAGE_ACCESS_FEES,
        AdminPermission.VIEW_PAYMENT_PROOFS,
        AdminPermission.EDIT_JOB_FEES,
        AdminPermission.VIEW_SYSTEM_STATS,
    ],
    
    AdminRole.CONTENT_ADMIN: [
        AdminPermission.MANAGE_JOBS,
        AdminPermission.APPROVE_JOBS,
        AdminPermission.MANAGE_POLICIES,
        AdminPermission.MANAGE_CONTACTS,
        AdminPermission.MANAGE_LOCATIONS,
        AdminPermission.MANAGE_TRADES,
        AdminPermission.VIEW_SYSTEM_STATS,
    ],
    
    AdminRole.USER_ADMIN: [
        AdminPermission.VIEW_USERS,
        AdminPermission.MANAGE_USERS,
        AdminPermission.VERIFY_USERS,
        AdminPermission.VIEW_SYSTEM_STATS,
    ],
    
    AdminRole.SUPPORT_ADMIN: [
        AdminPermission.VIEW_USERS,
        AdminPermission.MANAGE_NOTIFICATIONS,
        AdminPermission.SEND_NOTIFICATIONS,
        AdminPermission.VIEW_SUPPORT_TICKETS,
        AdminPermission.MANAGE_SUPPORT_TICKETS,
        AdminPermission.VIEW_SYSTEM_STATS,
    ],
    
    AdminRole.READ_ONLY_ADMIN: [
        AdminPermission.VIEW_FINANCIAL_DATA,
        AdminPermission.VIEW_USERS,
        AdminPermission.VIEW_SYSTEM_STATS,
        AdminPermission.VIEW_SUPPORT_TICKETS,
    ]
}

# Admin Models
class Admin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: AdminRole
    status: AdminStatus = AdminStatus.ACTIVE
    permissions: List[AdminPermission] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None  # Admin ID who created this admin
    last_login: Optional[datetime] = None
    login_count: int = 0
    
    # Security
    password_hash: str
    must_change_password: bool = True
    password_expires_at: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    
    # Additional info
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None  # Internal notes about this admin
    
    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        # Convert datetime objects to ISO strings for JSON serialization
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: AdminRole
    phone: Optional[str] = None
    notes: Optional[str] = None
    # Password will be auto-generated and sent via email

class AdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[AdminRole] = None
    status: Optional[AdminStatus] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: Dict[str, Any]
    permissions: List[str]

class AdminPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

class AdminPasswordReset(BaseModel):
    admin_id: str
    new_password: str = Field(..., min_length=8)

# Admin Activity Logging
class AdminActivityType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE_ADMIN = "create_admin"
    UPDATE_ADMIN = "update_admin"
    DELETE_ADMIN = "delete_admin"
    APPROVE_JOB = "approve_job"
    REJECT_JOB = "reject_job"
    UPDATE_ACCESS_FEE = "update_access_fee"
    CONFIRM_PAYMENT = "confirm_payment"
    REJECT_PAYMENT = "reject_payment"
    DELETE_USER = "delete_user"
    SEND_NOTIFICATION = "send_notification"
    UPDATE_POLICY = "update_policy"
    SYSTEM_ACTION = "system_action"

class AdminActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_username: str
    activity_type: AdminActivityType
    description: str
    target_id: Optional[str] = None  # ID of affected entity (user, job, etc.)
    target_type: Optional[str] = None  # Type of affected entity
    metadata: Optional[Dict[str, Any]] = None  # Additional activity data
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions for role management
def get_admin_permissions(role: AdminRole) -> List[AdminPermission]:
    """Get all permissions for a given admin role"""
    return ROLE_PERMISSIONS.get(role, [])

def has_permission(admin_role: AdminRole, permission: AdminPermission) -> bool:
    """Check if an admin role has a specific permission"""
    return permission in ROLE_PERMISSIONS.get(admin_role, [])

def can_manage_role(admin_role: AdminRole, target_role: AdminRole) -> bool:
    """Check if an admin can manage another admin of target role"""
    if admin_role == AdminRole.SUPER_ADMIN:
        return True
    
    # Define role hierarchy (higher roles can manage lower roles)
    role_hierarchy = {
        AdminRole.SUPER_ADMIN: 5,
        AdminRole.FINANCE_ADMIN: 4,
        AdminRole.CONTENT_ADMIN: 3,
        AdminRole.USER_ADMIN: 2,
        AdminRole.SUPPORT_ADMIN: 2,
        AdminRole.READ_ONLY_ADMIN: 1
    }
    
    return role_hierarchy.get(admin_role, 0) > role_hierarchy.get(target_role, 0)

# Default super admin for initial setup
DEFAULT_SUPER_ADMIN = {
    "username": "superadmin",
    "email": "admin@servicehub.co",
    "full_name": "Super Administrator",
    "role": AdminRole.SUPER_ADMIN,
    "status": AdminStatus.ACTIVE,
    "must_change_password": True,
    "notes": "Default super administrator account - created during system initialization"
}
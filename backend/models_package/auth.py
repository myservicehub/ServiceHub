from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
import uuid
from enum import Enum

class UserRole(str, Enum):
    HOMEOWNER = "homeowner"
    TRADESPERSON = "tradesperson"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

# Registration Models
class UserRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    role: UserRole
    location: Optional[str] = None
    postcode: Optional[str] = None

class TradespersonRegistration(UserRegistration):
    role: UserRole = UserRole.TRADESPERSON
    trade_categories: list[str] = []
    experience_years: int = Field(..., ge=0, le=50)
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: list[str] = []

class HomeownerRegistration(UserRegistration):
    role: UserRole = UserRole.HOMEOWNER

# Login Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    expires_in: int = 3600  # 1 hour

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    status: UserStatus = UserStatus.PENDING_VERIFICATION
    location: Optional[str] = None
    postcode: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Tradesperson specific fields
    trade_categories: Optional[list[str]] = None
    experience_years: Optional[int] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[list[str]] = None
    average_rating: Optional[float] = 0.0
    total_reviews: Optional[int] = 0
    total_jobs: Optional[int] = 0
    verified_tradesperson: Optional[bool] = False

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        # Convert datetime objects to ISO strings for JSON serialization
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

class UserProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    status: UserStatus
    location: Optional[str] = None
    postcode: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool
    phone_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    # Tradesperson specific fields (only shown if role is tradesperson)
    trade_categories: Optional[list[str]] = None
    experience_years: Optional[int] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[list[str]] = None
    average_rating: Optional[float] = None
    total_reviews: Optional[int] = None
    total_jobs: Optional[int] = None
    verified_tradesperson: Optional[bool] = None

# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

# Profile Update Models
class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    location: Optional[str] = None
    postcode: Optional[str] = None

class TradespersonProfileUpdate(UserProfileUpdate):
    trade_categories: Optional[list[str]] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[list[str]] = None

# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
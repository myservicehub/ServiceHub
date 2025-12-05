from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    HOMEOWNER = "homeowner"
    TRADESPERSON = "tradesperson"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    PENDING_VERIFICATION = "pending_verification"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"

# Base User Model
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Short, shareable public ID for display (e.g., 7–10 chars)
    public_id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    location: str
    postcode: str
    email_verified: bool = False
    phone_verified: bool = False
    identity_verified: bool = False
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Tradesperson specific fields (nullable for homeowners)
    trade_categories: Optional[List[str]] = None
    experience_years: Optional[int] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[List[str]] = None
    average_rating: Optional[float] = 0.0
    total_reviews: Optional[int] = 0
    total_jobs: Optional[int] = 0
    verified_tradesperson: Optional[bool] = False
    
    # Referral and Verification fields
    referral_code: Optional[str] = None          # User's unique referral code
    referred_by: Optional[str] = None            # ID of user who referred this user
    is_verified: bool = False                    # Document verification status
    verification_submitted: bool = False         # Has user submitted verification documents
    total_referrals: Optional[int] = 0          # Number of successful referrals made
    referral_coins_earned: Optional[int] = 0    # Total coins earned from referrals
    
    # Location fields
    latitude: Optional[float] = None           # Home base latitude for tradespeople
    longitude: Optional[float] = None          # Home base longitude for tradespeople
    travel_distance_km: Optional[int] = 25     # Maximum travel distance in kilometers (default 25km)
    business_type: Optional[str] = None

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        # Convert datetime objects to ISO strings for JSON serialization
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

# Registration Models
class HomeownerRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str
    password: str = Field(..., min_length=8)
    location: str
    postcode: str
    referral_code: Optional[str] = None  # Optional referral code

class TradespersonRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str
    password: str = Field(..., min_length=8)
    location: str
    postcode: str
    trade_categories: List[str]
    experience_years: int = Field(..., ge=0, le=50)
    company_name: Optional[str] = None
    description: str = Field(..., min_length=50, max_length=1000)
    certifications: List[str] = []
    referral_code: Optional[str] = None  # Optional referral code
    business_type: Optional[str] = None

# Login Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: dict

# Profile Models
class UserProfile(BaseModel):
    id: str
    public_id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    status: UserStatus
    location: str
    postcode: str
    email_verified: bool
    phone_verified: bool
    identity_verified: bool = False
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    # Tradesperson specific fields
    trade_categories: Optional[List[str]] = None
    experience_years: Optional[int] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[List[str]] = None
    average_rating: Optional[float] = None
    total_reviews: Optional[int] = None
    total_jobs: Optional[int] = None
    verified_tradesperson: Optional[bool] = None
    business_type: Optional[str] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    postcode: Optional[str] = None

class TradespersonProfileUpdate(UserProfileUpdate):
    trade_categories: Optional[List[str]] = None
    experience_years: Optional[int] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    certifications: Optional[List[str]] = None

# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

# Refresh Token Models
class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

# Phone Verification Models
class SendPhoneOTPRequest(BaseModel):
    # If omitted, server uses the user's current phone on record
    phone: Optional[str] = None

class VerifyPhoneOTPRequest(BaseModel):
    otp_code: str = Field(..., min_length=4, max_length=8)
    # Optional override; typically verify against user's stored phone
    phone: Optional[str] = None

# Email Verification Models
class SendEmailOTPRequest(BaseModel):
    # If omitted, server uses the user's current email on record
    email: Optional[EmailStr] = None

class VerifyEmailOTPRequest(BaseModel):
    otp_code: str = Field(..., min_length=4, max_length=8)
    # Optional override; typically verify against user's stored email
    email: Optional[EmailStr] = None
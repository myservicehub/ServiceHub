from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid
from enum import Enum

# Enums
class JobStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    REJECTED = "rejected"

class QuoteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class PortfolioItemCategory(str, Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    CARPENTRY = "carpentry"
    PAINTING = "painting"
    TILING = "tiling"
    ROOFING = "roofing"
    HEATING_GAS = "heating_gas"
    KITCHEN_FITTING = "kitchen_fitting"
    BATHROOM_FITTING = "bathroom_fitting"
    GARDEN_LANDSCAPING = "garden_landscaping"
    FLOORING = "flooring"
    PLASTERING = "plastering"
    OTHER = "other"

# Base Models
class Homeowner(BaseModel):
    name: str
    email: EmailStr
    phone: str

class Location(BaseModel):
    address: str
    postcode: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# Job Models
class JobCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50, max_length=2000)
    category: str
    
    # Enhanced location fields
    state: str  # Nigerian state
    lga: str    # Local Government Area
    town: str   # Town/area name
    zip_code: str = Field(..., min_length=6, max_length=6)  # Nigerian 6-digit postal code
    home_address: str = Field(..., min_length=10, max_length=500)  # Full home address
    
    # Legacy fields (keep for compatibility)
    location: Optional[str] = None  # Will be auto-populated from state
    postcode: Optional[str] = None  # Will be auto-populated from zip_code
    
    budget_min: Optional[int] = Field(None, ge=0)
    budget_max: Optional[int] = Field(None, ge=0)
    timeline: str
    homeowner_name: str
    homeowner_email: EmailStr
    homeowner_phone: str

class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50, max_length=2000)
    category: Optional[str] = None
    
    # Enhanced location fields
    state: Optional[str] = None  # Nigerian state
    lga: Optional[str] = None    # Local Government Area
    town: Optional[str] = None   # Town/area name
    zip_code: Optional[str] = Field(None, min_length=6, max_length=6)  # Nigerian 6-digit postal code
    home_address: Optional[str] = Field(None, min_length=10, max_length=500)  # Full home address
    
    budget_min: Optional[int] = Field(None, ge=0)
    budget_max: Optional[int] = Field(None, ge=0)
    timeline: Optional[str] = None
    
    # Access fee fields
    access_fee_naira: Optional[int] = Field(None, ge=100, le=10000)  # ₦100 to ₦10,000
    access_fee_coins: Optional[int] = Field(None, ge=1, le=100)     # 1 to 100 coins

class JobCloseRequest(BaseModel):
    reason: str = Field(..., description="Reason for closing the job")
    additional_feedback: Optional[str] = Field(None, max_length=500, description="Additional feedback (optional)")


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    
    # Enhanced location fields (optional for backward compatibility)
    state: Optional[str] = None  # Nigerian state
    lga: Optional[str] = None    # Local Government Area  
    town: Optional[str] = None   # Town/area name
    zip_code: Optional[str] = None  # Nigerian 6-digit postal code
    home_address: Optional[str] = None  # Full home address
    
    # Legacy fields (keep for compatibility)
    location: str  # Auto-populated from state
    postcode: str  # Auto-populated from zip_code
    
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    timeline: str
    homeowner: Homeowner
    status: JobStatus = JobStatus.PENDING_APPROVAL  # Default to pending approval
    quotes_count: int = 0
    interests_count: int = 0  # Add interests count field
    
    # Access fee fields (now part of every job)
    access_fee_naira: Optional[int] = 1000  # Default ₦1000 (flexible)
    access_fee_coins: Optional[int] = 10    # Default 10 coins
    
    # Location fields
    latitude: Optional[float] = None           # Job location latitude
    longitude: Optional[float] = None          # Job location longitude
    
    # Approval fields
    approved_by: Optional[str] = None          # Admin who approved/rejected
    approved_at: Optional[datetime] = None     # When approved/rejected
    approval_notes: Optional[str] = None       # Admin notes for approval/rejection
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        # Convert datetime objects to ISO strings for JSON serialization
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

# Tradesperson Models
class TradespersonCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str
    trade_categories: List[str]
    location: str
    postcode: str
    experience_years: int = Field(..., ge=0, le=50)
    company_name: Optional[str] = None
    description: str = Field(..., min_length=50, max_length=1000)
    certifications: List[str] = []

class Tradesperson(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    trade_categories: List[str]
    location: str
    postcode: str
    experience_years: int
    company_name: Optional[str] = None
    description: str
    certifications: List[str] = []
    profile_image: Optional[str] = None
    average_rating: float = 0.0
    total_reviews: int = 0
    total_jobs: int = 0
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

# Quote Models
class QuoteCreate(BaseModel):
    job_id: str
    tradesperson_id: Optional[str] = None  # Will be set by backend from auth
    price: int = Field(..., ge=0)
    message: str = Field(..., min_length=20, max_length=1000)
    estimated_duration: str
    start_date: datetime

class Quote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    tradesperson_id: str
    price: int
    message: str
    estimated_duration: str
    start_date: datetime
    status: QuoteStatus = QuoteStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

# Review Models
class ReviewCreate(BaseModel):
    job_id: str
    tradesperson_id: str
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=5, max_length=100)
    comment: str = Field(..., min_length=10, max_length=1000)
    homeowner_name: str

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    tradesperson_id: str
    rating: int
    title: str
    comment: str
    homeowner_name: str
    location: str
    featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

# Response Models
class JobsResponse(BaseModel):
    jobs: List[Job]
    pagination: dict

class TradespeopleResponse(BaseModel):
    tradespeople: List[Tradesperson]
    total: int

class QuotesResponse(BaseModel):
    quotes: List[Quote]
    job: Job

class ReviewsResponse(BaseModel):
    reviews: List[Review]
    pagination: dict

class StatsResponse(BaseModel):
    total_tradespeople: int
    total_categories: int
    total_reviews: int
    average_rating: float
    total_jobs: int
    active_jobs: int

# Category Model
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    icon: str
    color: str
    tradesperson_count: int = 0
    avg_price_range: str = ""

# Portfolio Models
class PortfolioItemCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: PortfolioItemCategory
    image_url: str
    image_filename: str

class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tradesperson_id: str
    title: str
    description: Optional[str] = None
    category: PortfolioItemCategory
    image_url: str
    image_filename: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = True

class PortfolioResponse(BaseModel):
    items: List[PortfolioItem]
    total: int

# Interest Models (Lead Generation System)
class InterestStatus(str, Enum):
    INTERESTED = "interested"
    CONTACT_SHARED = "contact_shared"
    PAID_ACCESS = "paid_access"
    CANCELLED = "cancelled"

class InterestCreate(BaseModel):
    job_id: str

class Interest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    tradesperson_id: str
    status: InterestStatus = InterestStatus.INTERESTED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    contact_shared_at: Optional[datetime] = None
    payment_made_at: Optional[datetime] = None
    access_fee: Optional[float] = None

class InterestedTradesperson(BaseModel):
    interest_id: str
    tradesperson_id: str
    tradesperson_name: str
    tradesperson_email: str
    tradesperson_phone: Optional[str] = None
    company_name: Optional[str] = None
    business_name: Optional[str] = None
    trade_categories: List[str] = []
    experience_years: int
    average_rating: float = 4.5
    total_reviews: int = 0
    location: Optional[str] = None
    description: Optional[str] = None
    certifications: List[str] = []
    portfolio_count: Optional[int] = 0
    status: InterestStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    contact_shared_at: Optional[datetime] = None
    payment_made_at: Optional[datetime] = None
    access_fee: Optional[float] = None

class InterestResponse(BaseModel):
    interested_tradespeople: List[InterestedTradesperson]
    total: int

class ShareContactResponse(BaseModel):
    interest_id: str
    status: InterestStatus
    message: str
    contact_shared_at: Optional[datetime] = None

class ContactDetails(BaseModel):
    homeowner_name: str
    homeowner_email: str
    homeowner_phone: str
    job_title: str
    job_description: str
    job_location: str
    budget_range: Optional[str] = None

# Wallet System Models
class TransactionType(str, Enum):
    WALLET_FUNDING = "wallet_funding"
    ACCESS_FEE_DEDUCTION = "access_fee_deduction"
    REFERRAL_REWARD = "referral_reward"
    REFUND = "refund"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"

class Wallet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    balance_coins: int = 0  # Balance in coins (1 coin = ₦100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WalletTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_id: str
    user_id: str
    transaction_type: TransactionType
    amount_coins: int  # Amount in coins
    amount_naira: int  # Amount in naira (for display)
    status: TransactionStatus = TransactionStatus.PENDING
    description: str
    reference: Optional[str] = None  # Payment reference/proof
    proof_image: Optional[str] = None  # Payment proof screenshot
    admin_notes: Optional[str] = None
    processed_by: Optional[str] = None  # Admin who processed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

class WalletFundingRequest(BaseModel):
    amount_naira: int = Field(..., gt=0)  # Any positive amount
    proof_image: str  # Base64 or filename of payment proof

class WalletResponse(BaseModel):
    balance_coins: int
    balance_naira: int
    transactions: List[WalletTransaction] = []

# Job with Access Fee
class JobWithAccessFee(Job):
    access_fee_naira: int = 1500  # Default ₦1500
    access_fee_coins: int = 15   # Default 15 coins

class JobAccessFeeUpdate(BaseModel):
    access_fee_naira: int = Field(..., gt=0, le=10000)  # Must be positive, max ₦10,000

# Bank Details Model for Frontend
class BankDetails(BaseModel):
    bank_name: str = "Kuda Bank"
    account_name: str = "Francis Erayefa Samuel"
    account_number: str = "1100023164"

# Referral System Models
class ReferralStatus(str, Enum):
    PENDING = "pending"           # Referred user signed up but not verified
    VERIFIED = "verified"         # Referred user verified, coins awarded
    CANCELLED = "cancelled"       # Referral cancelled (user deleted account, etc.)

class DocumentType(str, Enum):
    NATIONAL_ID = "national_id"           # Nigerian National ID
    VOTERS_CARD = "voters_card"           # Permanent Voters Card (PVC)
    DRIVERS_LICENSE = "drivers_license"   # Nigerian Driver's License
    PASSPORT = "passport"                 # Nigerian International Passport
    BUSINESS_REGISTRATION = "business_registration"  # CAC Business Registration

class VerificationStatus(str, Enum):
    PENDING = "pending"           # Document uploaded, awaiting admin review
    VERIFIED = "verified"         # Document approved by admin
    REJECTED = "rejected"         # Document rejected by admin
    RESUBMITTED = "resubmitted"   # User resubmitted after rejection

class Referral(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_id: str              # User who made the referral
    referred_user_id: str         # User who was referred
    referral_code: str            # The referral code used
    status: ReferralStatus = ReferralStatus.PENDING
    coins_earned: int = 0         # Coins earned (5 when verified)
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserVerification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    document_type: DocumentType
    document_url: str             # Path to uploaded document image
    full_name: str                # Full name as shown on document
    document_number: Optional[str] = None  # ID number, license number, etc.
    status: VerificationStatus = VerificationStatus.PENDING
    admin_notes: Optional[str] = None
    verified_by: Optional[str] = None     # Admin who verified
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReferralCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    code: str                     # e.g., JOHN2024, MARY5678
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    uses_count: int = 0           # Track how many people used this code

# Request/Response Models
class DocumentUpload(BaseModel):
    document_type: DocumentType
    full_name: str
    document_number: Optional[str] = None

class ReferralStats(BaseModel):
    total_referrals: int
    pending_referrals: int
    verified_referrals: int
    total_coins_earned: int
    referral_code: str
    referral_link: str

class VerificationSubmission(BaseModel):
    message: str
    verification_id: str
    status: str

# Updated Wallet Response to include referral coins
class WalletResponseWithReferrals(BaseModel):
    balance_coins: int
    balance_naira: int
    referral_coins: int           # Coins earned from referrals
    referral_coins_naira: int     # Referral coins in naira
    can_withdraw_referrals: bool  # True if total coins >= 15
    transactions: List[WalletTransaction] = []

class WithdrawalRequest(BaseModel):
    amount_coins: int
    include_referral_coins: bool = False
    bank_details_confirmed: bool = True

# Policy Management Models
class PolicyType(str, Enum):
    PRIVACY_POLICY = "privacy_policy"
    TERMS_OF_SERVICE = "terms_of_service"
    REVIEWS_POLICY = "reviews_policy"
    COOKIE_POLICY = "cookie_policy"
    REFUND_POLICY = "refund_policy"

class PolicyStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ARCHIVED = "archived"

class PolicyCreate(BaseModel):
    policy_type: PolicyType
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=50)
    effective_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)

class PolicyUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    content: Optional[str] = Field(None, min_length=50)
    effective_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)
    status: Optional[PolicyStatus] = None

class Policy(BaseModel):
    id: str
    policy_type: PolicyType
    title: str
    content: str
    status: PolicyStatus
    version: int
    effective_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: str  # admin username
    notes: Optional[str] = None
    
class PolicyHistory(BaseModel):
    policy_id: str
    policy_type: PolicyType
    title: str
    content: str
    version: int
    effective_date: Optional[datetime] = None
    created_at: datetime
    created_by: str
    notes: Optional[str] = None
    archived_at: datetime
    archived_by: str

class PolicyResponse(BaseModel):
    policy: Policy
    has_history: bool
    total_versions: int

class PolicyListResponse(BaseModel):
    policies: List[Policy]
    total_count: int

# Job Approval Models
class JobApprovalRequest(BaseModel):
    action: str = Field(..., description="approve or reject")
    notes: Optional[str] = Field(None, max_length=500, description="Admin notes")

class JobApprovalResponse(BaseModel):
    job_id: str
    action: str
    approved_by: str
    approved_at: datetime
    notes: Optional[str] = None
    message: str

# Job Update Models
class JobUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=20, max_length=2000)
    category: Optional[str] = None
    state: Optional[str] = None
    lga: Optional[str] = None
    town: Optional[str] = None
    zip_code: Optional[str] = Field(None, regex=r'^\d{6}$')
    home_address: Optional[str] = Field(None, min_length=10, max_length=500)
    budget_min: Optional[int] = Field(None, ge=1000)
    budget_max: Optional[int] = Field(None, ge=1000)
    timeline: Optional[str] = None
    access_fee_naira: Optional[int] = Field(None, ge=500, le=10000, description="Access fee in Naira (500-10000)")
    access_fee_coins: Optional[int] = Field(None, ge=5, le=100, description="Access fee in coins (5-100)")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes for the edit")

class JobUpdateResponse(BaseModel):
    job_id: str
    updated_fields: List[str]
    message: str
    updated_by: str
    updated_at: datetime

# Contact Management Models
class ContactType(str, Enum):
    PHONE_SUPPORT = "phone_support"
    PHONE_BUSINESS = "phone_business"
    EMAIL_SUPPORT = "email_support"
    EMAIL_BUSINESS = "email_business"
    ADDRESS_OFFICE = "address_office"
    SOCIAL_FACEBOOK = "social_facebook"
    SOCIAL_INSTAGRAM = "social_instagram"
    SOCIAL_YOUTUBE = "social_youtube"
    SOCIAL_TWITTER = "social_twitter"
    WEBSITE_URL = "website_url"
    BUSINESS_HOURS = "business_hours"

class ContactCreate(BaseModel):
    contact_type: ContactType
    label: str = Field(..., min_length=2, max_length=100)
    value: str = Field(..., min_length=1, max_length=500)
    is_active: bool = True
    display_order: Optional[int] = 0
    notes: Optional[str] = Field(None, max_length=200)

class ContactUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=2, max_length=100)
    value: Optional[str] = Field(None, min_length=1, max_length=500)
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=200)

class Contact(BaseModel):
    id: str
    contact_type: ContactType
    label: str
    value: str
    is_active: bool
    display_order: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    updated_by: str  # admin username

class ContactResponse(BaseModel):
    contacts: List[Contact]
    total_count: int

class ContactsByType(BaseModel):
    contact_type: ContactType
    contacts: List[Contact]
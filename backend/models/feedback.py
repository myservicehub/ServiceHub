from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class FeedbackCategory(str, Enum):
    COMPLAINT = "Complaint"
    TECHNICAL_SUPPORT = "Technical Support"
    PAYMENT_BILLING = "Payment & Billing"
    ACCOUNT_ISSUES = "Account Issues"
    GENERAL_INQUIRY = "General Inquiry"
    FEEDBACK_SUGGESTIONS = "Feedback & Suggestions"
    PARTNERSHIP_OPPORTUNITIES = "Partnership Opportunities"
    ABANDONED_POSTINGS = "Abandoned Postings"
    NOT_HIRED = "Not Hired"
    JOB_CLOSED = "Job Closed"
    JOB_CLOSURE_NO_HIRE = "Job Closure (No Hire)"
    CANCELLED_POSTINGS = "Cancelled Postings"

class FeedbackStatus(str, Enum):
    NEW = "New"
    UNDER_REVIEW = "Under Review"
    ACKNOWLEDGED = "Acknowledged"
    ESCALATED = "Escalated"
    RESOLVED = "Resolved"
    CLOSED = "Closed"

class FeedbackPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"

class FeedbackSource(str, Enum):
    CONTACT_FORM = "contact_form"
    JOB_POSTING_EXIT = "job_posting_exit"
    JOB_CLOSURE_NO_HIRE = "job_closure_no_hire"
    WEBSITE = "website"
    APP = "app"

class FeedbackTimelineItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str  # e.g., "Status changed", "Note added", "Assigned"
    details: str
    performed_by: str  # Admin name or "System" or User name
    performed_by_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FeedbackUser(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    user_id: Optional[str] = None
    user_type: Optional[str] = "Guest"  # Homeowner, Tradesperson, Guest

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str = Field(default_factory=lambda: f"SH-FB-{str(uuid.uuid4())[:8].upper()}")
    category: FeedbackCategory
    subcategory: Optional[str] = None
    source: FeedbackSource
    status: FeedbackStatus = FeedbackStatus.NEW
    priority: FeedbackPriority = FeedbackPriority.MEDIUM
    
    # User Details
    user: FeedbackUser
    is_authenticated: bool = False
    
    # Content
    subject: Optional[str] = None
    message: str
    rating: Optional[int] = None  # 1-5
    
    # Related Entities
    job_id: Optional[str] = None
    tradesperson_id: Optional[str] = None
    
    # Assignment & Management
    assigned_to: Optional[str] = None  # Admin Name
    assigned_to_id: Optional[str] = None  # Admin ID
    is_flagged: bool = False
    
    # Internal Notes
    internal_notes: List[Dict[str, Any]] = []
    
    # Timeline
    timeline: List[FeedbackTimelineItem] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

class FeedbackCreate(BaseModel):
    category: FeedbackCategory
    source: FeedbackSource
    user: FeedbackUser
    subject: Optional[str] = None
    message: str
    rating: Optional[int] = None
    job_id: Optional[str] = None
    tradesperson_id: Optional[str] = None
    is_authenticated: bool = False

class FeedbackUpdate(BaseModel):
    status: Optional[FeedbackStatus] = None
    priority: Optional[FeedbackPriority] = None
    assigned_to: Optional[str] = None
    assigned_to_id: Optional[str] = None
    is_flagged: Optional[bool] = None
    internal_note: Optional[str] = None
    category: Optional[FeedbackCategory] = None
    subcategory: Optional[str] = None

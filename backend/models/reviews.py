from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class ReviewType(str, Enum):
    HOMEOWNER_TO_TRADESPERSON = "homeowner_to_tradesperson"
    TRADESPERSON_TO_HOMEOWNER = "tradesperson_to_homeowner"
    EXTERNAL_TO_TRADESPERSON = "external_to_tradesperson"

class ReviewSource(str, Enum):
    PLATFORM = "platform"
    EXTERNAL = "external"

class ReviewStatus(str, Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    MODERATED = "moderated"
    FLAGGED = "flagged"
    HIDDEN = "hidden"

class ReviewCategory(str, Enum):
    QUALITY = "quality"
    TIMELINESS = "timeliness" 
    COMMUNICATION = "communication"
    PROFESSIONALISM = "professionalism"
    VALUE_FOR_MONEY = "value_for_money"

class ReviewCreate(BaseModel):
    """Create a new review"""
    job_id: str = Field(..., description="ID of the completed job")
    reviewee_id: str = Field(..., description="ID of user being reviewed")
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1-5")
    title: str = Field(..., min_length=5, max_length=100, description="Review title")
    content: str = Field(..., min_length=10, max_length=1000, description="Detailed review content")
    category_ratings: Optional[Dict[ReviewCategory, int]] = Field(
        None, description="Detailed ratings by category"
    )
    photos: Optional[List[str]] = Field(default=[], description="Photo URLs for review")
    would_recommend: bool = Field(default=True, description="Would recommend this person")
    
    @validator('category_ratings')
    def validate_category_ratings(cls, v):
        if v:
            for category, rating in v.items():
                if not 1 <= rating <= 5:
                    raise ValueError(f"Category rating for {category} must be between 1 and 5")
        return v

class Review(BaseModel):
    """Complete review object"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: Optional[str] = Field(None, description="ID of the completed job (optional for external)")
    reviewer_id: Optional[str] = Field(None, description="ID of user writing review (optional for external)")
    reviewee_id: str = Field(..., description="ID of user being reviewed")
    reviewer_name: str = Field(..., description="Name of reviewer")
    reviewee_name: str = Field(..., description="Name of reviewee")
    review_type: ReviewType = Field(..., description="Type of review")
    source: ReviewSource = Field(default=ReviewSource.PLATFORM, description="Source of review")
    rating: int = Field(..., ge=1, le=5, description="Overall star rating")
    title: str = Field(..., description="Review title")
    content: str = Field(..., description="Review content")
    category_ratings: Optional[Dict[str, int]] = Field(default={}, description="Category-specific ratings")
    photos: List[str] = Field(default=[], description="Review photo URLs")
    would_recommend: bool = Field(default=True, description="Recommendation status")
    status: ReviewStatus = Field(default=ReviewStatus.PUBLISHED, description="Review status")
    helpful_count: int = Field(default=0, description="Number of helpful votes")
    response: Optional[str] = Field(None, description="Response from reviewee")
    response_date: Optional[datetime] = Field(None, description="Date of response")
    job_title: Optional[str] = Field(None, description="Title of the job")
    job_category: Optional[str] = Field(None, description="Category of the job")
    is_verified_external: bool = Field(default=False, description="Verified external review")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewResponse(BaseModel):
    """Response to a review"""
    review_id: str = Field(..., description="ID of review being responded to")
    response: str = Field(..., min_length=10, max_length=500, description="Response content")

class ReviewUpdate(BaseModel):
    """Update review content"""
    title: Optional[str] = Field(None, min_length=5, max_length=100)
    content: Optional[str] = Field(None, min_length=10, max_length=1000)
    category_ratings: Optional[Dict[ReviewCategory, int]] = None
    photos: Optional[List[str]] = None
    would_recommend: Optional[bool] = None

class ReviewSummary(BaseModel):
    """Review summary for user profiles"""
    total_reviews: int = Field(default=0)
    average_rating: float = Field(default=0.0)
    rating_distribution: Dict[str, int] = Field(default={
        "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
    })
    category_averages: Dict[str, float] = Field(default={})
    recent_reviews: List[Review] = Field(default=[])
    recommendation_percentage: float = Field(default=0.0)
    verified_reviews_count: int = Field(default=0)

class ReviewsListResponse(BaseModel):
    """Paginated reviews response"""
    reviews: List[Review] = Field(default=[])
    total: int = Field(default=0)
    page: int = Field(default=1)
    limit: int = Field(default=10)
    total_pages: int = Field(default=0)
    average_rating: float = Field(default=0.0)
    summary: Optional[ReviewSummary] = None

class ReviewRequest(BaseModel):
    """Review invitation/request"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str = Field(..., description="ID of completed job")
    requester_id: str = Field(..., description="ID of user requesting review")
    requested_from_id: str = Field(..., description="ID of user to write review")
    requester_name: str = Field(..., description="Name of requester")
    requested_from_name: str = Field(..., description="Name of requested reviewer")
    job_title: str = Field(..., description="Title of completed job")
    request_type: ReviewType = Field(..., description="Type of review requested")
    status: str = Field(default="pending", description="Request status")
    expires_at: datetime = Field(..., description="When request expires")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None, description="When review was completed")

class ReviewStats(BaseModel):
    """Platform review statistics"""
    total_reviews: int = Field(default=0)
    total_ratings: Dict[str, int] = Field(default={})
    average_platform_rating: float = Field(default=0.0)
    reviews_this_month: int = Field(default=0)
    top_rated_tradespeople: List[Dict[str, Any]] = Field(default=[])
    top_rated_categories: List[Dict[str, Any]] = Field(default=[])
    recent_reviews: List[Review] = Field(default=[])

class ReviewModerationAction(BaseModel):
    """Review moderation action"""
    review_id: str = Field(..., description="ID of review to moderate")
    action: ReviewStatus = Field(..., description="Moderation action")
    reason: Optional[str] = Field(None, description="Reason for moderation")
    moderator_notes: Optional[str] = Field(None, description="Internal moderator notes")

class ReviewHelpful(BaseModel):
    """Mark review as helpful"""
    review_id: str = Field(..., description="ID of review")
    user_id: str = Field(..., description="ID of user marking helpful")
    is_helpful: bool = Field(..., description="Whether marked as helpful")

# Nigerian market specific enhancements
class NigerianReviewEnhancements(BaseModel):
    """Nigerian-specific review features"""
    local_language_content: Optional[Dict[str, str]] = Field(
        None, description="Review content in local languages (yoruba, igbo, hausa)"
    )
    regional_rating: Optional[float] = Field(None, description="Rating within local region")
    community_verified: bool = Field(default=False, description="Verified by local community")
    whatsapp_verified: bool = Field(default=False, description="Verified via WhatsApp")
    location_specific_rating: Optional[str] = Field(None, description="Rating for specific Nigerian location")

class ReviewInvitation(BaseModel):
    """Review invitation system"""
    job_id: str = Field(..., description="Completed job ID")
    homeowner_id: str = Field(..., description="Homeowner user ID")
    tradesperson_id: str = Field(..., description="Tradesperson user ID")
    job_title: str = Field(..., description="Job title")
    completion_date: datetime = Field(..., description="Job completion date")
    invitation_sent_at: datetime = Field(default_factory=datetime.utcnow)
    homeowner_reviewed: bool = Field(default=False)
    tradesperson_reviewed: bool = Field(default=False)
    expires_at: datetime = Field(..., description="When invitation expires")
    reminder_sent: bool = Field(default=False)

# -----------------------------
# Advanced search model additions
# -----------------------------
class ReviewFilters(BaseModel):
    """Filters for advanced review search"""
    review_type: Optional[ReviewType] = Field(None, description="Type of review")
    status: Optional[ReviewStatus] = Field(None, description="Status of review")
    min_rating: Optional[int] = Field(None, ge=1, le=5, description="Minimum rating")
    max_rating: Optional[int] = Field(None, ge=1, le=5, description="Maximum rating")
    category: Optional[ReviewCategory] = Field(None, description="Category filter")
    reviewer_id: Optional[str] = Field(None, description="Filter by reviewer ID")
    reviewee_id: Optional[str] = Field(None, description="Filter by reviewee ID")
    would_recommend: Optional[bool] = Field(None, description="Would recommend flag")
    has_photos: Optional[bool] = Field(None, description="Whether review has photos")
    created_after: Optional[datetime] = Field(None, description="Created after date")
    created_before: Optional[datetime] = Field(None, description="Created before date")
    search_query: Optional[str] = Field(None, description="Free-text search query")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="Sort order: asc or desc")

class AdvancedReviewSearchRequest(BaseModel):
    """Advanced review search request with filters and pagination"""
    filters: Optional[ReviewFilters] = Field(None, description="Filters to apply")
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=100, description="Items per page")

class AdvancedReviewSearchResponse(BaseModel):
    """Advanced review search response with results and metadata"""
    reviews: List[Review] = Field(default=[], description="List of reviews matching filters")
    total: int = Field(0, description="Total number of matching reviews")
    page: int = Field(1, description="Current page")
    limit: int = Field(10, description="Items per page")
    total_pages: int = Field(0, description="Total pages")

class ExternalReviewInvitation(BaseModel):
    """External review invitation system"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tradesperson_id: str = Field(..., description="Tradesperson user ID")
    client_name: str = Field(..., description="External client name")
    client_email: Optional[str] = Field(None, description="External client email")
    client_phone: Optional[str] = Field(None, description="External client phone")
    job_title: str = Field(..., description="Job title")
    job_description: Optional[str] = Field(None, description="Job description")
    token: str = Field(default_factory=lambda: uuid.uuid4().hex, description="Unique link token")
    status: str = Field(default="pending", description="pending, completed, expired")
    delivery_status: str = Field(default="pending", description="pending, sent, failed")
    invitation_sent_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(..., description="When invitation expires")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExternalReviewCreate(BaseModel):
    """Create a new external review from invitation"""
    token: str = Field(..., description="Invitation token")
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=5, max_length=100)
    content: str = Field(..., min_length=10, max_length=1000)
    photos: Optional[List[str]] = Field(default=[])
    would_recommend: bool = Field(default=True)
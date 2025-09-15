from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Content Type Enums
class ContentType(str, Enum):
    BANNER = "banner"
    ANNOUNCEMENT = "announcement"
    BLOG_POST = "blog_post"
    FAQ = "faq"
    HELP_ARTICLE = "help_article"
    LANDING_PAGE = "landing_page"
    EMAIL_TEMPLATE = "email_template"
    PUSH_NOTIFICATION = "push_notification"
    PROMOTION = "promotion"
    TESTIMONIAL = "testimonial"
    JOB_POSTING = "job_posting"

class ContentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    SCHEDULED = "scheduled"

class ContentCategory(str, Enum):
    MARKETING = "marketing"
    SUPPORT = "support"
    PRODUCT = "product"
    LEGAL = "legal"
    GENERAL = "general"
    TUTORIAL = "tutorial"
    NEWS = "news"
    CAREERS = "careers"

class ContentVisibility(str, Enum):
    PUBLIC = "public"
    REGISTERED_USERS = "registered_users"
    TRADESPEOPLE = "tradespeople"
    HOMEOWNERS = "homeowners"
    PREMIUM_USERS = "premium_users"

# Content Models
class ContentItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    content_type: ContentType
    status: ContentStatus = ContentStatus.DRAFT
    category: ContentCategory = ContentCategory.GENERAL
    visibility: ContentVisibility = ContentVisibility.PUBLIC
    
    # Content
    content: str = Field(..., min_length=1)  # Main content (HTML/Markdown)
    excerpt: Optional[str] = Field(None, max_length=500)  # Brief description
    meta_title: Optional[str] = Field(None, max_length=60)  # SEO title
    meta_description: Optional[str] = Field(None, max_length=160)  # SEO description
    keywords: List[str] = []  # SEO keywords
    
    # Media
    featured_image: Optional[str] = None  # Image URL
    gallery_images: List[str] = []  # Additional images
    video_url: Optional[str] = None  # Video URL
    
    # Scheduling & Targeting
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    target_audience: List[str] = []  # User segments
    
    # Organization
    tags: List[str] = []
    sort_order: int = 0
    is_featured: bool = False
    is_sticky: bool = False  # For announcements
    
    # Analytics & Engagement
    view_count: int = 0
    like_count: int = 0
    share_count: int = 0
    click_through_rate: float = 0.0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str  # Admin ID
    updated_by: Optional[str] = None  # Admin ID
    
    # Additional settings
    settings: Dict[str, Any] = {}  # Type-specific settings
    is_template: bool = False  # Can be used as template
    template_variables: List[str] = []  # Variables for templates
    
    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        # Convert datetime objects to ISO strings
        for key, value in d.items():
            if isinstance(value, datetime):
                d[key] = value.isoformat()
        return d

class ContentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: Optional[str] = None  # Auto-generated if not provided
    content_type: ContentType
    status: ContentStatus = ContentStatus.DRAFT
    category: ContentCategory = ContentCategory.GENERAL
    visibility: ContentVisibility = ContentVisibility.PUBLIC
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: List[str] = []
    featured_image: Optional[str] = None
    gallery_images: List[str] = []
    video_url: Optional[str] = None
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    target_audience: List[str] = []
    tags: List[str] = []
    sort_order: int = 0
    is_featured: bool = False
    is_sticky: bool = False
    settings: Dict[str, Any] = {}
    template_variables: List[str] = []

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    status: Optional[ContentStatus] = None
    category: Optional[ContentCategory] = None
    visibility: Optional[ContentVisibility] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = None
    featured_image: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    video_url: Optional[str] = None
    publish_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    target_audience: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    sort_order: Optional[int] = None
    is_featured: Optional[bool] = None
    is_sticky: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None
    template_variables: Optional[List[str]] = None

# Content Analytics Models
class ContentAnalytics(BaseModel):
    content_id: str
    date: datetime
    views: int = 0
    unique_views: int = 0
    likes: int = 0
    shares: int = 0
    comments: int = 0
    clicks: int = 0
    bounce_rate: float = 0.0
    avg_time_spent: float = 0.0  # in seconds
    traffic_sources: Dict[str, int] = {}
    user_demographics: Dict[str, Any] = {}

class ContentComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_id: str
    user_id: str
    user_name: str
    user_type: str  # homeowner, tradesperson
    comment: str = Field(..., min_length=1, max_length=1000)
    parent_comment_id: Optional[str] = None  # For replies
    is_approved: bool = False
    is_featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Media Management Models
class MediaFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_type: str  # image, video, document, audio
    mime_type: str
    file_size: int  # in bytes
    file_url: str
    thumbnail_url: Optional[str] = None
    alt_text: Optional[str] = None
    caption: Optional[str] = None
    tags: List[str] = []
    folder: str = "general"  # Organization folder
    uploaded_by: str  # Admin ID
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = True
    usage_count: int = 0  # How many times used in content

# Content Templates
class ContentTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    content_type: ContentType
    template_content: str  # HTML/Markdown template
    variables: List[str] = []  # {{variable_name}} placeholders
    default_values: Dict[str, str] = {}  # Default values for variables
    category: ContentCategory = ContentCategory.GENERAL
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Content Workflow Models
class ContentWorkflow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_id: str
    workflow_type: str  # approval, review, scheduling
    current_step: str
    status: str  # pending, approved, rejected, completed
    assigned_to: List[str] = []  # Admin IDs
    steps: List[Dict[str, Any]] = []
    comments: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    import re
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = slug.strip('-')
    return slug[:50]  # Limit length

def extract_template_variables(content: str) -> List[str]:
    """Extract {{variable}} placeholders from content"""
    import re
    variables = re.findall(r'\{\{(\w+)\}\}', content)
    return list(set(variables))

# Content validation helpers
def validate_content_settings(content_type: ContentType, settings: Dict[str, Any]) -> bool:
    """Validate type-specific settings"""
    required_settings = {
        ContentType.BANNER: ['position', 'display_duration'],
        ContentType.EMAIL_TEMPLATE: ['subject', 'sender_name'],
        ContentType.PUSH_NOTIFICATION: ['title', 'action_url'],
        ContentType.PROMOTION: ['discount_percentage', 'valid_until'],
    }
    
    if content_type in required_settings:
        required_fields = required_settings[content_type]
        return all(field in settings for field in required_fields)
    
    return True

# Content statistics model
class ContentStatistics(BaseModel):
    total_content: int = 0
    published_content: int = 0
    draft_content: int = 0
    scheduled_content: int = 0
    archived_content: int = 0
    content_by_type: Dict[str, int] = {}
    content_by_category: Dict[str, int] = {}
    top_performing: List[Dict[str, Any]] = []
    recent_activity: List[Dict[str, Any]] = []
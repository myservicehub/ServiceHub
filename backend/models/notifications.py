from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    NEW_INTEREST = "new_interest"
    CONTACT_SHARED = "contact_shared"
    JOB_POSTED = "job_posted"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    JOB_EXPIRING = "job_expiring"
    NEW_MATCHING_JOB = "new_matching_job"
    NEW_MESSAGE = "new_message"

class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    BOTH = "both"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"

class NotificationPreferences(BaseModel):
    """User notification preferences"""
    id: str = Field(..., description="Unique identifier")
    user_id: str = Field(..., description="User ID")
    new_interest: NotificationChannel = NotificationChannel.BOTH
    contact_shared: NotificationChannel = NotificationChannel.BOTH
    job_posted: NotificationChannel = NotificationChannel.EMAIL
    payment_confirmation: NotificationChannel = NotificationChannel.BOTH
    job_expiring: NotificationChannel = NotificationChannel.EMAIL
    new_matching_job: NotificationChannel = NotificationChannel.EMAIL
    new_message: NotificationChannel = NotificationChannel.BOTH
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationTemplate(BaseModel):
    """Notification template for different types and channels"""
    id: str = Field(..., description="Unique identifier")
    type: NotificationType = Field(..., description="Notification type")
    channel: NotificationChannel = Field(..., description="Notification channel")
    subject_template: str = Field(..., description="Subject template for email")
    content_template: str = Field(..., description="Content template")
    variables: List[str] = Field(default=[], description="Template variables")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Notification(BaseModel):
    """Individual notification record"""
    id: str = Field(..., description="Unique identifier")
    user_id: str = Field(..., description="Recipient user ID")
    type: NotificationType = Field(..., description="Notification type")
    channel: NotificationChannel = Field(..., description="Delivery channel")
    recipient_email: Optional[str] = Field(None, description="Email recipient")
    recipient_phone: Optional[str] = Field(None, description="Phone recipient")
    subject: str = Field(..., description="Notification subject")
    content: str = Field(..., description="Notification content")
    status: NotificationStatus = Field(default=NotificationStatus.PENDING)
    metadata: Dict[str, Any] = Field(default={}, description="Additional data")
    sent_at: Optional[datetime] = Field(None, description="When notification was sent")
    delivered_at: Optional[datetime] = Field(None, description="When notification was delivered")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationRequest(BaseModel):
    """Request to send a notification"""
    user_id: str = Field(..., description="Recipient user ID")
    type: NotificationType = Field(..., description="Notification type")
    template_data: Dict[str, Any] = Field(default={}, description="Template variables")
    override_channel: Optional[NotificationChannel] = Field(None, description="Override user preferences")

class NotificationResponse(BaseModel):
    """Response after sending notification"""
    notification_id: str = Field(..., description="Created notification ID")
    status: NotificationStatus = Field(..., description="Delivery status")
    message: str = Field(..., description="Status message")

class NotificationHistory(BaseModel):
    """Notification history for a user"""
    notifications: List[Notification] = Field(default=[], description="List of notifications")
    total: int = Field(..., description="Total notifications count")
    unread: int = Field(..., description="Unread notifications count")

# Request/Response models for API endpoints
class UpdatePreferencesRequest(BaseModel):
    new_interest: Optional[NotificationChannel] = None
    contact_shared: Optional[NotificationChannel] = None
    job_posted: Optional[NotificationChannel] = None
    payment_confirmation: Optional[NotificationChannel] = None
    job_expiring: Optional[NotificationChannel] = None
    new_matching_job: Optional[NotificationChannel] = None
    new_message: Optional[NotificationChannel] = None

class NotificationStatsResponse(BaseModel):
    """Notification statistics for admin/monitoring"""
    total_sent: int = Field(..., description="Total notifications sent")
    delivery_rate: float = Field(..., description="Delivery success rate")
    by_type: Dict[str, int] = Field(..., description="Count by notification type")
    by_channel: Dict[str, int] = Field(..., description="Count by delivery channel")
    recent_failures: List[Dict[str, Any]] = Field(default=[], description="Recent failed notifications")
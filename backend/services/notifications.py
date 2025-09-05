import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import json
from models.notifications import (
    NotificationType, NotificationChannel, NotificationStatus,
    Notification, NotificationTemplate, NotificationPreferences
)

# Configure logging for notifications
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notifications")

class MockEmailService:
    """Mock email service that logs instead of sending real emails"""
    
    def __init__(self):
        self.service_name = "MockEmailService"
        logger.info(f"🔧 {self.service_name} initialized - Development Mode (Logging Only)")
    
    async def send_email(self, to: str, subject: str, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Mock send email - logs the email instead of sending"""
        try:
            log_data = {
                "service": self.service_name,
                "to": to,
                "subject": subject,
                "content": content[:100] + "..." if len(content) > 100 else content,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"📧 EMAIL SENT: {json.dumps(log_data, indent=2)}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Email sending failed: {str(e)}")
            return False

class MockSMSService:
    """Mock SMS service that logs instead of sending real SMS"""
    
    def __init__(self):
        self.service_name = "MockSMSService"
        logger.info(f"🔧 {self.service_name} initialized - Development Mode (Logging Only)")
    
    async def send_sms(self, to: str, message: str, metadata: Dict[str, Any] = None) -> bool:
        """Mock send SMS - logs the SMS instead of sending"""
        try:
            # Format Nigerian phone number for display
            formatted_phone = self._format_nigerian_phone(to)
            
            log_data = {
                "service": self.service_name,
                "to": formatted_phone,
                "message": message,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"📱 SMS SENT: {json.dumps(log_data, indent=2)}")
            return True
            
        except Exception as e:
            logger.error(f"❌ SMS sending failed: {str(e)}")
            return False
    
    def _format_nigerian_phone(self, phone: str) -> str:
        """Format phone number for Nigerian market"""
        # Remove any spaces or special characters
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Handle different Nigerian phone formats
        if len(clean_phone) == 11 and clean_phone.startswith('0'):
            # Convert 0803... to +2340803...
            return f"+234{clean_phone[1:]}"
        elif len(clean_phone) == 10:
            # Convert 803... to +234803...
            return f"+234{clean_phone}"
        elif len(clean_phone) == 13 and clean_phone.startswith('234'):
            # Already has 234, add +
            return f"+{clean_phone}"
        else:
            # Return as is with + if not present
            return f"+{clean_phone}" if not phone.startswith('+') else phone

class NotificationTemplateService:
    """Service for managing notification templates"""
    
    def __init__(self):
        self.templates = self._initialize_templates()
        logger.info("🔧 NotificationTemplateService initialized with default templates")
    
    def _initialize_templates(self) -> Dict[str, Dict[str, NotificationTemplate]]:
        """Initialize default notification templates"""
        templates = {}
        
        # New Interest templates
        templates[NotificationType.NEW_INTEREST] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_INTEREST,
                channel=NotificationChannel.EMAIL,
                subject_template="New Interest in Your Job: {job_title}",
                content_template="""
Hello {homeowner_name},

Great news! A tradesperson has shown interest in your job:

📋 Job: {job_title}
📍 Location: {job_location}
👤 Interested Tradesperson: {tradesperson_name}
🔧 Experience: {tradesperson_experience} years
📧 Contact: {tradesperson_email}

You can review their profile and share your contact details if you're interested in connecting.

View interested tradespeople: {view_url}

Best regards,
serviceHub Team
                """,
                variables=["homeowner_name", "job_title", "job_location", "tradesperson_name", "tradesperson_experience", "tradesperson_email", "view_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_INTEREST,
                channel=NotificationChannel.SMS,
                subject_template="New Interest - serviceHub",
                content_template="Hi {homeowner_name}! {tradesperson_name} showed interest in your {job_title} job. View details: {view_url}",
                variables=["homeowner_name", "tradesperson_name", "job_title", "view_url"]
            )
        }
        
        # Contact Shared templates
        templates[NotificationType.CONTACT_SHARED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.CONTACT_SHARED,
                channel=NotificationChannel.EMAIL,
                subject_template="Contact Details Shared for: {job_title}",
                content_template="""
Hello {tradesperson_name},

Excellent news! The homeowner has shared their contact details for the job you showed interest in:

📋 Job: {job_title}
📍 Location: {job_location}

To access the homeowner's contact details, please pay the access fee of ₦1,000.

💰 Pay and get contact details: {payment_url}

This is your opportunity to connect directly with the homeowner and discuss the job details.

Best regards,
serviceHub Team
                """,
                variables=["tradesperson_name", "job_title", "job_location", "payment_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.CONTACT_SHARED,
                channel=NotificationChannel.SMS,
                subject_template="Contact Shared - serviceHub",
                content_template="Hi {tradesperson_name}! Homeowner shared contact details for {job_title}. Pay ₦1,000 to access: {payment_url}",
                variables=["tradesperson_name", "job_title", "payment_url"]
            )
        }
        
        # Job Posted templates
        templates[NotificationType.JOB_POSTED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_POSTED,
                channel=NotificationChannel.EMAIL,
                subject_template="Job Posted Successfully: {job_title}",
                content_template="""
Hello {homeowner_name},

Your job has been successfully posted on serviceHub!

📋 Job Title: {job_title}
📍 Location: {job_location}
💰 Budget: {job_budget}
📅 Posted: {post_date}

Your job is now live and visible to qualified tradespeople in your area. You'll receive notifications when tradespeople show interest.

Manage your job: {manage_url}

Best regards,
serviceHub Team
                """,
                variables=["homeowner_name", "job_title", "job_location", "job_budget", "post_date", "manage_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_POSTED,
                channel=NotificationChannel.SMS,
                subject_template="Job Posted - serviceHub",
                content_template="Hi {homeowner_name}! Your {job_title} job is now live on serviceHub. View: {manage_url}",
                variables=["homeowner_name", "job_title", "manage_url"]
            )
        }
        
        # Payment Confirmation templates
        templates[NotificationType.PAYMENT_CONFIRMATION] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.PAYMENT_CONFIRMATION,
                channel=NotificationChannel.EMAIL,
                subject_template="Payment Confirmed - Contact Details Available",
                content_template="""
Hello {tradesperson_name},

Your payment of ₦1,000 has been confirmed! Here are the homeowner's contact details:

📋 Job: {job_title}
📍 Location: {job_location}

👤 Homeowner: {homeowner_name}
📧 Email: {homeowner_email}
📱 Phone: {homeowner_phone}

You can now contact the homeowner directly to discuss the job details and arrange a meeting.

Best of luck with your project!

serviceHub Team
                """,
                variables=["tradesperson_name", "job_title", "job_location", "homeowner_name", "homeowner_email", "homeowner_phone"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.PAYMENT_CONFIRMATION,
                channel=NotificationChannel.SMS,
                subject_template="Payment Confirmed - serviceHub",
                content_template="Payment confirmed! {homeowner_name}: {homeowner_phone}, {homeowner_email} for {job_title}",
                variables=["homeowner_name", "homeowner_phone", "homeowner_email", "job_title"]
            )
        }
        
        return templates
    
    def get_template(self, notification_type: NotificationType, channel: NotificationChannel) -> Optional[NotificationTemplate]:
        """Get template for specific type and channel"""
        return self.templates.get(notification_type, {}).get(channel)
    
    def render_template(self, template: NotificationTemplate, data: Dict[str, Any]) -> tuple[str, str]:
        """Render template with provided data"""
        try:
            subject = template.subject_template.format(**data)
            content = template.content_template.format(**data)
            return subject, content
        except KeyError as e:
            logger.error(f"❌ Template rendering failed - missing variable: {e}")
            raise ValueError(f"Missing template variable: {e}")

class NotificationService:
    """Main notification service orchestrating email and SMS delivery"""
    
    def __init__(self):
        self.email_service = MockEmailService()
        self.sms_service = MockSMSService()
        self.template_service = NotificationTemplateService()
        logger.info("🔧 NotificationService initialized - Ready for mock notifications")
    
    async def send_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        template_data: Dict[str, Any],
        user_preferences: NotificationPreferences,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None
    ) -> Notification:
        """Send notification based on user preferences"""
        
        # Get user's preferred channel for this notification type
        channel = getattr(user_preferences, notification_type.value, NotificationChannel.EMAIL)
        
        # Create notification record
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=notification_type,
            channel=channel,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            subject="",  # Will be filled by template
            content="",  # Will be filled by template
            metadata=template_data
        )
        
        try:
            # Send based on channel preference
            if channel in [NotificationChannel.EMAIL, NotificationChannel.BOTH]:
                await self._send_email_notification(notification, template_data)
            
            if channel in [NotificationChannel.SMS, NotificationChannel.BOTH]:
                await self._send_sms_notification(notification, template_data)
            
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now(timezone.utc)
            
            logger.info(f"✅ Notification sent successfully: {notification.id}")
            
        except Exception as e:
            notification.status = NotificationStatus.FAILED
            logger.error(f"❌ Notification failed: {notification.id} - {str(e)}")
        
        return notification
    
    async def _send_email_notification(self, notification: Notification, template_data: Dict[str, Any]):
        """Send email notification"""
        if not notification.recipient_email:
            raise ValueError("No recipient email provided")
        
        template = self.template_service.get_template(notification.type, NotificationChannel.EMAIL)
        if not template:
            raise ValueError(f"No email template found for {notification.type}")
        
        subject, content = self.template_service.render_template(template, template_data)
        notification.subject = subject
        notification.content = content
        
        success = await self.email_service.send_email(
            to=notification.recipient_email,
            subject=subject,
            content=content,
            metadata={"notification_id": notification.id, "type": notification.type.value}
        )
        
        if not success:
            raise Exception("Email delivery failed")
    
    async def _send_sms_notification(self, notification: Notification, template_data: Dict[str, Any]):
        """Send SMS notification"""
        if not notification.recipient_phone:
            raise ValueError("No recipient phone provided")
        
        template = self.template_service.get_template(notification.type, NotificationChannel.SMS)
        if not template:
            raise ValueError(f"No SMS template found for {notification.type}")
        
        subject, content = self.template_service.render_template(template, template_data)
        notification.subject = subject
        notification.content = content
        
        success = await self.sms_service.send_sms(
            to=notification.recipient_phone,
            message=content,
            metadata={"notification_id": notification.id, "type": notification.type.value}
        )
        
        if not success:
            raise Exception("SMS delivery failed")

# Global notification service instance
notification_service = NotificationService()
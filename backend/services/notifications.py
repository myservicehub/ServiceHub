import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import json
import os
from models.notifications import (
    NotificationType, NotificationChannel, NotificationStatus,
    Notification, NotificationTemplate, NotificationPreferences
)

# Third-party imports for real services
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import requests

# Configure logging for notifications
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notifications")

class MockEmailService:
    """Mock email service for development/testing"""
    
    def __init__(self):
        self.service_name = "MockEmailService"
        logger.info(f"🔧 {self.service_name} initialized - Development Mode")
    
    async def send_email(self, to: str, subject: str, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Mock email sending - logs instead of sending"""
        logger.info(f"📧 MOCK EMAIL: to={to}, subject={subject[:50]}...")
        logger.debug(f"📧 MOCK EMAIL CONTENT: {content[:100]}...")
        return True

class MockSMSService:
    """Mock SMS service for development/testing"""
    
    def __init__(self):
        self.service_name = "MockSMSService"
        logger.info(f"🔧 {self.service_name} initialized - Development Mode")
    
    async def send_sms(self, to: str, message: str, metadata: Dict[str, Any] = None) -> bool:
        """Mock SMS sending - logs instead of sending"""
        logger.info(f"📱 MOCK SMS: to={to}, message={message[:50]}...")
        return True

class SendGridEmailService:
    """Real SendGrid email service for production use"""
    
    def __init__(self):
        self.service_name = "SendGridEmailService"
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        self.sender_email = os.environ.get('SENDER_EMAIL')
        
        if not self.api_key or not self.sender_email:
            logger.error("❌ SendGrid configuration missing: SENDGRID_API_KEY or SENDER_EMAIL")
            raise ValueError("Missing SendGrid configuration")
        
        self.client = SendGridAPIClient(api_key=self.api_key)
        logger.info(f"🔧 {self.service_name} initialized - Production Mode")
    
    async def send_email(self, to: str, subject: str, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Send real email using SendGrid"""
        try:
            message = Mail(
                from_email=self.sender_email,
                to_emails=to,
                subject=subject,
                html_content=content.replace('\n', '<br>')  # Convert to HTML
            )
            
            # Add metadata as custom args if provided
            if metadata:
                for key, value in metadata.items():
                    message.custom_arg = {key: str(value)}
            
            response = self.client.send(message)
            
            # SendGrid returns 202 for successful queuing
            if response.status_code in [200, 202]:
                logger.info(f"📧 EMAIL SENT: to={to}, subject={subject[:50]}...")
                return True
            else:
                logger.error(f"❌ SendGrid failed: {response.status_code} - {response.body}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Email sending failed: {str(e)}")
            return False

class TermiiSMSService:
    """Real Termii SMS service for Nigerian market"""
    
    def __init__(self):
        self.service_name = "TermiiSMSService"
        self.api_key = os.environ.get('TERMII_API_KEY')
        self.sender_id = os.environ.get('TERMII_SENDER_ID')
        self.base_url = os.environ.get('TERMII_BASE_URL', 'https://api.ng.termii.com')
        
        if not self.api_key or not self.sender_id:
            logger.error("❌ Termii configuration missing: TERMII_API_KEY or TERMII_SENDER_ID")
            raise ValueError("Missing Termii configuration")
            
        logger.info(f"🔧 {self.service_name} initialized - Production Mode")
    
    async def send_sms(self, to: str, message: str, metadata: Dict[str, Any] = None) -> bool:
        """Send real SMS using Termii API"""
        try:
            # Format Nigerian phone number
            formatted_phone = self._format_nigerian_phone(to)
            
            # Prepare API payload
            payload = {
                "to": formatted_phone,
                "from": self.sender_id,
                "sms": message,
                "type": "plain",
                "api_key": self.api_key,
                "channel": "generic"
            }
            
            # Send request to Termii API
            response = requests.post(
                f"{self.base_url}/api/sms/send",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('code') == 'ok':
                    logger.info(f"📱 SMS SENT: to={formatted_phone}, message_id={response_data.get('message_id')}")
                    return True
                else:
                    logger.error(f"❌ Termii API error: {response_data}")
                    return False
            else:
                logger.error(f"❌ Termii HTTP error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ SMS sending failed: {str(e)}")
            return False
    
    def _format_nigerian_phone(self, phone: str) -> str:
        """Format phone number for Nigerian market"""
        # Remove any spaces or special characters
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Handle different Nigerian phone formats
        if len(clean_phone) == 11 and clean_phone.startswith('0'):
            # Convert 0803... to 234803...
            return f"234{clean_phone[1:]}"
        elif len(clean_phone) == 10:
            # Convert 803... to 234803...
            return f"234{clean_phone}"
        elif len(clean_phone) == 13 and clean_phone.startswith('234'):
            # Already has 234, use as is
            return clean_phone
        else:
            # Return as is but log warning
            logger.warning(f"⚠️ Unusual phone format: {phone}")
            return clean_phone

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
        
        # New Message templates  
        templates[NotificationType.NEW_MESSAGE] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_MESSAGE,
                channel=NotificationChannel.EMAIL,
                subject_template="New Message: {job_title}",
                content_template="""
Hello {recipient_name},

You have received a new message regarding your job:

📋 Job: {job_title}
👤 From: {sender_name}
💬 Message: {message_preview}

To view the full conversation and reply, please visit your messages:
{conversation_url}

Keep the conversation going to finalize your project details!

Best regards,
serviceHub Team
                """,
                variables=["recipient_name", "sender_name", "job_title", "message_preview", "conversation_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_MESSAGE,
                channel=NotificationChannel.SMS,
                subject_template="New Message - serviceHub",
                content_template="💬 {sender_name}: {message_preview} Reply: {conversation_url}",
                variables=["sender_name", "message_preview", "conversation_url"]
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
        self.email_service = None
        self.sms_service = None
        self.template_service = NotificationTemplateService()
        logger.info("🔧 NotificationService initialized - Services will be loaded on first use")
    
    def _ensure_services_initialized(self):
        """Initialize email and SMS services if not already done"""
        if self.email_service is None:
            try:
                self.email_service = SendGridEmailService()
                logger.info("📧 SendGrid email service initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize SendGrid: {e}")
                # Fall back to mock for development
                self.email_service = MockEmailService()
        
        if self.sms_service is None:
            try:
                self.sms_service = TermiiSMSService()
                logger.info("📱 Termii SMS service initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Termii: {e}")
                # Fall back to mock for development
                self.sms_service = MockSMSService()
    
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
        
        # Ensure services are initialized
        self._ensure_services_initialized()
        
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
        
        # Ensure services are initialized
        self._ensure_services_initialized()
        
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
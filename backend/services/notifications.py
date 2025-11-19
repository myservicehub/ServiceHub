import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import json
import os
from ..models.notifications import (
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
                try:
                    # SendGrid expects a dict at custom_args
                    message.custom_args = {str(k): str(v) for k, v in metadata.items()}
                except Exception as e:
                    logger.warning(f"Failed to attach custom args to SendGrid mail: {e}")
            
            response = self.client.send(message)
            
            # SendGrid returns 202 for successful queuing
            if response.status_code in [200, 202]:
                logger.info(f"📧 EMAIL SENT: to={to}, subject={subject[:50]}...")
                return True
            else:
                error_body = ""
                try:
                    if hasattr(response, 'body') and response.body:
                        error_body = str(response.body)
                except:
                    pass
                logger.error(f"❌ SendGrid failed: HTTP {response.status_code} - {error_body}")
                if response.status_code == 401:
                    logger.error("❌ SendGrid 401 Unauthorized - Check your API key and sender email verification")
                    logger.error(f"   Sender email: {self.sender_email}")
                    logger.error("   Ensure: 1) API key is valid, 2) Sender email is verified in SendGrid, 3) API key has Mail Send permissions")
                return False
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Email sending failed: {error_msg}")
            if "401" in error_msg or "Unauthorized" in error_msg:
                logger.error("❌ SendGrid Authentication Error - Please verify:")
                logger.error(f"   1. SENDGRID_API_KEY is correct and has Mail Send permissions")
                logger.error(f"   2. SENDER_EMAIL ({self.sender_email}) is verified in SendGrid")
                logger.error(f"   3. API key hasn't been revoked or expired")
            # Avoid raising; allow caller to fallback to mock
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
        """Send real SMS using Termii API with deliverability fallback."""
        try:
            # Format Nigerian phone number
            formatted_phone = self._format_nigerian_phone(to)

            def _send_with_channel(channel: str) -> bool:
                payload = {
                    "to": formatted_phone,
                    "from": self.sender_id,
                    "sms": message,
                    "type": "plain",
                    "api_key": self.api_key,
                    "channel": channel,
                }
                resp = requests.post(
                    f"{self.base_url}/api/sms/send",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text}
                if resp.status_code == 200 and isinstance(data, dict) and data.get("code") == "ok":
                    logger.info(f"📱 SMS SENT: to={formatted_phone}, channel={channel}, message_id={data.get('message_id')}")
                    return True
                logger.error(f"❌ Termii send failed (channel={channel}): status={resp.status_code}, body={data}")
                return False

            # Try DND route first (better deliverability on DND-enabled numbers), then fallback to generic
            if _send_with_channel("dnd"):
                return True
            return _send_with_channel("generic")

        except Exception as e:
            logger.error(f"❌ SMS sending failed: {str(e)}")
            return False

    async def send_sms_with_result(self, to: str, message: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send SMS and return detailed provider result for diagnostics."""
        result: Dict[str, Any] = {"ok": False}
        try:
            formatted_phone = self._format_nigerian_phone(to)

            def _send_with_channel(channel: str) -> Dict[str, Any]:
                payload = {
                    "to": formatted_phone,
                    "from": self.sender_id,
                    "sms": message,
                    "type": "plain",
                    "api_key": self.api_key,
                    "channel": channel,
                }
                resp = requests.post(
                    f"{self.base_url}/api/sms/send",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text}
                ok = resp.status_code == 200 and isinstance(data, dict) and data.get("code") == "ok"
                return {"ok": ok, "status": resp.status_code, "channel": channel, "response": data}

            first = _send_with_channel("dnd")
            if first.get("ok"):
                logger.info(f"📱 SMS SENT: to={formatted_phone}, channel=dnd, message_id={first.get('response',{}).get('message_id')}")
                return first
            second = _send_with_channel("generic")
            if second.get("ok"):
                logger.info(f"📱 SMS SENT: to={formatted_phone}, channel=generic, message_id={second.get('response',{}).get('message_id')}")
                return second
            logger.error(f"❌ Termii send failed on both channels: first={first}, second={second}")
            return second if second else first
        except Exception as e:
            logger.error(f"❌ SMS sending failed: {str(e)}")
            result["error"] = str(e)
            return result
    
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
                content_template="💬 New message from {sender_name} about {job_title}: {message_preview} Reply at: {conversation_url}",
                variables=["sender_name", "job_title", "message_preview", "conversation_url"]
            )
        }
        
        # Job Approval templates
        templates[NotificationType.JOB_APPROVED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_APPROVED,
                channel=NotificationChannel.EMAIL,
                subject_template="Job Approved: {job_title}",
                content_template="""
Hello {homeowner_name},

Great news! Your job posting has been approved and is now live on serviceHub.

📋 Job Title: {job_title}
✅ Status: Approved and Active
📅 Approved: {approved_at}
👨‍💼 Reviewed by: Admin Team

{admin_notes}

Your job is now visible to all qualified tradespeople in your area. You should start receiving interest notifications soon.

To view your job and manage applications, visit: {os.environ.get('FRONTEND_URL', 'https://app.emergent.sh')}/my-jobs

Best regards,
serviceHub Admin Team
                """,
                variables=["homeowner_name", "job_title", "approved_at", "admin_notes"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_APPROVED,
                channel=NotificationChannel.SMS,
                subject_template="Job Approved - serviceHub",
                content_template=f"✅ Your job '{{job_title}}' has been approved and is now live! Tradespeople can now see and apply. Check: {os.environ.get('FRONTEND_URL', 'https://app.emergent.sh')}/my-jobs",
                variables=["job_title"]
            )
        }
        
        # New Job Posted templates (for subscribers/users)
        templates[NotificationType.NEW_JOB_POSTED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_JOB_POSTED,
                channel=NotificationChannel.EMAIL,
                subject_template="New Job Opportunity: {job_title}",
                content_template="""
Hello {recipient_name},

A new job opportunity has been posted on serviceHub that might interest you!

📋 Job Title: {job_title}
🏢 Department: {department}
📍 Location: {location}
💼 Job Type: {job_type}
📈 Experience Level: {experience_level}
📅 Posted: {posted_date}

{job_description}

To apply for this position, visit:
{application_url}

Don't miss out on this opportunity!

Best regards,
serviceHub Careers Team
                """,
                variables=["recipient_name", "job_title", "department", "location", "job_type", "experience_level", "posted_date", "job_description", "application_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_JOB_POSTED,
                channel=NotificationChannel.SMS,
                subject_template="New Job - serviceHub",
                content_template="💼 New job posted: {job_title} in {department}. Location: {location}. Apply now: {application_url}",
                variables=["job_title", "department", "location", "application_url"]
            )
        }
        
        # New Job Application templates (for admins)
        templates[NotificationType.NEW_APPLICATION] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_APPLICATION,
                channel=NotificationChannel.EMAIL,
                subject_template="New Job Application: {job_title}",
                content_template="""
Hello Admin Team,

A new job application has been submitted for:

📋 Job Title: {job_title}
👤 Applicant: {applicant_name}
📧 Email: {applicant_email}
📱 Phone: {applicant_phone}
📈 Experience Level: {experience_level}
📅 Applied: {applied_date}

Cover Letter:
{cover_letter}

To review this application and contact the applicant, visit the admin dashboard:
{admin_dashboard_url}

Best regards,
serviceHub System
                """,
                variables=["job_title", "applicant_name", "applicant_email", "applicant_phone", "experience_level", "applied_date", "cover_letter", "admin_dashboard_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_APPLICATION,
                channel=NotificationChannel.SMS,
                subject_template="New Application - serviceHub",
                content_template="📋 New application for {job_title} from {applicant_name}. Review at admin dashboard.",
                variables=["job_title", "applicant_name"]
            )
        }

        # Review Invitation templates (for homeowners to review tradespeople)
        templates[NotificationType.REVIEW_INVITATION] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.REVIEW_INVITATION,
                channel=NotificationChannel.EMAIL,
                subject_template="Share Your Experience - Review {tradesperson_name}",
                content_template="""
Hello {homeowner_name},

Your job has been completed! We hope you're satisfied with the work done by {tradesperson_name}.

📋 Job: {job_title}
👷 Tradesperson: {tradesperson_name}
📅 Completed: {completion_date}
⭐ Your review matters!

Help other homeowners by sharing your experience:
• Rate the quality of work (1-5 stars)
• Comment on professionalism and timeliness  
• Upload photos of the completed work
• Recommend (or not) to other homeowners

Your honest feedback helps build a trusted community and helps {tradesperson_name} grow their business.

📝 Leave Your Review: {review_url}

This invitation expires in 30 days. If you have any issues with the completed work, please contact us immediately.

Best regards,
serviceHub Team
                """,
                variables=["homeowner_name", "tradesperson_name", "job_title", "completion_date", "review_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.REVIEW_INVITATION,
                channel=NotificationChannel.SMS,
                subject_template="Review Request - serviceHub",
                content_template="🏠 Job completed by {tradesperson_name}! Share your experience and help other homeowners. Leave review: {review_url}",
                variables=["tradesperson_name", "review_url"]
            )
        }

        # Review Reminder templates (follow-up after initial invitation)
        templates[NotificationType.REVIEW_REMINDER] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.REVIEW_REMINDER,
                channel=NotificationChannel.EMAIL,
                subject_template="Don't Forget - Review {tradesperson_name}",
                content_template="""
Hello {homeowner_name},

We noticed you haven't left a review for your recently completed job yet. Your feedback is valuable!

📋 Job: {job_title}
👷 Tradesperson: {tradesperson_name}
📅 Completed: {completion_date}

Your review helps:
✅ Other homeowners make informed decisions
✅ Tradespeople improve their services
✅ Build a trusted community on serviceHub

It only takes 2 minutes to leave a review!

📝 Leave Your Review Now: {review_url}

This invitation expires in {days_remaining} days.

Best regards,
serviceHub Team
                """,
                variables=["homeowner_name", "tradesperson_name", "job_title", "completion_date", "review_url", "days_remaining"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.REVIEW_REMINDER,
                channel=NotificationChannel.SMS,
                subject_template="Review Reminder - serviceHub",
                content_template="⏰ Reminder: Please review {tradesperson_name} for your completed job. Expires in {days_remaining} days: {review_url}",
                variables=["tradesperson_name", "days_remaining", "review_url"]
            )
        }

        # Job Rejection templates
        templates[NotificationType.JOB_REJECTED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_REJECTED,
                channel=NotificationChannel.EMAIL,
                subject_template="Job Submission Update: {job_title}",
                content_template="""
Hello {homeowner_name},

Thank you for submitting your job posting to serviceHub. After review, we need some updates before we can approve your job.

📋 Job Title: {job_title}
❌ Status: Requires Updates
📅 Reviewed: {reviewed_at}
👨‍💼 Reviewed by: Admin Team

📝 Required Updates:
{rejection_reason}

How to Fix:
1. Log into your serviceHub account
2. Go to "My Jobs" section
3. Edit your job posting with the required updates
4. Resubmit for review

We're here to help! If you have questions about these requirements, please contact our support team.

Visit your jobs: https://app.emergent.sh/my-jobs

Best regards,
serviceHub Admin Team
                """,
                variables=["homeowner_name", "job_title", "reviewed_at", "rejection_reason"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_REJECTED,
                channel=NotificationChannel.SMS,
                subject_template="Job Update Required - serviceHub",
                content_template="⚠️ Your job '{job_title}' needs updates before approval. Check your email for details or visit: https://app.emergent.sh/my-jobs",
                variables=["job_title"]
            )
        }
        
        # Job Update templates
        templates[NotificationType.JOB_UPDATED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_UPDATED,
                channel=NotificationChannel.EMAIL,
                subject_template="Job Updated: {job_title}",
                content_template="""
Hello {homeowner_name},

Your job posting has been updated by our admin team to improve its quality and visibility.

📋 Job Title: {job_title}
✏️ Updated Fields: {updated_fields}
📅 Updated: {updated_at}
👨‍💼 Updated by: Admin Team

{admin_notes}

What This Means:
Your job posting now has better visibility and improved details to attract more qualified tradespeople. These updates help ensure you get the best possible responses to your job.

To view your updated job posting, visit: https://app.emergent.sh/my-jobs

If you have any questions about these updates, please don't hesitate to contact our support team.

Best regards,
serviceHub Admin Team
                """,
                variables=["homeowner_name", "job_title", "updated_fields", "updated_at", "admin_notes"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_UPDATED,
                channel=NotificationChannel.SMS,
                subject_template="Job Updated - serviceHub",
                content_template="✏️ Your job '{job_title}' has been updated by our admin team to improve visibility. Check details: https://app.emergent.sh/my-jobs",
                variables=["job_title"]
            )
        }
        
        # Job Completed templates
        templates[NotificationType.JOB_COMPLETED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_COMPLETED,
                channel=NotificationChannel.EMAIL,
                subject_template="Job Completed: {job_title}",
                content_template="""
Hello {tradesperson_name},

The job you showed interest in has been marked as completed by the homeowner.

📋 Job: {job_title}
📍 Location: {job_location}
👤 Homeowner: {homeowner_name}
✅ Status: Completed
📅 Completed: {completion_date}

The homeowner has indicated that the work for this project has been finished. If you were selected for this job and have completed the work, congratulations on a successful project!

If you have any questions about this job completion status, please contact our support team.

View your interests: {interests_url}

Best regards,
serviceHub Team
                """,
                variables=["tradesperson_name", "job_title", "job_location", "homeowner_name", "completion_date", "interests_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_COMPLETED,
                channel=NotificationChannel.SMS,
                subject_template="Job Completed - serviceHub",
                content_template="✅ Job '{job_title}' has been completed by homeowner {homeowner_name}. Check your interests: {interests_url}",
                variables=["job_title", "homeowner_name", "interests_url"]
            )
        }
        
        # Job Cancelled templates
        templates[NotificationType.JOB_CANCELLED] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_CANCELLED,
                channel=NotificationChannel.EMAIL,
                subject_template="Job Cancelled: {job_title}",
                content_template="""
Hello {tradesperson_name},

Unfortunately, the job you showed interest in has been cancelled by the homeowner.

📋 Job: {job_title}
📍 Location: {job_location}
👤 Homeowner: {homeowner_name}
❌ Status: Cancelled
📅 Cancelled: {cancellation_date}
📝 Reason: {cancellation_reason}

We understand this is disappointing. The homeowner has decided to cancel this project at this time.

Don't worry - there are many other opportunities available! Keep browsing for new jobs that match your skills.

🔍 Browse Jobs: {browse_jobs_url}
📋 View Your Interests: {interests_url}

Best regards,
serviceHub Team
                """,
                variables=["tradesperson_name", "job_title", "job_location", "homeowner_name", "cancellation_date", "cancellation_reason", "browse_jobs_url", "interests_url"]
            ),
            NotificationChannel.SMS: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.JOB_CANCELLED,
                channel=NotificationChannel.SMS,
                subject_template="Job Cancelled - serviceHub",
                content_template="❌ Job '{job_title}' cancelled by {homeowner_name}. Reason: {cancellation_reason}. Browse new jobs: {browse_jobs_url}",
                variables=["job_title", "homeowner_name", "cancellation_reason", "browse_jobs_url"]
            )
        }
        
        templates[NotificationType.NEW_MATCHING_JOB] = {
            NotificationChannel.EMAIL: NotificationTemplate(
                id=str(uuid.uuid4()),
                type=NotificationType.NEW_MATCHING_JOB,
                channel=NotificationChannel.EMAIL,
                subject_template="New Job in Your Area: {trade_title}",
                content_template="""
<html>
<head>
    <style>
        .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .logo img { height: 40px; }
        .logo span { font-size: 24px; font-weight: bold; color: #000; }
        .button { display: inline-block; padding: 10px 20px; background-color: #003366; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .steps { margin: 20px 0; padding-left: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .footer a { color: #666; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="servicehub-logo.png" alt="ServiceHub Logo">
            <span>ServiceHub</span>
        </div>
        <h2>Hello {Name}</h2>
        <p>There's a new job in your area!</p>
        <p><strong>{trade_title}</strong></p>
        <p>{trade_category}</p>
        <p>{Location} & {miles}</p>
        <a href="{see_more_url}" class="button">See more details</a>
        <h3>Next steps</h3>
        <ol class="steps">
            <li>Send a message for free to the customer to express interest in this job.</li>
            <li>You'll only pay if a customer shares their contact details with you.</li>
            <li>Contact the customer as soon as you get the contact details for the best chance of getting hired.</li>
        </ol>
        <p>Do not share this email with others to prevent Unauthorised access to your account</p>
        <p>Please don't reply to this email — we won't get your response. Need help? Visit our <a href="{support_url}">Support centre</a></p>
        <p><a href="{preferences_url}">Manage preferences</a></p>
        <div class="footer">
            <p>2025 ServiceHub limited. Registered in Nigeria.</p>
            <p>6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria</p>
            <p><a href="{privacy_url}">Privacy policy</a> | <a href="{terms_url}">Terms and conditions</a></p>
        </div>
    </div>
    </body>
    </html>
""",
                variables=["Name", "trade_title", "trade_category", "Location", "miles", "see_more_url", "support_url", "preferences_url", "privacy_url", "terms_url"]
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

    async def send_custom_sms(self, phone: str, message: str, metadata: Dict[str, Any] = None) -> bool:
        """Send a direct SMS without using a template (e.g., OTP messages)."""
        # Ensure services are initialized
        self._ensure_services_initialized()
        try:
            success = await self.sms_service.send_sms(
                to=phone,
                message=message,
                metadata=metadata or {}
            )
            if success:
                logger.info(f"📱 Custom SMS sent to {phone}")
            else:
                logger.error(f"❌ Failed to send custom SMS to {phone}")
            return success
        except Exception as e:
            logger.error(f"Error sending custom SMS to {phone}: {e}")
            return False

    async def send_custom_sms_with_result(self, phone: str, message: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send direct SMS and return detailed provider result for diagnostics."""
        self._ensure_services_initialized()
        try:
            if hasattr(self.sms_service, 'send_sms_with_result'):
                return await self.sms_service.send_sms_with_result(
                    to=phone,
                    message=message,
                    metadata=metadata or {}
                )
            ok = await self.sms_service.send_sms(to=phone, message=message, metadata=metadata or {})
            return {"ok": ok}
        except Exception as e:
            logger.error(f"Error sending custom SMS (with result) to {phone}: {e}")
            return {"ok": False, "error": str(e)}

# Global notification service instance
notification_service = NotificationService()
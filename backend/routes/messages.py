from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from models.messages import (
    Message, MessageCreate, Conversation, ConversationCreate, 
    ConversationList, MessageList
)
from models.auth import User
from models.notifications import NotificationType
from auth.dependencies import get_current_active_user, get_current_homeowner
from database import database
from services.notifications import notification_service
from datetime import datetime
import uuid
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messages", tags=["messages"])

@router.post("/conversations", response_model=Conversation)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new conversation between homeowner and tradesperson"""
    try:
        # Verify the job exists and user has access
        job = await database.get_job_by_id(conversation_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Verify user is either the homeowner or an interested tradesperson with proper access
        if current_user.role == "homeowner":
            if job.get("homeowner", {}).get("id") != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create conversations for your own jobs")
            
            # CRITICAL FIX: Homeowners can only create conversations with tradespeople who have paid access
            interest = await database.get_interest_by_job_and_tradesperson(conversation_data.job_id, conversation_data.tradesperson_id)
            if not interest:
                raise HTTPException(status_code=403, detail="Tradesperson has not shown interest in this job")
            if interest.get("status") != "paid_access":
                raise HTTPException(status_code=403, detail="Tradesperson must pay for access before conversation can be started")
                
        elif current_user.role == "tradesperson":
            # Check if tradesperson has paid access to this job
            interest = await database.get_interest_by_job_and_tradesperson(conversation_data.job_id, current_user.id)
            if not interest or interest.get("status") != "paid_access":
                raise HTTPException(status_code=403, detail="You must pay for access before starting a conversation")
        else:
            raise HTTPException(status_code=403, detail="Invalid account type")
        
        # Get user details for conversation
        homeowner = await database.get_user_by_id(conversation_data.homeowner_id)
        tradesperson = await database.get_user_by_id(conversation_data.tradesperson_id)
        
        if not homeowner:
            raise HTTPException(status_code=404, detail="Homeowner not found")
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Create conversation
        conversation = {
            "id": str(uuid.uuid4()),
            "job_id": conversation_data.job_id,
            "job_title": job.get("title", "Untitled Job"),
            "homeowner_id": conversation_data.homeowner_id,
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "tradesperson_id": conversation_data.tradesperson_id,
            "tradesperson_name": tradesperson.get("business_name") or tradesperson.get("name", "Tradesperson")
        }
        
        result = await database.create_conversation(conversation)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create conversation")
        
        return Conversation(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create conversation")

@router.get("/conversations", response_model=ConversationList)
async def get_conversations(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """Get user's conversations"""
    try:
        conversations = await database.get_user_conversations(
            user_id=current_user.id,
            user_type=current_user.role,
            skip=skip,
            limit=limit
        )
        
        conversation_objects = [Conversation(**conv) for conv in conversations]
        
        return ConversationList(
            conversations=conversation_objects,
            total=len(conversation_objects)
        )
        
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get conversations")

@router.get("/conversations/{conversation_id}/messages", response_model=MessageList)
async def get_conversation_messages(
    conversation_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user)
):
    """Get messages for a conversation"""
    try:
        # Verify user has access to this conversation
        conversation = await database.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if (current_user.id != conversation["homeowner_id"] and 
            current_user.id != conversation["tradesperson_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        
        messages = await database.get_conversation_messages(
            conversation_id=conversation_id,
            skip=skip,
            limit=limit
        )
        
        # Mark messages as read
        await database.mark_messages_as_read(conversation_id, current_user.role)
        
        message_objects = [Message(**msg) for msg in messages]
        
        return MessageList(
            messages=message_objects,
            total=len(message_objects),
            has_more=len(message_objects) == limit
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get messages")

@router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def send_message(
    conversation_id: str,
    message_data: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """Send a message in a conversation"""
    try:
        # Verify user has access to this conversation
        conversation = await database.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if (current_user.id != conversation["homeowner_id"] and 
            current_user.id != conversation["tradesperson_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create message
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": current_user.id,
            "sender_name": current_user.name or current_user.business_name or "User",
            "sender_type": current_user.role,
            "message_type": message_data.message_type,
            "content": message_data.content,
            "attachment_url": message_data.attachment_url
        }
        
        result = await database.create_message(message)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to send message")
        
        # Send notification to recipient
        recipient_id = (conversation["homeowner_id"] 
                       if current_user.id == conversation["tradesperson_id"] 
                       else conversation["tradesperson_id"])
        
        background_tasks.add_task(
            _notify_new_message,
            sender=current_user,
            recipient_id=recipient_id,
            conversation=conversation,
            message_content=message_data.content
        )
        
        return Message(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send message")

@router.put("/conversations/{conversation_id}/read")
async def mark_conversation_as_read(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Mark all messages in a conversation as read"""
    try:
        # Verify user has access to this conversation
        conversation = await database.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if (current_user.id != conversation["homeowner_id"] and 
            current_user.id != conversation["tradesperson_id"]):
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await database.mark_messages_as_read(conversation_id, current_user.role)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to mark messages as read")
        
        return {"message": "Messages marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking messages as read: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark messages as read")

@router.get("/conversations/job/{job_id}")
async def get_or_create_conversation_for_job(
    job_id: str,
    tradesperson_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get or create conversation for a specific job and tradesperson"""
    try:
        # Verify job exists
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        homeowner_id = job.get("homeowner", {}).get("id")
        if not homeowner_id:
            raise HTTPException(status_code=400, detail="Job has no homeowner")
        
        # Check if conversation already exists
        conversation = await database.get_conversation_by_job_and_users(job_id, homeowner_id, tradesperson_id)
        
        if conversation:
            return {"conversation_id": conversation["id"], "exists": True}
        
        # Verify user can create this conversation and has proper access
        if current_user.role == "homeowner":
            if homeowner_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create conversations for your own jobs")
            
            # CRITICAL FIX: Homeowners can only create conversations with tradespeople who have paid access
            interest = await database.get_interest_by_job_and_tradesperson(job_id, tradesperson_id)
            if not interest:
                raise HTTPException(status_code=403, detail="Tradesperson has not shown interest in this job")
            if interest.get("status") != "paid_access":
                raise HTTPException(status_code=403, detail="Tradesperson must pay for access before conversation can be started")
                
        elif current_user.role == "tradesperson":
            if tradesperson_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create conversations for yourself")
            
            # Check if tradesperson has paid access
            interest = await database.get_interest_by_job_and_tradesperson(job_id, current_user.id)
            if not interest or interest.get("status") != "paid_access":
                raise HTTPException(status_code=403, detail="You must pay for access before starting a conversation")
        else:
            raise HTTPException(status_code=403, detail="Invalid account type")
        
        # CRITICAL FIX: Validate that both users exist before creating conversation
        homeowner = await database.get_user_by_id(homeowner_id)
        tradesperson = await database.get_user_by_id(tradesperson_id)
        
        if not homeowner:
            raise HTTPException(status_code=404, detail="Homeowner not found")
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Create new conversation
        conversation_data = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "job_title": job.get("title", "Untitled Job"),
            "homeowner_id": homeowner_id,
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "tradesperson_id": tradesperson_id,
            "tradesperson_name": tradesperson.get("business_name") or tradesperson.get("name", "Tradesperson")
        }
        
        result = await database.create_conversation(conversation_data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create conversation")
        
        return {"conversation_id": result["id"], "exists": False}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting/creating conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get or create conversation")

async def _notify_new_message(sender: User, recipient_id: str, conversation: dict, message_content: str):
    """Background task to notify recipient of new message"""
    try:
        # Get recipient details
        recipient = await database.get_user_by_id(recipient_id)
        if not recipient:
            logger.warning(f"Recipient {recipient_id} not found")
            return
        
        # Get recipient preferences
        preferences = await database.get_user_notification_preferences(recipient_id)
        
        # Prepare template data
        template_data = {
            "recipient_name": recipient.get("name") or recipient.get("business_name", "User"),
            "sender_name": sender.name or sender.business_name or "User",
            "job_title": conversation.get("job_title", "Job"),
            "message_preview": message_content[:100] + "..." if len(message_content) > 100 else message_content,
            "conversation_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/messages/{conversation['id']}"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=recipient_id,
            notification_type=NotificationType.NEW_MESSAGE,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=recipient.get("email"),
            recipient_phone=recipient.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ New message notification sent to {recipient_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send new message notification: {str(e)}")

# Hiring Status and Feedback Endpoints

@router.get("/hiring-status/{job_id}")
async def get_hiring_status(
    job_id: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Get hiring status for a specific job"""
    try:
        # Verify job exists and belongs to current user
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.get("homeowner", {}).get("id") != current_user.id:
            raise HTTPException(status_code=403, detail="You can only view status for your own jobs")
        
        # Get hiring status records for this job
        cursor = database.hiring_status_collection.find(
            {"job_id": job_id, "homeowner_id": current_user.id}
        ).sort("created_at", -1).limit(1)
        
        hiring_status = await cursor.to_list(length=1)
        
        if not hiring_status:
            raise HTTPException(status_code=404, detail="No hiring status found for this job")
        
        status = hiring_status[0]
        status['_id'] = str(status['_id'])
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting hiring status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get hiring status")

@router.get("/hired-tradespeople/{job_id}")
async def get_hired_tradespeople_for_job(
    job_id: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Get all hired tradespeople for a specific job"""
    try:
        # Verify job exists and belongs to current user
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.get("homeowner", {}).get("id") != current_user.id:
            raise HTTPException(status_code=403, detail="You can only view hired tradespeople for your own jobs")
        
        # Get all hiring status records where hired = true for this job
        cursor = database.hiring_status_collection.find({
            "job_id": job_id, 
            "homeowner_id": current_user.id,
            "hired": True
        })
        
        hiring_statuses = await cursor.to_list(length=None)
        
        if not hiring_statuses:
            return {"tradespeople": []}
        
        # Get tradesperson details for each hired tradesperson
        tradespeople = []
        for status in hiring_statuses:
            tradesperson = await database.get_user_by_id(status["tradesperson_id"])
            if tradesperson:
                tradespeople.append({
                    "id": tradesperson["id"],
                    "name": tradesperson.get("name", "Unknown"),
                    "business_name": tradesperson.get("business_name"),
                    "avatar": tradesperson.get("avatar"),
                    "job_status": status.get("job_status"),
                    "hired_at": status.get("created_at")
                })
        
        return {"tradespeople": tradespeople}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting hired tradespeople: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get hired tradespeople")

@router.post("/hiring-status")
async def update_hiring_status(
    hiring_data: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Update hiring status and job progress for a tradesperson"""
    try:
        job_id = hiring_data.get("jobId")
        tradesperson_id = hiring_data.get("tradespersonId")
        hired = hiring_data.get("hired", False)
        job_status = hiring_data.get("jobStatus")
        
        if not job_id or not tradesperson_id:
            raise HTTPException(status_code=400, detail="Job ID and Tradesperson ID are required")
        
        # Verify job exists and belongs to current user
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.get("homeowner", {}).get("id") != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update status for your own jobs")
        
        # Verify tradesperson exists
        tradesperson = await database.get_user_by_id(tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Create hiring status record
        hiring_status_data = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "homeowner_id": current_user.id,
            "tradesperson_id": tradesperson_id,
            "hired": hired,
            "job_status": job_status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Save to database
        await database.create_hiring_status(hiring_status_data)
        
        # If hired and job is completed, schedule review reminder
        if hired and job_status == "completed":
            background_tasks.add_task(
                _send_review_invitation,
                current_user,
                tradesperson,
                job,
                immediate=True
            )
        elif hired and job_status in ["not_started", "in_progress"]:
            # Schedule future review reminders
            background_tasks.add_task(
                _schedule_review_reminders,
                current_user,
                tradesperson,
                job,
                job_status
            )
        
        return {
            "message": "Hiring status updated successfully",
            "id": hiring_status_data["id"],
            "hired": hired,
            "job_status": job_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating hiring status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update hiring status")

@router.post("/feedback")
async def submit_hiring_feedback(
    feedback_data: dict,
    current_user: User = Depends(get_current_homeowner)
):
    """Submit feedback when homeowner doesn't hire a tradesperson"""
    try:
        job_id = feedback_data.get("jobId")
        tradesperson_id = feedback_data.get("tradespersonId")
        feedback_type = feedback_data.get("feedbackType")
        comment = feedback_data.get("comment", "")
        
        if not job_id or not tradesperson_id or not feedback_type:
            raise HTTPException(status_code=400, detail="Job ID, Tradesperson ID, and feedback type are required")
        
        # Verify job exists and belongs to current user
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.get("homeowner", {}).get("id") != current_user.id:
            raise HTTPException(status_code=403, detail="You can only submit feedback for your own jobs")
        
        # Verify tradesperson exists
        tradesperson = await database.get_user_by_id(tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Create feedback record
        feedback_record = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "homeowner_id": current_user.id,
            "tradesperson_id": tradesperson_id,
            "feedback_type": feedback_type,
            "comment": comment,
            "created_at": datetime.utcnow()
        }
        
        # Save to database
        await database.create_hiring_feedback(feedback_record)
        
        return {
            "message": "Feedback submitted successfully",
            "id": feedback_record["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting hiring feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")

# Background task functions for review reminders

async def _send_review_invitation(homeowner: User, tradesperson: dict, job: dict, immediate: bool = False):
    """Send review invitation to homeowner"""
    try:
        # Get homeowner preferences
        preferences = await database.get_user_notification_preferences(homeowner.id)
        
        # Prepare template data
        template_data = {
            "homeowner_name": homeowner.name or "Homeowner",
            "tradesperson_name": tradesperson.get("business_name") or tradesperson.get("name", "Tradesperson"),
            "job_title": job.get("title", "Job"),
            "completion_date": datetime.utcnow().strftime("%B %d, %Y"),
            "review_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-jobs?review={job['id']}"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=homeowner.id,
            notification_type=NotificationType.REVIEW_INVITATION,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=homeowner.email,
            recipient_phone=homeowner.phone
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ Review invitation sent to homeowner {homeowner.id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send review invitation: {str(e)}")

async def _schedule_review_reminders(homeowner: User, tradesperson: dict, job: dict, job_status: str):
    """Schedule future review reminders based on job status"""
    try:
        # For now, just log that we would schedule reminders
        # In a real implementation, you'd use a task queue like Celery
        logger.info(f"📅 Review reminders scheduled for job {job['id']} (status: {job_status})")
        
        # You could implement this with:
        # - Database scheduled tasks
        # - Celery with Redis/RabbitMQ
        # - Background job processing
        
    except Exception as e:
        logger.error(f"❌ Failed to schedule review reminders: {str(e)}")
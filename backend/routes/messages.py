from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import List, Optional
from models.messages import (
    Message, MessageCreate, Conversation, ConversationCreate, 
    ConversationList, MessageList, ConversationSummary
)
from models.auth import User
from models.notifications import NotificationType
from auth.dependencies import get_current_active_user, get_current_homeowner, get_current_tradesperson
from database import database
from services.notifications import notification_service
from datetime import datetime
import uuid
import logging

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
        
        # Verify user is either the homeowner or an interested tradesperson
        if current_user.account_type == "homeowner":
            if job.get("homeowner", {}).get("id") != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create conversations for your own jobs")
        elif current_user.account_type == "tradesperson":
            # Check if tradesperson has paid access to this job
            interest = await database.get_interest_by_job_and_tradesperson(conversation_data.job_id, current_user.id)
            if not interest or interest.get("status") != "paid_access":
                raise HTTPException(status_code=403, detail="You must pay for access before starting a conversation")
        else:
            raise HTTPException(status_code=403, detail="Invalid account type")
        
        # Get user details for conversation
        homeowner = await database.get_user_by_id(conversation_data.homeowner_id)
        tradesperson = await database.get_user_by_id(conversation_data.tradesperson_id)
        
        if not homeowner or not tradesperson:
            raise HTTPException(status_code=404, detail="User not found")
        
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
            user_type=current_user.account_type,
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
        await database.mark_messages_as_read(conversation_id, current_user.account_type)
        
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
            "sender_type": current_user.account_type,
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
        
        success = await database.mark_messages_as_read(conversation_id, current_user.account_type)
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
        
        # Verify user can create this conversation
        if current_user.account_type == "homeowner":
            if homeowner_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create conversations for your own jobs")
        elif current_user.account_type == "tradesperson":
            if tradesperson_id != current_user.id:
                raise HTTPException(status_code=403, detail="You can only create conversations for yourself")
            
            # Check if tradesperson has paid access
            interest = await database.get_interest_by_job_and_tradesperson(job_id, current_user.id)
            if not interest or interest.get("status") != "paid_access":
                raise HTTPException(status_code=403, detail="You must pay for access before starting a conversation")
        
        # Get user details
        homeowner = await database.get_user_by_id(homeowner_id)
        tradesperson = await database.get_user_by_id(tradesperson_id)
        
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
            "conversation_url": f"https://servicehub.ng/messages/{conversation['id']}"
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
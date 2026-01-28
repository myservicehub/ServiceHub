from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any
from ..auth.dependencies import get_current_user
from ..models.auth import User, UserRole
from ..models.notifications import (
    NotificationPreferences,
    UpdatePreferencesRequest,
    NotificationHistory,
    NotificationStatsResponse,
    NotificationRequest,
    NotificationResponse,
    NotificationType,
    NotificationChannel,
)
from ..database import database
from ..services.notifications import notification_service
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(current_user: User = Depends(get_current_user)):
    """Get current user's notification preferences"""
    try:
        preferences = await database.get_user_notification_preferences(current_user.id)
        return preferences
    except Exception as e:
        logger.error(f"Error getting notification preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get notification preferences")

@router.put("/preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    updates: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user's notification preferences"""
    try:
        # Convert to dict and filter out None values
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        preferences = await database.update_notification_preferences(current_user.id, update_data)
        return preferences
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update notification preferences")

@router.get("/history", response_model=NotificationHistory)
async def get_notification_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Get user's notification history with pagination (optimized)"""
    try:
        # Use parallel execution for counts and fetching
        import asyncio
        
        tasks = [
            database.get_user_notifications(current_user.id, limit=limit, offset=offset),
            database.get_user_notifications_count(current_user.id),
            database.notifications_collection.count_documents({
                "user_id": current_user.id, 
                "status": {"$in": ["sent", "pending"]}
            })
        ]
        
        results = await asyncio.gather(*tasks)
        
        notifications = results[0]
        total_count = results[1]
        unread_count = results[2]
        
        return NotificationHistory(
            notifications=notifications,
            total=total_count,
            unread=unread_count
        )
    except Exception as e:
        logger.error(f"Error getting notification history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get notification history")

@router.post("/send", response_model=NotificationResponse)
async def send_notification(
    request: NotificationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Send a notification (admin/system use)"""
    try:
        # Get recipient user details
        recipient = await database.get_user_by_id(request.user_id)
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient user not found")
        
        # Get recipient preferences
        preferences = await database.get_user_notification_preferences(request.user_id)
        
        # Send notification in background
        background_tasks.add_task(
            _send_notification_background,
            request.user_id,
            request.type,
            request.template_data,
            preferences,
            recipient.get("email"),
            recipient.get("phone"),
            request.override_channel
        )
        
        return NotificationResponse(
            notification_id="queued",
            status="pending",
            message="Notification queued for delivery"
        )
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send notification")

@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(current_user: User = Depends(get_current_user)):
    """Get notification delivery statistics (admin only)"""
    try:
        # Basic admin check (you might want to implement proper role-based access)
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        stats = await database.get_notification_stats()
        return NotificationStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting notification stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get notification stats")

@router.post("/test/{notification_type}")
async def test_notification(
    notification_type: NotificationType,
    current_user: User = Depends(get_current_user)
):
    """Test notification delivery (development only)"""
    try:
        # Get user preferences
        preferences = await database.get_user_notification_preferences(current_user.id)
        
        # Create test template data
        test_data = _get_test_template_data(notification_type, current_user)
        
        # Send test notification
        notification = await notification_service.send_notification(
            user_id=current_user.id,
            notification_type=notification_type,
            template_data=test_data,
            user_preferences=preferences,
            recipient_email=current_user.email,
            recipient_phone=current_user.phone
        )
        
        # Save to database
        await database.create_notification(notification)
        
        return {
            "message": f"Test {notification_type} notification sent",
            "notification_id": notification.id,
            "status": notification.status
        }
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")

@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read"""
    try:
        # Verify notification belongs to current user and update status
        updated = await database.mark_notification_as_read(notification_id, current_user.id)
        
        if not updated:
            raise HTTPException(status_code=404, detail="Notification not found or not owned by user")
        
        return {"message": "Notification marked as read", "notification_id": notification_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

@router.patch("/mark-all-read")
async def mark_all_notifications_as_read(current_user: User = Depends(get_current_user)):
    """Mark all user notifications as read"""
    try:
        count = await database.mark_all_notifications_as_read(current_user.id)
        
        return {
            "message": f"Marked {count} notifications as read",
            "marked_count": count
        }
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a specific notification"""
    try:
        # Verify notification belongs to current user and delete
        deleted = await database.delete_notification(notification_id, current_user.id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Notification not found or not owned by user")
        
        return {"message": "Notification deleted successfully", "notification_id": notification_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")

async def _send_notification_background(
    user_id: str,
    notification_type: NotificationType,
    template_data: Dict[str, Any],
    preferences: NotificationPreferences,
    recipient_email: str = None,
    recipient_phone: str = None,
    override_channel: NotificationChannel = None
):
    """Background task for sending notifications"""
    try:
        # Override channel if specified
        if override_channel:
            # Create a copy of preferences with overridden channel
            preferences_dict = preferences.dict()
            preferences_dict[notification_type.value] = override_channel
            preferences = NotificationPreferences(**preferences_dict)
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=user_id,
            notification_type=notification_type,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone
        )
        
        # Save to database
        await database.create_notification(notification)
        
        logger.info(f"✅ Background notification sent: {notification.id}")
        
    except Exception as e:
        logger.error(f"❌ Background notification failed: {str(e)}")

def _get_test_template_data(notification_type: NotificationType, user: User) -> Dict[str, Any]:
    """Generate test template data for different notification types"""
    base_data = {
        "homeowner_name": user.name,
        "tradesperson_name": user.name,
        "job_title": "Test Plumbing Job",
        "job_location": "Lagos, Nigeria",
        "job_budget": "₦50,000 - ₦100,000",
        "view_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-jobs",
        "manage_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-jobs",
        "payment_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/payments",
        "post_date": "Today",
        "tradesperson_experience": "5",
        "tradesperson_email": user.email,
        "homeowner_email": "homeowner@example.com",
        "homeowner_phone": "+2348123456789"
    }

    frontend_url = os.environ.get('FRONTEND_URL', 'https://servicehub.ng')

    if notification_type == NotificationType.NEW_MATCHING_JOB:
        return {
            "Name": user.name or "Tradesperson",
            "trade_title": "Leaky faucet repair",
            "trade_category": "Plumber",
            "Location": "Lagos, Nigeria",
            "miles": "",
            "logo_url": f"{frontend_url}/Logo-Icon-Green.png",
            "see_more_url": f"{frontend_url}/browse-jobs",
            "support_url": f"{frontend_url}/help-faqs",
            "preferences_url": f"{frontend_url}/notifications/preferences",
            "privacy_url": f"{frontend_url}/policies/privacy",
            "terms_url": f"{frontend_url}/policies/terms"
        }

    return base_data
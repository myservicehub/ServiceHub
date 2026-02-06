from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from typing import List, Optional
from ..models.reviews import (
    Review, ReviewCreate, ReviewUpdate, ReviewResponse, ReviewSummary,
    ReviewsListResponse, ReviewStats, ReviewType, ReviewStatus,
    ReviewRequest, ReviewHelpful, ReviewFilters,
    AdvancedReviewSearchRequest, AdvancedReviewSearchResponse,
    ExternalReviewInvitation, ExternalReviewCreate, ReviewSource
)
from ..models.auth import User, UserRole
from ..models.notifications import NotificationType, NotificationStatus
from ..auth.dependencies import get_current_user, get_current_homeowner, get_current_tradesperson
from ..database import database
from ..services.notifications import notification_service
from datetime import datetime, timedelta
import logging
import os

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/create", response_model=Review)
async def create_review(
    review_data: ReviewCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Create a new review after job completion"""
    try:
        # Verify user can review for this job
        can_review = await database.can_user_review(
            current_user.id, review_data.reviewee_id, review_data.job_id
        )
        
        if not can_review:
            raise HTTPException(
                status_code=400, 
                detail="You cannot review this user for this job"
            )
        
        # Get job and reviewee details
        job = await database.get_job_by_id(review_data.job_id)
        reviewee = await database.get_user_by_id(review_data.reviewee_id)
        
        if not job or not reviewee:
            raise HTTPException(status_code=404, detail="Job or user not found")
        
        # Determine review type
        review_type = (
            ReviewType.HOMEOWNER_TO_TRADESPERSON
            if current_user.role == UserRole.HOMEOWNER
            else ReviewType.TRADESPERSON_TO_HOMEOWNER
        )
        
        # Create review object
        review = Review(
            job_id=review_data.job_id,
            reviewer_id=current_user.id,
            reviewee_id=review_data.reviewee_id,
            reviewer_name=current_user.name,
            reviewee_name=reviewee.get("name", "Unknown"),
            review_type=review_type,
            rating=review_data.rating,
            title=review_data.title,
            content=review_data.content,
            category_ratings={k.value: v for k, v in (review_data.category_ratings or {}).items()},
            photos=review_data.photos or [],
            would_recommend=review_data.would_recommend,
            job_title=job.get("title"),
            job_category=job.get("category")
        )
        
        # Save review
        created_review = await database.create_advanced_review(review)
        
        # Send notification to reviewee
        background_tasks.add_task(
            _notify_review_received,
            reviewee=reviewee,
            reviewer_name=current_user.name,
            job_title=job.get("title", ""),
            review_id=created_review.id,
            rating=review_data.rating
        )
        
        logger.info(f"Review created: {created_review.id} by {current_user.id}")
        return created_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create review")

@router.get("/user/{user_id}", response_model=ReviewsListResponse)
async def get_user_reviews(
    user_id: str,
    review_type: Optional[str] = Query(None, description="Filter by review type"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Items per page")
):
    """Get reviews for a specific user"""
    try:
        # Verify user exists
        user = await database.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get reviews with pagination
        reviews_data = await database.get_user_reviews(
            user_id, review_type, page, limit
        )
        
        # Get review summary
        summary = await database.get_user_review_summary(user_id)
        
        return ReviewsListResponse(
            reviews=reviews_data["reviews"],
            total=reviews_data["total"],
            page=reviews_data["page"],
            limit=reviews_data["limit"],
            total_pages=reviews_data["total_pages"],
            average_rating=reviews_data["average_rating"],
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get reviews")

@router.get("/job/{job_id}", response_model=List[Review])
async def get_job_reviews(job_id: str):
    """Get all reviews for a specific job"""
    try:
        # Verify job exists
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        reviews = await database.get_reviews_by_job(job_id)
        return reviews
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get job reviews")

@router.get("/summary/{user_id}", response_model=ReviewSummary)
async def get_review_summary(user_id: str):
    """Get review summary for a user"""
    try:
        # Verify user exists
        user = await database.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        summary = await database.get_user_review_summary(user_id)
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting review summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get review summary")

@router.post("/respond/{review_id}", response_model=Review)
async def respond_to_review(
    review_id: str,
    response_data: ReviewResponse,
    current_user: User = Depends(get_current_user)
):
    """Respond to a review (reviewee only)"""
    try:
        # Get review
        review = await database.get_review_by_id(review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Verify current user is the reviewee
        if review.reviewee_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="You can only respond to reviews about you"
            )
        
        # Add response
        updated_review = await database.add_review_response(
            review_id, response_data.response, current_user.id
        )
        
        if not updated_review:
            raise HTTPException(status_code=500, detail="Failed to add response")
        
        logger.info(f"Review response added: {review_id} by {current_user.id}")
        return updated_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error responding to review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to respond to review")

@router.put("/update/{review_id}", response_model=Review)
async def update_review(
    review_id: str,
    update_data: ReviewUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a review (reviewer only, within 7 days)"""
    try:
        # Get review
        review = await database.get_review_by_id(review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Verify current user is the reviewer
        if review.reviewer_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="You can only update your own reviews"
            )
        
        # Check if review is still editable (within 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        if review.created_at < seven_days_ago:
            raise HTTPException(
                status_code=400, 
                detail="Reviews can only be edited within 7 days of creation"
            )
        
        # Prepare update data
        update_fields = {}
        if update_data.title is not None:
            update_fields["title"] = update_data.title
        if update_data.content is not None:
            update_fields["content"] = update_data.content
        if update_data.category_ratings is not None:
            update_fields["category_ratings"] = {
                k.value: v for k, v in update_data.category_ratings.items()
            }
        if update_data.photos is not None:
            update_fields["photos"] = update_data.photos
        if update_data.would_recommend is not None:
            update_fields["would_recommend"] = update_data.would_recommend
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updated_review = await database.update_review(review_id, update_fields)
        if not updated_review:
            raise HTTPException(status_code=500, detail="Failed to update review")
        
        logger.info(f"Review updated: {review_id} by {current_user.id}")
        return updated_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update review")

@router.post("/helpful/{review_id}")
async def mark_review_helpful(
    review_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark a review as helpful"""
    try:
        # Get review
        review = await database.get_review_by_id(review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Mark as helpful
        success = await database.mark_review_helpful(review_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail="You have already marked this review as helpful"
            )
        
        return {"message": "Review marked as helpful"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking review helpful: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark review helpful")

@router.get("/stats/platform", response_model=ReviewStats)
async def get_platform_review_stats(current_user: User = Depends(get_current_user)):
    """Get platform-wide review statistics"""
    try:
        stats = await database.get_platform_review_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting platform stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get platform statistics")

@router.get("/can-review/{reviewee_id}/{job_id}")
async def can_review_user(
    reviewee_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Check if current user can review another user for a job"""
    try:
        can_review = await database.can_user_review(
            current_user.id, reviewee_id, job_id
        )
        
        return {
            "can_review": can_review,
            "user_id": current_user.id,
            "reviewee_id": reviewee_id,
            "job_id": job_id
        }
        
    except Exception as e:
        logger.error(f"Error checking review eligibility: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check review eligibility")

@router.get("/my-reviews")
async def get_my_reviews(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Get reviews written by current user"""
    try:
        # Get reviews written by current user
        skip = (page - 1) * limit
        cursor = database.reviews_collection.find(
            {"reviewer_id": current_user.id}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        reviews = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            reviews.append(Review(**doc))
        
        # Get total count
        total = await database.reviews_collection.count_documents(
            {"reviewer_id": current_user.id}
        )
        
        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logger.error(f"Error getting user's reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get your reviews")

# Background task functions
async def _notify_review_received(
    reviewee: dict, 
    reviewer_name: str, 
    job_title: str, 
    review_id: str, 
    rating: int
):
    """Background task to notify user of new review"""
    try:
        # Get reviewee preferences
        preferences = await database.get_user_notification_preferences(reviewee["id"])
        
        # Prepare template data
        template_data = {
            "reviewee_name": reviewee.get("name", "User"),
            "reviewer_name": reviewer_name,
            "job_title": job_title,
            "rating": rating,
            "star_display": "⭐" * rating,
            "review_url": f"{os.environ.get('FRONTEND_URL', 'https://myservicehub.co')}/reviews/{review_id}"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=reviewee["id"],
            notification_type=NotificationType.NEW_REVIEW_RECEIVED,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=reviewee.get("email"),
            recipient_phone=reviewee.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ Review notification sent to {reviewee['id']} for review {review_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send review notification for {review_id}: {str(e)}")

# External Review Invitation Endpoints
@router.post("/invite-external")
async def invite_external_review(
    client_name: str,
    job_title: str,
    client_email: str,
    client_phone: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_tradesperson)
):
    """Invite an external client to leave a review (Max 3 per tradesperson)"""
    try:
        # Check if email is provided (extra safety check)
        if not client_email:
            raise HTTPException(status_code=400, detail="Client email is required.")

        # Check if tradesperson has already sent 3 invitations
        invitation_count = await database.external_review_invitations_collection.count_documents(
            {"tradesperson_id": current_user.id}
        )
        
        if invitation_count >= 3:
            raise HTTPException(
                status_code=400, 
                detail="You have reached the maximum limit of 3 external review invitations."
            )

        # Create invitation (Set very far future expiry as per request "shouldn't expire")
        # We use status check for "one-time use" logic
        invitation = ExternalReviewInvitation(
            tradesperson_id=current_user.id,
            client_name=client_name,
            client_email=client_email,
            client_phone=client_phone,
            job_title=job_title,
            expires_at=datetime.utcnow() + timedelta(days=36500) # 100 years
        )
        
        # Save to database
        success = await database.create_external_review_invitation(invitation)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create invitation")
        
        # Determine notification channel
        notification_channel = "both"
        if not client_email:
            notification_channel = "sms"
        elif not client_phone:
            notification_channel = "email"

        # Send notification (Email or SMS)
        background_tasks.add_task(
            _notify_external_review_invitation,
            invitation=invitation,
            tradesperson_name=current_user.name
        )
        
        # Generate the review link
        review_url = f"{os.environ.get('FRONTEND_URL', 'https://myservicehub.co')}/review/external/{invitation.token}"
        
        return {
            "message": "Invitation sent successfully",
            "token": invitation.token,
            "review_url": review_url,
            "channel": notification_channel,
            "invitations_remaining": 3 - (invitation_count + 1)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating external invitation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create invitation")

@router.get("/external-invitation/{token}")
async def get_external_invitation(token: str):
    """Get external review invitation details by token (Public)"""
    invitation = await database.get_external_review_invitation_by_token(token)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Check if already completed (One-time use logic)
    if invitation.get("status") == "completed":
        raise HTTPException(status_code=400, detail="This review link has already been used and is no longer valid.")
    
    # Get tradesperson details
    tradesperson = await database.get_user_by_id(invitation["tradesperson_id"])
    tradesperson_name = tradesperson.get("name") if tradesperson else "Tradesperson"
    
    # Flatten response for frontend
    return {
        **invitation,
        "tradesperson_name": tradesperson_name,
        "tradesperson_business_name": tradesperson.get("business_name") if tradesperson else None
    }

@router.post("/submit-external")
async def submit_external_review(
    review_data: ExternalReviewCreate,
    background_tasks: BackgroundTasks
):
    """Submit an external review using a valid token (Public, One-time use)"""
    try:
        # Verify invitation
        invitation = await database.get_external_review_invitation_by_token(review_data.token)
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        if invitation.get("status") == "completed":
            raise HTTPException(status_code=400, detail="This review link has already been used.")
            
        # Get tradesperson details
        tradesperson = await database.get_user_by_id(invitation["tradesperson_id"])
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
            
        # Create review object
        review = Review(
            reviewee_id=invitation["tradesperson_id"],
            reviewer_name=invitation["client_name"],
            reviewee_name=tradesperson.get("name", "Tradesperson"),
            review_type=ReviewType.EXTERNAL_TO_TRADESPERSON,
            source=ReviewSource.EXTERNAL,
            rating=review_data.rating,
            title=review_data.title,
            content=review_data.content,
            photos=review_data.photos or [],
            would_recommend=review_data.would_recommend,
            job_title=invitation["job_title"],
            is_verified_external=True
        )
        
        # Save review
        created_review = await database.create_review(review)
        
        # Update invitation status (Mark as used)
        await database.update_external_review_invitation(
            review_data.token, 
            {"status": "completed", "completed_at": datetime.utcnow()}
        )
        
        # Notify tradesperson
        background_tasks.add_task(
            _notify_review_received,
            reviewee=tradesperson,
            reviewer_name=invitation["client_name"],
            job_title=invitation["job_title"],
            review_id=created_review.id,
            rating=review_data.rating
        )
        
        return created_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting external review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit review")
        raise HTTPException(status_code=500, detail="Failed to submit external review")

async def _notify_external_review_invitation(invitation: ExternalReviewInvitation, tradesperson_name: str):
    """Background task to notify external client of review invitation"""
    try:
        # Prepare template data
        review_url = f"{os.environ.get('FRONTEND_URL', 'https://myservicehub.co')}/review/external/{invitation.token}"
        
        template_data = {
            "client_name": invitation.client_name,
            "tradesperson_name": tradesperson_name,
            "job_title": invitation.job_title,
            "review_url": review_url
        }
        
        email_sent = False
        sms_sent = False
        
        # Determine channel and send
        if invitation.client_email:
            # Send email invitation
            try:
                notification = await notification_service.send_notification(
                    user_id=None,  # External client has no user ID
                    notification_type=NotificationType.EXTERNAL_REVIEW_INVITATION,
                    template_data=template_data,
                    recipient_email=invitation.client_email
                )
                if notification.status == NotificationStatus.SENT:
                    email_sent = True
                    # Save notification to database
                    try:
                        await database.create_notification(notification)
                    except Exception as db_err:
                        logger.error(f"❌ Failed to save email notification to DB: {db_err}")
            except Exception as e:
                logger.error(f"❌ Email delivery failed for external review: {str(e)}")
            
        if invitation.client_phone:
            # Send SMS invitation
            try:
                notification = await notification_service.send_notification(
                    user_id=None,
                    notification_type=NotificationType.EXTERNAL_REVIEW_INVITATION,
                    template_data=template_data,
                    recipient_phone=invitation.client_phone
                )
                if notification.status == NotificationStatus.SENT:
                    sms_sent = True
                    # Save notification to database
                    try:
                        await database.create_notification(notification)
                    except Exception as db_err:
                        logger.error(f"❌ Failed to save SMS notification to DB: {db_err}")
            except Exception as e:
                logger.error(f"❌ SMS delivery failed for external review: {str(e)}")
        
        # Update invitation delivery status in database
        delivery_status = "sent" if (email_sent or sms_sent) else "failed"
        
        await database.update_external_review_invitation(
            invitation.token, 
            {
                "delivery_status": delivery_status,
                "email_sent": email_sent,
                "sms_sent": sms_sent
            }
        )
            
        logger.info(f"✅ External review invitation processed for token {invitation.token}. Email: {email_sent}, SMS: {sms_sent}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send external review invitation: {str(e)}")
        # Try to update status to failed if we can
        try:
            await database.update_external_review_invitation(
                invitation.token, 
                {"delivery_status": "failed"}
            )
        except:
            pass
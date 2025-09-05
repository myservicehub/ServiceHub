from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import List
from models import (
    InterestCreate, Interest, InterestedTradesperson, InterestResponse, 
    InterestStatus, ContactDetails
)
from models.auth import User
from models.notifications import NotificationType
from auth.dependencies import get_current_tradesperson, get_current_homeowner, get_current_active_user
from database import database
from services.notifications import notification_service
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interests", tags=["interests"])

@router.post("/show-interest", response_model=Interest)
async def show_interest(
    interest_data: InterestCreate,
    current_user: User = Depends(get_current_tradesperson)
):
    """Tradesperson shows interest in a job"""
    try:
        # Verify job exists
        job = await database.get_job_by_id(interest_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if job is still active
        if job.get("status") != "active":
            raise HTTPException(status_code=400, detail="Job is no longer active")
        
        # Create interest record
        interest_record = {
            "id": str(uuid.uuid4()),
            "job_id": interest_data.job_id,
            "tradesperson_id": current_user.id,
            "status": InterestStatus.INTERESTED,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "contact_shared_at": None,
            "payment_made_at": None,
            "access_fee": None
        }
        
        created_interest = await database.create_interest(interest_record)
        
        return Interest(**created_interest)
        
    except HTTPException:
        raise
    except Exception as e:
        if "Already showed interest" in str(e):
            raise HTTPException(status_code=400, detail="You have already shown interest in this job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to show interest: {str(e)}"
        )

@router.get("/job/{job_id}", response_model=InterestResponse)
async def get_job_interested_tradespeople(
    job_id: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Get all tradespeople who showed interest in a homeowner's job"""
    try:
        # Verify job exists and belongs to current homeowner
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.get("homeowner", {}).get("email") != current_user.email:
            raise HTTPException(
                status_code=403, 
                detail="Not authorized to view interests for this job"
            )
        
        # Get interested tradespeople
        interested = await database.get_job_interested_tradespeople(job_id)
        
        # Convert to InterestedTradesperson objects
        interested_tradespeople = [InterestedTradesperson(**person) for person in interested]
        
        return InterestResponse(
            interested_tradespeople=interested_tradespeople,
            total=len(interested_tradespeople)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get interested tradespeople: {str(e)}"
        )

@router.put("/share-contact/{interest_id}")
async def share_contact_details(
    interest_id: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Homeowner shares contact details with interested tradesperson"""
    try:
        # Get interest record and verify authorization
        interest = await database.interests_collection.find_one({"id": interest_id})
        if not interest:
            raise HTTPException(status_code=404, detail="Interest not found")
        
        # Get job and verify homeowner owns it
        job = await database.get_job_by_id(interest["job_id"])
        if not job or job.get("homeowner", {}).get("email") != current_user.email:
            raise HTTPException(
                status_code=403, 
                detail="Not authorized to share contact for this interest"
            )
        
        # Update interest status to contact_shared
        updated = await database.update_interest_status(
            interest_id, 
            InterestStatus.CONTACT_SHARED
        )
        
        if not updated:
            raise HTTPException(status_code=400, detail="Failed to update interest status")
        
        return {"message": "Contact details shared successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to share contact details: {str(e)}"
        )

@router.get("/my-interests", response_model=List[dict])
async def get_my_interests(
    current_user: User = Depends(get_current_tradesperson)
):
    """Get tradesperson's interest history"""
    try:
        interests = await database.get_tradesperson_interests(current_user.id)
        return interests
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get interests: {str(e)}"
        )

@router.post("/pay-access/{interest_id}")
async def pay_for_access(
    interest_id: str,
    current_user: User = Depends(get_current_tradesperson)
):
    """Tradesperson pays for access to contact details (placeholder for payment integration)"""
    try:
        # Get interest record and verify it belongs to current user
        interest = await database.interests_collection.find_one({
            "id": interest_id,
            "tradesperson_id": current_user.id
        })
        
        if not interest:
            raise HTTPException(status_code=404, detail="Interest not found")
        
        if interest["status"] != InterestStatus.CONTACT_SHARED:
            raise HTTPException(
                status_code=400, 
                detail="Contact details not yet shared by homeowner"
            )
        
        # For now, we'll simulate payment success
        # TODO: Integrate with Paystack/Flutterwave
        access_fee = 1000.0  # ₦1000 default access fee
        
        updated = await database.update_interest_status(
            interest_id, 
            InterestStatus.PAID_ACCESS,
            {"access_fee": access_fee}
        )
        
        if not updated:
            raise HTTPException(status_code=400, detail="Failed to process payment")
        
        return {
            "message": "Payment successful! Access granted to contact details.",
            "access_fee": access_fee
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payment: {str(e)}"
        )

@router.get("/contact-details/{job_id}", response_model=ContactDetails)
async def get_contact_details(
    job_id: str,
    current_user: User = Depends(get_current_tradesperson)
):
    """Get homeowner contact details after payment"""
    try:
        contact_details = await database.get_contact_details(job_id, current_user.id)
        return ContactDetails(**contact_details)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get contact details: {str(e)}"
        )

async def _notify_homeowner_new_interest(job: dict, tradesperson: dict, interest_id: str):
    """Background task to notify homeowner of new interest"""
    try:
        # Create notification for homeowner
        await notification_service.create_notification(
            user_id=job.get("homeowner", {}).get("id"),
            notification_type=NotificationType.NEW_INTEREST,
            title="New Interest in Your Job",
            message=f"{tradesperson.get('business_name', tradesperson.get('name', 'A tradesperson'))} has shown interest in your job: {job.get('title', 'Untitled Job')}",
            data={
                "job_id": job.get("id"),
                "tradesperson_id": tradesperson.get("id"),
                "interest_id": interest_id
            }
        )
        logger.info(f"Notification sent to homeowner {job.get('homeowner', {}).get('id')} for new interest {interest_id}")
    except Exception as e:
        logger.error(f"Failed to send notification for new interest {interest_id}: {str(e)}")
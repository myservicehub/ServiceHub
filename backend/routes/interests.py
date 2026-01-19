from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import List
from models import (
    InterestCreate, Interest, InterestedTradesperson, InterestResponse, 
    InterestStatus, ContactDetails, ShareContactResponse
)
from models.auth import User
from models.notifications import NotificationType
from ..auth.dependencies import get_current_tradesperson, get_current_homeowner, get_current_active_user, require_tradesperson_verified
from ..database import database
from ..services.notifications import notification_service
from datetime import datetime
import uuid
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interests", tags=["interests"])

@router.post("/show-interest", response_model=Interest)
async def show_interest(
    interest_data: InterestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_tradesperson_verified)
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
        
        # Check if tradesperson has already shown interest
        existing_interest = await database.get_interest_by_job_and_tradesperson(
            interest_data.job_id, current_user.id
        )
        if existing_interest:
            raise HTTPException(status_code=400, detail="You have already shown interest in this job")
        
        # Create interest record
        interest = Interest(
            id=str(uuid.uuid4()),
            job_id=interest_data.job_id,
            tradesperson_id=current_user.id,
            status=InterestStatus.INTERESTED,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Save to database
        result = await database.create_interest(interest.dict())
        
        # Get full tradesperson data for notification
        tradesperson_data = await database.get_user_by_id(current_user.id)
        
        # Add background task to send notification to homeowner
        background_tasks.add_task(
            _notify_homeowner_new_interest,
            job=job,
            tradesperson=tradesperson_data,
            interest_id=interest.id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error showing interest: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to show interest")

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
        
        # Check ownership using ID or email
        homeowner_data = job.get("homeowner", {})
        is_owner = False
        
        # Check ID match (primary)
        if homeowner_data.get("id") and str(homeowner_data.get("id")) == str(current_user.id):
            is_owner = True
        # Check root level homeowner_id (most reliable)
        elif job.get("homeowner_id") and str(job.get("homeowner_id")) == str(current_user.id):
            is_owner = True
        # Check email match (fallback)
        elif homeowner_data.get("email") and homeowner_data.get("email") == current_user.email:
            is_owner = True
            
        if not is_owner:
            logger.warning(f"Unauthorized access attempt to job {job_id} by user {current_user.id}. Owner: {homeowner_data}, Owner ID: {job.get('homeowner_id')}")
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

@router.put("/share-contact/{interest_id}", response_model=ShareContactResponse)
async def share_contact_details(
    interest_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Homeowner shares contact details with interested tradesperson"""
    try:
        # Get interest record
        interest = await database.get_interest_by_id(interest_id)
        if not interest:
            raise HTTPException(status_code=404, detail="Interest not found")
        
        # Verify job belongs to current homeowner
        job = await database.get_job_by_id(interest["job_id"])
        if not job or job["homeowner"]["id"] != current_user.id:
            raise HTTPException(status_code=403, detail="You don't have permission to manage this interest")
        
        # Check if interest is in correct status
        if interest["status"] != InterestStatus.INTERESTED:
            raise HTTPException(status_code=400, detail="Contact details can only be shared for interested tradespeople")
        
        # Update interest status
        contact_shared_at = datetime.utcnow()
        update_data = {
            "status": InterestStatus.CONTACT_SHARED,
            "contact_shared_at": contact_shared_at,
            "updated_at": datetime.utcnow()
        }
        
        updated_interest = await database.update_interest_status(interest_id, update_data)
        if not updated_interest:
            raise HTTPException(status_code=500, detail="Failed to update interest status")
        
        # Add background task to notify tradesperson
        background_tasks.add_task(
            _notify_tradesperson_contact_shared,
            job=job,
            tradesperson_id=interest["tradesperson_id"],
            interest_id=interest_id
        )
        
        return ShareContactResponse(
            interest_id=interest_id,
            status=InterestStatus.CONTACT_SHARED,
            message="Contact details shared successfully",
            contact_shared_at=contact_shared_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing contact details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to share contact details")

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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_tradesperson)
):
    """Tradesperson pays for access to contact details using wallet coins"""
    try:
        # Get interest record and verify it belongs to current user
        interest = await database.get_interest_by_id(interest_id)
        
        if not interest or interest["tradesperson_id"] != current_user.id:
            raise HTTPException(status_code=404, detail="Interest not found")
        
        if interest["status"] != InterestStatus.CONTACT_SHARED:
            raise HTTPException(
                status_code=400, 
                detail="Contact details not yet shared by homeowner"
            )
        
        # Get job to check access fee
        job = await database.get_job_by_id(interest["job_id"])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get access fee from job (default to ₦1500 if not set)
        access_fee_naira = job.get("access_fee_naira", 1500)
        access_fee_coins = job.get("access_fee_coins", 15)
        
        # Check wallet balance and deduct fee
        success = await database.deduct_access_fee(
            user_id=current_user.id,
            job_id=job["id"],
            access_fee_coins=access_fee_coins
        )
        
        if not success:
            # Get current wallet balance for error message
            wallet = await database.get_wallet_by_user_id(current_user.id)
            current_balance = wallet.get("balance_coins", 0)
            shortfall = access_fee_coins - current_balance
            
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient wallet balance. Required: {access_fee_coins} coins (₦{access_fee_naira:,}), "
                       f"Current balance: {current_balance} coins (₦{current_balance * 100:,}), "
                       f"Shortfall: {shortfall} coins (₦{shortfall * 100:,}). Please fund your wallet."
            )
        
        # Update interest status
        update_data = {
            "status": InterestStatus.PAID_ACCESS,
            "access_fee": access_fee_naira,
            "payment_made_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        updated_interest = await database.update_interest_status(interest_id, update_data)
        
        if not updated_interest:
            raise HTTPException(status_code=400, detail="Failed to process payment")
        
        # Get full tradesperson data for notification
        tradesperson_data = await database.get_user_by_id(current_user.id)
        
        # Add background task to send payment confirmation notification
        background_tasks.add_task(
            _notify_payment_confirmation,
            tradesperson=tradesperson_data,
            job=job,
            interest_id=interest_id,
            access_fee=access_fee_naira
        )
        
        return {
            "message": "Payment successful! Access granted to contact details.",
            "access_fee_naira": access_fee_naira,
            "access_fee_coins": access_fee_coins,
            "payment_method": "wallet_coins"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process payment")

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
        # Get homeowner details
        homeowner_id = job.get("homeowner", {}).get("id")
        if not homeowner_id:
            logger.warning("No homeowner ID found in job data")
            return
        
        # Get homeowner preferences
        preferences = await database.get_user_notification_preferences(homeowner_id)
        
        # Get homeowner user details for contact info
        homeowner = await database.get_user_by_id(homeowner_id)
        if not homeowner:
            logger.warning(f"Homeowner {homeowner_id} not found")
            return
        
        # Prepare template data
        template_data = {
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "tradesperson_name": tradesperson.get("business_name") or tradesperson.get("name", "A tradesperson"),
            "tradesperson_experience": str(tradesperson.get("experience_years", "N/A")),
            "view_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-jobs"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=homeowner_id,
            notification_type=NotificationType.NEW_INTEREST,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=homeowner.get("email"),
            recipient_phone=homeowner.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ New interest notification sent to homeowner {homeowner_id} for interest {interest_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send new interest notification for {interest_id}: {str(e)}")

async def _notify_tradesperson_contact_shared(job: dict, tradesperson_id: str, interest_id: str):
    """Background task to notify tradesperson that contact details have been shared"""
    try:
        # Get tradesperson details
        tradesperson = await database.get_user_by_id(tradesperson_id)
        if not tradesperson:
            logger.warning(f"Tradesperson {tradesperson_id} not found")
            return
        
        # Get tradesperson preferences
        preferences = await database.get_user_notification_preferences(tradesperson_id)
        
        # Prepare template data
        template_data = {
            "tradesperson_name": tradesperson.get("business_name") or tradesperson.get("name", "Tradesperson"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "homeowner_name": job.get("homeowner", {}).get("name", "Homeowner"),
            "payment_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-interests?pay={interest_id}",
            "view_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-interests"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=tradesperson_id,
            notification_type=NotificationType.CONTACT_SHARED,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=tradesperson.get("email"),
            recipient_phone=tradesperson.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ Contact shared notification sent to tradesperson {tradesperson_id} for interest {interest_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send contact shared notification for {interest_id}: {str(e)}")

async def _notify_payment_confirmation(tradesperson: dict, job: dict, interest_id: str, access_fee: float):
    """Background task to notify about payment confirmation"""
    try:
        # Get tradesperson preferences
        preferences = await database.get_user_notification_preferences(tradesperson["id"])
        
        # Prepare template data
        template_data = {
            "tradesperson_name": tradesperson.get("business_name") or tradesperson.get("name", "Tradesperson"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "homeowner_name": job.get("homeowner", {}).get("name", "Homeowner"),
            "access_fee": f"₦{access_fee:,.2f}",
            "view_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/my-interests"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=tradesperson["id"],
            notification_type=NotificationType.PAYMENT_CONFIRMATION,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=tradesperson.get("email"),
            recipient_phone=tradesperson.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ Payment confirmation notification sent to tradesperson {tradesperson['id']} for interest {interest_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send payment confirmation notification for {interest_id}: {str(e)}")

@router.get("/completed-jobs", response_model=List[dict])
async def get_completed_jobs(
    current_user: User = Depends(get_current_tradesperson)
):
    """Get all completed jobs for the current tradesperson"""
    try:
        # Get all interests where the job is completed and tradesperson has access
        completed_jobs = await database.get_completed_jobs_for_tradesperson(current_user.id)
        
        return completed_jobs
        
    except Exception as e:
        logger.error(f"Failed to get completed jobs for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve completed jobs"
        )
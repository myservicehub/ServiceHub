from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
from ..models import JobCreate, JobUpdate, JobCloseRequest, Job, JobsResponse
from ..models.base import JobStatus
from ..models.notifications import NotificationType, NotificationChannel, NotificationPreferences, Notification, NotificationStatus
from ..auth.dependencies import (
    get_current_homeowner,
    get_current_tradesperson,
    get_current_active_user,
    get_optional_current_active_user,
    require_homeowner_contact_verified,
    require_tradesperson_verified,
)
from ..auth.security import (
    get_password_hash,
    validate_password_strength,
    validate_nigerian_phone,
    format_nigerian_phone,
    create_access_token,
    create_refresh_token,
    verify_password,
    create_email_verification_token,
)
from ..models.auth import User, UserRole, UserStatus
from ..database import database
from ..services.notifications import notification_service
try:
    from ..services.notifications import SendGridEmailService, MockEmailService
except Exception:
    from services.notifications import SendGridEmailService, MockEmailService
from datetime import datetime, timedelta
import uuid
import logging
import os
import re
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

class PublicJobPostRequest(BaseModel):
    job: JobCreate
    password: str = Field(..., min_length=8)
    question_answers: Optional[dict] = None

# Public endpoints for location data
@router.get("/locations/states")
async def get_states_public():
    """Get all available states for job posting and registration (public endpoint)"""
    # Get states from database (new ones added by admin)
    custom_states = await database.get_custom_states()
    
    # Get default states from constants
    from ..models.nigerian_states import NIGERIAN_STATES
    
    # Combine both lists and remove duplicates
    all_states = list(set(NIGERIAN_STATES + custom_states))
    all_states.sort()  # Sort alphabetically
    
    return {"states": all_states}

@router.post("/", response_model=Job)
async def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_homeowner_contact_verified)
):
    """Create a new job posting"""
    try:
        from ..models.nigerian_lgas import validate_lga_for_state, validate_zip_code
        
        # Convert to dict and prepare for database
        job_dict = job_data.dict()
        
        # Validate LGA belongs to the specified state (check both static and dynamic LGAs)
        static_valid = validate_lga_for_state(job_data.state, job_data.lga)
        
        # Also check dynamic LGAs from database
        dynamic_valid = False
        try:
            custom_lgas_cursor = database.database.system_locations.find({
                "state": job_data.state,
                "type": "lga"
            })
            custom_lgas_docs = await custom_lgas_cursor.to_list(length=None)
            custom_lgas = [lga["name"] for lga in custom_lgas_docs]
            dynamic_valid = job_data.lga in custom_lgas
        except Exception as e:
            logger.warning(f"Error checking dynamic LGAs: {e}")
        
        if not (static_valid or dynamic_valid):
            raise HTTPException(
                status_code=400,
                detail=f"LGA '{job_data.lga}' does not belong to state '{job_data.state}'",
            )
        
        # Validate zip code format
        if not validate_zip_code(job_data.zip_code, job_data.state, job_data.lga):
            raise HTTPException(
                status_code=400,
                detail="Invalid zip code format. Nigerian zip codes must be 6 digits.",
            )
        
        # Auto-populate legacy fields for compatibility
        job_dict['location'] = job_data.state  # Use state as location
        job_dict['postcode'] = job_data.zip_code  # Use zip_code as postcode
        
        # Create homeowner object using current user data
        job_dict['homeowner'] = {
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email,
            'phone': current_user.phone
        }
        
        # Also set homeowner_id at root level for admin queries
        job_dict['homeowner_id'] = current_user.id
        
        # Remove homeowner fields from job_data if they exist
        for field in ['homeowner_name', 'homeowner_email', 'homeowner_phone']:
            if field in job_dict:
                del job_dict[field]
        
        # Add default values
        # Use a 6-digit numeric ID instead of UUID
        job_dict['id'] = await database.generate_job_id(digits=6)
        job_dict['status'] = 'pending_approval'  # Jobs need admin approval
        job_dict['quotes_count'] = 0
        job_dict['interests_count'] = 0  # Add interests count
        job_dict['access_fee_naira'] = 1000  # Default access fee ₦1000 (flexible)
        job_dict['access_fee_coins'] = 10    # Default access fee 10 coins
        job_dict['created_at'] = datetime.utcnow()
        job_dict['updated_at'] = datetime.utcnow()
        job_dict['expires_at'] = datetime.utcnow() + timedelta(days=30)
        
        # Save to database
        created_job = await database.create_job(job_dict)
        
        # Notify homeowner only; tradespeople will be notified after admin approval
        background_tasks.add_task(
            _notify_job_posted_successfully,
            homeowner=current_user.dict(),
            job=created_job
        )
        
        return Job(**created_job)
        
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{job_id}/location")
async def update_job_location(
    job_id: str,
    latitude: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude coordinate"),
    current_user: User = Depends(get_current_homeowner)
):
    """Update job location coordinates"""
    try:
        # Verify job ownership
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job["homeowner"]["id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this job")
        
        # Update location
        success = await database.update_job_location(job_id, latitude, longitude)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update job location")
        
        return {
            "message": "Job location updated successfully",
            "job_id": job_id,
            "latitude": latitude,
            "longitude": longitude
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job location: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update job location: {str(e)}")

@router.get("/nearby")
async def get_nearby_jobs(
    latitude: float = Query(..., ge=-90, le=90, description="User latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="User longitude"),
    max_distance_km: int = Query(25, ge=1, le=200, description="Maximum distance in kilometers"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return")
):
    """Get jobs near a specific location"""
    try:
        jobs = await database.get_jobs_near_location(
            latitude=latitude,
            longitude=longitude,
            max_distance_km=max_distance_km,
            skip=skip,
            limit=limit
        )
        
        return {
            "jobs": jobs,
            "total": len(jobs),
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "max_distance_km": max_distance_km
            },
            "pagination": {
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting nearby jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get nearby jobs: {str(e)}")

@router.get("/for-tradesperson")
async def get_jobs_for_tradesperson(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return"),
    current_user: User = Depends(get_current_tradesperson)
):
    """Get jobs filtered by tradesperson's skills and location preferences"""
    try:
        # Ensure user is a tradesperson
        if current_user.role != UserRole.TRADESPERSON:
            raise HTTPException(status_code=403, detail="This endpoint is for tradespeople only")
        
        jobs = await database.get_jobs_for_tradesperson(
            tradesperson_id=current_user.id,
            skip=skip,
            limit=limit
        )
        
        # Get tradesperson details for response
        tradesperson_info = {
            "trade_categories": current_user.trade_categories if current_user.trade_categories else [],
            "location": current_user.location if hasattr(current_user, 'location') else None,
            "travel_distance_km": current_user.travel_distance_km if hasattr(current_user, 'travel_distance_km') else 25
        }
        
        return {
            "jobs": jobs,
            "total": len(jobs),
            "filtering_info": {
                "skills_filter": len(tradesperson_info["trade_categories"]) > 0,
                "location_filter": current_user.latitude is not None and current_user.longitude is not None,
                "filtered_by_skills": tradesperson_info["trade_categories"],
                "max_distance_km": tradesperson_info["travel_distance_km"]
            },
            "tradesperson_info": tradesperson_info,
            "pagination": {
                "skip": skip,
                "limit": limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting jobs for tradesperson: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get filtered jobs for tradesperson: {str(e)}")

@router.get("/search")
async def search_jobs_with_location(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Job category filter"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="User latitude for location filtering"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="User longitude for location filtering"),
    max_distance_km: Optional[int] = Query(None, ge=1, le=200, description="Maximum distance in kilometers"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return")
):
    """Search jobs with optional location filtering"""
    try:
        jobs = await database.search_jobs_with_location(
            search_query=q,
            category=category,
            user_latitude=latitude,
            user_longitude=longitude,
            max_distance_km=max_distance_km,
            skip=skip,
            limit=limit
        )
        
        return {
            "jobs": jobs,
            "total": len(jobs),
            "search_params": {
                "query": q,
                "category": category,
                "location_filter": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "max_distance_km": max_distance_km
                } if latitude and longitude and max_distance_km else None
            },
            "pagination": {
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching jobs with location: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")

@router.get("/", response_model=JobsResponse)
async def get_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    location: Optional[str] = None
):
    """Get jobs with pagination and filters"""
    try:
        skip = (page - 1) * limit
        
        # Build filters
        filters = {}
        if category:
            filters['category'] = category
        if location:
            filters['location'] = {'$regex': location, '$options': 'i'}
        
        # Get jobs and total count
        jobs = await database.get_jobs(skip=skip, limit=limit, filters=filters)
        total_jobs = await database.get_jobs_count(filters=filters)
        
        # Convert to Job objects
        job_objects = [Job(**job) for job in jobs]
        
        # Calculate pagination
        total_pages = (total_jobs + limit - 1) // limit
        
        return JobsResponse(
            jobs=job_objects,
            pagination={
                "page": page,
                "limit": limit,
                "total": total_jobs,
                "pages": total_pages
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search-text", response_model=JobsResponse)
async def search_jobs(
    q: Optional[str] = Query(None, description="Search query"),
    location: Optional[str] = Query(None, description="Location filter"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Search jobs with text query"""
    try:
        skip = (page - 1) * limit
        
        # Build search filters
        filters = {}
        
        if q:
            # Text search on title and description
            filters['$or'] = [
                {'title': {'$regex': q, '$options': 'i'}},
                {'description': {'$regex': q, '$options': 'i'}}
            ]
        
        if category:
            filters['category'] = category
            
        if location:
            filters['location'] = {'$regex': location, '$options': 'i'}
        
        # Get jobs and count
        jobs = await database.get_jobs(skip=skip, limit=limit, filters=filters)
        total_jobs = await database.get_jobs_count(filters=filters)
        
        # Convert to Job objects
        job_objects = [Job(**job) for job in jobs]
        
        # Calculate pagination
        total_pages = (total_jobs + limit - 1) // limit
        
        return JobsResponse(
            jobs=job_objects,
            pagination={
                "page": page,
                "limit": limit,
                "total": total_jobs,
                "pages": total_pages
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-jobs", response_model=JobsResponse)
async def get_my_jobs(
    current_user: User = Depends(get_current_homeowner),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None, description="Filter by job status")
):
    """Get jobs posted by current homeowner"""
    try:
        skip = (page - 1) * limit
        
        # Build filters for homeowner's jobs
        filters = {"homeowner.email": current_user.email}
        if status:
            filters["status"] = status
        
        # Get jobs and total count
        jobs = await database.get_jobs(skip=skip, limit=limit, filters=filters)
        total_jobs = await database.get_jobs_count(filters=filters)
        
        # Convert to Job objects
        job_objects = [Job(**job) for job in jobs]
        
        # Calculate pagination
        total_pages = (total_jobs + limit - 1) // limit
        
        return JobsResponse(
            jobs=job_objects,
            pagination={
                "page": page,
                "limit": limit,
                "total": total_jobs,
                "pages": total_pages
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Public Policy Endpoints (no authentication required) - MUST come before /{job_id} route
@router.get("/policies")
async def get_public_policies():
    """Get all active policies for public display (footer links, etc.)"""
    try:
        policies = await database.get_all_policies()
        
        # Filter only active policies and format for public consumption
        public_policies = []
        for policy in policies:
            if policy.get('status') == 'active':
                public_policies.append({
                    'policy_type': policy.get('policy_type'),
                    'title': policy.get('title'),
                    'content': policy.get('content'),
                    'effective_date': policy.get('effective_date'),
                    'updated_at': policy.get('updated_at')
                })
        
        return {
            'policies': public_policies,
            'count': len(public_policies)
        }
        
    except Exception as e:
        logger.error(f"Error getting public policies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get policies: {str(e)}")

@router.get("/policies/{policy_type}")
async def get_public_policy(policy_type: str):
    """Get a specific active policy for public display"""
    try:
        policy = await database.get_policy_by_type(policy_type)
        
        if not policy or policy.get('status') != 'active':
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Format for public consumption
        public_policy = {
            'policy_type': policy.get('policy_type'),
            'title': policy.get('title'),
            'content': policy.get('content'),
            'effective_date': policy.get('effective_date'),
            'updated_at': policy.get('updated_at')
        }
        
        return {'policy': public_policy}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public policy {policy_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get policy: {str(e)}")

# Public Contact Endpoints (no authentication required)
@router.get("/contacts")
async def get_public_contacts():
    """Get all active contacts for public display (footer, contact page, etc.)"""
    try:
        contacts = await database.get_public_contacts()
        
        return {
            'contacts': contacts
        }
        
    except Exception as e:
        logger.error(f"Error getting public contacts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get contacts: {str(e)}")

@router.get("/contacts/{contact_type}")
async def get_public_contacts_by_type(contact_type: str):
    """Get contacts of specific type for public display"""
    try:
        contacts = await database.get_contacts_by_type(contact_type)
        
        # Format for public consumption
        public_contacts = []
        for contact in contacts:
            public_contacts.append({
                'label': contact.get('label'),
                'value': contact.get('value'),
                'display_order': contact.get('display_order', 0)
            })
        
        # Sort by display order
        public_contacts.sort(key=lambda x: x['display_order'])
        
        return {
            'contact_type': contact_type,
            'contacts': public_contacts
        }
        
    except Exception as e:
        logger.error(f"Error getting public contacts for type {contact_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get contacts: {str(e)}")


@router.put("/{job_id}", response_model=Job)
async def update_job(
    job_id: str,
    job_update: JobUpdate,
    current_user: User = Depends(get_current_homeowner)
):
    """Update a job (homeowner only)"""
    try:
        # Verify job exists and ownership
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job["homeowner"]["id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this job")
        
        # Check if job can be edited (only active jobs)
        if job.get("status") != "active":
            raise HTTPException(status_code=400, detail="Only active jobs can be edited")
        
        # Prepare update data
        update_data = {}
        update_fields = job_update.dict(exclude_unset=True)
        
        for field, value in update_fields.items():
            if value is not None:
                update_data[field] = value
        
        # Handle location field auto-population
        if "state" in update_data:
            update_data["location"] = update_data["state"]
        if "zip_code" in update_data:
            update_data["postcode"] = update_data["zip_code"]
        
        # Add updated timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update job in database
        success = await database.update_job(job_id, update_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update job")
        
        # Get updated job
        updated_job = await database.get_job_by_id(job_id)
        return Job(**updated_job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{job_id}/close")
async def close_job(
    job_id: str,
    close_request: JobCloseRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Close/cancel a job with feedback (homeowner only)"""
    try:
        # Verify job exists and ownership
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job["homeowner"]["id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to close this job")
        
        # Check if job can be closed (only active jobs)
        if job.get("status") != "active":
            raise HTTPException(status_code=400, detail="Only active jobs can be closed")
        
        # Update job status to cancelled with feedback
        update_data = {
            "status": JobStatus.CANCELLED,
            "closure_reason": close_request.reason,
            "closure_feedback": close_request.additional_feedback,
            "closed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        success = await database.update_job(job_id, update_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to close job")
        
        # Get updated job for notifications
        updated_job = await database.get_job_by_id(job_id)
        
        # Send notification to interested tradespeople about job cancellation
        background_tasks.add_task(
            notify_job_cancellation,
            job_id,
            updated_job,
            current_user,
            close_request.reason,
            close_request.additional_feedback
        )
        
        return {
            "message": "Job closed successfully",
            "job_id": job_id,
            "status": JobStatus.CANCELLED,
            "closure_reason": close_request.reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{job_id}/complete")
async def complete_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Mark a job as completed (homeowner only)"""
    try:
        # Verify job exists and ownership
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job["homeowner"]["id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to complete this job")
        
        # Check if job can be completed (active or in-progress jobs)
        if job.get("status") not in ["active", "in_progress"]:
            raise HTTPException(status_code=400, detail="Only active or in-progress jobs can be marked as completed")
        
        # Update job status to completed
        update_data = {
            "status": JobStatus.COMPLETED,
            "completed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await database.update_job(job_id, update_data)
        
        # Get updated job
        updated_job = await database.get_job_by_id(job_id)
        
        # Send notification to tradespeople who worked on this job about potential reviews
        background_tasks.add_task(
            notify_job_completion,
            job_id,
            updated_job,
            current_user
        )
        
        return updated_job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@router.put("/{job_id}/reopen")
async def reopen_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Reopen a cancelled job (homeowner only)"""
    try:
        # Verify job exists and ownership
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job["homeowner"]["id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to reopen this job")
        
        # Check if job can be reopened (only cancelled jobs)
        if job.get("status") != "cancelled":
            raise HTTPException(status_code=400, detail="Only cancelled jobs can be reopened")
        
        # Update job status back to active
        update_data = {
            "status": JobStatus.ACTIVE,
            "reopened_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await database.update_job(job_id, update_data)
        
        # Get updated job
        updated_job = await database.get_job_by_id(job_id)
        
        # Send notifications to interested tradespeople
        background_tasks.add_task(
            notify_interested_tradespeople_job_reopened,
            job_id,
            updated_job
        )
        
        return updated_job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reopening job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/close-reasons")
async def get_job_close_reasons():
    """Get predefined reasons for closing jobs"""
    return {
        "reasons": [
            "Found a suitable tradesperson",
            "No longer need the service",
            "Budget constraints",
            "Decided to do it myself",
            "Timeline no longer works",
            "Too many unqualified responses",
            "Poor quality of responses",
            "Change in requirements",
            "Property circumstances changed",
            "Other"
        ]
    }

@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """Get a specific job by ID"""
    try:
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return Job(**job)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def notify_job_completion(job_id: str, job: dict, homeowner: User):
    """Background task to notify interested tradespeople about job completion"""
    try:
        logger.info(f"Job {job_id} marked as completed by homeowner {homeowner.id}")
        
        # Get all interested tradespeople for this job
        interested_tradespeople = await database.get_interested_tradespeople_for_job(job_id)
        
        if not interested_tradespeople:
            logger.info(f"No interested tradespeople found for completed job {job_id}")
            return
        
        logger.info(f"Found {len(interested_tradespeople)} interested tradespeople for completed job {job_id}")
        
        # Iterate through each interested tradesperson and send notifications
        for interest in interested_tradespeople:
            try:
                tradesperson_id = interest.get("tradesperson_id")
                tradesperson_info = interest.get("tradesperson", {})
                
                if not tradesperson_id:
                    logger.warning(f"Missing tradesperson_id in interest: {interest}")
                    continue
                
                # Get tradesperson notification preferences
                preferences = await database.get_user_notification_preferences(tradesperson_id)
                
                # Prepare notification template data
                frontend_url = os.environ.get('FRONTEND_URL', 'https://servicehub.ng')
                template_data = {
                    "tradesperson_name": tradesperson_info.get("name", "Tradesperson"),
                    "job_title": job.get("title", "Untitled Job"),
                    "job_location": job.get("location", ""),
                    "homeowner_name": homeowner.name,
                    "completion_date": datetime.utcnow().strftime("%B %d, %Y"),
                    "interests_url": f"{frontend_url}/my-interests"
                }
                
                # Send notification
                notification = await notification_service.send_notification(
                    user_id=tradesperson_id,
                    notification_type=NotificationType.JOB_COMPLETED,
                    template_data=template_data,
                    user_preferences=preferences,
                    recipient_email=tradesperson_info.get("email"),
                    recipient_phone=tradesperson_info.get("phone")
                )
                
                # Save notification to database
                await database.create_notification(notification)
                
                logger.info(f"✅ Job completion notification sent to tradesperson {tradesperson_id}")
                
            except Exception as e:
                logger.error(
                    "Failed to send job completion notification to tradesperson %s: %s",
                    tradesperson_id,
                    str(e),
                )
                continue
        
        logger.info("Job completion notifications sent to all interested tradespeople for job %s", job_id)
        
    except Exception as e:
        logger.error("Error in job completion notification: %s", str(e))

async def notify_interested_tradespeople_job_reopened(job_id: str, job: dict):
    """Background task to notify interested tradespeople about job reopening"""
    try:
        logger.info(f"Job {job_id} has been reopened")
        # Add any specific notification logic here if needed
    except Exception as e:
        logger.error(f"Error in job reopened notification: {str(e)}")

async def _notify_job_posted_successfully(homeowner: dict, job: dict):
    """Background task to notify homeowner that job was posted successfully"""
    try:
        # Get homeowner ID
        homeowner_id = homeowner.get("id")
        if not homeowner_id:
            logger.warning("No homeowner ID found in homeowner data")
            return
        
        # Get user preferences for notifications
        preferences = await database.get_user_notification_preferences(homeowner_id)
        
        budget_min = job.get("budget_min", 0)
        budget_max = job.get("budget_max", 0)
        has_budget = job.get("budget_min") and job.get("budget_max")
        job_budget = (
            f"₦{budget_min:,} - ₦{budget_max:,}"
            if has_budget
            else "Budget not specified"
        )
        template_data = {
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "job_category": job.get("category", ""),
            "job_budget": job_budget,
            "post_date": "Today",
            "manage_url": "https://servicehub.ng/my-jobs",
            "job_id": job.get("id"),
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=homeowner_id,
            notification_type=NotificationType.JOB_POSTED,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=homeowner.get("email"),
            recipient_phone=homeowner.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info("Job posted notification sent to homeowner %s for job %s", homeowner_id, job.get("id"))
        
    except Exception as e:
        logger.error("Failed to send job posted notification for job %s: %s", job.get("id"), str(e))

async def notify_job_cancellation(job_id: str, job: dict, homeowner: User, reason: str, feedback: str):
    """Background task to notify interested tradespeople about job cancellation"""
    try:
        logger.info("Job %s cancelled by homeowner %s - Reason: %s", job_id, homeowner.id, reason)
        interested_tradespeople = await database.get_interested_tradespeople_for_job(job_id)
        if not interested_tradespeople:
            logger.info("No interested tradespeople found for cancelled job %s", job_id)
            return
        logger.info("Found %s interested tradespeople for cancelled job %s", len(interested_tradespeople), job_id)
        for interest in interested_tradespeople:
            try:
                tradesperson_id = interest.get("tradesperson_id")
                tradesperson_info = interest.get("tradesperson", {})
                if not tradesperson_id:
                    logger.warning("Missing tradesperson_id in interest: %s", interest)
                    continue
                preferences = await database.get_user_notification_preferences(tradesperson_id)
                frontend_url = os.environ.get("FRONTEND_URL", "https://servicehub.ng")
                template_data = {
                    "tradesperson_name": tradesperson_info.get("name", "Tradesperson"),
                    "job_title": job.get("title", "Untitled Job"),
                    "job_location": job.get("location", ""),
                    "homeowner_name": homeowner.name,
                    "cancellation_reason": reason,
                    "additional_feedback": feedback if feedback else "No additional feedback provided",
                    "cancellation_date": datetime.utcnow().strftime("%B %d, %Y"),
                    "browse_jobs_url": f"{frontend_url}/browse-jobs",
                    "interests_url": f"{frontend_url}/my-interests",
                }
                notification = await notification_service.send_notification(
                    user_id=tradesperson_id,
                    notification_type=NotificationType.JOB_CANCELLED,
                    template_data=template_data,
                    user_preferences=preferences,
                    recipient_email=tradesperson_info.get("email"),
                    recipient_phone=tradesperson_info.get("phone"),
                )
                await database.create_notification(notification)
                logger.info("Job cancellation notification sent to tradesperson %s", tradesperson_id)
            except Exception as e:
                logger.error(
                    "Failed to send job cancellation notification to tradesperson %s: %s",
                    tradesperson_id,
                    str(e),
                )
                continue
        logger.info("Job cancellation notifications sent to all interested tradespeople for job %s", job_id)
    except Exception as e:
        logger.error("Error in job cancellation notification: %s", str(e))

async def notify_matching_tradespeople_new_job(job: dict):
    try:
        category = job.get("category", "")
        if not category:
            return
        normalized_cat = category.strip().lower()
        synonyms_map = {
            "plumbing": ["plumber", "plumbing", "pipe", "leak", "sanitary"],
            "electrical repairs": ["electrician", "electrical", "wiring", "power"],
            "tiling": ["tiler", "tiling", "tiles"],
            "painting": ["painter", "painting", "paint"],
            "carpentry": ["carpenter", "carpentry"],
            "furniture making": ["furniture", "furniture maker"],
            "interior design": ["interior", "design", "interior designer"],
            "air conditioning & refrigeration": ["air conditioning", "ac", "hvac", "refrigeration"],
            "generator services": ["generator", "gen", "genset"],
            "solar & inverter installation": ["solar", "inverter", "pv", "solar panel"],
            "cctv & security systems": ["cctv", "security", "surveillance"],
            "locksmithing": ["locksmith", "locks"],
            "roofing": ["roofer", "roofing", "roof"],
            "plastering/pop": ["plaster", "pop"],
            "door & window installation": ["door", "window", "installer"],
            "bathroom fitting": ["bathroom", "toilet", "sanitary"],
            "flooring": ["floor", "flooring"],
            "welding": ["welder", "welding"],
            "cleaning": ["cleaner", "cleaning"],
            "relocation/moving": ["relocation", "moving", "mover"],
            "waste disposal": ["waste", "disposal", "trash"],
            "recycling": ["recycle", "recycling"],
            "building": ["builder", "building", "construction"],
            "concrete works": ["concrete", "masonry", "cement"]
        }
        synonyms = set([category])
        synonyms.update(synonyms_map.get(normalized_cat, []))
        alternation = "|".join(sorted({re.escape(s) for s in synonyms}))
        pattern = f"({alternation})"
        filters = {
            "role": "tradesperson",
            "status": {"$ne": "deleted"},
            "$or": [
                {"trade_categories": {"$regex": pattern, "$options": "i"}},
                {"profession": {"$regex": pattern, "$options": "i"}},
            ],
        }
        cursor = database.users_collection.find(filters)
        tradespeople = await cursor.to_list(length=None)
        logger.info(
            "NEW_MATCHING_JOB: found %s tradespeople for category '%s' (synonyms: %s)",
            len(tradespeople),
            category,
            ", ".join(sorted(synonyms)),
        )
        frontend_url = os.environ.get("FRONTEND_URL", "https://servicehub.ng")
        for tp in tradespeople:
            try:
                tp_id = tp.get("id")
                if not tp_id:
                    continue
                preferences = await database.get_user_notification_preferences(tp_id)
                name = tp.get("business_name") or tp.get("name", "Tradesperson")
                miles = None
                jlat = job.get("latitude")
                jlng = job.get("longitude")
                tlat = tp.get("latitude")
                tlng = tp.get("longitude")
                # Attempt to compute distance using explicit coordinates only
                try:
                    job_coords = None
                    tp_coords = None
                    if jlat is not None and jlng is not None:
                        job_coords = {"latitude": float(jlat), "longitude": float(jlng)}
                    # No fallback to geocoding here to prevent timeouts
                    
                    if tlat is not None and tlng is not None:
                        tlng_val = float(tlng)
                        tp_coords = {"latitude": float(tlat), "longitude": tlng_val}
                    # No fallback to geocoding here to prevent timeouts
                    if job_coords and tp_coords:
                        km = database.calculate_distance(tp_coords["latitude"], tp_coords["longitude"], job_coords["latitude"], job_coords["longitude"])
                        max_km = tp.get("travel_distance_km", 25)
                        if km > float(max_km):
                            logger.info(
                                "NEW_MATCHING_JOB: skipped tradesperson %s due to distance %.1f km > max %.1f km",
                                tp_id,
                                km,
                                float(max_km),
                            )
                            continue
                        miles = round(km * 0.621, 1)
                except Exception:
                    miles = None
                # Determine available contact methods (do not override preferences here)
                recipient_email = tp.get("email")
                recipient_phone = tp.get("phone")
                if not recipient_email and not recipient_phone:
                    logger.info("Skipping tradesperson %s: no contact info for NEW_MATCHING_JOB", tp_id)
                    continue
                template_data = {
                    "Name": name,
                    "trade_title": job.get("title", "Job"),
                    "trade_category": job.get("category", ""),
                    "Location": job.get("location", ""),
                    "miles": f"{miles} miles" if miles is not None else "",
                    "logo_url": f"{frontend_url}/Logo-Icon-Green.png",
                    "see_more_url": f"{frontend_url}/browse-jobs",
                    "job_url": f"{frontend_url}/browse-jobs?job_id={job.get('id')}",
                    "support_url": f"{frontend_url}/help-faqs",
                    "preferences_url": f"{frontend_url}/notifications/preferences",
                    "privacy_url": f"{frontend_url}/policies/privacy",
                    "terms_url": f"{frontend_url}/policies/terms"
                }
                notification = await notification_service.send_notification(
                    user_id=tp_id,
                    notification_type=NotificationType.NEW_MATCHING_JOB,
                    template_data=template_data,
                    user_preferences=preferences,
                    recipient_email=recipient_email,
                    recipient_phone=recipient_phone
                )
                await database.create_notification(notification)
                logger.info(f"✅ Successfully sent NEW_MATCHING_JOB notification to tradesperson {tp_id} (email: {recipient_email}, phone: {recipient_phone}) for job {job.get('id')}")
            except Exception as e:
                import traceback
                error_details = {
                    "tradesperson_id": tp.get("id"),
                    "tradesperson_name": name,
                    "tradesperson_email": recipient_email,
                    "tradesperson_phone": recipient_phone,
                    "job_id": job.get("id"),
                    "job_title": job.get("title"),
                    "preference_channel": getattr(preferences, "new_matching_job", "unknown") if 'preferences' in locals() else "unknown",
                    "error": str(e),
                    "error_type": type(e).__name__
                }
                logger.error(
                    "❌ FAILED to send matching job notification to tradesperson %s (email: %s, phone: %s) for job %s. "
                    "Preference channel: %s. Error: %s",
                    tp.get("id"),
                    recipient_email,
                    recipient_phone,
                    job.get("id"),
                    error_details["preference_channel"],
                    str(e)
                )
                logger.error(f"Full error details: {error_details}")
                logger.error(f"Error traceback:\n{traceback.format_exc()}")
                # Store failed notification record for tracking
                try:
                    failed_notification = Notification(
                        id=str(uuid.uuid4()),
                        user_id=tp_id,
                        type=NotificationType.NEW_MATCHING_JOB,
                        channel=getattr(preferences, "new_matching_job", NotificationChannel.EMAIL) if 'preferences' in locals() else NotificationChannel.EMAIL,
                        recipient_email=recipient_email,
                        recipient_phone=recipient_phone,
                        subject=f"New Job: {job.get('title', 'Job')}",
                        content=f"Failed to send: {str(e)}",
                        status=NotificationStatus.FAILED,
                        metadata={"error": str(e), "error_type": type(e).__name__, "job_id": job.get("id"), **template_data}
                    )
                    await database.create_notification(failed_notification)
                except Exception as save_err:
                    logger.error(f"Failed to save failed notification record: {str(save_err)}")
                continue
    except Exception as e:
        import traceback
        logger.error(
            "❌ CRITICAL ERROR in notify_matching_tradespeople_new_job for job %s: %s",
            job.get("id", "unknown"),
            str(e)
        )
        logger.error(f"Error traceback:\n{traceback.format_exc()}")
        # Re-raise to ensure the error is visible in logs and monitoring
        raise

@router.post("/create-sample-data")
async def create_sample_data(current_user: User = Depends(get_current_homeowner)):
    """Create sample jobs for testing - TEMPORARY ENDPOINT"""
    try:
        from datetime import datetime, timedelta
        import uuid
        
        # Sample jobs data for the current homeowner
        sample_jobs = [
            {
                "id": str(uuid.uuid4()),
                "title": "Kitchen Plumbing Repair - COMPLETED",
                "description": (
                    "Fixed leaky faucet and improved water pressure. "
                    "Job completed successfully with excellent results."
                ),
                "category": "Plumbing",
                "location": "Lagos",
                "state": "Lagos",
                "lga": "Lagos Island",
                "town": "Victoria Island",
                "zip_code": "101241",
                "home_address": (
                    "15 Ahmadu Bello Way, Victoria Island, Lagos"
                ),
                "budget_min": 15000,
                "budget_max": 25000,
                "timeline": "Within 1 week",
                "status": "completed",
                "homeowner": {
                    "id": current_user.id,
                    "name": current_user.name,
                    "email": current_user.email,
                    "phone": current_user.phone
                },
                "homeowner_id": current_user.id,
                "completed_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
                "final_cost": 20000,
                "hired_tradesperson": {
                    "id": "b8ee65e9-100b-487e-b308-cc3256234c13",
                    "name": "John Plumber",
                    "rating": 4.5
                },
                "created_at": (datetime.utcnow() - timedelta(days=7)).isoformat(),
                "updated_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=23)).isoformat(),
                "interests_count": 5,
                "quotes_count": 3
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Bathroom Tile Installation - COMPLETED",
                "description": "Installed new ceramic tiles in master bathroom. Work completed to high standards.",
                "category": "Tiling",
                "location": "Lagos",
                "state": "Lagos",
                "lga": "Lagos Island",
                "town": "Victoria Island",
                "zip_code": "101241",
                "home_address": "15 Ahmadu Bello Way, Victoria Island, Lagos",
                "budget_min": 50000,
                "budget_max": 80000,
                "timeline": "Within 2 weeks",
                "status": "completed",
                "homeowner": {
                    "id": current_user.id,
                    "name": current_user.name,
                    "email": current_user.email,
                    "phone": current_user.phone
                },
                "homeowner_id": current_user.id,
                "completed_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
                "final_cost": 65000,
                "hired_tradesperson": {
                    "id": "tradesperson-2-id",
                    "name": "Mike Tiler",
                    "rating": 4.8
                },
                "created_at": (datetime.utcnow() - timedelta(days=15)).isoformat(),
                "updated_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=15)).isoformat(),
                "interests_count": 8,
                "quotes_count": 5
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Electrical Wiring Upgrade - ACTIVE",
                "description": "Need to upgrade electrical wiring in living room for new appliances.",
                "category": "Electrical",
                "location": "Lagos",
                "state": "Lagos",
                "lga": "Lagos Island",
                "town": "Victoria Island",
                "zip_code": "101241",
                "home_address": "15 Ahmadu Bello Way, Victoria Island, Lagos",
                "budget_min": 30000,
                "budget_max": 50000,
                "timeline": "Within 1 week",
                "status": "active",
                "homeowner": {
                    "id": current_user.id,
                    "name": current_user.name,
                    "email": current_user.email,
                    "phone": current_user.phone
                },
                "homeowner_id": current_user.id,
                "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
                "updated_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=28)).isoformat(),
                "interests_count": 3,
                "quotes_count": 1
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Painting and Wall Repair - IN PROGRESS",
                "description": "Painting exterior walls and fixing cracks. Work currently in progress.",
                "category": "Painting",
                "location": "Lagos",
                "state": "Lagos",
                "lga": "Lagos Island",
                "town": "Victoria Island",
                "zip_code": "101241",
                "home_address": "15 Ahmadu Bello Way, Victoria Island, Lagos",
                "budget_min": 25000,
                "budget_max": 40000,
                "timeline": "Within 2 weeks",
                "status": "in_progress",
                "homeowner": {
                    "id": current_user.id,
                    "name": current_user.name,
                    "email": current_user.email,
                    "phone": current_user.phone
                },
                "homeowner_id": current_user.id,
                "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
                "updated_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=25)).isoformat(),
                "interests_count": 4,
                "quotes_count": 2
            }
        ]
        
        # Insert sample jobs into database
        created_jobs = []
        for job_data in sample_jobs:
            result = await database.database.jobs.insert_one(job_data)
            job_data["_id"] = str(result.inserted_id)
            created_jobs.append(job_data)
        
        return {
            "message": f"Successfully created {len(created_jobs)} sample jobs",
            "jobs_created": len(created_jobs),
            "completed_jobs": len([j for j in created_jobs if j['status'] == 'completed']),
            "active_jobs": len([j for j in created_jobs if j['status'] == 'active']),
            "in_progress_jobs": len([j for j in created_jobs if j['status'] == 'in_progress']),
        }
        
    except Exception as e:
        logger.error(f"Error creating sample data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create sample data: {str(e)}")

async def _notify_job_posted_successfully_old(homeowner: dict, job: dict):
    """Background task to notify homeowner that job was posted successfully"""
    try:
        # Get homeowner ID
        homeowner_id = homeowner.get("id")
        if not homeowner_id:
            logger.warning("No homeowner ID found in homeowner data")
            return
        
        # Get homeowner preferences
        preferences = await database.get_user_notification_preferences(homeowner_id)
        
        budget_min = job.get("budget_min", 0)
        budget_max = job.get("budget_max", 0)
        has_budget = job.get("budget_min") and job.get("budget_max")
        job_budget = (
            f"₦{budget_min:,} - ₦{budget_max:,}"
            if has_budget
            else "Budget not specified"
        )
        template_data = {
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "job_category": job.get("category", ""),
            "job_budget": job_budget,
            "post_date": "Today",
            "manage_url": "https://servicehub.ng/my-jobs"
        }
        
        # Send notification
        notification = await notification_service.send_notification(
            user_id=homeowner_id,
            notification_type=NotificationType.JOB_POSTED,
            template_data=template_data,
            user_preferences=preferences,
            recipient_email=homeowner.get("email"),
            recipient_phone=homeowner.get("phone")
        )
        
        # Save notification to database
        await database.create_notification(notification)
        
        logger.info(f"✅ Job posted notification sent to homeowner {homeowner_id} for job {job.get('id')}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send job posted notification for job {job.get('id')}: {str(e)}")

# ==========================================
# TRADE CATEGORY QUESTIONS FOR JOB POSTING
# ==========================================

@router.get("/trade-questions/{trade_category}")
async def get_trade_category_questions(trade_category: str):
    """Get questions for a specific trade category (for job posting)"""
    try:
        questions = await database.get_questions_by_trade_category(trade_category)
        
        return {
            "trade_category": trade_category,
            "questions": questions,
            "total_questions": len(questions)
        }
    except Exception as e:
        logger.error(f"Error getting questions for trade category {trade_category}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trade category questions")

@router.post("/trade-questions/answers")
async def save_job_question_answers(
    answers_data: dict,
    current_user: Optional[User] = Depends(get_optional_current_active_user)
):
    """Save answers to trade category questions for a job"""
    try:
        # Validate required fields
        required_fields = ["job_id", "trade_category", "answers"]
        for field in required_fields:
            if field not in answers_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        job_id = answers_data["job_id"]
        
        # Check if it's a regular job or a pending job
        job = await database.get_job_by_id(job_id)
        is_pending = False
        
        if not job:
            job = await database.get_pending_job_by_id(job_id)
            if job:
                is_pending = True
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        # Check ownership: either direct id match or homeowner object id match
        if is_pending:
            job_owner_id = job.get("user_id")
        else:
            job_owner_id = job.get("homeowner_id")
            if not job_owner_id and job.get("homeowner"):
                job_owner_id = job.get("homeowner", {}).get("id")
        
        # For pending jobs, we allow saving without current_user if the job exists
        # (the pending_job_id itself acts as a temporary authorization)
        if not is_pending:
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required for non-pending jobs")
            
            if job_owner_id != current_user.id:
                logger.warning(f"Unauthorized answer save attempt: User {current_user.id} tried to save for job {job_id} owned by {job_owner_id}")
                raise HTTPException(status_code=403, detail="Not authorized to save answers for this job")
        
        saved_answers = await database.save_job_question_answers(answers_data)
        
        if not saved_answers:
            raise HTTPException(status_code=500, detail="Failed to save answers")
        
        return {
            "message": "Job question answers saved successfully",
            "answers": saved_answers
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving job question answers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save job question answers")

@router.get("/trade-questions/answers/{job_id}")
async def get_job_question_answers(job_id: str):
    """Get answers to trade category questions for a job (accessible to job owner and interested tradespeople)"""
    try:
        answers = await database.get_job_question_answers(job_id)
        
        if not answers:
            return {
                "job_id": job_id,
                "answers": [],
                "message": "No answers found for this job"
            }
        
        return answers
    except Exception as e:
        logger.error(f"Error getting job question answers for {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job question answers")

# ==========================================
# FILE UPLOADS FOR JOB QUESTIONS
# ==========================================

uploads_base = Path(__file__).resolve().parent.parent / "uploads" / "jobs"
uploads_base.mkdir(parents=True, exist_ok=True)

@router.post("/trade-questions/upload/{job_id}/{question_id}")
async def upload_job_question_attachment(
    job_id: str,
    question_id: str,
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_active_user)
):
    try:
        # Check if it's a regular job or a pending job
        job = await database.get_job_by_id(job_id)
        is_pending = False
        
        if not job:
            job = await database.get_pending_job_by_id(job_id)
            if job:
                is_pending = True
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        # Check ownership
        if is_pending:
            job_owner_id = job.get("user_id")
        else:
            job_owner_id = job.get("homeowner_id")
            if not job_owner_id and job.get("homeowner"):
                job_owner_id = job.get("homeowner", {}).get("id")
        
        # For pending jobs, we allow upload without current_user
        if not is_pending:
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required for non-pending jobs")
            
            if job_owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to upload for this job")

        question = await database.get_trade_category_question_by_id(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        qtype = str(question.get("question_type"))
        if qtype == "file_upload_image":
            allowed_types = {
                "image/jpeg",
                "image/png",
                "image/webp",
            }
        elif qtype == "file_upload_pdf":
            allowed_types = {
                "application/pdf",
            }
        elif qtype == "file_upload_document":
            allowed_types = {
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
        elif qtype == "file_upload_video":
            allowed_types = {
                "video/mp4",
                "video/quicktime",
            }
        else:
            allowed_types = {
                "image/jpeg",
                "image/png",
                "image/webp",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "video/mp4",
                "video/quicktime",
            }
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        data = await file.read()
        # Reduce max size for base64 storage to avoid hitting MongoDB document limits (16MB total)
        # 5MB limit allows for base64 overhead (~33%) and other document data
        max_bytes = 5 * 1024 * 1024  # 5MB
        if len(data) > max_bytes:
            raise HTTPException(status_code=413, detail="File too large (max 5MB)")

        import base64
        base64_data = base64.b64encode(data).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_data}"

        # Note: We no longer save to disk to avoid ephemeral storage issues
        # The data_url will be stored in the database by the frontend

        # Persist the uploaded file as a job question answer so admin/browse pages
        # can display images even if the job is pending verification.
        try:
            # Build an answers document shape compatible with save_job_question_answers
            existing = await database.get_job_question_answers(job_id)
            if existing and isinstance(existing, dict):
                # Ensure answers list exists
                answers_list = existing.get("answers") or []
            else:
                answers_list = []

            # Create an answer entry for this file upload
            file_entry = {
                "question_id": question_id,
                "question_text": question.get("question") if question else "",
                "question_type": qtype,
                "answer_text": file.filename,
                "answer_value": data_url,
                "content_type": file.content_type,
                "uploaded_at": datetime.utcnow()
            }

            # Append the file entry to answers for this question
            answers_list.append(file_entry)

            answers_doc = {
                "job_id": job_id,
                "trade_category": question.get("category") if question else "",
                "answers": answers_list,
                "created_at": datetime.utcnow()
            }

            # Use database.save_job_question_answers to persist (it replaces existing answers for a job)
            try:
                await database.save_job_question_answers(answers_doc)
            except Exception as e:
                logger.warning(f"Failed to persist uploaded question attachment for job {job_id}: {e}")
        except Exception as e:
            logger.error(f"Error while saving uploaded attachment to DB for {job_id}/{question_id}: {e}")

        return {"filename": file.filename, "content_type": file.content_type, "size": len(data), "url": data_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading job question attachment for {job_id}/{question_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload attachment")

@router.get("/trade-questions/file/{job_id}/{filename}")
async def get_job_question_attachment(
    job_id: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Check if the user is an admin - skip DB check for job if admin
        # The User object is already synthesized with role=ADMIN by the dependency
        # Allow admin role to bypass ownership checks
        if current_user.role == UserRole.ADMIN:
            pass
        else:
            # Regular user checks
            job = await database.get_job_by_id(job_id)
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")

            if current_user.role == UserRole.HOMEOWNER:
                owner_id = job.get("homeowner", {}).get("id") or job.get("homeowner_id")
                if owner_id != current_user.id:
                    raise HTTPException(status_code=403, detail="Access denied")
            elif current_user.role == UserRole.TRADESPERSON:
                interest = await database.get_interest_by_job_and_tradesperson(job_id, current_user.id)
                if not interest or interest.get("status") != "paid_access":
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        job_dir = uploads_base / job_id
        path = job_dir / filename
        if not path.exists():
            raise HTTPException(status_code=404, detail="Attachment not found")
        ext = os.path.splitext(filename)[1].lower()
        media_type = (
            "image/jpeg" if ext in (".jpg", ".jpeg") else
            "image/png" if ext == ".png" else
            "image/webp" if ext == ".webp" else
            "application/pdf" if ext == ".pdf" else
            "application/msword" if ext == ".doc" else
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == ".docx" else
            "video/mp4" if ext == ".mp4" else
            "video/quicktime" if ext in (".mov", ".qt") else
            "application/octet-stream"
        )
        return FileResponse(path, media_type=media_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving job question attachment {job_id}/{filename}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve attachment")

# Public Skills Questions Endpoint (no authentication required)
@router.get("/skills-questions/{trade_category:path}")
async def get_public_skills_questions(
    trade_category: str,
    limit: int = Query(20, ge=1, le=100, description="Number of questions to return"),
):
    """Get skills test questions for a specific trade category (public endpoint for registration)"""
    try:
        import random
        questions = await database.get_questions_for_trade(trade_category)

        active_questions = [q for q in questions if q.get('is_active', True)]
        if len(active_questions) > limit:
            selected = random.sample(active_questions, limit)
        else:
            selected = active_questions

        formatted_questions = []
        for question in selected:
            formatted_questions.append({
                'question': question.get('question'),
                'options': question.get('options', []),
                'correct': question.get('correct_answer', 0),
                'category': question.get('category', 'General'),
                'explanation': question.get('explanation', '')
            })
        
        return {
            'trade_category': trade_category,
            'questions': formatted_questions,
            'count': len(formatted_questions)
        }
        
    except Exception as e:
        logger.error(f"Error getting public skills questions for {trade_category}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get skills questions: {str(e)}")

@router.post("/register-and-post")
async def register_and_post(payload: PublicJobPostRequest, background_tasks: BackgroundTasks):
    try:
        from ..models.nigerian_lgas import validate_lga_for_state, validate_zip_code

        job_data = payload.job

        static_valid = validate_lga_for_state(job_data.state, job_data.lga)
        dynamic_valid = False
        try:
            custom_lgas_cursor = database.database.system_locations.find({
                "state": job_data.state,
                "type": "lga"
            })
            custom_lgas_docs = await custom_lgas_cursor.to_list(length=None)
            custom_lgas = [lga["name"] for lga in custom_lgas_docs]
            dynamic_valid = job_data.lga in custom_lgas
        except Exception as e:
            logger.warning(f"Error checking dynamic LGAs: {e}")

        if not (static_valid or dynamic_valid):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"LGA '{job_data.lga}' does not belong to state "
                    f"'{job_data.state}'"
                ),
            )

        if not validate_zip_code(job_data.zip_code, job_data.state, job_data.lga):
            raise HTTPException(status_code=400, detail="Invalid zip code format. Nigerian zip codes must be 6 digits.")

        if not validate_password_strength(payload.password):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Password must be at least 8 characters long and contain "
                    "uppercase, lowercase, numeric, and special characters"
                ),
            )

        if not validate_nigerian_phone(job_data.homeowner_phone):
            raise HTTPException(status_code=400, detail="Please enter a valid Nigerian phone number")

        formatted_phone = format_nigerian_phone(job_data.homeowner_phone)

        existing_user = None
        try:
            if getattr(database, "connected", False) and getattr(database, "database", None) is not None:
                existing_user = await database.get_user_by_email(job_data.homeowner_email)
        except Exception as e:
            logger.warning(f"Skipping existing-user email check due to DB error: {e}")

        created_user = None
        if existing_user:
            try:
                if not verify_password(payload.password, existing_user.get("password_hash", "")):
                    raise HTTPException(status_code=401, detail="Incorrect password for existing account")
            except Exception:
                raise HTTPException(status_code=401, detail="Incorrect password for existing account")
            created_user = existing_user
        else:
            user_id = str(uuid.uuid4())
            user_data = {
                "id": user_id,
                "name": job_data.homeowner_name,
                "email": job_data.homeowner_email,
                "phone": formatted_phone,
                "password_hash": get_password_hash(payload.password),
                "role": UserRole.HOMEOWNER,
                "status": UserStatus.ACTIVE,
                "location": job_data.state,
                "postcode": job_data.zip_code,
                "email_verified": False,
                "phone_verified": False,
                "is_verified": False,
                "verification_submitted": False,
                "total_referrals": 0,
                "referral_coins_earned": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "avatar_url": None,
                "last_login": None,
            }
            if getattr(database, "connected", False) and getattr(database, "database", None) is not None:
                created_user = await database.create_user(user_data)
                try:
                    await database.generate_referral_code(created_user["id"])
                except Exception:
                    pass
            else:
                raise HTTPException(status_code=503, detail="Service temporarily unavailable")

        user_obj = User(**{k: v for k, v in created_user.items() if k != "password_hash"})

        # Require email verification before posting job
        if not getattr(user_obj, "email_verified", False):
            try:
                token_expires = timedelta(hours=24)
                verification_token = create_email_verification_token(
                    user_id=user_obj.id, email=user_obj.email, expires_delta=token_expires
                )
                expires_at = datetime.utcnow() + token_expires
                await database.create_email_verification_token(
                    user_id=user_obj.id, token=verification_token, expires_at=expires_at
                )
                
                # Store job data in pending_jobs to be created after verification
                pending_data = job_data.dict()
                if payload.question_answers:
                    pending_data["question_answers"] = payload.question_answers
                
                pending_job = await database.create_pending_job(
                    user_id=user_obj.id,
                    job_data=pending_data,
                    expires_at=expires_at,
                )

                email_service = None
                try:
                    email_service = SendGridEmailService()
                except Exception:
                    try:
                        email_service = MockEmailService()
                    except Exception:
                        email_service = None
                
                dev_flag = os.environ.get('OTP_DEV_MODE', '0')
                frontend_url = os.environ.get('FRONTEND_URL') or (
                    'http://localhost:3000' if dev_flag in ('1', 'true', 'True') else 'https://servicehub.ng'
                )
                verify_link = f"{frontend_url.rstrip('/')}/verify-account?token={verification_token}&next=/"
                
                if email_service:
                    html = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #e0e0e0; background-color: #121212; margin: 0; padding: 0; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1e1e1e; border-radius: 12px; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }}
                        h2 {{ color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 600; }}
                        p {{ color: #cccccc; font-size: 16px; margin-bottom: 20px; }}
                        .btn {{ display: inline-block; background-color: #34D164; color: #ffffff !important; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 10px; margin-bottom: 10px; transition: background-color 0.3s; }}
                        .btn:hover {{ background-color: #2cb555; }}
                        .link {{ word-break: break-all; color: #34D164; font-size: 14px; }}
                        .footer {{ margin-top: 30px; font-size: 12px; color: #888888; text-align: center; border-top: 1px solid #333; padding-top: 20px; }}
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <h2>Verify your email</h2>
                        <p>Hello {user_obj.name},</p>
                        <p>Please verify your email to post your job and activate your account.</p>
                        <p style="text-align: center;">
                          <a class="btn" href="{verify_link}">Verify Email</a>
                        </p>
                        <p>If the button doesn’t work, copy and paste this link:</p>
                        <p><a href="{verify_link}" class="link">{verify_link}</a></p>
                        <p class="footer">This link expires in 24 hours.</p>
                      </div>
                    </body>
                    </html>
                    """
                    
                    background_tasks.add_task(
                        email_service.send_email,
                        to=user_obj.email,
                        subject="Verify your email - ServiceHub",
                        content=html,
                        metadata={"purpose": "email_verification", "user_id": user_obj.id}
                    )
                
                logger.info(f"Verification email task added for {user_obj.email}")

                # Stop here and return a structured 202 response to the frontend with pending_job_id
                # Frontends may not reliably parse error bodies on non-200 responses; a JSONResponse
                # makes it explicit that verification is required and provides the pending_job_id
                # so clients can save question answers and attachments against the pending job.
                resp_body = {
                    "message": "Email verification required",
                    "verification_required": True,
                    "pending_job_id": pending_job.get("id")
                }
                try:
                    # Include debug link for development mode if available
                    dev_flag = os.environ.get('OTP_DEV_MODE', '0')
                    if dev_flag in ('1', 'true', 'True') and verify_link:
                        resp_body["debug_link"] = verify_link
                except Exception:
                    pass

                return JSONResponse(status_code=202, content=resp_body)

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Failed to send verification email during register-and-post: {e}")

        job_dict = job_data.dict()
        job_dict["location"] = job_data.state
        job_dict["postcode"] = job_data.zip_code
        job_dict["homeowner"] = {
            "id": user_obj.id,
            "name": user_obj.name,
            "email": user_obj.email,
            "phone": user_obj.phone,
        }
        job_dict["homeowner_id"] = user_obj.id
        for field in ["homeowner_name", "homeowner_email", "homeowner_phone"]:
            if field in job_dict:
                del job_dict[field]
        job_dict["id"] = await database.generate_job_id(digits=6)
        job_dict["status"] = "pending_approval"
        job_dict["quotes_count"] = 0
        job_dict["interests_count"] = 0
        job_dict["access_fee_naira"] = 1000
        job_dict["access_fee_coins"] = 10
        job_dict["created_at"] = datetime.utcnow()
        job_dict["updated_at"] = datetime.utcnow()
        job_dict["expires_at"] = datetime.utcnow() + timedelta(days=30)

        created_job = await database.create_job(job_dict)

        # If there are question answers and user IS verified, save them now
        if payload.question_answers:
            try:
                # Prepare answers data
                ans_data = payload.question_answers.copy()
                ans_data["job_id"] = created_job["id"]
                await database.save_job_question_answers(ans_data)
            except Exception as e:
                logger.error(f"Failed to save question answers for verified user: {e}")

        # Notify homeowner only; tradespeople will be notified after admin approval
        background_tasks.add_task(
            _notify_job_posted_successfully,
            homeowner=user_obj.dict(),
            job=created_job,
        )

        access_token_expires = timedelta(minutes=60 * 24)
        access_token = create_access_token(
            data={
                "sub": user_obj.id,
                "email": user_obj.email,
                "role": UserRole.HOMEOWNER.value,
                "name": user_obj.name,
                "phone": user_obj.phone,
                "status": user_obj.status.value if isinstance(user_obj.status, UserStatus) else user_obj.status,
                "location": user_obj.location,
                "postcode": user_obj.postcode,
            },
            expires_delta=access_token_expires,
        )
        refresh_token = create_refresh_token(data={"sub": user_obj.id, "email": user_obj.email})

        return {
            "job": created_job,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 60 * 60 * 24,
            "user": user_obj.dict(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to register and post job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register and post job")


from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from typing import Optional
from models import JobCreate, JobUpdate, JobCloseRequest, Job, JobsResponse
from models.base import JobStatus
from models.auth import User
from models.notifications import NotificationType
from auth.dependencies import get_current_active_user, get_current_homeowner
from database import database
from services.notifications import notification_service
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Public endpoints for location data
@router.get("/locations/states")
async def get_states_public():
    """Get all available states for job posting and registration (public endpoint)"""
    # Get states from database (new ones added by admin)
    custom_states = await database.get_custom_states()
    
    # Get default states from constants
    from models.nigerian_states import NIGERIAN_STATES
    
    # Combine both lists and remove duplicates
    all_states = list(set(NIGERIAN_STATES + custom_states))
    all_states.sort()  # Sort alphabetically
    
    return {"states": all_states}

@router.post("/", response_model=Job)
async def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Create a new job posting"""
    try:
        from models.nigerian_lgas import validate_lga_for_state, validate_zip_code
        
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
                detail=f"LGA '{job_data.lga}' does not belong to state '{job_data.state}'"
            )
        
        # Validate zip code format
        if not validate_zip_code(job_data.zip_code, job_data.state, job_data.lga):
            raise HTTPException(
                status_code=400,
                detail="Invalid zip code format. Nigerian zip codes must be 6 digits."
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
        job_dict['id'] = str(uuid.uuid4())
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
        
        # Add background task to send job posted notification
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
    current_user: User = Depends(get_current_active_user)
):
    """Get jobs filtered by tradesperson's skills and location preferences"""
    try:
        # Ensure user is a tradesperson
        if current_user.role != "tradesperson":
            raise HTTPException(status_code=403, detail="This endpoint is for tradespeople only")
        
        jobs = await database.get_jobs_for_tradesperson(
            tradesperson_id=current_user.id,
            skip=skip,
            limit=limit
        )
        
        # Get tradesperson details for response
        tradesperson_info = {
            "trade_categories": current_user.trade_categories if hasattr(current_user, 'trade_categories') else [],
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
                template_data = {
                    "tradesperson_name": tradesperson_info.get("name", "Tradesperson"),
                    "job_title": job.get("title", "Untitled Job"),
                    "job_location": job.get("location", ""),
                    "homeowner_name": homeowner.name,
                    "completion_date": datetime.utcnow().strftime("%B %d, %Y"),
                    "interests_url": "https://servicehub.ng/my-interests"
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
                logger.error(f"❌ Failed to send job completion notification to tradesperson {tradesperson_id}: {str(e)}")
                continue
        
        logger.info(f"✅ Job completion notifications sent to all interested tradespeople for job {job_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in job completion notification: {str(e)}")

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
        
        # Prepare notification template data
        template_data = {
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "job_category": job.get("category", ""),
            "job_budget": f"₦{job.get('budget_min', 0):,} - ₦{job.get('budget_max', 0):,}" if job.get('budget_min') and job.get('budget_max') else "Budget not specified",
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

async def notify_job_cancellation(job_id: str, job: dict, homeowner: User, reason: str, feedback: str):
    """Background task to notify interested tradespeople about job cancellation"""
    try:
        logger.info(f"Job {job_id} cancelled by homeowner {homeowner.id} - Reason: {reason}")
        
        # Get all interested tradespeople for this job
        interested_tradespeople = await database.get_interested_tradespeople_for_job(job_id)
        
        if not interested_tradespeople:
            logger.info(f"No interested tradespeople found for cancelled job {job_id}")
            return
        
        logger.info(f"Found {len(interested_tradespeople)} interested tradespeople for cancelled job {job_id}")
        
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
                template_data = {
                    "tradesperson_name": tradesperson_info.get("name", "Tradesperson"),
                    "job_title": job.get("title", "Untitled Job"),
                    "job_location": job.get("location", ""),
                    "homeowner_name": homeowner.name,
                    "cancellation_reason": reason,
                    "additional_feedback": feedback if feedback else "No additional feedback provided",
                    "cancellation_date": datetime.utcnow().strftime("%B %d, %Y"),
                    "browse_jobs_url": "https://servicehub.ng/jobs"
                }
                
                # Send notification
                notification = await notification_service.send_notification(
                    user_id=tradesperson_id,
                    notification_type=NotificationType.JOB_CANCELLED,
                    template_data=template_data,
                    user_preferences=preferences,
                    recipient_email=tradesperson_info.get("email"),
                    recipient_phone=tradesperson_info.get("phone")
                )
                
                # Save notification to database
                await database.create_notification(notification)
                
                logger.info(f"✅ Job cancellation notification sent to tradesperson {tradesperson_id}")
                
            except Exception as e:
                logger.error(f"❌ Failed to send job cancellation notification to tradesperson {tradesperson_id}: {str(e)}")
                continue
        
        logger.info(f"✅ Job cancellation notifications sent to all interested tradespeople for job {job_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in job cancellation notification: {str(e)}")

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
                "description": "Fixed leaky faucet and improved water pressure. Job completed successfully with excellent results.",
                "category": "Plumbing",
                "location": "Lagos",
                "state": "Lagos",
                "lga": "Lagos Island", 
                "town": "Victoria Island",
                "zip_code": "101241",
                "home_address": "15 Ahmadu Bello Way, Victoria Island, Lagos",
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
            "in_progress_jobs": len([j for j in created_jobs if j['status'] == 'in_progress'])
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
        
        # Prepare template data
        template_data = {
            "homeowner_name": homeowner.get("name", "Homeowner"),
            "job_title": job.get("title", "Untitled Job"),
            "job_location": job.get("location", ""),
            "job_category": job.get("category", ""),
            "job_budget": f"₦{job.get('budget_min', 0):,} - ₦{job.get('budget_max', 0):,}" if job.get('budget_min') and job.get('budget_max') else "Budget not specified",
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
    current_user: User = Depends(get_current_homeowner)
):
    """Save answers to trade category questions for a job"""
    try:
        # Validate required fields
        required_fields = ["job_id", "trade_category", "answers"]
        for field in required_fields:
            if field not in answers_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Verify job belongs to current user
        job = await database.get_job_by_id(answers_data["job_id"])
        if not job or job.get("homeowner", {}).get("id") != current_user.id:
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

# Public Skills Questions Endpoint (no authentication required)
@router.get("/skills-questions/{trade_category}")
async def get_public_skills_questions(trade_category: str):
    """Get skills test questions for a specific trade category (public endpoint for registration)"""
    try:
        questions = await database.get_questions_for_trade(trade_category)
        
        # Format questions for frontend consumption
        formatted_questions = []
        for question in questions:
            if question.get('is_active', True):  # Only include active questions
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


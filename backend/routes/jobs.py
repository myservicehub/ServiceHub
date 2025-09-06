from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from typing import Optional, List
from models import JobCreate, Job, JobsResponse
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

@router.post("/", response_model=Job)
async def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_homeowner)
):
    """Create a new job posting"""
    try:
        # Convert to dict and prepare for database
        job_dict = job_data.dict()
        
        # Create homeowner object using current user data
        job_dict['homeowner'] = {
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email,
            'phone': current_user.phone
        }
        
        # Remove homeowner fields from job_data if they exist
        for field in ['homeowner_name', 'homeowner_email', 'homeowner_phone']:
            if field in job_dict:
                del job_dict[field]
        
        # Add default values
        job_dict['id'] = str(uuid.uuid4())
        job_dict['status'] = 'active'
        job_dict['quotes_count'] = 0
        job_dict['interests_count'] = 0  # Add interests count
        job_dict['access_fee_naira'] = 1500  # Default access fee ₦1500
        job_dict['access_fee_coins'] = 15    # Default access fee 15 coins
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
    """Get jobs filtered by tradesperson's location and travel preferences"""
    try:
        # Ensure user is a tradesperson
        if current_user.role != "tradesperson":
            raise HTTPException(status_code=403, detail="This endpoint is for tradespeople only")
        
        jobs = await database.get_jobs_for_tradesperson(
            tradesperson_id=current_user.id,
            skip=skip,
            limit=limit
        )
        
        return {
            "jobs": jobs,
            "total": len(jobs),
            "user_location": {
                "latitude": current_user.latitude,
                "longitude": current_user.longitude,
                "travel_distance_km": current_user.travel_distance_km
            } if current_user.latitude and current_user.longitude else None,
            "pagination": {
                "skip": skip,
                "limit": limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting jobs for tradesperson: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get jobs for tradesperson: {str(e)}")

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

async def _notify_job_posted_successfully(homeowner: dict, job: dict):
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
            "manage_url": f"https://servicehub.ng/my-jobs"
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
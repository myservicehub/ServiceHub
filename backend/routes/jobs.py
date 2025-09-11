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
        
        # Remove homeowner fields from job_data if they exist
        for field in ['homeowner_name', 'homeowner_email', 'homeowner_phone']:
            if field in job_dict:
                del job_dict[field]
        
        # Add default values
        job_dict['id'] = str(uuid.uuid4())
        job_dict['status'] = 'active'
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


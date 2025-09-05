from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from models import JobCreate, Job, JobsResponse
from database import database
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.post("/", response_model=Job)
async def create_job(job_data: JobCreate):
    """Create a new job posting"""
    try:
        print(f"DEBUG: Received job_data: {job_data}")
        print(f"DEBUG: job_data type: {type(job_data)}")
        print(f"DEBUG: job_data dict: {job_data.dict()}")
        
        # Convert to dict and prepare for database
        job_dict = job_data.dict()
        
        # Create homeowner object
        job_dict['homeowner'] = {
            'name': job_dict.pop('homeowner_name'),
            'email': job_dict.pop('homeowner_email'),
            'phone': job_dict.pop('homeowner_phone')
        }
        
        # Add default values
        job_dict['id'] = str(uuid.uuid4())  # Generate new ID
        job_dict['status'] = 'active'
        job_dict['quotes_count'] = 0
        job_dict['created_at'] = datetime.utcnow()
        job_dict['updated_at'] = datetime.utcnow()
        job_dict['expires_at'] = datetime.utcnow() + timedelta(days=30)
        
        # Save to database
        created_job = await database.create_job(job_dict)
        
        return Job(**created_job)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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

@router.get("/search", response_model=JobsResponse)
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
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from models import QuoteCreate, Quote, QuotesResponse, Job
from models.auth import User
from auth.dependencies import get_current_active_user, get_current_tradesperson, get_current_homeowner
from database import database
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/quotes", tags=["quotes"])

@router.post("/", response_model=Quote)
async def create_quote(
    quote_data: QuoteCreate, 
    current_user: User = Depends(get_current_tradesperson)
):
    """Submit a quote for a job (tradesperson only)"""
    try:
        # Override tradesperson_id with current authenticated user
        quote_data.tradesperson_id = current_user.id
        
        # Check if job exists and is active
        job = await database.get_job_by_id(quote_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job['status'] != 'active':
            raise HTTPException(status_code=400, detail="Job is not active")
        
        # Check if job is expired
        if job['expires_at'] <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Job has expired")
        
        # Check if tradesperson already quoted for this job
        existing_quotes = await database.get_quotes_by_job(quote_data.job_id)
        for quote in existing_quotes:
            if quote['tradesperson_id'] == current_user.id:
                raise HTTPException(status_code=400, detail="You have already quoted for this job")
        
        # Check quote limit (max 5 quotes per job)
        if len(existing_quotes) >= 5:
            raise HTTPException(status_code=400, detail="This job has reached the maximum number of quotes")
        
        # Validate that tradesperson's skills match job category
        if current_user.trade_categories and job['category'] not in current_user.trade_categories:
            raise HTTPException(
                status_code=400, 
                detail=f"Your skills don't match this job category: {job['category']}"
            )
        
        # Convert to dict and prepare for database
        quote_dict = quote_data.dict()
        quote_dict['id'] = str(uuid.uuid4())
        quote_dict['status'] = 'pending'
        quote_dict['created_at'] = datetime.utcnow()
        quote_dict['updated_at'] = datetime.utcnow()
        quote_dict['tradesperson_id'] = current_user.id
        
        # Convert start_date to datetime if it's a string
        if isinstance(quote_dict['start_date'], str):
            quote_dict['start_date'] = datetime.fromisoformat(quote_dict['start_date'].replace('Z', '+00:00'))
        
        # Save to database
        created_quote = await database.create_quote(quote_dict)
        
        # Update job quotes count
        await database.update_job_quotes_count(quote_data.job_id)
        
        return Quote(**created_quote)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/job/{job_id}", response_model=QuotesResponse)
async def get_job_quotes(
    job_id: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Get all quotes for a specific job (homeowner only - must own the job)"""
    try:
        # Check if job exists
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if current user owns this job
        if job['homeowner']['email'] != current_user.email:
            raise HTTPException(
                status_code=403, 
                detail="You can only view quotes for your own jobs"
            )
        
        # Get quotes with tradesperson details
        quotes = await database.get_quotes_with_tradesperson_details(job_id)
        
        return {
            "quotes": quotes,
            "job": job,
            "total_quotes": len(quotes)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-quotes")
async def get_my_quotes(
    current_user: User = Depends(get_current_tradesperson),
    status: Optional[str] = Query(None, description="Filter by quote status"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Get quotes submitted by current tradesperson"""
    try:
        skip = (page - 1) * limit
        
        # Build filters
        filters = {"tradesperson_id": current_user.id}
        if status:
            filters["status"] = status
        
        # Get quotes with job details
        quotes = await database.get_tradesperson_quotes_with_job_details(
            current_user.id, 
            filters=filters, 
            skip=skip, 
            limit=limit
        )
        
        total_quotes = await database.get_tradesperson_quotes_count(current_user.id, filters)
        
        return {
            "quotes": quotes,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_quotes,
                "pages": (total_quotes + limit - 1) // limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{quote_id}/status")
async def update_quote_status(
    quote_id: str,
    status: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Update quote status (accept/reject) - homeowner only"""
    try:
        if status not in ['accepted', 'rejected']:
            raise HTTPException(
                status_code=400, 
                detail="Status must be 'accepted' or 'rejected'"
            )
        
        # Get quote details
        quote = await database.get_quote_by_id(quote_id)
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Get job details to verify ownership
        job = await database.get_job_by_id(quote['job_id'])
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if current user owns this job
        if job['homeowner']['email'] != current_user.email:
            raise HTTPException(
                status_code=403, 
                detail="You can only manage quotes for your own jobs"
            )
        
        # Update quote status
        await database.update_quote_status(quote_id, status)
        
        # If accepted, reject all other quotes for this job
        if status == 'accepted':
            await database.reject_other_quotes(quote['job_id'], quote_id)
            # Optionally update job status to 'in_progress'
            await database.update_job_status(quote['job_id'], 'in_progress')
        
        return {"message": f"Quote {status} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/job/{job_id}/summary")
async def get_quote_summary(
    job_id: str,
    current_user: User = Depends(get_current_homeowner)
):
    """Get quote summary for a job (homeowner only)"""
    try:
        # Check if job exists and user owns it
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job['homeowner']['email'] != current_user.email:
            raise HTTPException(
                status_code=403, 
                detail="You can only view quotes for your own jobs"
            )
        
        # Get quote statistics
        quote_stats = await database.get_quote_statistics(job_id)
        
        return {
            "job_id": job_id,
            "job_title": job['title'],
            "total_quotes": quote_stats['total_quotes'],
            "pending_quotes": quote_stats['pending_quotes'],
            "accepted_quotes": quote_stats['accepted_quotes'],
            "rejected_quotes": quote_stats['rejected_quotes'],
            "average_price": quote_stats['average_price'],
            "price_range": {
                "min": quote_stats['min_price'],
                "max": quote_stats['max_price']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-jobs")
async def get_available_jobs(
    current_user: User = Depends(get_current_tradesperson),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Get jobs available for quoting based on tradesperson's skills"""
    try:
        skip = (page - 1) * limit
        
        # Get jobs matching tradesperson's categories
        available_jobs = await database.get_jobs_for_tradesperson(
            tradesperson_id=current_user.id,
            trade_categories=current_user.trade_categories or [],
            skip=skip,
            limit=limit
        )
        
        total_jobs = await database.get_available_jobs_count_for_tradesperson(
            tradesperson_id=current_user.id,
            trade_categories=current_user.trade_categories or []
        )
        
        return {
            "jobs": available_jobs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_jobs,
                "pages": (total_jobs + limit - 1) // limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
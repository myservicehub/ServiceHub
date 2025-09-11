from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import sys
import os
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)
import models
from models.reviews import Review as AdvancedReview
from database import database
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("/", response_model=models.Review)
async def create_review(review_data: models.ReviewCreate):
    """Create a new review"""
    try:
        # Check if job exists
        job = await database.get_job_by_id(review_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if tradesperson exists
        tradesperson = await database.get_tradesperson_by_id(review_data.tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Check if review already exists for this job-tradesperson combination
        existing_review = await database.get_review_by_job_and_tradesperson(
            review_data.job_id, review_data.tradesperson_id
        )
        if existing_review:
            raise HTTPException(status_code=400, detail="Review already exists for this job")
        
        # Convert to dict and prepare for database
        review_dict = review_data.dict()
        review_dict['id'] = str(uuid.uuid4())
        review_dict['location'] = job['location']  # Get location from job
        review_dict['featured'] = False
        review_dict['created_at'] = datetime.utcnow()
        review_dict['updated_at'] = datetime.utcnow()
        
        # Save to database
        created_review = await database.create_review(review_dict)
        
        # Update tradesperson's average rating
        await database.update_tradesperson_rating(review_data.tradesperson_id)
        
        return models.Review(**created_review)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=models.ReviewsResponse)
async def get_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    tradesperson_id: Optional[str] = None
):
    """Get reviews with pagination and filters"""
    try:
        skip = (page - 1) * limit
        
        # Build filters
        filters = {}
        if min_rating is not None:
            filters['rating'] = {'$gte': min_rating}
        if tradesperson_id:
            filters['tradesperson_id'] = tradesperson_id
        
        # Get reviews and total count
        reviews = await database.get_reviews(skip=skip, limit=limit, filters=filters)
        total_reviews = await database.get_reviews_count(filters=filters)
        
        # Convert to Review objects
        review_objects = [models.Review(**review) for review in reviews]
        
        # Calculate pagination
        total_pages = (total_reviews + limit - 1) // limit
        
        return models.ReviewsResponse(
            reviews=review_objects,
            pagination={
                "page": page,
                "limit": limit,
                "total": total_reviews,
                "pages": total_pages
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/featured")
async def get_featured_reviews(limit: int = Query(6, ge=1, le=20)):
    """Get featured reviews for homepage"""
    try:
        reviews = await database.get_featured_reviews(limit=limit)
        return [models.Review(**review) for review in reviews]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{review_id}", response_model=models.Review)
async def get_review(review_id: str):
    """Get a specific review by ID"""
    try:
        review = await database.get_review_by_id(review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return models.Review(**review)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
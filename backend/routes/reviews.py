from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import ReviewCreate, Review, ReviewsResponse
from database import database
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("/", response_model=Review)
async def create_review(review_data: ReviewCreate):
    """Submit a review for a completed job"""
    try:
        # Check if job exists
        job = await database.get_job_by_id(review_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if tradesperson exists
        tradesperson = await database.get_tradesperson_by_id(review_data.tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Check if review already exists for this job
        existing_reviews = await database.get_reviews(filters={
            "job_id": review_data.job_id,
            "tradesperson_id": review_data.tradesperson_id
        })
        
        if existing_reviews:
            raise HTTPException(status_code=400, detail="Review already exists for this job")
        
        # Convert to dict and prepare for database
        review_dict = review_data.dict()
        review_dict['id'] = str(uuid.uuid4())  # Generate new ID
        review_dict['location'] = job['location']  # Get location from job
        review_dict['featured'] = False
        review_dict['created_at'] = datetime.utcnow()
        review_dict['updated_at'] = datetime.utcnow()
        
        # Save to database
        created_review = await database.create_review(review_dict)
        
        # Update tradesperson statistics
        await database.update_tradesperson_stats(review_data.tradesperson_id)
        
        return Review(**created_review)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=ReviewsResponse)
async def get_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    featured: Optional[bool] = Query(None, description="Filter featured reviews"),
    tradesperson_id: Optional[str] = Query(None, description="Filter by tradesperson"),
    min_rating: Optional[int] = Query(None, ge=1, le=5)
):
    """Get reviews with pagination and filters"""
    try:
        skip = (page - 1) * limit
        
        # Build filters
        filters = {}
        
        if featured is not None:
            filters['featured'] = featured
            
        if tradesperson_id:
            filters['tradesperson_id'] = tradesperson_id
            
        if min_rating is not None:
            filters['rating'] = {'$gte': min_rating}
        
        # Get reviews and total count
        reviews = await database.get_reviews(skip=skip, limit=limit, filters=filters)
        total_reviews = await database.get_reviews_count(filters=filters)
        
        # Convert to Review objects
        review_objects = [Review(**review) for review in reviews]
        
        # Calculate pagination
        total_pages = (total_reviews + limit - 1) // limit
        
        return ReviewsResponse(
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

@router.get("/featured", response_model=list[Review])
async def get_featured_reviews(limit: int = Query(4, ge=1, le=10)):
    """Get featured reviews for homepage"""
    try:
        # Get recent high-rated reviews
        filters = {
            'rating': {'$gte': 4},
            'featured': True
        }
        
        reviews = await database.get_reviews(limit=limit, filters=filters)
        
        # If not enough featured reviews, get recent high-rated ones
        if len(reviews) < limit:
            additional_filters = {'rating': {'$gte': 4}}
            additional_reviews = await database.get_reviews(
                limit=limit - len(reviews), 
                filters=additional_filters
            )
            reviews.extend(additional_reviews)
        
        # Convert to Review objects
        return [Review(**review) for review in reviews[:limit]]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
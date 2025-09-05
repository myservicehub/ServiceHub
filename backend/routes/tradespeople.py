from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from models import TradespersonCreate, Tradesperson, TradespeopleResponse
from database import database
from datetime import datetime

router = APIRouter(prefix="/api/tradespeople", tags=["tradespeople"])

@router.post("/", response_model=Tradesperson)
async def create_tradesperson(tradesperson_data: TradespersonCreate):
    """Register a new tradesperson"""
    try:
        # Check if email already exists
        existing = await database.get_tradesperson_by_email(tradesperson_data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Convert to dict and prepare for database
        tradesperson_dict = tradesperson_data.dict()
        tradesperson_dict['id'] = Tradesperson().id  # Generate new ID
        tradesperson_dict['average_rating'] = 0.0
        tradesperson_dict['total_reviews'] = 0
        tradesperson_dict['total_jobs'] = 0
        tradesperson_dict['verified'] = False
        tradesperson_dict['created_at'] = datetime.utcnow()
        tradesperson_dict['updated_at'] = datetime.utcnow()
        
        # Save to database
        created_tradesperson = await database.create_tradesperson(tradesperson_dict)
        
        return Tradesperson(**created_tradesperson)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=TradespeopleResponse)
async def get_tradespeople(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5)
):
    """Get tradespeople with filters"""
    try:
        skip = (page - 1) * limit
        
        # Build filters
        filters = {}
        
        if category:
            filters['trade_categories'] = category
            
        if location:
            filters['location'] = {'$regex': location, '$options': 'i'}
            
        if min_rating is not None:
            filters['average_rating'] = {'$gte': min_rating}
        
        # Get tradespeople and total count
        tradespeople = await database.get_tradespeople(skip=skip, limit=limit, filters=filters)
        total_tradespeople = await database.get_tradespeople_count(filters=filters)
        
        # Convert to Tradesperson objects
        tradesperson_objects = [Tradesperson(**tp) for tp in tradespeople]
        
        return TradespeopleResponse(
            tradespeople=tradesperson_objects,
            total=total_tradespeople
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tradesperson_id}", response_model=Tradesperson)
async def get_tradesperson(tradesperson_id: str):
    """Get a specific tradesperson by ID"""
    try:
        tradesperson = await database.get_tradesperson_by_id(tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        return Tradesperson(**tradesperson)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tradesperson_id}/reviews")
async def get_tradesperson_reviews(
    tradesperson_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=20)
):
    """Get reviews for a specific tradesperson"""
    try:
        # Check if tradesperson exists
        tradesperson = await database.get_tradesperson_by_id(tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        skip = (page - 1) * limit
        reviews = await database.get_reviews_by_tradesperson(
            tradesperson_id, skip=skip, limit=limit
        )
        
        return {
            "reviews": reviews,
            "tradesperson": tradesperson
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
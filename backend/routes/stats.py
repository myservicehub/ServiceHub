from fastapi import APIRouter, HTTPException
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import StatsResponse
from database import database

router = APIRouter(prefix="/api/stats", tags=["statistics"])

@router.get("/", response_model=StatsResponse)
async def get_platform_stats():
    """Get platform statistics"""
    try:
        stats = await database.get_platform_stats()
        return StatsResponse(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories_with_stats():
    """Get trade categories with tradesperson counts"""
    try:
        categories = await database.get_categories_with_counts()
        return {"categories": categories}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
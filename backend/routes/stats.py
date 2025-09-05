from fastapi import APIRouter, HTTPException
import sys
import os
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)
import models
from database import database

router = APIRouter(prefix="/api/stats", tags=["statistics"])

@router.get("/", response_model=models.StatsResponse)
async def get_platform_stats():
    """Get platform statistics"""
    try:
        stats = await database.get_platform_stats()
        return models.StatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories_with_counts():
    """Get all categories with tradesperson counts"""
    try:
        categories = await database.get_categories_with_counts()
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
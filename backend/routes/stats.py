from fastapi import APIRouter, HTTPException
from .. import models
from ..database import database
from ..utils.cache import get_cache
import os

router = APIRouter(prefix="/api/stats", tags=["statistics"])

@router.get("", response_model=models.StatsResponse)
@router.get("/", response_model=models.StatsResponse)
async def get_platform_stats():
    """Get platform statistics"""
    try:
        cache = get_cache()
        ttl = int(os.getenv("STATS_CACHE_TTL_SEC", "60"))
        key = "stats:platform"

        cached = await cache.get_json(key)
        if cached:
            return models.StatsResponse(**cached)

        stats = await database.get_platform_stats()
        await cache.set_json(key, stats, ttl=ttl)
        return models.StatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories_with_counts():
    """Get all categories with tradesperson counts"""
    try:
        cache = get_cache()
        ttl = int(os.getenv("STATS_CATEGORIES_CACHE_TTL_SEC", "300"))
        key = "stats:categories"

        cached = await cache.get_json(key)
        if cached:
            return {"categories": cached}

        categories = await database.get_categories_with_counts()
        await cache.set_json(key, categories, ttl=ttl)
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
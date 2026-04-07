from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from .. import models
from ..database import database
from datetime import datetime
import uuid
import re

router = APIRouter(prefix="/api/tradespeople", tags=["tradespeople"])

def _normalized_experience(source: dict):
    # Experience may be stored in multiple shapes depending on which frontend flow saved it.
    # Keep this extraction broad so list endpoints are consistent.
    professional_info = source.get("professional_information") or source.get("professionalInformation") or {}
    experience_obj = source.get("experience") if isinstance(source.get("experience"), dict) else {}

    candidates = [
        # flat (preferred)
        source.get("experience_years"),
        source.get("years_experience"),
        source.get("years_of_experience"),
        source.get("experienceYears"),
        source.get("yearsExperience"),
        # nested professional info
        professional_info.get("experience_years") if isinstance(professional_info, dict) else None,
        professional_info.get("years_experience") if isinstance(professional_info, dict) else None,
        professional_info.get("years_of_experience") if isinstance(professional_info, dict) else None,
        professional_info.get("experienceYears") if isinstance(professional_info, dict) else None,
        # nested experience object
        experience_obj.get("years") if isinstance(experience_obj, dict) else None,
        experience_obj.get("experience_years") if isinstance(experience_obj, dict) else None,
        experience_obj.get("years_of_experience") if isinstance(experience_obj, dict) else None,
        # fallback raw
        source.get("experience"),
    ]

    raw = next((v for v in candidates if v not in (None, "")), None)
    level = (
        source.get("experience_level")
        or (professional_info.get("experience_level") if isinstance(professional_info, dict) else None)
        or (experience_obj.get("experience_level") if isinstance(experience_obj, dict) else None)
    )
    if not level and isinstance(raw, str) and ("-" in raw or "+" in raw):
        level = raw
    # Normalize blank levels to None so consumers don't treat "" as meaningful.
    if isinstance(level, str) and level.strip() == "":
        level = None

    if raw is None:
        return None, level
    if isinstance(raw, (int, float)):
        return float(raw), level
    if isinstance(raw, str):
        nums = [int(n) for n in re.findall(r"\d+", raw)]
        if len(nums) == 0:
            return 0.0, (level or raw)
        if len(nums) == 1:
            return float(nums[0]), (level or raw)
        return float(max(nums)), (level or raw)
    return None, level

async def _trade_aliases(trade: str) -> List[str]:
    base = (trade or "").strip()
    if not base:
        return []
    aliases = {base}
    lower = base.lower()
    if lower.endswith(" services"):
        aliases.add(base[:-9].strip())
    else:
        aliases.add(f"{base} Services")
    try:
        collection = getattr(getattr(database, "database", None), "system_trades", None)
        if collection is not None:
            related = await collection.find({
                "$or": [
                    {"name": {"$regex": f"^{re.escape(base)}$", "$options": "i"}},
                    {"replaces": {"$regex": f"^{re.escape(base)}$", "$options": "i"}}
                ]
            }).to_list(length=200)
            for item in related:
                name = (item.get("name") or "").strip()
                replaces = (item.get("replaces") or "").strip()
                if name:
                    aliases.add(name)
                if replaces:
                    aliases.add(replaces)
    except Exception:
        pass
    return [a for a in aliases if a]

@router.post("/", response_model=models.Tradesperson)
async def create_tradesperson(tradesperson_data: models.TradespersonCreate):
    """Register a new tradesperson"""
    try:
        # Check if email already exists
        existing = await database.get_tradesperson_by_email(tradesperson_data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Convert to dict and prepare for database
        tradesperson_dict = tradesperson_data.dict()
        tradesperson_dict['id'] = str(uuid.uuid4())  # Generate new ID
        tradesperson_dict['average_rating'] = 0.0
        tradesperson_dict['total_reviews'] = 0
        tradesperson_dict['total_jobs'] = 0
        tradesperson_dict['verified'] = False
        tradesperson_dict['created_at'] = datetime.utcnow()
        tradesperson_dict['updated_at'] = datetime.utcnow()
        
        # Save to database
        created_tradesperson = await database.create_tradesperson(tradesperson_dict)
        
        return models.Tradesperson(**created_tradesperson)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=dict)
async def get_tradespeople(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),  # Increased default limit from 12 to 50
    search: Optional[str] = None,
    trade: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: Optional[str] = Query("rating", regex="^(rating|reviews|experience|recent)$")
):
    """Get tradespeople with filters and search"""
    try:
        # Gracefully handle degraded mode when database is not connected
        if not getattr(database, "connected", False) or getattr(database, "database", None) is None:
            total_pages = 0
            return {
                "tradespeople": [],
                "data": [],
                "total": 0,
                "total_pages": total_pages,
                "current_page": page,
                "limit": limit
            }

        skip = (page - 1) * limit
        
        filters = {
            "role": "tradesperson",
            "status": {"$ne": "deleted"},
            "business_name": {"$regex": r"\S", "$options": "i"},
        }
        and_filters = []

        if search:
            search_pattern = {"$regex": search, "$options": "i"}
            and_filters.append({
                "$or": [
                    {"name": search_pattern},
                    {"business_name": search_pattern},
                    {"bio": search_pattern},
                    {"profession": search_pattern},
                    {"main_trade": search_pattern},
                    {"trade_categories": search_pattern},
                    {"professional_information.trade_categories": search_pattern},
                ]
            })

        if trade:
            aliases = await _trade_aliases(trade)
            trade_conditions = []
            for alias in aliases:
                alias_pattern = {"$regex": f"^{re.escape(alias)}$", "$options": "i"}
                trade_conditions.extend([
                    {"profession": alias_pattern},
                    {"main_trade": alias_pattern},
                    {"trade_categories": alias_pattern},
                    {"professional_information.trade_categories": alias_pattern}
                ])
            if trade_conditions:
                and_filters.append({"$or": trade_conditions})

        if location:
            location_pattern = {"$regex": location, "$options": "i"}
            and_filters.append({
                "$or": [
                    {"city": location_pattern},
                    {"state": location_pattern},
                    {"location": location_pattern}
                ]
            })
        
        # Filter by minimum rating
        if min_rating is not None:
            filters["average_rating"] = {"$gte": min_rating}

        if and_filters:
            filters["$and"] = and_filters
        
        # Build sort criteria
        sort_criteria = []
        if sort_by == "rating":
            sort_criteria = [("average_rating", -1), ("total_reviews", -1)]
        elif sort_by == "reviews":
            sort_criteria = [("total_reviews", -1), ("average_rating", -1)]
        elif sort_by == "experience":
            sort_criteria = [("experience_years", -1), ("average_rating", -1)]
        elif sort_by == "recent":
            sort_criteria = [("created_at", -1)]
        else:
            sort_criteria = [("average_rating", -1)]
        
        # Get tradespeople from users collection using guarded accessor
        users_collection = database.users_collection
        cursor = users_collection.find(filters)
        
        # Apply sorting
        for field, direction in sort_criteria:
            cursor = cursor.sort(field, direction)
            
        # Apply pagination
        cursor = cursor.skip(skip).limit(limit)
        tradespeople_raw = await cursor.to_list(length=limit)
        
        # Get total count
        total_count = await users_collection.count_documents(filters)
        
        # Transform data to match frontend expectations
        tradespeople = []
        for tp in tradespeople_raw:
            stored_trade_categories = tp.get("trade_categories")
            if not isinstance(stored_trade_categories, list):
                stored_trade_categories = []

            professional_info = tp.get("professional_information") or tp.get("professionalInformation") or {}
            professional_trade_categories = professional_info.get("trade_categories") if isinstance(professional_info, dict) else []
            if not isinstance(professional_trade_categories, list):
                professional_trade_categories = []

            resolved_trade_categories = []
            for category in [
                *stored_trade_categories,
                *professional_trade_categories,
                tp.get("main_trade"),
                tp.get("profession"),
            ]:
                if isinstance(category, str):
                    cleaned_category = category.strip()
                    if cleaned_category and cleaned_category not in resolved_trade_categories:
                        resolved_trade_categories.append(cleaned_category)

            # Calculate additional stats if needed
            portfolio_count = await database.portfolio_collection.count_documents({"tradesperson_id": tp.get("id", "")})
            reviews_count = await database.reviews_collection.count_documents({"reviewee_id": tp.get("id", "")})
            completed_jobs = await database.database.jobs.count_documents({
                "assigned_tradesperson_id": tp.get("id", ""),
                "status": "completed"
            })
            
            # Get average rating from reviews if not stored in user document
            avg_rating = tp.get("average_rating", 0)
            if avg_rating == 0 and reviews_count > 0:
                # Calculate average rating from reviews
                reviews_pipeline = [
                    {"$match": {"reviewee_id": tp.get("id", "")}},
                    {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
                ]
                rating_result = await database.reviews_collection.aggregate(reviews_pipeline).to_list(length=1)
                if rating_result:
                    avg_rating = round(rating_result[0]["avg_rating"], 1)
            
            # Transform to expected format
            experience_years_value, experience_level_value = _normalized_experience(tp)
            # Ensure we always return a numeric experience_years for the list response
            if experience_years_value is None:
                experience_years_value = 0.0

            tradesperson_data = {
                "id": tp.get("id", ""),
                "name": tp.get("name", ""),
                "email": tp.get("email", ""),
                "phone": tp.get("phone", ""),
                "main_trade": tp.get("main_trade") or tp.get("profession") or (resolved_trade_categories[0] if resolved_trade_categories else ""),
                "trade_categories": resolved_trade_categories,
                "bio": tp.get("bio", ""),
                "location": tp.get("location", ""),
                "city": tp.get("city", ""),
                "state": tp.get("state", ""),
                "postcode": tp.get("postcode", ""),
                "years_experience": float(experience_years_value),
                "experience_years": float(experience_years_value),
                "experience_level": experience_level_value,
                "business_name": (tp.get("business_name") or "").strip(),
                "company_name": tp.get("company_name", ""),
                "profile_image": tp.get("profile_image", ""),
                "average_rating": avg_rating,
                "total_reviews": reviews_count,
                "completed_jobs": completed_jobs,
                "portfolio_items": portfolio_count,
                "is_verified": tp.get("is_verified", False),
                "created_at": tp.get("created_at"),
                "response_time": 2,  # Default response time in hours
                "status": tp.get("status", "active"),
                # Additional computed fields
                "verification_status": "verified" if tp.get("is_verified") else "unverified"
            }
            
            tradespeople.append(tradesperson_data)
        
        # Calculate pagination
        total_pages = (total_count + limit - 1) // limit
        
        return {
            "tradespeople": tradespeople,
            "data": tradespeople,  # Include both for compatibility
            "total": total_count,
            "total_pages": total_pages,
            "current_page": page,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tradespeople: {str(e)}")

@router.get("/{tradesperson_id}", response_model=dict)
async def get_tradesperson(tradesperson_id: str):
    """Get a specific tradesperson by ID"""
    try:
        # Gracefully handle degraded mode when database is not connected
        if not getattr(database, "connected", False) or getattr(database, "database", None) is None:
            raise HTTPException(status_code=503, detail="Database unavailable")

        # Get user from users collection where role is tradesperson
        user = await database.get_user_by_id(tradesperson_id)
        if not user or user.get("role") != "tradesperson":
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Calculate additional stats
        portfolio_count = await database.portfolio_collection.count_documents({"tradesperson_id": tradesperson_id})
        reviews_count = await database.reviews_collection.count_documents({"reviewee_id": tradesperson_id})
        completed_jobs = await database.database.jobs.count_documents({
            "assigned_tradesperson_id": tradesperson_id,
            "status": "completed"
        })
        
        # Get average rating from reviews if not stored in user document
        avg_rating = user.get("average_rating", 0)
        if avg_rating == 0 and reviews_count > 0:
            # Calculate average rating from reviews
            reviews_pipeline = [
                {"$match": {"reviewee_id": tradesperson_id}},
                {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
            ]
            rating_result = await database.reviews_collection.aggregate(reviews_pipeline).to_list(length=1)
            if rating_result:
                avg_rating = round(rating_result[0]["avg_rating"], 1)
        
        # Get recent portfolio items (limit 6 for preview)
        portfolio_items = await database.portfolio_collection.find(
            {"tradesperson_id": tradesperson_id, "is_public": True}
        ).sort("created_at", -1).limit(6).to_list(length=6)
        
        # Transform portfolio items
        portfolio_preview = []
        for item in portfolio_items:
            portfolio_preview.append({
                "id": str(item.get("_id", "")),
                "title": item.get("title", ""),
                "image_url": item.get("image_url", ""),
                "description": item.get("description", ""),
                "created_at": item.get("created_at")
            })
        
        # Get recent reviews (limit 5 for preview)
        recent_reviews = await database.reviews_collection.find(
            {"reviewee_id": tradesperson_id}
        ).sort("created_at", -1).limit(5).to_list(length=5)
        
        # Transform reviews
        reviews_preview = []
        for review in recent_reviews:
            reviewer = await database.get_user_by_id(review.get("reviewer_id", ""))
            reviews_preview.append({
                "id": str(review.get("_id", "")),
                "rating": review.get("rating", 0),
                "comment": review.get("comment", ""),
                "reviewer_name": reviewer.get("name", "Anonymous") if reviewer else "Anonymous",
                "created_at": review.get("created_at")
            })
        
        # Transform to expected format
        experience_years_value, experience_level_value = _normalized_experience(user)
        if experience_years_value is None:
            experience_years_value = 0.0

        tradesperson_data = {
            "id": user.get("id", ""),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "phone": user.get("phone", ""),
            "main_trade": user.get("profession", ""),
            "trade_categories": [user.get("profession", "")] if user.get("profession") else [],
            "bio": user.get("bio", ""),
            "location": user.get("location", ""),
            "city": user.get("city", ""),
            "state": user.get("state", ""),
            "postcode": user.get("postcode", ""),
            "years_experience": float(experience_years_value),
            "experience_years": float(experience_years_value),
            "experience_level": experience_level_value,
            "business_name": user.get("business_name", ""),
            "company_name": user.get("company_name", ""),
            "profile_image": user.get("profile_image", ""),
            "average_rating": avg_rating,
            "total_reviews": reviews_count,
            "completed_jobs": completed_jobs,
            "portfolio_items": portfolio_count,
            "is_verified": user.get("is_verified", False),
            "created_at": user.get("created_at"),
            "response_time": 2,
            "status": user.get("status", "active"),
            "verification_status": "verified" if user.get("is_verified") else "unverified",
            # Additional detailed information
            "portfolio_preview": portfolio_preview,
            "reviews_preview": reviews_preview,
            "certifications": user.get("certifications", []),
            "skills": user.get("skills", []),
            "availability": user.get("availability", "available")
        }
        
        return tradesperson_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tradesperson: {str(e)}")

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

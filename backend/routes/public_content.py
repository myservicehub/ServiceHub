from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
from datetime import datetime
import logging
import uuid

from database import database
from models.content import ContentType, ContentStatus
from models.notifications import NotificationType
from services.notifications import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public/content", tags=["public_content"])

@router.get("/blog")
async def get_public_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
    search: Optional[str] = None,
    featured_only: bool = False
):
    """Get published blog posts for public consumption"""
    
    try:
        # Build filters for public blog posts
        filters = {
            "content_type": ContentType.BLOG_POST.value,
            "status": ContentStatus.PUBLISHED.value,
            "publish_date": {"$lte": datetime.utcnow()}
        }
        
        # Add optional filters
        if category:
            filters["category"] = category
        
        if featured_only:
            filters["is_featured"] = True
        
        if search:
            filters["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"excerpt": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        
        # Get blog posts
        blog_posts = await database.get_content_items(filters, skip, limit)
        total_count = await database.get_content_items_count(filters)
        
        # Remove sensitive data and format for public consumption
        public_posts = []
        for post in blog_posts:
            public_post = {
                "id": post["id"],
                "title": post["title"],
                "slug": post["slug"],
                "content": post["content"],
                "excerpt": post.get("excerpt"),
                "featured_image": post.get("featured_image"),
                "gallery_images": post.get("gallery_images", []),
                "category": post["category"],
                "tags": post.get("tags", []),
                "is_featured": post.get("is_featured", False),
                "is_sticky": post.get("is_sticky", False),
                "view_count": post.get("view_count", 0),
                "like_count": post.get("like_count", 0),
                "share_count": post.get("share_count", 0),
                "created_at": post["created_at"],
                "updated_at": post["updated_at"],
                "meta_title": post.get("meta_title"),
                "meta_description": post.get("meta_description"),
                "keywords": post.get("keywords", [])
            }
            public_posts.append(public_post)
        
        return {
            "blog_posts": public_posts,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count,
                "has_more": skip + limit < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting public blog posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog posts")

@router.get("/blog/{slug}")
async def get_blog_post_by_slug(slug: str):
    """Get a specific published blog post by slug"""
    
    try:
        # Get the blog post
        blog_post = await database.get_content_item_by_slug(slug)
        
        if not blog_post:
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Check if it's a published blog post
        if (blog_post["content_type"] != ContentType.BLOG_POST.value or 
            blog_post["status"] != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Check if publish date has passed
        if blog_post.get("publish_date"):
            publish_date = blog_post["publish_date"]
            if isinstance(publish_date, str):
                publish_date = datetime.fromisoformat(publish_date.replace('Z', '+00:00'))
            if publish_date > datetime.utcnow():
                raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Increment view count
        await database.increment_content_view_count(blog_post["id"])
        
        # Format for public consumption
        public_post = {
            "id": blog_post["id"],
            "title": blog_post["title"],
            "slug": blog_post["slug"],
            "content": blog_post["content"],
            "excerpt": blog_post.get("excerpt"),
            "featured_image": blog_post.get("featured_image"),
            "gallery_images": blog_post.get("gallery_images", []),
            "category": blog_post["category"],
            "tags": blog_post.get("tags", []),
            "is_featured": blog_post.get("is_featured", False),
            "is_sticky": blog_post.get("is_sticky", False),
            "view_count": blog_post.get("view_count", 0) + 1,  # Include the increment
            "like_count": blog_post.get("like_count", 0),
            "share_count": blog_post.get("share_count", 0),
            "created_at": blog_post["created_at"],
            "updated_at": blog_post["updated_at"],
            "meta_title": blog_post.get("meta_title"),
            "meta_description": blog_post.get("meta_description"),
            "keywords": blog_post.get("keywords", [])
        }
        
        return {"blog_post": public_post}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting blog post by slug: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog post")

@router.get("/blog/categories")
async def get_blog_categories():
    """Get all available blog post categories"""
    
    try:
        # Get unique categories from published blog posts
        pipeline = [
            {
                "$match": {
                    "content_type": ContentType.BLOG_POST.value,
                    "status": ContentStatus.PUBLISHED.value
                }
            },
            {
                "$group": {
                    "_id": "$category",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        categories = []
        async for doc in database.database.content_items.aggregate(pipeline):
            categories.append({
                "category": doc["_id"],
                "post_count": doc["count"]
            })
        
        return {"categories": categories}
        
    except Exception as e:
        logger.error(f"Error getting blog categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog categories")

@router.get("/blog/featured")
async def get_featured_blog_posts(limit: int = Query(3, ge=1, le=10)):
    """Get featured blog posts"""
    
    try:
        filters = {
            "content_type": ContentType.BLOG_POST.value,
            "status": ContentStatus.PUBLISHED.value,
            "is_featured": True,
            "publish_date": {"$lte": datetime.utcnow()}
        }
        
        featured_posts = await database.get_content_items(filters, 0, limit)
        
        # Format for public consumption
        public_posts = []
        for post in featured_posts:
            public_post = {
                "id": post["id"],
                "title": post["title"],
                "slug": post["slug"],
                "excerpt": post.get("excerpt"),
                "featured_image": post.get("featured_image"),
                "category": post["category"],
                "tags": post.get("tags", []),
                "view_count": post.get("view_count", 0),
                "like_count": post.get("like_count", 0),
                "created_at": post["created_at"],
                "meta_title": post.get("meta_title"),
                "meta_description": post.get("meta_description")
            }
            public_posts.append(public_post)
        
        return {"featured_posts": public_posts}
        
    except Exception as e:
        logger.error(f"Error getting featured blog posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch featured blog posts")

@router.post("/blog/{post_id}/like")
async def like_blog_post(post_id: str):
    """Like a blog post (increment like count)"""
    
    try:
        # Get the blog post
        blog_post = await database.get_content_item_by_id(post_id)
        
        if not blog_post:
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Check if it's a published blog post
        if (blog_post["content_type"] != ContentType.BLOG_POST.value or 
            blog_post["status"] != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Increment like count
        await database.increment_content_like_count(post_id)
        
        return {"message": "Blog post liked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error liking blog post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to like blog post")

@router.post("/blog/{post_id}/share")
async def share_blog_post(post_id: str):
    """Share a blog post (increment share count)"""
    
    try:
        # Get the blog post
        blog_post = await database.get_content_item_by_id(post_id)
        
        if not blog_post:
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Check if it's a published blog post
        if (blog_post["content_type"] != ContentType.BLOG_POST.value or 
            blog_post["status"] != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Increment share count
        await database.increment_content_share_count(post_id)
        
        return {"message": "Blog post shared successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing blog post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to share blog post")

# Public Job Postings API

@router.get("/jobs")
async def get_public_job_postings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    department: Optional[str] = None,
    job_type: Optional[str] = None,
    location: Optional[str] = None,
    featured_only: bool = False
):
    """Get published job postings for public consumption"""
    
    try:
        # Build filters for public job postings
        filters = {
            "content_type": "job_posting",
            "status": ContentStatus.PUBLISHED.value,
            "publish_date": {"$lte": datetime.utcnow()}
        }
        
        # Add optional filters based on job settings
        if department or job_type or location or featured_only:
            settings_filters = {}
            if department:
                settings_filters["settings.department"] = department
            if job_type:
                settings_filters["settings.job_type"] = job_type
            if location:
                settings_filters["settings.location"] = {"$regex": location, "$options": "i"}
            if featured_only:
                settings_filters["settings.is_featured"] = True
            
            filters.update(settings_filters)
        
        # Get job postings
        job_postings = await database.get_content_items(filters, skip, limit)
        total_count = await database.get_content_items_count(filters)
        
        # Format for public consumption
        public_jobs = []
        for job in job_postings:
            settings = job.get("settings", {})
            public_job = {
                "id": job["id"],
                "title": job["title"],
                "slug": job["slug"],
                "description": job["content"],
                "department": settings.get("department"),
                "location": settings.get("location"),
                "job_type": settings.get("job_type"),
                "experience_level": settings.get("experience_level"),
                "requirements": settings.get("requirements", []),
                "benefits": settings.get("benefits", []),
                "responsibilities": settings.get("responsibilities", []),
                "is_featured": settings.get("is_featured", False),
                "is_urgent": settings.get("is_urgent", False),
                "salary_min": settings.get("salary_min") if settings.get("is_salary_public") else None,
                "salary_max": settings.get("salary_max") if settings.get("is_salary_public") else None,
                "salary_currency": settings.get("salary_currency", "NGN") if settings.get("is_salary_public") else None,
                "applications_count": settings.get("applications_count", 0),
                "created_at": job["created_at"],
                "updated_at": job["updated_at"],
                "expires_at": settings.get("expires_at"),
                "meta_title": job.get("meta_title"),
                "meta_description": job.get("meta_description")
            }
            public_jobs.append(public_job)
        
        return {
            "job_postings": public_jobs,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count,
                "has_more": skip + limit < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting public job postings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch job postings")

@router.get("/jobs/{slug}")
async def get_job_posting_by_slug(slug: str):
    """Get a specific published job posting by slug"""
    
    try:
        # Get the job posting
        job_posting = await database.get_content_item_by_slug(slug)
        
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Check if it's a published job posting
        if (job_posting["content_type"] != "job_posting" or 
            job_posting["status"] != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Check if job has expired
        settings = job_posting.get("settings", {})
        expires_at = settings.get("expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at < datetime.utcnow():
                raise HTTPException(status_code=404, detail="Job posting has expired")
        
        # Format for public consumption
        public_job = {
            "id": job_posting["id"],
            "title": job_posting["title"],
            "slug": job_posting["slug"],
            "description": job_posting["content"],
            "department": settings.get("department"),
            "location": settings.get("location"),
            "job_type": settings.get("job_type"),
            "experience_level": settings.get("experience_level"),
            "requirements": settings.get("requirements", []),
            "benefits": settings.get("benefits", []),
            "responsibilities": settings.get("responsibilities", []),
            "is_featured": settings.get("is_featured", False),
            "is_urgent": settings.get("is_urgent", False),
            "salary_min": settings.get("salary_min") if settings.get("is_salary_public") else None,
            "salary_max": settings.get("salary_max") if settings.get("is_salary_public") else None,
            "salary_currency": settings.get("salary_currency", "NGN") if settings.get("is_salary_public") else None,
            "applications_count": settings.get("applications_count", 0),
            "created_at": job_posting["created_at"],
            "updated_at": job_posting["updated_at"],
            "expires_at": settings.get("expires_at"),
            "meta_title": job_posting.get("meta_title"),
            "meta_description": job_posting.get("meta_description")
        }
        
        return {"job_posting": public_job}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job posting by slug: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch job posting")

@router.get("/jobs/departments")
async def get_job_departments():
    """Get all available job departments"""
    
    try:
        # Get unique departments from published job postings
        pipeline = [
            {
                "$match": {
                    "content_type": "job_posting",
                    "status": ContentStatus.PUBLISHED.value
                }
            },
            {
                "$group": {
                    "_id": "$settings.department",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        departments = []
        async for doc in database.database.content_items.aggregate(pipeline):
            if doc["_id"]:  # Skip null departments
                departments.append({
                    "department": doc["_id"],
                    "job_count": doc["count"]
                })
        
        return {"departments": departments}
        
    except Exception as e:
        logger.error(f"Error getting job departments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch job departments")

@router.get("/jobs/featured")
async def get_featured_job_postings(limit: int = Query(3, ge=1, le=10)):
    """Get featured job postings"""
    
    try:
        filters = {
            "content_type": "job_posting",
            "status": ContentStatus.PUBLISHED.value,
            "settings.is_featured": True
        }
        
        featured_jobs = await database.get_content_items(filters, 0, limit)
        
        # Format for public consumption
        public_jobs = []
        for job in featured_jobs:
            settings = job.get("settings", {})
            public_job = {
                "id": job["id"],
                "title": job["title"],
                "slug": job["slug"],
                "description": job["content"][:200] + "..." if len(job["content"]) > 200 else job["content"],
                "department": settings.get("department"),
                "location": settings.get("location"),
                "job_type": settings.get("job_type"),
                "experience_level": settings.get("experience_level"),
                "is_featured": True,
                "is_urgent": settings.get("is_urgent", False),
                "created_at": job["created_at"],
                "expires_at": settings.get("expires_at")
            }
            public_jobs.append(public_job)
        
        return {"featured_jobs": public_jobs}
        
    except Exception as e:
        logger.error(f"Error getting featured job postings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch featured job postings")

@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    application_data: dict,
    request: Request
):
    """Apply to a job posting"""
    
    try:
        # Get the job posting
        job_posting = await database.get_content_item_by_id(job_id)
        
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Check if it's a published job posting
        if (job_posting["content_type"] != "job_posting" or 
            job_posting["status"] != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Check if job has expired
        settings = job_posting.get("settings", {})
        expires_at = settings.get("expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at < datetime.utcnow():
                raise HTTPException(status_code=400, detail="Job posting has expired")
        
        # Create job application
        application = {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "job_title": job_posting["title"],
            "name": application_data["name"],
            "email": application_data["email"],
            "phone": application_data.get("phone"),
            "experience_level": application_data.get("experience_level"),
            "message": application_data["message"],
            "resume_filename": application_data.get("resume_filename"),
            "status": "new",
            "applied_at": datetime.utcnow(),
            "source": "website",
            "ip_address": request.client.host if request else None,
            "user_agent": request.headers.get("user-agent") if request else None
        }
        
        # Store application
        application_id = await database.create_job_application(application)
        
        # Increment applications count for the job
        await database.increment_job_applications_count(job_id)
        
        # Send notification to admins about new application (in background)
        try:
            await _send_application_notification(application, job_posting)
        except Exception as e:
            logger.error(f"Failed to send application notification: {str(e)}")
            # Don't fail the application submission due to notification errors
        
        return {
            "message": "Application submitted successfully",
            "application_id": application_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying to job: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit job application")
from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
from datetime import datetime
import logging
import os
import uuid
import re
from pydantic import BaseModel, EmailStr

from ..database import database
from ..models.content import ContentType, ContentStatus
from ..models.notifications import NotificationType
from ..services.notifications import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public/content", tags=["public_content"])
MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_RESUME_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}

class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    user_id: Optional[str] = None

@router.post("/submit-contact")
async def submit_contact_form(request: ContactFormRequest):
    """Handle contact form submissions by sending an email to support"""
    
    try:
        # Prepare template data
        template_data = {
            "name": request.name,
            "email": request.email,
            "phone": request.phone,
            "subject": request.subject,
            "message": request.message,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Send notification to support email
        support_email = os.environ.get('SUPPORT_EMAIL', 'support@myservicehub.co')
        
        await notification_service.send_notification(
            user_id=None,
            notification_type=NotificationType.CONTACT_FORM,
            template_data=template_data,
            recipient_email=support_email
        )
        
        # Also create a unified feedback record for the new admin system
        try:
            from ..models.feedback import FeedbackCategory, FeedbackSource, FeedbackStatus, FeedbackPriority
            
            # Map request subject to FeedbackCategory
            subject_map = {
                "general": FeedbackCategory.GENERAL_INQUIRY,
                "account": FeedbackCategory.ACCOUNT_ISSUES,
                "payment": FeedbackCategory.PAYMENT_BILLING,
                "technical": FeedbackCategory.TECHNICAL_SUPPORT,
                "partnership": FeedbackCategory.PARTNERSHIP_OPPORTUNITIES,
                "feedback": FeedbackCategory.FEEDBACK_SUGGESTIONS,
                "complaint": FeedbackCategory.COMPLAINT
            }
            category = subject_map.get(request.subject.lower(), FeedbackCategory.GENERAL_INQUIRY)

            # Determine user type if user_id is provided
            user_type = "Guest"
            if request.user_id:
                user_doc = await database.get_user_by_id(request.user_id)
                if user_doc:
                    user_type = str(user_doc.get("role", "Guest")).capitalize()

            created_at = datetime.utcnow()
            unified_feedback = {
                "id": str(uuid.uuid4()),
                "case_id": f"SH-FB-{str(uuid.uuid4())[:8].upper()}",
                "category": category,
                "source": FeedbackSource.CONTACT_FORM,
                "status": FeedbackStatus.NEW,
                "priority": FeedbackPriority.MEDIUM,
                "user": {
                    "name": request.name,
                    "email": request.email,
                    "phone": request.phone,
                    "user_id": request.user_id,
                    "user_type": user_type
                },
                "is_authenticated": bool(request.user_id),
                "subject": request.subject,
                "message": request.message,
                "created_at": created_at,
                "updated_at": created_at,
                "timeline": [{
                    "id": str(uuid.uuid4()),
                    "action": "Case created",
                    "details": f"Contact form submission captured ({category})",
                    "performed_by": "System",
                    "created_at": created_at
                }]
            }
            await database.create_feedback(unified_feedback)
        except Exception as e:
            logger.error(f"Error creating unified feedback for contact form: {str(e)}")
            
        return {"message": "Message sent successfully"}
        
    except Exception as e:
        logger.error(f"Error submitting contact form: {str(e)}")
        # We still return 200 to the user but log the error
        # Alternatively, raise 500 if you want the frontend to show an error
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")

def _calculate_reading_time(content: str) -> int:
    """Calculate reading time in minutes based on 200 words per minute"""
    if not content:
        return 0
    # Remove HTML tags
    text = re.sub('<[^<]+?>', ' ', content)
    # Count words
    words = len(text.split())
    # Calculate minutes
    minutes = max(1, round(words / 200))
    return minutes

def _normalize_public_blog_category(category: Optional[str]) -> str:
    value = str(category or "").strip().lower()
    if not value or value == "general":
        return "getting_started"
    return value

def _coerce_datetime(value):
    """Best-effort conversion for Mongo datetimes or ISO datetime strings."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        try:
            return datetime.fromisoformat(normalized.replace('Z', '+00:00'))
        except ValueError:
            return None
    return None

def _is_job_expired(job: dict, reference_time: Optional[datetime] = None) -> bool:
    """Treat only truly expired jobs as unavailable on public careers pages."""
    now = reference_time or datetime.utcnow()
    expires_at = _coerce_datetime(job.get("settings", {}).get("expires_at"))
    if not expires_at:
        return False

    # Compare naive-to-naive or aware-to-aware to avoid runtime type errors.
    if expires_at.tzinfo is not None and now.tzinfo is None:
        now = now.replace(tzinfo=expires_at.tzinfo)
    elif expires_at.tzinfo is None and now.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=now.tzinfo)

    return expires_at < now

def _build_application_record(
    application_data: dict,
    request: Request,
    job_id: Optional[str],
    job_title: str,
    is_general_application: bool = False
) -> dict:
    """Build a normalized job application payload for storage."""
    return {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "job_title": job_title,
        "position_of_interest": application_data.get("position_of_interest") or job_title,
        "is_general_application": is_general_application,
        "name": application_data["name"],
        "email": application_data["email"],
        "phone": application_data.get("phone"),
        "experience_level": application_data.get("experience_level"),
        "message": application_data["message"],
        "resume_filename": application_data.get("resume_filename"),
        "resume_data_url": application_data.get("resume_data_url"),
        "resume_mime_type": application_data.get("resume_mime_type"),
        "resume_size_bytes": application_data.get("resume_size_bytes"),
        "status": "new",
        "applied_at": datetime.utcnow(),
        "source": "website",
        "ip_address": request.client.host if request else None,
        "user_agent": request.headers.get("user-agent") if request else None
    }

def _validate_resume_payload(application_data: dict) -> None:
    """Validate resume upload payload (PDF/DOC/DOCX only)."""
    resume_filename = str(application_data.get("resume_filename") or "").strip()
    resume_mime_type = str(application_data.get("resume_mime_type") or "").strip().lower()
    resume_data_url = str(application_data.get("resume_data_url") or "").strip()
    resume_size_bytes = application_data.get("resume_size_bytes")

    has_resume = bool(resume_filename or resume_mime_type or resume_data_url)
    if not has_resume:
        return

    if resume_size_bytes is not None:
        try:
            size = int(resume_size_bytes)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid resume size.")
        if size <= 0 or size > MAX_RESUME_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Resume/CV must be 5MB or smaller.")

    ext = ""
    if resume_filename:
        ext = os.path.splitext(resume_filename)[1].lower()
        if ext not in ALLOWED_RESUME_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Resume/CV must be a PDF, DOC, or DOCX file.")

    data_url_mime = ""
    if resume_data_url:
        if not resume_data_url.startswith("data:"):
            raise HTTPException(status_code=400, detail="Invalid resume data format.")
        mime_part = resume_data_url.split(";", 1)[0]
        data_url_mime = mime_part.replace("data:", "").strip().lower()
        if data_url_mime and data_url_mime not in ALLOWED_RESUME_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Resume/CV must be a PDF, DOC, or DOCX file.")

    candidate_mime = resume_mime_type or data_url_mime
    if candidate_mime and candidate_mime not in ALLOWED_RESUME_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Resume/CV must be a PDF, DOC, or DOCX file.")

    # If no MIME is provided, extension must still be valid when filename exists.
    if not candidate_mime and not ext:
        raise HTTPException(status_code=400, detail="Resume/CV file type could not be determined.")

@router.get("/blog")
async def get_public_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
    search: Optional[str] = None,
    featured_only: bool = False,
    content_type: Optional[str] = None
):
    """Get published blog posts for public consumption"""
    
    try:
        # Build filters for public blog posts
        # Only published items should be returned; ignore the publish_date
        # field because clients expect to see anything marked published even if
        # the date was accidentally set in the future.  Scheduling is handled
        # by the `status` field, so a post with status "published" must
        # always be visible.
        filters = {
            "$and": [
                {"status": {"$regex": "^published$", "$options": "i"}}
            ]
        }

        normalized_content_type = (content_type or "").strip().lower().replace(" ", "_")
        if normalized_content_type and normalized_content_type != "all":
            type_pattern = "^" + re.escape(normalized_content_type).replace("_", "[_ ]?") + "$"
            filters["$and"].append({"content_type": {"$regex": type_pattern, "$options": "i"}})
        
        # Add optional filters
        if category:
            normalized_category = _normalize_public_blog_category(category)
            if normalized_category == "getting_started":
                filters["$and"].append({"category": {"$in": ["getting_started", "general"]}})
            else:
                filters["$and"].append({"category": normalized_category})
        
        if featured_only:
            filters["$and"].append({"is_featured": True})
        
        if search:
            filters["$and"].append({
                "$or": [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"excerpt": {"$regex": search, "$options": "i"}},
                    {"content": {"$regex": search, "$options": "i"}},
                    {"tags": {"$in": [search]}}
                ]
            })
        
        # Get blog posts
        # Note: We EXCLUDE content and gallery_images from the query to improve performance
        # These fields are often large and not needed for the list view.
        projection = {"content": 0, "gallery_images": 0}
        
        blog_posts = await database.get_content_items(filters, skip, limit, projection)
        total_count = await database.get_content_items_count(filters)
        
        # Remove sensitive data and format for public consumption
        public_posts = []
        for post in blog_posts:
            # Use stored reading time or calculate if missing (and content is somehow available)
            # Since we exclude content, we rely on stored reading_time. 
            # If missing, it will default to 0, which is acceptable for legacy posts until they are updated.
            reading_time = post.get("reading_time", 0)
            
            # If reading_time is missing and content is missing, we can't calculate it.
            # Ideally, a migration script should run to populate reading_time for existing posts.
            
            public_post = {
                "id": post["id"],
                "title": post["title"],
                "slug": post.get("slug") or post["id"],
                "content_type": post.get("content_type", "blog_post"),
                # "content": post["content"],  # Excluded
                "excerpt": post.get("excerpt"),
                "reading_time": reading_time,
                "featured_image": post.get("featured_image"),
                # "gallery_images": post.get("gallery_images", []), # Excluded
                "category": _normalize_public_blog_category(post.get("category")),
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

@router.get("/blog/post/{slug}")
async def get_blog_post_by_slug(slug: str):
    """Get a specific published blog post by slug"""
    
    try:
        # Get the blog post
        blog_post = await database.get_content_item_by_slug(slug)
        if not blog_post:
            blog_post = await database.get_content_item_by_id(slug)
        
        if not blog_post:
            raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Check if it's a published post
        status = str(blog_post.get("status", "")).strip().lower()
        if status != ContentStatus.PUBLISHED.value:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Older behaviour hid posts if their publish_date was in the
        # future.  That turned out to be surprising when an admin accidentally
        # picked the wrong year or migrated items with dates far ahead.  We
        # now simply ignore the publish_date altogether once the status is
        # "published".  Scheduling should be driven by the status field.
        # (Future-dated scheduled posts still use status="scheduled" and are
        # filtered out earlier.)
        #
        # Keeping the code here for reference but not enforcing the check.
        #
        # if blog_post.get("publish_date"):
        #     publish_date = blog_post["publish_date"]
        #     if isinstance(publish_date, str):
        #         publish_date = datetime.fromisoformat(publish_date.replace('Z', '+00:00'))
        #     if publish_date > datetime.utcnow():
        #         raise HTTPException(status_code=404, detail="Blog post not found")
        
        # Increment view count
        await database.increment_content_view_count(blog_post["id"])
        
        # Format for public consumption
        public_post = {
            "id": blog_post["id"],
            "title": blog_post["title"],
            "slug": blog_post["slug"],
            "content_type": blog_post.get("content_type", "blog_post"),
            "content": blog_post["content"],
            "excerpt": blog_post.get("excerpt"),
            "featured_image": blog_post.get("featured_image"),
            "gallery_images": blog_post.get("gallery_images", []),
            "category": _normalize_public_blog_category(blog_post.get("category")),
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
async def get_blog_categories(content_type: Optional[str] = None):
    """Get all available blog post categories"""
    
    try:
        normalized_content_type = (content_type or "").strip().lower().replace(" ", "_")
        match_stage = {
            "status": {"$regex": "^published$", "$options": "i"}
        }
        if normalized_content_type and normalized_content_type != "all":
            type_pattern = "^" + re.escape(normalized_content_type).replace("_", "[_ ]?") + "$"
            match_stage["content_type"] = {"$regex": type_pattern, "$options": "i"}

        pipeline = [
            {
                "$match": match_stage
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
        
        categories_map = {}
        async for doc in database.database.content_items.aggregate(pipeline):
            normalized = _normalize_public_blog_category(doc.get("_id"))
            categories_map[normalized] = categories_map.get(normalized, 0) + doc.get("count", 0)

        categories = [
            {"category": cat, "post_count": count}
            for cat, count in sorted(categories_map.items(), key=lambda x: x[1], reverse=True)
        ]

        return {"categories": categories}
        
    except Exception as e:
        logger.error(f"Error getting blog categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog categories")

@router.get("/blog/filter-options")
async def get_blog_filter_options():
    try:
        content_types = []
        for ct in ContentType:
            value = ct.value
            if value == ContentType.JOB_POSTING.value:
                continue
            content_types.append({
                "value": value,
                "label": value.replace("_", " ").title()
            })
        return {"content_types": content_types}
    except Exception as e:
        logger.error(f"Error getting blog filter options: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog filter options")

@router.get("/blog/featured")
async def get_featured_blog_posts(limit: int = Query(3, ge=1, le=10)):
    """Get featured blog posts"""
    
    try:
        # featured posts only care about status, not the publish date
        filters = {
            "$and": [
                {"content_type": {"$regex": "^blog[_ ]?post$", "$options": "i"}},
                {"status": {"$regex": "^published$", "$options": "i"}},
                {"is_featured": True}
            ]
        }
        
        # Get featured posts
        projection = {"content": 0, "gallery_images": 0}
        featured_posts = await database.get_content_items(filters, 0, limit, projection)
        
        # Format for public consumption
        public_posts = []
        for post in featured_posts:
            # Calculate reading time
            reading_time = post.get("reading_time", 0)
            
            public_post = {
                "id": post["id"],
                "title": post["title"],
                "slug": post["slug"],
                "excerpt": post.get("excerpt"),
                "reading_time": reading_time,
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
        content_type = str(blog_post.get("content_type", "")).strip().lower().replace(" ", "_")
        status = str(blog_post.get("status", "")).strip().lower()
        if content_type != ContentType.BLOG_POST.value or status != ContentStatus.PUBLISHED.value:
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
        content_type = str(blog_post.get("content_type", "")).strip().lower().replace(" ", "_")
        status = str(blog_post.get("status", "")).strip().lower()
        if content_type != ContentType.BLOG_POST.value or status != ContentStatus.PUBLISHED.value:
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
        # Public visibility should be controlled by published status.
        # Older logic also compared publish_date/published_at against ISO
        # strings, which failed for Mongo Date values and caused valid
        # published jobs to disappear from the careers page.
        filters = {
            "content_type": "job_posting",
            "status": {"$regex": "^published$", "$options": "i"}
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
            if _is_job_expired(job):
                continue
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

@router.get("/jobs/departments")
async def get_job_departments():
    """Get all available job departments"""
    
    try:
        # Get unique departments from published job postings
        pipeline = [
            {
                "$match": {
                    "content_type": "job_posting",
                    "status": {"$regex": "^published$", "$options": "i"}
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
            "status": {"$regex": "^published$", "$options": "i"},
            "settings.is_featured": True
        }
        
        featured_jobs = await database.get_content_items(filters, 0, limit)
        
        # Format for public consumption
        public_jobs = []
        for job in featured_jobs:
            if _is_job_expired(job):
                continue
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

@router.get("/jobs/{slug}")
async def get_job_posting_by_slug(slug: str):
    """Get a specific published job posting by slug"""
    
    try:
        # Get the job posting
        job_posting = await database.get_content_item_by_slug(slug)
        if not job_posting:
            job_posting = await database.get_content_item_by_id(slug)
        
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Check if it's a published job posting
        status = str(job_posting.get("status", "")).strip().lower()
        if (job_posting["content_type"] != "job_posting" or 
            status != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        if _is_job_expired(job_posting):
            raise HTTPException(status_code=404, detail="Job posting has expired")
        
        # Format for public consumption
        settings = job_posting.get("settings", {})
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

@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    application_data: dict,
    request: Request
):
    """Apply to a job posting"""
    
    try:
        _validate_resume_payload(application_data)

        # Get the job posting
        job_posting = await database.get_content_item_by_id(job_id)
        
        if not job_posting:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Check if it's a published job posting
        status = str(job_posting.get("status", "")).strip().lower()
        if (job_posting["content_type"] != "job_posting" or 
            status != ContentStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        if _is_job_expired(job_posting):
            raise HTTPException(status_code=400, detail="Job posting has expired")
        
        application = _build_application_record(
            application_data=application_data,
            request=request,
            job_id=job_id,
            job_title=job_posting["title"]
        )
        
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

@router.post("/jobs/apply-general")
async def apply_general_to_careers(
    application_data: dict,
    request: Request
):
    """Submit a general careers application without a specific job posting."""

    try:
        _validate_resume_payload(application_data)

        position_of_interest = (
            application_data.get("position_of_interest")
            or application_data.get("job_title")
            or "General Application"
        )

        application = _build_application_record(
            application_data=application_data,
            request=request,
            job_id=None,
            job_title="General Application",
            is_general_application=True
        )
        application["position_of_interest"] = position_of_interest

        application_id = await database.create_job_application(application)

        try:
            await _send_application_notification(
                application,
                {"title": position_of_interest}
            )
        except Exception as e:
            logger.error(f"Failed to send general application notification: {str(e)}")

        return {
            "message": "General application submitted successfully",
            "application_id": application_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting general application: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit general application")

# Helper function for notifications

async def _send_application_notification(application: dict, job_posting: dict):
    """Send notification to admins about new job application"""
    
    try:
        # Get admin users to notify
        admin_users = await database.get_admin_users()
        
        for admin in admin_users:
            if admin.get("email"):
                template_data = {
                    "job_title": job_posting["title"],
                    "applicant_name": application["name"],
                    "applicant_email": application["email"],
                    "applicant_phone": application.get("phone", "Not provided"),
                    "experience_level": application.get("experience_level", "Not specified"),
                    "applied_date": datetime.utcnow().strftime("%B %d, %Y at %I:%M %p"),
                    "cover_letter": application["message"],
                    "admin_dashboard_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.co')}/admin/jobs/applications"
                }
                
                # Send notification to admin
                await notification_service.send_notification(
                    user_id=admin["id"],
                    notification_type=NotificationType.NEW_APPLICATION,
                    template_data=template_data,
                    recipient_email=admin["email"]
                )
        
        logger.info(f"✅ Application notification sent for: {application['name']} -> {job_posting['title']}")
        
    except Exception as e:
        logger.error(f"❌ Error sending application notification: {str(e)}")
        # Don't raise exception to avoid failing the application submission

# Newsletter Subscription API

class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr
    source: Optional[str] = None

@router.post("/newsletter/subscribe")
async def subscribe_newsletter(payload: NewsletterSubscribeRequest, request: Request):
    """Subscribe an email to the newsletter"""
    try:
        # Check if already subscribed
        existing = await database.get_newsletter_subscriber_by_email(payload.email)
        if existing and existing.get("subscribed"):
            # Even if already in local DB, try to ensure they are in Resend audience
            # in case they were added manually or before integration
            await notification_service.add_to_newsletter_audience(payload.email)
            return {"message": "Already subscribed", "status": "ok"}

        # Create subscription record
        record = await database.create_newsletter_subscription(
            email=payload.email,
            source=payload.source or "website",
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get("user-agent") if request else None
        )

        # Sync to Resend Audience
        await notification_service.add_to_newsletter_audience(payload.email)

        return {"message": "Subscribed successfully", "status": "ok", "subscription": {"id": record.get("id"), "email": record.get("email")}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subscribing to newsletter: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to subscribe to newsletter")

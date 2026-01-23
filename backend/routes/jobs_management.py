from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Request
from fastapi.security import HTTPBearer
from typing import List, Optional
from datetime import datetime
import logging
import uuid
import os

from ..database import database
from ..models.content import (
    JobPosting, JobApplication, JobApplicationCreate, JobApplicationUpdate,
    JobDepartment, JobType, JobExperienceLevel, ContentStatus,
    JobStatistics, generate_slug
)
from ..models.admin import AdminPermission
from ..models.notifications import NotificationType
from .admin_management import get_current_admin, require_permission
from ..services.notifications import notification_service

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/admin/jobs", tags=["jobs_management"])

# Job Postings Management (Admin Routes)

@router.get("/postings")
async def get_job_postings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    department: Optional[JobDepartment] = None,
    status: Optional[ContentStatus] = None,
    search: Optional[str] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Get job postings with filtering (Admin only)"""
    
    try:
        filters = {"content_type": "job_posting"}
        
        if department:
            filters["department"] = department.value
        if status:
            filters["status"] = status.value
        if search:
            filters["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}}
            ]
        
        job_postings = await database.get_job_postings(filters, skip, limit)
        total_count = await database.get_job_postings_count(filters)
        
        return {
            "job_postings": job_postings,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count,
                "has_more": skip + limit < total_count
            }
        }
    except Exception as e:
        logger.error(f"Error getting job postings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch job postings")

@router.post("/postings")
async def create_job_posting(
    job_data: dict,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Create a new job posting (Admin only)"""
    
    try:
        # Generate slug if not provided
        if not job_data.get("slug"):
            job_data["slug"] = generate_slug(job_data["title"])
        
        # Check if slug already exists
        existing_job = await database.get_job_by_slug(job_data["slug"])
        if existing_job:
            counter = 1
            base_slug = job_data["slug"]
            while existing_job:
                job_data["slug"] = f"{base_slug}-{counter}"
                existing_job = await database.get_job_by_slug(job_data["slug"])
                counter += 1
        
        # Create job posting as content item
        job_content = {
            "id": str(uuid.uuid4()),
            "content_type": "job_posting",
            "title": job_data["title"],
            "slug": job_data["slug"],
            "content": job_data.get("description", ""),
            "category": "careers",
            "status": job_data.get("status", "draft"),
            "created_by": admin["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            # Job-specific fields stored in settings
            "settings": {
                "department": job_data.get("department"),
                "location": job_data.get("location"),
                "job_type": job_data.get("job_type"),
                "experience_level": job_data.get("experience_level"),
                "requirements": job_data.get("requirements", []),
                "benefits": job_data.get("benefits", []),
                "responsibilities": job_data.get("responsibilities", []),
                "salary_min": job_data.get("salary_min"),
                "salary_max": job_data.get("salary_max"),
                "salary_currency": job_data.get("salary_currency", "NGN"),
                "is_salary_public": job_data.get("is_salary_public", False),
                "is_featured": job_data.get("is_featured", False),
                "is_urgent": job_data.get("is_urgent", False),
                "expires_at": job_data.get("expires_at")
            },
            "meta_title": job_data.get("meta_title"),
            "meta_description": job_data.get("meta_description"),
            "keywords": job_data.get("keywords", [])
        }
        
        job_id = await database.create_content_item(job_content)
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "create_job",
            f"Created job posting: {job_data['title']}",
            target_id=job_id, target_type="job"
        )
        
        return {
            "message": "Job posting created successfully",
            "job_id": job_id,
            "slug": job_data["slug"]
        }
        
    except Exception as e:
        logger.error(f"Error creating job posting: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create job posting")

@router.get("/postings/{job_id}")
async def get_job_posting(
    job_id: str,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Get a specific job posting (Admin only)"""
    
    job_posting = await database.get_content_item_by_id(job_id)
    if not job_posting or job_posting.get("content_type") != "job_posting":
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    return {"job_posting": job_posting}

@router.put("/postings/{job_id}")
async def update_job_posting(
    job_id: str,
    update_data: dict,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Update a job posting (Admin only)"""
    
    try:
        # Get existing job
        existing_job = await database.get_content_item_by_id(job_id)
        if not existing_job or existing_job.get("content_type") != "job_posting":
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Prepare update data
        content_update = {}
        if "title" in update_data:
            content_update["title"] = update_data["title"]
        if "description" in update_data:
            content_update["content"] = update_data["description"]
        if "status" in update_data:
            content_update["status"] = update_data["status"]
        if "meta_title" in update_data:
            content_update["meta_title"] = update_data["meta_title"]
        if "meta_description" in update_data:
            content_update["meta_description"] = update_data["meta_description"]
        if "keywords" in update_data:
            content_update["keywords"] = update_data["keywords"]
        
        # Update job-specific settings
        current_settings = existing_job.get("settings", {})
        job_fields = [
            "department", "location", "job_type", "experience_level",
            "requirements", "benefits", "responsibilities", "salary_min",
            "salary_max", "salary_currency", "is_salary_public",
            "is_featured", "is_urgent", "expires_at"
        ]
        
        for field in job_fields:
            if field in update_data:
                current_settings[field] = update_data[field]
        
        content_update["settings"] = current_settings
        content_update["updated_at"] = datetime.utcnow()
        content_update["updated_by"] = admin["id"]
        
        # Update slug if title changed
        if "title" in update_data and update_data["title"] != existing_job["title"]:
            new_slug = generate_slug(update_data["title"])
            # Check if new slug exists
            existing_slug = await database.get_content_item_by_slug(new_slug)
            if existing_slug and existing_slug["id"] != job_id:
                counter = 1
                base_slug = new_slug
                while existing_slug:
                    new_slug = f"{base_slug}-{counter}"
                    existing_slug = await database.get_content_item_by_slug(new_slug)
                    counter += 1
            content_update["slug"] = new_slug
        
        # Update job posting
        success = await database.update_content_item(job_id, content_update)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update job posting")
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "update_job",
            f"Updated job posting: {existing_job['title']}",
            target_id=job_id, target_type="job"
        )
        
        return {"message": "Job posting updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job posting: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update job posting")

@router.delete("/postings/{job_id}")
async def delete_job_posting(
    job_id: str,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Delete a job posting (Admin only)"""
    
    try:
        # Get existing job
        existing_job = await database.get_content_item_by_id(job_id)
        if not existing_job or existing_job.get("content_type") != "job_posting":
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Perform hard delete so the posting and related data are removed
        try:
            delete_results = await database.delete_job_completely(job_id)
        except Exception as e:
            logger.error(f"Failed to hard-delete job posting {job_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete job posting")

        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "delete_job",
            f"Deleted job posting: {existing_job['title']}",
            target_id=job_id, target_type="job"
        )

        return {"message": "Job posting deleted successfully", "details": delete_results}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job posting: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete job posting")

# Job Applications Management (Admin Routes)

@router.get("/applications")
async def get_job_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    job_id: Optional[str] = None,
    status: Optional[str] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Get job applications (Admin only)"""
    
    try:
        filters = {}
        if job_id:
            filters["job_id"] = job_id
        if status:
            filters["status"] = status
        
        applications = await database.get_job_applications(filters, skip, limit)
        total_count = await database.get_job_applications_count(filters)
        
        return {
            "applications": applications,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count
            }
        }
    except Exception as e:
        logger.error(f"Error getting job applications: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch job applications")

@router.put("/applications/{application_id}")
async def update_job_application(
    application_id: str,
    update_data: JobApplicationUpdate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Update job application status (Admin only)"""
    
    try:
        # Get existing application
        existing_app = await database.get_job_application_by_id(application_id)
        if not existing_app:
            raise HTTPException(status_code=404, detail="Job application not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict["reviewed_by"] = admin["id"]
            update_dict["reviewed_at"] = datetime.utcnow()
            
            success = await database.update_job_application(application_id, update_dict)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to update application")
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "update_application",
            f"Updated application from {existing_app['name']} for {existing_app['job_title']}",
            target_id=application_id, target_type="application"
        )
        
        return {"message": "Job application updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job application: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update job application")

@router.get("/statistics")
async def get_job_statistics(
    admin: dict = Depends(require_permission(AdminPermission.VIEW_SYSTEM_STATS))
):
    """Get job and application statistics (Admin only)"""
    
    try:
        stats = await database.get_job_statistics()
        return {"statistics": stats}
    except Exception as e:
        logger.error(f"Error getting job statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch job statistics")

@router.post("/postings/{job_id}/publish")
async def publish_job_posting(
    job_id: str,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Publish a job posting (Admin only)"""
    
    try:
        # Get existing job
        existing_job = await database.get_content_item_by_id(job_id)
        if not existing_job or existing_job.get("content_type") != "job_posting":
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Update status to published
        success = await database.update_content_item(job_id, {
            "status": "published",
            "publish_date": datetime.utcnow(),
            "published_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "updated_by": admin["id"]
        })
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to publish job posting")
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "publish_job",
            f"Published job posting: {existing_job['title']}",
            target_id=job_id, target_type="job"
        )
        
        # Send email notifications for new job posting (in background)
        try:
            await _send_new_job_notifications(existing_job, job_id)
        except Exception as e:
            logger.error(f"Failed to send job posting notifications: {str(e)}")
            # Don't fail the publish operation due to notification errors
        
        return {"message": "Job posting published successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing job posting: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to publish job posting")

# Notification helper functions

async def _send_new_job_notifications(job_posting: dict, job_id: str):
    """Send notifications to relevant users about new job posting"""
    
    try:
        settings = job_posting.get("settings", {})
        
        # Get list of users who might be interested (optional - can be job seekers, subscribers)
        # For now, we'll just log that the notification would be sent
        # In a real implementation, you'd fetch users interested in job alerts
        
        logger.info(f"📢 New job notification would be sent for: {job_posting['title']}")
        
        # For demonstration, let's send to admin users as a test
        # In production, this would be sent to job seekers who subscribed to job alerts
        admin_users = await database.get_admin_users()
        
        for admin in admin_users:
            if admin.get("email"):
                template_data = {
                    "recipient_name": admin.get("full_name", "Job Seeker"),
                    "job_title": job_posting["title"],
                    "department": settings.get("department", "General"),
                    "location": settings.get("location", "Nigeria"),
                    "job_type": settings.get("job_type", "Full Time"),
                    "experience_level": settings.get("experience_level", "Entry Level"),
                    "posted_date": datetime.utcnow().strftime("%B %d, %Y"),
                    "job_description": job_posting["content"][:200] + "..." if len(job_posting["content"]) > 200 else job_posting["content"],
                    "application_url": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.co')}/careers/{job_posting['slug']}"
                }
                
                # Send notification (this will be logged as mock email in development)
                await notification_service.send_notification(
                    user_id=admin["id"],
                    notification_type=NotificationType.NEW_JOB_POSTED,
                    template_data=template_data,
                    recipient_email=admin["email"]
                )
        
        logger.info(f"✅ Job posting notifications sent for: {job_posting['title']}")
        
    except Exception as e:
        logger.error(f"❌ Error sending job posting notifications: {str(e)}")
        raise

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
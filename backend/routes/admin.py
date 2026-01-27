from fastapi import APIRouter, HTTPException, Depends, Form, Request, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import asyncio

from ..database import database
from ..models.base import JobAccessFeeUpdate, TransactionStatus
from ..models.admin import AdminPermission
from ..auth.dependencies import require_permission, get_current_admin_account
from ..models.reviews import ReviewStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Simple admin authentication (can be enhanced later)
async def verify_admin_credentials(username: str = Form(...), password: str = Form(...)):
    """Simple admin authentication"""
    # For now, use simple credentials (enhance with proper auth later)
    if username == "admin" and password == "servicehub2024":
        return {"username": username, "role": "admin"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.post("/login")
async def admin_login(credentials: dict = Depends(verify_admin_credentials)):
    """Admin login endpoint"""
    return {
        "message": "Admin login successful", 
        "admin": credentials,
        "token": "admin_token_placeholder"  # In production, use proper JWT
    }

# ==========================================
# WALLET FUNDING MANAGEMENT
# ==========================================

@router.get("/wallet/funding-requests")
async def get_pending_funding_requests(skip: int = 0, limit: int = 20, admin: dict = Depends(require_permission(AdminPermission.MANAGE_WALLET_FUNDING))):
    """Get pending wallet funding requests for admin review"""
    
    requests = await database.get_pending_funding_requests(skip=skip, limit=limit)
    
    return {
        "funding_requests": requests,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(requests)
        }
    }

@router.post("/wallet/confirm-funding/{transaction_id}")
async def confirm_wallet_funding(
    transaction_id: str,
    admin_notes: str = Form(""),
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_WALLET_FUNDING))
):
    """Confirm wallet funding request"""
    
    success = await database.confirm_wallet_funding(
        transaction_id=transaction_id,
        admin_id=admin["id"],
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    return {
        "message": "Funding request confirmed successfully",
        "transaction_id": transaction_id,
        "status": "confirmed"
    }

@router.post("/wallet/reject-funding/{transaction_id}")
async def reject_wallet_funding(
    transaction_id: str,
    admin_notes: str = Form(...),
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_WALLET_FUNDING))
):
    """Reject wallet funding request"""
    
    success = await database.reject_wallet_funding(
        transaction_id=transaction_id,
        admin_id=admin["id"],
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    return {
        "message": "Funding request rejected",
        "transaction_id": transaction_id,
        "status": "rejected",
        "notes": admin_notes
    }

# ==========================================
# JOB ACCESS FEE MANAGEMENT
# ==========================================

@router.get("/jobs/access-fees")
async def get_jobs_with_access_fees(skip: int = 0, limit: int = 20):
    """Get all jobs with their access fees for admin management"""
    
    jobs = await database.get_jobs_with_access_fees(skip=skip, limit=limit)
    
    # Format jobs for admin view
    formatted_jobs = []
    for job in jobs:
        # Debug logging to see homeowner data
        logger.info(f"Processing job {job['id']}: homeowner = {job.get('homeowner', 'NO_HOMEOWNER')}")
        
        formatted_job = {
            "id": job["id"],
            "title": job["title"],
            "category": job["category"],
            "location": job["location"],
            "description": job.get("description", ""),
            "homeowner_name": job["homeowner"]["name"],
            "homeowner_email": job["homeowner"].get("email", ""),
            "homeowner_total_jobs": job["homeowner"].get("total_jobs", 0),
            "access_fee_naira": job.get("access_fee_naira", 1500),
            "access_fee_coins": job.get("access_fee_coins", 15),
            "interests_count": job.get("interests_count", 0),
            "created_at": job["created_at"],
            "status": job.get("status", "active")
        }
        formatted_jobs.append(formatted_job)
    
    logger.info(f"Returning {len(formatted_jobs)} jobs with access fees")
    
    return {
        "jobs": formatted_jobs,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(formatted_jobs)
        }
    }

@router.put("/jobs/{job_id}/access-fee")
async def update_job_access_fee(
    job_id: str,
    request: Request,
    current_user = None  # Will be populated by admin auth
):
    """Update access fee for a specific job"""
    
    try:
        logger.info(f"Raw request received for job {job_id}")
        
        access_fee_naira = None
        
        # Try to get data from multiple sources
        content_type = request.headers.get("content-type", "")
        logger.info(f"Request content-type: {content_type}")
        
        if "application/json" in content_type:
            # Handle JSON data
            try:
                json_data = await request.json()
                logger.info(f"JSON data received: {json_data}")
                access_fee_naira = json_data.get('access_fee_naira')
            except Exception as e:
                logger.error(f"Failed to parse JSON: {str(e)}")
        elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            # Handle form data
            try:
                form_data = await request.form()
                logger.info(f"Form data received: {dict(form_data)}")
                access_fee_naira = form_data.get('access_fee_naira')
            except Exception as e:
                logger.error(f"Failed to parse form data: {str(e)}")
        else:
            # Try both methods
            try:
                form_data = await request.form()
                logger.info(f"Form data received: {dict(form_data)}")
                access_fee_naira = form_data.get('access_fee_naira')
                
                if not access_fee_naira:
                    # Try JSON as fallback
                    await request.stream().__anext__()  # Reset stream
                    json_data = await request.json()
                    logger.info(f"Fallback JSON data received: {json_data}")
                    access_fee_naira = json_data.get('access_fee_naira')
            except Exception as e:
                logger.error(f"Failed to parse request data: {str(e)}")
        
        if not access_fee_naira:
            logger.error("access_fee_naira not found in request data")
            raise HTTPException(status_code=400, detail="access_fee_naira is required")
        
        try:
            access_fee_naira = int(access_fee_naira)
        except (ValueError, TypeError):
            logger.error(f"Invalid access_fee_naira format: {access_fee_naira}")
            raise HTTPException(status_code=400, detail="access_fee_naira must be a valid integer")
        
        logger.info(f"Updating access fee for job {job_id} to ₦{access_fee_naira}")
        
        # Validate fee is positive and reasonable
        if access_fee_naira <= 0:
            logger.warning(f"Invalid access fee: {access_fee_naira} (must be > 0)")
            raise HTTPException(
                status_code=400, 
                detail="Access fee must be greater than ₦0"
            )
        
        if access_fee_naira > 10000:
            logger.warning(f"Invalid access fee: {access_fee_naira} (must be <= 10000)")
            raise HTTPException(
                status_code=400, 
                detail="Access fee cannot exceed ₦10,000"
            )
        
        # Check if job exists
        job = await database.get_job_by_id(job_id)
        if not job:
            logger.warning(f"Job not found: {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        logger.info(f"Found job: {job.get('title', 'Unknown')} for access fee update")
        
        # Update access fee
        success = await database.update_job_access_fee(job_id, access_fee_naira)
        
        if not success:
            logger.error(f"Failed to update access fee in database for job {job_id}")
            raise HTTPException(status_code=500, detail="Failed to update access fee")
        
        access_fee_coins = access_fee_naira // 100
        
        logger.info(f"Successfully updated access fee for job {job_id}: ₦{access_fee_naira} ({access_fee_coins} coins)")
        
        return {
            "success": True,
            "message": "Access fee updated successfully",
            "job_id": job_id,
            "job_title": job.get("title", "Unknown"),
            "new_access_fee_naira": access_fee_naira,
            "new_access_fee_coins": access_fee_coins
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating job access fee: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ==========================================
# COMPREHENSIVE JOB MANAGEMENT
# ==========================================

@router.get("/jobs/all")
async def get_all_jobs_for_admin(skip: int = 0, limit: int = 50, status: str = None):
    """Get all jobs with comprehensive details for admin management"""
    
    jobs = await database.get_all_jobs_admin(skip=skip, limit=limit, status=status)
    total_count = await database.get_jobs_count_admin(status=status)
    
    return {
        "jobs": jobs,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_count
        }
    }

@router.get("/reviews")
async def get_all_reviews(
    page: int = 1,
    limit: int = 20,
    status: str = None,
    min_rating: int = None,
    review_type: str = None,
    search: str = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    skip = (page - 1) * limit
    query = {}
    if status:
        query["status"] = status
    if min_rating is not None:
        query["rating"] = {"$gte": min_rating}
    if review_type:
        query["review_type"] = review_type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"reviewer_name": {"$regex": search, "$options": "i"}},
            {"reviewee_name": {"$regex": search, "$options": "i"}}
        ]
    total = await database.reviews_collection.count_documents(query)
    cursor = database.reviews_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    reviews = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        reviews.append(doc)
    return {
        "reviews": reviews,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.put("/reviews/{review_id}/status")
async def update_review_status(
    review_id: str,
    payload: dict,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="status is required")
    try:
        status_enum = ReviewStatus(status)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid status")
    updated = await database.update_review(review_id, {"status": status_enum})
    if not updated:
        raise HTTPException(status_code=404, detail="Review not found")
    return updated

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))):
    deleted = await database.delete_review(review_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"deleted": True, "id": review_id}

@router.put("/jobs/{job_id}")
async def update_job_admin(
    job_id: str,
    job_data: dict
):
    """Update job details (admin only)"""
    
    # Check if job exists
    existing_job = await database.get_job_by_id(job_id)
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update job
    success = await database.update_job_admin(job_id, job_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update job")
    
    return {
        "message": "Job updated successfully",
        "job_id": job_id
    }

@router.patch("/jobs/{job_id}/status")
async def update_job_status_admin(
    job_id: str,
    status: str
):
    """Update job status (activate, deactivate, complete, etc.)"""
    
    valid_statuses = ["active", "completed", "cancelled", "expired", "on_hold"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    # Check if job exists
    existing_job = await database.get_job_by_id(job_id)
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update job status
    success = await database.update_job_status_admin(job_id, status)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update job status")
    
    return {
        "message": "Job status updated successfully",
        "job_id": job_id,
        "new_status": status
    }

@router.delete("/jobs/{job_id}")
async def delete_job_admin(job_id: str):
    """Delete a job (admin only) - soft delete recommended"""
    
    # Check if job exists
    existing_job = await database.get_job_by_id(job_id)
    if not existing_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Hard-delete job and related data so it's fully removed from the platform
    try:
        delete_results = await database.delete_job_completely(job_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")

    return {
        "message": "Job deleted successfully",
        "job_id": job_id,
        "details": delete_results
    }

@router.get("/jobs/stats")
async def get_jobs_statistics_admin():
    """Get comprehensive job statistics for admin dashboard"""
    
    stats = await database.get_jobs_statistics_admin()
    
    return {
        "job_stats": stats
    }

 

@router.get("/jobs/pending")
async def get_pending_jobs(
    skip: int = 0,
    limit: int = 50
):
    """Get all jobs pending approval"""
    
    pending_jobs = await database.get_pending_jobs_admin(skip=skip, limit=limit)
    total_count = await database.get_pending_jobs_count()
    
    return {
        "jobs": pending_jobs,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_count
        }
    }

@router.put("/jobs/{job_id}/approve")
async def approve_job(
    job_id: str,
    approval_data: dict,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_permission(AdminPermission.APPROVE_JOBS))
):
    """Approve or reject a job posting"""
    
    action = approval_data.get("action")  # "approve" or "reject"
    notes = approval_data.get("notes", "")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be 'approve' or 'reject'"
        )
    
    # Get job details
    job = await database.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != "pending_approval":
        raise HTTPException(
            status_code=400,
            detail="Job is not pending approval"
        )
    
    # Update job status
    new_status = "active" if action == "approve" else "rejected"
    approval_data_db = {
        "status": new_status,
        "approved_by": admin["id"],
        "approved_at": datetime.now(timezone.utc),
        "approval_notes": notes,
        "updated_at": datetime.now(timezone.utc)
    }
    
    success = await database.update_job_approval_status(job_id, approval_data_db)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update job status")
    
    # Send notification to homeowner
    try:
        from ..services.notifications import notification_service
        from ..models.notifications import NotificationType
        
        homeowner = await database.get_user_by_email(job["homeowner"]["email"])
        if homeowner:
            if action == "approve":
                try:
                    prefs = await database.get_user_notification_preferences(homeowner["id"])
                    template_data = {
                        "homeowner_name": homeowner.get("name", "Homeowner"),
                        "job_title": job["title"],
                        "approved_at": datetime.now(timezone.utc).strftime("%B %d, %Y"),
                        "admin_notes": notes
                    }
                    try:
                        notification = await notification_service.send_notification(
                            user_id=homeowner["id"],
                            notification_type=NotificationType.JOB_APPROVED,
                            template_data=template_data,
                            user_preferences=prefs,
                            recipient_email=homeowner.get("email"),
                            recipient_phone=homeowner.get("phone")
                        )
                    except Exception as e:
                        from ..models.notifications import Notification, NotificationChannel, NotificationStatus
                        notification = Notification(
                            id=str(uuid.uuid4()),
                            user_id=homeowner["id"],
                            type=NotificationType.JOB_APPROVED,
                            channel=NotificationChannel.EMAIL,
                            recipient_email=homeowner.get("email"),
                            recipient_phone=homeowner.get("phone"),
                            subject=f"Job Approved: {job['title']}",
                            content=f"Your job '{job['title']}' was approved. Notes: {notes}",
                            status=NotificationStatus.PENDING,
                            metadata=template_data,
                        )
                    try:
                        await database.create_notification(notification)
                    except Exception:
                        pass
                except Exception:
                    logger.warning("Failed to enqueue homeowner approval notification")
            else:
                try:
                    prefs = await database.get_user_notification_preferences(homeowner["id"])
                    template_data = {
                        "homeowner_name": homeowner.get("name", "Homeowner"),
                        "job_title": job["title"],
                        "reviewed_at": datetime.now(timezone.utc).strftime("%B %d, %Y"),
                        "rejection_reason": notes
                    }
                    try:
                        notification = await notification_service.send_notification(
                            user_id=homeowner["id"],
                            notification_type=NotificationType.JOB_REJECTED,
                            template_data=template_data,
                            user_preferences=prefs,
                            recipient_email=homeowner.get("email"),
                            recipient_phone=homeowner.get("phone")
                        )
                    except Exception as e:
                        from ..models.notifications import Notification, NotificationChannel, NotificationStatus
                        notification = Notification(
                            id=str(uuid.uuid4()),
                            user_id=homeowner["id"],
                            type=NotificationType.JOB_REJECTED,
                            channel=NotificationChannel.EMAIL,
                            recipient_email=homeowner.get("email"),
                            recipient_phone=homeowner.get("phone"),
                            subject=f"Job Requires Updates: {job['title']}",
                            content=f"Your job '{job['title']}' needs updates before approval. Reason: {notes}",
                            status=NotificationStatus.PENDING,
                            metadata=template_data,
                        )
                    try:
                        await database.create_notification(notification)
                    except Exception:
                        pass
                except Exception:
                    logger.warning("Failed to enqueue homeowner rejection notification")
    except Exception as e:
        logger.warning(f"Failed to send approval notification: {str(e)}")

    if action == "approve":
        try:
            from .jobs import notify_matching_tradespeople_new_job
            updated_job = await database.get_job_by_id(job_id)
            if updated_job:
                background_tasks.add_task(notify_matching_tradespeople_new_job, updated_job)
        except Exception as e:
            logger.warning(f"Failed to enqueue matching job alerts: {str(e)}")
    
    return {
        "message": f"Job {action}d successfully",
        "job_id": job_id,
        "action": action,
        "approved_by": admin["id"],
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes
    }

@router.get("/jobs/all-admin")
async def get_all_jobs_admin(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None
):
    """Get all jobs for admin management (all statuses)"""
    
    jobs = await database.get_all_jobs_admin(skip=skip, limit=limit, status=status)
    total_count = await database.get_jobs_count_admin(status=status)
    
    return {
        "jobs": jobs,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_count
        },
        "filters": {
            "status": status
        }
    }

@router.get("/jobs/statistics")
async def get_job_statistics_admin():
    """Get comprehensive job statistics for admin dashboard"""
    
    stats = await database.get_jobs_statistics_admin()
    
    return {
        "statistics": stats
    }

@router.put("/jobs/{job_id}/edit")
async def edit_job_admin(
    job_id: str,
    update_data: dict,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_JOBS))
):
    """Edit job details including access fees (admin only)"""
    
    # Get current job
    job = await database.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate update data
    allowed_fields = [
        'title', 'description', 'category', 'state', 'lga', 'town', 
        'zip_code', 'home_address', 'budget_min', 'budget_max', 
        'timeline', 'access_fee_naira', 'access_fee_coins'
    ]
    
    # Filter out non-allowed fields
    filtered_updates = {k: v for k, v in update_data.items() if k in allowed_fields and v is not None}
    
    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Validate specific fields
    if 'access_fee_naira' in filtered_updates:
        fee_naira = filtered_updates['access_fee_naira']
        if not (500 <= fee_naira <= 10000):
            raise HTTPException(status_code=400, detail="Access fee in Naira must be between 500 and 10,000")
    
    if 'access_fee_coins' in filtered_updates:
        fee_coins = filtered_updates['access_fee_coins']
        if not (5 <= fee_coins <= 100):
            raise HTTPException(status_code=400, detail="Access fee in coins must be between 5 and 100")

    if 'description' in filtered_updates:
        desc = str(filtered_updates['description']).strip()
        if not desc:
            raise HTTPException(status_code=400, detail="Description cannot be empty")
        filtered_updates['description'] = desc

    if 'budget_min' in filtered_updates and 'budget_max' in filtered_updates:
        if filtered_updates['budget_min'] > filtered_updates['budget_max']:
            raise HTTPException(status_code=400, detail="Minimum budget cannot be greater than maximum budget")
    
    # Add metadata
    filtered_updates['updated_at'] = datetime.utcnow()
    filtered_updates['last_edited_by'] = admin["id"]
    filtered_updates['admin_notes'] = update_data.get('admin_notes', '')
    
    # Update job
    success = await database.update_job_admin(job_id, filtered_updates)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update job")
    
    # Send notification to homeowner about job update
    try:
        from ..services.notifications import notification_service
        from ..models.notifications import NotificationType
        
        homeowner = await database.get_user_by_email(job["homeowner"]["email"])
        if homeowner:
            updated_fields = list(filtered_updates.keys())
            prefs = await database.get_user_notification_preferences(homeowner["id"])
            template_data = {
                "homeowner_name": homeowner.get("name", "Homeowner"),
                "job_title": job["title"],
                "updated_fields": ", ".join(updated_fields),
                "updated_at": datetime.utcnow().strftime("%B %d, %Y"),
                "admin_notes": update_data.get('admin_notes', '')
            }
            await notification_service.send_notification(
                user_id=homeowner["id"],
                notification_type=NotificationType.JOB_UPDATED,
                template_data=template_data,
                user_preferences=prefs,
                recipient_email=homeowner.get("email"),
                recipient_phone=homeowner.get("phone")
            )
    except Exception as e:
        logger.warning(f"Failed to send job update notification: {str(e)}")
    
    return {
        "message": "Job updated successfully",
        "job_id": job_id,
        "updated_fields": list(filtered_updates.keys()),
        "updated_by": admin["id"],
        "updated_at": datetime.utcnow().isoformat()
    }

@router.get("/jobs/{job_id}/details")
async def get_job_details_admin(job_id: str):
    """Get detailed job information for admin editing"""
    
    job = await database.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get additional details in parallel
    homeowner_email = job.get("homeowner", {}).get("email")
    
    tasks = [
        database.get_job_interests_count(job_id),
        database.get_job_question_answers(job_id)
    ]
    
    if homeowner_email:
        tasks.append(database.get_user_by_email(homeowner_email))
    else:
        # Placeholder for user if no email
        async def get_none(): return None
        tasks.append(get_none())

    # Run all tasks in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    interests_count = results[0] if not isinstance(results[0], Exception) else 0
    qa = results[1] if not isinstance(results[1], Exception) else None
    homeowner = results[2] if not isinstance(results[2], Exception) else None
    
    # Get homeowner job count if homeowner exists
    homeowner_total_jobs = 0
    if homeowner and not isinstance(homeowner, Exception):
        try:
            homeowner_id = homeowner.get("id") or homeowner.get("_id")
            if homeowner_id:
                homeowner_total_jobs = await database.count_homeowner_jobs(str(homeowner_id))
        except Exception:
            pass

    job_details = {
        **job,
        "homeowner_details": {
            "name": homeowner.get("name") if homeowner else "Unknown",
            "email": homeowner.get("email") if homeowner else "Unknown",
            "phone": homeowner.get("phone") if homeowner else "Unknown",
            "verification_status": homeowner.get("verification_status") if homeowner else "unknown",
            "total_jobs": homeowner_total_jobs
        },
        "interests_count": interests_count,
        "access_fees": {
            "naira": job.get("access_fee_naira", 1000),
            "coins": job.get("access_fee_coins", 10)
        }
    }
    
    if qa:
        job_details["question_answers"] = qa
        if not job_details.get("description"):
            try:
                summary = database.compose_job_description_from_answers(qa)
                if summary:
                    job_details["description"] = summary
            except Exception:
                pass
    
    return {"job": job_details}

# ==========================================
# ADMIN DASHBOARD STATS
# ==========================================

@router.get("/dashboard/stats")
async def get_admin_dashboard_stats():
    """Get admin dashboard statistics"""
    
    # Get pending funding requests count
    pending_requests = await database.get_pending_funding_requests(limit=1000)  # Get all
    pending_count = len(pending_requests)
    
    # Calculate total pending amount
    total_pending_naira = sum(req["amount_naira"] for req in pending_requests)
    total_pending_coins = sum(req["amount_coins"] for req in pending_requests)
    
    # Get total jobs count
    jobs = await database.get_jobs_with_access_fees(limit=1000)  # Get all
    total_jobs = len(jobs)
    
    # Calculate total interests and potential revenue
    total_interests = sum(job.get("interests_count", 0) for job in jobs)
    
    # Average access fee
    access_fees = [job.get("access_fee_naira", 1500) for job in jobs]
    avg_access_fee = sum(access_fees) / len(access_fees) if access_fees else 1500
    
    # Get pending verifications count
    pending_verifications = await database.get_pending_verifications(limit=1000)
    pending_verifications_count = len(pending_verifications)
    
    return {
        "wallet_stats": {
            "pending_funding_requests": pending_count,
            "total_pending_amount_naira": total_pending_naira,
            "total_pending_amount_coins": total_pending_coins
        },
        "job_stats": {
            "total_jobs": total_jobs,
            "total_interests": total_interests,
            "average_access_fee_naira": round(avg_access_fee, 0),
            "average_access_fee_coins": round(avg_access_fee / 100, 0)
        },
        "verification_stats": {
            "pending_verifications": pending_verifications_count
        },
        "system_stats": {
            "coin_conversion_rate": "1 coin = ₦100",
            "max_access_fee": "₦10,000 (100 coins)",
            "min_funding_amount": "Any positive amount",
            "referral_reward": "5 coins per verified referral"
        }
    }

# ==========================================
# PAYMENT PROOF VIEWING
# ==========================================

@router.get("/wallet/payment-proof/{filename}")
async def view_payment_proof(filename: str, admin: dict = Depends(require_permission(AdminPermission.VIEW_PAYMENT_PROOFS))):
    """View payment proof image (admin only)"""
    from fastapi.responses import FileResponse
    import os
    
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    project_root_uploads = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    candidates = [
        os.path.join(base_dir, "payment_proofs", filename),
        os.path.join(project_root_uploads, "payment_proofs", filename),
        os.path.join(os.getcwd(), "uploads", "payment_proofs", filename),
        os.path.join("/app", "uploads", "payment_proofs", filename),
    ]
    for fp in candidates:
        if os.path.exists(fp):
            return FileResponse(fp, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Payment proof not found")

@router.get("/wallet/payment-proof-base64/{filename}")
async def view_payment_proof_base64(filename: str, admin: dict = Depends(require_permission(AdminPermission.VIEW_PAYMENT_PROOFS))):
    import os, base64
    # Prefer DB-stored base64 if available
    try:
        txn = await database.get_wallet_transaction_by_proof_image(filename)
        if txn and txn.get("proof_image_base64"):
            return {"image_base64": txn["proof_image_base64"]}
    except Exception:
        pass
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    project_root_uploads = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    candidates = [
        os.path.join(base_dir, "payment_proofs", filename),
        os.path.join(project_root_uploads, "payment_proofs", filename),
        os.path.join(os.getcwd(), "uploads", "payment_proofs", filename),
        os.path.join("/app", "uploads", "payment_proofs", filename),
    ]
    for fp in candidates:
        if os.path.exists(fp):
            with open(fp, "rb") as f:
                data = f.read()
            return {"image_base64": base64.b64encode(data).decode("utf-8")}
    raise HTTPException(status_code=404, detail="Payment proof not found")

# ==========================================
# USER MANAGEMENT
# ==========================================

@router.get("/users/{user_id}/details")
async def get_user_details(user_id: str):
    """Get detailed user information for admin management"""
    
    try:
        # Get comprehensive user details
        user = await database.get_user_details_admin(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user details")

@router.delete("/users/{user_id}")
async def delete_user_account(user_id: str, admin: dict = Depends(require_permission(AdminPermission.DELETE_USERS))):
    """Delete user account permanently (admin only)"""
    
    try:
        # Get user details first for logging
        user = await database.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Perform complete user deletion
        success = await database.delete_user_completely(user_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete user account")
        
        logger.info(f"Admin {admin['id']} deleted user account: {user.get('email', 'Unknown')} (ID: {user_id})")
        
        return {
            "message": "User account deleted successfully",
            "user_id": user_id,
            "deleted_user": {
                "name": user.get("name", "Unknown"),
                "email": user.get("email", "Unknown"),
                "role": user.get("role", "Unknown")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user account")

# ==========================================
# CONTACT MANAGEMENT
# ==========================================

@router.get("/contacts")
async def get_all_contacts():
    """Get all contacts for admin management"""
    
    contacts = await database.get_all_contacts()
    
    return {
        "contacts": contacts,
        "total_count": len(contacts)
    }

@router.get("/contacts/types")
async def get_contact_types():
    """Get available contact types"""
    
    return {
        "contact_types": [
            {"value": "phone_support", "label": "Support Phone", "category": "Phone Numbers"},
            {"value": "phone_business", "label": "Business Phone", "category": "Phone Numbers"},
            {"value": "email_support", "label": "Support Email", "category": "Email Addresses"},
            {"value": "email_business", "label": "Business Email", "category": "Email Addresses"},
            {"value": "address_office", "label": "Office Address", "category": "Physical Addresses"},
            {"value": "social_facebook", "label": "Facebook", "category": "Social Media"},
            {"value": "social_instagram", "label": "Instagram", "category": "Social Media"},
            {"value": "social_youtube", "label": "YouTube", "category": "Social Media"},
            {"value": "social_twitter", "label": "Twitter", "category": "Social Media"},
            {"value": "website_url", "label": "Website URL", "category": "Website"},
            {"value": "business_hours", "label": "Business Hours", "category": "Operating Hours"}
        ]
    }

@router.get("/contacts/{contact_id}")
async def get_contact_by_id(contact_id: str):
    """Get specific contact by ID"""
    
    contact = await database.get_contact_by_id(contact_id)
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return contact

@router.post("/contacts")
async def create_contact(contact_data: dict, admin: dict = Depends(require_permission(AdminPermission.MANAGE_CONTACTS))):
    """Create a new contact"""
    
    # Validate required fields
    required_fields = ['contact_type', 'label', 'value']
    for field in required_fields:
        if field not in contact_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate contact type
    valid_types = [
        'phone_support', 'phone_business', 'email_support', 'email_business',
        'address_office', 'social_facebook', 'social_instagram', 'social_youtube',
        'social_twitter', 'website_url', 'business_hours'
    ]
    if contact_data['contact_type'] not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid contact type. Must be one of: {valid_types}")
    
    # Validate field lengths
    if len(contact_data['label']) < 2:
        raise HTTPException(status_code=400, detail="Contact label must be at least 2 characters")
    
    if len(contact_data['value']) < 1:
        raise HTTPException(status_code=400, detail="Contact value cannot be empty")
    
    contact_id = await database.create_contact(contact_data, admin["id"]) 
    
    if not contact_id:
        raise HTTPException(status_code=500, detail="Failed to create contact")
    
    return {
        "message": "Contact created successfully",
        "contact_id": contact_id,
        "contact_type": contact_data['contact_type']
    }

@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact_data: dict, admin: dict = Depends(require_permission(AdminPermission.MANAGE_CONTACTS))):
    """Update an existing contact"""
    
    # Validate field lengths if provided
    if 'label' in contact_data and len(contact_data['label']) < 2:
        raise HTTPException(status_code=400, detail="Contact label must be at least 2 characters")
    
    if 'value' in contact_data and len(contact_data['value']) < 1:
        raise HTTPException(status_code=400, detail="Contact value cannot be empty")
    
    success = await database.update_contact(contact_id, contact_data, admin["id"]) 
    
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found or update failed")
    
    return {
        "message": "Contact updated successfully",
        "contact_id": contact_id
    }

@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact"""
    
    success = await database.delete_contact(contact_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found or deletion failed")
    
    return {
        "message": "Contact deleted successfully",
        "contact_id": contact_id
    }

@router.post("/contacts/initialize-defaults")
async def initialize_default_contacts():
    """Initialize default contact information"""
    
    await database.initialize_default_contacts()
    
    return {
        "message": "Default contacts initialized successfully"
    }

# ==========================================
# POLICY MANAGEMENT
# ==========================================

@router.get("/policies")
async def get_all_policies():
    """Get all policies for admin management"""
    
    policies = await database.get_all_policies()
    
    # Get history count for each policy
    policies_with_stats = []
    for policy in policies:
        try:
            # Handle missing or null policy_type gracefully
            policy_type = policy.get("policy_type")
            if not policy_type:
                logger.warning(f"Policy {policy.get('id', 'unknown')} has no policy_type, skipping")
                continue
                
            history = await database.get_policy_history(policy_type)
            policy_stats = {
                **policy,
                "has_history": len(history) > 0,
                "total_versions": len(history) + 1  # +1 for current version
            }
            policies_with_stats.append(policy_stats)
        except Exception as e:
            logger.error(f"Error processing policy {policy.get('id', 'unknown')}: {str(e)}")
            # Add policy without stats if there's an error
            policies_with_stats.append({
                **policy,
                "has_history": False,
                "total_versions": 1
            })
    
    return {
        "policies": policies_with_stats,
        "total_count": len(policies_with_stats)
    }

@router.get("/policies/types")
async def get_policy_types():
    """Get available policy types"""
    
    return {
        "policy_types": [
            {"value": "privacy_policy", "label": "Privacy Policy"},
            {"value": "terms_of_service", "label": "Terms of Service"},
            {"value": "reviews_policy", "label": "Reviews Policy"},
            {"value": "cookie_policy", "label": "Cookie Policy"},
            {"value": "refund_policy", "label": "Refund/Cancellation Policy"}
        ]
    }

@router.get("/policies/{policy_type}")
async def get_policy_by_type(policy_type: str):
    """Get current active policy by type"""
    
    policy = await database.get_policy_by_type(policy_type)
    
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Get history for this policy type
    history = await database.get_policy_history(policy_type)
    
    return {
        "policy": policy,
        "has_history": len(history) > 0,
        "total_versions": len(history) + 1
    }

@router.get("/policies/{policy_type}/history")
async def get_policy_history(policy_type: str):
    """Get version history for a policy type"""
    
    history = await database.get_policy_history(policy_type)
    
    return {
        "policy_type": policy_type,
        "history": history,
        "total_versions": len(history)
    }

@router.post("/policies")
async def create_policy(policy_data: dict, admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))):
    """Create a new policy"""
    
    # Validate required fields
    required_fields = ['policy_type', 'title', 'content']
    for field in required_fields:
        if field not in policy_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate policy type
    valid_types = ['privacy_policy', 'terms_of_service', 'reviews_policy', 'cookie_policy', 'refund_policy']
    if policy_data['policy_type'] not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid policy type. Must be one of: {valid_types}")
    
    # Validate content length
    if len(policy_data['content']) < 50:
        raise HTTPException(status_code=400, detail="Policy content must be at least 50 characters")
    
    # Validate title length
    if len(policy_data['title']) < 5:
        raise HTTPException(status_code=400, detail="Policy title must be at least 5 characters")
    
    policy_id = await database.create_policy(policy_data, admin["id"]) 
    
    if not policy_id:
        raise HTTPException(status_code=500, detail="Failed to create policy")
    
    return {
        "message": "Policy created successfully",
        "policy_id": policy_id,
        "policy_type": policy_data['policy_type']
    }

@router.put("/policies/{policy_id}")
async def update_policy(policy_id: str, policy_data: dict, admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))):
    """Update an existing policy"""
    
    # Validate content length if provided
    if 'content' in policy_data and len(policy_data['content']) < 50:
        raise HTTPException(status_code=400, detail="Policy content must be at least 50 characters")
    
    # Validate title length if provided
    if 'title' in policy_data and len(policy_data['title']) < 5:
        raise HTTPException(status_code=400, detail="Policy title must be at least 5 characters")
    
    success = await database.update_policy(policy_id, policy_data, admin["id"])
    
    if not success:
        raise HTTPException(status_code=404, detail="Policy not found or update failed")
    
    return {
        "message": "Policy updated successfully",
        "policy_id": policy_id
    }

@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str, admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))):
    """Delete a policy (only drafts can be deleted)"""
    
    success = await database.delete_policy(policy_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Policy not found or cannot be deleted (only drafts can be deleted)")
    
    return {
        "message": "Policy deleted successfully",
        "policy_id": policy_id
    }

@router.post("/policies/{policy_type}/restore/{version}")
async def restore_policy_version(policy_type: str, version: int, admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))):
    """Restore a specific version of a policy"""
    
    policy_id = await database.restore_policy_version(policy_type, version, admin["id"])
    
    if not policy_id:
        raise HTTPException(status_code=404, detail="Policy version not found or restore failed")
    
    return {
        "message": f"Policy version {version} restored successfully",
        "policy_id": policy_id,
        "policy_type": policy_type,
        "restored_version": version
    }

@router.post("/policies/{policy_id}/archive")
async def archive_policy(policy_id: str, admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))):
    """Manually archive a policy"""
    
    success = await database.archive_policy(policy_id, admin["id"])
    
    if not success:
        raise HTTPException(status_code=404, detail="Policy not found or archive failed")
    
    return {
        "message": "Policy archived successfully",
        "policy_id": policy_id
    }

@router.post("/policies/activate-scheduled")
async def activate_scheduled_policies():
    """Manually trigger activation of scheduled policies (for testing)"""
    
    activated_count = await database.activate_scheduled_policies()
    
    return {
        "message": f"Activated {activated_count} scheduled policies",
        "activated_count": activated_count
    }

@router.post("/policies/initialize-defaults")
async def initialize_default_policies(admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))):
    created_count = await database.initialize_default_policies(admin["id"])
    return {
        "message": f"Initialized {created_count} default policies",
        "created_count": created_count
    }

# ==========================================
# USER MANAGEMENT
# ==========================================

@router.get("/users")
async def get_all_users(
    skip: int = 0, 
    limit: int = 50,
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all registered users with filtering options"""
    
    users = await database.get_all_users_for_admin(
        skip=skip, 
        limit=limit, 
        role=role, 
        status=status,
        search=search
    )
    
    # Get user statistics
    total_users = await database.get_total_users_count()
    active_users = await database.get_active_users_count()
    homeowners_count = await database.get_users_count_by_role("homeowner")
    tradespeople_count = await database.get_users_count_by_role("tradesperson")
    
    filtered_total = await database.get_users_total_count_filtered(role=role, status=status, search=search)
    pages = (filtered_total + limit - 1) // limit
    return {
        "users": users,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": filtered_total,
            "pages": pages
        },
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "homeowners": homeowners_count,
            "tradespeople": tradespeople_count,
            "verified_users": await database.get_verified_users_count()
        }
    }

@router.get("/users/{user_id}")
async def get_user_details(user_id: str):
    """Get detailed information about a specific user"""
    
    user = await database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get additional user activity data
    user_activity = await database.get_user_activity_stats(user_id)
    
    # Remove password hash for security
    user.pop("password_hash", None)
    user["_id"] = str(user.get("_id", ""))
    
    return {
        "user": user,
        "activity_stats": user_activity
    }

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status: str = Form(...),
    admin_notes: str = Form(""),
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_USERS))
):
    """Update user status (active, suspended, banned)"""
    
    valid_statuses = ["active", "suspended", "banned"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    success = await database.update_user_status(user_id, status, admin_notes)
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"Admin {admin['id']} updated status for user {user_id} to {status}")
    
    return {
        "message": f"User status updated to {status}",
        "user_id": user_id,
        "new_status": status,
        "admin_notes": admin_notes
    }

# ==========================================
# LOCATION MANAGEMENT (States, LGAs, Towns)
# ==========================================

@router.get("/locations/states")
async def get_all_states():
    """Get all Nigerian states"""
    # Get states from database (new ones added by admin)
    custom_states = await database.get_custom_states()
    
    # Get default states from constants
    from models.nigerian_states import NIGERIAN_STATES
    
    # Combine both lists and remove duplicates
    all_states = list(set(NIGERIAN_STATES + custom_states))
    all_states.sort()  # Sort alphabetically
    
    return {"states": all_states}

@router.post("/locations/states")
async def add_new_state(
    state_name: str = Form(...),
    region: str = Form(""),
    postcode_samples: str = Form("")  # Comma-separated postcodes
):
    """Add a new Nigerian state"""
    
    # Validate state name
    if not state_name.strip():
        raise HTTPException(status_code=400, detail="State name is required")
    
    from models.nigerian_states import NIGERIAN_STATES
    
    if state_name in NIGERIAN_STATES:
        raise HTTPException(status_code=400, detail="State already exists")
    
    # Add state to the list (in production, this would be database operation)
    success = await database.add_new_state(state_name.strip(), region, postcode_samples)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add state")
    
    return {
        "message": "State added successfully",
        "state_name": state_name,
        "region": region
    }

@router.put("/locations/states/{state_name}")
async def update_state(
    state_name: str,
    new_name: str = Form(...),
    region: str = Form(""),
    postcode_samples: str = Form("")
):
    """Update an existing state"""
    
    success = await database.update_state(state_name, new_name.strip(), region, postcode_samples)
    
    if not success:
        raise HTTPException(status_code=404, detail="State not found")
    
    return {
        "message": "State updated successfully",
        "old_name": state_name,
        "new_name": new_name
    }

@router.delete("/locations/states/{state_name}")
async def delete_state(state_name: str):
    """Delete a state (and all its LGAs)"""
    
    success = await database.delete_state(state_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="State not found")
    
    return {"message": f"State '{state_name}' deleted successfully"}

@router.get("/locations/lgas")
async def get_all_lgas():
    """Get all LGAs organized by state"""
    # Get static LGAs
    from models.nigerian_lgas import NIGERIAN_LGAS
    
    # Get custom LGAs from database
    custom_lgas = await database.get_custom_lgas()
    
    # Merge both dictionaries
    all_lgas = NIGERIAN_LGAS.copy()
    for state, lgas in custom_lgas.items():
        if state in all_lgas:
            # Merge LGAs for existing state
            all_lgas[state] = list(set(all_lgas[state] + lgas))
        else:
            # Add new state with its LGAs
            all_lgas[state] = lgas
    
    return {"lgas": all_lgas}

@router.get("/locations/lgas/{state_name}")
async def get_lgas_for_state(state_name: str):
    """Get LGAs for a specific state"""
    # Get static LGAs
    from models.nigerian_lgas import get_lgas_for_state as get_static_lgas
    static_lgas = get_static_lgas(state_name) or []
    
    # Get custom LGAs from database
    custom_lgas = await database.get_custom_lgas()
    dynamic_lgas = custom_lgas.get(state_name, [])
    
    # Combine both lists and remove duplicates
    all_lgas = list(set(static_lgas + dynamic_lgas))
    
    if not all_lgas:
        raise HTTPException(status_code=404, detail="State not found or no LGAs available")
    
    return {"state": state_name, "lgas": all_lgas}

@router.post("/locations/lgas")
async def add_new_lga(
    state_name: str = Form(...),
    lga_name: str = Form(...),
    zip_codes: str = Form("")  # Comma-separated zip codes
):
    """Add a new LGA to a state"""
    
    if not lga_name.strip():
        raise HTTPException(status_code=400, detail="LGA name is required")
    
    success = await database.add_new_lga(state_name, lga_name.strip(), zip_codes)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add LGA. State may not exist or LGA already exists.")
    
    return {
        "message": "LGA added successfully",
        "state": state_name,
        "lga": lga_name
    }

@router.put("/locations/lgas/{state_name}/{lga_name}")
async def update_lga(
    state_name: str,
    lga_name: str,
    new_name: str = Form(...),
    zip_codes: str = Form("")
):
    """Update an existing LGA"""
    
    success = await database.update_lga(state_name, lga_name, new_name.strip(), zip_codes)
    
    if not success:
        raise HTTPException(status_code=404, detail="LGA not found")
    
    return {
        "message": "LGA updated successfully",
        "state": state_name,
        "old_name": lga_name,
        "new_name": new_name
    }

@router.delete("/locations/lgas/{state_name}/{lga_name}")
async def delete_lga(state_name: str, lga_name: str):
    """Delete an LGA from a state"""
    
    success = await database.delete_lga(state_name, lga_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="LGA not found")
    
    return {"message": f"LGA '{lga_name}' deleted from {state_name}"}

@router.get("/locations/towns")
async def get_all_towns():
    """Get all towns organized by state and LGA"""
    towns = await database.get_all_towns()
    return {"towns": towns}

@router.post("/locations/towns")
async def add_new_town(
    state_name: str = Form(...),
    lga_name: str = Form(...),
    town_name: str = Form(...),
    zip_code: str = Form("")
):
    """Add a new town to an LGA"""
    
    if not town_name.strip():
        raise HTTPException(status_code=400, detail="Town name is required")
    
    success = await database.add_new_town(state_name, lga_name, town_name.strip(), zip_code)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add town. State or LGA may not exist.")
    
    return {
        "message": "Town added successfully",
        "state": state_name,
        "lga": lga_name,
        "town": town_name
    }

@router.delete("/locations/towns/{state_name}/{lga_name}/{town_name}")
async def delete_town(state_name: str, lga_name: str, town_name: str):
    """Delete a town"""
    
    success = await database.delete_town(state_name, lga_name, town_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="Town not found")
    
    return {"message": f"Town '{town_name}' deleted successfully"}

# ==========================================
# TRADE CATEGORIES MANAGEMENT
# ==========================================

@router.get("/trades")
async def get_all_trades():
    """Get all trade categories (static + custom)"""
    from models.trade_categories import NIGERIAN_TRADE_CATEGORIES, TRADE_CATEGORY_GROUPS
    
    # Get custom trades from database
    custom_data = await database.get_custom_trades()
    custom_trades = custom_data.get("trades", [])
    custom_groups = custom_data.get("groups", {})
    
    # Combine static and custom trades
    all_trades = list(set(NIGERIAN_TRADE_CATEGORIES + custom_trades))
    all_trades.sort()  # Sort alphabetically
    
    # Combine static and custom groups
    all_groups = TRADE_CATEGORY_GROUPS.copy()
    for group, trades in custom_groups.items():
        if group in all_groups:
            # Merge with existing group
            all_groups[group] = list(set(all_groups[group] + trades))
        else:
            # Add new group
            all_groups[group] = trades
    
    return {
        "trades": all_trades,
        "groups": all_groups
    }

@router.post("/trades")
async def add_new_trade(
    trade_name: str = Form(...),
    group: str = Form("General Services"),
    description: str = Form("")
):
    """Add a new trade category"""
    
    if not trade_name.strip():
        raise HTTPException(status_code=400, detail="Trade name is required")
    
    from models.trade_categories import NIGERIAN_TRADE_CATEGORIES
    
    if trade_name in NIGERIAN_TRADE_CATEGORIES:
        raise HTTPException(status_code=400, detail="Trade category already exists")
    
    success = await database.add_new_trade(trade_name.strip(), group, description)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add trade category")
    
    return {
        "message": "Trade category added successfully",
        "trade_name": trade_name,
        "group": group
    }

@router.put("/trades/{trade_name}")
async def update_trade(
    trade_name: str,
    new_name: str = Form(...),
    group: str = Form(""),
    description: str = Form("")
):
    """Update an existing trade category"""
    
    if not new_name.strip():
        raise HTTPException(status_code=400, detail="Trade name is required")
    
    success = await database.update_trade(trade_name, new_name.strip(), group, description)
    
    if not success:
        raise HTTPException(status_code=404, detail="Trade category not found")
    
    return {
        "message": "Trade category updated successfully",
        "old_name": trade_name,
        "new_name": new_name
    }

@router.put("/trades/update")
async def update_trade_by_form(
    old_name: str = Form(...),
    new_name: str = Form(...),
    group: str = Form(""),
    description: str = Form("")
):
    """Update trade category using form body instead of path param.
    Helps avoid proxy/path encoding issues for names with special characters.
    """
    if not new_name.strip():
        raise HTTPException(status_code=400, detail="Trade name is required")

    success = await database.update_trade(old_name.strip(), new_name.strip(), group, description)
    if not success:
        # Determine if static trade exists to provide clearer error
        try:
            from models.trade_categories import NIGERIAN_TRADE_CATEGORIES
            if old_name.strip() in NIGERIAN_TRADE_CATEGORIES:
                raise HTTPException(status_code=500, detail="Failed to update trade (database error or permission)")
        except Exception:
            pass
        raise HTTPException(status_code=404, detail="Trade category not found")

    return {
        "message": "Trade category updated successfully",
        "old_name": old_name,
        "new_name": new_name
    }

@router.delete("/trades/{trade_name}")
async def delete_trade(trade_name: str):
    """Delete a trade category"""
    
    success = await database.delete_trade(trade_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="Trade category not found")
    
    return {"message": f"Trade category '{trade_name}' deleted successfully"}

# ==========================================
# NOTIFICATION MANAGEMENT
# ==========================================

@router.get("/notifications")
async def get_all_notifications(
    skip: int = 0,
    limit: int = 50,
    notification_type: Optional[str] = None,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get all notifications with filtering options for admin management"""
    
    # Build filters
    filters = {}
    if notification_type:
        filters["type"] = notification_type
    if status:
        filters["status"] = status
    if channel:
        filters["channel"] = channel
    if date_from:
        filters["created_at"] = {"$gte": datetime.fromisoformat(date_from)}
    if date_to:
        if "created_at" in filters:
            filters["created_at"]["$lte"] = datetime.fromisoformat(date_to)
        else:
            filters["created_at"] = {"$lte": datetime.fromisoformat(date_to)}
    
    notifications = await database.get_admin_notifications(
        filters=filters,
        skip=skip,
        limit=limit
    )
    
    total_count = await database.get_notifications_count(filters)
    filtered_counts = await database.get_notification_status_counts(filters)
    base_stats = await database.get_notification_stats()
    stats = {**base_stats, **filtered_counts}
    
    return {
        "notifications": notifications,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total_count
        },
        "stats": stats
    }

@router.get("/notifications/{notification_id}")
async def get_notification_details(notification_id: str):
    """Get detailed information about a specific notification"""
    
    notification = await database.get_notification_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"notification": notification}

@router.put("/notifications/{notification_id}/status")
async def update_notification_status(
    notification_id: str,
    status: str = Form(...),
    admin_notes: str = Form("")
):
    """Update notification status (resend, mark as failed, etc.)"""
    
    status = (status or "").strip().lower()
    admin_notes = admin_notes or ""
    valid_statuses = ["pending", "sent", "delivered", "failed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    success = await database.update_notification_status_admin(notification_id, status, admin_notes)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {
        "message": f"Notification status updated to {status}",
        "notification_id": notification_id,
        "new_status": status
    }

@router.post("/notifications/{notification_id}/resend")
async def resend_notification(notification_id: str):
    """Resend a failed or cancelled notification"""
    
    logger.info(f"Resend request received for notification_id: {notification_id}")
    
    success = await database.resend_notification(notification_id)
    
    if not success:
        # Check if notification exists to provide better error message
        notification = await database.get_notification_by_id(notification_id)
        if not notification:
            raise HTTPException(
                status_code=404,
                detail=f"Notification {notification_id} not found"
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail="Cannot resend notification. It may be missing required data (user, type, or recipient contact info)."
            )
    
    return {
        "message": "Notification resent",
        "notification_id": notification_id
    }

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification (admin only)"""
    
    success = await database.delete_notification_admin(notification_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {
        "message": "Notification deleted successfully",
        "notification_id": notification_id
    }

# ==========================================
# NOTIFICATION TEMPLATES MANAGEMENT
# ==========================================

@router.get("/notifications/templates")
async def get_notification_templates():
    """Get all notification templates for admin management"""
    
    templates = await database.get_all_notification_templates()
    
    return {
        "templates": templates,
        "types": [
            {"value": "new_interest", "label": "New Interest"},
            {"value": "contact_shared", "label": "Contact Shared"},
            {"value": "job_posted", "label": "Job Posted"},
            {"value": "payment_confirmation", "label": "Payment Confirmation"},
            {"value": "new_message", "label": "New Message"},
            {"value": "new_matching_job", "label": "New Matching Job"},
            {"value": "job_cancelled", "label": "Job Cancelled"}
        ],
        "channels": [
            {"value": "email", "label": "Email"},
            {"value": "sms", "label": "SMS"},
            {"value": "both", "label": "Both"}
        ]
    }

@router.get("/notifications/templates/{template_id}")
async def get_notification_template(template_id: str):
    """Get specific notification template by ID"""
    
    template = await database.get_notification_template_by_id(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"template": template}

@router.put("/notifications/templates/{template_id}")
async def update_notification_template(
    template_id: str,
    template_data: dict
):
    """Update notification template"""
    
    # Validate required fields
    required_fields = ['subject_template', 'content_template']
    for field in required_fields:
        if field not in template_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate template content
    if len(template_data['subject_template']) < 5:
        raise HTTPException(status_code=400, detail="Subject template must be at least 5 characters")
    
    if len(template_data['content_template']) < 20:
        raise HTTPException(status_code=400, detail="Content template must be at least 20 characters")
    
    success = await database.update_notification_template(template_id, template_data)
    
    if not success:
        raise HTTPException(status_code=404, detail="Template not found or update failed")
    
    return {
        "message": "Template updated successfully",
        "template_id": template_id
    }

@router.post("/notifications/templates")
async def create_notification_template(template_data: dict):
    """Create a new notification template"""
    
    # Validate required fields
    required_fields = ['type', 'channel', 'subject_template', 'content_template', 'variables']
    for field in required_fields:
        if field not in template_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate template content
    if len(template_data['subject_template']) < 5:
        raise HTTPException(status_code=400, detail="Subject template must be at least 5 characters")
    
    if len(template_data['content_template']) < 20:
        raise HTTPException(status_code=400, detail="Content template must be at least 20 characters")
    
    template_id = await database.create_notification_template(template_data)
    
    if not template_id:
        raise HTTPException(status_code=500, detail="Failed to create template")
    
    return {
        "message": "Template created successfully",
        "template_id": template_id,
        "template_type": template_data['type']
    }

@router.post("/notifications/templates/{template_id}/test")
async def test_notification_template(
    template_id: str,
    test_data: dict
):
    """Test a notification template with sample data"""
    
    try:
        result = await database.test_notification_template(template_id, test_data)
        
        return {
            "message": "Template test successful",
            "rendered_subject": result["subject"],
            "rendered_content": result["content"],
            "variables_used": result["variables_used"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Template test failed: {str(e)}"
        )

# ==========================================
# NOTIFICATION PREFERENCES MANAGEMENT
# ==========================================

@router.get("/notifications/preferences")
async def get_user_notification_preferences_admin(
    skip: int = 0,
    limit: int = 50,
    user_role: Optional[str] = None
):
    """Get user notification preferences for admin review"""
    
    preferences = await database.get_all_user_preferences(
        skip=skip,
        limit=limit,
        user_role=user_role
    )
    
    # Get aggregated stats
    stats = await database.get_notification_preferences_stats()
    
    return {
        "preferences": preferences,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(preferences)
        },
        "stats": stats
    }

@router.put("/notifications/preferences/{user_id}")
async def update_user_notification_preferences_admin(
    user_id: str,
    preferences_data: dict
):
    """Update user notification preferences (admin override)"""
    
    success = await database.update_user_notification_preferences_admin(
        user_id,
        preferences_data
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="User preferences not found")
    
    return {
        "message": "User notification preferences updated successfully",
        "user_id": user_id
    }

# ==========================================
# NOTIFICATION ANALYTICS
# ==========================================

@router.get("/notifications/analytics")
async def get_notification_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get comprehensive notification analytics for admin dashboard"""
    
    analytics = await database.get_notification_analytics(date_from, date_to)
    
    return {
        "analytics": analytics,
        "date_range": {
            "from": date_from,
            "to": date_to
        }
    }

@router.get("/notifications/delivery-report")
async def get_notification_delivery_report(
    notification_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get detailed delivery report for notifications"""
    
    report = await database.get_notification_delivery_report(
        notification_type,
        date_from,
        date_to
    )
    
    return {
        "delivery_report": report,
        "filters": {
            "type": notification_type,
            "date_from": date_from,
            "date_to": date_to
        }
    }

# Skills Test Questions Management
@router.get("/skills-questions")
async def get_all_skills_questions():
    """Get all skills test questions grouped by trade"""
    
    questions = await database.get_all_skills_questions()
    stats = await database.get_question_stats()
    
    return {
        "questions": questions,
        "stats": stats,
        "total_questions": sum(len(q) for q in questions.values())
    }

@router.get("/skills-questions/{trade_category:path}")
async def get_questions_for_trade(trade_category: str):
    """Get all questions for a specific trade category"""
    
    questions = await database.get_questions_for_trade(trade_category)
    
    return {
        "trade_category": trade_category,
        "questions": questions,
        "count": len(questions)
    }

@router.post("/skills-questions/{trade_category:path}")
async def add_skills_question(trade_category: str, question_data: dict, admin: dict = Depends(require_permission(AdminPermission.MANAGE_TRADES))):
    """Add a new skills test question for a trade category"""
    
    # Validate required fields
    required_fields = ['question', 'options', 'correct_answer']
    for field in required_fields:
        if field not in question_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate options array
    if not isinstance(question_data['options'], list) or len(question_data['options']) < 2:
        raise HTTPException(status_code=400, detail="Options must be an array with at least 2 items")
    
    # Validate correct_answer index
    if not isinstance(question_data['correct_answer'], int) or question_data['correct_answer'] >= len(question_data['options']):
        raise HTTPException(status_code=400, detail="Invalid correct_answer index")
    
    question_id = await database.add_skills_question(trade_category, question_data)
    
    if not question_id:
        raise HTTPException(status_code=500, detail="Failed to add question")
    
    logger.info(f"Admin {admin['id']} added skills question {question_id} for trade {trade_category}")
    
    return {
        "message": "Skills question added successfully",
        "question_id": question_id,
        "trade_category": trade_category
    }

@router.put("/skills-questions/{question_id}")
async def update_skills_question(question_id: str, question_data: dict, admin: dict = Depends(require_permission(AdminPermission.MANAGE_TRADES))):
    """Update an existing skills test question"""
    
    # Validate required fields
    required_fields = ['question', 'options', 'correct_answer']
    for field in required_fields:
        if field not in question_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate options array
    if not isinstance(question_data['options'], list) or len(question_data['options']) < 2:
        raise HTTPException(status_code=400, detail="Options must be an array with at least 2 items")
    
    # Validate correct_answer index
    if not isinstance(question_data['correct_answer'], int) or question_data['correct_answer'] >= len(question_data['options']):
        raise HTTPException(status_code=400, detail="Invalid correct_answer index")
    
    success = await database.update_skills_question(question_id, question_data)
    
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    
    logger.info(f"Admin {admin['id']} updated skills question {question_id}")
    
    return {
        "message": "Skills question updated successfully",
        "question_id": question_id
    }

@router.delete("/skills-questions/{question_id}")
async def delete_skills_question(question_id: str, admin: dict = Depends(require_permission(AdminPermission.MANAGE_TRADES))):
    """Delete a skills test question"""
    
    success = await database.delete_skills_question(question_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    
    logger.info(f"Admin {admin['id']} deleted skills question {question_id}")
    
    return {"message": f"Skills question deleted successfully"}

@router.get("/wallet/transaction/{transaction_id}")
async def get_transaction_details(transaction_id: str, admin: dict = Depends(require_permission(AdminPermission.MANAGE_WALLET_FUNDING))):
    """Get detailed transaction information for admin review"""
    
    transaction = await database.wallet_transactions_collection.find_one({"id": transaction_id})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get user details
    user = await database.get_user_by_id(transaction["user_id"])
    
    transaction["_id"] = str(transaction["_id"])
    transaction["user_details"] = {
        "name": user.get("name", "Unknown") if user else "Unknown",
        "email": user.get("email", "Unknown") if user else "Unknown",
        "phone": user.get("phone", "Unknown") if user else "Unknown"
    }
    
    return transaction

# ==========================================
# VERIFICATION MANAGEMENT
# ==========================================

@router.get("/verifications/pending")
async def get_pending_verifications(skip: int = 0, limit: int = 20):
    """Get pending identity verifications for admin review"""
    
    verifications = await database.get_pending_verifications(skip=skip, limit=limit)
    
    return {
        "verifications": verifications,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(verifications)
        }
    }

@router.post("/verifications/{verification_id}/approve")
async def approve_verification(
    verification_id: str,
    admin_notes: str = Form(""),
    admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))
):
    """Approve user identity verification"""
    
    success = await database.verify_user_documents(
        verification_id=verification_id,
        admin_id=admin["id"],
        approved=True,
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Verification not found or already processed")
    
    return {
        "message": "Verification approved successfully",
        "verification_id": verification_id,
        "status": "verified",
        "note": "User has been verified and referral rewards processed if applicable"
    }

@router.post("/verifications/{verification_id}/reject")
async def reject_verification(
    verification_id: str,
    admin_notes: str = Form(...),
    admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))
):
    """Reject user identity verification"""
    
    if not admin_notes.strip():
        raise HTTPException(status_code=400, detail="Admin notes are required for rejection")
    
    success = await database.verify_user_documents(
        verification_id=verification_id,
        admin_id=admin["id"],
        approved=False,
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Verification not found or already processed")
    
    return {
        "message": "Verification rejected",
        "verification_id": verification_id,
        "status": "rejected",
        "notes": admin_notes
    }

@router.get("/verifications/{verification_id}")
async def get_verification_details(verification_id: str):
    """Get detailed verification information for admin review"""
    
    verification = await database.user_verifications_collection.find_one({"id": verification_id})
    
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    
    # Get user details
    user = await database.get_user_by_id(verification["user_id"])
    
    verification["_id"] = str(verification["_id"])
    verification["user_details"] = {
        "name": user.get("name", "Unknown") if user else "Unknown",
        "email": user.get("email", "Unknown") if user else "Unknown",
        "phone": user.get("phone", "Unknown") if user else "Unknown",
        "role": user.get("role", "Unknown") if user else "Unknown",
        "created_at": user.get("created_at") if user else None
    }
    
    return verification

@router.get("/verifications/document/{filename}")
async def view_verification_document(filename: str, admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """View verification document image (admin only)"""
    from fastapi.responses import FileResponse
    import os
    
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    file_path = os.path.join(base_dir, "verification_documents", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Verification document not found")
    
    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/verifications/document-base64/{filename}")
async def view_verification_document_base64(filename: str, admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """Return base64 for verification document, preferring DB-stored base64"""
    import os, base64
    # Prefer DB base64
    try:
        doc = await database.get_verification_by_document_filename(filename)
        if doc and doc.get("document_image_base64"):
            return {"image_base64": doc["document_image_base64"]}
    except Exception:
        pass
    # Fallback to disk
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    candidates = [
        os.path.join(base_dir, "verification_documents", filename),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "verification_documents", filename),
        os.path.join(os.getcwd(), "uploads", "verification_documents", filename),
        os.path.join("/app", "uploads", "verification_documents", filename),
    ]
    for fp in candidates:
        if os.path.exists(fp):
            with open(fp, "rb") as f:
                data = f.read()
            return {"image_base64": base64.b64encode(data).decode("utf-8")}
    raise HTTPException(status_code=404, detail="Verification document not found")

@router.get("/tradespeople-verifications/document/{filename}")
async def view_tradespeople_verification_file(filename: str, admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """Serve tradespeople verification files (images or PDFs) for admin review"""
    from fastapi.responses import FileResponse
    import os

    # Resolve common locations where uploads may be stored across environments
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    # Project root uploads (when running from backend directory)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    project_uploads = os.path.join(project_root, "uploads")

    # Also check backend/uploads to cover cases where app was launched from backend dir
    backend_uploads = os.path.join(project_root, "backend", "uploads")

    candidates = [
        os.path.join(base_dir, "tradespeople_verifications", filename),
        os.path.join(project_uploads, "tradespeople_verifications", filename),
        os.path.join(backend_uploads, "tradespeople_verifications", filename),
        os.path.join(os.getcwd(), "uploads", "tradespeople_verifications", filename),
        os.path.join("/app", "uploads", "tradespeople_verifications", filename),
    ]

    for fp in candidates:
        if os.path.exists(fp):
            ext = os.path.splitext(fp)[1].lower()
            media_type = "application/octet-stream"
            if ext in (".jpg", ".jpeg"):
                media_type = "image/jpeg"
            elif ext == ".png":
                media_type = "image/png"
            elif ext == ".pdf":
                media_type = "application/pdf"
            return FileResponse(fp, media_type=media_type)

    raise HTTPException(status_code=404, detail="Tradespeople verification file not found")

@router.get("/tradespeople-verifications/document-base64/{filename}")
async def view_tradespeople_verification_file_base64(filename: str, admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """Return base64 for tradespeople verification file, preferring DB-stored base64.
    Falls back to reading the file from disk if not stored in DB.
    """
    import os, base64
    # Prefer DB base64
    try:
        item = await database.get_tradespeople_file_base64(filename)
        if item and item.get("base64"):
            ct = item.get("content_type") or "application/octet-stream"
            data_url = f"data:{ct};base64,{item['base64']}"
            return {"filename": filename, "content_type": ct, "image_base64": item["base64"], "data_url": data_url}
    except Exception:
        pass
    # Fallback to disk
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    project_uploads = os.path.join(project_root, "uploads")
    backend_uploads = os.path.join(project_root, "backend", "uploads")
    candidates = [
        os.path.join(base_dir, "tradespeople_verifications", filename),
        os.path.join(project_uploads, "tradespeople_verifications", filename),
        os.path.join(backend_uploads, "tradespeople_verifications", filename),
        os.path.join(os.getcwd(), "uploads", "tradespeople_verifications", filename),
        os.path.join("/app", "uploads", "tradespeople_verifications", filename),
    ]
    for fp in candidates:
        if os.path.exists(fp):
            ext = os.path.splitext(fp)[1].lower()
            media_type = "application/octet-stream"
            if ext in (".jpg", ".jpeg"):
                media_type = "image/jpeg"
            elif ext == ".png":
                media_type = "image/png"
            elif ext == ".pdf":
                media_type = "application/pdf"
            with open(fp, "rb") as f:
                data = f.read()
            b64 = base64.b64encode(data).decode("utf-8")
            return {"filename": filename, "content_type": media_type, "image_base64": b64, "data_url": f"data:{media_type};base64,{b64}"}
    raise HTTPException(status_code=404, detail="Tradespeople verification file not found")

# ==========================================
# TRADESPEOPLE REFERENCES VERIFICATION (ADMIN)
# ==========================================

@router.get("/tradespeople-verifications/pending")
async def get_pending_tradespeople_verifications(skip: int = 0, limit: int = 20, admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """List pending tradespeople references verifications"""
    items = await database.get_pending_tradespeople_verifications(skip=skip, limit=limit)
    return {"verifications": items, "pagination": {"skip": skip, "limit": limit, "total": len(items)}}

@router.post("/tradespeople-verifications/{verification_id}/approve")
async def approve_tradespeople_verification(verification_id: str, admin_notes: str = Form(""), admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """Approve tradesperson references verification"""
    ok = await database.approve_tradesperson_verification(verification_id, admin_id=admin["id"], admin_notes=admin_notes)
    if not ok:
        raise HTTPException(status_code=404, detail="Verification not found or already processed")
    return {"message": "Tradesperson verification approved", "verification_id": verification_id, "status": "verified"}

@router.post("/tradespeople-verifications/{verification_id}/reject")
async def reject_tradespeople_verification(verification_id: str, admin_notes: str = Form(...), admin: dict = Depends(require_permission(AdminPermission.VERIFY_USERS))):
    """Reject tradesperson references verification"""
    if not admin_notes.strip():
        raise HTTPException(status_code=400, detail="Admin notes are required for rejection")
    ok = await database.reject_tradesperson_verification(verification_id, admin_id=admin["id"], admin_notes=admin_notes)
    if not ok:
        raise HTTPException(status_code=404, detail="Verification not found or already processed")
    return {"message": "Tradesperson verification rejected", "verification_id": verification_id, "status": "rejected", "notes": admin_notes}

# ==========================================
# TRADE CATEGORY QUESTIONS MANAGEMENT
# ==========================================

@router.get("/trade-questions")
async def get_all_trade_questions(trade_category: Optional[str] = None):
    """Get all trade category questions, optionally filtered by trade category"""
    try:
        questions = await database.get_all_trade_category_questions(trade_category)
        categories_with_questions = await database.get_trade_categories_with_questions()
        
        return {
            "questions": questions,
            "categories_with_questions": categories_with_questions,
            "total_questions": len(questions)
        }
    except Exception as e:
        logger.error(f"Error getting trade questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trade questions")

@router.get("/trade-questions/category/{trade_category}")
async def get_questions_by_category(trade_category: str):
    """Get questions for a specific trade category"""
    try:
        questions = await database.get_questions_by_trade_category(trade_category)
        return {
            "trade_category": trade_category,
            "questions": questions,
            "total_questions": len(questions)
        }
    except Exception as e:
        logger.error(f"Error getting questions for category {trade_category}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve questions for category")

@router.post("/trade-questions")
async def create_trade_question(question_data: dict):
    """Create a new trade category question"""
    try:
        # Validate required fields
        required_fields = ["trade_category", "question_text", "question_type"]
        for field in required_fields:
            if field not in question_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Generate ID
        import uuid
        question_data["id"] = str(uuid.uuid4())
        
        created_question = await database.create_trade_category_question(question_data)
        
        if not created_question:
            raise HTTPException(status_code=500, detail="Failed to create question")
        
        return {
            "message": "Trade category question created successfully",
            "question": created_question
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating trade question: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create trade question")

@router.get("/trade-questions/{question_id}")
async def get_trade_question(question_id: str):
    """Get a specific trade category question"""
    try:
        question = await database.get_trade_category_question_by_id(question_id)
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        return question
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trade question {question_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trade question")

@router.put("/trade-questions/{question_id}")
async def update_trade_question(question_id: str, update_data: dict):
    """Update a trade category question"""
    try:
        updated_question = await database.update_trade_category_question(question_id, update_data)
        
        if not updated_question:
            raise HTTPException(status_code=404, detail="Question not found or update failed")
        
        return {
            "message": "Trade category question updated successfully",
            "question": updated_question
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating trade question {question_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update trade question")

@router.delete("/trade-questions/{question_id}")
async def delete_trade_question(question_id: str):
    """Delete a trade category question"""
    try:
        success = await database.delete_trade_category_question(question_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Question not found")
        
        return {"message": "Trade category question deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting trade question {question_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete trade question")

@router.put("/trade-questions/reorder/{trade_category}")
async def reorder_trade_questions(trade_category: str, question_orders: List[dict]):
    """Reorder questions for a trade category"""
    try:
        success = await database.reorder_trade_category_questions(trade_category, question_orders)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reorder questions")
        
        return {"message": f"Questions reordered successfully for {trade_category}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reordering questions for {trade_category}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reorder questions")

@router.get("/trade-categories-with-questions")
async def get_trade_categories_with_questions():
    """Get all trade categories that have questions defined"""
    try:
        categories = await database.get_trade_categories_with_questions()
        return {
            "categories": categories,
            "total_categories": len(categories)
        }
    except Exception as e:
        logger.error(f"Error getting trade categories with questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trade categories with questions")
from fastapi import APIRouter, HTTPException, Depends, Form
from typing import List, Optional
from datetime import datetime

from database import database
from models.base import JobAccessFeeUpdate, TransactionStatus

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
async def get_pending_funding_requests(skip: int = 0, limit: int = 20):
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
    admin_notes: str = Form("")
):
    """Confirm wallet funding request"""
    
    success = await database.confirm_wallet_funding(
        transaction_id=transaction_id,
        admin_id="admin",  # In production, use actual admin ID
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
    admin_notes: str = Form(...)
):
    """Reject wallet funding request"""
    
    success = await database.reject_wallet_funding(
        transaction_id=transaction_id,
        admin_id="admin",  # In production, use actual admin ID
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
        formatted_job = {
            "id": job["id"],
            "title": job["title"],
            "category": job["category"],
            "location": job["location"],
            "homeowner_name": job["homeowner"]["name"],
            "access_fee_naira": job.get("access_fee_naira", 1500),
            "access_fee_coins": job.get("access_fee_coins", 15),
            "interests_count": job.get("interests_count", 0),
            "created_at": job["created_at"],
            "status": job.get("status", "active")
        }
        formatted_jobs.append(formatted_job)
    
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
    access_fee_naira: int = Form(...)
):
    """Update access fee for a specific job"""
    
    # Validate fee is positive and reasonable
    if access_fee_naira <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Access fee must be greater than ₦0"
        )
    
    if access_fee_naira > 10000:
        raise HTTPException(
            status_code=400, 
            detail="Access fee cannot exceed ₦10,000"
        )
    
    # Check if job exists
    job = await database.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update access fee
    success = await database.update_job_access_fee(job_id, access_fee_naira)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update access fee")
    
    access_fee_coins = access_fee_naira // 100
    
    return {
        "message": "Access fee updated successfully",
        "job_id": job_id,
        "job_title": job["title"],
        "new_access_fee_naira": access_fee_naira,
        "new_access_fee_coins": access_fee_coins
    }

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

@router.get("/jobs/{job_id}/details")
async def get_job_details_for_admin(job_id: str):
    """Get detailed job information for admin editing"""
    
    job = await database.get_job_by_id_admin(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"job": job}

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
    
    # Soft delete job
    success = await database.soft_delete_job_admin(job_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete job")
    
    return {
        "message": "Job deleted successfully",
        "job_id": job_id
    }

@router.get("/jobs/stats")
async def get_jobs_statistics_admin():
    """Get comprehensive job statistics for admin dashboard"""
    
    stats = await database.get_jobs_statistics_admin()
    
    return {
        "job_stats": stats
    }

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
async def view_payment_proof(filename: str):
    """View payment proof image (admin only)"""
    from fastapi.responses import FileResponse
    import os
    
    file_path = f"/app/uploads/payment_proofs/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Payment proof not found")
    
    return FileResponse(file_path, media_type="image/jpeg")

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
async def create_contact(contact_data: dict):
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
    
    contact_id = await database.create_contact(contact_data, "admin")
    
    if not contact_id:
        raise HTTPException(status_code=500, detail="Failed to create contact")
    
    return {
        "message": "Contact created successfully",
        "contact_id": contact_id,
        "contact_type": contact_data['contact_type']
    }

@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact_data: dict):
    """Update an existing contact"""
    
    # Validate field lengths if provided
    if 'label' in contact_data and len(contact_data['label']) < 2:
        raise HTTPException(status_code=400, detail="Contact label must be at least 2 characters")
    
    if 'value' in contact_data and len(contact_data['value']) < 1:
        raise HTTPException(status_code=400, detail="Contact value cannot be empty")
    
    success = await database.update_contact(contact_id, contact_data, "admin")
    
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
        history = await database.get_policy_history(policy["policy_type"])
        policy_stats = {
            **policy,
            "has_history": len(history) > 0,
            "total_versions": len(history) + 1  # +1 for current version
        }
        policies_with_stats.append(policy_stats)
    
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
async def create_policy(policy_data: dict):
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
    
    policy_id = await database.create_policy(policy_data, "admin")
    
    if not policy_id:
        raise HTTPException(status_code=500, detail="Failed to create policy")
    
    return {
        "message": "Policy created successfully",
        "policy_id": policy_id,
        "policy_type": policy_data['policy_type']
    }

@router.put("/policies/{policy_id}")
async def update_policy(policy_id: str, policy_data: dict):
    """Update an existing policy"""
    
    # Validate content length if provided
    if 'content' in policy_data and len(policy_data['content']) < 50:
        raise HTTPException(status_code=400, detail="Policy content must be at least 50 characters")
    
    # Validate title length if provided
    if 'title' in policy_data and len(policy_data['title']) < 5:
        raise HTTPException(status_code=400, detail="Policy title must be at least 5 characters")
    
    success = await database.update_policy(policy_id, policy_data, "admin")
    
    if not success:
        raise HTTPException(status_code=404, detail="Policy not found or update failed")
    
    return {
        "message": "Policy updated successfully",
        "policy_id": policy_id
    }

@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str):
    """Delete a policy (only drafts can be deleted)"""
    
    success = await database.delete_policy(policy_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Policy not found or cannot be deleted (only drafts can be deleted)")
    
    return {
        "message": "Policy deleted successfully",
        "policy_id": policy_id
    }

@router.post("/policies/{policy_type}/restore/{version}")
async def restore_policy_version(policy_type: str, version: int):
    """Restore a specific version of a policy"""
    
    policy_id = await database.restore_policy_version(policy_type, version, "admin")
    
    if not policy_id:
        raise HTTPException(status_code=404, detail="Policy version not found or restore failed")
    
    return {
        "message": f"Policy version {version} restored successfully",
        "policy_id": policy_id,
        "policy_type": policy_type,
        "restored_version": version
    }

@router.post("/policies/{policy_id}/archive")
async def archive_policy(policy_id: str):
    """Manually archive a policy"""
    
    success = await database.archive_policy(policy_id, "admin")
    
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
    
    return {
        "users": users,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(users)
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
    admin_notes: str = Form("")
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
    """Get all trade categories"""
    from models.trade_categories import NIGERIAN_TRADE_CATEGORIES, TRADE_CATEGORY_GROUPS
    return {
        "trades": NIGERIAN_TRADE_CATEGORIES,
        "groups": TRADE_CATEGORY_GROUPS
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

@router.delete("/trades/{trade_name}")
async def delete_trade(trade_name: str):
    """Delete a trade category"""
    
    success = await database.delete_trade(trade_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="Trade category not found")
    
    return {"message": f"Trade category '{trade_name}' deleted successfully"}

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

@router.get("/skills-questions/{trade_category}")
async def get_questions_for_trade(trade_category: str):
    """Get all questions for a specific trade category"""
    
    questions = await database.get_questions_for_trade(trade_category)
    
    return {
        "trade_category": trade_category,
        "questions": questions,
        "count": len(questions)
    }

@router.post("/skills-questions/{trade_category}")
async def add_skills_question(trade_category: str, question_data: dict):
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
    
    return {
        "message": "Skills question added successfully",
        "question_id": question_id,
        "trade_category": trade_category
    }

@router.put("/skills-questions/{question_id}")
async def update_skills_question(question_id: str, question_data: dict):
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
    
    return {
        "message": "Skills question updated successfully",
        "question_id": question_id
    }

@router.delete("/skills-questions/{question_id}")
async def delete_skills_question(question_id: str):
    """Delete a skills test question"""
    
    success = await database.delete_skills_question(question_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": f"Skills question deleted successfully"}

@router.get("/wallet/transaction/{transaction_id}")
async def get_transaction_details(transaction_id: str):
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
    admin_notes: str = Form("")
):
    """Approve user identity verification"""
    
    success = await database.verify_user_documents(
        verification_id=verification_id,
        admin_id="admin",  # In production, use actual admin ID
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
    admin_notes: str = Form(...)
):
    """Reject user identity verification"""
    
    if not admin_notes.strip():
        raise HTTPException(status_code=400, detail="Admin notes are required for rejection")
    
    success = await database.verify_user_documents(
        verification_id=verification_id,
        admin_id="admin",  # In production, use actual admin ID
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
async def view_verification_document(filename: str):
    """View verification document image (admin only)"""
    from fastapi.responses import FileResponse
    import os
    
    file_path = f"/app/uploads/verification_documents/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Verification document not found")
    
    return FileResponse(file_path, media_type="image/jpeg")
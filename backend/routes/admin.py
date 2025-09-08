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
    from models.nigerian_states import NIGERIAN_STATES
    return {"states": NIGERIAN_STATES}

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
    from models.nigerian_lgas import NIGERIAN_LGAS
    return {"lgas": NIGERIAN_LGAS}

@router.get("/locations/lgas/{state_name}")
async def get_lgas_for_state(state_name: str):
    """Get LGAs for a specific state"""
    from models.nigerian_lgas import get_lgas_for_state
    lgas = get_lgas_for_state(state_name)
    if not lgas:
        raise HTTPException(status_code=404, detail="State not found or no LGAs available")
    return {"state": state_name, "lgas": lgas}

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
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
            "min_access_fee": "₦1,500 (15 coins)",
            "max_access_fee": "₦5,000 (50 coins)",
            "min_funding_amount": "₦1,500 (15 coins)",
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
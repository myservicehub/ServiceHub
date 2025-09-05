from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import os
import uuid
from PIL import Image
import io

from auth.dependencies import get_current_user
from database import database
from models.base import (
    ReferralStats, DocumentUpload, VerificationSubmission,
    DocumentType, WithdrawalRequest, WalletResponseWithReferrals
)

router = APIRouter(prefix="/api/referrals", tags=["referrals"])

@router.get("/my-stats", response_model=ReferralStats)
async def get_my_referral_stats(current_user = Depends(get_current_user)):
    """Get current user's referral statistics and referral code"""
    
    stats = await database.get_user_referral_stats(current_user.id)
    
    if not stats:
        raise HTTPException(status_code=404, detail="User not found")
    
    return ReferralStats(**stats)

@router.get("/my-referrals")
async def get_my_referrals(
    skip: int = 0,
    limit: int = 10,
    current_user = Depends(get_current_user)
):
    """Get list of users I have referred"""
    
    referrals = await database.get_user_referrals(current_user.id, skip=skip, limit=limit)
    
    return {
        "referrals": referrals,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(referrals)
        }
    }

@router.post("/verify-documents")
async def submit_verification_documents(
    document_type: DocumentType = Form(...),
    full_name: str = Form(...),
    document_number: str = Form(""),
    document_image: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Submit documents for identity verification"""
    
    # Check if user already has pending or verified submission
    existing = await database.user_verifications_collection.find_one({
        "user_id": current_user.id,
        "status": {"$in": ["pending", "verified"]}
    })
    
    if existing:
        if existing["status"] == "verified":
            raise HTTPException(status_code=400, detail="Account already verified")
        else:
            raise HTTPException(status_code=400, detail="Verification already submitted and pending review")
    
    # Validate image file
    if not document_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Create uploads directory
    upload_dir = "/app/uploads/verification_documents"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = document_image.filename.split(".")[-1].lower()
    filename = f"{current_user.id}_{document_type}_{uuid.uuid4().hex}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save and optimize image
    try:
        # Read image data
        image_data = await document_image.read()
        
        # Open and optimize image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Resize if too large (max 1920x1920 for document clarity)
        if image.width > 1920 or image.height > 1920:
            image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        
        # Save optimized image
        image.save(file_path, "JPEG", quality=90, optimize=True)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Submit verification
    verification_id = await database.submit_verification_documents(
        user_id=current_user.id,
        document_type=document_type,
        document_url=filename,
        full_name=full_name,
        document_number=document_number
    )
    
    return VerificationSubmission(
        message="Verification documents submitted successfully. You will be notified within 2-3 business days.",
        verification_id=verification_id,
        status="pending"
    )

@router.get("/wallet-with-referrals", response_model=WalletResponseWithReferrals)
async def get_wallet_with_referral_info(current_user: dict = Depends(get_current_user)):
    """Get wallet balance including referral coins information"""
    
    # Get regular wallet info
    wallet = await database.get_wallet_by_user_id(current_user["id"])
    
    # Get withdrawal eligibility
    eligibility = await database.check_withdrawal_eligibility(current_user["id"])
    
    # Get recent transactions
    transactions = await database.get_wallet_transactions(current_user["id"], limit=10)
    
    return WalletResponseWithReferrals(
        balance_coins=wallet["balance_coins"],
        balance_naira=wallet["balance_coins"] * 100,
        referral_coins=eligibility["referral_coins"],
        referral_coins_naira=eligibility["referral_coins"] * 100,
        can_withdraw_referrals=eligibility["can_withdraw_referrals"],
        transactions=transactions
    )

@router.get("/withdrawal-eligibility")
async def check_withdrawal_eligibility(current_user: dict = Depends(get_current_user)):
    """Check if user can withdraw referral coins"""
    
    eligibility = await database.check_withdrawal_eligibility(current_user["id"])
    
    return {
        **eligibility,
        "message": "You can withdraw referral coins when your total wallet balance reaches 15 coins." if not eligibility["can_withdraw_referrals"] else "You are eligible to withdraw referral coins!"
    }

# Serve verification document images
@router.get("/verification-document/{filename}")
async def serve_verification_document(filename: str):
    """Serve verification document images (admin only)"""
    from fastapi.responses import FileResponse
    
    file_path = f"/app/uploads/verification_documents/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
    
    return FileResponse(file_path, media_type="image/jpeg")

@router.post("/process-signup-referral")
async def process_signup_referral(
    referral_code: str = Form(...),
    referred_user_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Process referral when someone signs up with a referral code (internal use)"""
    
    success = await database.record_referral(referral_code, referred_user_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid referral code or referral already exists")
    
    return {
        "message": "Referral recorded successfully",
        "status": "pending_verification"
    }
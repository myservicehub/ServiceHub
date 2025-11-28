from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import os
import uuid
from PIL import Image
import base64
import io

from ..auth.dependencies import get_current_user, get_current_tradesperson
from ..database import database
from ..models.base import (
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
    document_type: str = Form(...),
    full_name: str = Form(...),
    document_number: str = Form(""),
    document_image: UploadFile = File(None),
    document_image_base64: str = Form(None),
    current_user = Depends(get_current_user)
):
    """Submit documents for identity verification
    Accept common aliases like 'NIN', 'PVC', and 'Driver's licence'.
    """
    
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
    
    if not document_image and not document_image_base64:
        raise HTTPException(status_code=400, detail="Document image is required")
    if document_image and not document_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Normalize document type to backend canonical values
    def _normalize_doc_type(value: str) -> str:
        v = (value or "").strip().lower()
        v = v.replace(" ", "_").replace("-", "_")
        aliases = {
            # National ID (NIN)
            "nin": "national_id",
            "national_id": "national_id",
            "nationalid": "national_id",
            # Voters Card (PVC)
            "pvc": "voters_card",
            "voters_card": "voters_card",
            "voter_card": "voters_card",
            # Driver's License
            "drivers_license": "drivers_license",
            "driver_license": "drivers_license",
            "driving_license": "drivers_license",
            "drivers_licence": "drivers_license",
            "driver_licence": "drivers_license",
            # Passport
            "passport": "passport",
            # Business Registration / CAC
            "business_registration": "business_registration",
            "cac": "business_registration",
            "cac_certificate": "business_registration",
        }
        return aliases.get(v)

    normalized_type = _normalize_doc_type(document_type)
    if not normalized_type:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid document type. Use one of: passport, national_id (NIN), "
                "drivers_license, voters_card (PVC), business_registration."
            ),
        )
    
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    upload_dir = os.path.join(base_dir, "verification_documents")
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = f"{current_user.id}_{document_type}_{uuid.uuid4().hex}.jpg"
    file_path = os.path.join(upload_dir, filename)
    
    # Save and optimize image
    try:
        if document_image_base64:
            b64 = document_image_base64.split(",")[-1]
            raw = base64.b64decode(b64)
            image = Image.open(io.BytesIO(raw))
        else:
            image_data = await document_image.read()
            image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Resize if too large (max 1920x1920 for document clarity)
        if image.width > 1920 or image.height > 1920:
            image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        
        image.save(file_path, "JPEG", quality=90, optimize=True)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Submit verification
    verification_id = await database.submit_verification_documents(
        user_id=current_user.id,
        document_type=normalized_type,
        document_url=filename,
        full_name=full_name,
        document_number=document_number
    )
    
    return VerificationSubmission(
        message="Verification documents submitted successfully. You will be notified within 2-3 business days.",
        verification_id=verification_id,
        status="pending"
    )

# Tradespeople references submission
@router.post("/tradesperson-references")
async def submit_tradesperson_references(
    work_referrer_name: str = Form(...),
    work_referrer_phone: str = Form(...),
    work_referrer_company_email: str = Form(...),
    work_referrer_company_name: str = Form(...),
    work_referrer_relationship: str = Form(...),
    character_referrer_name: str = Form(...),
    character_referrer_phone: str = Form(...),
    character_referrer_email: str = Form(...),
    character_referrer_relationship: str = Form(...),
    current_user = Depends(get_current_tradesperson)
):
    """Submit work and character referrers for tradesperson verification"""

    # Basic validations
    generic_domains = {"gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com","aol.com","yandex.com","protonmail.com","zoho.com","gmx.com","mail.com"}
    try:
        domain = work_referrer_company_email.strip().lower().split("@")[-1]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company email format")
    if domain in generic_domains:
        raise HTTPException(status_code=400, detail="Company email must be a work domain, not a generic provider")

    work_referrer = {
        "name": work_referrer_name.strip(),
        "phone": work_referrer_phone.strip(),
        "company_email": work_referrer_company_email.strip().lower(),
        "company_name": work_referrer_company_name.strip(),
        "relationship": work_referrer_relationship.strip(),
    }
    character_referrer = {
        "name": character_referrer_name.strip(),
        "phone": character_referrer_phone.strip(),
        "email": character_referrer_email.strip().lower(),
        "relationship": character_referrer_relationship.strip(),
    }

    verification_id = await database.submit_tradesperson_references(
        user_id=current_user.id,
        work_referrer=work_referrer,
        character_referrer=character_referrer,
    )

    return {
        "message": "References submitted successfully and pending admin review.",
        "verification_id": verification_id,
        "status": "pending"
    }

@router.get("/wallet-with-referrals", response_model=WalletResponseWithReferrals)
async def get_wallet_with_referral_info(current_user = Depends(get_current_user)):
    """Get wallet balance including referral coins information"""
    
    # Get regular wallet info
    wallet = await database.get_wallet_by_user_id(current_user.id)
    
    # Get withdrawal eligibility
    eligibility = await database.check_withdrawal_eligibility(current_user.id)
    
    # Get recent transactions
    transactions = await database.get_wallet_transactions(current_user.id, limit=10)
    
    return WalletResponseWithReferrals(
        balance_coins=wallet["balance_coins"],
        balance_naira=wallet["balance_coins"] * 100,
        referral_coins=eligibility["referral_coins"],
        referral_coins_naira=eligibility["referral_coins"] * 100,
        can_withdraw_referrals=eligibility["can_withdraw_referrals"],
        transactions=transactions
    )

@router.get("/withdrawal-eligibility")
async def check_withdrawal_eligibility(current_user = Depends(get_current_user)):
    """Check if user can withdraw referral coins"""
    
    eligibility = await database.check_withdrawal_eligibility(current_user.id)
    
    return {
        **eligibility,
        "message": "You can withdraw referral coins when your total wallet balance reaches 15 coins." if not eligibility["can_withdraw_referrals"] else "You are eligible to withdraw referral coins!"
    }

# Serve verification document images
@router.get("/verification-document/{filename}")
async def serve_verification_document(filename: str):
    """Serve verification document images (admin only)"""
    from fastapi.responses import FileResponse
    import os
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    project_root_uploads = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    candidates = [
        os.path.join(base_dir, "verification_documents", filename),
        os.path.join(project_root_uploads, "verification_documents", filename),
        os.path.join(os.getcwd(), "uploads", "verification_documents", filename),
        os.path.join("/app", "uploads", "verification_documents", filename),
    ]
    for fp in candidates:
        if os.path.exists(fp):
            return FileResponse(fp, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Document not found")

@router.post("/process-signup-referral")
async def process_signup_referral(
    referral_code: str = Form(...),
    referred_user_id: str = Form(...),
    current_user = Depends(get_current_user)
):
    """Process referral when someone signs up with a referral code (internal use)"""
    
    success = await database.record_referral(referral_code, referred_user_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid referral code or referral already exists")
    
    return {
        "message": "Referral recorded successfully",
        "status": "pending_verification"
    }
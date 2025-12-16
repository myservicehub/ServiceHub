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
try:
    from ..services.notifications import SendGridEmailService, MockEmailService
except ImportError:
    from services.notifications import SendGridEmailService, MockEmailService

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
    document_image: UploadFile = File(None),
    document_image_base64: str = Form(None),
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
    
    if not document_image and not document_image_base64:
        raise HTTPException(status_code=400, detail="Document image is required")
    if document_image and not document_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
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
    import re
    def is_valid_phone(phone: str) -> bool:
        try:
            p = (phone or "").strip()
            # Accept E.164 for Nigeria (+234XXXXXXXXXX) or local 11-digit (0XXXXXXXXXX)
            return bool(re.fullmatch(r"\+234\d{10}", p) or re.fullmatch(r"0\d{10}", p))
        except Exception:
            return False
    generic_domains = {"gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com","aol.com","yandex.com","protonmail.com","zoho.com","gmx.com","mail.com"}
    try:
        domain = work_referrer_company_email.strip().lower().split("@")[-1]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company email format")
    if domain in generic_domains:
        raise HTTPException(status_code=400, detail="Company email must be a work domain, not a generic provider")

    # Validate phone numbers
    if not is_valid_phone(work_referrer_phone.strip()):
        raise HTTPException(status_code=400, detail="Invalid work referee phone. Use +234XXXXXXXXXX or 0XXXXXXXXXX")
    if not is_valid_phone(character_referrer_phone.strip()):
        raise HTTPException(status_code=400, detail="Invalid character referee phone. Use +234XXXXXXXXXX or 0XXXXXXXXXX")

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
    tradesperson_name = (
        getattr(current_user, "name", None)
        or getattr(current_user, "business_name", None)
        or "Tradesperson"
    )
    email_service = None
    try:
        email_service = SendGridEmailService()
    except Exception:
        try:
            email_service = MockEmailService()
        except Exception:
            email_service = None
    if email_service:
        work_subject = "Request for Work Reference"
        work_link = "https://forms.gle/p3SdDzHoT5eN7oTv6"
        work_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset=\"utf-8\">
          <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .btn {{ display: inline-block; background-color: #34D164; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; }}
            .link {{ word-break: break-all; color: #2563eb; }}
          </style>
        </head>
        <body>
          <div class=\"container\">
            <p>Hi {work_referrer['name']},</p>
            <p>{tradesperson_name} has listed you as a referee regarding their professional work. We’d greatly appreciate it if you could take a few minutes to provide your feedback on their work performance.</p>
            <p>
              <a class=\"btn\" href=\"{work_link}\">Submit Work Reference</a>
            </p>
            <p>If the button doesn’t work, copy and paste this link:</p>
            <p class=\"link\">{work_link}</p>
            <p>Thank you for your time and support!</p>
            <p>Best regards,<br/>Ekpemi Daniel Francis<br/>Head of human resource<br/>hr@myservicehub.co</p>
          </div>
        </body>
        </html>
        """
        await email_service.send_email(
            to=work_referrer["company_email"],
            subject=work_subject,
            content=work_html,
            metadata={
                "purpose": "work_reference_request",
                "user_id": current_user.id,
                "tradesperson_name": tradesperson_name,
            },
        )
        char_subject = "Request for Character Reference"
        char_link = "https://forms.gle/LpmqGmtv8Awzf7ix5"
        char_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset=\"utf-8\">
          <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .btn {{ display: inline-block; background-color: #34D164; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; }}
            .link {{ word-break: break-all; color: #2563eb; }}
          </style>
        </head>
        <body>
          <div class=\"container\">
            <p>Hi {character_referrer['name']},</p>
            <p>{tradesperson_name} has listed you as a referee regarding their personal character. We’d be grateful if you could share your thoughts on their character and reliability.</p>
            <p>
              <a class=\"btn\" href=\"{char_link}\">Submit Character Reference</a>
            </p>
            <p>If the button doesn’t work, copy and paste this link:</p>
            <p class=\"link\">{char_link}</p>
            <p>Thank you for your time and input—it’s very much appreciated!</p>
            <p>Best regards,<br/>Ekpemi Daniel Francis<br/>Head of human resource<br/>hr@myservicehub.co</p>
          </div>
        </body>
        </html>
        """
        await email_service.send_email(
            to=character_referrer["email"],
            subject=char_subject,
            content=char_html,
            metadata={
                "purpose": "character_reference_request",
                "user_id": current_user.id,
                "tradesperson_name": tradesperson_name,
            },
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
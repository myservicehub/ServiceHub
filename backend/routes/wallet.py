from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from typing import List, Optional
from datetime import datetime
import base64
import uuid
import os
import requests
from PIL import Image
import io

from ..auth.dependencies import get_current_user, get_current_tradesperson
from ..database import database
from ..models.base import (
    Wallet, WalletTransaction, WalletFundingRequest, WalletResponse,
    TransactionType, TransactionStatus, BankDetails
)
from ..models.auth import User

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

# Bank details constant
BANK_DETAILS = BankDetails()

@router.get("/balance", response_model=WalletResponse)
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    """Get user's wallet balance and recent transactions"""
    
    # Get or create wallet
    wallet = await database.get_wallet_by_user_id(current_user.id)
    
    # Get recent transactions
    transactions = await database.get_wallet_transactions(current_user.id, limit=10)
    
    return WalletResponse(
        balance_coins=wallet["balance_coins"],
        balance_naira=wallet["balance_coins"] * 100,  # Convert to naira
        transactions=transactions
    )

@router.get("/bank-details", response_model=BankDetails)
async def get_bank_details():
    """Get ServiceHub bank account details for funding"""
    return BANK_DETAILS

@router.post("/fund")
async def fund_wallet(
    amount_naira: int = Form(...),
    proof_image: UploadFile = File(None),
    proof_image_base64: str = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Request wallet funding with payment proof"""
    
    # Validate amount (minimum ₦100)
    if amount_naira < 100:
        raise HTTPException(status_code=400, detail="Minimum funding amount is ₦100")
    
    if not proof_image and not proof_image_base64:
        raise HTTPException(status_code=400, detail="Payment proof image is required")
    if proof_image and not proof_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Create uploads directory if it doesn't exist
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    upload_dir = os.path.join(base_dir, "payment_proofs")
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = f"{current_user.id}_{uuid.uuid4().hex}.jpg"
    file_path = os.path.join(upload_dir, filename)
    
    # Save and optimize image
    try:
        optimized_bytes = None
        if proof_image_base64:
            b64 = proof_image_base64.split(",")[-1]
            raw = base64.b64decode(b64)
            image = Image.open(io.BytesIO(raw))
        else:
            image_data = await proof_image.read()
            image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Resize if too large (max 1024x1024)
        if image.width > 1024 or image.height > 1024:
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        
        # Save optimized image
        image.save(file_path, "JPEG", quality=85, optimize=True)

        # Read optimized bytes for DB storage as base64
        try:
            with open(file_path, "rb") as f:
                optimized_bytes = f.read()
        except Exception:
            optimized_bytes = None
        
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Calculate coins
    amount_coins = amount_naira // 100
    
    # Get or create wallet
    wallet = await database.get_wallet_by_user_id(current_user.id)
    
    # Create funding transaction
    transaction_data = {
        "wallet_id": wallet["id"],
        "user_id": current_user.id,
        "transaction_type": TransactionType.WALLET_FUNDING,
        "amount_coins": amount_coins,
        "amount_naira": amount_naira,
        "status": TransactionStatus.PENDING,
        "description": f"Wallet funding request - ₦{amount_naira:,} ({amount_coins} coins)",
        "proof_image": filename
    }

    # Store base64 alongside transaction to avoid disk dependency
    try:
        if optimized_bytes is not None:
            transaction_data["proof_image_base64"] = base64.b64encode(optimized_bytes).decode("utf-8")
        elif proof_image_base64:
            # Fallback to original provided base64 if optimized bytes couldn't be read
            transaction_data["proof_image_base64"] = proof_image_base64.split(",")[-1]
    except Exception:
        # Silently ignore base64 storage failures; file path remains available
        pass
    
    transaction = await database.create_wallet_transaction(transaction_data)
    
    return {
        "message": "Funding request submitted successfully",
        "transaction_id": transaction["id"],
        "amount_naira": amount_naira,
        "amount_coins": amount_coins,
        "status": "pending",
        "note": "Your funding request will be reviewed by admin within 24 hours"
    }

@router.post("/paystack/initialize")
async def initialize_paystack_wallet_funding(
    amount_naira: int = Body(..., embed=True),
    redirect_path: Optional[str] = Body(default="/trades/wallet", embed=True),
    current_user: User = Depends(get_current_user)
):
    """Initialize Paystack transaction for wallet funding"""
    if amount_naira < 100:
        raise HTTPException(status_code=400, detail="Minimum funding amount is ₦100")
    if not current_user.email:
        raise HTTPException(status_code=400, detail="User email is required for payment")

    paystack_secret_key = os.environ.get("PAYSTACK_SECRET_KEY", "").strip()
    if not paystack_secret_key:
        raise HTTPException(status_code=500, detail="Paystack is not configured")

    allowed_paths = {"/trades/wallet", "/dashboard/wallet"}
    selected_path = redirect_path if redirect_path in allowed_paths else "/trades/wallet"
    frontend_url = os.environ.get("FRONTEND_URL", "https://servicehub.vercel.app").rstrip("/")
    callback_url = f"{frontend_url}{selected_path}"

    reference = f"wlt_{current_user.id[:8]}_{uuid.uuid4().hex[:16]}"
    payload = {
        "email": current_user.email,
        "amount": amount_naira * 100,
        "reference": reference,
        "callback_url": callback_url,
        "metadata": {
            "purpose": "wallet_funding",
            "user_id": current_user.id
        }
    }
    headers = {
        "Authorization": f"Bearer {paystack_secret_key}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            "https://api.paystack.co/transaction/initialize",
            json=payload,
            headers=headers,
            timeout=30
        )
        data = response.json()
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to initialize payment")

    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message") if isinstance(data, dict) else "Failed to initialize payment"
        raise HTTPException(status_code=400, detail=message)

    return {
        "message": "Payment initialized",
        "authorization_url": data["data"]["authorization_url"],
        "access_code": data["data"]["access_code"],
        "reference": data["data"]["reference"]
    }

@router.post("/paystack/verify")
async def verify_paystack_wallet_funding(
    reference: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Verify Paystack transaction and credit wallet immediately"""
    if not reference:
        raise HTTPException(status_code=400, detail="Payment reference is required")

    paystack_secret_key = os.environ.get("PAYSTACK_SECRET_KEY", "").strip()
    if not paystack_secret_key:
        raise HTTPException(status_code=500, detail="Paystack is not configured")

    existing = await database.wallet_transactions_collection.find_one({
        "user_id": current_user.id,
        "reference": reference,
        "transaction_type": TransactionType.WALLET_FUNDING
    })
    if existing and existing.get("status") == TransactionStatus.CONFIRMED:
        wallet_existing = await database.get_wallet_by_user_id(current_user.id)
        return {
            "message": "Wallet already funded for this payment",
            "transaction_id": existing.get("id"),
            "already_confirmed": True,
            "balance_coins": wallet_existing["balance_coins"],
            "balance_naira": wallet_existing["balance_coins"] * 100
        }

    headers = {"Authorization": f"Bearer {paystack_secret_key}"}
    try:
        response = requests.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers=headers,
            timeout=30
        )
        data = response.json()
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to verify payment")

    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message") if isinstance(data, dict) else "Payment verification failed"
        raise HTTPException(status_code=400, detail=message)

    verified_data = data.get("data", {})
    if verified_data.get("status") != "success":
        raise HTTPException(status_code=400, detail="Payment has not been completed")

    amount_kobo = int(verified_data.get("amount", 0))
    amount_naira = amount_kobo // 100
    if amount_naira < 100:
        raise HTTPException(status_code=400, detail="Invalid payment amount")

    amount_coins = amount_naira // 100
    wallet = await database.get_wallet_by_user_id(current_user.id)

    if existing and existing.get("status") == TransactionStatus.PENDING:
        updated = await database.wallet_transactions_collection.update_one(
            {"id": existing["id"], "status": TransactionStatus.PENDING},
            {
                "$set": {
                    "status": TransactionStatus.CONFIRMED,
                    "processed_by": "paystack",
                    "admin_notes": "Auto-confirmed via Paystack verification",
                    "processed_at": datetime.utcnow(),
                    "amount_naira": amount_naira,
                    "amount_coins": amount_coins
                }
            }
        )
        if updated.modified_count > 0:
            await database.update_wallet_balance(current_user.id, amount_coins)
            transaction_id = existing["id"]
        else:
            transaction_id = existing["id"]
    elif not existing:
        transaction = await database.create_wallet_transaction({
            "wallet_id": wallet["id"],
            "user_id": current_user.id,
            "transaction_type": TransactionType.WALLET_FUNDING,
            "amount_coins": amount_coins,
            "amount_naira": amount_naira,
            "status": TransactionStatus.CONFIRMED,
            "description": f"Wallet funded via Paystack - ₦{amount_naira:,} ({amount_coins} coins)",
            "reference": reference,
            "processed_by": "paystack",
            "admin_notes": "Auto-confirmed via Paystack verification",
            "processed_at": datetime.utcnow()
        })
        await database.update_wallet_balance(current_user.id, amount_coins)
        transaction_id = transaction["id"]
    else:
        transaction_id = existing["id"]

    wallet_after = await database.get_wallet_by_user_id(current_user.id)
    return {
        "message": "Wallet funded successfully",
        "transaction_id": transaction_id,
        "amount_naira": amount_naira,
        "amount_coins": amount_coins,
        "balance_coins": wallet_after["balance_coins"],
        "balance_naira": wallet_after["balance_coins"] * 100,
        "status": "confirmed"
    }

@router.get("/transactions")
async def get_wallet_transactions(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    """Get user's wallet transaction history"""
    
    transactions = await database.get_wallet_transactions(
        current_user.id, skip=skip, limit=limit
    )
    
    return {
        "transactions": transactions,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(transactions)
        }
    }

@router.post("/check-balance/{access_fee_coins}")
async def check_sufficient_balance(
    access_fee_coins: int,
    current_user: User = Depends(get_current_tradesperson)
):
    """Check if tradesperson has sufficient balance for access fee"""
    
    wallet = await database.get_wallet_by_user_id(current_user.id)
    
    sufficient = wallet["balance_coins"] >= access_fee_coins
    
    return {
        "sufficient_balance": sufficient,
        "current_balance_coins": wallet["balance_coins"],
        "current_balance_naira": wallet["balance_coins"] * 100,
        "required_coins": access_fee_coins,
        "required_naira": access_fee_coins * 100,
        "shortfall_coins": max(0, access_fee_coins - wallet["balance_coins"]),
        "shortfall_naira": max(0, (access_fee_coins - wallet["balance_coins"]) * 100)
    }

@router.get("/payment-proof/{filename}")
async def serve_payment_proof(filename: str):
    from fastapi.responses import FileResponse
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
    raise HTTPException(status_code=404, detail="Image not found")

@router.get("/payment-proof-base64/{filename}")
async def serve_payment_proof_base64(filename: str):
    # Prefer DB-stored base64 if available
    try:
        txn = await database.get_wallet_transaction_by_proof_image(filename)
        if txn and txn.get("proof_image_base64"):
            return {"image_base64": txn["proof_image_base64"]}
    except Exception:
        pass

    project_root_uploads = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
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
            b64 = base64.b64encode(data).decode("utf-8")
            return {"image_base64": b64}
    raise HTTPException(status_code=404, detail="Image not found")

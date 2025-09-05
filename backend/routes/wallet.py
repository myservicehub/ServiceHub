from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import base64
import uuid
import os
from PIL import Image
import io

from auth.dependencies import get_current_user, get_current_tradesperson
from database import database
from models.base import (
    Wallet, WalletTransaction, WalletFundingRequest, WalletResponse,
    BankDetails, TransactionType, TransactionStatus
)
from models.auth import User

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
    proof_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Request wallet funding with payment proof"""
    
    # Validate amount (minimum ₦1500)
    if amount_naira < 1500:
        raise HTTPException(status_code=400, detail="Minimum funding amount is ₦1500")
    
    # Validate image file
    if not proof_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/uploads/payment_proofs"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = proof_image.filename.split(".")[-1].lower()
    filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save and optimize image
    try:
        # Read image data
        image_data = await proof_image.read()
        
        # Open and optimize image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Resize if too large (max 1024x1024)
        if image.width > 1024 or image.height > 1024:
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        
        # Save optimized image
        image.save(file_path, "JPEG", quality=85, optimize=True)
        
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
    
    transaction = await database.create_wallet_transaction(transaction_data)
    
    return {
        "message": "Funding request submitted successfully",
        "transaction_id": transaction["id"],
        "amount_naira": amount_naira,
        "amount_coins": amount_coins,
        "status": "pending",
        "note": "Your funding request will be reviewed by admin within 24 hours"
    }

@router.get("/transactions")
async def get_wallet_transactions(
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get user's wallet transaction history"""
    
    transactions = await database.get_wallet_transactions(
        current_user["id"], skip=skip, limit=limit
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
    current_user: dict = Depends(get_current_tradesperson)
):
    """Check if tradesperson has sufficient balance for access fee"""
    
    wallet = await database.get_wallet_by_user_id(current_user["id"])
    
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

# Serve payment proof images
@router.get("/payment-proof/{filename}")
async def serve_payment_proof(filename: str):
    """Serve payment proof images"""
    from fastapi.responses import FileResponse
    
    file_path = f"/app/uploads/payment_proofs/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path, media_type="image/jpeg")
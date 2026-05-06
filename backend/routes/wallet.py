from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional
from datetime import datetime
import uuid
import os
import requests

from ..auth.dependencies import get_current_user, get_current_tradesperson
from ..database import database
from ..models.base import (
    WalletResponse, TransactionType, TransactionStatus
)
from ..models.auth import User
from ..utils.pricing import naira_to_coins, coins_to_naira, to_float

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

@router.get("/balance", response_model=WalletResponse)
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    """Get user's wallet balance and recent transactions"""
    
    # Get or create wallet
    wallet = await database.get_wallet_by_user_id(current_user.id)
    
    # Get recent transactions
    transactions = await database.get_wallet_transactions(current_user.id, limit=10)
    
    return WalletResponse(
        balance_coins=wallet["balance_coins"],
        balance_naira=to_float(coins_to_naira(wallet["balance_coins"])),
        transactions=transactions
    )

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
            "balance_naira": to_float(coins_to_naira(wallet_existing["balance_coins"]))
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
    amount_naira = amount_kobo / 100
    if amount_naira < 100:
        raise HTTPException(status_code=400, detail="Invalid payment amount")

    amount_coins = to_float(naira_to_coins(amount_naira))
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
                    "description": f"Wallet funded via Paystack - ₦{amount_naira:,.2f} ({amount_coins:,.4f} coins)",
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
        "balance_naira": to_float(coins_to_naira(wallet_after["balance_coins"])),
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
    access_fee_coins: float,
    current_user: User = Depends(get_current_tradesperson)
):
    """Check if tradesperson has sufficient balance for access fee"""
    
    wallet = await database.get_wallet_by_user_id(current_user.id)
    
    sufficient = wallet["balance_coins"] >= access_fee_coins
    
    return {
        "sufficient_balance": sufficient,
        "current_balance_coins": wallet["balance_coins"],
        "current_balance_naira": to_float(coins_to_naira(wallet["balance_coins"])),
        "required_coins": access_fee_coins,
        "required_naira": to_float(coins_to_naira(access_fee_coins)),
        "shortfall_coins": max(0, access_fee_coins - wallet["balance_coins"]),
        "shortfall_naira": to_float(coins_to_naira(max(0, access_fee_coins - wallet["balance_coins"])))
    }


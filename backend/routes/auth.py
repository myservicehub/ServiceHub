from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import timedelta
from models.auth import (
    UserLogin, LoginResponse, HomeownerRegistration, TradespersonRegistration,
    User, UserProfile, UserProfileUpdate, TradespersonProfileUpdate,
    PasswordResetRequest, PasswordReset, UserRole, UserStatus
)
from auth.security import (
    verify_password, get_password_hash, create_access_token,
    validate_password_strength, validate_nigerian_phone, format_nigerian_phone
)
from auth.dependencies import get_current_user, get_current_active_user
from database import database
from models.trade_categories import NIGERIAN_TRADE_CATEGORIES, validate_trade_category
from datetime import datetime
from typing import Optional
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register/homeowner")
async def register_homeowner(registration_data: HomeownerRegistration):
    """Register a new homeowner account"""
    try:
        # Check if user already exists
        existing_user = await database.get_user_by_email(registration_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered"
            )

        # Validate password strength
        if not validate_password_strength(registration_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters"
            )

        # Validate and format phone number
        if not validate_nigerian_phone(registration_data.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid Nigerian phone number"
            )

        formatted_phone = format_nigerian_phone(registration_data.phone)

        # Create user data
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "name": registration_data.name,
            "email": registration_data.email,
            "phone": formatted_phone,
            "password_hash": get_password_hash(registration_data.password),
            "role": UserRole.HOMEOWNER,
            "status": UserStatus.ACTIVE,  # Homeowners are active immediately
            "location": registration_data.location,
            "postcode": registration_data.postcode,
            "email_verified": False,
            "phone_verified": False,
            "is_verified": False,
            "verification_submitted": False,
            "total_referrals": 0,
            "referral_coins_earned": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "avatar_url": None,
            "last_login": None
        }

        # Save to database
        created_user = await database.create_user(user_data)
        
        # Generate referral code for new user
        await database.generate_referral_code(created_user["id"])
        
        # Process referral if provided
        if registration_data.referral_code:
            await database.record_referral(registration_data.referral_code, created_user["id"])
        
        # Remove password hash from response
        user_response = User(**created_user)
        
        # Create access token for immediate login
        access_token_expires = timedelta(minutes=60 * 24)  # 24 hours
        access_token = create_access_token(
            data={"sub": created_user["id"], "email": created_user["email"]},
            expires_delta=access_token_expires
        )
        
        # Return both user profile and access token
        return {
            "user": user_response.dict(),
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )

@router.post("/register/tradesperson", response_model=UserProfile)
async def register_tradesperson(registration_data: TradespersonRegistration):
    """Register a new tradesperson account"""
    try:
        # Check if user already exists
        existing_user = await database.get_user_by_email(registration_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered"
            )

        # Validate password strength
        if not validate_password_strength(registration_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters"
            )

        # Validate and format phone number
        if not validate_nigerian_phone(registration_data.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid Nigerian phone number"
            )

        formatted_phone = format_nigerian_phone(registration_data.phone)

        # Create user data
        user_data = {
            "id": str(uuid.uuid4()),
            "name": registration_data.name,
            "email": registration_data.email,
            "phone": formatted_phone,
            "password_hash": get_password_hash(registration_data.password),
            "role": UserRole.TRADESPERSON,
            "status": UserStatus.ACTIVE,  # Set to active for testing
            "location": registration_data.location,
            "postcode": registration_data.postcode,
            "email_verified": False,
            "phone_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "avatar_url": None,
            "last_login": None,
            # Tradesperson specific fields
            "trade_categories": registration_data.trade_categories,
            "experience_years": registration_data.experience_years,
            "company_name": registration_data.company_name,
            "description": registration_data.description,
            "certifications": registration_data.certifications,
            "average_rating": 0.0,
            "total_reviews": 0,
            "total_jobs": 0,
            "verified_tradesperson": False
        }

        # Save to database
        created_user = await database.create_user(user_data)
        
        # Generate referral code for new user
        await database.generate_referral_code(created_user["id"])
        
        # Process referral if provided
        if registration_data.referral_code:
            await database.record_referral(registration_data.referral_code, created_user["id"])
        
        # Remove password hash from response
        user_response = User(**created_user)
        return UserProfile(**user_response.dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    """Authenticate user and return access token"""
    try:
        # Get user by email
        user_data = await database.get_user_by_email(login_data.email)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Verify password
        if not verify_password(login_data.password, user_data["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Check if user is active
        if user_data["status"] == UserStatus.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended. Please contact support."
            )

        # Create access token
        access_token_expires = timedelta(minutes=60 * 24)  # 24 hours
        access_token = create_access_token(
            data={"sub": user_data["id"], "email": user_data["email"]},
            expires_delta=access_token_expires
        )

        # Update last login
        await database.update_user_last_login(user_data["id"])

        # Prepare user data for response (remove password hash)
        user_response = {k: v for k, v in user_data.items() if k != "password_hash"}
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response,
            expires_in=60 * 60 * 24  # 24 hours in seconds
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return UserProfile(**current_user.dict())

@router.put("/profile", response_model=UserProfile)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update user profile"""
    try:
        update_data = {}
        
        # Update provided fields
        if profile_data.name is not None:
            update_data["name"] = profile_data.name
        
        if profile_data.phone is not None:
            if not validate_nigerian_phone(profile_data.phone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please enter a valid Nigerian phone number"
                )
            update_data["phone"] = format_nigerian_phone(profile_data.phone)
            update_data["phone_verified"] = False  # Re-verify phone if changed
        
        if profile_data.location is not None:
            update_data["location"] = profile_data.location
        
        if profile_data.postcode is not None:
            update_data["postcode"] = profile_data.postcode

        if update_data:
            await database.update_user(current_user.id, update_data)
            
            # Get updated user data
            updated_user_data = await database.get_user_by_id(current_user.id)
            updated_user = User(**updated_user_data)
            return UserProfile(**updated_user.dict())
        
        return UserProfile(**current_user.dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.put("/profile/location")
async def update_user_location(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude coordinate"),
    travel_distance_km: Optional[int] = Query(None, ge=1, le=200, description="Maximum travel distance in kilometers"),
    current_user: User = Depends(get_current_active_user)
):
    """Update user location and travel distance"""
    try:
        success = await database.update_user_location(
            user_id=current_user.id,
            latitude=latitude,
            longitude=longitude,
            travel_distance_km=travel_distance_km
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update location")
        
        return {
            "message": "Location updated successfully",
            "latitude": latitude,
            "longitude": longitude,
            "travel_distance_km": travel_distance_km
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user location: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")

@router.put("/profile/tradesperson", response_model=UserProfile)
async def update_tradesperson_profile(
    profile_data: TradespersonProfileUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update tradesperson-specific profile fields"""
    try:
        if current_user.role != UserRole.TRADESPERSON:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only tradespeople can access this endpoint"
            )

        update_data = {}
        
        # Update basic profile fields
        if profile_data.name is not None:
            update_data["name"] = profile_data.name
        
        if profile_data.phone is not None:
            if not validate_nigerian_phone(profile_data.phone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please enter a valid Nigerian phone number"
                )
            update_data["phone"] = format_nigerian_phone(profile_data.phone)
            update_data["phone_verified"] = False
        
        if profile_data.location is not None:
            update_data["location"] = profile_data.location
        
        if profile_data.postcode is not None:
            update_data["postcode"] = profile_data.postcode

        # Update tradesperson-specific fields
        if profile_data.trade_categories is not None:
            update_data["trade_categories"] = profile_data.trade_categories
        
        if profile_data.experience_years is not None:
            update_data["experience_years"] = profile_data.experience_years
        
        if profile_data.company_name is not None:
            update_data["company_name"] = profile_data.company_name
        
        if profile_data.description is not None:
            update_data["description"] = profile_data.description
        
        if profile_data.certifications is not None:
            update_data["certifications"] = profile_data.certifications

        if update_data:
            await database.update_user(current_user.id, update_data)
            
            # Get updated user data
            updated_user_data = await database.get_user_by_id(current_user.id)
            updated_user = User(**updated_user_data)
            return UserProfile(**updated_user.dict())
        
        return UserProfile(**current_user.dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tradesperson profile: {str(e)}"
        )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client should discard token)"""
    # In a more sophisticated system, you might want to blacklist the token
    # For now, we just return success and let the client handle token removal
    return {"message": "Successfully logged out"}

@router.get("/verify-email/{user_id}")
async def verify_email(user_id: str):
    """Verify user email (simplified - in production use secure tokens)"""
    user_data = await database.get_user_by_id(user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await database.verify_user_email(user_id)
    return {"message": "Email verified successfully"}

# Password reset endpoints (simplified)
@router.post("/password-reset-request")
async def request_password_reset(request_data: PasswordResetRequest):
    """Request password reset (simplified)"""
    user_data = await database.get_user_by_email(request_data.email)
    if not user_data:
        # Don't reveal if email exists or not for security
        return {"message": "If an account with this email exists, you will receive a password reset link."}
    
    # In production, generate secure token and send email
    return {"message": "If an account with this email exists, you will receive a password reset link."}
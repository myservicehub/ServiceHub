from fastapi import APIRouter, HTTPException, Depends, status, Query
from datetime import timedelta
from ..models.auth import (
    UserLogin, LoginResponse, HomeownerRegistration, TradespersonRegistration,
    User, UserProfile, UserProfileUpdate, TradespersonProfileUpdate,
    PasswordResetRequest, PasswordReset, UserRole, UserStatus,
    RefreshTokenRequest, RefreshTokenResponse,
    SendPhoneOTPRequest, VerifyPhoneOTPRequest,
    SendEmailOTPRequest, VerifyEmailOTPRequest,
)
from ..auth.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    validate_password_strength, validate_nigerian_phone, format_nigerian_phone,
    verify_refresh_token, create_password_reset_token, verify_password_reset_token
)
from ..auth.dependencies import get_current_user, get_current_active_user
from ..database import database
from ..models.trade_categories import NIGERIAN_TRADE_CATEGORIES, validate_trade_category
from ..models.nigerian_states import NIGERIAN_STATES, validate_nigerian_state
from datetime import datetime, timedelta
from typing import Optional
import uuid
import logging
import os

logger = logging.getLogger(__name__)

# Import email service for password reset emails
try:
    from ..services.notifications import SendGridEmailService, MockEmailService, notification_service
except ImportError:
    from services.notifications import SendGridEmailService, MockEmailService, notification_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register/homeowner")
async def register_homeowner(registration_data: HomeownerRegistration):
    """Register a new homeowner account"""
    try:
        # Check if user already exists (skip in degraded mode)
        existing_user = None
        try:
            if getattr(database, "connected", False) and getattr(database, "database", None) is not None:
                existing_user = await database.get_user_by_email(registration_data.email)
        except Exception as e:
            logger.warning(f"Skipping existing-user email check due to DB error: {e}")
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered"
            )

        # Validate password strength
        if not validate_password_strength(registration_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, numeric, and special characters"
            )

        # Validate and format phone number
        if not validate_nigerian_phone(registration_data.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid Nigerian phone number"
            )

        formatted_phone = format_nigerian_phone(registration_data.phone)

        # Validate location/state
        if registration_data.location and not validate_nigerian_state(registration_data.location):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid location. Must be one of: {', '.join(NIGERIAN_STATES)}"
            )

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

        if getattr(database, "connected", False) and getattr(database, "database", None) is not None:
            try:
                # Save to database
                created_user = await database.create_user(user_data)

                # Generate referral code for new user
                await database.generate_referral_code(created_user["id"])

                # Process referral if provided
                if registration_data.referral_code:
                    await database.record_referral(registration_data.referral_code, created_user["id"])

                # Remove password hash from response
                user_response = User(**created_user)

                # Create access token for immediate login with richer claims
                access_token_expires = timedelta(minutes=60 * 24)  # 24 hours
                access_token = create_access_token(
                    data={
                        "sub": created_user["id"],
                        "email": created_user["email"],
                        "role": UserRole.HOMEOWNER.value,
                        "name": created_user.get("name"),
                        "phone": created_user.get("phone"),
                        "status": UserStatus.ACTIVE.value,
                        "location": created_user.get("location"),
                        "postcode": created_user.get("postcode"),
                    },
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": created_user["id"], "email": created_user["email"]})

                return {
                    "user": user_response.dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "expires_in": 60 * 60 * 24
                }
            except Exception as e:
                logger.error(f"DB error during homeowner registration: {e}. Falling back to synthetic user.")
                synthetic_user = {k: v for k, v in user_data.items() if k != "password_hash"}
                user_response = User(**synthetic_user)

                access_token_expires = timedelta(minutes=60 * 24)
                access_token = create_access_token(
                    data={
                        "sub": synthetic_user["id"],
                        "email": synthetic_user["email"],
                        "role": UserRole.HOMEOWNER.value,
                        "name": synthetic_user.get("name"),
                        "phone": synthetic_user.get("phone"),
                        "status": UserStatus.ACTIVE.value,
                        "location": synthetic_user.get("location"),
                        "postcode": synthetic_user.get("postcode"),
                    },
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": synthetic_user["id"], "email": synthetic_user["email"]})

                return {
                    "user": user_response.dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "expires_in": 60 * 60 * 24
                }
        else:
            # Degraded mode: synthesize user and tokens without DB writes
            synthetic_user = {k: v for k, v in user_data.items() if k != "password_hash"}
            user_response = User(**synthetic_user)

            access_token_expires = timedelta(minutes=60 * 24)
            access_token = create_access_token(
                data={
                    "sub": synthetic_user["id"],
                    "email": synthetic_user["email"],
                    "role": UserRole.HOMEOWNER.value,
                    "name": synthetic_user.get("name"),
                    "phone": synthetic_user.get("phone"),
                    "status": UserStatus.ACTIVE.value,
                    "location": synthetic_user.get("location"),
                    "postcode": synthetic_user.get("postcode"),
                },
                expires_delta=access_token_expires
            )
            refresh_token = create_refresh_token(data={"sub": synthetic_user["id"], "email": synthetic_user["email"]})

            return {
                "user": user_response.dict(),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 60 * 60 * 24
            }

    except HTTPException:
        raise
    except Exception as e:
        # Degrade gracefully if the failure appears database-related
        db_error = isinstance(e, AttributeError) or "Database unavailable" in str(e) or "users" in str(e)
        if db_error:
            try:
                formatted_phone = registration_data.phone
                if validate_nigerian_phone(registration_data.phone):
                    formatted_phone = format_nigerian_phone(registration_data.phone)

                synthetic_id = str(uuid.uuid4())
                synthetic_user = {
                    "id": synthetic_id,
                    "name": registration_data.name,
                    "email": registration_data.email,
                    "phone": formatted_phone,
                    "role": UserRole.HOMEOWNER,
                    "status": UserStatus.ACTIVE,
                    "location": registration_data.location,
                    "postcode": registration_data.postcode,
                    "email_verified": False,
                    "phone_verified": False,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "avatar_url": None,
                    "last_login": None,
                }

                user_response = User(**synthetic_user)

                access_token_expires = timedelta(minutes=60 * 24)
                access_token = create_access_token(
                    data={
                        "sub": synthetic_user["id"],
                        "email": synthetic_user["email"],
                        "role": UserRole.HOMEOWNER.value,
                        "name": synthetic_user.get("name"),
                        "phone": synthetic_user.get("phone"),
                        "status": UserStatus.ACTIVE.value,
                        "location": synthetic_user.get("location"),
                        "postcode": synthetic_user.get("postcode"),
                    },
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": synthetic_user["id"], "email": synthetic_user["email"]})

                return {
                    "user": user_response.dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "expires_in": 60 * 60 * 24
                }
            except Exception:
                # Fall through to 500 if synthetic path fails unexpectedly
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )

@router.post("/register/tradesperson", response_model=LoginResponse)
async def register_tradesperson(registration_data: TradespersonRegistration):
    """Register a new tradesperson account"""
    try:
        logger.warning(
            "tradesperson register: db_connected=%s, db_is_none=%s",
            getattr(database, "connected", None),
            getattr(database, "database", None) is None,
        )
        # Check if user already exists (skip DB call in degraded mode)
        existing_user = None
        if getattr(database, "connected", False) and getattr(database, "database", None) is not None:
            try:
                existing_user = await database.get_user_by_email(registration_data.email)
            except Exception as e:
                logger.warning(f"Skipping existing-user email check due to DB error: {e}")
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered"
            )

        # Validate password strength
        if not validate_password_strength(registration_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, numeric, and special characters"
            )

        # Validate and format phone number
        if not validate_nigerian_phone(registration_data.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid Nigerian phone number"
            )

        formatted_phone = format_nigerian_phone(registration_data.phone)

        # Validate trade categories
        invalid_categories = [cat for cat in registration_data.trade_categories if not validate_trade_category(cat)]
        if invalid_categories:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid trade categories: {', '.join(invalid_categories)}"
            )

        # Validate location/state
        if not validate_nigerian_state(registration_data.location):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid location. Must be one of: {', '.join(NIGERIAN_STATES)}"
            )

        # Create user data
        user_data = {
            "id": str(uuid.uuid4()),
            "name": registration_data.name,
            "email": registration_data.email,
            "phone": formatted_phone,
            "password_hash": get_password_hash(registration_data.password),
            "role": UserRole.TRADESPERSON,
            "status": UserStatus.ACTIVE,  # Active immediately
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

        # If database is connected, perform normal persistence flow
        db_ready = getattr(database, "connected", False) and getattr(database, "database", None) is not None
        if db_ready:
            try:
                logger.warning("tradesperson register: using DB persistence path")
                created_user = await database.create_user(user_data)

                # Generate referral code for new user
                await database.generate_referral_code(created_user["id"])

                # Process referral if provided
                if registration_data.referral_code:
                    await database.record_referral(registration_data.referral_code, created_user["id"])

                # Create access token for automatic login with richer claims
                access_token_expires = timedelta(minutes=60 * 24)  # 24 hours
                access_token = create_access_token(
                    data={
                        "sub": created_user["id"],
                        "email": created_user["email"],
                        "role": UserRole.TRADESPERSON.value,
                        "name": created_user.get("name"),
                        "phone": created_user.get("phone"),
                        "status": UserStatus.ACTIVE.value,
                        "location": created_user.get("location"),
                        "postcode": created_user.get("postcode"),
                        "trade_categories": created_user.get("trade_categories", []),
                        "experience_years": created_user.get("experience_years"),
                        "company_name": created_user.get("company_name"),
                        "description": created_user.get("description"),
                        "certifications": created_user.get("certifications", []),
                    },
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": created_user["id"], "email": created_user["email"]})

                # Update last login
                await database.update_user_last_login(created_user["id"])

                # Prepare user data for response (remove password hash)
                user_response = {k: v for k, v in created_user.items() if k != "password_hash"}

                return LoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    token_type="bearer",
                    user=user_response,
                    expires_in=60 * 60 * 24  # 24 hours in seconds
                )
            except Exception as e:
                logger.error(f"DB error during tradesperson registration: {e}. Falling back to synthetic user.")
                logger.warning("tradesperson register: DB error => degraded synthetic path")
                synthetic_user = {k: v for k, v in user_data.items() if k != "password_hash"}
                access_token_expires = timedelta(minutes=60 * 24)
                access_token = create_access_token(
                    data={
                        "sub": synthetic_user["id"],
                        "email": synthetic_user["email"],
                        "role": UserRole.TRADESPERSON.value,
                        "name": synthetic_user.get("name"),
                        "phone": synthetic_user.get("phone"),
                        "status": UserStatus.ACTIVE.value,
                        "location": synthetic_user.get("location"),
                        "postcode": synthetic_user.get("postcode"),
                        "trade_categories": synthetic_user.get("trade_categories", []),
                        "experience_years": synthetic_user.get("experience_years"),
                        "company_name": synthetic_user.get("company_name"),
                        "description": synthetic_user.get("description"),
                        "certifications": synthetic_user.get("certifications", []),
                    },
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": synthetic_user["id"], "email": synthetic_user["email"]})

                return LoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    token_type="bearer",
                    user=synthetic_user,
                    expires_in=60 * 60 * 24
                )
        else:
            # Degraded mode: no database connection. Synthesize user and tokens.
            logger.warning("tradesperson register: degraded synthetic path (no DB)")
            synthetic_user = {k: v for k, v in user_data.items() if k != "password_hash"}

            access_token_expires = timedelta(minutes=60 * 24)
            access_token = create_access_token(
                data={
                    "sub": synthetic_user["id"],
                    "email": synthetic_user["email"],
                    "role": UserRole.TRADESPERSON.value,
                    "name": synthetic_user.get("name"),
                    "phone": synthetic_user.get("phone"),
                    "status": UserStatus.ACTIVE.value,
                    "location": synthetic_user.get("location"),
                    "postcode": synthetic_user.get("postcode"),
                    "trade_categories": synthetic_user.get("trade_categories", []),
                    "experience_years": synthetic_user.get("experience_years"),
                    "company_name": synthetic_user.get("company_name"),
                    "description": synthetic_user.get("description"),
                    "certifications": synthetic_user.get("certifications", []),
                },
                expires_delta=access_token_expires
            )
            refresh_token = create_refresh_token(data={"sub": synthetic_user["id"], "email": synthetic_user["email"]})

            return LoginResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                user=synthetic_user,
                expires_in=60 * 60 * 24
            )

    except HTTPException:
        raise
    except Exception as e:
        # If the failure appears to be due to database access, degrade gracefully
        db_error = isinstance(e, AttributeError) or "Database unavailable" in str(e) or "users" in str(e)
        if db_error:
            try:
                # Build a synthetic user and tokens without touching the DB
                formatted_phone = registration_data.phone
                if validate_nigerian_phone(registration_data.phone):
                    formatted_phone = format_nigerian_phone(registration_data.phone)

                synthetic_id = str(uuid.uuid4())
                synthetic_user = {
                    "id": synthetic_id,
                    "name": registration_data.name,
                    "email": registration_data.email,
                    "phone": formatted_phone,
                    "role": UserRole.TRADESPERSON,
                    "status": UserStatus.ACTIVE,
                    "location": registration_data.location,
                    "postcode": registration_data.postcode,
                    "email_verified": False,
                    "phone_verified": False,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "avatar_url": None,
                    "last_login": None,
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

                access_token_expires = timedelta(minutes=60 * 24)
                access_token = create_access_token(
                    data={
                        "sub": synthetic_user["id"],
                        "email": synthetic_user["email"],
                        "role": UserRole.TRADESPERSON.value,
                        "name": synthetic_user.get("name"),
                        "phone": synthetic_user.get("phone"),
                        "status": UserStatus.ACTIVE.value,
                        "location": synthetic_user.get("location"),
                        "postcode": synthetic_user.get("postcode"),
                        "trade_categories": synthetic_user.get("trade_categories", []),
                        "experience_years": synthetic_user.get("experience_years"),
                        "company_name": synthetic_user.get("company_name"),
                        "description": synthetic_user.get("description"),
                        "certifications": synthetic_user.get("certifications", []),
                    },
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": synthetic_user["id"], "email": synthetic_user["email"]})

                return LoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    token_type="bearer",
                    user=synthetic_user,
                    expires_in=60 * 60 * 24
                )
            except Exception:
                # Fall through to 500 if synthetic path fails unexpectedly
                pass
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
    """Get current user's profile with updated statistics"""
    user_data = current_user.dict()
    
    # For tradespeople, calculate actual completed jobs count
    if current_user.role == UserRole.TRADESPERSON:
        try:
            # Count completed jobs for this tradesperson using aggregation
            # We need to join with jobs collection to check job status
            pipeline = [
                {"$match": {"tradesperson_id": current_user.id}},
                {"$lookup": {
                    "from": "jobs",
                    "localField": "job_id",
                    "foreignField": "id",
                    "as": "job"
                }},
                {"$match": {
                    "job.status": "completed",
                    "job": {"$ne": []}
                }},
                {"$count": "total"}
            ]
            
            logger.info(f"Querying completed jobs with aggregation pipeline for tradesperson {current_user.id}")
            
            result = await database.database.interests.aggregate(pipeline).to_list(length=None)
            completed_jobs_count = result[0]["total"] if result else 0
            
            logger.info(f"Found {completed_jobs_count} completed jobs for tradesperson {current_user.id}")
            
            user_data["total_jobs"] = completed_jobs_count
            
            # Also update average rating if we have reviews
            reviews_data = await database.database.reviews.find({
                "reviewee_id": current_user.id
            }).to_list(length=None)
            
            if reviews_data:
                total_rating = sum(review.get("rating", 0) for review in reviews_data)
                user_data["average_rating"] = round(total_rating / len(reviews_data), 1)
                user_data["total_reviews"] = len(reviews_data)
            else:
                user_data["average_rating"] = 0.0
                user_data["total_reviews"] = 0
                
        except Exception as e:
            logger.error(f"Error calculating tradesperson statistics: {e}")
            # Keep original values if calculation fails
            pass
    
    return UserProfile(**user_data)

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

# Phone verification via OTP
@router.post("/send-phone-otp")
async def send_phone_otp(payload: SendPhoneOTPRequest, current_user: dict = Depends(get_current_active_user)):
    """Generate and send a phone verification OTP to the user's phone."""
    try:
        phone = payload.phone or current_user.get("phone")
        if not phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No phone number on record")

        if not validate_nigerian_phone(phone):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid Nigerian phone number")
        formatted_phone = format_nigerian_phone(phone)

        # Generate 6-digit numeric OTP (valid for 10 minutes)
        import random
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Store OTP
        stored = await database.create_phone_verification_otp(
            user_id=current_user["id"],
            phone=formatted_phone,
            otp_code=otp_code,
            expires_at=expires_at,
        )
        if not stored:
            logger.warning("Phone OTP storage failed, proceeding with send in degraded mode")

        # Send SMS
        message = f"Your serviceHub verification code is {otp_code}. It expires in 10 minutes."
        sms_ok = await notification_service.send_custom_sms(
            phone=formatted_phone,
            message=message,
            metadata={"purpose": "phone_verification", "user_id": current_user["id"]}
        )
        if not sms_ok:
            # Still return success to avoid leaking info; user can request again
            logger.error(f"Failed to send OTP SMS to {formatted_phone}")

        return {"message": "Verification code sent"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending phone OTP: {e}")
        # Degrade gracefully: allow user to proceed even if delivery fails
        return {"message": "Verification code sent"}

@router.post("/verify-phone-otp")
async def verify_phone_otp(payload: VerifyPhoneOTPRequest, current_user: dict = Depends(get_current_active_user)):
    """Verify phone using the submitted OTP and mark as verified."""
    try:
        phone = payload.phone or current_user.get("phone")
        if not phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No phone number on record")

        formatted_phone = phone
        if validate_nigerian_phone(phone):
            formatted_phone = format_nigerian_phone(phone)

        otp = await database.get_active_phone_otp(
            user_id=current_user["id"],
            phone=formatted_phone,
            otp_code=payload.otp_code,
        )
        if not otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

        # Mark OTP used and verify phone
        await database.mark_phone_otp_used(otp["id"])
        await database.verify_user_phone(current_user["id"])

        return {"message": "Phone verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying phone OTP: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify phone")

# Email verification via OTP
@router.post("/send-email-otp")
async def send_email_otp(payload: SendEmailOTPRequest, current_user: dict = Depends(get_current_active_user)):
    """Generate and send an email verification OTP to the user's registered email."""
    try:
        email = (payload.email or current_user.get("email") or "").strip().lower()
        registered_email = (current_user.get("email") or "").strip().lower()
        if not registered_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email on record")
        # Enforce that the email provided matches the registered email
        if email and email != registered_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email must match your registered email")

        # Generate 6-digit numeric OTP (valid for 10 minutes)
        import random
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Store OTP
        stored = await database.create_email_verification_otp(
            user_id=current_user["id"],
            email=registered_email,
            otp_code=otp_code,
            expires_at=expires_at,
        )
        if not stored:
            logger.warning("Email OTP storage failed, proceeding with send in degraded mode")

        # Send Email via SendGrid or Mock
        subject = "Your serviceHub Verification Code"
        content = (
            f"Hello {current_user.get('name')},\n\n"
            f"Your verification code is {otp_code}. It expires in 10 minutes.\n\n"
            f"If you didn't request this, you can ignore this email.\n\n"
            f"serviceHub Team"
        )

        email_ok = False
        try:
            email_service = SendGridEmailService()
            email_ok = await email_service.send_email(
                to=registered_email,
                subject=subject,
                content=content,
                metadata={"purpose": "email_verification", "user_id": current_user["id"]}
            )
        except Exception as e:
            logger.warning(f"SendGrid unavailable, using mock email: {e}")
            try:
                mock_service = MockEmailService()
                email_ok = await mock_service.send_email(
                    to=registered_email,
                    subject=subject,
                    content=content,
                    metadata={"purpose": "email_verification", "user_id": current_user["id"]}
                )
            except Exception as e2:
                logger.error(f"Failed to send email OTP: {e2}")
                email_ok = False

        if not email_ok:
            # Still return success to avoid leaking delivery failures
            logger.error(f"Failed to send OTP email to {registered_email}")

        return {"message": "Verification code sent"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email OTP: {e}")
        # Degrade gracefully: allow user to proceed even if delivery fails
        return {"message": "Verification code sent"}

@router.post("/verify-email-otp")
async def verify_email_otp(payload: VerifyEmailOTPRequest, current_user: dict = Depends(get_current_active_user)):
    """Verify email using the submitted OTP and mark as verified."""
    try:
        email = (payload.email or current_user.get("email") or "").strip().lower()
        registered_email = (current_user.get("email") or "").strip().lower()
        if not registered_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email on record")
        if email and email != registered_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email must match your registered email")

        otp = await database.get_active_email_otp(
            user_id=current_user["id"],
            email=registered_email,
            otp_code=payload.otp_code,
        )
        if not otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

        await database.mark_email_otp_used(otp["id"]) 
        await database.verify_user_email(current_user["id"]) 

        return {"message": "Email verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying email OTP: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify email")

# Password reset endpoints
@router.post("/password-reset-request")
async def request_password_reset(request_data: PasswordResetRequest):
    """Request password reset - generates token and sends email"""
    try:
        user_data = await database.get_user_by_email(request_data.email)
        if not user_data:
            # Don't reveal if email exists or not for security
            return {"message": "If an account with this email exists, you will receive a password reset link."}
        
        # Generate password reset token (1 hour expiration)
        token_expires = timedelta(hours=1)
        reset_token = create_password_reset_token(
            user_id=user_data["id"],
            email=user_data["email"],
            expires_delta=token_expires
        )
        
        # Store token in database
        expires_at = datetime.utcnow() + token_expires
        token_stored = await database.create_password_reset_token(
            user_id=user_data["id"],
            token=reset_token,
            expires_at=expires_at
        )
        
        if not token_stored:
            logger.error(f"Failed to store password reset token for user {user_data['id']}")
            # Still return success message for security
            return {"message": "If an account with this email exists, you will receive a password reset link."}
        
        # Send password reset email
        try:
            # Get frontend URL from environment
            frontend_url = os.environ.get('FRONTEND_URL', 'https://servicehub.ng')
            # Normalize to avoid double slashes when env has trailing '/'
            reset_link = f"{frontend_url.rstrip('/')}/reset-password?token={reset_token}"
            
            # Initialize email service
            email_service = None
            try:
                email_service = SendGridEmailService()
                logger.info("SendGrid email service initialized successfully")
            except ValueError as e:
                # Configuration missing - fall back to mock
                logger.warning(f"SendGrid not configured: {e}. Using mock email service (emails will not be sent)")
                email_service = MockEmailService()
            except Exception as e:
                # Other initialization errors - fall back to mock
                logger.error(f"Failed to initialize SendGrid: {e}. Using mock email service (emails will not be sent)")
                email_service = MockEmailService()
            
            # Create email content
            email_subject = "Reset Your serviceHub Password"
            email_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #34D164; color: white; padding: 20px; text-align: center; }}
                    .content {{ background-color: #f9f9f9; padding: 30px; }}
                    .button {{ display: inline-block; background-color: #34D164; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                    .warning {{ color: #d32f2f; font-weight: bold; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>serviceHub</h1>
                        <h2>Password Reset Request</h2>
                    </div>
                    <div class="content">
                        <p>Hello {user_data.get('name', 'User')},</p>
                        <p>We received a request to reset your password for your serviceHub account.</p>
                        <p>Click the button below to reset your password:</p>
                        <p style="text-align: center;">
                            <a href="{reset_link}" class="button">Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #666; font-size: 12px;">{reset_link}</p>
                        <p class="warning">⚠️ This link will expire in 1 hour for security reasons.</p>
                        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                        <p>For security reasons, never share this link with anyone.</p>
                    </div>
                    <div class="footer">
                        <p>© {datetime.utcnow().year} serviceHub. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email
            if email_service:
                email_sent = await email_service.send_email(
                    to=user_data["email"],
                    subject=email_subject,
                    content=email_content
                )
                
                if email_sent:
                    logger.info(f"✅ Password reset email sent successfully to {user_data['email']}")
                else:
                    logger.error(f"❌ Failed to send password reset email to {user_data['email']}")
                    logger.error(f"   Check SendGrid configuration and logs above for details")
            else:
                logger.error("Email service not initialized - cannot send password reset email")
            
        except Exception as e:
            logger.error(f"❌ Error sending password reset email: {str(e)}")
            logger.error(f"   Token was generated and stored: {reset_token[:20]}...")
            logger.error(f"   User can still use the token if they have it")
            # Don't fail the request if email sending fails - still return success for security
        
        # Always return success message (security best practice - don't reveal if email exists)
        return {"message": "If an account with this email exists, you will receive a password reset link."}
        
    except Exception as e:
        logger.error(f"Error processing password reset request: {str(e)}")
        # Still return generic success message for security
        return {"message": "If an account with this email exists, you will receive a password reset link."}

@router.post("/password-reset")
async def reset_password(reset_data: PasswordReset):
    """Reset password using a valid reset token"""
    try:
        # Verify token
        try:
            token_payload = verify_password_reset_token(reset_data.token)
        except HTTPException as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.detail
            )
        
        user_id = token_payload.get("sub")
        email = token_payload.get("email")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token payload"
            )
        
        # Verify token exists in database and is not used
        token_data = await database.get_password_reset_token(reset_data.token)
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token"
            )
        
        # Verify token belongs to correct user
        if token_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token does not match user"
            )
        
        # Get user to verify they still exist
        user_data = await database.get_user_by_id(user_id)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify email matches
        if user_data.get("email") != email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token email does not match user email"
            )
        
        # Validate new password strength
        if not validate_password_strength(reset_data.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, numeric, and special characters"
            )
        
        # Update user password
        hashed_password = get_password_hash(reset_data.new_password)
        password_updated = await database.update_user(
            user_id=user_id,
            update_data={"password_hash": hashed_password}
        )
        
        if not password_updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        # Mark token as used
        await database.mark_password_reset_token_as_used(reset_data.token)
        
        # Invalidate all other password reset tokens for this user
        await database.invalidate_user_password_reset_tokens(user_id)
        
        logger.info(f"Password reset successful for user {user_id}")
        
        return {
            "message": "Password reset successfully. You can now login with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.get("/trade-categories")
async def get_trade_categories():
    """Get all available trade categories for the Nigerian market"""
    return {
        "categories": NIGERIAN_TRADE_CATEGORIES,
        "total": len(NIGERIAN_TRADE_CATEGORIES)
    }

@router.get("/nigerian-states")
async def get_nigerian_states():
    """Get all available Nigerian states/locations for service coverage"""
    # Get static states
    from models.nigerian_states import NIGERIAN_STATES
    
    # Get custom states from database
    custom_states_cursor = database.database.system_locations.find({"type": "state"})
    custom_states_docs = await custom_states_cursor.to_list(length=None)
    custom_states = [state["name"] for state in custom_states_docs]
    
    # Combine both lists and remove duplicates
    all_states = list(set(NIGERIAN_STATES + custom_states))
    all_states.sort()  # Sort alphabetically
    
    return {
        "states": all_states,
        "total": len(all_states)
    }

@router.get("/lgas/{state}")
async def get_lgas_for_state(state: str):
    """Get all Local Government Areas (LGAs) for a specific Nigerian state"""
    from models.nigerian_lgas import get_lgas_for_state as get_static_lgas, get_all_states
    
    # Check if state exists in static states
    static_state_exists = state in get_all_states()
    
    # Check if state exists in dynamic states (admin-added)
    dynamic_state_exists = await database.database.system_locations.find_one({
        "name": state,
        "type": "state"
    })
    
    # Validate state exists in either static or dynamic
    if not (static_state_exists or dynamic_state_exists):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"State '{state}' is not in our service coverage area"
        )
    
    # Get static LGAs
    static_lgas = get_static_lgas(state) or []
    
    # Get custom LGAs from database
    custom_lgas_cursor = database.database.system_locations.find({
        "state": state,
        "type": "lga"
    })
    custom_lgas_docs = await custom_lgas_cursor.to_list(length=None)
    custom_lgas = [lga["name"] for lga in custom_lgas_docs]
    
    # Combine both lists and remove duplicates
    all_lgas = list(set(static_lgas + custom_lgas))
    
    return {
        "state": state,
        "lgas": all_lgas,
        "total": len(all_lgas)
    }

@router.get("/all-lgas")
async def get_all_lgas():
    """Get all Local Government Areas organized by state"""
    from models.nigerian_lgas import get_all_lgas
    
    all_lgas = get_all_lgas()
    total_lgas = sum(len(lgas) for lgas in all_lgas.values())
    
    return {
        "lgas_by_state": all_lgas,
        "total_states": len(all_lgas),
        "total_lgas": total_lgas
    }

@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_tokens(request: RefreshTokenRequest):
    """Refresh access token using a valid refresh token"""
    try:
        # Verify refresh token
        payload = verify_refresh_token(request.refresh_token)
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload"
            )
        
        # Load user
        user = await database.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if user.get("status") == UserStatus.SUSPENDED:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
        
        # Issue new tokens
        access_token_expires = timedelta(minutes=60 * 24)
        new_access_token = create_access_token(data={"sub": user_id, "email": email}, expires_delta=access_token_expires)
        new_refresh_token = create_refresh_token(data={"sub": user_id, "email": email})
        
        return RefreshTokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=60 * 60 * 24
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Refresh failed: {str(e)}")

from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Form
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
    verify_refresh_token, create_password_reset_token, verify_password_reset_token,
    create_email_verification_token, verify_email_verification_token
)
from ..auth.dependencies import get_current_user, get_current_active_user, get_current_tradesperson
from ..database import database
from ..models.trade_categories import NIGERIAN_TRADE_CATEGORIES, validate_trade_category
from ..models.nigerian_states import NIGERIAN_STATES, validate_nigerian_state
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Import email service for password reset emails
try:
    from ..services.notifications import SendGridEmailService, MockEmailService, notification_service
except ImportError:
    from services.notifications import SendGridEmailService, MockEmailService, notification_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])

BASE_UPLOADS = Path(os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads")))
CERT_UPLOAD_DIR = BASE_UPLOADS / "certifications"
CERT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/register/homeowner")
async def register_homeowner(registration_data: HomeownerRegistration):
    """Register a new homeowner account"""
    try:
        allow = os.getenv("ALLOW_HOMEOWNER_STANDALONE_SIGNUP", "0")
        if allow not in ("1", "true", "True"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Homeowner signup is only available when posting a job"
            )
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

                # Send email verification link
                try:
                    token_expires = timedelta(hours=24)
                    verification_token = create_email_verification_token(
                        user_id=created_user["id"], email=created_user["email"], expires_delta=token_expires
                    )
                    expires_at = datetime.utcnow() + token_expires
                    await database.create_email_verification_token(
                        user_id=created_user["id"], token=verification_token, expires_at=expires_at
                    )
                    email_service = None
                    try:
                        email_service = SendGridEmailService()
                    except Exception:
                        try:
                            email_service = MockEmailService()
                        except Exception:
                            email_service = None
                    dev_flag = os.environ.get('OTP_DEV_MODE', '0')
                    frontend_url = os.environ.get('FRONTEND_URL') or (
                        'http://localhost:3000' if dev_flag in ('1', 'true', 'True') else 'https://servicehub.ng'
                    )
                    verify_link = f"{frontend_url.rstrip('/')}/verify-account?token={verification_token}"
                    if email_service:
                        html = f"""
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
                            <h2>Verify your email</h2>
                            <p>Hello {created_user.get('name','')},</p>
                            <p>Please verify your email to complete registration.</p>
                            <p>
                              <a class=\"btn\" href=\"{verify_link}\">Verify Email</a>
                            </p>
                            <p>If the button doesn’t work, copy and paste this link:</p>
                            <p class=\"link\">{verify_link}</p>
                            <p>This link expires in 24 hours.</p>
                          </div>
                        </body>
                        </html>
                        """
                        await email_service.send_email(
                            to=created_user["email"],
                            subject="Verify your email - serviceHub",
                            content=html,
                            metadata={"purpose": "email_verification", "user_id": created_user["id"]}
                        )
                except Exception as e:
                    logger.warning(f"Failed to send verification email: {e}")

                return {
                    "user": user_response.dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "expires_in": 60 * 60 * 24,
                    "email_verification": {"sent": True}
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
            "verified_tradesperson": False,
            "business_type": registration_data.business_type,
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
            update_data["certifications"] = [
                c if isinstance(c, str) else c.dict()
                for c in profile_data.certifications
            ]

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

@router.post("/profile/certification-image")
async def upload_certification_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    try:
        allowed = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        data = await file.read()
        max_bytes = int(os.getenv("CERT_IMAGE_MAX_BYTES", "5242880"))
        if len(data) > max_bytes:
            raise HTTPException(status_code=413, detail="File too large")
        ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        name = f"{uuid.uuid4().hex}{ext}"
        dest = CERT_UPLOAD_DIR / name
        with open(dest, "wb") as f:
            f.write(data)
        url_path = f"/api/auth/certifications/image/{name}"
        return {"filename": name, "content_type": file.content_type, "size": len(data), "url": url_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload certification image: {str(e)}")

@router.get("/certifications/image/{filename}")
async def get_certification_image(filename: str):
    try:
        from fastapi.responses import FileResponse
        import os
        base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        project_uploads = os.path.join(project_root, "uploads")
        backend_uploads = os.path.join(project_root, "backend", "uploads")
        candidates = [
            os.path.join(base_dir, "certifications", filename),
            os.path.join(project_uploads, "certifications", filename),
            os.path.join(backend_uploads, "certifications", filename),
            os.path.join(os.getcwd(), "uploads", "certifications", filename),
            os.path.join("/app", "uploads", "certifications", filename),
        ]
        for fp in candidates:
            if os.path.exists(fp):
                ext = os.path.splitext(fp)[1].lower()
                media_type = (
                    "application/pdf" if ext == ".pdf" else (
                        "image/jpeg" if ext in (".jpg", ".jpeg") else (
                            "image/png" if ext == ".png" else (
                                "image/webp" if ext == ".webp" else "application/octet-stream"
                            )
                        )
                    )
                )
                return FileResponse(fp, media_type=media_type, headers={"Cache-Control": "public, max-age=3600"})
        raise HTTPException(status_code=404, detail="Image not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve image: {str(e)}")

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client should discard token)"""
    # In a more sophisticated system, you might want to blacklist the token
    # For now, we just return success and let the client handle token removal
    return {"message": "Successfully logged out"}

@router.delete("/account")
async def delete_my_account(current_user: User = Depends(get_current_active_user)):
    """Allow a logged-in user to permanently delete their account and data"""
    try:
        # Prevent admin account deletion via this endpoint
        if current_user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts cannot be deleted via this endpoint"
            )

        # Ensure database is connected for full deletion
        db_ready = getattr(database, "connected", False) and getattr(database, "database", None) is not None
        if not db_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service temporarily unavailable. Please try again later."
            )

        success = await database.delete_user_completely(current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete account"
            )

        return {"message": "Account deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting account: {str(e)}"
        )

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
async def send_phone_otp(payload: SendPhoneOTPRequest, current_user: User = Depends(get_current_active_user)):
    """Generate and send a phone verification OTP to the user's phone."""
    try:
        phone = payload.phone or current_user.phone
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
            user_id=current_user.id,
            phone=formatted_phone,
            otp_code=otp_code,
            expires_at=expires_at,
        )
        if not stored:
            logger.warning("Phone OTP storage failed, proceeding with send in degraded mode")

        # Send SMS (with diagnostic result)
        message = f"Your serviceHub verification code is {otp_code}. It expires in 10 minutes."
        send_result = await notification_service.send_custom_sms_with_result(
            phone=formatted_phone,
            message=message,
            metadata={"purpose": "phone_verification", "user_id": current_user.id}
        )
        sms_ok = bool(send_result.get("ok"))
        if not sms_ok:
            logger.error(f"Failed to send OTP SMS to {formatted_phone} - result={send_result}")

        resp = {"message": "Verification code sent", "delivery_status": ("sent" if sms_ok else "failed")}
        try:
            dev_flag = os.environ.get('OTP_DEV_MODE', '0')
            logger.info(f"OTP_DEV_MODE={dev_flag}")
            if dev_flag in ('1', 'true', 'True'):
                resp["debug_code"] = otp_code
                logger.info(f"OTP dev mode active; phone debug_code={otp_code}")
            # Optionally include provider diagnostics
            debug_resp = os.environ.get('OTP_DEBUG_RESPONSE', '0')
            if debug_resp in ('1', 'true', 'True'):
                resp["provider_status"] = send_result.get("status")
                resp["provider_channel"] = send_result.get("channel")
                resp["provider_response"] = send_result.get("response")
        except Exception:
            pass
        return resp
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending phone OTP: {e}")
        # Degrade gracefully: allow user to proceed even if delivery fails
        resp = {"message": "Verification code sent"}
        try:
            dev_flag = os.environ.get('OTP_DEV_MODE', '0')
            logger.info(f"OTP_DEV_MODE={dev_flag}")
            if dev_flag in ('1', 'true', 'True'):
                resp["debug_code"] = otp_code
                logger.info(f"OTP dev mode active; phone debug_code={otp_code}")
        except Exception:
            pass
        return resp

@router.post("/verify-phone-otp")
async def verify_phone_otp(payload: VerifyPhoneOTPRequest, current_user: User = Depends(get_current_active_user)):
    """Verify phone using the submitted OTP and mark as verified."""
    try:
        phone = payload.phone or current_user.phone
        if not phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No phone number on record")

        formatted_phone = phone
        if validate_nigerian_phone(phone):
            formatted_phone = format_nigerian_phone(phone)

        otp = await database.get_active_phone_otp(
            user_id=current_user.id,
            phone=formatted_phone,
            otp_code=payload.otp_code,
        )
        if not otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

        # Mark OTP used and verify phone
        await database.mark_phone_otp_used(otp["id"])
        await database.verify_user_phone(current_user.id)

        return {"message": "Phone verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying phone OTP: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify phone")

# Email verification via OTP
@router.post("/send-email-otp")
async def send_email_otp(payload: SendEmailOTPRequest, current_user: User = Depends(get_current_active_user)):
    """Generate and send an email verification OTP to the user's registered email."""
    try:
        email = (payload.email or current_user.email or "").strip().lower()
        registered_email = (current_user.email or "").strip().lower()
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
            user_id=current_user.id,
            email=registered_email,
            otp_code=otp_code,
            expires_at=expires_at,
        )
        if not stored:
            logger.warning("Email OTP storage failed, proceeding with send in degraded mode")

        # Send Email via SendGrid or Mock
        subject = "Your serviceHub Verification Code"
        content = (
            f"Hello {current_user.name},\n\n"
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
                metadata={"purpose": "email_verification", "user_id": current_user.id}
            )
        except Exception as e:
            logger.warning(f"SendGrid unavailable, using mock email: {e}")
            try:
                mock_service = MockEmailService()
                email_ok = await mock_service.send_email(
                    to=registered_email,
                    subject=subject,
                    content=content,
                    metadata={"purpose": "email_verification", "user_id": current_user.id}
                )
            except Exception as e2:
                logger.error(f"Failed to send email OTP: {e2}")
                email_ok = False
        if email_ok:
            logger.info(f"Email OTP sent to {registered_email}")

        if not email_ok:
            logger.error(f"Failed to send OTP email to {registered_email}")

        resp = {"message": "Verification code sent"}
        try:
            dev_flag = os.environ.get('OTP_DEV_MODE', '0')
            logger.info(f"OTP_DEV_MODE={dev_flag}")
            if dev_flag in ('1', 'true', 'True'):
                resp["debug_code"] = otp_code
                logger.info(f"OTP dev mode active; email debug_code={otp_code}")
        except Exception:
            pass
        return resp
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email OTP: {e}")
        resp = {"message": "Verification code sent"}
        try:
            dev_flag = os.environ.get('OTP_DEV_MODE', '0')
            logger.info(f"OTP_DEV_MODE={dev_flag}")
            if dev_flag in ('1', 'true', 'True'):
                resp["debug_code"] = otp_code
                logger.info(f"OTP dev mode active; email debug_code={otp_code}")
        except Exception:
            pass
        return resp

@router.post("/verify-email-otp")
async def verify_email_otp(payload: VerifyEmailOTPRequest, current_user: User = Depends(get_current_active_user)):
    """Verify email using the submitted OTP and mark as verified."""
    try:
        email = (payload.email or current_user.email or "").strip().lower()
        registered_email = (current_user.email or "").strip().lower()
        if not registered_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email on record")
        if email and email != registered_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email must match your registered email")

        otp = await database.get_active_email_otp(
            user_id=current_user.id,
            email=registered_email,
            otp_code=payload.otp_code,
        )
        if not otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

        await database.mark_email_otp_used(otp["id"]) 
        await database.verify_user_email(current_user.id) 

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
# Email verification via link
@router.post("/email-verification/request")
async def request_email_verification(current_user: User = Depends(get_current_active_user)):
    """Generate link token and send email to current user's email"""
    try:
        token_expires = timedelta(hours=24)
        verification_token = create_email_verification_token(
            user_id=current_user.id, email=current_user.email, expires_delta=token_expires
        )
        expires_at = datetime.utcnow() + token_expires
        await database.create_email_verification_token(
            user_id=current_user.id, token=verification_token, expires_at=expires_at
        )
        email_service = None
        try:
            email_service = SendGridEmailService()
        except Exception:
            try:
                email_service = MockEmailService()
            except Exception:
                email_service = None
        frontend_url = os.environ.get('FRONTEND_URL', 'https://servicehub.ng')
        verify_link = f"{frontend_url.rstrip('/')}/verify-account?token={verification_token}"
        if email_service:
            html = f"""
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
                <h2>Verify your email</h2>
                <p>Hello {current_user.name},</p>
                <p>Please verify your email to continue using serviceHub.</p>
                <p>
                  <a class=\"btn\" href=\"{verify_link}\">Verify Email</a>
                </p>
                <p>If the button doesn’t work, copy and paste this link:</p>
                <p class=\"link\">{verify_link}</p>
                <p>This link expires in 24 hours.</p>
              </div>
            </body>
            </html>
            """
            await email_service.send_email(
                to=current_user.email,
                subject="Verify your email - serviceHub",
                content=html,
                metadata={"purpose": "email_verification", "user_id": current_user.id}
            )
        resp = {"message": "Verification email sent"}
        try:
            dev_flag = os.environ.get('OTP_DEV_MODE', '0')
            if dev_flag in ('1','true','True'):
                resp["debug_link"] = verify_link
        except Exception:
            pass
        return resp
    except Exception as e:
        logger.error(f"Error requesting email verification: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email")

@router.get("/email-verification/confirm")
async def confirm_email_verification(token: str):
    try:
        token_str = (token or "").strip()
        token_data = await database.get_email_verification_token(token_str)
        if not token_data:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        if token_data.get("used"):
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        expires_at = token_data.get("expires_at")
        if expires_at and datetime.utcnow() > expires_at:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        user_id = token_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid token payload")
        user_data = await database.get_user_by_id(user_id)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        await database.verify_user_email(user_id)
        await database.mark_email_verification_token_used(token_str)

        access_token_expires = timedelta(minutes=60 * 24)
        access_token = create_access_token(
            data={"sub": user_data["id"], "email": user_data["email"]},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(data={"sub": user_data["id"], "email": user_data["email"]})
        try:
            await database.update_user_last_login(user_data["id"])
        except Exception:
            pass
        user_response = {k: v for k, v in user_data.items() if k != "password_hash"}
        auto_job = None
        try:
            pending = await database.get_pending_job_by_user_id(user_id)
            if pending:
                jd = dict(pending.get("job_data", {}))
                job_dict = dict(jd)
                state_val = jd.get("state")
                zip_val = jd.get("zip_code")
                if state_val is not None:
                    job_dict["location"] = state_val
                if zip_val is not None:
                    job_dict["postcode"] = zip_val
                job_dict["homeowner"] = {
                    "id": user_data["id"],
                    "name": user_data.get("name", ""),
                    "email": user_data.get("email", ""),
                    "phone": user_data.get("phone", ""),
                }
                job_dict["homeowner_id"] = user_data["id"]
                for f in ["homeowner_name", "homeowner_email", "homeowner_phone"]:
                    if f in job_dict:
                        del job_dict[f]
                job_dict["id"] = await database.generate_job_id(digits=6)
                job_dict["status"] = "pending_approval"
                job_dict["quotes_count"] = 0
                job_dict["interests_count"] = 0
                job_dict["access_fee_naira"] = 1000
                job_dict["access_fee_coins"] = 10
                job_dict["created_at"] = datetime.utcnow()
                job_dict["updated_at"] = datetime.utcnow()
                job_dict["expires_at"] = datetime.utcnow() + timedelta(days=30)
                auto_job = await database.create_job(job_dict)
                await database.mark_pending_job_used(pending["id"])
        except Exception:
            auto_job = None
        resp = {
            "message": "Email verified successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 60 * 60 * 24,
            "user": user_response,
        }
        if auto_job is not None:
            resp["job"] = auto_job
            resp["auto_posted"] = True
        return resp
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming email verification: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify email")
@router.post("/tradesperson-verification")
async def submit_tradesperson_verification(
    business_type: str = Form(...),
    id_document: UploadFile = File(None),
    id_selfie: UploadFile = File(None),
    proof_of_address: UploadFile = File(None),
    residential_address: str = Form(None),
    work_photos: List[UploadFile] = File([]),
    trade_certificate: UploadFile = File(None),
    cac_certificate: UploadFile = File(None),
    cac_status_report: UploadFile = File(None),
    company_address: str = Form(None),
    director_name: str = Form(None),
    director_id_document: UploadFile = File(None),
    company_bank_name: str = Form(None),
    company_account_number: str = Form(None),
    company_account_name: str = Form(None),
    tin: str = Form(None),
    business_logo: UploadFile = File(None),
    bn_certificate: UploadFile = File(None),
    partnership_agreement: UploadFile = File(None),
    partner_id_documents: List[UploadFile] = File([]),
    llp_certificate: UploadFile = File(None),
    llp_agreement: UploadFile = File(None),
    designated_partners: str = Form(None),
    current_user=Depends(get_current_tradesperson)
):
    base_dir = os.environ.get("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
    upload_dir = os.path.join(base_dir, "tradespeople_verifications")
    os.makedirs(upload_dir, exist_ok=True)
    async def _save_file(f: UploadFile):
        if not f:
            return None
        if not f.content_type:
            return None
        fn = f.filename or str(uuid.uuid4())
        fp = os.path.join(upload_dir, fn)
        data = await f.read()
        with open(fp, "wb") as out:
            out.write(data)
        try:
            import base64
            b64 = base64.b64encode(data).decode("utf-8")
        except Exception:
            b64 = None
        return {"filename": fn, "base64": b64, "content_type": f.content_type or "application/octet-stream"}
    docs: Dict[str, Any] = {}
    documents_base64: List[Dict[str, Any]] = []
    if id_document:
        saved = await _save_file(id_document)
        if saved:
            docs["id_document"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if id_selfie:
        saved = await _save_file(id_selfie)
        if saved:
            docs["id_selfie"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if proof_of_address:
        saved = await _save_file(proof_of_address)
        if saved:
            docs["proof_of_address"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if trade_certificate:
        saved = await _save_file(trade_certificate)
        if saved:
            docs["trade_certificate"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if cac_certificate:
        saved = await _save_file(cac_certificate)
        if saved:
            docs["cac_certificate"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if cac_status_report:
        saved = await _save_file(cac_status_report)
        if saved:
            docs["cac_status_report"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if director_id_document:
        saved = await _save_file(director_id_document)
        if saved:
            docs["director_id_document"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if business_logo:
        saved = await _save_file(business_logo)
        if saved:
            docs["business_logo"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if bn_certificate:
        saved = await _save_file(bn_certificate)
        if saved:
            docs["bn_certificate"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if partnership_agreement:
        saved = await _save_file(partnership_agreement)
        if saved:
            docs["partnership_agreement"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if llp_certificate:
        saved = await _save_file(llp_certificate)
        if saved:
            docs["llp_certificate"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    if llp_agreement:
        saved = await _save_file(llp_agreement)
        if saved:
            docs["llp_agreement"] = saved["filename"]
            if saved.get("base64"):
                documents_base64.append(saved)
    work_files: List[str] = []
    work_photos_base64: List[Dict[str, Any]] = []
    for wf in work_photos or []:
        saved = await _save_file(wf)
        if saved:
            work_files.append(saved["filename"])
            if saved.get("base64"):
                work_photos_base64.append(saved)
    partner_files: List[str] = []
    partner_id_documents_base64: List[Dict[str, Any]] = []
    for pf in partner_id_documents or []:
        saved = await _save_file(pf)
        if saved:
            partner_files.append(saved["filename"])
            if saved.get("base64"):
                partner_id_documents_base64.append(saved)
    payload = {
        "user_id": current_user.id,
        "business_type": (business_type or "").strip(),
        "residential_address": residential_address,
        "company_address": company_address,
        "director_name": director_name,
        "company_bank_name": company_bank_name,
        "company_account_number": company_account_number,
        "company_account_name": company_account_name,
        "tin": tin,
        "designated_partners": designated_partners,
        "documents": docs,
        "documents_base64": documents_base64,
        "work_photos": work_files,
        "work_photos_base64": work_photos_base64,
        "partner_id_documents": partner_files,
        "partner_id_documents_base64": partner_id_documents_base64,
    }
    bt = payload["business_type"].lower()
    if bt.startswith("self") or bt.startswith("sole"):
        if not docs.get("id_document") or not docs.get("id_selfie") or not residential_address or len(work_files) < 2:
            raise HTTPException(status_code=400, detail="Required fields missing for self-employed")
        has_refs = await database.has_tradesperson_references(current_user.id)
        if not has_refs:
            raise HTTPException(status_code=400, detail="Self-employed requires work and character references")
    elif "limited company" in bt or bt.endswith("ltd") or bt == "ltd":
        req_ok = all([
            docs.get("cac_certificate"),
            docs.get("cac_status_report"),
            company_address,
            director_name,
            docs.get("director_id_document"),
            company_bank_name,
            company_account_number,
            company_account_name,
        ])
        if not req_ok:
            raise HTTPException(status_code=400, detail="Required fields missing for limited company")
    elif "partnership" in bt and "limited liability" not in bt:
        req_ok = all([
            docs.get("bn_certificate"),
            partnership_agreement,
            company_address,
        ]) and len(partner_files) >= 1
        if not req_ok:
            raise HTTPException(status_code=400, detail="Required fields missing for partnership")
    elif "limited liability partnership" in bt or bt == "llp":
        req_ok = all([
            docs.get("llp_certificate"),
            llp_agreement,
            company_address,
            designated_partners,
        ]) and len(partner_files) >= 1
        if not req_ok:
            raise HTTPException(status_code=400, detail="Required fields missing for llp")
    vid = await database.submit_tradesperson_full_verification(payload)
    return {"message": "Verification submitted", "verification_id": vid, "status": "pending"}

@router.get("/tradesperson-verification/status")
async def get_tradesperson_verification_status(current_user=Depends(get_current_tradesperson)):
    """Return the current user's tradesperson verification status."""
    try:
        status_info = await database.get_user_tradesperson_verification_status(current_user.id)
        user_doc = await database.get_user_by_id(current_user.id)
        # Combine flags for clarity
        combined = {
            "status": status_info.get("status", "not_submitted"),
            "verification_submitted": bool(user_doc.get("verification_submitted")),
            "verified_tradesperson": bool(user_doc.get("verified_tradesperson")),
            "is_verified": bool(user_doc.get("is_verified")),
            "identity_verified": bool(user_doc.get("identity_verified")),
            "verification_id": status_info.get("verification_id"),
            "submitted_at": status_info.get("submitted_at"),
            "updated_at": status_info.get("updated_at"),
        }
        return combined
    except Exception as e:
        logger.error(f"Error fetching tradesperson verification status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch verification status")

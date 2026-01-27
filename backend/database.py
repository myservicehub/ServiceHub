from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
import os
from typing import List, Optional, Dict, Any
import re
import logging
import uuid
import certifi
try:
    from .models.notifications import (
        Notification, NotificationPreferences, NotificationChannel,
        NotificationType, NotificationStatus
    )
    from .models.auth import UserRole
    from .models.reviews import (
        Review, ReviewCreate, ReviewSummary, ReviewRequest, 
        ReviewStats, ReviewType, ReviewStatus
    )
    from .models.admin import AdminRole, AdminStatus, AdminActivityType
except ImportError:
    from models.notifications import (
        Notification, NotificationPreferences, NotificationChannel,
        NotificationType, NotificationStatus
    )
    from models.auth import UserRole
    from models.reviews import (
        Review, ReviewCreate, ReviewSummary, ReviewRequest, 
        ReviewStats, ReviewType, ReviewStatus
    )
    from models.admin import AdminRole, AdminStatus, AdminActivityType

import functools
import time

logger = logging.getLogger(__name__)

def time_it(func):
    """Decorator to log execution time of async database methods"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            if duration > 0.5: # Only log if it takes more than 500ms
                logger.warning(f"🐢 Database query {func.__name__} took {duration:.4f} seconds")
            else:
                logger.info(f"⚡ Database query {func.__name__} took {duration:.4f} seconds")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"❌ Database query {func.__name__} failed after {duration:.4f} seconds: {e}")
            raise
    return wrapper

class Database:
    def __init__(self):
        self.client = None
        self.database = None
        self.connected = False
        self._memory = {"phone_otps": [], "email_otps": [], "users": {}}
        self._geo_cache: Dict[str, Dict[str, Any]] = {}
        self._geo_rate: Dict[str, Any] = {
            "window_start": datetime.now(timezone.utc),
            "count": 0,
            "limit": int(os.getenv("GEOCODER_RATE_LIMIT_PER_MIN", "30")),
            "window_seconds": 60,
            "ttl_days": int(os.getenv("GEOCODER_CACHE_TTL_DAYS", "7")),
        }

    async def connect_to_mongo(self):
        mongo_url = (
            os.environ.get('MONGO_URL')
            or os.environ.get('MONGODB_URL')
            or os.environ.get('MONGODB_URI')
            or os.environ.get('MONGODB_CONNECTION_STRING')
        )
        db_name = (
            os.environ.get('DB_NAME')
            or os.environ.get('DATABASE_NAME')
            or os.environ.get('MONGO_DB')
            or os.environ.get('MONGODB_DB')
            or 'servicehub'
        )
        
        if not mongo_url:
            raise ValueError("MongoDB URL not found. Please set MONGO_URL or MONGODB_URL environment variable.")
        
        # Initialize client with TLS CA file to fix SSL handshake issues and sensible timeouts
        timeout_ms = int(os.getenv('MONGO_TIMEOUT_MS', '15000'))
        connect_timeout_ms = int(os.getenv('MONGO_CONNECT_TIMEOUT_MS', '15000'))
        # Create SSL context pinned to TLS 1.2 with Certifi CA bundle
        import ssl
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        try:
            # Prefer TLS 1.2 for compatibility with certain Atlas clusters
            ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
            ssl_context.maximum_version = ssl.TLSVersion.TLSv1_2
        except Exception:
            # Fallback for older Python versions that don't support TLSVersion enum
            pass

        url_lower = mongo_url.lower()
        use_tls = mongo_url.startswith("mongodb+srv://") or ("tls=true" in url_lower) or ("ssl=true" in url_lower)
        insecure_via_uri = "tlsinsecure=true" in url_lower
        insecure_via_params = ("tlsallowinvalidcertificates=true" in url_lower) or ("tlsallowinvalidhostnames=true" in url_lower)
        try:
            client_kwargs = {
                "serverSelectionTimeoutMS": timeout_ms,
                "connectTimeoutMS": connect_timeout_ms,
            }
            if use_tls:
                client_kwargs["tls"] = True
                if insecure_via_uri or insecure_via_params:
                    # When URI already includes insecure flags, do not set conflicting client params
                    # Also avoid tlsCAFile to prevent certificate validation
                    pass
                else:
                    client_kwargs["tlsCAFile"] = certifi.where()
            
            # Initialize the client
            self.client = AsyncIOMotorClient(
                mongo_url,
                **client_kwargs,
            )
            
            # Verify connection with a ping
            await self.client.admin.command('ping')
            self.database = self.client[db_name]
            self.connected = True
            logger.info("Connected to MongoDB")
            # Ensure required indexes at startup
            try:
                # Users: unique id index
                await self.database.users.create_index(
                    [("id", 1)],
                    name="unique_user_uuid",
                    unique=True,
                    partialFilterExpression={"id": {"$type": "string"}}
                )

                # Users: unique email index
                await self.database.users.create_index(
                    [("email", 1)],
                    name="unique_email",
                    unique=True,
                    partialFilterExpression={"email": {"$type": "string"}}
                )

                # Users: unique public_id index for short shareable IDs
                try:
                    await self.database.users.create_index(
                        [("public_id", 1)],
                        name="unique_public_id",
                        unique=True,
                        partialFilterExpression={"public_id": {"$type": "string"}}
                    )
                except Exception as idx_err:
                    logger.warning(f"Failed to ensure users public_id index: {idx_err}")
                # Users: unique short numeric user_id index
                try:
                    await self.database.users.create_index(
                        [("user_id", 1)],
                        name="unique_user_id",
                        unique=True,
                        partialFilterExpression={"user_id": {"$type": "string"}}
                    )
                except Exception as idx_err:
                    logger.warning(f"Failed to ensure users user_id index: {idx_err}")

                # Jobs: compound indexes to optimize common queries and sorts
                await self.database.jobs.create_index(
                    [("id", 1)],
                    name="unique_job_uuid",
                    unique=True,
                    partialFilterExpression={"id": {"$type": "string"}}
                )
                await self.database.jobs.create_index(
                    [("created_at", -1)],
                    name="jobs_createdAt_only"
                )
                await self.database.jobs.create_index(
                    [("status", 1), ("created_at", -1)],
                    name="jobs_status_createdAt"
                )
                await self.database.jobs.create_index(
                    [("homeowner_id", 1), ("created_at", -1)],
                    name="jobs_homeownerId_createdAt"
                )
                await self.database.jobs.create_index(
                    [("homeowner.id", 1), ("created_at", -1)],
                    name="jobs_homeownerDotId_createdAt"
                )
                await self.database.jobs.create_index(
                    [("category", 1), ("created_at", -1)],
                    name="jobs_category_createdAt"
                )

                # Messages: indexes for conversation queries and read-status updates
                await self.database.messages.create_index(
                    [("id", 1)],
                    name="unique_message_uuid",
                    unique=True,
                    partialFilterExpression={"id": {"$type": "string"}}
                )
                await self.database.messages.create_index(
                    [("conversation_id", 1), ("created_at", 1)],
                    name="messages_conversation_createdAt"
                )
                await self.database.messages.create_index(
                    [("conversation_id", 1), ("sender_type", 1), ("status", 1)],
                    name="messages_conversation_sender_status"
                )
                await self.database.pending_jobs.create_index(
                    [("user_id", 1), ("created_at", -1)],
                    name="pending_jobs_user_createdAt"
                )
                await self.database.pending_jobs.create_index(
                    [("expires_at", 1)],
                    expireAfterSeconds=0,
                    name="pending_jobs_expire"
                )

                # Newsletter subscribers: unique email index
                try:
                    await self.database.newsletter_subscribers.create_index(
                        [("email", 1)],
                        name="newsletter_unique_email",
                        unique=True,
                        partialFilterExpression={"email": {"$type": "string"}}
                    )
                except Exception as idx_err:
                    logger.warning(f"Failed to ensure newsletter_subscribers index: {idx_err}")

                # Performance Optimization Indexes
                try:
                    # Interests: unique id index
                    await self.database.interests.create_index(
                        [("id", 1)],
                        name="unique_interest_uuid",
                        unique=True,
                        partialFilterExpression={"id": {"$type": "string"}}
                    )
                    # Interests: index by job_id for faster counts and lookups
                    await self.database.interests.create_index([("job_id", 1)], name="interests_job_id")
                    # Job Question Answers: index by job_id
                    await self.database.job_question_answers.create_index([("job_id", 1)], name="job_qa_job_id")
                    # Reviews: unique id and index by job_id and artisan_id
                    await self.database.reviews.create_index(
                        [("id", 1)],
                        name="unique_review_uuid",
                        unique=True,
                        partialFilterExpression={"id": {"$type": "string"}}
                    )
                    await self.database.reviews.create_index([("job_id", 1)], name="reviews_job_id")
                    await self.database.reviews.create_index([("artisan_id", 1)], name="reviews_artisan_id")
                    # Notifications: index by user_id and status
                    await self.database.notifications.create_index([("user_id", 1), ("status", 1)], name="notifications_user_status")
                    
                    # Tradespeople Verifications: index for pending list and status queries
                    try:
                        await self.database.tradespeople_verifications.create_index(
                            [("status", 1), ("submitted_at", -1)],
                            name="verifications_status_submitted"
                        )
                        await self.database.tradespeople_verifications.create_index(
                            [("user_id", 1), ("status", 1)],
                            name="verifications_user_status"
                        )
                        # Add index for nested filename searches
                        await self.database.tradespeople_verifications.create_index(
                            "documents_base64.filename",
                            name="idx_docs_filename"
                        )
                        await self.database.tradespeople_verifications.create_index(
                            "work_photos_base64.filename",
                            name="idx_work_photos_filename"
                        )
                        await self.database.tradespeople_verifications.create_index(
                            "partner_id_documents_base64.filename",
                            name="idx_partner_ids_filename"
                        )
                    except Exception as idx_err:
                        logger.warning(f"Failed to ensure tradespeople_verifications indexes: {idx_err}")

                    logger.info("Performance optimization indexes ensured successfully")
                except Exception as idx_err:
                    logger.warning(f"Failed to ensure performance indexes: {idx_err}")

                logger.info("Database indexes ensured successfully")
            except Exception as e:
                logger.error(f"Failed to ensure database indexes: {e}")
        except Exception as e:
            self.connected = False
            logger.error(f"MongoDB connection failed: {e}")
            # Allow app to continue running without database connection

    async def close_mongo_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    @property
    def portfolio_collection(self):
        """Access to portfolio collection"""
        return self.database.portfolio

    @property
    def users_collection(self):
        """Access to users collection"""
        if self.database is None:
            raise RuntimeError("Database unavailable: users collection not accessible")
        return self.database.users

    # Newsletter subscription operations
    async def get_newsletter_subscriber_by_email(self, email: str) -> Optional[dict]:
        """Get newsletter subscriber by email"""
        try:
            if self.database is None:
                return None
            doc = await self.database.newsletter_subscribers.find_one({"email": email})
            if doc:
                doc["_id"] = str(doc["_id"])
            return doc
        except Exception as e:
            logger.error(f"Error fetching newsletter subscriber by email: {e}")
            return None

    async def create_newsletter_subscription(self, email: str, source: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        """Create a newsletter subscription record"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot create newsletter subscription")
        record = {
            "id": str(uuid.uuid4()),
            "email": email,
            "source": source or "website",
            "ip_address": ip_address,
            "user_agent": user_agent,
            "subscribed": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        try:
            await self.database.newsletter_subscribers.insert_one(record)
            return record
        except Exception as e:
            # Handle duplicate key error gracefully
            msg = str(e)
            if "E11000" in msg or "duplicate key" in msg.lower():
                logger.info("Newsletter subscriber already exists; returning existing record")
                existing = await self.get_newsletter_subscriber_by_email(email)
                return existing or record
            logger.error(f"Error creating newsletter subscription: {e}")
            raise

    # User authentication operations
    async def create_user(self, user_data: dict) -> dict:
        """Create a new user"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot create user")
        # Ensure short numeric user_id exists (4 digits). Mirror into public_id for compatibility.
        try:
            if not user_data.get("user_id"):
                short_id = await self.generate_user_short_id(digits=4)
                user_data["user_id"] = short_id
                user_data.setdefault("public_id", short_id)
        except Exception as e:
            logger.warning(f"Failed to generate user_id for user: {e}")
        result = await self.database.users.insert_one(user_data)
        user_data['_id'] = str(result.inserted_id)
        return user_data

    @time_it
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID (optimized)"""
        if self.database is None:
            return None
        # Try multiple identifiers to be resilient: primary "id", fallback "user_id" and "public_id"
        user = await self.database.users.find_one({"id": user_id})
        if not user:
            try:
                # Some code paths store short numeric user_id or public_id in notifications
                # Use parallel lookup for fallbacks if primary fails
                import asyncio
                tasks = [
                    self.database.users.find_one({"user_id": user_id}),
                    self.database.users.find_one({"public_id": user_id})
                ]
                results = await asyncio.gather(*tasks)
                user = results[0] or results[1]
            except Exception:
                user = None
        if user:
            user['_id'] = str(user['_id'])
        return user

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        if self.database is None:
            return None
        user = await self.database.users.find_one({"email": email})
        if user:
            user['_id'] = str(user['_id'])
        return user

    async def update_user(self, user_id: str, update_data: dict) -> bool:
        """Update user data"""
        update_data['updated_at'] = datetime.utcnow()
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot update user")
        result = await self.database.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def update_user_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot update last login")
        await self.database.users.update_one(
            {"id": user_id},
            {"$set": {"last_login": datetime.utcnow()}}
        )

    async def verify_user_email(self, user_id: str):
        """Mark user email as verified"""
        if self.database is None:
            # Degraded mode: mark in memory
            try:
                user = self._memory["users"].get(user_id) or {}
                user["email_verified"] = True
                user["updated_at"] = datetime.utcnow()
                self._memory["users"][user_id] = user
                return
            except Exception as e:
                logger.error(f"Error verifying user email in memory {user_id}: {e}")
                return
        await self.database.users.update_one(
            {"id": user_id},
            {"$set": {"email_verified": True, "updated_at": datetime.utcnow()}}
        )

    # Password reset token operations
    async def create_password_reset_token(self, user_id: str, token: str, expires_at: datetime) -> bool:
        """Store a password reset token for a user"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot create password reset token")
        
        # Invalidate any existing tokens for this user
        await self.database.password_reset_tokens.update_many(
            {"user_id": user_id, "used": False},
            {"$set": {"used": True, "invalidated_at": datetime.utcnow()}}
        )
        
        # Create new token record
        token_data = {
            "token": token,
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "used": False,
            "invalidated_at": None
        }
        
        try:
            await self.database.password_reset_tokens.insert_one(token_data)
            return True
        except Exception as e:
            logger.error(f"Error creating password reset token: {e}")
            return False

    async def get_password_reset_token(self, token: str) -> Optional[dict]:
        """Get password reset token data"""
        if self.database is None:
            return None
        
        token_data = await self.database.password_reset_tokens.find_one({
            "token": token,
            "used": False
        })
        
        if token_data:
            token_data['_id'] = str(token_data['_id'])
            # Check if token has expired
            if token_data.get("expires_at") and token_data["expires_at"] < datetime.utcnow():
                return None
        return token_data

    async def mark_password_reset_token_as_used(self, token: str) -> bool:
        """Mark a password reset token as used"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot mark token as used")
        
        result = await self.database.password_reset_tokens.update_one(
            {"token": token},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def invalidate_user_password_reset_tokens(self, user_id: str) -> bool:
        """Invalidate all unused password reset tokens for a user"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot invalidate tokens")
        
        result = await self.database.password_reset_tokens.update_many(
            {"user_id": user_id, "used": False},
            {"$set": {"used": True, "invalidated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    # Email verification token operations
    async def create_email_verification_token(self, user_id: str, token: str, expires_at: datetime) -> bool:
        """Store an email verification token for a user"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot create email verification token")
        try:
            await self.database.email_verification_tokens.update_many(
                {"user_id": user_id, "used": False},
                {"$set": {"used": True, "invalidated_at": datetime.utcnow()}}
            )
        except Exception as e:
            logger.warning(f"Failed to invalidate previous email verification tokens for user {user_id}: {e}")

        token_data = {
            "token": token,
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "used": False,
            "invalidated_at": None,
        }
        try:
            await self.database.email_verification_tokens.insert_one(token_data)
            return True
        except Exception as e:
            logger.error(f"Error creating email verification token: {e}")
            return False

    async def get_email_verification_token(self, token: str) -> Optional[dict]:
        """Get email verification token data"""
        if self.database is None:
            return None
        try:
            token_data = await self.database.email_verification_tokens.find_one({
                "token": token,
                "used": False,
            })
            if not token_data:
                return None
            token_data["_id"] = str(token_data["_id"])
            if token_data.get("expires_at") and token_data["expires_at"] < datetime.utcnow():
                return None
            return token_data
        except Exception as e:
            logger.error(f"Error retrieving email verification token: {e}")
            return None

    async def mark_email_verification_token_used(self, token: str) -> bool:
        """Mark an email verification token as used"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot mark email verification token as used")
        result = await self.database.email_verification_tokens.update_one(
            {"token": token},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    # Phone verification OTP operations
    async def create_phone_verification_otp(self, user_id: str, phone: str, otp_code: str, expires_at: datetime) -> bool:
        """Store a phone verification OTP for a user and invalidate previous ones."""
        if self.database is None:
            try:
                # Invalidate existing active memory OTPs for this user/phone
                for otp in self._memory["phone_otps"]:
                    if otp["user_id"] == user_id and otp["phone"] == phone and not otp.get("used"):
                        otp["used"] = True
                        otp["invalidated_at"] = datetime.utcnow()
                otp_record = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "phone": phone,
                    "otp_code": otp_code,
                    "created_at": datetime.utcnow(),
                    "expires_at": expires_at,
                    "used": False,
                    "invalidated_at": None,
                }
                self._memory["phone_otps"].append(otp_record)
                return True
            except Exception as e:
                logger.error(f"Error creating phone verification OTP in memory: {e}")
                return False

        # Invalidate any existing active OTPs for this user and phone
        try:
            await self.database.phone_verification_otps.update_many(
                {"user_id": user_id, "phone": phone, "used": False},
                {"$set": {"used": True, "invalidated_at": datetime.utcnow()}}
            )
        except Exception as e:
            logger.warning(f"Failed to invalidate previous phone OTPs for user {user_id}: {e}")

        otp_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "phone": phone,
            "otp_code": otp_code,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "used": False,
            "invalidated_at": None,
        }

        try:
            await self.database.phone_verification_otps.insert_one(otp_record)
            return True
        except Exception as e:
            logger.error(f"Error creating phone verification OTP: {e}")
            # Fallback to in-memory store even when DB is present
            try:
                self._memory["phone_otps"].append(otp_record)
                return True
            except Exception as e2:
                logger.error(f"Fallback in-memory phone OTP failed: {e2}")
                return False

    async def get_active_phone_otp(self, user_id: str, phone: str, otp_code: str) -> Optional[dict]:
        """Get an active (unused, unexpired) phone verification OTP for a user."""
        # Always check memory store first as a fallback
        try:
            now = datetime.utcnow()
            for otp in reversed(self._memory["phone_otps"]):
                if (
                    otp["user_id"] == user_id and otp["phone"] == phone and otp["otp_code"] == otp_code and not otp.get("used") and (not otp.get("expires_at") or otp["expires_at"] > now)
                ):
                    return otp
        except Exception as e:
            logger.error(f"Error retrieving phone OTP from memory for user {user_id}: {e}")

        try:
            otp = await self.database.phone_verification_otps.find_one({
                "user_id": user_id,
                "phone": phone,
                "otp_code": otp_code,
                "used": False,
            })
            if not otp:
                return None
            otp["_id"] = str(otp["_id"])
            # Expiration check
            if otp.get("expires_at") and otp["expires_at"] < datetime.utcnow():
                return None
            return otp
        except Exception as e:
            logger.error(f"Error retrieving phone verification OTP for user {user_id}: {e}")
            # Fallback: attempt memory store
            try:
                now = datetime.utcnow()
                for otp in reversed(self._memory["phone_otps"]):
                    if (
                        otp["user_id"] == user_id and otp["phone"] == phone and otp["otp_code"] == otp_code and not otp.get("used") and (not otp.get("expires_at") or otp["expires_at"] > now)
                    ):
                        return otp
            except Exception as e2:
                logger.error(f"Error retrieving phone OTP from memory (fallback) for user {user_id}: {e2}")
            return None

    async def mark_phone_otp_used(self, otp_id: str) -> bool:
        """Mark a phone verification OTP as used."""
        updated = False
        # Try DB update
        if self.database is not None:
            try:
                result = await self.database.phone_verification_otps.update_one(
                    {"id": otp_id},
                    {"$set": {"used": True, "used_at": datetime.utcnow()}}
                )
                updated = result.modified_count > 0
            except Exception as e:
                logger.error(f"Error marking phone OTP used in DB: {e}")
        # Also mark memory record (fallback)
        try:
            for otp in self._memory["phone_otps"]:
                if otp["id"] == otp_id:
                    otp["used"] = True
                    otp["used_at"] = datetime.utcnow()
                    updated = True
                    break
        except Exception as e:
            logger.error(f"Error marking phone OTP used in memory: {e}")
        return updated

    async def verify_user_phone(self, user_id: str) -> bool:
        """Mark user phone as verified."""
        ok = False
        if self.database is not None:
            try:
                result = await self.database.users.update_one(
                    {"id": user_id},
                    {"$set": {"phone_verified": True, "updated_at": datetime.utcnow()}}
                )
                ok = result.modified_count > 0
            except Exception as e:
                logger.error(f"Error verifying user phone {user_id} in DB: {e}")
        if not ok:
            try:
                user = self._memory["users"].get(user_id) or {}
                user["phone_verified"] = True
                user["updated_at"] = datetime.utcnow()
                self._memory["users"][user_id] = user
                ok = True
            except Exception as e:
                logger.error(f"Error verifying user phone in memory {user_id}: {e}")
        return ok

    # Email verification OTP operations
    async def create_email_verification_otp(self, user_id: str, email: str, otp_code: str, expires_at: datetime) -> bool:
        """Store an email verification OTP for a user and invalidate previous ones."""
        if self.database is None:
            try:
                # Invalidate existing active memory OTPs for this user/email
                for otp in self._memory["email_otps"]:
                    if otp["user_id"] == user_id and otp["email"] == email and not otp.get("used"):
                        otp["used"] = True
                        otp["invalidated_at"] = datetime.utcnow()
                otp_record = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "email": email,
                    "otp_code": otp_code,
                    "created_at": datetime.utcnow(),
                    "expires_at": expires_at,
                    "used": False,
                    "invalidated_at": None,
                }
                self._memory["email_otps"].append(otp_record)
                return True
            except Exception as e:
                logger.error(f"Error creating email verification OTP in memory: {e}")
                return False

        # Invalidate any existing active OTPs for this user and email
        try:
            await self.database.email_verification_otps.update_many(
                {"user_id": user_id, "email": email, "used": False},
                {"$set": {"used": True, "invalidated_at": datetime.utcnow()}}
            )
        except Exception as e:
            logger.warning(f"Failed to invalidate previous email OTPs for user {user_id}: {e}")

        otp_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "email": email,
            "otp_code": otp_code,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "used": False,
            "invalidated_at": None,
        }

        try:
            await self.database.email_verification_otps.insert_one(otp_record)
            return True
        except Exception as e:
            logger.error(f"Error creating email verification OTP: {e}")
            # Fallback to in-memory store even when DB is present
            try:
                self._memory["email_otps"].append(otp_record)
                return True
            except Exception as e2:
                logger.error(f"Fallback in-memory email OTP failed: {e2}")
                return False

    async def get_active_email_otp(self, user_id: str, email: str, otp_code: str) -> Optional[dict]:
        """Get an active (unused, unexpired) email verification OTP for a user."""
        # Always check memory store first as a fallback
        try:
            now = datetime.utcnow()
            for otp in reversed(self._memory["email_otps"]):
                if (
                    otp["user_id"] == user_id and otp["email"] == email and otp["otp_code"] == otp_code and not otp.get("used") and (not otp.get("expires_at") or otp["expires_at"] > now)
                ):
                    return otp
        except Exception as e:
            logger.error(f"Error retrieving email OTP from memory for user {user_id}: {e}")

        try:
            otp = await self.database.email_verification_otps.find_one({
                "user_id": user_id,
                "email": email,
                "otp_code": otp_code,
                "used": False,
            })
            if not otp:
                return None
            otp["_id"] = str(otp["_id"])
            # Expiration check
            if otp.get("expires_at") and otp["expires_at"] < datetime.utcnow():
                return None
            return otp
        except Exception as e:
            logger.error(f"Error retrieving email verification OTP for user {user_id}: {e}")
            # Fallback: attempt memory store
            try:
                now = datetime.utcnow()
                for otp in reversed(self._memory["email_otps"]):
                    if (
                        otp["user_id"] == user_id and otp["email"] == email and otp["otp_code"] == otp_code and not otp.get("used") and (not otp.get("expires_at") or otp["expires_at"] > now)
                    ):
                        return otp
            except Exception as e2:
                logger.error(f"Error retrieving email OTP from memory (fallback) for user {user_id}: {e2}")
            return None

    async def mark_email_otp_used(self, otp_id: str) -> bool:
        """Mark an email verification OTP as used."""
        updated = False
        # Try DB update
        if self.database is not None:
            try:
                result = await self.database.email_verification_otps.update_one(
                    {"id": otp_id},
                    {"$set": {"used": True, "used_at": datetime.utcnow()}}
                )
                updated = result.modified_count > 0
            except Exception as e:
                logger.error(f"Error marking email OTP used in DB: {e}")
        # Also mark memory record (fallback)
        try:
            for otp in self._memory["email_otps"]:
                if otp["id"] == otp_id:
                    otp["used"] = True
                    otp["used_at"] = datetime.utcnow()
                    updated = True
                    break
        except Exception as e:
            logger.error(f"Error marking email OTP used in memory: {e}")
        return updated

    # Job operations
    async def generate_job_id(self, digits: int = 6) -> str:
        """Generate a unique numeric job ID with fixed length.

        Uses an atomic counter in the `counters` collection to avoid collisions
        under concurrency. Wraps within the available range and skips any
        currently-used IDs by probing forward until a free slot is found.
        """
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot generate job ID")

        max_value = (10 ** digits) - 1

        # Atomically increment counter and get current sequence
        counter = await self.database.counters.find_one_and_update(
            {"_id": "jobs"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )

        seq = int(counter.get("seq", 1))
        # Constrain to range and avoid 0 by starting at 1
        seq = (seq % (max_value + 1)) or 1
        candidate = f"{seq:0{digits}d}"

        # If wrap-around hits an existing ID, probe forward up to the range size
        for _ in range(max_value):
            exists = await self.database.jobs.find_one({"id": candidate})
            if not exists:
                return candidate
            # Move to next sequence value in range
            seq = (seq + 1) % (max_value + 1)
            if seq == 0:
                seq = 1
            candidate = f"{seq:0{digits}d}"

        raise RuntimeError("Unable to generate unique job ID")

    async def generate_user_public_id(self, length: int = 7) -> str:
        """Generate a short, unique public ID for users.

        Uses an atomic counter in the `counters` collection, converts the
        sequence to base36, and probes forward to avoid collisions.
        """
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot generate user public_id")

        # Atomically increment counter and get current sequence
        counter = await self.database.counters.find_one_and_update(
            {"_id": "users_public_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )

        seq = int(counter.get("seq", 1))

        # Base36 conversion
        def to_base36(num: int) -> str:
            chars = "0123456789abcdefghijklmnopqrstuvwxyz"
            if num <= 0:
                return "0"
            s = []
            while num:
                num, rem = divmod(num, 36)
                s.append(chars[rem])
            return "".join(reversed(s))

        candidate = to_base36(seq).rjust(length, "0")[:length].lower()

        # Probe forward until unique
        for _ in range(36 ** length):
            exists = await self.database.users.find_one({"public_id": candidate})
            if not exists:
                return candidate
            seq += 1
            candidate = to_base36(seq).rjust(length, "0")[:length].lower()

        raise RuntimeError("Unable to generate unique user public_id")

    async def generate_user_short_id(self, digits: int = 4) -> str:
        """Generate a unique numeric user_id with fixed length (default 4)."""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot generate user_id")

        max_value = 10 ** digits
        wrap_threshold = max_value * 2

        # Atomically increment counter and get current sequence
        counter = await self.database.counters.find_one_and_update(
            {"_id": "users_short_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )

        seq = int(counter.get("seq", 1))

        # Wrap sequence periodically
        if seq >= wrap_threshold:
            await self.database.counters.update_one({"_id": "users_short_id"}, {"$set": {"seq": 1}})
            seq = 1

        # Probe forward until unique
        for _ in range(max_value):
            candidate_num = seq % max_value
            candidate = f"{candidate_num:0{digits}d}"
            exists = await self.database.users.find_one({"user_id": candidate})
            if not exists:
                return candidate
            seq += 1

        raise RuntimeError("Unable to generate unique user_id")

    async def create_pending_job(self, user_id: str, job_data: dict, expires_at: datetime) -> dict:
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot create pending job")
        await self.database.pending_jobs.update_many(
            {"user_id": user_id, "used": False},
            {"$set": {"used": True, "invalidated_at": datetime.utcnow()}}
        )
        pending = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "job_data": job_data,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "used": False,
            "invalidated_at": None,
        }
        result = await self.database.pending_jobs.insert_one(pending)
        pending["_id"] = str(result.inserted_id)
        return pending

    async def get_pending_job_by_id(self, pending_id: str) -> Optional[dict]:
        """Get pending job by its unique ID"""
        if self.database is None:
            return None
        return await self.database.pending_jobs.find_one({"id": pending_id})

    async def get_pending_job_by_user_id(self, user_id: str) -> Optional[dict]:
        if self.database is None:
            return None
        now = datetime.utcnow()
        doc = await self.database.pending_jobs.find_one(
            {"user_id": user_id, "used": False, "expires_at": {"$gt": now}},
            sort=[("created_at", -1)]
        )
        if not doc:
            return None
        doc["_id"] = str(doc["_id"])
        return doc

    async def mark_pending_job_used(self, pending_id: str) -> bool:
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot mark pending job used")
        result = await self.database.pending_jobs.update_one(
            {"id": pending_id},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def create_job(self, job_data: dict) -> dict:
        # Set expiration date (30 days from now)
        job_data['expires_at'] = datetime.utcnow() + timedelta(days=30)
        result = await self.database.jobs.insert_one(job_data)
        job_data['_id'] = str(result.inserted_id)
        return job_data
    
    async def update_job(self, job_id: str, update_data: dict) -> bool:
        """Update a job by ID"""
        try:
            result = await self.database.jobs.update_one(
                {"id": job_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating job: {e}")
            return False

    async def get_job_by_id(self, job_id: str) -> Optional[dict]:
        job = await self.database.jobs.find_one({"id": job_id})
        if job:
            job['_id'] = str(job['_id'])
        return job

    async def get_jobs(self, skip: int = 0, limit: int = 10, filters: dict = None) -> List[dict]:
        query = filters or {}
        
        # Only return active jobs by default for public queries
        # Don't apply default filters for homeowner's own jobs (My Jobs queries)
        is_homeowner_query = 'homeowner.email' in query or 'homeowner_id' in query
        
        if not is_homeowner_query:
            # For public job listings, only show active and non-expired jobs
            if 'status' not in query:
                query['status'] = 'active'
            query['expires_at'] = {'$gt': datetime.utcnow()}
        
        cursor = self.database.jobs.find(query).sort("created_at", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        for job in jobs:
            job['_id'] = str(job['_id'])
        return jobs

    # ==========================================
    # ADMIN JOB MANAGEMENT METHODS
    # ==========================================

    @time_it
    async def get_all_jobs_admin(self, skip: int = 0, limit: int = 50, status: str = None) -> List[dict]:
        """Get all jobs for admin management with comprehensive details (optimized)"""
        import asyncio
        query = {}
        if status:
            query["status"] = status
        
        # 1. Fetch jobs
        cursor = self.database.jobs.find(query).sort("created_at", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        if not jobs:
            return []

        # 2. Extract IDs for batch fetching
        job_ids = [str(job.get("id")) for job in jobs if job.get("id")]
        homeowner_ids = set()
        for job in jobs:
            h_id = job.get("homeowner_id")
            if not h_id and isinstance(job.get("homeowner"), dict):
                h_id = job["homeowner"].get("id")
            if h_id and h_id != "unknown":
                homeowner_ids.add(h_id)

        # 3. Batch fetch in parallel
        tasks = []
        # Task for users
        if homeowner_ids:
            tasks.append(self.database.users.find({"id": {"$in": list(homeowner_ids)}}).to_list(length=len(homeowner_ids)))
        else:
            async def get_empty_list(): return []
            tasks.append(get_empty_list())
            
        # Task for interests counts
        if job_ids:
            # We use aggregation to get counts for multiple jobs at once
            pipeline = [
                {"$match": {"job_id": {"$in": job_ids}}},
                {"$group": {"_id": "$job_id", "count": {"$sum": 1}}}
            ]
            tasks.append(self.database.interests.aggregate(pipeline).to_list(length=len(job_ids)))
        else:
            tasks.append(get_empty_list())

        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        users_list = results[0] if not isinstance(results[0], Exception) else []
        interests_list = results[1] if not isinstance(results[1], Exception) else []
        
        # 4. Create lookup maps
        users_map = {u["id"]: u for u in users_list if "id" in u}
        interests_map = {item["_id"]: item["count"] for item in interests_list}
        
        # 5. Enrich job data
        final_jobs = []
        for job in jobs:
            job["_id"] = str(job["_id"])
            
            # Use optimized helper for homeowner info
            self._enrich_job_homeowner(job, users_map, interests_map) # Note: interests_map is passed as job_counts_map here as it's what we want to show
            
            # Add interests_count explicitly (even though helper adds it to total_jobs, we want interests_count field)
            job["interests_count"] = interests_map.get(job.get("id"), 0)
            
            # Set default access fees if missing
            if "access_fee_naira" not in job:
                job["access_fee_naira"] = 1000
                job["access_fee_coins"] = 10
                
            final_jobs.append(job)
            
        return final_jobs

    @time_it
    async def get_pending_jobs_admin(self, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get jobs pending admin approval (optimized)"""
        return await self.get_all_jobs_admin(skip=skip, limit=limit, status="pending_approval")

    async def get_pending_jobs_count(self) -> int:
        """Get count of jobs pending approval"""
        return await self.database.jobs.count_documents({"status": "pending_approval"})

    async def update_job_approval_status(self, job_id: str, approval_data: dict) -> bool:
        """Update job approval status with admin details"""
        result = await self.database.jobs.update_one(
            {"id": job_id},
            {"$set": approval_data}
        )
        return result.modified_count > 0

    async def get_job_interests_count(self, job_id: str) -> int:
        """Get count of interests for a specific job"""
        return await self.database.interests.count_documents({"job_id": job_id})

    async def count_homeowner_jobs(self, homeowner_id: str) -> int:
        """Count total jobs posted by a homeowner"""
        return await self.database.jobs.count_documents({"homeowner.id": homeowner_id})

    @time_it
    async def get_jobs_statistics_admin(self) -> dict:
        """Get comprehensive job statistics for admin dashboard (optimized)"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_jobs": {"$sum": 1},
                    "pending_jobs": {"$sum": {"$cond": [{"$eq": ["$status", "pending_approval"]}, 1, 0]}},
                    "active_jobs": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}},
                    "rejected_jobs": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}},
                    "expired_jobs": {"$sum": {"$cond": [{"$eq": ["$status", "expired"]}, 1, 0]}},
                    "completed_jobs": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                    "approved_today": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$eq": ["$status", "active"]},
                                        {"$gte": ["$approved_at", today_start]},
                                        {"$lt": ["$approved_at", today_end]}
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    "rejected_today": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$eq": ["$status", "rejected"]},
                                        {"$gte": ["$approved_at", today_start]},
                                        {"$lt": ["$approved_at", today_end]}
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]
        
        result = await self.database.jobs.aggregate(pipeline).to_list(1)
        
        if result:
            return result[0]
        else:
            return {
                "total_jobs": 0,
                "pending_jobs": 0,
                "active_jobs": 0,
                "rejected_jobs": 0,
                "expired_jobs": 0,
                "completed_jobs": 0,
                "approved_today": 0,
                "rejected_today": 0
            }

    async def get_jobs_count_admin(self, status: str = None) -> int:
        """Get total count of jobs for pagination"""
        query = {}
        if status:
            query["status"] = status
        
        return await self.database.jobs.count_documents(query)

    @time_it
    async def get_job_by_id_admin(self, job_id: str) -> Optional[dict]:
        """Get job details by ID for admin editing (optimized)"""
        import asyncio
        job = await self.database.jobs.find_one({"id": job_id})
        if not job:
            return None
        
        job["_id"] = str(job["_id"])
        
        # Parallel fetch for homeowner, interests, and job counts
        tasks = []
        
        # 1. Homeowner task
        h_id = job.get("homeowner_id")
        if h_id:
            tasks.append(self.database.users.find_one({"id": h_id}))
        else:
            async def get_none(): return None
            tasks.append(get_none())
            
        # 2. Interests task
        tasks.append(self.database.interests.find({"job_id": job["id"]}).to_list(length=100))
        
        # 3. Questions/Answers task
        tasks.append(self.get_job_question_answers(job["id"]))

        # 4. Homeowner total jobs count task
        if h_id:
            tasks.append(self.database.jobs.count_documents({
                "$or": [{"homeowner_id": h_id}, {"homeowner.id": h_id}]
            }))
        else:
            async def get_zero(): return 0
            tasks.append(get_zero())
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        homeowner = results[0] if not isinstance(results[0], Exception) else None
        interests = results[1] if not isinstance(results[1], Exception) else []
        answers = results[2] if not isinstance(results[2], Exception) else []
        homeowner_job_count = results[3] if not isinstance(results[3], Exception) else 0
        
        # Set homeowner info
        if homeowner:
            job["homeowner"] = {
                "id": homeowner["id"],
                "name": homeowner.get("name", "Unknown"),
                "email": homeowner.get("email", ""),
                "phone": homeowner.get("phone", ""),
                "verification_status": homeowner.get("verification_status", "pending"),
                "join_date": homeowner.get("created_at"),
                "total_jobs": homeowner_job_count
            }
        elif "homeowner" in job and isinstance(job["homeowner"], dict):
            # Fallback for embedded homeowner
            h_obj = job["homeowner"]
            job["homeowner"] = {
                "id": h_obj.get("id", "unknown"),
                "name": h_obj.get("name", "Unknown"),
                "email": h_obj.get("email", ""),
                "phone": h_obj.get("phone", ""),
                "verification_status": "unknown",
                "total_jobs": 1
            }
        else:
            job["homeowner"] = {
                "id": h_id or "unknown",
                "name": job.get("homeowner_name", "Unknown"),
                "email": job.get("homeowner_email", ""),
                "phone": job.get("homeowner_phone", ""),
                "verification_status": "unknown",
                "total_jobs": 0
            }
            
        # Set interests count
        job["interests_count"] = len(interests)
        
        # Batch fetch tradespeople for interests
        interested_tradespeople = []
        if interests:
            tradesperson_ids = [i["tradesperson_id"] for i in interests if i.get("tradesperson_id")]
            if tradesperson_ids:
                tradespeople_list = await self.database.users.find({"id": {"$in": tradesperson_ids}}).to_list(length=len(tradesperson_ids))
                tradespeople_map = {u["id"]: u for u in tradespeople_list if "id" in u}
                
                for interest in interests:
                    tp_id = interest.get("tradesperson_id")
                    tp = tradespeople_map.get(tp_id)
                    interested_tradespeople.append({
                        "interest_id": interest["id"],
                        "tradesperson_id": tp_id,
                        "tradesperson_name": tp.get("name", "Unknown") if tp else "Unknown",
                        "tradesperson_email": tp.get("email", "") if tp else "",
                        "status": interest.get("status", "pending"),
                        "created_at": interest.get("created_at")
                    })
        
        job["interested_tradespeople"] = interested_tradespeople
        
        # Set description and answers
        desc_val = job.get("description")
        if not desc_val or not str(desc_val).strip():
            if answers:
                summary = self.compose_job_description_from_answers(answers)
                if summary:
                    job["description"] = summary
        if answers:
            job["question_answers"] = answers
            
        return job

    async def update_job_admin(self, job_id: str, job_data: dict) -> bool:
        """Update job details (admin only)"""
        # Prepare update data
        update_data = {}
        allowed_fields = [
            "title", "description", "category", "location", "state", "lga", 
            "town", "zip_code", "home_address", "timeline", "budget_min", 
            "budget_max", "access_fee_naira", "access_fee_coins", "status"
        ]
        
        for field in allowed_fields:
            if field in job_data:
                update_data[field] = job_data[field]
        
        # Add update timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        if not update_data:
            return False
        
        result = await self.database.jobs.update_one(
            {"id": job_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    async def update_job_status_admin(self, job_id: str, status: str) -> bool:
        """Update job status (admin only)"""
        result = await self.database.jobs.update_one(
            {"id": job_id},
            {"$set": {
                "status": status,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return result.modified_count > 0

    async def soft_delete_job_admin(self, job_id: str) -> bool:
        """Soft delete job (admin only)"""
        result = await self.database.jobs.update_one(
            {"id": job_id},
            {"$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return result.modified_count > 0

    async def delete_job_completely(self, job_id: str) -> dict:
        """Hard-delete a job and all related data from the platform.

        This removes the job document and any related documents that reference
        the job_id across collections such as: job_question_answers, quotes,
        interests, job_applications, conversations, messages, and reviews.
        Returns a dict with delete counts for each collection.
        """
        try:
            # Prepare all delete tasks
            delete_tasks = {
                "jobs": self.database.jobs.delete_one({"id": job_id}),
                "job_question_answers": self.database.job_question_answers.delete_many({"job_id": job_id}),
                "quotes": self.database.quotes.delete_many({"job_id": job_id}),
                "interests": self.database.interests.delete_many({"job_id": job_id}),
                "job_applications": self.database.job_applications.delete_many({"job_id": job_id}),
                "reviews": self.database.reviews.delete_many({"job_id": job_id}),
                "messages": self.database.messages.delete_many({"job_id": job_id}),
                "conversations": self.database.conversations.delete_many({"job_id": job_id}),
                "notifications": self.database.notifications.delete_many({"job_id": job_id}),
            }

            # Run all deletions in parallel
            keys = list(delete_tasks.keys())
            results_list = await asyncio.gather(*[delete_tasks[k] for k in keys], return_exceptions=True)
            
            final_results = {}
            for i, key in enumerate(keys):
                res = results_list[i]
                if isinstance(res, Exception):
                    final_results[f"{key}_deleted"] = 0
                else:
                    final_results[f"{key}_deleted"] = res.deleted_count

            return final_results
        except Exception as e:
            logger.error(f"Error in delete_job_completely for {job_id}: {e}")
            raise

    async def get_jobs_count(self, filters: dict = None) -> int:
        query = filters or {}
        
        # Only return active jobs by default for public queries
        # Don't apply default filters for homeowner's own jobs (My Jobs queries)
        is_homeowner_query = 'homeowner.email' in query or 'homeowner_id' in query
        
        if not is_homeowner_query:
            # For public job listings, only show active and non-expired jobs
            if 'status' not in query:
                query['status'] = 'active'
            query['expires_at'] = {'$gt': datetime.utcnow()}
            
        return await self.database.jobs.count_documents(query)

    async def update_job_quotes_count(self, job_id: str):
        quotes_count = await self.database.quotes.count_documents({"job_id": job_id})
        await self.database.jobs.update_one(
            {"id": job_id},
            {"$set": {"quotes_count": quotes_count, "updated_at": datetime.utcnow()}}
        )

    # Tradesperson operations
    async def create_tradesperson(self, tradesperson_data: dict) -> dict:
        result = await self.database.tradespeople.insert_one(tradesperson_data)
        tradesperson_data['_id'] = str(result.inserted_id)
        return tradesperson_data

    async def get_tradesperson_by_id(self, tradesperson_id: str) -> Optional[dict]:
        tradesperson = await self.database.tradespeople.find_one({"id": tradesperson_id})
        if tradesperson:
            tradesperson['_id'] = str(tradesperson['_id'])
        return tradesperson

    async def get_tradesperson_by_email(self, email: str) -> Optional[dict]:
        tradesperson = await self.database.tradespeople.find_one({"email": email})
        if tradesperson:
            tradesperson['_id'] = str(tradesperson['_id'])
        return tradesperson

    async def get_tradespeople(self, skip: int = 0, limit: int = 10, filters: dict = None) -> List[dict]:
        query = filters or {}
        cursor = self.database.tradespeople.find(query).sort("average_rating", -1).skip(skip).limit(limit)
        tradespeople = await cursor.to_list(length=limit)
        
        for tradesperson in tradespeople:
            tradesperson['_id'] = str(tradesperson['_id'])
        return tradespeople

    async def get_tradespeople_count(self, filters: dict = None) -> int:
        query = filters or {}
        return await self.database.tradespeople.count_documents(query)

    async def update_tradesperson_stats(self, tradesperson_id: str):
        # Calculate average rating
        pipeline = [
            {"$match": {"tradesperson_id": tradesperson_id}},
            {"$group": {
                "_id": None,
                "avg_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }}
        ]
        
        result = await self.database.reviews.aggregate(pipeline).to_list(1)
        
        if result:
            avg_rating = round(result[0]['avg_rating'], 1)
            total_reviews = result[0]['total_reviews']
        else:
            avg_rating = 0.0
            total_reviews = 0

        # Update tradesperson
        await self.database.tradespeople.update_one(
            {"id": tradesperson_id},
            {
                "$set": {
                    "average_rating": avg_rating,
                    "total_reviews": total_reviews,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    # Quote operations
    async def create_quote(self, quote_data: dict) -> dict:
        result = await self.database.quotes.insert_one(quote_data)
        quote_data['_id'] = str(result.inserted_id)
        return quote_data

    async def get_quote_by_id(self, quote_id: str) -> Optional[dict]:
        quote = await self.database.quotes.find_one({"id": quote_id})
        if quote:
            quote['_id'] = str(quote['_id'])
        return quote

    async def get_quotes_by_job(self, job_id: str) -> List[dict]:
        cursor = self.database.quotes.find({"job_id": job_id}).sort("created_at", -1)
        quotes = await cursor.to_list(length=None)
        
        for quote in quotes:
            quote['_id'] = str(quote['_id'])
        return quotes

    async def get_quotes_by_job_id(self, job_id: str) -> List[dict]:
        """Alias for get_quotes_by_job for messaging system compatibility"""
        return await self.get_quotes_by_job(job_id)

    async def get_quotes_with_tradesperson_details(self, job_id: str) -> List[dict]:
        """Get quotes with full tradesperson details"""
        pipeline = [
            {"$match": {"job_id": job_id}},
            {"$lookup": {
                "from": "users",
                "localField": "tradesperson_id",
                "foreignField": "id",
                "as": "tradesperson"
            }},
            {"$unwind": "$tradesperson"},
            {"$sort": {"created_at": -1}},
            {"$project": {
                "id": 1,
                "job_id": 1,
                "tradesperson_id": 1,  # Include tradesperson_id
                "price": 1,
                "message": 1,
                "estimated_duration": 1,
                "start_date": 1,
                "status": 1,
                "created_at": 1,
                "tradesperson": {
                    "id": "$tradesperson.id",
                    "name": "$tradesperson.name",
                    "company_name": "$tradesperson.company_name",
                    "experience_years": "$tradesperson.experience_years",
                    "average_rating": "$tradesperson.average_rating",
                    "total_reviews": "$tradesperson.total_reviews",
                    "trade_categories": "$tradesperson.trade_categories",
                    "location": "$tradesperson.location",
                    "verified_tradesperson": "$tradesperson.verified_tradesperson"
                }
            }}
        ]
        
        quotes = await self.database.quotes.aggregate(pipeline).to_list(None)
        return quotes

    async def get_tradesperson_quotes_with_job_details(self, tradesperson_id: str, filters: dict = None, skip: int = 0, limit: int = 10) -> List[dict]:
        """Get tradesperson's quotes with job details"""
        match_query = {"tradesperson_id": tradesperson_id}
        if filters:
            match_query.update(filters)
        
        pipeline = [
            {"$match": match_query},
            {"$lookup": {
                "from": "jobs",
                "localField": "job_id",
                "foreignField": "id",
                "as": "job"
            }},
            {"$unwind": "$job"},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$project": {
                "id": 1,
                "price": 1,
                "message": 1,
                "estimated_duration": 1,
                "start_date": 1,
                "status": 1,
                "created_at": 1,
                "job": {
                    "id": "$job.id",
                    "title": "$job.title",
                    "category": "$job.category",
                    "location": "$job.location",
                    "status": "$job.status",
                    "homeowner": "$job.homeowner",
                    "budget_min": "$job.budget_min",
                    "budget_max": "$job.budget_max"
                }
            }}
        ]
        
        quotes = await self.database.quotes.aggregate(pipeline).to_list(None)
        return quotes

    async def get_tradesperson_quotes_count(self, tradesperson_id: str, filters: dict = None) -> int:
        match_query = {"tradesperson_id": tradesperson_id}
        if filters:
            match_query.update(filters)
        return await self.database.quotes.count_documents(match_query)

    async def update_quote_status(self, quote_id: str, status: str):
        await self.database.quotes.update_one(
            {"id": quote_id},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )

    async def reject_other_quotes(self, job_id: str, accepted_quote_id: str):
        """Reject all other quotes when one is accepted"""
        await self.database.quotes.update_many(
            {"job_id": job_id, "id": {"$ne": accepted_quote_id}, "status": "pending"},
            {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
        )

    async def get_quote_statistics(self, job_id: str) -> dict:
        """Get statistics for quotes on a job"""
        pipeline = [
            {"$match": {"job_id": job_id}},
            {"$group": {
                "_id": None,
                "total_quotes": {"$sum": 1},
                "pending_quotes": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
                "accepted_quotes": {"$sum": {"$cond": [{"$eq": ["$status", "accepted"]}, 1, 0]}},
                "rejected_quotes": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}},
                "average_price": {"$avg": "$price"},
                "min_price": {"$min": "$price"},
                "max_price": {"$max": "$price"}
            }}
        ]
        
        result = await self.database.quotes.aggregate(pipeline).to_list(1)
        
        if result:
            return {
                "total_quotes": result[0]["total_quotes"],
                "pending_quotes": result[0]["pending_quotes"],
                "accepted_quotes": result[0]["accepted_quotes"],
                "rejected_quotes": result[0]["rejected_quotes"],
                "average_price": result[0]["average_price"] or 0,
                "min_price": result[0]["min_price"] or 0,
                "max_price": result[0]["max_price"] or 0
            }
        else:
            return {
                "total_quotes": 0,
                "pending_quotes": 0,
                "accepted_quotes": 0,
                "rejected_quotes": 0,
                "average_price": 0,
                "min_price": 0,
                "max_price": 0
            }

    async def get_jobs_for_tradesperson(self, tradesperson_id: str, trade_categories: List[str], skip: int = 0, limit: int = 10) -> List[dict]:
        """Get jobs available for a tradesperson to quote on"""
        # Build query for jobs in tradesperson's categories
        match_query = {
            "status": "active",
            "expires_at": {"$gt": datetime.utcnow()}
        }
        
        if trade_categories:
            match_query["category"] = {"$in": trade_categories}
        
        # Get jobs and exclude ones already quoted on
        pipeline = [
            {"$match": match_query},
            {"$lookup": {
                "from": "quotes",
                "let": {"job_id": "$id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {
                            "$and": [
                                {"$eq": ["$job_id", "$$job_id"]},
                                {"$eq": ["$tradesperson_id", tradesperson_id]}
                            ]
                        }
                    }}
                ],
                "as": "existing_quotes"
            }},
            {"$match": {"existing_quotes": {"$size": 0}}},  # Exclude jobs already quoted on
            {"$lookup": {
                "from": "quotes",
                "localField": "id",
                "foreignField": "job_id",
                "as": "all_quotes"
            }},
            {"$addFields": {
                "quotes_count": {"$size": "$all_quotes"}
            }},
            {"$match": {"quotes_count": {"$lt": 5}}},  # Exclude jobs with 5+ quotes
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$project": {
                "id": 1,
                "title": 1,
                "description": 1,
                "category": 1,
                "location": 1,
                "budget_min": 1,
                "budget_max": 1,
                "timeline": 1,
                "created_at": 1,
                "expires_at": 1,
                "quotes_count": 1,
                "homeowner": {
                    "name": "$homeowner.name",
                    "location": "$location"
                }
            }}
        ]
        
        jobs = await self.database.jobs.aggregate(pipeline).to_list(None)
        return jobs

    async def get_available_jobs_count_for_tradesperson(self, tradesperson_id: str, trade_categories: List[str]) -> int:
        """Count available jobs for a tradesperson"""
        match_query = {
            "status": "active",
            "expires_at": {"$gt": datetime.utcnow()}
        }
        
        if trade_categories:
            match_query["category"] = {"$in": trade_categories}
        
        pipeline = [
            {"$match": match_query},
            {"$lookup": {
                "from": "quotes",
                "let": {"job_id": "$id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {
                            "$and": [
                                {"$eq": ["$job_id", "$$job_id"]},
                                {"$eq": ["$tradesperson_id", tradesperson_id]}
                            ]
                        }
                    }}
                ],
                "as": "existing_quotes"
            }},
            {"$match": {"existing_quotes": {"$size": 0}}},
            {"$lookup": {
                "from": "quotes",
                "localField": "id",
                "foreignField": "job_id",
                "as": "all_quotes"
            }},
            {"$addFields": {
                "quotes_count": {"$size": "$all_quotes"}
            }},
            {"$match": {"quotes_count": {"$lt": 5}}},
            {"$count": "total"}
        ]
        
        result = await self.database.jobs.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0

    async def update_job_status(self, job_id: str, status: str):
        """Update job status"""
        await self.database.jobs.update_one(
            {"id": job_id},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )

    async def get_quotes_count_by_job(self, job_id: str) -> int:
        return await self.database.quotes.count_documents({"job_id": job_id})

    # Review operations
    async def create_review(self, review_data: dict) -> dict:
        result = await self.database.reviews.insert_one(review_data)
        review_data['_id'] = str(result.inserted_id)
        return review_data

    async def get_reviews(self, skip: int = 0, limit: int = 10, filters: dict = None) -> List[dict]:
        query = filters or {}
        cursor = self.database.reviews.find(query).sort("created_at", -1).skip(skip).limit(limit)
        reviews = await cursor.to_list(length=limit)
        
        for review in reviews:
            review['_id'] = str(review['_id'])
        return reviews

    async def get_reviews_count(self, filters: dict = None) -> int:
        query = filters or {}
        return await self.database.reviews.count_documents(query)

    async def get_reviews_by_tradesperson(self, tradesperson_id: str, skip: int = 0, limit: int = 10) -> List[dict]:
        cursor = self.database.reviews.find(
            {"tradesperson_id": tradesperson_id}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        reviews = await cursor.to_list(length=limit)
        for review in reviews:
            review['_id'] = str(review['_id'])
        return reviews

    # Statistics operations
    async def get_platform_stats(self) -> dict:
        # If database is not connected, return safe defaults
        if not self.connected or self.database is None:
            try:
                from models.trade_categories import NIGERIAN_TRADE_CATEGORIES
            except Exception:
                NIGERIAN_TRADE_CATEGORIES = []
            custom_data = await self.get_custom_trades()
            custom_trades = custom_data.get("trades", []) if custom_data else []
            total_categories = len(set(NIGERIAN_TRADE_CATEGORIES + custom_trades))
            return {
                "total_tradespeople": 0,
                "total_categories": total_categories,
                "total_reviews": 0,
                "average_rating": 0.0,
                "total_jobs": 0,
                "active_jobs": 0
            }

        # Total tradespeople from users collection
        total_tradespeople = await self.database.users.count_documents({"role": "tradesperson"})
        
        # Total reviews
        total_reviews = await self.database.reviews.count_documents({})
        
        # Average rating
        pipeline = [
            {"$group": {
                "_id": None,
                "avg_rating": {"$avg": "$rating"}
            }}
        ]
        
        result = await self.database.reviews.aggregate(pipeline).to_list(1)
        average_rating = round(result[0]['avg_rating'], 1) if result else 0.0
        
        # Total jobs
        total_jobs = await self.database.jobs.count_documents({})
        
        # Active jobs
        active_jobs = await self.database.jobs.count_documents({
            "status": "active"
        })
        
        # Get total available categories from static trade categories
        try:
            from models.trade_categories import NIGERIAN_TRADE_CATEGORIES
            # Get custom trades from database
            custom_data = await self.get_custom_trades()
            custom_trades = custom_data.get("trades", []) if custom_data else []
            
            # Combine static and custom trades
            all_trades = list(set(NIGERIAN_TRADE_CATEGORIES + custom_trades))
            total_categories = len(all_trades)
        except Exception as e:
            logger.error(f"Error getting categories count: {e}")
            # Fallback: count unique categories from tradespeople
            users_with_categories = await self.database.users.find(
                {"role": "tradesperson", "trade_categories": {"$exists": True, "$ne": None}},
                {"trade_categories": 1}
            ).to_list(length=None)
            
            all_categories = set()
            for user in users_with_categories:
                trade_categories = user.get("trade_categories", [])
                if trade_categories:
                    all_categories.update(trade_categories)
            total_categories = len(all_categories)

        return {
            "total_tradespeople": total_tradespeople,
            "total_categories": total_categories,
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "total_jobs": total_jobs,
            "active_jobs": active_jobs
        }

    # Category operations
    async def get_categories_with_counts(self) -> List[dict]:
        # Prepare friendly display metadata keyed by actual category names stored on users
        # These names align with values in users.trade_categories
        friendly_details = {
            "Building": {
                "title": "Building & Construction",
                "description": "From foundation to roofing, find experienced builders for your construction projects. Quality workmanship guaranteed.",
                "icon": "🏗️",
                "color": "from-orange-400 to-orange-600"
            },
            "Plumbing": {
                "title": "Plumbing & Water Works",
                "description": "Professional plumbers for installations, repairs, and water system maintenance. Available for emergency services.",
                "icon": "🔧",
                "color": "from-indigo-400 to-indigo-600"
            },
            "Electrical Repairs": {
                "title": "Electrical Installation",
                "description": "Certified electricians for wiring, installations, and electrical repairs. Safe and reliable electrical services.",
                "icon": "⚡",
                "color": "from-yellow-400 to-yellow-600"
            },
            "Painting": {
                "title": "Painting & Decorating",
                "description": "Transform your space with professional painters and decorators. Interior and exterior painting services available.",
                "icon": "🎨",
                "color": "from-blue-400 to-blue-600"
            },
            "Plastering/POP": {
                "title": "POP & Ceiling Works",
                "description": "Expert ceiling installation and POP works. Modern designs and professional finishing for your interior spaces.",
                "icon": "🏠",
                "color": "from-purple-400 to-purple-600"
            },
            "Generator Services": {
                "title": "Generator Installation & Repair",
                "description": "Professional generator installation and maintenance services. Reliable power solutions for homes and businesses.",
                "icon": "🔌",
                "color": "from-red-400 to-red-600"
            }
        }

        # If database is not connected, return known categories with zero counts
        if not self.connected or self.database is None:
            return [
                {
                    "name": name,
                    "title": meta.get("title", name),
                    "tradesperson_count": 0,
                    **{k: v for k, v in meta.items() if k in ("description", "icon", "color", "title")}
                }
                for name, meta in friendly_details.items()
            ]

        # Aggregate to count tradespeople by category from users collection
        pipeline = [
            {"$match": {"role": "tradesperson", "trade_categories": {"$exists": True, "$ne": None}}},
            {"$unwind": "$trade_categories"},
            {"$group": {
                "_id": "$trade_categories",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        results = await self.database.users.aggregate(pipeline).to_list(None)

        # Build categories including all found results, with friendly metadata when available
        categories = []
        for result in results:
            category_name = result.get("_id")
            count = result.get("count", 0)
            meta = friendly_details.get(category_name, {})

            # Ensure minimal fields are present even if metadata is missing
            entry = {
                "name": category_name,
                "title": meta.get("title", category_name),
                "tradesperson_count": count,
            }

            # Attach optional presentation fields if available
            for key in ("description", "icon", "color"):
                if key in meta:
                    entry[key] = meta[key]

            categories.append(entry)

        return categories

    async def get_featured_reviews(self, limit: int = 6) -> List[dict]:
        """Get featured reviews for homepage"""
        if not self.connected or self.database is None:
            return []
        # Be lenient: show recent high-rated reviews regardless of legacy/advanced schema
        filters = {
            'rating': {'$gte': 4}
        }
        reviews = await self.get_reviews(limit=limit, filters=filters)

        for review in reviews:
            if '_id' in review:
                review['_id'] = str(review['_id'])

            # Normalize legacy fields
            if 'content' not in review and 'comment' in review:
                review['content'] = review['comment']
            if 'review_type' not in review:
                review['review_type'] = 'homeowner_to_tradesperson'

            # Attach job location when available
            job_id = review.get('job_id')
            if job_id:
                job = await self.get_job_by_id(job_id)
                if job:
                    review['job_location'] = job.get('location', '')

        return reviews

    # Portfolio Management Methods
    async def create_portfolio_item(self, portfolio_data: dict) -> dict:
        """Create a new portfolio item"""
        await self.portfolio_collection.insert_one(portfolio_data)
        return portfolio_data

    async def get_portfolio_item_by_id(self, item_id: str) -> dict:
        """Get portfolio item by ID"""
        return await self.portfolio_collection.find_one({"id": item_id})

    async def get_portfolio_items_by_tradesperson(self, tradesperson_id: str) -> List[dict]:
        """Get all portfolio items for a specific tradesperson"""
        cursor = self.portfolio_collection.find(
            {"tradesperson_id": tradesperson_id}
        ).sort("created_at", -1)
        
        items = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for item in items:
            if '_id' in item:
                item['_id'] = str(item['_id'])
        
        return items

    async def get_public_portfolio_items_by_tradesperson(self, tradesperson_id: str) -> List[dict]:
        """Get public portfolio items for a specific tradesperson"""
        cursor = self.portfolio_collection.find({
            "tradesperson_id": tradesperson_id,
            "is_public": True
        }).sort("created_at", -1)
        
        items = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for item in items:
            if '_id' in item:
                item['_id'] = str(item['_id'])
        
        return items

    async def get_public_portfolio_items(self, category: str = None, limit: int = 20, offset: int = 0) -> List[dict]:
        """Get all public portfolio items with optional filtering"""
        filters = {"is_public": True}
        if category:
            filters["category"] = category
        
        cursor = self.portfolio_collection.find(filters).sort("created_at", -1).skip(offset).limit(limit)
        
        items = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for item in items:
            if '_id' in item:
                item['_id'] = str(item['_id'])
        
        return items

    async def update_portfolio_item(self, item_id: str, update_data: dict) -> dict:
        """Update portfolio item"""
        await self.portfolio_collection.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        return await self.get_portfolio_item_by_id(item_id)

    async def delete_portfolio_item(self, item_id: str) -> bool:
        """Delete portfolio item"""
        result = await self.portfolio_collection.delete_one({"id": item_id})
        return result.deleted_count > 0

    def get_current_time(self):
        """Get current UTC time for timestamps"""
        from datetime import datetime
        return datetime.utcnow()

    # Interest Management Methods (Lead Generation System)
    async def create_interest(self, interest_data: dict) -> dict:
        """Create a new interest record"""
        # Check if tradesperson already showed interest in this job
        existing_interest = await self.interests_collection.find_one({
            "job_id": interest_data["job_id"],
            "tradesperson_id": interest_data["tradesperson_id"]
        })
        
        if existing_interest:
            raise Exception("Already showed interest in this job")
        
        await self.interests_collection.insert_one(interest_data)
        
        # Update job's interests_count
        await self.database.jobs.update_one(
            {"id": interest_data["job_id"]},
            {"$inc": {"interests_count": 1}}
        )
        
        return interest_data

    async def get_job_interested_tradespeople(self, job_id: str) -> List[dict]:
        """Get all tradespeople who showed interest in a job (optimized)"""
        pipeline = [
            {"$match": {"job_id": job_id}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "tradesperson_id",
                    "foreignField": "id",
                    "as": "tradesperson"
                }
            },
            {"$unwind": "$tradesperson"},
            {
                "$project": {
                    "interest_id": "$id",
                    "tradesperson_id": "$tradesperson_id",
                    "tradesperson_name": "$tradesperson.name",
                    "tradesperson_email": "$tradesperson.email",
                    "tradesperson_phone": {"$ifNull": ["$tradesperson.phone", None]},
                    "profile_image": {"$ifNull": ["$tradesperson.profile_image", None]},
                    "company_name": {"$ifNull": ["$tradesperson.company_name", None]},
                    "business_name": {"$ifNull": ["$tradesperson.business_name", None]},
                    "trade_categories": {"$ifNull": ["$tradesperson.trade_categories", []]},
                    "experience_years": {
                        "$convert": {
                            "input": {"$ifNull": ["$tradesperson.experience_years", 0]},
                            "to": "int",
                            "onError": 0,
                            "onNull": 0
                        }
                    },
                    "average_rating": {
                        "$convert": {
                            "input": {"$ifNull": ["$tradesperson.average_rating", 0]},
                            "to": "double",
                            "onError": 0.0,
                            "onNull": 0.0
                        }
                    },
                    "total_reviews": {
                        "$convert": {
                            "input": {"$ifNull": ["$tradesperson.total_reviews", 0]},
                            "to": "int",
                            "onError": 0,
                            "onNull": 0
                        }
                    },
                    "location": {"$ifNull": ["$tradesperson.location", None]},
                    "description": {"$ifNull": ["$tradesperson.description", None]},
                    "certifications": {"$ifNull": ["$tradesperson.certifications", []]},
                    "status": "$status",
                    "created_at": "$created_at",
                    "updated_at": "$updated_at",
                    "contact_shared_at": "$contact_shared_at",
                    "payment_made_at": "$payment_made_at",
                    "access_fee": "$access_fee"
                }
            },
            {"$sort": {"created_at": -1}}
        ]
        
        interested = await self.interests_collection.aggregate(pipeline).to_list(length=None)
        if not interested:
            return []

        # Batch fetch portfolio counts
        tradesperson_ids = [p["tradesperson_id"] for p in interested]
        portfolio_counts_pipeline = [
            {"$match": {"tradesperson_id": {"$in": tradesperson_ids}}},
            {"$group": {"_id": "$tradesperson_id", "count": {"$sum": 1}}}
        ]
        portfolio_counts = await self.database.portfolio.aggregate(portfolio_counts_pipeline).to_list(length=len(tradesperson_ids))
        portfolio_map = {doc["_id"]: doc["count"] for doc in portfolio_counts}

        # Convert ObjectId to string and add portfolio count
        for person in interested:
            if '_id' in person:
                person['_id'] = str(person['_id'])
            
            person["portfolio_count"] = portfolio_map.get(person["tradesperson_id"], 0)
        
        return interested

    async def get_tradesperson_interests(self, tradesperson_id: str) -> List[dict]:
        """Get all interests for a tradesperson"""
        pipeline = [
            {"$match": {"tradesperson_id": tradesperson_id}},
            {
                "$lookup": {
                    "from": "jobs",
                    "localField": "job_id",
                    "foreignField": "id",
                    "as": "job"
                }
            },
            {"$unwind": "$job"},
            {
                "$project": {
                    "id": 1,
                    "job_id": 1,
                    "status": 1,
                    "created_at": 1,
                    "contact_shared_at": 1,
                    "payment_made_at": 1,
                    "job_title": "$job.title",
                    "job_location": "$job.location",
                    "job_status": "$job.status",
                    "homeowner_name": "$job.homeowner.name",
                    "contact_shared": {"$eq": ["$status", "contact_shared"]},
                    "payment_made": {"$eq": ["$status", "paid_access"]},
                    "access_fee_coins": "$job.access_fee_coins",
                    "access_fee_naira": "$job.access_fee_naira"
                }
            },
            {"$sort": {"created_at": -1}}
        ]
        
        interests = await self.interests_collection.aggregate(pipeline).to_list(length=None)
        
        # Convert ObjectId to string and set default access fees
        for interest in interests:
            if '_id' in interest:
                interest['_id'] = str(interest['_id'])
            
            # Set default access fees if not present or null
            if not interest.get("access_fee_naira") or interest.get("access_fee_naira") is None:
                interest["access_fee_naira"] = 1000
            if not interest.get("access_fee_coins") or interest.get("access_fee_coins") is None:
                interest["access_fee_coins"] = 10
        
        return interests

    async def get_contact_details(self, job_id: str, tradesperson_id: str) -> dict:
        """Get homeowner contact details for paid access"""
        # Verify tradesperson has paid access
        interest = await self.interests_collection.find_one({
            "job_id": job_id,
            "tradesperson_id": tradesperson_id,
            "status": "paid_access"
        })
        
        if not interest:
            raise Exception("Access not paid or interest not found")
        
        # Get job and homeowner details
        job = await self.get_job_by_id(job_id)
        if not job:
            raise Exception("Job not found")
        
        homeowner = await self.get_user_by_email(job["homeowner"]["email"])
        if not homeowner:
            raise Exception("Homeowner not found")
        
        return {
            "homeowner_name": homeowner["name"],
            "homeowner_email": homeowner["email"],
            "homeowner_phone": homeowner["phone"],
            "job_title": job["title"],
            "job_description": job["description"],
            "job_location": job["location"],
            "budget_range": f"₦{job.get('budget_min', 0):,} - ₦{job.get('budget_max', 0):,}" if job.get('budget_min') else None
        }

    async def get_interest_by_job_and_tradesperson(self, job_id: str, tradesperson_id: str) -> Optional[dict]:
        """Get interest by job and tradesperson"""
        interest = await self.interests_collection.find_one({
            "job_id": job_id,
            "tradesperson_id": tradesperson_id
        })
        
        if interest:
            interest["id"] = str(interest["_id"])
            del interest["_id"]
        
        return interest

    async def get_interest_by_id(self, interest_id: str) -> Optional[dict]:
        """Get interest by ID"""
        interest = await self.interests_collection.find_one({"id": interest_id})
        
        if interest:
            # Ensure _id is properly converted to string
            interest["_id"] = str(interest["_id"])
        
        return interest

    async def update_interest_status(self, interest_id: str, update_data: dict) -> Optional[dict]:
        """Update interest status and related fields"""
        result = await self.interests_collection.update_one(
            {"id": interest_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_interest_by_id(interest_id)
        
        return None

    @property
    def interests_collection(self):
        """Access to interests collection"""
        return self.database.interests

    @property
    def hiring_status_collection(self):
        """Access to hiring_status collection"""
        return self.database.hiring_status

    # Review Management Methods (Trust & Quality System)
    async def create_review(self, review: Review) -> Review:
        """Create a new review"""
        review_dict = review.dict()
        review_dict["_id"] = review_dict["id"]
        
        await self.reviews_collection.insert_one(review_dict)
        
        # Update user's review summary
        await self._update_user_review_summary(review.reviewee_id)
        
        return review

    async def get_review_by_id(self, review_id: str) -> Optional[Review]:
        """Get review by ID"""
        review_doc = await self.reviews_collection.find_one({"id": review_id})
        if review_doc:
            review_doc["id"] = str(review_doc["_id"])
            del review_doc["_id"]
            return Review(**review_doc)
        return None

    async def get_user_reviews(
        self, 
        user_id: str, 
        review_type: Optional[str] = None,
        page: int = 1, 
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get reviews for a user with pagination"""
        query = {"reviewee_id": user_id, "status": ReviewStatus.PUBLISHED}
        
        if review_type:
            query["review_type"] = review_type
        
        # Get total count
        total = await self.reviews_collection.count_documents(query)
        
        # Get paginated reviews
        skip = (page - 1) * limit
        cursor = self.reviews_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        reviews = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            reviews.append(Review(**doc))
        
        # Calculate average rating
        avg_rating = 0.0
        if reviews:
            avg_rating = sum(review.rating for review in reviews) / len(reviews)
        
        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "average_rating": round(avg_rating, 1)
        }

    async def get_reviews_by_job(self, job_id: str) -> List[Review]:
        """Get all reviews for a specific job"""
        cursor = self.reviews_collection.find(
            {"job_id": job_id, "status": ReviewStatus.PUBLISHED}
        ).sort("created_at", -1)
        
        reviews = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            reviews.append(Review(**doc))
        
        return reviews

    async def get_user_review_summary(self, user_id: str) -> ReviewSummary:
        """Get comprehensive review summary for a user"""
        # Get all published reviews for user
        reviews_cursor = self.reviews_collection.find(
            {"reviewee_id": user_id, "status": ReviewStatus.PUBLISHED}
        ).sort("created_at", -1)
        
        all_reviews = []
        total_rating = 0
        rating_distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        category_totals = {}
        category_counts = {}
        recommend_count = 0
        
        async for doc in reviews_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            review = Review(**doc)
            all_reviews.append(review)
            
            # Calculate rating statistics
            total_rating += review.rating
            rating_distribution[str(review.rating)] += 1
            
            # Calculate category averages
            if review.category_ratings:
                for category, rating in review.category_ratings.items():
                    if category not in category_totals:
                        category_totals[category] = 0
                        category_counts[category] = 0
                    category_totals[category] += rating
                    category_counts[category] += 1
            
            # Count recommendations
            if review.would_recommend:
                recommend_count += 1
        
        # Calculate averages
        total_reviews = len(all_reviews)
        average_rating = (total_rating / total_reviews) if total_reviews > 0 else 0.0
        
        category_averages = {}
        for category, total in category_totals.items():
            category_averages[category] = round(total / category_counts[category], 1)
        
        recommendation_percentage = (recommend_count / total_reviews * 100) if total_reviews > 0 else 0.0
        
        return ReviewSummary(
            total_reviews=total_reviews,
            average_rating=round(average_rating, 1),
            rating_distribution=rating_distribution,
            category_averages=category_averages,
            recent_reviews=all_reviews[:5],  # Last 5 reviews
            recommendation_percentage=round(recommendation_percentage, 1),
            verified_reviews_count=total_reviews  # All reviews are verified after job completion
        )

    async def update_review(self, review_id: str, update_data: Dict[str, Any]) -> Optional[Review]:
        """Update a review"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.reviews_collection.update_one(
            {"id": review_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_review_by_id(review_id)
        return None

    async def add_review_response(self, review_id: str, response: str, responder_id: str) -> Optional[Review]:
        """Add response to a review"""
        update_data = {
            "response": response,
            "response_date": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Verify the responder is the reviewee
        review = await self.get_review_by_id(review_id)
        if not review or review.reviewee_id != responder_id:
            return None
        
        return await self.update_review(review_id, update_data)

    async def mark_review_helpful(self, review_id: str, user_id: str) -> bool:
        """Mark a review as helpful"""
        # Check if user already marked this review
        existing = await self.database.review_helpful.find_one({
            "review_id": review_id,
            "user_id": user_id
        })
        
        if existing:
            return False
        
        # Add helpful record
        await self.database.review_helpful.insert_one({
            "review_id": review_id,
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })
        
        # Increment helpful count
        await self.reviews_collection.update_one(
            {"id": review_id},
            {"$inc": {"helpful_count": 1}}
        )
        
        return True

    async def delete_review(self, review_id: str) -> bool:
        result = await self.reviews_collection.delete_one({"id": review_id})
        return result.deleted_count > 0

    async def get_platform_review_stats(self) -> ReviewStats:
        """Get platform-wide review statistics"""
        # Total reviews
        total_reviews = await self.reviews_collection.count_documents(
            {"status": ReviewStatus.PUBLISHED}
        )
        
        # Rating distribution
        pipeline = [
            {"$match": {"status": ReviewStatus.PUBLISHED}},
            {"$group": {
                "_id": "$rating",
                "count": {"$sum": 1}
            }}
        ]
        
        rating_counts = {}
        total_rating = 0
        async for doc in self.reviews_collection.aggregate(pipeline):
            rating_counts[str(doc["_id"])] = doc["count"]
            total_rating += doc["_id"] * doc["count"]
        
        average_rating = (total_rating / total_reviews) if total_reviews > 0 else 0.0
        
        # Reviews this month
        from datetime import timedelta
        month_ago = datetime.utcnow() - timedelta(days=30)
        reviews_this_month = await self.reviews_collection.count_documents({
            "status": ReviewStatus.PUBLISHED,
            "created_at": {"$gte": month_ago}
        })
        
        # Top rated tradespeople
        top_tradespeople_pipeline = [
            {"$match": {
                "status": ReviewStatus.PUBLISHED,
                "review_type": ReviewType.HOMEOWNER_TO_TRADESPERSON
            }},
            {"$group": {
                "_id": "$reviewee_id",
                "name": {"$first": "$reviewee_name"},
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }},
            {"$match": {"total_reviews": {"$gte": 5}}},
            {"$sort": {"average_rating": -1, "total_reviews": -1}},
            {"$limit": 10}
        ]
        
        top_tradespeople = []
        async for doc in self.reviews_collection.aggregate(top_tradespeople_pipeline):
            top_tradespeople.append({
                "id": doc["_id"],
                "name": doc["name"],
                "average_rating": round(doc["average_rating"], 1),
                "total_reviews": doc["total_reviews"]
            })
        
        # Recent reviews
        recent_cursor = self.reviews_collection.find(
            {"status": ReviewStatus.PUBLISHED}
        ).sort("created_at", -1).limit(10)
        
        recent_reviews = []
        async for doc in recent_cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            recent_reviews.append(Review(**doc))
        
        return ReviewStats(
            total_reviews=total_reviews,
            total_ratings=rating_counts,
            average_platform_rating=round(average_rating, 1),
            reviews_this_month=reviews_this_month,
            top_rated_tradespeople=top_tradespeople,
            top_rated_categories=[],  # TODO: Implement if needed
            recent_reviews=recent_reviews
        )

    async def can_user_review(self, reviewer_id: str, reviewee_id: str, job_id: str) -> bool:
        """Check if user can review another user for a specific job"""
        # Check if review already exists
        existing_review = await self.reviews_collection.find_one({
            "reviewer_id": reviewer_id,
            "reviewee_id": reviewee_id,
            "job_id": job_id
        })
        
        if existing_review:
            return False
        
        # Check if job exists
        job = await self.get_job_by_id(job_id)
        if not job:
            return False
        
        # Check if job is completed
        if job.get("status") != "completed":
            return False
        
        # Check if reviewer is the homeowner who posted the job
        if reviewer_id == job.get("homeowner", {}).get("id"):
            # Homeowner can review any tradesperson for their completed job
            # Check if there's hiring status indicating they hired this tradesperson
            hiring_status = await self.database.hiring_status.find_one({
                "job_id": job_id,
                "homeowner_id": reviewer_id,
                "tradesperson_id": reviewee_id,
                "hired": True
            })
            
            if hiring_status:
                return True
            
            # If no hiring status, fall back to checking interests (for backward compatibility)
            interest = await self.interests_collection.find_one({
                "job_id": job_id,
                "tradesperson_id": reviewee_id,
                "status": {"$in": ["contact_shared", "paid_access"]}
            })
            
            return interest is not None
        
        # For tradesperson reviewing homeowner (less common case)
        if reviewee_id == job.get("homeowner", {}).get("id"):
            # Check if there's hiring status indicating homeowner hired this tradesperson
            hiring_status = await self.database.hiring_status.find_one({
                "job_id": job_id,
                "homeowner_id": reviewee_id,
                "tradesperson_id": reviewer_id,
                "hired": True
            })
            
            if hiring_status:
                return True
            
            # Fall back to interests check
            interest = await self.interests_collection.find_one({
                "job_id": job_id,
                "tradesperson_id": reviewer_id,
                "status": {"$in": ["contact_shared", "paid_access"]}
            })
            
            return interest is not None
        
        return False

    async def _update_user_review_summary(self, user_id: str):
        """Update cached review summary for user (internal method)"""
        summary = await self.get_user_review_summary(user_id)
        
        # Update user profile with review stats
        await self.database.users.update_one(
            {"id": user_id},
            {"$set": {
                "total_reviews": summary.total_reviews,
                "average_rating": summary.average_rating,
                "recommendation_percentage": summary.recommendation_percentage,
                "review_summary_updated_at": datetime.utcnow()
            }}
        )

    async def get_reviews_requiring_moderation(self, limit: int = 50) -> List[Review]:
        """Get reviews that need moderation"""
        cursor = self.reviews_collection.find(
            {"status": {"$in": [ReviewStatus.FLAGGED, ReviewStatus.PENDING]}}
        ).sort("created_at", -1).limit(limit)
        
        reviews = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            reviews.append(Review(**doc))
        
        return reviews

    @property
    def reviews_collection(self):
        """Access to reviews collection"""
        return self.database.reviews

    # Notification Management Methods
    async def create_notification(self, notification: Notification) -> Notification:
        """Create a new notification"""
        notification_dict = notification.dict()
        notification_dict["_id"] = notification_dict["id"]
        
        await self.notifications_collection.insert_one(notification_dict)
        return notification

    async def get_user_notification_preferences(self, user_id: str) -> NotificationPreferences:
        """Get user notification preferences, create defaults if not exist"""
        preferences = await self.notification_preferences_collection.find_one({"user_id": user_id})
        
        if not preferences:
            # Create default preferences
            default_preferences = NotificationPreferences(
                id=str(uuid.uuid4()),
                user_id=user_id
            )
            await self.create_notification_preferences(default_preferences)
            return default_preferences
        
        # Convert MongoDB document to Pydantic model
        preferences["id"] = str(preferences["_id"])
        del preferences["_id"]
        return NotificationPreferences(**preferences)

    async def create_notification_preferences(self, preferences: NotificationPreferences) -> NotificationPreferences:
        """Create notification preferences for a user"""
        preferences_dict = preferences.dict()
        preferences_dict["_id"] = preferences_dict["id"]
        
        await self.notification_preferences_collection.insert_one(preferences_dict)
        return preferences

    async def update_notification_preferences(self, user_id: str, updates: Dict[str, Any]) -> NotificationPreferences:
        """Update user notification preferences"""
        # Add updated timestamp
        updates["updated_at"] = datetime.now(timezone.utc)
        
        await self.notification_preferences_collection.update_one(
            {"user_id": user_id},
            {"$set": updates}
        )
        
        return await self.get_user_notification_preferences(user_id)

    async def get_user_notifications(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Notification]:
        """Get notifications for a user with pagination"""
        cursor = self.notifications_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        notifications = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            notifications.append(Notification(**doc))
        
        return notifications

    async def update_notification_status(self, notification_id: str, status: NotificationStatus, delivered_at: Optional[datetime] = None) -> bool:
        """Update notification delivery status"""
        update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}
        if delivered_at:
            update_data["delivered_at"] = delivered_at
        
        result = await self.notifications_collection.update_one(
            {"_id": notification_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    async def mark_notification_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a specific notification as read for a user"""
        result = await self.notifications_collection.update_one(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"status": "read", "read_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    async def mark_all_notifications_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        result = await self.notifications_collection.update_many(
            {"user_id": user_id, "status": {"$ne": "read"}},
            {"$set": {"status": "read", "read_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count

    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a specific notification for a user"""
        result = await self.notifications_collection.delete_one(
            {"_id": notification_id, "user_id": user_id}
        )
        return result.deleted_count > 0

    async def get_notification_stats(self) -> Dict[str, Any]:
        """Get notification delivery statistics"""
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        status_counts = {}
        async for doc in self.notifications_collection.aggregate(pipeline):
            status_counts[doc["_id"]] = doc["count"]
        
        # Calculate delivery rate
        total_sent = status_counts.get("sent", 0) + status_counts.get("delivered", 0)
        total_attempts = sum(status_counts.values())
        delivery_rate = (total_sent / total_attempts * 100) if total_attempts > 0 else 0
        
        # Get stats by type and channel
        type_pipeline = [
            {
                "$group": {
                    "_id": "$type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        channel_pipeline = [
            {
                "$group": {
                    "_id": "$channel",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        by_type = {}
        async for doc in self.notifications_collection.aggregate(type_pipeline):
            by_type[doc["_id"]] = doc["count"]
        
        by_channel = {}
        async for doc in self.notifications_collection.aggregate(channel_pipeline):
            by_channel[doc["_id"]] = doc["count"]
        
        # Get recent failures
        recent_failures = []
        cursor = self.notifications_collection.find(
            {"status": "failed"}
        ).sort("created_at", -1).limit(10)
        
        async for doc in cursor:
            recent_failures.append({
                "id": str(doc["_id"]),
                "type": doc["type"],
                "channel": doc["channel"],
                "created_at": doc["created_at"],
                "metadata": doc.get("metadata", {})
            })
        
        return {
            "total_sent": total_sent,
            "delivery_rate": round(delivery_rate, 2),
            "by_type": by_type,
            "by_channel": by_channel,
            "recent_failures": recent_failures
        }

    @property
    def notifications_collection(self):
        """Access to notifications collection"""
        return self.database.notifications

    @property
    def notification_preferences_collection(self):
        """Access to notification preferences collection"""
        return self.database.notification_preferences

    # ==========================================
    # WALLET SYSTEM METHODS
    # ==========================================
    
    @property
    def wallets_collection(self):
        """Access to wallets collection"""
        return self.database.wallets
    
    @property
    def wallet_transactions_collection(self):
        """Access to wallet transactions collection"""
        return self.database.wallet_transactions

    async def get_wallet_transaction_by_proof_image(self, proof_filename: str) -> Optional[dict]:
        """Lookup a wallet transaction by its proof image filename"""
        try:
            txn = await self.wallet_transactions_collection.find_one({"proof_image": proof_filename})
            if txn:
                txn["_id"] = str(txn.get("_id")) if txn.get("_id") else None
            return txn
        except Exception:
            return None

    async def create_wallet(self, user_id: str) -> dict:
        """Create a new wallet for user"""
        wallet_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "balance_coins": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Check if wallet already exists
        existing = await self.wallets_collection.find_one({"user_id": user_id})
        if existing:
            return existing
            
        await self.wallets_collection.insert_one(wallet_data)
        return wallet_data

    async def get_wallet_by_user_id(self, user_id: str) -> Optional[dict]:
        """Get wallet by user ID"""
        wallet = await self.wallets_collection.find_one({"user_id": user_id})
        if not wallet:
            # Create wallet if it doesn't exist
            wallet = await self.create_wallet(user_id)
        return wallet

    async def update_wallet_balance(self, user_id: str, coins_change: int) -> bool:
        """Update wallet balance (positive to add, negative to deduct)"""
        result = await self.wallets_collection.update_one(
            {"user_id": user_id},
            {
                "$inc": {"balance_coins": coins_change},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return result.modified_count > 0

    async def create_wallet_transaction(self, transaction_data: dict) -> dict:
        """Create a new wallet transaction"""
        transaction_data["id"] = str(uuid.uuid4())
        transaction_data["created_at"] = datetime.utcnow()
        
        await self.wallet_transactions_collection.insert_one(transaction_data)
        return transaction_data

    async def get_wallet_transactions(self, user_id: str, skip: int = 0, limit: int = 10) -> List[dict]:
        """Get wallet transactions for user"""
        cursor = self.wallet_transactions_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        transactions = []
        async for transaction in cursor:
            transaction["_id"] = str(transaction["_id"])
            transactions.append(transaction)
        
        return transactions

    @time_it
    async def get_admin_dashboard_stats(self) -> dict:
        """Get comprehensive admin dashboard statistics using optimized aggregations"""
        import asyncio
        
        # 1. Wallet stats: Pending requests count and total amounts
        wallet_pipeline = [
            {"$match": {"transaction_type": "wallet_funding", "status": "pending"}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "total_naira": {"$sum": "$amount_naira"},
                "total_coins": {"$sum": "$amount_coins"}
            }}
        ]
        
        # 2. Job stats: Total jobs and total interests
        job_pipeline = [
            {"$group": {
                "_id": None,
                "total_jobs": {"$sum": 1},
                "total_interests": {"$sum": {"$ifNull": ["$interests_count", 0]}},
                "total_access_fee_naira": {"$sum": {"$ifNull": ["$access_fee_naira", 1500]}}
            }}
        ]
        
        # 3. Verification stats: Pending counts from both collections
        tasks = [
            self.wallet_transactions_collection.aggregate(wallet_pipeline).to_list(length=1),
            self.database.jobs.aggregate(job_pipeline).to_list(length=1),
            self.user_verifications_collection.count_documents({"status": "pending"}),
            self.tradespeople_verifications_collection.count_documents({"status": "pending"})
        ]
        
        results = await asyncio.gather(*tasks)
        
        wallet_res = results[0][0] if results[0] else {"count": 0, "total_naira": 0, "total_coins": 0}
        job_res = results[1][0] if results[1] else {"total_jobs": 0, "total_interests": 0, "total_access_fee_naira": 0}
        pending_verifications_count = results[2]
        pending_trades_verifications_count = results[3]
        
        avg_access_fee = job_res["total_access_fee_naira"] / job_res["total_jobs"] if job_res["total_jobs"] > 0 else 1500
        
        return {
            "wallet_stats": {
                "pending_funding_requests": wallet_res["count"],
                "total_pending_amount_naira": wallet_res["total_naira"],
                "total_pending_amount_coins": wallet_res["total_coins"]
            },
            "job_stats": {
                "total_jobs": job_res["total_jobs"],
                "total_interests": job_res["total_interests"],
                "average_access_fee_naira": round(avg_access_fee, 0),
                "average_access_fee_coins": round(avg_access_fee / 100, 0)
            },
            "verification_stats": {
                "pending_verifications": pending_verifications_count,
                "pending_tradespeople_verifications": pending_trades_verifications_count
            },
            "system_stats": {
                "coin_conversion_rate": "1 coin = ₦100",
                "max_access_fee": "₦10,000 (100 coins)",
                "min_funding_amount": "Any positive amount",
                "referral_reward": "5 coins per verified referral"
            }
        }

    async def get_pending_funding_requests(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get pending wallet funding requests for admin (optimized)"""
        cursor = self.wallet_transactions_collection.find({
            "transaction_type": "wallet_funding",
            "status": "pending"
        }).sort("created_at", -1).skip(skip).limit(limit)
        
        requests = await cursor.to_list(length=limit)
        if not requests:
            return []

        # Batch fetch user details
        user_ids = list(set(r["user_id"] for r in requests if "user_id" in r))
        users = await self.database.users.find({"id": {"$in": user_ids}}).to_list(length=len(user_ids))
        user_map = {u["id"]: u for u in users}

        for request in requests:
            request["_id"] = str(request["_id"])
            user = user_map.get(request.get("user_id"))
            if user:
                request["user_name"] = user.get("name", "Unknown")
                request["user_email"] = user.get("email", "Unknown")
            else:
                request["user_name"] = "Unknown"
                request["user_email"] = "Unknown"
        
        return requests

    async def confirm_wallet_funding(self, transaction_id: str, admin_id: str, admin_notes: str = "") -> bool:
        """Confirm wallet funding request"""
        # Get transaction
        transaction = await self.wallet_transactions_collection.find_one({"id": transaction_id})
        if not transaction or transaction["status"] != "pending":
            return False
        
        # Update transaction status
        result = await self.wallet_transactions_collection.update_one(
            {"id": transaction_id},
            {
                "$set": {
                    "status": "confirmed",
                    "processed_by": admin_id,
                    "admin_notes": admin_notes,
                    "processed_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            # Add coins to wallet
            coins_to_add = transaction["amount_coins"]
            await self.update_wallet_balance(transaction["user_id"], coins_to_add)
            return True
        
        return False

    async def reject_wallet_funding(self, transaction_id: str, admin_id: str, admin_notes: str = "") -> bool:
        """Reject wallet funding request"""
        result = await self.wallet_transactions_collection.update_one(
            {"id": transaction_id, "status": "pending"},
            {
                "$set": {
                    "status": "rejected",
                    "processed_by": admin_id,
                    "admin_notes": admin_notes,
                    "processed_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    async def deduct_access_fee(self, user_id: str, job_id: str, access_fee_coins: int) -> bool:
        """Deduct access fee from wallet and create transaction record"""
        # Check wallet balance
        wallet = await self.get_wallet_by_user_id(user_id)
        if wallet["balance_coins"] < access_fee_coins:
            return False
        
        # Deduct coins
        success = await self.update_wallet_balance(user_id, -access_fee_coins)
        if not success:
            return False
        
        # Create transaction record
        transaction_data = {
            "wallet_id": wallet["id"],
            "user_id": user_id,
            "transaction_type": "access_fee_deduction",
            "amount_coins": access_fee_coins,
            "amount_naira": access_fee_coins * 100,  # Convert to naira
            "status": "confirmed",
            "description": f"Access fee for job contact details",
            "reference": job_id,
            "processed_at": datetime.utcnow()
        }
        
        await self.create_wallet_transaction(transaction_data)
        return True

    # ==========================================
    # JOB ACCESS FEE METHODS  
    # ==========================================
    
    async def update_job_access_fee(self, job_id: str, access_fee_naira: int) -> bool:
        """Update job access fee (admin only)"""
        access_fee_coins = access_fee_naira // 100  # Convert to coins
        
        result = await self.database.jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "access_fee_naira": access_fee_naira,
                    "access_fee_coins": access_fee_coins,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    @time_it
    async def get_jobs_with_access_fees(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get all jobs with access fees for admin management (optimized)"""
        import asyncio
        cursor = self.database.jobs.find({}).sort("created_at", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        if not jobs:
            return []

        # Extract IDs for batch fetching
        homeowner_ids = set()
        for job in jobs:
            h_id = job.get("homeowner_id")
            if not h_id and isinstance(job.get("homeowner"), dict):
                h_id = job["homeowner"].get("id")
            if h_id and h_id != "unknown":
                homeowner_ids.add(h_id)

        # Batch fetch users and their job counts
        users_map = {}
        homeowner_job_counts = {}
        
        if homeowner_ids:
            # Fetch users and job counts in parallel
            tasks = [
                self.database.users.find({"id": {"$in": list(homeowner_ids)}}).to_list(length=len(homeowner_ids)),
                self.database.jobs.aggregate([
                    {"$match": {
                        "$or": [
                            {"homeowner_id": {"$in": list(homeowner_ids)}},
                            {"homeowner.id": {"$in": list(homeowner_ids)}}
                        ]
                    }},
                    {"$group": {
                        "_id": {"$ifNull": ["$homeowner_id", "$homeowner.id"]},
                        "count": {"$sum": 1}
                    }}
                ]).to_list(length=len(homeowner_ids))
            ]
            
            results = await asyncio.gather(*tasks)
            users_list = results[0]
            counts_list = results[1]
            
            users_map = {u["id"]: u for u in users_list if "id" in u}
            homeowner_job_counts = {str(item["_id"]): item["count"] for item in counts_list if item["_id"]}

        final_jobs = []
        for job in jobs:
            job["_id"] = str(job["_id"])
            
            # Use optimized helper for homeowner info
            self._enrich_job_homeowner(job, users_map, homeowner_job_counts)
            
            # Default access fees if missing
            if "access_fee_naira" not in job:
                job["access_fee_naira"] = 1500
                job["access_fee_coins"] = 15
                
            final_jobs.append(job)
            
        return final_jobs

    def _enrich_job_homeowner(self, job: dict, users_map: dict, job_counts_map: dict = None) -> dict:
        """Helper to enrich job with homeowner information from lookup map"""
        h_id = job.get("homeowner_id")
        if not h_id and isinstance(job.get("homeowner"), dict):
            h_id = job["homeowner"].get("id")
            
        homeowner_info = None
        if h_id and h_id in users_map:
            user = users_map[h_id]
            homeowner_info = {
                "id": user["id"],
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "phone": user.get("phone", ""),
                "verification_status": user.get("verification_status", "pending"),
                "join_date": user.get("created_at"),
                "total_jobs": job_counts_map.get(h_id, 0) if job_counts_map else 0
            }
        elif "homeowner" in job and isinstance(job["homeowner"], dict):
            h_obj = job["homeowner"]
            h_id_val = str(h_obj.get("id", "unknown"))
            homeowner_info = {
                "id": h_obj.get("id", "unknown"),
                "name": h_obj.get("name", "Unknown"),
                "email": h_obj.get("email", ""),
                "phone": h_obj.get("phone", ""),
                "verification_status": "unknown",
                "total_jobs": job_counts_map.get(h_id_val, 0) if job_counts_map else 0
            }
        else:
            homeowner_info = {
                "id": h_id or "unknown",
                "name": job.get("homeowner_name", "Unknown"),
                "email": job.get("homeowner_email", ""),
                "phone": job.get("homeowner_phone", ""),
                "verification_status": "unknown",
                "total_jobs": 0
            }
        
        job["homeowner"] = homeowner_info
        return job

    # ==========================================
    # LOCATION-BASED METHODS
    # ==========================================
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula (in kilometers)"""
        import math
        
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of Earth in kilometers
        r = 6371
        
        return c * r

    # ------------------------------------------
    # Fallback geocoding from location text
    # ------------------------------------------
    def _normalize_text(self, s: Optional[str]) -> str:
        t = (s or "").lower()
        # Replace non-alphanumeric with spaces, collapse spaces
        cleaned = "".join(ch if (ch.isalnum() or ch.isspace()) else " " for ch in t)
        return " ".join(cleaned.split())

    async def resolve_coordinates_from_text(self, text: Optional[str]) -> Optional[Dict[str, float]]:
        """Resolve coordinates from text using hardcoded fallback or geocoding service"""
        if not text:
            return None
        t = self._normalize_text(text)
        
        # Combined hardcoded coordinates for common Nigerian locations (Performance Fallback)
        location_map: Dict[str, tuple] = {
            "lagos": (6.5244, 3.3792), "ikeja": (6.6018, 3.3515), "lekki": (6.4429, 3.4833),
            "victoria island": (6.4281, 3.4219), "ajah": (6.4667, 3.6000), "surulere": (6.4940, 3.3490),
            "yaba": (6.5170, 3.3830), "abuja": (9.0765, 7.3986), "fct": (9.0765, 7.3986),
            "gwagwalada": (8.9440, 7.0900), "ibadan": (7.3775, 3.9470), "oyo": (7.3775, 3.9470),
            "benin": (6.3350, 5.6037), "edo": (6.3350, 5.6037), "enugu": (6.5249, 7.5170),
            "calabar": (4.9689, 8.3300), "cross river": (4.9689, 8.3300), "asaba": (6.2019, 6.7319),
            "delta": (6.2019, 6.7319), "warri": (5.5540, 5.7930), "uyo": (5.0333, 7.9330),
            "port harcourt": (4.8156, 7.0498), "ph": (4.8156, 7.0498), "rivers": (4.8156, 7.0498),
            "jos": (9.8965, 8.8580), "plateau": (9.8965, 8.8580), "kaduna": (10.5060, 7.4273),
            "kano": (12.0000, 8.5167), "ilorin": (8.4799, 4.5418), "kwara": (8.4799, 4.5418),
            "owerri": (5.4836, 7.0333), "imo": (5.4836, 7.0333), "aba": (5.1066, 7.3667),
            "abia": (5.1066, 7.3667), "onitsha": (6.1498, 6.7850), "anambra": (6.1498, 6.7850),
            "bayelsa": (4.9247, 6.2649)
        }

        # Check for matches in text
        for key, (lat, lng) in location_map.items():
            if key in t:
                return {"latitude": lat, "longitude": lng}
                
        # If no hardcoded match, use geocoding service
        return await self.geocode_location_text(text)

    async def geocode_location_text(self, text: str) -> Optional[Dict[str, float]]:
        if not text:
            return None
        key = self._normalize_text(text)
        now = datetime.utcnow()
        ttl = self._geo_rate.get("ttl_days", 7)
        cached = self._geo_cache.get(key)
        if cached:
            ts = cached.get("ts")
            if ts and now - ts < timedelta(days=int(ttl)):
                return {
                    "latitude": float(cached.get("lat")),
                    "longitude": float(cached.get("lng")),
                }
        win_start = self._geo_rate.get("window_start")
        window_seconds = int(self._geo_rate.get("window_seconds", 60))
        limit = int(self._geo_rate.get("limit", 30))
        if not win_start or (now - win_start).total_seconds() >= window_seconds:
            self._geo_rate["window_start"] = now
            self._geo_rate["count"] = 0
        if int(self._geo_rate.get("count", 0)) >= limit:
            return None
        self._geo_rate["count"] = int(self._geo_rate.get("count", 0)) + 1
        try:
            import httpx
            params = {
                "q": text,
                "format": "json",
                "limit": 1,
                "countrycodes": "ng",
            }
            headers = {"User-Agent": os.getenv("GEOCODER_UA", "ServiceHub/1.0")}
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params=params,
                    headers=headers,
                )
                if r.status_code == 200:
                    data = r.json()
                    if isinstance(data, list) and data:
                        item = data[0]
                        lat = float(item.get("lat"))
                        lng = float(item.get("lon"))
                        self._geo_cache[key] = {"lat": lat, "lng": lng, "ts": now}
                        return {"latitude": lat, "longitude": lng}
        except Exception:
            return None
        return None

    async def resolve_coordinates_from_entity(self, entity: Dict[str, Any]) -> Optional[Dict[str, float]]:
        try:
            jlat = entity.get("latitude")
            jlng = entity.get("longitude")
            if jlat is not None and jlng is not None:
                return {"latitude": float(jlat), "longitude": float(jlng)}
            for field in ("location", "city", "state", "address", "address_text"):
                v = entity.get(field)
                coords = await self.resolve_coordinates_from_text(v)
                if coords:
                    return coords
        except Exception:
            pass
        return None

    async def get_jobs_near_location(self, latitude: float, longitude: float, max_distance_km: int = 25, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get jobs within specified distance from a location"""
        # Get all active jobs with location data
        cursor = self.database.jobs.find({
            "status": "active",
            "latitude": {"$exists": True, "$ne": None},
            "longitude": {"$exists": True, "$ne": None}
        }).skip(skip).limit(limit * 3)  # Get more to allow for distance filtering
        
        raw_jobs = await cursor.to_list(length=None)
        jobs_with_distance = []
        
        async def process_job(job):
            job["_id"] = str(job["_id"])
            
            # Calculate distance
            distance = self.calculate_distance(
                latitude, longitude,
                job["latitude"], job["longitude"]
            )
            
            # Only include jobs within max distance
            if distance <= max_distance_km:
                job["distance_km"] = round(distance, 1)
                return job
            return None

        # Process in parallel
        tasks = [process_job(job) for job in raw_jobs]
        results = await asyncio.gather(*tasks)
        jobs_with_distance = [j for j in results if j is not None]
        
        # Sort by distance (closest first)
        jobs_with_distance.sort(key=lambda x: x["distance_km"])
        
        # Limit to requested number
        return jobs_with_distance[:limit]

    async def update_user_location(self, user_id: str, latitude: float, longitude: float, travel_distance_km: int = None) -> bool:
        """Update user's location and travel distance"""
        update_data = {
            "latitude": latitude,
            "longitude": longitude,
            "updated_at": datetime.utcnow()
        }
        
        if travel_distance_km is not None:
            update_data["travel_distance_km"] = travel_distance_km
        
        result = await self.users_collection.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    async def update_job_location(self, job_id: str, latitude: float, longitude: float) -> bool:
        """Update job location coordinates"""
        result = await self.database.jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0

    async def get_available_jobs(self, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get all available (active) jobs"""
        return await self.get_jobs(skip=skip, limit=limit, filters={"status": "active"})

    async def get_jobs_for_tradesperson(self, tradesperson_id: str, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get jobs filtered by tradesperson's skills and location preferences"""
        try:
            # Get tradesperson details
            tradesperson = await self.get_user_by_id(tradesperson_id)
            if not tradesperson:
                # Fallback to all jobs if tradesperson not found
                return await self.get_available_jobs(skip=skip, limit=limit)
            
            # Build the job filter based on tradesperson profile
            job_filter = {"status": "active"}
            
            # 1. SKILLS FILTERING - Only show jobs matching tradesperson's trade categories
            tradesperson_categories = tradesperson.get("trade_categories", [])
            # Also include profession in skills matching if it exists
            profession = tradesperson.get("profession")
            if profession and profession not in tradesperson_categories:
                tradesperson_categories = list(tradesperson_categories) + [profession]
            
            if tradesperson_categories:
                # Case-insensitive partial matching for trade categories and job titles
                # This ensures jobs like "Home Plumbing" match "Plumbing" skills
                category_regex_patterns = []
                for category in tradesperson_categories:
                    # Escape category for safe regex matching
                    safe_category = re.escape(category)
                    pattern = {"$regex": safe_category, "$options": "i"}
                    category_regex_patterns.append({"category": pattern})
                    category_regex_patterns.append({"title": pattern})
                
                job_filter["$or"] = category_regex_patterns
                print(f"Skills filter applied (partial match + titles): {tradesperson_categories}")
            
            # 2. LOCATION FILTERING - Show jobs within tradesperson's travel distance
            if (tradesperson.get("latitude") is not None and 
                tradesperson.get("longitude") is not None):
                
                max_distance = tradesperson.get("travel_distance_km", 25)  # Default 25km
                print(f"Location filter applied: {max_distance}km radius")
                
                # Use location-based filtering with skills filtering
                return await self.get_jobs_near_location_with_skills(
                    latitude=tradesperson["latitude"],
                    longitude=tradesperson["longitude"],
                    max_distance_km=max_distance,
                    skill_categories=tradesperson_categories,
                    skip=skip,
                    limit=limit
                )
            else:
                # No location data, use skills-only filtering
                print("Using skills-only filtering (no location data)")
                cursor = self.database.jobs.find(job_filter).sort("created_at", -1).skip(skip).limit(limit)
                jobs = await cursor.to_list(length=None)
                
                # Process and enrich jobs data in parallel
                tasks = [self._process_job_data(job) for job in jobs]
                processed_jobs = await asyncio.gather(*tasks)
                
                return processed_jobs
                
        except Exception as e:
            print(f"Error in get_jobs_for_tradesperson: {str(e)}")
            # Fallback to general available jobs
            return await self.get_available_jobs(skip=skip, limit=limit)

    async def get_jobs_near_location_with_skills(self, latitude: float, longitude: float, 
                                               max_distance_km: float, skill_categories: List[str],
                                               skip: int = 0, limit: int = 50) -> List[dict]:
        """Get jobs near location matching skills, including jobs without coordinates (optimized)."""
        try:
            # Build skills filter (case-insensitive partial match for category and title)
            skills_filter = {}
            if skill_categories:
                category_regex_patterns = []
                for category in skill_categories:
                    # Escape category for safe regex matching
                    safe_category = re.escape(category)
                    pattern = {"$regex": safe_category, "$options": "i"}
                    category_regex_patterns.append({"category": pattern})
                    category_regex_patterns.append({"title": pattern})
                skills_filter["$or"] = category_regex_patterns

            # Base filter: active jobs only
            base_filter = {"status": "active"}

            # Combine filters
            combined_filter = {"$and": [base_filter, skills_filter]} if skills_filter else base_filter

            # Use aggregation for efficiency: filter, then process distance
            # Increased fetch_limit to 500 to ensure we don't miss nearby jobs among many skill matches
            fetch_limit = max(limit * 5 + skip, 500) 
            
            cursor = (
                self.database.jobs
                .find(combined_filter)
                .sort("created_at", -1)
                .limit(fetch_limit)
            )
            raw_jobs = await cursor.to_list(length=None)

            jobs_within_distance: List[Dict[str, Any]] = []
            jobs_without_coords: List[Dict[str, Any]] = []

            async def process_job(job):
                job["_id"] = str(job["_id"])
                jlat = job.get("latitude")
                jlng = job.get("longitude")
                
                dist = None
                if jlat is not None and jlng is not None:
                    try:
                        dist = self.calculate_distance(latitude, longitude, float(jlat), float(jlng))
                    except (ValueError, TypeError):
                        pass
                
                if dist is not None:
                    if dist <= float(max_distance_km):
                        job["distance_km"] = round(dist, 2)
                        return ("within", job)
                else:
                    # Fallback coordinate resolution
                    fallback = await self.resolve_coordinates_from_entity(job)
                    if fallback:
                        try:
                            dist = self.calculate_distance(latitude, longitude, fallback["latitude"], fallback["longitude"])
                            if dist <= float(max_distance_km):
                                job["distance_km"] = round(dist, 2)
                                return ("within", job)
                        except (ValueError, TypeError):
                            pass
                    
                    job["distance_km"] = None
                    return ("without", job)
                return (None, None)

            # Process jobs in parallel
            tasks = [process_job(job) for job in raw_jobs]
            results = await asyncio.gather(*tasks)

            for status, job in results:
                if status == "within":
                    jobs_within_distance.append(job)
                elif status == "without":
                    jobs_without_coords.append(job)

            # Sort: closest first, then most recent for no-coordinate jobs
            jobs_within_distance.sort(key=lambda x: x.get("distance_km", float("inf")))
            # jobs_without_coords already sorted by created_at desc from find()

            combined = jobs_within_distance + jobs_without_coords
            return combined[skip : skip + limit]

        except Exception as e:
            logger.error(f"Error in get_jobs_near_location_with_skills: {e}")
            return []

    @time_it
    async def search_jobs_with_location(
        self,
        search_query: Optional[str] = None,
        category: Optional[str] = None,
        user_latitude: Optional[float] = None,
        user_longitude: Optional[float] = None,
        max_distance_km: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[dict]:
        """Search active, non-expired jobs with optional text/category filters and optional location radius (optimized)."""
        try:
            # Base filter: public active jobs that haven't expired
            base_filter: Dict[str, Any] = {
                "status": "active",
                "expires_at": {"$gt": datetime.utcnow()},
            }

            # Text search on title/description
            if search_query:
                base_filter["$or"] = [
                    {"title": {"$regex": search_query, "$options": "i"}},
                    {"description": {"$regex": search_query, "$options": "i"}},
                ]

            # Category filter (case-insensitive exact match)
            if category:
                base_filter["category"] = {"$regex": f"^{category}$", "$options": "i"}

            use_location = (user_latitude is not None and user_longitude is not None)

            # Location-aware search
            if use_location:
                radius_km = max_distance_km if (isinstance(max_distance_km, (int, float)) and max_distance_km is not None) else 25
                fetch_limit = max(limit * 3 + skip, 150)
                
                cursor = (
                    self.database.jobs
                    .find(base_filter)
                    .sort("created_at", -1)
                    .limit(fetch_limit)
                )
                raw_jobs = await cursor.to_list(length=None)

                jobs_within_distance: List[Dict[str, Any]] = []
                jobs_without_coords: List[Dict[str, Any]] = []

                async def process_job(job):
                    job["_id"] = str(job["_id"])
                    jlat = job.get("latitude")
                    jlng = job.get("longitude")
                    
                    dist = None
                    if jlat is not None and jlng is not None:
                        try:
                            dist = self.calculate_distance(user_latitude, user_longitude, float(jlat), float(jlng))
                        except (ValueError, TypeError):
                            pass
                    
                    if dist is not None:
                        if dist <= float(radius_km):
                            job["distance_km"] = round(dist, 2)
                            return ("within", job)
                    else:
                        fallback = await self.resolve_coordinates_from_entity(job)
                        if fallback:
                            try:
                                dist = self.calculate_distance(user_latitude, user_longitude, fallback["latitude"], fallback["longitude"])
                                if dist <= float(radius_km):
                                    job["distance_km"] = round(dist, 2)
                                    return ("within", job)
                            except (ValueError, TypeError):
                                pass
                        
                        job["distance_km"] = None
                        return ("without", job)
                    return (None, None)

                # Process jobs in parallel
                tasks = [process_job(job) for job in raw_jobs]
                results = await asyncio.gather(*tasks)

                for status, job in results:
                    if status == "within":
                        jobs_within_distance.append(job)
                    elif status == "without":
                        jobs_without_coords.append(job)

                # Sort and paginate combined results
                jobs_within_distance.sort(key=lambda x: x.get("distance_km", float("inf")))
                combined = jobs_within_distance + jobs_without_coords
                return combined[skip : skip + limit]
            else:
                # No location, just fetch and paginate
                cursor = (
                    self.database.jobs
                    .find(base_filter)
                    .sort("created_at", -1)
                    .skip(skip)
                    .limit(limit)
                )
                results = await cursor.to_list(length=None)
                for job in results:
                    job["_id"] = str(job["_id"])
                    job["distance_km"] = None
                return results

        except Exception as e:
            logger.error(f"Error in search_jobs_with_location: {e}")
            return []

    @time_it
    async def _process_job_data(self, job: dict) -> dict:
        """Process and enrich job data with additional information"""
        try:
            # Convert ObjectId to string
            if "_id" in job:
                job["_id"] = str(job["_id"])
            
            # Add any additional processing here if needed
            # For example: enrich with homeowner info, interests count, etc.
            
            return job
        except Exception as e:
            print(f"Error processing job data: {str(e)}")
            return job

    # ==========================================
    # REFERRAL SYSTEM METHODS
    # ==========================================
    
    @property
    def referrals_collection(self):
        """Access to referrals collection"""
        if self.database is None:
            raise RuntimeError("Database unavailable: referrals collection not accessible")
        return self.database.referrals
    
    @property
    def user_verifications_collection(self):
        """Access to user verifications collection"""
        if self.database is None:
            raise RuntimeError("Database unavailable: user verifications collection not accessible")
        return self.database.user_verifications
    
    @property
    def referral_codes_collection(self):
        """Access to referral codes collection"""
        if self.database is None:
            raise RuntimeError("Database unavailable: referral codes collection not accessible")
        return self.database.referral_codes

    @property
    def tradespeople_verifications_collection(self):
        """Access to tradespeople references verifications collection"""
        if self.database is None:
            raise RuntimeError("Database unavailable: tradespeople verifications collection not accessible")
        return self.database.tradespeople_verifications

    async def generate_referral_code(self, user_id: str) -> str:
        """Generate unique referral code for user"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot generate referral code")
        # Get user info for code generation
        user = await self.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Generate code based on name + random numbers
        base_name = user["name"].split()[0].upper()[:4]  # First 4 letters of first name
        
        # Find unique code
        import random
        for _ in range(10):  # Try 10 times
            random_num = random.randint(1000, 9999)
            code = f"{base_name}{random_num}"
            
            # Check if code exists
            existing = await self.referral_codes_collection.find_one({"code": code})
            if not existing:
                # Create referral code record
                referral_code_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "code": code,
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "uses_count": 0
                }
                
                await self.referral_codes_collection.insert_one(referral_code_data)
                
                # Update user record
                await self.users_collection.update_one(
                    {"id": user_id},
                    {"$set": {"referral_code": code}}
                )
                
                return code
        
        # Fallback to UUID if no unique code found
        fallback_code = str(uuid.uuid4())[:8].upper()
        referral_code_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": fallback_code,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "uses_count": 0
        }
        
        await self.referral_codes_collection.insert_one(referral_code_data)
        await self.users_collection.update_one(
            {"id": user_id},
            {"$set": {"referral_code": fallback_code}}
        )
        
        return fallback_code

    async def record_referral(self, referrer_code: str, referred_user_id: str) -> bool:
        """Record a referral when someone signs up with a referral code"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot record referral")
        # Find referrer by code
        referral_code_record = await self.referral_codes_collection.find_one({"code": referrer_code, "is_active": True})
        if not referral_code_record:
            return False
        
        referrer_id = referral_code_record["user_id"]
        
        # Don't allow self-referral
        if referrer_id == referred_user_id:
            return False
        
        # Check if referral already exists
        existing = await self.referrals_collection.find_one({
            "referrer_id": referrer_id,
            "referred_user_id": referred_user_id
        })
        if existing:
            return False
        
        # Create referral record
        referral_data = {
            "id": str(uuid.uuid4()),
            "referrer_id": referrer_id,
            "referred_user_id": referred_user_id,
            "referral_code": referrer_code,
            "status": "pending",
            "coins_earned": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.referrals_collection.insert_one(referral_data)
        
        # Update referral code usage count
        await self.referral_codes_collection.update_one(
            {"code": referrer_code},
            {"$inc": {"uses_count": 1}}
        )
        
        # Update referred user to track who referred them
        await self.users_collection.update_one(
            {"id": referred_user_id},
            {"$set": {"referred_by": referrer_id}}
        )
        
        return True

    async def submit_verification_documents(self, user_id: str, document_type: str, document_url: str, full_name: str, document_number: str = None, document_image_base64: str = None) -> str:
        """Submit verification documents"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot submit verification documents")
        verification_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "document_type": document_type,
            "document_url": document_url,
            "document_image_base64": document_image_base64,
            "full_name": full_name,
            "document_number": document_number,
            "status": "pending",
            "submitted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.user_verifications_collection.insert_one(verification_data)
        
        # Update user status
        await self.users_collection.update_one(
            {"id": user_id},
            {"$set": {"verification_submitted": True}}
        )
        
        return verification_data["id"]

    async def get_verification_by_document_filename(self, filename: str) -> Optional[dict]:
        """Find a verification record by its document file name"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot query verifications")
        doc = await self.user_verifications_collection.find_one({"document_url": filename})
        return doc

    async def verify_user_documents(self, verification_id: str, admin_id: str, approved: bool, admin_notes: str = "") -> bool:
        """Admin approves or rejects user verification"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot verify documents")
        verification = await self.user_verifications_collection.find_one({"id": verification_id})
        if not verification:
            return False
        
        status = "verified" if approved else "rejected"
        
        # Update verification record
        result = await self.user_verifications_collection.update_one(
            {"id": verification_id},
            {
                "$set": {
                    "status": status,
                    "admin_notes": admin_notes,
                    "verified_by": admin_id,
                    "verified_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            return False
        
        # Update user's identity verification flag regardless of role
        try:
            user_doc = await self.get_user_by_id(verification["user_id"])
        except Exception:
            user_doc = None
        user_role = (user_doc or {}).get("role")

        if approved:
            # Mark identity_verified for all roles
            await self.users_collection.update_one(
                {"id": verification["user_id"]},
                {"$set": {"identity_verified": True, "updated_at": datetime.utcnow()}}
            )

            # Only mark homeowners fully verified here.
            if user_role == UserRole.HOMEOWNER.value:
                await self.users_collection.update_one(
                    {"id": verification["user_id"]},
                    {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
                )
                # Process referral rewards for homeowners upon verification
                await self._process_referral_rewards(verification["user_id"])
            # For tradespeople, keep is_verified gated by business approval
        else:
            # Rejection resets identity_verified and is_verified for homeowners
            update_fields = {"identity_verified": False, "updated_at": datetime.utcnow()}
            if user_role == UserRole.HOMEOWNER.value:
                update_fields["is_verified"] = False
            await self.users_collection.update_one(
                {"id": verification["user_id"]},
                {"$set": update_fields}
            )
        
        return True

    async def _process_referral_rewards(self, verified_user_id: str):
        """Process referral rewards when user gets verified"""
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot process referral rewards")
        # Find pending referral for this user
        referral = await self.referrals_collection.find_one({
            "referred_user_id": verified_user_id,
            "status": "pending"
        })
        
        if not referral:
            return
        
        # Award 5 coins to referrer
        coins_to_award = 5
        referrer_id = referral["referrer_id"]
        
        # Get or create referrer's wallet
        wallet = await self.get_wallet_by_user_id(referrer_id)
        
        # Add referral coins to wallet
        await self.wallets_collection.update_one(
            {"user_id": referrer_id},
            {
                "$inc": {"balance_coins": coins_to_award},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Create transaction record
        transaction_data = {
            "wallet_id": wallet["id"],
            "user_id": referrer_id,
            "transaction_type": "referral_reward",
            "amount_coins": coins_to_award,
            "amount_naira": coins_to_award * 100,
            "status": "confirmed",
            "description": f"Referral reward for successful referral",
            "reference": verified_user_id,
            "processed_at": datetime.utcnow()
        }
        
        await self.create_wallet_transaction(transaction_data)
        
        # Update referral record
        await self.referrals_collection.update_one(
            {"id": referral["id"]},
            {
                "$set": {
                    "status": "verified",
                    "coins_earned": coins_to_award,
                    "verified_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update referrer's stats
        await self.users_collection.update_one(
            {"id": referrer_id},
            {
                "$inc": {
                    "total_referrals": 1,
                    "referral_coins_earned": coins_to_award
                }
            }
        )

    async def get_user_referral_stats(self, user_id: str) -> dict:
        """Get referral statistics for user"""
        # Get user's referral code
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        referral_code = user.get("referral_code")
        if not referral_code:
            # Generate referral code if doesn't exist
            referral_code = await self.generate_referral_code(user_id)
        
        # Get referral statistics
        total_referrals = await self.referrals_collection.count_documents({"referrer_id": user_id})
        pending_referrals = await self.referrals_collection.count_documents({
            "referrer_id": user_id,
            "status": "pending"
        })
        verified_referrals = await self.referrals_collection.count_documents({
            "referrer_id": user_id,
            "status": "verified"
        })
        
        # Get total coins earned from referrals
        pipeline = [
            {"$match": {"referrer_id": user_id, "status": "verified"}},
            {"$group": {"_id": None, "total_coins": {"$sum": "$coins_earned"}}}
        ]
        
        total_coins_earned = 0
        async for doc in self.referrals_collection.aggregate(pipeline):
            total_coins_earned = doc["total_coins"]
        
        return {
            "total_referrals": total_referrals,
            "pending_referrals": pending_referrals,
            "verified_referrals": verified_referrals,
            "total_coins_earned": total_coins_earned,
            "referral_code": referral_code,
            "referral_link": f"{os.environ.get('FRONTEND_URL', 'https://servicehub.ng')}/signup?ref={referral_code}"
        }

    @time_it
    async def get_pending_verifications(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get pending document verifications for admin (optimized)"""
        cursor = self.user_verifications_collection.find({
            "status": "pending"
        }).sort("submitted_at", -1).skip(skip).limit(limit)
        
        verifications = await cursor.to_list(length=limit)
        if not verifications:
            return []

        # Batch fetch user details
        user_ids = list(set(v["user_id"] for v in verifications if "user_id" in v))
        users_list = await self.database.users.find({"id": {"$in": user_ids}}).to_list(length=len(user_ids))
        user_map = {u["id"]: u for u in users_list if "id" in u}
        
        for verification in verifications:
            verification["_id"] = str(verification["_id"])
            
            # Get user details from map
            user = user_map.get(verification.get("user_id"))
            if user:
                verification["user_name"] = user.get("name", "Unknown")
                verification["user_email"] = user.get("email", "Unknown")
                verification["user_role"] = user.get("role", "Unknown")
                verification["user_public_id"] = user.get("public_id")
                verification["user_short_id"] = user.get("user_id")
            
        return verifications

    @time_it
    async def get_user_referrals(self, user_id: str, skip: int = 0, limit: int = 10) -> List[dict]:
        """Get list of users referred by this user (optimized)"""
        cursor = self.referrals_collection.find({
            "referrer_id": user_id
        }).sort("created_at", -1).skip(skip).limit(limit)
        
        referrals = await cursor.to_list(length=limit)
        if not referrals:
            return []

        # Batch fetch referred user details
        referred_ids = list(set(r["referred_user_id"] for r in referrals if "referred_user_id" in r))
        users_list = await self.database.users.find({"id": {"$in": referred_ids}}).to_list(length=len(referred_ids))
        user_map = {u["id"]: u for u in users_list if "id" in u}
        
        for referral in referrals:
            referral["_id"] = str(referral["_id"])
            
            # Get referred user details from map
            referred_user = user_map.get(referral.get("referred_user_id"))
            if referred_user:
                referral["referred_user_name"] = referred_user.get("name", "Unknown")
                referral["referred_user_email"] = referred_user.get("email", "Unknown")
                referral["referred_user_role"] = referred_user.get("role", "Unknown")
                referral["is_verified"] = referred_user.get("is_verified", False)
            
        return referrals

    async def check_withdrawal_eligibility(self, user_id: str) -> dict:
        """Check if user is eligible to withdraw referral coins"""
        wallet = await self.get_wallet_by_user_id(user_id)
        
        # Get referral coins
        referral_transactions = await self.wallet_transactions_collection.find({
            "user_id": user_id,
            "transaction_type": "referral_reward",
            "status": "confirmed"
        }).to_list(length=None)
        
        referral_coins = sum(t.get("amount_coins", 0) for t in referral_transactions)

    # ==========================================
    # TRADESPEOPLE REFERENCES VERIFICATION METHODS
    # ==========================================
    async def submit_tradesperson_references(self, user_id: str, work_referrer: Dict[str, Any], character_referrer: Dict[str, Any]) -> str:
        """Submit tradesperson references for verification.
        Ensures there is only ONE pending verification record per user by upserting.
        If a pending record already exists, merge the references into that record and
        return its ID instead of creating a duplicate.
        """
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot submit tradesperson references")

        # Try to find an existing pending verification for this user
        existing = await self.tradespeople_verifications_collection.find_one({
            "user_id": user_id,
            "status": "pending",
        })

        if existing:
            # Merge references into the existing record
            v_id = existing.get("id") or str(existing.get("_id"))
            await self.tradespeople_verifications_collection.update_one(
                {"id": v_id} if existing.get("id") else {"_id": existing.get("_id")},
                {"$set": {
                    "work_referrer": work_referrer,
                    "character_referrer": character_referrer,
                    "updated_at": datetime.utcnow(),
                }}
            )
            return v_id

        # Otherwise create a new pending record for this user
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "work_referrer": work_referrer,
            "character_referrer": character_referrer,
            "status": "pending",
            "submitted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await self.tradespeople_verifications_collection.insert_one(record)
        return record["id"]

    @time_it
    async def get_pending_tradespeople_verifications(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get pending tradespeople references verifications for admin (fully optimized).
        Returns a single merged record per user using MongoDB aggregation.
        """
        pipeline = [
            {"$match": {"status": "pending"}},
            {"$sort": {"submitted_at": -1}},
            {"$group": {
                "_id": "$user_id",
                "doc": {"$first": "$$ROOT"}
            }},
            {"$replaceRoot": {"newRoot": "$doc"}},
            {"$sort": {"submitted_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        verifications = await self.tradespeople_verifications_collection.aggregate(pipeline).to_list(length=limit)
        if not verifications:
            return []

        # Convert _id to string and collect user IDs
        user_ids = []
        for v in verifications:
            v["_id"] = str(v["_id"])
            if v.get("user_id"):
                user_ids.append(v["user_id"])

        # Batch fetch user metadata
        user_map = {}
        if user_ids:
            users_list = await self.database.users.find({"id": {"$in": user_ids}}).to_list(length=len(user_ids))
            user_map = {u["id"]: u for u in users_list if "id" in u}

        # Attach user metadata
        for v in verifications:
            user = user_map.get(v.get("user_id"))
            if user:
                v["user_name"] = user.get("name")
                v["user_email"] = user.get("email")
                v["user_phone"] = user.get("phone")
                v["user_public_id"] = user.get("public_id")
                v["user_short_id"] = user.get("user_id")
                
        return verifications

    async def has_tradesperson_references(self, user_id: str) -> bool:
        if self.database is None:
            return False
        doc = await self.tradespeople_verifications_collection.find_one({
            "user_id": user_id,
            "work_referrer": {"$exists": True},
            "character_referrer": {"$exists": True},
            "status": {"$in": ["pending", "verified"]},
        })
        return bool(doc)

    async def submit_tradesperson_full_verification(self, payload: Dict[str, Any]) -> str:
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot submit tradesperson verification")

        user_id = payload.get("user_id")
        # If a pending verification already exists for this user, merge into it to avoid duplicates
        existing = await self.tradespeople_verifications_collection.find_one({
            "user_id": user_id,
            "status": "pending",
        })

        if existing:
            v_id = existing.get("id") or str(existing.get("_id"))
            # Merge documents dict
            merged_docs = {
                **(existing.get("documents") or {}),
                **(payload.get("documents") or {}),
            }
            # Merge photo/document filename arrays with de-duplication
            def merge_list(a, b):
                a = a or []
                b = b or []
                seen = set()
                out = []
                for x in list(a) + list(b):
                    if x is None:
                        continue
                    key = x if isinstance(x, str) else str(x)
                    if key in seen:
                        continue
                    seen.add(key)
                    out.append(x)
                return out

            merged_work_photos = merge_list(existing.get("work_photos"), payload.get("work_photos"))
            merged_partner_ids = merge_list(existing.get("partner_id_documents"), payload.get("partner_id_documents"))

            update_fields = {
                "business_type": payload.get("business_type") or existing.get("business_type"),
                "residential_address": payload.get("residential_address") or existing.get("residential_address"),
                "company_address": payload.get("company_address") or existing.get("company_address"),
                "director_name": payload.get("director_name") or existing.get("director_name"),
                "company_bank_name": payload.get("company_bank_name") or existing.get("company_bank_name"),
                "company_account_number": payload.get("company_account_number") or existing.get("company_account_number"),
                "company_account_name": payload.get("company_account_name") or existing.get("company_account_name"),
                "tin": payload.get("tin") or existing.get("tin"),
                "designated_partners": payload.get("designated_partners") or existing.get("designated_partners"),
                "documents": merged_docs,
                "documents_base64": payload.get("documents_base64") or existing.get("documents_base64") or [],
                "work_photos": merged_work_photos,
                "work_photos_base64": payload.get("work_photos_base64") or existing.get("work_photos_base64") or [],
                "partner_id_documents": merged_partner_ids,
                "partner_id_documents_base64": payload.get("partner_id_documents_base64") or existing.get("partner_id_documents_base64") or [],
                "updated_at": datetime.utcnow(),
            }
            await self.tradespeople_verifications_collection.update_one(
                {"id": v_id} if existing.get("id") else {"_id": existing.get("_id")},
                {"$set": update_fields}
            )
            # Mark on user profile that verification documents were submitted
            try:
                await self.users_collection.update_one(
                    {"id": user_id},
                    {"$set": {"verification_submitted": True, "updated_at": datetime.utcnow()}}
                )
            except Exception:
                pass
            return v_id

        # Create a new pending record if none exists
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "business_type": payload.get("business_type"),
            "residential_address": payload.get("residential_address"),
            "company_address": payload.get("company_address"),
            "director_name": payload.get("director_name"),
            "company_bank_name": payload.get("company_bank_name"),
            "company_account_number": payload.get("company_account_number"),
            "company_account_name": payload.get("company_account_name"),
            "tin": payload.get("tin"),
            "designated_partners": payload.get("designated_partners"),
            "documents": payload.get("documents", {}),
            "documents_base64": payload.get("documents_base64", []),
            "work_photos": payload.get("work_photos", []),
            "work_photos_base64": payload.get("work_photos_base64", []),
            "partner_id_documents": payload.get("partner_id_documents", []),
            "partner_id_documents_base64": payload.get("partner_id_documents_base64", []),
            "status": "pending",
            "submitted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await self.tradespeople_verifications_collection.insert_one(record)
        # Mark on user profile that verification documents were submitted
        try:
            await self.users_collection.update_one(
                {"id": user_id},
                {"$set": {"verification_submitted": True, "updated_at": datetime.utcnow()}}
            )
        except Exception:
            # Non-fatal: if this fails, submission record still exists
            pass
        return record["id"]

    async def get_tradespeople_file_base64(self, filename: str) -> Optional[dict]:
        """Return stored base64 for a tradespeople verification file by filename.
        Searches documents_base64, work_photos_base64, partner_id_documents_base64.
        """
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot query tradespeople verifications")
        cursor = self.tradespeople_verifications_collection.find({
            "status": {"$in": ["pending", "verified"]}
        }).sort("submitted_at", -1)
        async for v in cursor:
            for key in ("documents_base64", "work_photos_base64", "partner_id_documents_base64"):
                items = v.get(key) or []
                for item in items:
                    try:
                        if item and item.get("filename") == filename and item.get("base64"):
                            return item
                    except Exception:
                        continue
        return None

    async def get_user_tradesperson_verification_status(self, user_id: str) -> dict:
        """Return latest tradesperson verification status for a user.
        Status values: not_submitted | pending | verified | rejected
        """
        if self.database is None:
            raise RuntimeError("Database unavailable: cannot query tradespeople verifications")
        try:
            cursor = self.tradespeople_verifications_collection.find({
                "user_id": user_id
            }).sort("submitted_at", -1).limit(1)
            docs = await cursor.to_list(length=1)
            doc = docs[0] if docs else None
        except Exception:
            doc = None

        status = (doc or {}).get("status") or "not_submitted"
        return {
            "status": status,
            "verification_id": (doc or {}).get("id"),
            "submitted_at": (doc or {}).get("submitted_at"),
            "updated_at": (doc or {}).get("updated_at"),
        }

    async def approve_tradesperson_verification(self, verification_id: str, admin_id: str, admin_notes: str = "") -> bool:
        """Approve tradesperson verification and mark the user verified.
        Also ensures any other pending verification records for the same user
        are updated to prevent contradictory states in the UI.
        """
        # Find the target verification
        v = await self.tradespeople_verifications_collection.find_one({"id": verification_id})
        if not v:
            return False

        user_id = v.get("user_id")

        # Update the chosen record
        result = await self.tradespeople_verifications_collection.update_one(
            {"id": verification_id},
            {"$set": {
                "status": "verified",
                "admin_notes": admin_notes,
                "verified_by": admin_id,
                "verified_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }}
        )
        if result.modified_count == 0:
            return False

        # Mark any other pending records for this user as verified to avoid duplicates
        try:
            await self.tradespeople_verifications_collection.update_many(
                {"user_id": user_id, "status": "pending", "id": {"$ne": verification_id}},
                {"$set": {
                    "status": "verified",
                    "admin_notes": admin_notes,
                    "verified_by": admin_id,
                    "verified_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }}
            )
        except Exception:
            # Non-fatal if there were no duplicates or update failed
            pass

        # Update user flags
        await self.users_collection.update_one(
            {"id": user_id},
            {"$set": {"verified_tradesperson": True, "is_verified": True, "updated_at": datetime.utcnow()}}
        )
        return True

    async def reject_tradesperson_verification(self, verification_id: str, admin_id: str, admin_notes: str) -> bool:
        """Reject tradesperson verification.
        Also updates any other pending records for the same user to rejected
        so the user's state remains consistent.
        """
        v = await self.tradespeople_verifications_collection.find_one({"id": verification_id})
        if not v:
            return False

        user_id = v.get("user_id")

        result = await self.tradespeople_verifications_collection.update_one(
            {"id": verification_id},
            {"$set": {
                "status": "rejected",
                "admin_notes": admin_notes,
                "verified_by": admin_id,
                "verified_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }}
        )
        if result.modified_count == 0:
            return False

        # Mark any other pending records for this user as rejected
        try:
            await self.tradespeople_verifications_collection.update_many(
                {"user_id": user_id, "status": "pending", "id": {"$ne": verification_id}},
                {"$set": {
                    "status": "rejected",
                    "admin_notes": admin_notes,
                    "verified_by": admin_id,
                    "verified_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }}
            )
        except Exception:
            pass

        # Ensure user is not marked verified when business verification is rejected
        try:
            await self.users_collection.update_one(
                {"id": user_id},
                {"$set": {"verified_tradesperson": False, "is_verified": False, "updated_at": datetime.utcnow()}}
            )
        except Exception:
            pass
        return True
        
        # Check if total wallet balance >= 5 coins (lowered minimum for flexibility)
        total_coins = wallet.get("balance_coins", 0)
        can_withdraw = total_coins >= 5
        
        return {
            "total_coins": total_coins,
            "referral_coins": referral_coins,
            "regular_coins": total_coins - referral_coins,
            "can_withdraw_referrals": can_withdraw,
            "minimum_required": 5,
            "shortfall": max(0, 5 - total_coins)
        }
    
    # ==========================================
    # USER MANAGEMENT METHODS (Admin)
    # ==========================================
    
    @time_it
    async def get_all_users_for_admin(self, skip: int = 0, limit: int = 50, role: str = None, status: str = None, search: str = None):
        """Get all users with filtering for admin dashboard (optimized)"""
        import asyncio
        # Build query filter
        query = {}
        
        if role:
            query["role"] = role
            
        if status:
            query["status"] = status
        else:
            # Default to active users if no status specified
            query["status"] = {"$ne": "deleted"}
            
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"skills": {"$regex": search, "$options": "i"}},
                {"user_id": {"$regex": f"^{search}$", "$options": "i"}},
                {"public_id": {"$regex": f"^{search}$", "$options": "i"}},
                {"id": {"$regex": search, "$options": "i"}}
            ]
        
        # Get users with pagination
        users_cursor = self.users_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        users = await users_cursor.to_list(length=limit)
        
        if not users:
            return []

        # Extract IDs for batch operations
        user_ids = [u["id"] for u in users if "id" in u]
        homeowner_ids = [u["id"] for u in users if u.get("role") == UserRole.HOMEOWNER.value and "id" in u]
        tradesperson_ids = [u["id"] for u in users if u.get("role") == UserRole.TRADESPERSON.value and "id" in u]

        # Parallelize batch fetches for metadata
        tasks = []
        
        # 1. Task for wallets (if tradespeople exist)
        async def fetch_wallets():
            if not tradesperson_ids:
                return {}
            wallets_list = await self.wallets_collection.find({"user_id": {"$in": tradesperson_ids}}).to_list(length=len(tradesperson_ids))
            return {w["user_id"]: w for w in wallets_list if "user_id" in w}
        tasks.append(fetch_wallets())

        # 2. Task for homeowner job counts
        async def fetch_job_counts():
            if not homeowner_ids:
                return {}
            pipeline = [
                {"$match": {"homeowner.id": {"$in": homeowner_ids}}},
                {"$group": {"_id": "$homeowner.id", "count": {"$sum": 1}}}
            ]
            counts = await self.database.jobs.aggregate(pipeline).to_list(length=len(homeowner_ids))
            return {str(c["_id"]): c["count"] for c in counts}
        tasks.append(fetch_job_counts())

        # 3. Task for tradesperson interest counts
        async def fetch_interest_counts():
            if not tradesperson_ids:
                return {}
            pipeline = [
                {"$match": {"tradesperson_id": {"$in": tradesperson_ids}}},
                {"$group": {"_id": "$tradesperson_id", "count": {"$sum": 1}}}
            ]
            counts = await self.database.interests.aggregate(pipeline).to_list(length=len(tradesperson_ids))
            return {str(c["_id"]): c["count"] for c in counts}
        tasks.append(fetch_interest_counts())

        # Execute all batch fetches in parallel
        results = await asyncio.gather(*tasks)
        wallets_map = results[0]
        jobs_count_map = results[1]
        interests_count_map = results[2]

        # Process users to add activity info and remove sensitive data
        processed_users = []
        for user in users:
            user["_id"] = str(user["_id"])
            user.pop("password_hash", None)  # Remove password hash
            
            uid = user.get("id")
            # Add activity indicators
            user["last_login"] = user.get("last_login", user.get("created_at"))
            user["is_verified"] = user.get("is_verified", False)
            user["wallet_balance"] = 0
            
            # Get wallet balance if tradesperson
            if user.get("role") == UserRole.TRADESPERSON.value:
                wallet = wallets_map.get(uid)
                if wallet:
                    user["wallet_balance"] = wallet.get("balance_coins", 0)
                user["interests_shown"] = interests_count_map.get(uid, 0)
            
            # Count jobs based on role
            if user.get("role") == UserRole.HOMEOWNER.value:
                user["jobs_posted"] = jobs_count_map.get(uid, 0)
            
            processed_users.append(user)
        
        return processed_users

    async def get_users_total_count_filtered(self, role: str = None, status: str = None, search: str = None):
        """Get total count of users matching filters for admin dashboard pagination"""
        query = {}
        if role:
            query["role"] = role
        if status:
            query["status"] = status
        else:
            query["status"] = {"$ne": "deleted"}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"skills": {"$regex": search, "$options": "i"}},
                {"user_id": {"$regex": f"^{search}$", "$options": "i"}},
                {"public_id": {"$regex": f"^{search}$", "$options": "i"}},
                {"id": {"$regex": search, "$options": "i"}},
            ]
        return await self.users_collection.count_documents(query)
    
    async def get_total_users_count(self):
        """Get total number of registered users"""
        return await self.users_collection.count_documents({"status": {"$ne": "deleted"}})
    
    async def get_active_users_count(self):
        """Get count of active users (logged in within last 30 days)"""
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        return await self.users_collection.count_documents({
            "status": "active",
            "last_login": {"$gte": thirty_days_ago}
        })
    
    async def get_users_count_by_role(self, role: str):
        """Get count of users by role"""
        return await self.users_collection.count_documents({
            "role": role,
            "status": {"$ne": "deleted"}
        })
    
    async def get_verified_users_count(self):
        """Get count of verified users"""
        return await self.users_collection.count_documents({
            "is_verified": True,
            "status": {"$ne": "deleted"}
        })
    
    @time_it
    async def get_user_activity_stats(self, user_id: str):
        """Get comprehensive activity statistics for a user (optimized)"""
        import asyncio
        user = await self.get_user_by_id(user_id)
        if not user:
            return {}

        stats = {
            "registration_date": user.get("created_at"),
            "last_login": user.get("last_login", user.get("created_at")),
            "is_verified": user.get("is_verified", False),
            "status": user.get("status", "active")
        }

        # Homeowner-specific statistics
        if user.get("role") == UserRole.HOMEOWNER.value:
            tasks = [
                self.database.jobs.count_documents({"homeowner.id": user_id}),
                self.database.jobs.count_documents({"homeowner.id": user_id, "status": "open"}),
                self.database.jobs.count_documents({"homeowner.id": user_id, "status": "completed"}),
                self.database.interests.count_documents({"job.homeowner.id": user_id}),
                self._get_average_job_budget(user_id)
            ]
            results = await asyncio.gather(*tasks)
            stats.update({
                "total_jobs_posted": results[0],
                "active_jobs": results[1],
                "completed_jobs": results[2],
                "total_interests_received": results[3],
                "average_job_budget": results[4]
            })

        # Tradesperson-specific statistics
        elif user.get("role") == UserRole.TRADESPERSON.value:
            tasks = [
                self.database.wallets.find_one({"user_id": user_id}),
                self.database.interests.count_documents({"tradesperson_id": user_id}),
                self.database.user_verifications.count_documents({"referred_by": user_id, "verification_status": "verified"}),
                self.database.portfolio.count_documents({"tradesperson_id": user_id}),
                self._get_tradesperson_average_rating(user_id),
                self.database.reviews.count_documents({"tradesperson_id": user_id})
            ]
            results = await asyncio.gather(*tasks)
            wallet = results[0]
            stats.update({
                "total_interests_shown": results[1],
                "wallet_balance_coins": wallet.get("balance_coins", 0) if wallet else 0,
                "wallet_balance_naira": wallet.get("balance_naira", 0) if wallet else 0,
                "successful_referrals": results[2],
                "portfolio_items": results[3],
                "average_rating": results[4],
                "total_reviews": results[5]
            })

        return stats
    
    async def update_user_status(self, user_id: str, status: str, admin_notes: str = ""):
        """Update user status with admin notes"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow(),
            "admin_notes": admin_notes
        }

        # Be resilient to different identifiers: try id, user_id, or public_id
        filter_query = {
            "$or": [
                {"id": user_id},
                {"user_id": user_id},
                {"public_id": user_id}
            ]
        }

        result = await self.users_collection.update_one(filter_query, {"$set": update_data})
        return result.modified_count > 0
    
    async def _get_average_job_budget(self, homeowner_id: str):
        """Helper method to calculate average job budget for a homeowner"""
        
        pipeline = [
            {"$match": {"homeowner.id": homeowner_id, "budget": {"$gt": 0}}},
            {"$group": {"_id": None, "avg_budget": {"$avg": "$budget"}}}
        ]
        
        result = await self.database.jobs.aggregate(pipeline).to_list(length=1)
        return round(result[0]["avg_budget"], 2) if result else 0
        
    async def _get_tradesperson_average_rating(self, tradesperson_id: str):
        """Helper method to calculate average rating for a tradesperson"""
        
        pipeline = [
            {"$match": {"tradesperson_id": tradesperson_id}},
            {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
        ]
        
        result = await self.database.reviews.aggregate(pipeline).to_list(length=1)
        return round(result[0]["avg_rating"], 1) if result else 0
    
    @time_it
    async def get_user_details_admin(self, user_id: str):
        """Get comprehensive user details for admin management (optimized)"""
        import asyncio
        try:
            # Get basic user information first
            user = await self.get_user_by_id(user_id)
            if not user:
                return None
            
            # Remove password hash for security
            user.pop("password_hash", None)
            user["_id"] = str(user.get("_id", ""))
            
            # Prepare parallel tasks
            tasks = {
                "activity_stats": self.get_user_activity_stats(user_id),
                "verification": self.database.user_verifications.find_one({"user_id": user_id})
            }
            
            # Add role-specific tasks
            if user.get("role") == UserRole.HOMEOWNER.value:
                tasks["jobs_posted"] = self.database.jobs.count_documents({"homeowner.id": user_id})
                tasks["active_jobs"] = self.database.jobs.count_documents({
                    "homeowner.id": user_id,
                    "status": {"$in": ["active", "open"]}
                })
                tasks["completed_jobs"] = self.database.jobs.count_documents({
                    "homeowner.id": user_id,
                    "status": "completed"
                })
                tasks["total_interests_received"] = self.database.interests.count_documents({
                    "homeowner_id": user_id
                })
                tasks["recent_jobs"] = self.database.jobs.find(
                    {"homeowner.id": user_id}
                ).sort("created_at", -1).limit(5).to_list(length=5)
                
            elif user.get("role") == UserRole.TRADESPERSON.value:
                tasks["wallet"] = self.database.wallets.find_one({"user_id": user_id})
                tasks["interests_shown"] = self.database.interests.count_documents({"tradesperson_id": user_id})
                tasks["paid_interests"] = self.database.interests.count_documents({
                    "tradesperson_id": user_id,
                    "status": "paid_access"
                })
                tasks["portfolio_items"] = self.database.portfolio.count_documents({"tradesperson_id": user_id})
                tasks["reviews_count"] = self.database.reviews.count_documents({"reviewee_id": user_id})
                tasks["average_rating"] = self._get_tradesperson_average_rating(user_id)
                tasks["transactions"] = self.database.wallet_transactions.find(
                    {"user_id": user_id}
                ).sort("created_at", -1).limit(10).to_list(length=10)
                tasks["recent_interests"] = self.database.interests.find(
                    {"tradesperson_id": user_id}
                ).sort("created_at", -1).limit(5).to_list(length=5)

            # Execute all tasks in parallel
            task_keys = list(tasks.keys())
            task_results = await asyncio.gather(*[tasks[k] for k in task_keys], return_exceptions=True)
            results = dict(zip(task_keys, task_results))
            
            # Process Activity Stats
            activity_stats = results.get("activity_stats", {})
            if isinstance(activity_stats, Exception):
                logger.error(f"Error fetching activity stats for {user_id}: {activity_stats}")
                activity_stats = {}
            user.update(activity_stats)
            
            # Process Verification
            verification = results.get("verification")
            if verification and not isinstance(verification, Exception):
                user.update({
                    "verification_status": verification.get("verification_status", "unverified"),
                    "document_type": verification.get("document_type", ""),
                    "verified_at": verification.get("verified_at"),
                    "verification_notes": verification.get("admin_notes", "")
                })
            else:
                user.update({
                    "verification_status": "unverified",
                    "document_type": "",
                    "verified_at": None,
                    "verification_notes": ""
                })
            
            # Process Homeowner specific results
            if user.get("role") == UserRole.HOMEOWNER.value:
                user.update({
                    "jobs_posted": results.get("jobs_posted", 0) if not isinstance(results.get("jobs_posted"), Exception) else 0,
                    "active_jobs": results.get("active_jobs", 0) if not isinstance(results.get("active_jobs"), Exception) else 0,
                    "completed_jobs": results.get("completed_jobs", 0) if not isinstance(results.get("completed_jobs"), Exception) else 0,
                    "total_interests_received": results.get("total_interests_received", 0) if not isinstance(results.get("total_interests_received"), Exception) else 0
                })
                
                recent_jobs_raw = results.get("recent_jobs", [])
                if isinstance(recent_jobs_raw, Exception):
                    recent_jobs_raw = []
                
                # Optimized: Batch fetch interest counts for recent jobs
                if recent_jobs_raw:
                    job_ids = [j.get("id") for j in recent_jobs_raw if j.get("id")]
                    interest_counts_pipeline = [
                        {"$match": {"job_id": {"$in": job_ids}}},
                        {"$group": {"_id": "$job_id", "count": {"$sum": 1}}}
                    ]
                    counts_cursor = self.database.interests.aggregate(interest_counts_pipeline)
                    counts_list = await counts_cursor.to_list(length=len(job_ids))
                    counts_map = {c["_id"]: c["count"] for c in counts_list}
                    
                    user["recent_jobs"] = [
                        {
                            "id": job.get("id", ""),
                            "title": job.get("title", ""),
                            "category": job.get("category", ""),
                            "status": job.get("status", ""),
                            "created_at": job.get("created_at"),
                            "interests_count": counts_map.get(job.get("id"), 0)
                        } for job in recent_jobs_raw
                    ]
                else:
                    user["recent_jobs"] = []
                    
            # Process Tradesperson specific results
            elif user.get("role") == UserRole.TRADESPERSON.value:
                wallet = results.get("wallet")
                if isinstance(wallet, Exception): wallet = None
                
                user.update({
                    "wallet_balance_coins": wallet.get("balance_coins", 0) if wallet else 0,
                    "wallet_balance_naira": wallet.get("balance_naira", 0) if wallet else 0,
                    "interests_shown": results.get("interests_shown", 0) if not isinstance(results.get("interests_shown"), Exception) else 0,
                    "paid_interests": results.get("paid_interests", 0) if not isinstance(results.get("paid_interests"), Exception) else 0,
                    "portfolio_items": results.get("portfolio_items", 0) if not isinstance(results.get("portfolio_items"), Exception) else 0,
                    "reviews_count": results.get("reviews_count", 0) if not isinstance(results.get("reviews_count"), Exception) else 0,
                    "average_rating": results.get("average_rating", 0) if not isinstance(results.get("average_rating"), Exception) else 0
                })
                
                transactions = results.get("transactions", [])
                if isinstance(transactions, Exception): transactions = []
                user["recent_transactions"] = [
                    {
                        "id": str(tx.get("_id", "")),
                        "type": tx.get("transaction_type", ""),
                        "amount_coins": tx.get("amount_coins", 0),
                        "amount_naira": tx.get("amount_naira", 0),
                        "description": tx.get("description", ""),
                        "status": tx.get("status", ""),
                        "created_at": tx.get("created_at")
                    } for tx in transactions
                ]
                
                recent_interests = results.get("recent_interests", [])
                if isinstance(recent_interests, Exception): recent_interests = []
                user["recent_interests"] = [
                    {
                        "id": str(interest.get("_id", "")),
                        "job_title": interest.get("job_title", ""),
                        "job_category": interest.get("job_category", ""),
                        "status": interest.get("status", ""),
                        "created_at": interest.get("created_at"),
                        "contact_shared_at": interest.get("contact_shared_at"),
                        "payment_made_at": interest.get("payment_made_at")
                    } for interest in recent_interests
                ]
            
            return user
            
        except Exception as e:
            logger.error(f"Error getting user details for admin: {str(e)}")
            return None
    
    @time_it
    async def delete_user_completely(self, user_id: str):
        """Permanently delete user and all associated data (optimized)"""
        import asyncio
        try:
            # Get user details first for logging
            user = await self.get_user_by_id(user_id)
            if not user:
                return False
            
            # Check if user is admin - prevent deletion of admin accounts
            if user.get("role") == UserRole.ADMIN.value:
                logger.warning(f"Attempted to delete admin user: {user.get('email', 'Unknown')}")
                return False
            
            # 1. Collect job IDs first (needed for cascading deletes)
            job_ids = []
            try:
                job_cursor = self.database.jobs.find({"$or": [{"homeowner_id": user_id}, {"homeowner.id": user_id}]}, {"id": 1})
                jobs_for_user = await job_cursor.to_list(length=None)
                job_ids = [j.get("id") for j in jobs_for_user if j.get("id")]
            except Exception as e:
                logger.warning(f"Error collecting job IDs for user {user_id}: {e}")

            # 2. Prepare all deletion tasks
            delete_tasks = {
                "jobs": self.database.jobs.delete_many({"$or": [{"homeowner_id": user_id}, {"homeowner.id": user_id}]}),
                "interests_tp": self.database.interests.delete_many({"tradesperson_id": user_id}),
                "interests_ho": self.database.interests.delete_many({"homeowner_id": user_id}),
                "wallets": self.database.wallets.delete_many({"user_id": user_id}),
                "wallet_transactions": self.database.wallet_transactions.delete_many({"user_id": user_id}),
                "portfolio": self.database.portfolio.delete_many({"tradesperson_id": user_id}),
                "reviews_reviewer": self.database.reviews.delete_many({"reviewer_id": user_id}),
                "reviews_reviewee": self.database.reviews.delete_many({"reviewee_id": user_id}),
                "conversations": self.database.conversations.delete_many({"participants": user_id}),
                "messages": self.database.messages.delete_many({"sender_id": user_id}),
                "notifications": self.database.notifications.delete_many({"user_id": user_id}),
                "notification_preferences": self.database.notification_preferences.delete_many({"user_id": user_id}),
                "user_verifications": self.database.user_verifications.delete_many({"user_id": user_id}),
                "pending_jobs": self.database.pending_jobs.delete_many({"user_id": user_id}),
                "email_verification_tokens": self.database.email_verification_tokens.delete_many({"user_id": user_id}),
                "password_reset_tokens": self.database.password_reset_tokens.delete_many({"user_id": user_id}),
                "quotes": self.database.quotes.delete_many({"$or": [{"tradesperson_id": user_id}, {"homeowner_id": user_id}]})
            }

            # Add cascading job-related deletes if we have job IDs
            if job_ids:
                delete_tasks["job_question_answers"] = self.database.job_question_answers.delete_many({"job_id": {"$in": job_ids}})

            # 3. Run all deletions in parallel
            task_keys = list(delete_tasks.keys())
            results_list = await asyncio.gather(*[delete_tasks[k] for k in task_keys], return_exceptions=True)
            
            # Log results
            for i, key in enumerate(task_keys):
                res = results_list[i]
                if isinstance(res, Exception):
                    logger.warning(f"Failed to delete from {key} for user {user_id}: {res}")
                elif hasattr(res, 'deleted_count') and res.deleted_count > 0:
                    logger.info(f"Deleted {res.deleted_count} records from {key} for user {user_id}")

            # Finally delete the user account(s)
            email = user.get("email")
            if email:
                result = await self.users_collection.delete_many({"email": email})
            else:
                result = await self.users_collection.delete_one({"id": user_id})

            if result.deleted_count > 0:
                logger.info(f"Successfully deleted user account(s) for {email or user_id}: count={result.deleted_count}")
                return True
            else:
                logger.error(f"Failed to delete user account: {user_id} (email={email})")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting user completely: {str(e)}")
            return False
            
    # ==========================================
    # LOCATION MANAGEMENT METHODS (Admin)
    # ==========================================
    
    async def get_custom_lgas(self):
        """Get custom LGAs added by admin, organized by state"""
        try:
            lgas_cursor = self.database.system_locations.find({"type": "lga"})
            lgas = await lgas_cursor.to_list(length=None)
            
            # Organize by state
            lgas_by_state = {}
            for lga in lgas:
                state = lga["state"]
                if state not in lgas_by_state:
                    lgas_by_state[state] = []
                lgas_by_state[state].append(lga["name"])
            
            return lgas_by_state
        except Exception as e:
            print(f"Error getting custom LGAs: {e}")
            return {}
    
    async def get_custom_states(self):
        """Get custom states added by admin"""
        try:
            states_cursor = self.database.system_locations.find({"type": "state"})
            states = await states_cursor.to_list(length=None)
            return [state["name"] for state in states]
        except Exception as e:
            print(f"Error getting custom states: {e}")
            return []
    
    async def add_new_state(self, state_name: str, region: str = "", postcode_samples: str = ""):
        """Add a new state to the system"""
        try:
            # In a real implementation, this would update files or database
            # For now, we'll store in a collection
            state_doc = {
                "name": state_name,
                "region": region,
                "postcode_samples": postcode_samples.split(",") if postcode_samples else [],
                "created_at": datetime.now(),
                "type": "state"
            }
            
            # Check if state already exists
            existing = await self.database.system_locations.find_one({"name": state_name, "type": "state"})
            if existing:
                return False
            
            await self.database.system_locations.insert_one(state_doc)
            return True
        except Exception as e:
            print(f"Error adding state: {e}")
            return False
    
    async def update_state(self, old_name: str, new_name: str, region: str = "", postcode_samples: str = ""):
        """Update an existing state"""
        try:
            update_data = {
                "name": new_name,
                "region": region,
                "postcode_samples": postcode_samples.split(",") if postcode_samples else [],
                "updated_at": datetime.now()
            }
            
            result = await self.database.system_locations.update_one(
                {"name": old_name, "type": "state"},
                {"$set": update_data}
            )
            
            # Also update LGAs that reference this state
            if result.modified_count > 0:
                await self.database.system_locations.update_many(
                    {"state": old_name, "type": "lga"},
                    {"$set": {"state": new_name}}
                )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating state: {e}")
            return False
    
    async def delete_state(self, state_name: str):
        """Delete a state and all its LGAs"""
        try:
            # Delete all LGAs for this state
            await self.database.system_locations.delete_many({"state": state_name, "type": "lga"})
            
            # Delete all towns for this state
            await self.database.system_locations.delete_many({"state": state_name, "type": "town"})
            
            # Delete the state
            result = await self.database.system_locations.delete_one({"name": state_name, "type": "state"})
            
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting state: {e}")
            return False
    
    async def add_new_lga(self, state_name: str, lga_name: str, zip_codes: str = ""):
        """Add a new LGA to a state"""
        try:
            # Check if state exists in either static list or database
            from models.nigerian_states import NIGERIAN_STATES
            state_exists_static = state_name in NIGERIAN_STATES
            
            # Also check database for custom states
            state_exists_db = await self.database.system_locations.find_one({
                "name": state_name,
                "type": "state"
            })
            
            if not (state_exists_static or state_exists_db):
                print(f"State '{state_name}' not found in static list or database")
                return False
            
            lga_doc = {
                "name": lga_name,
                "state": state_name,
                "zip_codes": zip_codes.split(",") if zip_codes else [],
                "created_at": datetime.now(),
                "type": "lga"
            }
            
            # Check if LGA already exists in this state
            existing = await self.database.system_locations.find_one({
                "name": lga_name, 
                "state": state_name, 
                "type": "lga"
            })
            if existing:
                print(f"LGA '{lga_name}' already exists in state '{state_name}'")
                return False
            
            await self.database.system_locations.insert_one(lga_doc)
            return True
        except Exception as e:
            print(f"Error adding LGA: {e}")
            return False
    
    async def update_lga(self, state_name: str, old_name: str, new_name: str, zip_codes: str = ""):
        """Update an existing LGA"""
        try:
            update_data = {
                "name": new_name,
                "zip_codes": zip_codes.split(",") if zip_codes else [],
                "updated_at": datetime.now()
            }
            
            result = await self.database.system_locations.update_one(
                {"name": old_name, "state": state_name, "type": "lga"},
                {"$set": update_data}
            )
            
            # Also update towns that reference this LGA
            if result.modified_count > 0:
                await self.database.system_locations.update_many(
                    {"lga": old_name, "state": state_name, "type": "town"},
                    {"$set": {"lga": new_name}}
                )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating LGA: {e}")
            return False
    
    async def delete_lga(self, state_name: str, lga_name: str):
        """Delete an LGA and all its towns"""
        try:
            # Delete all towns for this LGA
            await self.database.system_locations.delete_many({
                "state": state_name, 
                "lga": lga_name, 
                "type": "town"
            })
            
            # Delete the LGA
            result = await self.database.system_locations.delete_one({
                "name": lga_name, 
                "state": state_name, 
                "type": "lga"
            })
            
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting LGA: {e}")
            return False
    
    async def get_all_towns(self):
        """Get all towns organized by state and LGA"""
        try:
            towns_cursor = self.database.system_locations.find({"type": "town"})
            towns = await towns_cursor.to_list(length=None)
            
            # Organize by state and LGA
            organized_towns = {}
            for town in towns:
                state = town.get("state", "Unknown")
                lga = town.get("lga", "Unknown")
                town_name = town.get("name", "")
                
                if state not in organized_towns:
                    organized_towns[state] = {}
                
                if lga not in organized_towns[state]:
                    organized_towns[state][lga] = []
                
                organized_towns[state][lga].append({
                    "name": town_name,
                    "zip_code": town.get("zip_code", ""),
                    "created_at": town.get("created_at")
                })
            
            return organized_towns
        except Exception as e:
            print(f"Error getting towns: {e}")
            return {}
    
    async def add_new_town(self, state_name: str, lga_name: str, town_name: str, zip_code: str = ""):
        """Add a new town to an LGA"""
        try:
            # Check if LGA exists in static data or database
            from models.nigerian_lgas import get_lgas_for_state
            static_lgas = get_lgas_for_state(state_name)
            lga_exists_static = lga_name in static_lgas if static_lgas else False
            
            # Also check database for custom LGAs
            lga_exists_db = await self.database.system_locations.find_one({
                "name": lga_name, 
                "state": state_name, 
                "type": "lga"
            })
            
            if not (lga_exists_static or lga_exists_db):
                return False
            
            town_doc = {
                "name": town_name,
                "state": state_name,
                "lga": lga_name,
                "zip_code": zip_code,
                "created_at": datetime.now(),
                "type": "town"
            }
            
            await self.database.system_locations.insert_one(town_doc)
            return True
        except Exception as e:
            print(f"Error adding town: {e}")
            return False
    
    async def delete_town(self, state_name: str, lga_name: str, town_name: str):
        """Delete a town"""
        try:
            result = await self.database.system_locations.delete_one({
                "name": town_name,
                "state": state_name,
                "lga": lga_name,
                "type": "town"
            })
            
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting town: {e}")
            return False
    
    # ==========================================
    # TRADE CATEGORIES MANAGEMENT METHODS (Admin)
    # ==========================================
    
    async def add_new_trade(self, trade_name: str, group: str = "", description: str = ""):
        """Add a new trade category"""
        try:
            trade_doc = {
                "name": trade_name,
                "group": group,
                "description": description,
                "created_at": datetime.now(),
                "active": True
            }
            
            # Check if trade already exists
            existing = await self.database.system_trades.find_one({"name": trade_name})
            if existing:
                return False
            
            await self.database.system_trades.insert_one(trade_doc)
            return True
        except Exception as e:
            print(f"Error adding trade: {e}")
            return False
    
    async def update_trade(self, old_name: str, new_name: str, group: str = "", description: str = ""):
        """Update an existing trade category.
        Supports updating both custom and static categories by upserting a record when not present.
        """
        try:
            old_name = (old_name or "").strip()
            new_name = (new_name or "").strip()
            now = datetime.now()
            
            update_set = {"name": new_name, "updated_at": now}
            set_on_insert = {
                "active": True,
                "created_at": now
            }

            # Only set optional fields in update_set when provided
            # If provided, they will be set on insert via $set too.
            # If NOT provided, we need a default for insert, but don't want to overwrite existing.
            if group:
                update_set["group"] = group
            else:
                set_on_insert["group"] = "General Services"

            if description:
                update_set["description"] = description
            else:
                set_on_insert["description"] = ""

            result = await self.database.system_trades.update_one(
                {"name": {"$regex": f"^{re.escape(old_name)}$", "$options": "i"}},
                {
                    "$set": update_set,
                    "$setOnInsert": set_on_insert
                },
                upsert=True
            )

            # Treat a matched document (even when no fields changed) as success to
            # avoid misleading 404 "not found" errors on no-op updates.
            matched = getattr(result, "matched_count", 0) > 0
            modified = getattr(result, "modified_count", 0) > 0
            upserted = getattr(result, "upserted_id", None) is not None
            if matched or modified or upserted:
                return True

            # Fallback: try matching by new_name in case existing record already uses new label
            result2 = await self.database.system_trades.update_one(
                {"name": {"$regex": f"^{re.escape(new_name)}$", "$options": "i"}},
                {"$set": update_set},
                upsert=False
            )
            matched2 = getattr(result2, "matched_count", 0) > 0
            modified2 = getattr(result2, "modified_count", 0) > 0
            return matched2 or modified2
        except Exception as e:
            print(f"Error updating trade: {e}")
            return False
    
    async def delete_trade(self, trade_name: str):
        """Delete a trade category"""
        try:
            result = await self.database.system_trades.delete_one({"name": trade_name})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting trade: {e}")
            return False
    
    async def get_custom_trades(self):
        """Get all custom trade categories added by admin"""
        try:
            trades = await self.database.system_trades.find({"active": True}).to_list(length=None)
            trade_list = []
            groups = {}
            
            for trade in trades:
                trade_name = trade["name"]
                trade_group = trade.get("group", "General Services")
                
                trade_list.append(trade_name)
                
                # Group trades by category
                if trade_group not in groups:
                    groups[trade_group] = []
                groups[trade_group].append(trade_name)
            
            return {"trades": trade_list, "groups": groups}
        except Exception as e:
            print(f"Error getting custom trades: {e}")
            return {"trades": [], "groups": {}}

    # ==========================================
    # MESSAGING SYSTEM METHODS
    # ==========================================
    
    async def create_conversation(self, conversation_data: dict) -> dict:
        """Create a new conversation between homeowner and tradesperson"""
        try:
            # Check if conversation already exists
            existing = await self.database.conversations.find_one({
                "job_id": conversation_data["job_id"],
                "homeowner_id": conversation_data["homeowner_id"],
                "tradesperson_id": conversation_data["tradesperson_id"]
            })
            
            if existing:
                existing['_id'] = str(existing['_id'])
                return existing
            
            conversation_data["created_at"] = datetime.now(timezone.utc)
            conversation_data["updated_at"] = datetime.now(timezone.utc)
            conversation_data["unread_count_homeowner"] = 0
            conversation_data["unread_count_tradesperson"] = 0
            
            result = await self.database.conversations.insert_one(conversation_data)
            conversation_data['_id'] = str(result.inserted_id)
            return conversation_data
            
        except Exception as e:
            print(f"Error creating conversation: {e}")
            return None
    
    async def get_conversation_by_id(self, conversation_id: str) -> Optional[dict]:
        """Get conversation by ID"""
        try:
            conversation = await self.database.conversations.find_one({"id": conversation_id})
            if conversation:
                conversation['_id'] = str(conversation['_id'])
            return conversation
        except Exception as e:
            print(f"Error getting conversation: {e}")
            return None
    
    async def get_user_conversations(self, user_id: str, user_type: str, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get all conversations for a user"""
        try:
            if user_type == UserRole.HOMEOWNER.value:
                query = {"homeowner_id": user_id}
            else:
                query = {"tradesperson_id": user_id}
            
            cursor = self.database.conversations.find(query).sort("last_message_at", -1).skip(skip).limit(limit)
            conversations = await cursor.to_list(length=limit)
            
            for conv in conversations:
                conv['_id'] = str(conv['_id'])
            
            return conversations
        except Exception as e:
            print(f"Error getting user conversations: {e}")
            return []
    
    async def create_message(self, message_data: dict) -> dict:
        """Create a new message"""
        try:
            message_data["created_at"] = datetime.now(timezone.utc)
            message_data["updated_at"] = datetime.now(timezone.utc)
            message_data["status"] = "sent"
            
            result = await self.database.messages.insert_one(message_data)
            message_data['_id'] = str(result.inserted_id)
            
            # Update conversation last message and unread counts
            await self._update_conversation_last_message(
                message_data["conversation_id"], 
                message_data["content"],
                message_data["sender_type"]
            )
            
            return message_data
            
        except Exception as e:
            print(f"Error creating message: {e}")
            return None
    
    async def get_conversation_messages(self, conversation_id: str, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get messages for a conversation"""
        try:
            cursor = self.database.messages.find(
                {"conversation_id": conversation_id}
            ).sort("created_at", 1).skip(skip).limit(limit)
            
            messages = await cursor.to_list(length=limit)
            
            for msg in messages:
                msg['_id'] = str(msg['_id'])
            
            return messages
        except Exception as e:
            print(f"Error getting conversation messages: {e}")
            return []
    
    async def mark_messages_as_read(self, conversation_id: str, user_type: str) -> bool:
        """Mark all messages in a conversation as read for a user"""
        try:
            # Update message status to read for messages not sent by this user
            other_type = "homeowner" if user_type == UserRole.TRADESPERSON.value else "tradesperson"
            
            await self.database.messages.update_many(
                {
                    "conversation_id": conversation_id,
                    "sender_type": other_type,
                    "status": {"$ne": "read"}
                },
                {"$set": {"status": "read", "updated_at": datetime.now(timezone.utc)}}
            )
            
            # Reset unread count for this user type
            unread_field = f"unread_count_{user_type}"
            await self.database.conversations.update_one(
                {"id": conversation_id},
                {"$set": {unread_field: 0}}
            )
            
            return True
        except Exception as e:
            print(f"Error marking messages as read: {e}")
            return False
    
    async def get_conversation_by_job_and_users(self, job_id: str, homeowner_id: str, tradesperson_id: str) -> Optional[dict]:
        """Get conversation by job and user IDs"""
        try:
            conversation = await self.database.conversations.find_one({
                "job_id": job_id,
                "homeowner_id": homeowner_id,
                "tradesperson_id": tradesperson_id
            })
            
            if conversation:
                conversation['_id'] = str(conversation['_id'])
            return conversation
        except Exception as e:
            print(f"Error getting conversation by job and users: {e}")
            return None
    
    async def _update_conversation_last_message(self, conversation_id: str, message_content: str, sender_type: str):
        """Update conversation with last message info and increment unread count"""
        try:
            # Increment unread count for the recipient
            recipient_unread_field = "unread_count_homeowner" if sender_type == UserRole.TRADESPERSON.value else "unread_count_tradesperson"
            
            await self.database.conversations.update_one(
                {"id": conversation_id},
                {
                    "$set": {
                        "last_message": message_content,
                        "last_message_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    },
                    "$inc": {recipient_unread_field: 1}
                }
            )
        except Exception as e:
            print(f"Error updating conversation last message: {e}")

    # Skills Test Questions Management
    async def get_all_skills_questions(self):
        """Get all skills test questions grouped by trade"""
        try:
            questions = await self.database.skills_questions.find().to_list(length=None)
            
            # Convert ObjectIds to strings for JSON serialization
            for question in questions:
                if '_id' in question:
                    question['_id'] = str(question['_id'])
            
            # Group questions by trade
            questions_by_trade = {}
            for question in questions:
                trade = question.get('trade_category', 'Unknown')
                if trade not in questions_by_trade:
                    questions_by_trade[trade] = []
                questions_by_trade[trade].append(question)
            
            return questions_by_trade
        except Exception as e:
            logger.error(f"Error getting skills questions: {str(e)}")
            return {}
    
    async def get_questions_for_trade(self, trade_category: str):
        """Get all questions for a specific trade, with JS-file fallback when DB unavailable"""
        # Prefer database when connected
        if self.database is not None and self.connected:
            try:
                questions = await self.database.skills_questions.find(
                    {"trade_category": trade_category}
                ).to_list(length=None)
                # Convert ObjectIds to strings for JSON serialization
                for question in questions:
                    if '_id' in question:
                        question['_id'] = str(question['_id'])
                if questions:
                    return questions
            except Exception as e:
                logger.error(f"Error getting questions for trade {trade_category}: {e}")
        
        # Fallback: read from frontend JS file
        try:
            import re, json
            js_file_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'frontend', 'src', 'data', 'skillsTestQuestions.js'
            )
            if not os.path.exists(js_file_path):
                logger.error(f"JS skills questions file not found at {js_file_path}")
                return []
            with open(js_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r"export const skillsTestQuestions\s*=\s*({[\s\S]*?});", content)
            if not match:
                logger.error("Could not locate skillsTestQuestions object in JS file")
                return []
            questions_str = match.group(1)
            # Normalize JS to JSON-like string
            questions_str = re.sub(r"(\w+)\s*:", r"\"\\1\":", questions_str)
            questions_str = questions_str.replace("'", '"')
            js_data = json.loads(questions_str)
            trade_questions = js_data.get(trade_category, [])
            # Convert to DB-like schema expected by routes
            formatted = []
            for q in trade_questions:
                formatted.append({
                    "id": str(uuid.uuid4()),
                    "trade_category": trade_category,
                    "question": q.get("question"),
                    "options": q.get("options", []),
                    "correct_answer": q.get("correct", 0),
                    "category": q.get("category", "General"),
                    "explanation": q.get("explanation", ""),
                    "difficulty": q.get("difficulty", "Medium"),
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "created_by": "system",
                    "is_active": True
                })
            return formatted
        except Exception as e:
            logger.error(f"Fallback load from JS failed for {trade_category}: {e}")
            return []
    
    async def add_skills_question(self, trade_category: str, question_data: dict):
        """Add a new skills test question"""
        try:
            question_doc = {
                "id": str(uuid.uuid4()),
                "trade_category": trade_category,
                "question": question_data.get('question'),
                "options": question_data.get('options', []),
                "correct_answer": question_data.get('correct_answer', 0),
                "category": question_data.get('category', 'General'),
                "explanation": question_data.get('explanation', ''),
                "difficulty": question_data.get('difficulty', 'Medium'),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": "admin",
                "is_active": True
            }
            
            result = await self.database.skills_questions.insert_one(question_doc)
            return question_doc['id']  # Return the UUID instead of ObjectId
        except Exception as e:
            print(f"Error adding skills question: {e}")
            return None
    
    async def update_skills_question(self, question_id: str, question_data: dict):
        """Update an existing skills test question"""
        try:
            update_data = {
                "question": question_data.get('question'),
                "options": question_data.get('options', []),
                "correct_answer": question_data.get('correct_answer', 0),
                "category": question_data.get('category', 'General'),
                "explanation": question_data.get('explanation', ''),
                "difficulty": question_data.get('difficulty', 'Medium'),
                "updated_at": datetime.now().isoformat()
            }
            
            result = await self.database.skills_questions.update_one(
                {"id": question_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating skills question: {e}")
            return False
    
    async def delete_skills_question(self, question_id: str):
        """Delete a skills test question"""
        try:
            result = await self.database.skills_questions.delete_one({"id": question_id})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting skills question: {e}")
            return False
    
    async def get_question_stats(self):
        """Get statistics about skills questions"""
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$trade_category",
                        "count": {"$sum": 1},
                        "active_count": {
                            "$sum": {"$cond": [{"$eq": ["$is_active", True]}, 1, 0]}
                        }
                    }
                }
            ]
            
            stats = await self.database.skills_questions.aggregate(pipeline).to_list(length=None)
            
            # Convert ObjectIds and structure the response
            result = {}
            for stat in stats:
                trade_name = stat['_id']
                result[trade_name] = {
                    'count': stat['count'],
                    'active_count': stat['active_count']
                }
            
            return result
        except Exception as e:
            print(f"Error getting question stats: {e}")
            return {}
    
    # Policy Management Methods
    async def get_all_policies(self):
        """Get all policies relevant for admin management"""
        try:
            policies = await self.database.policies.find(
                {"$or": [{"status": "active"}, {"status": "scheduled"}, {"status": "draft"}]}
            ).sort("policy_type", 1).to_list(length=None)
            
            # Convert ObjectIds to strings for JSON serialization
            for policy in policies:
                if '_id' in policy:
                    policy['_id'] = str(policy['_id'])
            
            return policies
        except Exception as e:
            print(f"Error getting policies: {e}")
            return []

    async def initialize_default_policies(self, created_by: str) -> int:
        """Initialize default core policies if missing"""
        try:
            created_count = 0
            now_iso = datetime.now().isoformat()
            defaults = [
                {
                    "policy_type": "privacy_policy",
                    "title": "Privacy Policy",
                    "content": """
Privacy Policy

This Privacy Policy explains how ServiceHub Limited ("ServiceHub", "we", "us", "our") collects, uses, shares, and protects personal data when you use our platforms and services. It is divided into two parts: Part A (Privacy Policy for Service Providers / Tradespeople) and Part B (Privacy Policy for Customers). If you use ServiceHub as both a Service Provider and a Customer, both parts apply to you.

1. DATA CONTROLLER DETAILS
ServiceHub Limited is the data controller responsible for personal data processed in connection with our services.
- Legal Name: ServiceHub Limited
- RC: 8905084
- Registered Address: 6, D Place Guest House, Off Omimi Link Road, Ekpan, Delta State, Nigeria
- Email: privacy@myservicehub.co
We process personal data in accordance with applicable data protection laws, including the Nigeria Data Protection Act (NDPA), the Nigeria Data Protection Regulation (NDPR), and other relevant regulations.

2. SCOPE OF THIS POLICY
This Policy applies to all users of the ServiceHub platform, including:
- Service Providers / Tradespeople who list, promote, or provide services via ServiceHub
- Customers (homeowners, tenants, landlords, businesses, or individuals) who request, book, or manage services via ServiceHub
It covers data collected through our website(s), mobile applications, communication channels (including email, calls, SMS, social media, chat), and any other digital tools or services we operate (the "Platform").

PART A: PRIVACY POLICY FOR SERVICE PROVIDERS / TRADESPEOPLE

A1. INTRODUCTION
This section applies to artisans, professionals, independent contractors, and companies who create a ServiceHub account or otherwise use ServiceHub to receive leads, connect with Customers, or promote their services. It explains what personal data we collect about you, how we use it, who we share it with, how long we keep it, and the rights you have.

A2. HOW WE COLLECT PERSONAL INFORMATION
1) Directly from you:
- When you register for an account or update your profile
- When you subscribe to plans, pay fees, or update billing details
- When you communicate with us via email, phone, chat, or support
- When you upload documents, portfolio items, or respond to Customer requests
2) Automatically when you use the Platform:
- Through cookies and similar technologies
- Through logs of access, device information, and in‑app activity
3) From third parties (where lawful):
- Identity verification and KYC providers
- Payment processors and financial partners
- Advertising and analytics providers
- Publicly available sources (e.g., corporate registries, professional listings)
- Customers who submit reviews, complaints, or references about your services
In some cases, we are legally or contractually required to collect certain information. If you do not provide it, we may not be able to open or maintain your account.

A3. WHAT WE COLLECT
1) Identification and Contact Information: full name; business name and trading name; date of birth (where required); phone number; email address; business/correspondence address.
2) Account and Profile Details: username; password; profile photo or logo; service categories, skills, qualifications; coverage areas and availability; portfolio images and descriptions.
3) Verification and Compliance Data: government‑issued ID; CAC or business registration documents; tax or regulatory identifiers; professional licences, certifications, insurance; references/guarantor details.
4) Financial and Transaction Data: bank account details for payouts (if applicable); records of payments made to ServiceHub (subscriptions, access/lead fees); invoices and transaction history.
5) Communications and Behavioural Data: messages exchanged with Customers via the Platform; emails, support tickets, dispute correspondence; response times, acceptance rates, completion records.
6) Technical and Usage Data: IP address; device type; operating system; browser type; login timestamps; app/website interactions; features used; activity logs used for security, analytics, and service optimisation.

A4. HOW WE USE YOUR PERSONAL INFORMATION AND LEGAL BASIS
- Identification, Verification & Authentication – to create your account, verify your identity, confirm eligibility, and secure access. Legal basis: performance of contract; legitimate interests (security, fraud prevention); legal obligation.
- Operating Our Services – to display your profile, provide you with leads, enquiries, and contact details of Customers who shortlist or hire you; to manage subscriptions, invoices, and payments. Legal basis: performance of contract.
- Improving Our Platform and Services – to monitor performance, run analytics, develop new features, and improve user experience; to understand how trades and leads perform to refine our matching systems. Legal basis: legitimate interests.
- Preventing Fraud and Ensuring Safety – to detect and prevent fake profiles, fee avoidance, abuse, and unsafe conduct; to enforce our Terms of Use and policies. Legal basis: legitimate interests; legal obligation.
- Communications – to send administrative messages (security alerts, policy updates, billing notices); to respond to your enquiries and support requests; to request feedback and conduct surveys. Legal basis: performance of contract; legitimate interests.
- Marketing – to send you relevant updates, offers, and educational content about using ServiceHub effectively; to create basic segments (e.g., by trade, location) to keep communications relevant; you can opt out at any time. Legal basis: legitimate interests; consent where required.
- Business Operations and Corporate Transactions – internal reporting, audits, risk management; in connection with any merger, acquisition, or restructuring under appropriate safeguards. Legal basis: legitimate interests.
- Legal & Regulatory Compliance – to comply with applicable laws, tax requirements, and regulatory requests; to cooperate with authorities and handle legal claims. Legal basis: legal obligation.

A5. ANONYMISED AND AGGREGATED DATA
We may anonymise or aggregate your personal data so that it can no longer be used to identify you. We may use such data for analytics, industry insights, service optimisation, and business reporting.

A6. HOW AND WHEN WE SHARE YOUR PERSONAL INFORMATION
We may share your personal data with:
- Customers – when you are shortlisted or hired, we share your name, business name, profile, and contact details so they can reach you.
- Other Users / Public – public elements of your profile (e.g., name, business name, services, coverage area, reviews, portfolio) may appear on the Platform and in search engine results.
- Service Providers and Processors – technology providers (hosting, storage, CRM), payment processors and billing partners, communication tools (SMS, email, in‑app messaging), analytics and marketing platforms. These parties act on our instructions and are bound by confidentiality and data protection obligations.
- Advertising Partners – limited, pseudonymised data (e.g., hashed email) to measure or deliver relevant advertising. These partners process data under their own privacy terms.
- Professional Advisers – lawyers, auditors, consultants where reasonably necessary.
- Regulators, Law Enforcement, and Legal Requests – where required by law or necessary to protect rights, safety, or prevent fraud.
- Corporate Transactions – in the event of a merger, acquisition, or asset transfer, subject to safeguards.
We do not sell your personal data.

A7. INTERNATIONAL DATA TRANSFERS
Some of our service providers or systems may be located outside Nigeria. Where your data is transferred internationally, we take reasonable steps to ensure an adequate level of protection, including contractual safeguards and security measures, in line with applicable data protection laws.

A8. INFORMATION SECURITY AND STORAGE
We implement technical and organisational measures designed to protect your data against unauthorised access, loss, misuse, or disclosure. We retain your personal data for as long as: your account is active; necessary to fulfil the purposes described in this Policy; required by law (e.g., tax, accounting, regulatory); needed to resolve disputes, enforce our terms, or prevent fraud. Certain limited records (e.g., blocked or banned accounts) may be retained to protect the integrity of the Platform.

A9. YOUR RIGHTS AS A SERVICE PROVIDER
Subject to applicable law, you may have the right to request access; request correction; request deletion where legally permissible; object to or restrict certain processing (including direct marketing); request data portability where applicable; withdraw consent where processing is based on consent. You can exercise these rights by contacting privacy@myservicehub.co. We may request additional information to verify your identity. If dissatisfied, you may lodge a complaint with the Nigeria Data Protection Commission (NDPC).

PART B: PRIVACY POLICY FOR CUSTOMERS

B1. INTRODUCTION
This section applies to individuals and organisations who use ServiceHub to request, book, or manage services, including homeowners, tenants, landlords, property managers, and businesses. It explains how we collect and use your personal information when you interact with Service Providers via our Platform.

B2. HOW WE COLLECT PERSONAL INFORMATION
1) Direct interactions – when you create an account or submit a job request; communicate with Service Providers through the Platform; contact us via email, chat, or phone; submit reviews, ratings, or feedback.
2) Automated means – through cookies and similar technologies when you browse or use our Platform; via logs of device and usage information.
3) Third parties – analytics and marketing platforms; Service Providers who update us on job status or outcomes.

B3. WHAT WE COLLECT
- Identification and Contact Information – name, phone number, email address.
- Account and Usage Details – login details and preferences; records of jobs posted, viewed, or managed via the Platform.
- Job and Property Details – type of work requested; job description, budget range, timing; approximate or full job location (as provided by you).
- Media and Content – photos or videos you upload relating to the requested work or reviews.
- Communications – messages with Service Providers and support; call notes or summaries where applicable.
- Technical and Analytics Data – IP address; device and browser information; pages visited; actions taken; referral sources.

B4. HOW WE USE YOUR PERSONAL INFORMATION AND LEGAL BASIS
- Offering and Operating Our Services – create/manage your account; allow you to post jobs; connect you with suitable Service Providers and manage bookings. Legal basis: performance of contract.
- Communication – send confirmations, alerts, updates about your jobs and account; respond to enquiries, support requests, disputes. Legal basis: performance of contract; legitimate interests.
- Customising Your Experience – show relevant Service Providers based on your needs and location; improve search results and recommendations. Legal basis: legitimate interests.
- Marketing – send information about ServiceHub features, tips, and promotions (where permitted); tailor messages based on Platform use. You may opt out at any time. Legal basis: legitimate interests; consent where required.
- Reviews and Platform Integrity – enable you to leave feedback; publish reviews to help other users; detect and manage misuse or fake content. Legal basis: legitimate interests.
- Fraud Prevention, Security and Legal Compliance – protect users from scams, abuse, and unauthorised activity; enforce our Terms of Use; comply with legal obligations. Legal basis: legitimate interests; legal obligations.

B5. ANONYMISED AND AGGREGATED DATA
We may anonymise or aggregate Customer data and use it for analytics, service improvement, and business reporting, without identifying you.

B6. HOW AND WHEN WE SHARE YOUR PERSONAL INFORMATION
We may share your information with Service Providers (when you shortlist, invite, or hire, we share your name, contact details, and relevant job information), technical/operational providers (hosting, communications, analytics, payments), advertising/analytics partners (limited data), regulators and law enforcement (where required), and in corporate transactions under safeguards. We do not sell your personal data.

B7. INTERNATIONAL DATA TRANSFERS
Where data is transferred or stored outside Nigeria, we take steps to ensure it is protected with appropriate safeguards, in line with applicable laws.

B8. INFORMATION SECURITY, RETENTION AND YOUR RIGHTS
We use reasonable security measures to protect your data. We retain personal data only as long as necessary to provide services, meet legal and regulatory requirements, resolve disputes, and enforce agreements. As a Customer, you may request access, correction, deletion (where lawful), object/restrict certain processing (including direct marketing), withdraw consent where applicable. Contact privacy@myservicehub.co to exercise rights. You may complain to NDPC.

9. CHANGES TO THIS PRIVACY POLICY
We may update this Privacy Policy from time to time. When we make material changes, we will notify you via the Platform, email, or other appropriate means. Your continued use of ServiceHub after the effective date of any update constitutes your acceptance of the revised Policy.

See also: Cookie Policy and Contact page on our website.
""",
                },
                {
                    "policy_type": "terms_of_service",
                    "title": "Terms and Conditions",
                    "content": """
Terms and Conditions
Effective Date: 1 January 2026 | Version: 1.0

1. INTRODUCTION & LEGAL FRAMEWORK
Welcome to ServiceHub Limited also known as myservicehub ("ServiceHub", "we", "our", "us"). These Terms govern use of the ServiceHub online marketplace and mobile/web services that connect Customers (homeowners and businesses) with verified Service Providers (artisans, professionals, and companies) across Nigeria. By accessing or using the ServiceHub Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform. Governing Laws & Standards include CAMA, NDPA/NDPR, VAT Act, FIRS regulations, CAC rules, and other applicable Nigerian laws and regulations.

2. KEY DEFINITIONS
Agreement; Customer; Service Provider; ServiceHub Platform; Job; Lead; Shortlist/Shortlisted; Lead Access Fee; Account Credit; Service Agreement; Content; Feedback; VAT.

3. ACCOUNTS, ELIGIBILITY & VERIFICATION
Creating an account requires accurate information. Keep details current. We may request documents to verify identity, trade competence, addresses, tax status and compliance. Non-compliance may lead to suspension. Nigeria-only service scope. Data & Compliance Checks for onboarding, fraud prevention, dispute handling, and legal/regulatory compliance.

4. PLATFORM USE, SECURITY & ACCEPTABLE CONDUCT
Use the Platform lawfully. Do not upload illegal, abusive, defamatory, or misleading Content. Protect your credentials; notify suspected compromise immediately. Prohibited: reverse‑engineering; scraping; automated harvesting; multiple accounts without consent; fee avoidance; using data to train AI models; building competing services with Platform data. Availability may be affected by maintenance/security.

5. INTELLECTUAL PROPERTY & BRANDING
ServiceHub owns or licenses Platform IP. Limited licence to access/use per these Terms. While active, you may reference “ServiceHub Verified” badges. Upon termination, remove ServiceHub branding within 28 days. You grant ServiceHub a non‑exclusive, royalty‑free licence to host/display/use your profile Materials to operate/improve the Platform, advertise services, analytics and safety. Goodwill remains yours.

6. DATA PROTECTION & PRIVACY (NDPA/NDPR)
ServiceHub and each user act as independent data controllers for their own processing. We process data under NDPA and NDPR. See the ServiceHub Privacy Policy for rights of access/rectification/erasure/objection, security, breach notification. If you receive personal data via the Platform, use it only for agreed service purposes, keep it secure, do not share beyond necessity, assist with data‑subject requests, and notify ServiceHub promptly of any breach.

PART A — SERVICE PROVIDER TERMS & CONDITIONS
A1. Eligibility & Conduct: legitimate business/sole trader in Nigeria; licences/insurances; honour commitments; only offer services you are qualified to perform; meet quality standards and our Reviews Policy.
A2. Leads, Shortlisting & Contact Details: when Shortlisted, ServiceHub shares Customer contact details.
A3. Lead Access Fees (No Commission Model): non‑refundable fee per Shortlisting, exclusive of VAT; varies by trade, value, location.
A4. Payment & Invoicing: invoices issued for accrued fees; due upon issue; you authorise card auto‑debit; late payments may attract interest; overdue accounts may be suspended.
A5. Anti‑Circumvention: do not exchange contact details or direct Customers off‑platform to avoid fees; breach may result in suspension/termination and recovery of losses.
A6. Service Agreements & Liability: ServiceHub is not a party. You are responsible for tax, compliance, warranty obligations and safety.
A7. Feedback & Reviews: Customers may leave Feedback once work begins or payment occurs; you may respond; no fake/paid/misleading reviews; we may remove fraudulent/policy‑breaching Feedback.
A8. Account Credit: non‑cash, non‑transferable credit may be issued; auto‑applies to Lead Access Fees.

PART B — CUSTOMER TERMS & CONDITIONS
B1. Posting Jobs: describe needs accurately; no offensive content or external contact details in postings.
B2. Reviewing Providers: check profiles, qualifications, insurance and Feedback; ServiceHub does not guarantee availability, quality, timing or legality.
B3. Service Agreements: agreements are solely between you and the Service Provider; verify identity, licences, scope, pricing and warranties before hiring.
B4. Feedback: post honest, respectful Feedback after work starts or payment; no defamatory, abusive, discriminatory, or doxxing content; we may remove policy‑breaching Feedback.

7. DISCOVERY & RANKING TRANSPARENCY
We rank profiles using relevance, proximity, Customer Feedback, recent activity/responsiveness and limited randomisation. Fees do not buy better rank.

8. CONTENT RULES & MODERATION
Users are responsible for their Content. We may monitor, remove or alter Content that breaches these Terms, law, or our policies.

9. PAYMENTS, TAXES & RECORDS
Service Providers must maintain accurate tax/VAT records and comply with FIRS obligations. Keep your own copies of invoices and records.

10. LIABILITY & INDEMNITIES
Platform Liability (ServiceHub) limited as permitted by law; ServiceHub is not liable for indirect/consequential losses or disputes between Customers and Providers; the Platform is provided “as is”. Provider Indemnity: Service Providers indemnify ServiceHub against third‑party claims arising from their services, Content, misrepresentations, or legal non‑compliance.

11. SUSPENSION, TERMINATION & CHANGES
We may suspend/terminate accounts for breach, fraud, legal/security risks, serious negative Feedback trends, or non‑payment. We typically provide notice except where urgent action is required. You may stop using the Platform; Providers remain liable for accrued fees and issued invoices. We may update these Terms; continued use after effective date constitutes acceptance.

12. COMPLAINTS & DISPUTE RESOLUTION
Contact: privacy@myservicehub.co. If unresolved within 14 days, disputes may be referred to mediation, and thereafter binding arbitration at the Lagos Multi‑Door Courthouse (LMDC) under the Arbitration and Mediation Act 2023.

13. GENERAL TERMS
Force Majeure; Assignment; Entire Agreement; No Third‑Party Rights; Severability & Waiver; Notices via electronic communications.

14. GOVERNING LAW & JURISDICTION
Governed by the laws of the Federal Republic of Nigeria. Subject to clause 12, courts of competent jurisdiction in Nigeria have jurisdiction.

15. APPROVAL
Approved by the Board of Directors — SERVICEHUB LIMITED (RC 8905084)
""",
                },
                {
                    "policy_type": "cookie_policy",
                    "title": "Cookie Policy",
                    "content": """
Cookie Policy

This Cookie Policy explains what cookies are, how we use them, and how you can manage your cookie preferences on ServiceHub.

What Are Cookies?
Cookies are small text files stored on your device to remember information about your visit and help websites function properly.

Types of Cookies We Use
- Strictly Necessary – required for essential features like authentication.
- Functional – remember preferences and improve your experience.
- Analytics – help us understand usage to improve the platform.
- Marketing – used to show relevant content and promotions.

Managing Cookies
You can manage cookies through your browser settings. Disabling certain cookies may affect site functionality. For privacy details, see our Privacy Policy.

Updates
We may update this Cookie Policy to reflect changes in technology or regulations. If you have questions, contact us via the Contact page.
""",
                },
            ]

            for item in defaults:
                existing = await self.database.policies.find_one({
                    "policy_type": item["policy_type"],
                    "status": "active",
                })
                if existing:
                    continue
                doc = {
                    "id": str(uuid.uuid4()),
                    "policy_type": item["policy_type"],
                    "title": item["title"],
                    "content": item["content"],
                    "status": "active",
                    "version": 1,
                    "effective_date": now_iso,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "created_by": created_by,
                    "notes": "Initialized default policy",
                }
                res = await self.database.policies.insert_one(doc)
                if res.inserted_id:
                    created_count += 1
            return created_count
        except Exception as e:
            print(f"Error initializing default policies: {e}")
            return 0
    
    async def get_policy_by_type(self, policy_type: str):
        """Get current active policy by type"""
        try:
            policy = await self.database.policies.find_one({
                "policy_type": policy_type,
                "status": "active"
            })
            
            if policy and '_id' in policy:
                policy['_id'] = str(policy['_id'])
            
            return policy
        except Exception as e:
            print(f"Error getting policy {policy_type}: {e}")
            return None
    
    async def get_policy_by_id(self, policy_id: str):
        """Get policy by ID"""
        try:
            policy = await self.database.policies.find_one({"id": policy_id})
            
            if policy and '_id' in policy:
                policy['_id'] = str(policy['_id'])
            
            return policy
        except Exception as e:
            print(f"Error getting policy {policy_id}: {e}")
            return None
    
    async def create_policy(self, policy_data: dict, created_by: str):
        """Create a new policy version"""
        try:
            # Check if there's an existing active policy of this type
            existing_policy = await self.database.policies.find_one({
                "policy_type": policy_data["policy_type"],
                "status": "active"
            })
            
            # Get next version number
            version = 1
            if existing_policy:
                # Archive the existing active policy
                await self.archive_policy(existing_policy["id"], created_by)
                version = existing_policy.get("version", 0) + 1
            
            # Determine status based on effective_date
            status = "draft"
            if policy_data.get("effective_date"):
                effective_date = policy_data["effective_date"]
                if isinstance(effective_date, str):
                    effective_date = datetime.fromisoformat(effective_date.replace('Z', '+00:00'))
                
                if effective_date <= datetime.now():
                    status = "active"
                else:
                    status = "scheduled"
            else:
                status = "active"  # Immediate activation if no date specified
            
            policy_doc = {
                "id": str(uuid.uuid4()),
                "policy_type": policy_data["policy_type"],
                "title": policy_data["title"],
                "content": policy_data["content"],
                "status": status,
                "version": version,
                "effective_date": policy_data.get("effective_date"),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": created_by,
                "notes": policy_data.get("notes", "")
            }
            
            result = await self.database.policies.insert_one(policy_doc)
            
            if result.inserted_id:
                return policy_doc["id"]
            return None
            
        except Exception as e:
            print(f"Error creating policy: {e}")
            return None
    
    async def update_policy(self, policy_id: str, policy_data: dict, updated_by: str):
        """Update an existing policy"""
        try:
            existing_policy = await self.get_policy_by_id(policy_id)
            if not existing_policy:
                return False

            # Determine effective date (prefer incoming value)
            effective_date_val = policy_data.get("effective_date", existing_policy.get("effective_date"))
            parsed_effective_date = None
            if effective_date_val:
                parsed_effective_date = effective_date_val
                if isinstance(parsed_effective_date, str):
                    parsed_effective_date = datetime.fromisoformat(parsed_effective_date.replace('Z', '+00:00'))

            # Compute status based on provided status or effective date
            status_val = policy_data.get("status")
            if not status_val and parsed_effective_date:
                status_val = "active" if parsed_effective_date <= datetime.now() else "scheduled"
            if not status_val:
                status_val = existing_policy.get("status", "active")

            now_iso = datetime.now().isoformat()

            # If current version is active, archive and create a complete new version document
            if existing_policy.get("status") == "active":
                await self.archive_policy(policy_id, updated_by)

                new_doc = {
                    "id": str(uuid.uuid4()),
                    "policy_type": existing_policy.get("policy_type"),
                    "title": policy_data.get("title", existing_policy.get("title")),
                    "content": policy_data.get("content", existing_policy.get("content")),
                    "status": status_val,
                    "version": (existing_policy.get("version", 1) + 1),
                    "effective_date": effective_date_val,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "created_by": updated_by,
                    "notes": policy_data.get("notes", existing_policy.get("notes", ""))
                }

                result = await self.database.policies.insert_one(new_doc)
                return result.inserted_id is not None

            # Otherwise, update in place for non-active versions
            update_data = {
                "updated_at": now_iso
            }
            if "title" in policy_data:
                update_data["title"] = policy_data["title"]
            if "content" in policy_data:
                update_data["content"] = policy_data["content"]
            if "notes" in policy_data:
                update_data["notes"] = policy_data["notes"]
            # effective_date and status updates
            update_data["effective_date"] = effective_date_val
            update_data["status"] = status_val

            result = await self.database.policies.update_one(
                {"id": policy_id},
                {"$set": update_data}
            )
            return result.modified_count > 0

        except Exception as e:
            print(f"Error updating policy {policy_id}: {e}")
            return False
    
    async def archive_policy(self, policy_id: str, archived_by: str):
        """Archive a policy (move to history)"""
        try:
            policy = await self.get_policy_by_id(policy_id)
            if not policy:
                return False
            
            # Create history record
            history_doc = {
                "policy_id": policy["id"],
                "policy_type": policy["policy_type"],
                "title": policy["title"],
                "content": policy["content"],
                "version": policy["version"],
                "effective_date": policy.get("effective_date"),
                "created_at": policy["created_at"],
                "created_by": policy["created_by"],
                "notes": policy.get("notes", ""),
                "archived_at": datetime.now().isoformat(),
                "archived_by": archived_by
            }
            
            # Insert into history collection
            await self.database.policy_history.insert_one(history_doc)
            
            # Update policy status to archived
            result = await self.database.policies.update_one(
                {"id": policy_id},
                {"$set": {"status": "archived", "updated_at": datetime.now().isoformat()}}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Error archiving policy {policy_id}: {e}")
            return False
    
    async def get_policy_history(self, policy_type: str):
        """Get version history for a policy type"""
        try:
            history = await self.database.policy_history.find(
                {"policy_type": policy_type}
            ).sort("version", -1).to_list(length=None)
            
            # Convert ObjectIds to strings for JSON serialization
            for record in history:
                if '_id' in record:
                    record['_id'] = str(record['_id'])
            
            return history
        except Exception as e:
            print(f"Error getting policy history for {policy_type}: {e}")
            return []
    
    async def restore_policy_version(self, policy_type: str, version: int, restored_by: str):
        """Restore a specific version of a policy"""
        try:
            # Get the version from history
            history_record = await self.database.policy_history.find_one({
                "policy_type": policy_type,
                "version": version
            })
            
            if not history_record:
                return None
            
            # Archive current active policy
            current_policy = await self.get_policy_by_type(policy_type)
            if current_policy:
                await self.archive_policy(current_policy["id"], restored_by)
            
            # Create new policy from history
            new_version = current_policy["version"] + 1 if current_policy else 1
            
            policy_doc = {
                "id": str(uuid.uuid4()),
                "policy_type": history_record["policy_type"],
                "title": history_record["title"],
                "content": history_record["content"],
                "status": "active",
                "version": new_version,
                "effective_date": None,  # Restore immediately
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "created_by": restored_by,
                "notes": f"Restored from version {version}"
            }
            
            result = await self.database.policies.insert_one(policy_doc)
            
            if result.inserted_id:
                return policy_doc["id"]
            return None
            
        except Exception as e:
            print(f"Error restoring policy version: {e}")
            return None
    
    async def delete_policy(self, policy_id: str):
        """Delete a policy (only drafts can be deleted)"""
        try:
            policy = await self.get_policy_by_id(policy_id)
            if not policy or policy["status"] != "draft":
                return False
            
            result = await self.database.policies.delete_one({"id": policy_id})
            return result.deleted_count > 0
            
        except Exception as e:
            print(f"Error deleting policy {policy_id}: {e}")
            return False
    
    async def activate_scheduled_policies(self):
        """Activate policies that have reached their effective date (for background task)"""
        try:
            current_time = datetime.now()
            
            # Find scheduled policies with effective_date <= now
            scheduled_policies = await self.database.policies.find({
                "status": "scheduled",
                "effective_date": {"$lte": current_time.isoformat()}
            }).to_list(length=None)
            
            activated_count = 0
            
            for policy in scheduled_policies:
                # Archive any existing active policy of the same type
                existing_active = await self.database.policies.find_one({
                    "policy_type": policy["policy_type"],
                    "status": "active"
                })
                
                if existing_active:
                    await self.archive_policy(existing_active["id"], "system")
                
                # Activate the scheduled policy
                await self.database.policies.update_one(
                    {"id": policy["id"]},
                    {"$set": {"status": "active", "updated_at": current_time.isoformat()}}
                )
                
                activated_count += 1
            
            return activated_count
            
        except Exception as e:
            print(f"Error activating scheduled policies: {e}")
            return 0
    
    # Contact Management Methods
    async def get_all_contacts(self):
        """Get all contacts grouped by type"""
        try:
            contacts = await self.database.contacts.find(
                {"is_active": True}
            ).sort([("contact_type", 1), ("display_order", 1)]).to_list(length=None)
            
            # Convert ObjectIds to strings for JSON serialization
            for contact in contacts:
                if '_id' in contact:
                    contact['_id'] = str(contact['_id'])
            
            return contacts
        except Exception as e:
            print(f"Error getting contacts: {e}")
            return []
    
    async def get_contacts_by_type(self, contact_type: str):
        """Get contacts by specific type"""
        try:
            contacts = await self.database.contacts.find({
                "contact_type": contact_type,
                "is_active": True
            }).sort("display_order", 1).to_list(length=None)
            
            # Convert ObjectIds to strings for JSON serialization
            for contact in contacts:
                if '_id' in contact:
                    contact['_id'] = str(contact['_id'])
            
            return contacts
        except Exception as e:
            print(f"Error getting contacts by type {contact_type}: {e}")
            return []
    
    async def get_contact_by_id(self, contact_id: str):
        """Get contact by ID"""
        try:
            contact = await self.database.contacts.find_one({"id": contact_id})
            
            if contact and '_id' in contact:
                contact['_id'] = str(contact['_id'])
            
            return contact
        except Exception as e:
            print(f"Error getting contact {contact_id}: {e}")
            return None
    
    async def create_contact(self, contact_data: dict, created_by: str):
        """Create a new contact"""
        try:
            contact_doc = {
                "id": str(uuid.uuid4()),
                "contact_type": contact_data["contact_type"],
                "label": contact_data["label"],
                "value": contact_data["value"],
                "is_active": contact_data.get("is_active", True),
                "display_order": contact_data.get("display_order", 0),
                "notes": contact_data.get("notes", ""),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "updated_by": created_by
            }
            
            result = await self.database.contacts.insert_one(contact_doc)
            
            if result.inserted_id:
                return contact_doc["id"]
            return None
            
        except Exception as e:
            print(f"Error creating contact: {e}")
            return None
    
    async def update_contact(self, contact_id: str, contact_data: dict, updated_by: str):
        """Update an existing contact"""
        try:
            update_data = {
                "updated_at": datetime.now().isoformat(),
                "updated_by": updated_by
            }
            
            # Update fields if provided
            if "label" in contact_data:
                update_data["label"] = contact_data["label"]
            if "value" in contact_data:
                update_data["value"] = contact_data["value"]
            if "is_active" in contact_data:
                update_data["is_active"] = contact_data["is_active"]
            if "display_order" in contact_data:
                update_data["display_order"] = contact_data["display_order"]
            if "notes" in contact_data:
                update_data["notes"] = contact_data["notes"]
            
            result = await self.database.contacts.update_one(
                {"id": contact_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"Error updating contact {contact_id}: {e}")
            return False
    
    async def delete_contact(self, contact_id: str):
        """Delete a contact"""
        try:
            result = await self.database.contacts.delete_one({"id": contact_id})
            return result.deleted_count > 0
            
        except Exception as e:
            print(f"Error deleting contact {contact_id}: {e}")
            return False
    
    async def get_public_contacts(self):
        """Get public contacts for website display (organized by type)"""
        try:
            contacts = await self.get_all_contacts()
            
            # Group contacts by type for easy frontend consumption
            contacts_by_type = {}
            for contact in contacts:
                contact_type = contact["contact_type"]
                if contact_type not in contacts_by_type:
                    contacts_by_type[contact_type] = []
                contacts_by_type[contact_type].append({
                    "label": contact["label"],
                    "value": contact["value"],
                    "display_order": contact["display_order"]
                })
            
            # Sort each type by display_order
            for contact_type in contacts_by_type:
                contacts_by_type[contact_type].sort(key=lambda x: x["display_order"])
            
            return contacts_by_type
            
        except Exception as e:
            print(f"Error getting public contacts: {e}")
            return {}
    
    async def initialize_default_contacts(self):
        """Initialize default contact information for any missing types"""
        try:
            # Default contact information
            default_contacts = [
                {
                    "contact_type": "phone_support",
                    "label": "Customer Support",
                    "value": "+234 901 234 5678",
                    "is_active": True,
                    "display_order": 1,
                    "notes": "Primary customer support line"
                },
                {
                    "contact_type": "phone_business",
                    "label": "Business Line",
                    "value": "+234 901 234 5679",
                    "is_active": True,
                    "display_order": 2,
                    "notes": "Business inquiries and partnerships"
                },
                {
                    "contact_type": "email_support",
                    "label": "Support Email",
                    "value": "support@servicehub.ng",
                    "is_active": True,
                    "display_order": 1,
                    "notes": "Customer support and technical issues"
                },
                {
                    "contact_type": "email_business",
                    "label": "Business Email",
                    "value": "business@servicehub.ng",
                    "is_active": True,
                    "display_order": 2,
                    "notes": "Business partnerships and corporate inquiries"
                },
                {
                    "contact_type": "address_office",
                    "label": "Head Office",
                    "value": "123 Tech District, Victoria Island, Lagos, Nigeria",
                    "is_active": True,
                    "display_order": 1,
                    "notes": "Main office location"
                },
                {
                    "contact_type": "social_facebook",
                    "label": "Facebook",
                    "value": "https://facebook.com/servicehubng",
                    "is_active": True,
                    "display_order": 1,
                    "notes": "Official Facebook page"
                },
                {
                    "contact_type": "social_instagram",
                    "label": "Instagram",
                    "value": "https://instagram.com/servicehubng",
                    "is_active": True,
                    "display_order": 2,
                    "notes": "Official Instagram account"
                },
                {
                    "contact_type": "social_youtube",
                    "label": "YouTube",
                    "value": "https://youtube.com/@servicehubng",
                    "is_active": True,
                    "display_order": 3,
                    "notes": "Official YouTube channel"
                },
                {
                    "contact_type": "social_twitter",
                    "label": "Twitter",
                    "value": "https://x.com/myservice_hub",
                    "is_active": True,
                    "display_order": 4,
                    "notes": "Official Twitter account"
                },
                {
                    "contact_type": "website_url",
                    "label": "Website",
                    "value": "https://servicehub.ng",
                    "is_active": True,
                    "display_order": 1,
                    "notes": "Main website URL"
                },
                {
                    "contact_type": "business_hours",
                    "label": "Business Hours",
                    "value": "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed",
                    "is_active": True,
                    "display_order": 1,
                    "notes": "Standard operating hours"
                }
            ]
            
            # Get existing contact types
            existing_contacts_docs = await self.database.contacts.find({}, {"contact_type": 1}).to_list(None)
            existing_types = {c["contact_type"] for c in existing_contacts_docs}
            
            # Filter to only missing contacts
            contacts_to_add = [c for c in default_contacts if c["contact_type"] not in existing_types]
            
            if not contacts_to_add:
                print("All default contact types already exist")
                return
            
            # Insert missing default contacts
            for contact_data in contacts_to_add:
                await self.create_contact(contact_data, "system")
            
            print(f"Initialized {len(contacts_to_add)} default contact(s)")
            
        except Exception as e:
            print(f"Error initializing default contacts: {e}")

    # ==========================================
    # ADMIN NOTIFICATION MANAGEMENT METHODS
    # ==========================================
    
    @time_it
    async def get_admin_notifications(self, filters: dict = None, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get notifications for admin management with filtering (optimized)"""
        query = filters or {}
        
        cursor = self.notifications_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        
        if not docs:
            return []

        # 1. Batch fetch user info
        user_ids = {doc["user_id"] for doc in docs if doc.get("user_id")}
        user_map = {}
        if user_ids:
            users_list = await self.database.users.find({"id": {"$in": list(user_ids)}}).to_list(length=len(user_ids))
            user_map = {u["id"]: u for u in users_list if "id" in u}

        notifications = []
        for doc in docs:
            # Get user info from map
            uid = doc.get("user_id")
            user = user_map.get(uid) if uid else None
            
            notification = {
                "id": str(doc["_id"]),
                "user_id": uid,
                "user_name": user.get("name", "Unknown") if user else "Unknown",
                "user_email": user.get("email", "Unknown") if user else "Unknown",
                "user_public_id": user.get("public_id") if user else None,
                "user_short_id": user.get("user_id") if user else None,
                "type": doc["type"],
                "channel": doc["channel"],
                "status": doc["status"],
                "subject": doc.get("subject", ""),
                "content": doc.get("content", "")[:100] + "..." if len(doc.get("content", "")) > 100 else doc.get("content", ""),
                "recipient_email": doc.get("recipient_email"),
                "recipient_phone": doc.get("recipient_phone"),
                "created_at": doc["created_at"],
                "sent_at": doc.get("sent_at"),
                "delivered_at": doc.get("delivered_at"),
                "metadata": doc.get("metadata", {})
            }
            notifications.append(notification)
        
        return notifications
    
    async def get_notifications_count(self, filters: dict = None) -> int:
        """Get count of notifications matching filters"""
        query = filters or {}
        return await self.notifications_collection.count_documents(query)

    async def get_notification_status_counts(self, filters: dict = None) -> Dict[str, int]:
        query = filters or {}
        pipeline = [{"$match": query}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        status_counts: Dict[str, int] = {}
        async for doc in self.notifications_collection.aggregate(pipeline):
            status_counts[doc.get("_id")] = int(doc.get("count", 0))
        total = await self.notifications_collection.count_documents(query)
        sent_total = status_counts.get("sent", 0) + status_counts.get("delivered", 0)
        failed_total = status_counts.get("failed", 0)
        pending_total = status_counts.get("pending", 0)
        return {
            "total_notifications": int(total),
            "sent_count": int(sent_total),
            "failed_count": int(failed_total),
            "pending_count": int(pending_total),
        }
    
    async def get_notification_by_id(self, notification_id: str) -> Optional[dict]:
        """Get detailed notification by ID"""
        try:
            from bson import ObjectId
            from bson.errors import InvalidId
            # Notifications use UUID strings as _id, not ObjectIds
            doc = None
            try:
                # Try ObjectId first (for backwards compatibility)
                query = {"_id": ObjectId(notification_id)}
                doc = await self.notifications_collection.find_one(query)
            except (InvalidId, ValueError, TypeError):
                # If not an ObjectId, try as string (UUID)
                doc = await self.notifications_collection.find_one({"_id": notification_id})
            
            if doc:
                # Get user info
                user = await self.get_user_by_id(doc["user_id"])
                
                notification = {
                    "id": str(doc["_id"]),
                    "user_id": doc["user_id"],
                    "user_name": user.get("name", "Unknown") if user else "Unknown",
                    "user_email": user.get("email", "Unknown") if user else "Unknown",
                    "user_role": user.get("role", "Unknown") if user else "Unknown",
                    "user_public_id": user.get("public_id") if user else None,
                    "user_short_id": user.get("user_id") if user else None,
                    "type": doc["type"],
                    "channel": doc["channel"],
                    "status": doc["status"],
                    "subject": doc.get("subject", ""),
                    "content": doc.get("content", ""),
                    "recipient_email": doc.get("recipient_email"),
                    "recipient_phone": doc.get("recipient_phone"),
                    "created_at": doc["created_at"],
                    "sent_at": doc.get("sent_at"),
                    "delivered_at": doc.get("delivered_at"),
                    "metadata": doc.get("metadata", {}),
                    "admin_notes": doc.get("admin_notes", "")
                }
                return notification
        except Exception as e:
            logger.error(f"Error getting notification {notification_id}: {str(e)}")
        
        return None
    
    async def update_notification_status_admin(self, notification_id: str, status: str, admin_notes: str = "") -> bool:
        """Update notification status with admin notes"""
        try:
            from bson import ObjectId
            from bson.errors import InvalidId
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow(),
                "admin_notes": admin_notes
            }
            
            if status == "sent":
                update_data["sent_at"] = datetime.utcnow()
            elif status == "delivered":
                update_data["delivered_at"] = datetime.utcnow()
            
            # Notifications use UUID strings as _id, not ObjectIds
            try:
                # Try ObjectId first (for backwards compatibility)
                query = {"_id": ObjectId(notification_id)}
            except (InvalidId, ValueError, TypeError):
                # If not an ObjectId, try as string (UUID)
                query = {"_id": notification_id}
            
            result = await self.notifications_collection.update_one(query, {"$set": update_data})
            # Consider success if a document was matched, even if no fields changed
            try:
                return bool(getattr(result, "matched_count", 0) > 0)
            except Exception:
                return bool(getattr(result, "modified_count", 0) > 0)
        except Exception as e:
            logger.error(f"Error updating notification status: {str(e)}")
            return False
    
    async def resend_notification(self, notification_id: str) -> bool:
        """Resend a notification immediately and update its record"""
        try:
            from bson import ObjectId
            from bson.errors import InvalidId
            # Lazy import with package-safe fallback
            try:
                from .models.notifications import NotificationType
                from .services.notifications import notification_service
            except ImportError:
                from models.notifications import NotificationType
                from services.notifications import notification_service

            # Fetch original notification document
            # Notifications use UUID strings as _id, not ObjectIds
            doc = None
            try:
                # Try ObjectId first (for backwards compatibility)
                doc = await self.notifications_collection.find_one({"_id": ObjectId(notification_id)})
            except (InvalidId, ValueError, TypeError):
                # If not an ObjectId, try as string (UUID)
                try:
                    doc = await self.notifications_collection.find_one({"_id": notification_id})
                except Exception as e2:
                    logger.error(f"Error querying notification with ID: {notification_id}, error: {e2}")
                    return False
            
            if not doc:
                logger.error(f"Notification not found: {notification_id}")
                return False

            user_id = doc.get("user_id")
            if not user_id:
                logger.error(f"Notification {notification_id} has no user_id; cannot resend")
                return False
            
            logger.info(f"Resending notification {notification_id} for user_id: {user_id}")
                
            user = await self.get_user_by_id(user_id)
            # Fallback: try to find user by email if ID lookup fails
            if not user:
                recipient_email_from_doc = doc.get("recipient_email")
                if recipient_email_from_doc:
                    logger.warning(f"User not found by ID {user_id}, trying email lookup: {recipient_email_from_doc}")
                    user = await self.get_user_by_email(recipient_email_from_doc)
                    if user:
                        logger.info(f"Found user by email: {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
                        # Update user_id to match found user
                        user_id = user.get('id') or user.get('user_id') or user_id
            if not user:
                logger.error(f"User not found for notification {notification_id}, user_id: {user_id}")
                return False
            
            logger.info(f"Found user: {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
                
            prefs = await self.get_user_notification_preferences(user_id)
            if not prefs:
                logger.warning(f"No preferences found for user {user_id}, creating defaults")
                prefs = NotificationPreferences(
                    id=str(uuid.uuid4()),
                    user_id=user_id
                )
                await self.create_notification_preferences(prefs)

            # Prepare resend parameters
            metadata = doc.get("metadata", {})
            if not metadata:
                logger.warning(f"Notification {notification_id} has no metadata, using empty dict")
                metadata = {}
            
            recipient_email = doc.get("recipient_email") or (user.get("email") if user else None)
            recipient_phone = doc.get("recipient_phone") or (user.get("phone") if user else None)
            
            logger.info(f"Recipient email: {recipient_email}, phone: {recipient_phone}")
            
            if not recipient_email and not recipient_phone:
                logger.error(f"Notification {notification_id} has no recipient email or phone; cannot resend")
                return False
            
            # Coerce type to enum - MUST be NotificationType enum, not string
            nt = doc.get("type")
            logger.info(f"Notification type from doc: {nt} (type: {type(nt)})")
            
            notification_type = None
            if nt:
                # If it's already a NotificationType enum instance
                if isinstance(nt, NotificationType):
                    notification_type = nt
                # If it's a string, try to convert to enum
                elif isinstance(nt, str):
                    try:
                        notification_type = NotificationType(nt)
                        logger.info(f"Converted string '{nt}' to NotificationType enum: {notification_type}")
                    except (ValueError, KeyError) as e:
                        logger.error(f"Failed to convert notification type string '{nt}' to enum: {e}")
                        logger.error(f"Valid NotificationType values are: {[e.value for e in NotificationType]}")
                        return False
                else:
                    logger.error(f"Notification type is unexpected type: {type(nt)}, value: {nt}")
                    return False
            else:
                logger.error(f"Notification {notification_id} has no type field")
                return False
                
            if not notification_type:
                logger.error(f"Notification {notification_id} has no valid type; cannot resend")
                return False
            
            logger.info(f"Proceeding to resend notification {notification_id} with type {notification_type.value}")

            # Perform send
            try:
                notification = await notification_service.send_notification(
                    user_id=user_id,
                    notification_type=notification_type,
                    template_data=metadata,
                    user_preferences=prefs,
                    recipient_email=recipient_email,
                    recipient_phone=recipient_phone
                )
                # Update original record with latest content/status/timestamps and increment resend_count
                await self.notifications_collection.update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "status": getattr(notification.status, "value", notification.status),
                            "subject": notification.subject,
                            "content": notification.content,
                            "updated_at": datetime.utcnow(),
                            "sent_at": notification.sent_at,
                        },
                        "$inc": {"resend_count": 1}
                    }
                )
                return True
            except Exception as send_error:
                logger.error(f"Error during resend delivery for {notification_id}: {str(send_error)}")
                await self.notifications_collection.update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "status": "failed",
                            "updated_at": datetime.utcnow(),
                            "admin_notes": f"Resend failed: {str(send_error)}"
                        },
                        "$inc": {"resend_count": 1}
                    }
                )
                return False
        except Exception as e:
            logger.error(f"Error resending notification: {str(e)}")
            return False
    
    async def delete_notification_admin(self, notification_id: str) -> bool:
        """Delete notification (admin only)"""
        try:
            from bson import ObjectId
            from bson.errors import InvalidId
            # Notifications use UUID strings as _id, not ObjectIds
            try:
                # Try ObjectId first (for backwards compatibility)
                query = {"_id": ObjectId(notification_id)}
            except (InvalidId, ValueError, TypeError):
                # If not an ObjectId, try as string (UUID)
                query = {"_id": notification_id}
            result = await self.notifications_collection.delete_one(query)
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting notification: {str(e)}")
            return False
    
    # ==========================================
    # NOTIFICATION TEMPLATES MANAGEMENT
    # ==========================================
    
    async def get_all_notification_templates(self) -> List[dict]:
        """Get all notification templates for admin management"""
        # For now, return the built-in templates from the service
        # In production, these could be stored in database for dynamic editing
        try:
            from services.notifications import NotificationTemplateService
            template_service = NotificationTemplateService()
            
            templates = []
            # Include additional built-in templates supported by NotificationTemplateService
            template_types = [
                "new_interest",
                "contact_shared",
                "job_posted",
                "payment_confirmation",
                "new_message",
                "new_matching_job",
                "job_cancelled",
            ]
            channels = ["email", "sms"]
            
            for template_type in template_types:
                for channel in channels:
                    template = template_service.get_template(template_type, channel)
                    if template:
                        templates.append({
                            "id": template.id,
                            "type": getattr(template.type, "value", template.type),
                            "channel": getattr(template.channel, "value", template.channel),
                            "subject_template": template.subject_template,
                            "content_template": template.content_template,
                            "variables": template.variables
                        })
            
            return templates
        except Exception as e:
            logger.error(f"Error getting notification templates: {str(e)}")
            return []
    
    async def get_notification_template_by_id(self, template_id: str) -> Optional[dict]:
        """Get specific notification template by ID"""
        templates = await self.get_all_notification_templates()
        return next((t for t in templates if t["id"] == template_id), None)
    
    async def update_notification_template(self, template_id: str, template_data: dict) -> bool:
        """Update notification template (for now, just validate - templates are built-in)"""
        # In production, templates could be stored in database for dynamic editing
        template = await self.get_notification_template_by_id(template_id)
        return template is not None
    
    async def create_notification_template(self, template_data: dict) -> Optional[str]:
        """Create notification template (for now, return generated ID)"""
        # In production, save to database
        return str(uuid.uuid4())
    
    async def test_notification_template(self, template_id: str, test_data: dict) -> dict:
        """Test notification template with sample data"""
        try:
            from services.notifications import NotificationTemplateService
            template_service = NotificationTemplateService()
            
            template = await self.get_notification_template_by_id(template_id)
            if not template:
                raise Exception("Template not found")
            
            # Create template object for testing
            from models.notifications import NotificationTemplate, NotificationType, NotificationChannel
            test_template = NotificationTemplate(
                id=template["id"],
                type=NotificationType(template["type"]),
                channel=NotificationChannel(template["channel"]),
                subject_template=template["subject_template"],
                content_template=template["content_template"],
                variables=template["variables"]
            )
            
            subject, content = template_service.render_template(test_template, test_data)
            
            return {
                "subject": subject,
                "content": content,
                "variables_used": list(test_data.keys())
            }
        except Exception as e:
            raise Exception(f"Template test failed: {str(e)}")
    
    # ==========================================
    # NOTIFICATION PREFERENCES MANAGEMENT
    # ==========================================
    
    async def get_all_user_preferences(self, skip: int = 0, limit: int = 50, user_role: str = None) -> List[dict]:
        """Get all user notification preferences for admin review"""
        # Build query
        pipeline = [
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "id",
                    "as": "user"
                }
            },
            {"$unwind": "$user"}
        ]
        
        if user_role:
            pipeline.append({"$match": {"user.role": user_role}})
        
        pipeline.extend([
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "user_id": 1,
                    "user_name": "$user.name",
                    "user_email": "$user.email",
                    "user_role": "$user.role",
                    "new_interest": 1,
                    "contact_shared": 1,
                    "job_posted": 1,
                    "payment_confirmation": 1,
                    "job_expiring": 1,
                    "new_matching_job": 1,
                    "new_message": 1,
                    "created_at": 1,
                    "updated_at": 1
                }
            }
        ])
        
        preferences = await self.notification_preferences_collection.aggregate(pipeline).to_list(length=None)
        
        # Convert ObjectId to string
        for pref in preferences:
            pref["id"] = str(pref["_id"])
            del pref["_id"]
        
        return preferences
    
    async def get_notification_preferences_stats(self) -> dict:
        """Get aggregated notification preferences statistics"""
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_users": {"$sum": 1},
                    "email_only": {"$sum": {"$cond": [{"$eq": ["$new_interest", "email"]}, 1, 0]}},
                    "sms_only": {"$sum": {"$cond": [{"$eq": ["$new_interest", "sms"]}, 1, 0]}},
                    "both_channels": {"$sum": {"$cond": [{"$eq": ["$new_interest", "both"]}, 1, 0]}}
                }
            }
        ]
        
        result = await self.notification_preferences_collection.aggregate(pipeline).to_list(1)
        
        if result:
            return result[0]
        else:
            return {
                "total_users": 0,
                "email_only": 0,
                "sms_only": 0,
                "both_channels": 0
            }
    
    async def update_user_notification_preferences_admin(self, user_id: str, preferences_data: dict) -> bool:
        """Update user notification preferences (admin override)"""
        preferences_data["updated_at"] = datetime.utcnow()
        
        result = await self.notification_preferences_collection.update_one(
            {"user_id": user_id},
            {"$set": preferences_data}
        )
        
        return result.modified_count > 0
    
    # ==========================================
    # NOTIFICATION ANALYTICS
    # ==========================================
    
    async def get_notification_analytics(self, date_from: str = None, date_to: str = None) -> dict:
        """Get comprehensive notification analytics"""
        match_stage = {}
        
        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter["$gte"] = datetime.fromisoformat(date_from)
            if date_to:
                date_filter["$lte"] = datetime.fromisoformat(date_to)
            match_stage["created_at"] = date_filter
        
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": None,
                    "total_notifications": {"$sum": 1},
                    "sent_count": {"$sum": {"$cond": [{"$eq": ["$status", "sent"]}, 1, 0]}},
                    "delivered_count": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
                    "failed_count": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}},
                    "pending_count": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
                    "email_count": {"$sum": {"$cond": [{"$eq": ["$channel", "email"]}, 1, 0]}},
                    "sms_count": {"$sum": {"$cond": [{"$eq": ["$channel", "sms"]}, 1, 0]}},
                    "both_count": {"$sum": {"$cond": [{"$eq": ["$channel", "both"]}, 1, 0]}}
                }
            }
        ]
        
        result = await self.notifications_collection.aggregate(pipeline).to_list(1)
        
        if result:
            analytics = result[0]
            # Calculate delivery rate
            total_sent = analytics["sent_count"] + analytics["delivered_count"]
            analytics["delivery_rate"] = (total_sent / analytics["total_notifications"] * 100) if analytics["total_notifications"] > 0 else 0
            return analytics
        else:
            return {
                "total_notifications": 0,
                "sent_count": 0,
                "delivered_count": 0,
                "failed_count": 0,
                "pending_count": 0,
                "email_count": 0,
                "sms_count": 0,
                "both_count": 0,
                "delivery_rate": 0
            }
    
    async def get_notification_delivery_report(self, notification_type: str = None, date_from: str = None, date_to: str = None) -> dict:
        """Get detailed delivery report for notifications"""
        match_stage = {}
        
        if notification_type:
            match_stage["type"] = notification_type
        
        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter["$gte"] = datetime.fromisoformat(date_from)  
            if date_to:
                date_filter["$lte"] = datetime.fromisoformat(date_to)
            match_stage["created_at"] = date_filter
        
        # Group by type and status
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "type": "$type",
                        "status": "$status",
                        "channel": "$channel"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.type",
                    "channels": {
                        "$push": {
                            "channel": "$_id.channel",
                            "status": "$_id.status",
                            "count": "$count"
                        }
                    }
                }
            }
        ]
        
        results = await self.notifications_collection.aggregate(pipeline).to_list(length=None)
        
        # Format results
        report = {}
        for result in results:
            notification_type = result["_id"]
            report[notification_type] = {
                "channels": result["channels"],
                "total": sum(channel["count"] for channel in result["channels"])
            }
        
        return report
    
    # ==========================================
    # TRADE CATEGORY QUESTIONS METHODS
    # ==========================================
    
    async def create_trade_category_question(self, question_data: dict) -> dict:
        """Create a new trade category question"""
        try:
            question_data['created_at'] = datetime.utcnow()
            question_data['updated_at'] = datetime.utcnow()
            
            result = await self.database.trade_category_questions.insert_one(question_data)
            if result.inserted_id:
                question_data['_id'] = str(result.inserted_id)
                return question_data
            return None
        except Exception as e:
            logger.error(f"Error creating trade category question: {str(e)}")
            return None
    
    async def get_questions_by_trade_category(self, trade_category: str) -> List[dict]:
        """Get all active questions for a specific trade category"""
        try:
            questions = await self.database.trade_category_questions.find({
                "trade_category": trade_category,
                "is_active": True
            }).sort("display_order", 1).to_list(length=None)
            
            for question in questions:
                question['_id'] = str(question['_id'])
            
            return questions
        except Exception as e:
            logger.error(f"Error getting questions for trade category {trade_category}: {str(e)}")
            return []
    
    async def get_all_trade_category_questions(self, trade_category: str = None) -> List[dict]:
        """Get all questions (admin view) with optional trade category filter"""
        try:
            filters = {}
            if trade_category:
                filters["trade_category"] = trade_category
            
            questions = await self.database.trade_category_questions.find(filters).sort([
                ("trade_category", 1), 
                ("display_order", 1)
            ]).to_list(length=None)
            
            for question in questions:
                question['_id'] = str(question['_id'])
            
            return questions
        except Exception as e:
            logger.error(f"Error getting all trade category questions: {str(e)}")
            return []
    
    async def get_trade_category_question_by_id(self, question_id: str) -> dict:
        """Get a specific trade category question by ID"""
        try:
            question = await self.database.trade_category_questions.find_one({"id": question_id})
            if question:
                question['_id'] = str(question['_id'])
            return question
        except Exception as e:
            logger.error(f"Error getting trade category question {question_id}: {str(e)}")
            return None
    
    async def update_trade_category_question(self, question_id: str, update_data: dict) -> dict:
        """Update a trade category question"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            
            result = await self.database.trade_category_questions.update_one(
                {"id": question_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return await self.get_trade_category_question_by_id(question_id)
            return None
        except Exception as e:
            logger.error(f"Error updating trade category question {question_id}: {str(e)}")
            return None
    
    async def delete_trade_category_question(self, question_id: str) -> bool:
        """Delete a trade category question"""
        try:
            result = await self.database.trade_category_questions.delete_one({"id": question_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting trade category question {question_id}: {str(e)}")
            return False
    
    async def reorder_trade_category_questions(self, trade_category: str, question_orders: List[dict]) -> bool:
        """Reorder questions for a trade category"""
        try:
            # question_orders should be [{"id": "question_id", "display_order": int}, ...]
            for item in question_orders:
                await self.database.trade_category_questions.update_one(
                    {"id": item["id"], "trade_category": trade_category},
                    {"$set": {"display_order": item["display_order"], "updated_at": datetime.utcnow()}}
                )
            return True
        except Exception as e:
            logger.error(f"Error reordering questions for {trade_category}: {str(e)}")
            return False
    
    def compose_job_description_from_answers(self, answers_doc: Optional[dict]) -> str:
        trade_category = (answers_doc or {}).get("trade_category") or ""
        items = []
        for ans in ((answers_doc or {}).get("answers") or []):
            qt = str(ans.get("question_type") or "")
            if qt.startswith("file_upload"):
                continue
            text = ans.get("answer_text")
            if not text:
                val = ans.get("answer_value")
                if isinstance(val, list):
                    text = ", ".join([str(v) for v in val if v])
                elif val is not None:
                    text = str(val)
            q = ans.get("question_text") or ""
            if text and q:
                items.append(f"{q}: {text}")
        items = [i for i in items if i.strip()]
        if trade_category and items:
            head = f"{trade_category} job details"
            summary = head + ": " + "; ".join(items[:8])
        elif items:
            summary = "; ".join(items[:8])
        else:
            summary = ""
        if len(summary) > 800:
            summary = summary[:800]
        return summary
    
    async def save_job_question_answers(self, answers_data: dict) -> dict:
        """Save answers to trade category questions for a job"""
        try:
            answers_data['created_at'] = datetime.utcnow()
            
            # Remove any existing answers for this job
            await self.database.job_question_answers.delete_many({"job_id": answers_data["job_id"]})
            
            # Insert new answers
            result = await self.database.job_question_answers.insert_one(answers_data)
            if result.inserted_id:
                answers_data['_id'] = str(result.inserted_id)
                try:
                    summary = self.compose_job_description_from_answers(answers_data)
                    job = await self.database.jobs.find_one({"id": answers_data["job_id"]})
                    current_desc = (job or {}).get("description")
                    if summary and (not current_desc or not str(current_desc).strip()):
                        await self.database.jobs.update_one(
                            {"id": answers_data["job_id"]},
                            {"$set": {"description": summary, "updated_at": datetime.utcnow()}}
                        )
                except Exception:
                    pass
                return answers_data
            return None
        except Exception as e:
            logger.error(f"Error saving job question answers: {str(e)}")
            return None
    
    async def get_job_question_answers(self, job_id: str) -> dict:
        """Get answers to trade category questions for a job"""
        try:
            answers = await self.database.job_question_answers.find_one({"job_id": job_id})
            if answers:
                answers['_id'] = str(answers['_id'])
            return answers
        except Exception as e:
            logger.error(f"Error getting job question answers for {job_id}: {str(e)}")
            return None
    
    async def get_trade_categories_with_questions(self) -> List[dict]:
        """Get all trade categories that have questions defined"""
        try:
            pipeline = [
                {"$match": {"is_active": True}},
                {"$group": {
                    "_id": "$trade_category",
                    "question_count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            results = await self.database.trade_category_questions.aggregate(pipeline).to_list(length=None)
            
            categories = []
            for result in results:
                categories.append({
                    "trade_category": result["_id"],
                    "question_count": result["question_count"]
                })
            
            return categories
        except Exception as e:
            logger.error(f"Error getting trade categories with questions: {str(e)}")
            return []

    # ==========================================
    # ADMIN MANAGEMENT METHODS
    # ==========================================

    async def create_admin(self, admin_data: dict) -> str:
        """Create a new admin"""
        result = await self.database.admins.insert_one(admin_data)
        return admin_data["id"]

    async def get_admin_by_id(self, admin_id: str) -> Optional[dict]:
        """Get admin by ID"""
        admin = await self.database.admins.find_one({"id": admin_id})
        if admin:
            admin['_id'] = str(admin['_id'])
        return admin

    async def get_admin_by_username(self, username: str) -> Optional[dict]:
        """Get admin by username"""
        admin = await self.database.admins.find_one({"username": username})
        if admin:
            admin['_id'] = str(admin['_id'])
        return admin

    async def get_admin_by_email(self, email: str) -> Optional[dict]:
        """Get admin by email"""
        admin = await self.database.admins.find_one({"email": email})
        if admin:
            admin['_id'] = str(admin['_id'])
        return admin

    async def get_all_admins(
        self, 
        skip: int = 0, 
        limit: int = 50, 
        role: Optional[AdminRole] = None, 
        status: Optional[AdminStatus] = None
    ) -> List[dict]:
        """Get all admins with filtering"""
        query = {}
        if role:
            query["role"] = role.value
        if status:
            query["status"] = status.value

        cursor = self.database.admins.find(query).sort("created_at", -1).skip(skip).limit(limit)
        admins = await cursor.to_list(length=limit)
        
        for admin in admins:
            admin['_id'] = str(admin['_id'])
        return admins

    async def get_admins_count(
        self, 
        role: Optional[AdminRole] = None, 
        status: Optional[AdminStatus] = None
    ) -> int:
        """Get total count of admins"""
        query = {}
        if role:
            query["role"] = role.value
        if status:
            query["status"] = status.value
        
        return await self.database.admins.count_documents(query)

    async def update_admin(self, admin_id: str, update_data: dict) -> bool:
        """Update admin data"""
        result = await self.database.admins.update_one(
            {"id": admin_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def update_admin_login(self, admin_id: str):
        """Update admin's last login and increment login count"""
        await self.database.admins.update_one(
            {"id": admin_id},
            {
                "$set": {"last_login": datetime.utcnow()},
                "$inc": {"login_count": 1}
            }
        )

    async def increment_admin_failed_attempts(self, admin_id: str):
        """Increment failed login attempts"""
        result = await self.database.admins.find_one_and_update(
            {"id": admin_id},
            {"$inc": {"failed_login_attempts": 1}},
            return_document=True
        )
        
        # Lock account after 5 failed attempts
        if result and result.get("failed_login_attempts", 0) >= 5:
            lock_until = datetime.utcnow() + timedelta(minutes=30)
            await self.database.admins.update_one(
                {"id": admin_id},
                {"$set": {"locked_until": lock_until}}
            )

    async def create_admin_activity(self, activity_data: dict):
        """Create admin activity log entry"""
        await self.database.admin_activities.insert_one(activity_data)

    async def get_admin_activities(
        self,
        skip: int = 0,
        limit: int = 50,
        admin_id: Optional[str] = None,
        activity_type: Optional[AdminActivityType] = None
    ) -> List[dict]:
        """Get admin activity logs"""
        query = {}
        if admin_id:
            query["admin_id"] = admin_id
        if activity_type:
            query["activity_type"] = activity_type.value

        cursor = self.database.admin_activities.find(query).sort("created_at", -1).skip(skip).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        for activity in activities:
            activity['_id'] = str(activity['_id'])
        return activities

    async def get_admin_activities_count(
        self,
        admin_id: Optional[str] = None,
        activity_type: Optional[AdminActivityType] = None
    ) -> int:
        """Get count of admin activities"""
        query = {}
        if admin_id:
            query["admin_id"] = admin_id
        if activity_type:
            query["activity_type"] = activity_type.value
        
        return await self.database.admin_activities.count_documents(query)

    @time_it
    async def get_admin_stats(self) -> dict:
        """Get comprehensive admin statistics using parallel tasks"""
        import asyncio
        
        # 1. Pipeline for role distribution
        role_pipeline = [
            {"$group": {
                "_id": "$role",
                "count": {"$sum": 1}
            }}
        ]
        
        # 2. Pipeline for login statistics
        login_pipeline = [
            {"$group": {
                "_id": None,
                "total_logins": {"$sum": "$login_count"},
                "avg_logins": {"$avg": "$login_count"}
            }}
        ]
        
        # 3. Recent activity date
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        # Define tasks for parallel execution
        tasks = [
            self.database.admins.aggregate(role_pipeline).to_list(length=20),
            self.database.admins.count_documents({"status": AdminStatus.ACTIVE.value}),
            self.database.admins.count_documents({}),
            self.database.admin_activities.count_documents({"created_at": {"$gte": seven_days_ago}}),
            self.database.admins.aggregate(login_pipeline).to_list(length=1)
        ]
        
        # Execute all tasks in parallel
        results = await asyncio.gather(*tasks)
        
        # Process results
        role_docs = results[0]
        active_admins = results[1]
        total_admins = results[2]
        recent_activities = results[3]
        login_stats = results[4]
        
        role_counts = {doc["_id"]: doc["count"] for doc in role_docs if doc["_id"]}
        
        total_logins = login_stats[0]["total_logins"] if login_stats else 0
        avg_logins = login_stats[0]["avg_logins"] if login_stats else 0

        return {
            "total_admins": total_admins,
            "active_admins": active_admins,
            "inactive_admins": total_admins - active_admins,
            "role_distribution": role_counts,
            "recent_activities": recent_activities,
            "total_logins": total_logins,
            "average_logins_per_admin": round(avg_logins, 1)
        }

    # ==========================================
    # CONTENT MANAGEMENT METHODS
    # ==========================================

    async def create_content_item(self, content_data: dict) -> str:
        """Create a new content item"""
        result = await self.database.content_items.insert_one(content_data)
        return content_data["id"]

    async def get_content_items(self, filters: dict = None, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get content items with filtering"""
        query = filters or {}
        cursor = self.database.content_items.find(query).sort("created_at", -1).skip(skip).limit(limit)
        content_items = await cursor.to_list(length=limit)
        
        for item in content_items:
            item['_id'] = str(item['_id'])
        return content_items

    async def get_content_items_count(self, filters: dict = None) -> int:
        """Get count of content items"""
        query = filters or {}
        return await self.database.content_items.count_documents(query)

    async def get_content_item_by_id(self, content_id: str) -> Optional[dict]:
        """Get content item by ID"""
        item = await self.database.content_items.find_one({"id": content_id})
        if item:
            item['_id'] = str(item['_id'])
        return item

    async def get_content_item_by_slug(self, slug: str) -> Optional[dict]:
        """Get content item by slug"""
        item = await self.database.content_items.find_one({"slug": slug})
        if item:
            item['_id'] = str(item['_id'])
        return item

    async def update_content_item(self, content_id: str, update_data: dict) -> bool:
        """Update content item"""
        result = await self.database.content_items.update_one(
            {"id": content_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def bulk_update_content_items(self, content_ids: List[str], update_data: dict) -> int:
        """Bulk update content items"""
        result = await self.database.content_items.update_many(
            {"id": {"$in": content_ids}},
            {"$set": update_data}
        )
        return result.modified_count

    async def get_content_statistics(self) -> dict:
        """Get content statistics"""
        try:
            # Total counts by status
            total_content = await self.database.content_items.count_documents({})
            published_content = await self.database.content_items.count_documents({"status": "published"})
            draft_content = await self.database.content_items.count_documents({"status": "draft"})
            scheduled_content = await self.database.content_items.count_documents({"status": "scheduled"})
            archived_content = await self.database.content_items.count_documents({"status": "archived"})

            # Content by type
            type_pipeline = [
                {"$group": {"_id": "$content_type", "count": {"$sum": 1}}}
            ]
            content_by_type = {}
            async for doc in self.database.content_items.aggregate(type_pipeline):
                content_by_type[doc["_id"]] = doc["count"]

            # Content by category
            category_pipeline = [
                {"$group": {"_id": "$category", "count": {"$sum": 1}}}
            ]
            content_by_category = {}
            async for doc in self.database.content_items.aggregate(category_pipeline):
                content_by_category[doc["_id"]] = doc["count"]

            # Top performing content (by view count)
            top_performing_cursor = self.database.content_items.find(
                {"status": "published"},
                {"title": 1, "content_type": 1, "view_count": 1, "created_at": 1}
            ).sort("view_count", -1).limit(5)
            
            top_performing = []
            async for doc in top_performing_cursor:
                doc['_id'] = str(doc['_id'])
                top_performing.append(doc)

            # Recent activity (last 10 content items)
            recent_cursor = self.database.content_items.find(
                {},
                {"title": 1, "content_type": 1, "status": 1, "created_at": 1, "updated_at": 1}
            ).sort("updated_at", -1).limit(10)
            
            recent_activity = []
            async for doc in recent_cursor:
                doc['_id'] = str(doc['_id'])
                recent_activity.append(doc)

            return {
                "total_content": total_content,
                "published_content": published_content,
                "draft_content": draft_content,
                "scheduled_content": scheduled_content,
                "archived_content": archived_content,
                "content_by_type": content_by_type,
                "content_by_category": content_by_category,
                "top_performing": top_performing,
                "recent_activity": recent_activity
            }

        except Exception as e:
            logger.error(f"Error getting content statistics: {str(e)}")
            return {
                "total_content": 0,
                "published_content": 0,
                "draft_content": 0,
                "scheduled_content": 0,
                "archived_content": 0,
                "content_by_type": {},
                "content_by_category": {},
                "top_performing": [],
                "recent_activity": []
            }

    async def get_content_analytics(self, content_id: str, days: int = 30) -> dict:
        """Get analytics for a specific content item"""
        try:
            from datetime import timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get analytics data (placeholder implementation)
            analytics = await self.database.content_analytics.find({
                "content_id": content_id,
                "date": {"$gte": start_date}
            }).to_list(length=None)
            
            # Aggregate data
            total_views = sum(item.get("views", 0) for item in analytics)
            total_unique_views = sum(item.get("unique_views", 0) for item in analytics)
            total_likes = sum(item.get("likes", 0) for item in analytics)
            total_shares = sum(item.get("shares", 0) for item in analytics)
            
            return {
                "content_id": content_id,
                "period_days": days,
                "total_views": total_views,
                "total_unique_views": total_unique_views,
                "total_likes": total_likes,
                "total_shares": total_shares,
                "daily_data": analytics
            }
        except Exception as e:
            logger.error(f"Error getting content analytics: {str(e)}")
            return {
                "content_id": content_id,
                "period_days": days,
                "total_views": 0,
                "total_unique_views": 0,
                "total_likes": 0,
                "total_shares": 0,
                "daily_data": []
            }

    async def create_content_template(self, template_data: dict) -> str:
        """Create content template"""
        result = await self.database.content_templates.insert_one(template_data)
        return template_data["id"]

    async def get_content_templates(self, content_type: str = None) -> List[dict]:
        """Get content templates"""
        query = {"is_active": True}
        if content_type:
            query["content_type"] = content_type
        
        cursor = self.database.content_templates.find(query).sort("created_at", -1)
        templates = await cursor.to_list(length=None)
        
        for template in templates:
            template['_id'] = str(template['_id'])
        return templates

    async def create_media_file(self, media_data: dict) -> str:
        """Create media file record"""
        result = await self.database.media_files.insert_one(media_data)
        return media_data["id"]

    async def get_media_files(self, filters: dict = None, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get media files with filtering"""
        query = filters or {}
        cursor = self.database.media_files.find(query).sort("upload_date", -1).skip(skip).limit(limit)
        media_files = await cursor.to_list(length=limit)
        
        for file in media_files:
            file['_id'] = str(file['_id'])
        return media_files

    async def get_media_files_count(self, filters: dict = None) -> int:
        """Get count of media files"""
        query = filters or {}
        return await self.database.media_files.count_documents(query)

    async def save_uploaded_file(self, file, folder: str = "general") -> str:
        """Save uploaded file and return URL (placeholder implementation)"""
        # This is a placeholder implementation
        # In a real system, you would save to cloud storage (S3, etc.)
        import os
        import uuid
        
        # Create uploads directory if it doesn't exist
        upload_dir = f"/app/uploads/{folder}"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Return URL (in production, this would be a CDN URL)
        return f"/uploads/{folder}/{unique_filename}"

    async def log_admin_activity(self, admin_id: str, admin_username: str, activity_type: str, 
                                description: str, target_id: str = None, target_type: str = None, 
                                metadata: dict = None):
        """Log admin activity"""
        activity_data = {
            "id": str(uuid.uuid4()),
            "admin_id": admin_id,
            "admin_username": admin_username,
            "activity_type": activity_type,
            "description": description,
            "target_id": target_id,
            "target_type": target_type,
            "metadata": metadata,
            "created_at": datetime.utcnow()
        }
        await self.database.admin_activities.insert_one(activity_data)

    async def increment_content_view_count(self, content_id: str):
        """Increment view count for content item"""
        await self.database.content_items.update_one(
            {"id": content_id},
            {"$inc": {"view_count": 1}}
        )

    async def increment_content_like_count(self, content_id: str):
        """Increment like count for content item"""
        await self.database.content_items.update_one(
            {"id": content_id},
            {"$inc": {"like_count": 1}}
        )

    async def increment_content_share_count(self, content_id: str):
        """Increment share count for content item"""
        await self.database.content_items.update_one(
            {"id": content_id},
            {"$inc": {"share_count": 1}}
        )

    # Job Management Database Methods

    async def get_job_postings(self, filters: dict = None, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get job postings with filtering"""
        query = filters or {}
        cursor = self.database.content_items.find(query).sort("created_at", -1).skip(skip).limit(limit)
        job_postings = await cursor.to_list(length=limit)
        
        for job in job_postings:
            job['_id'] = str(job['_id'])
        return job_postings

    async def get_job_postings_count(self, filters: dict = None) -> int:
        """Get count of job postings"""
        query = filters or {}
        return await self.database.content_items.count_documents(query)

    async def get_job_by_slug(self, slug: str) -> Optional[dict]:
        """Get job posting by slug"""
        job = await self.database.content_items.find_one({"slug": slug, "content_type": "job_posting"})
        if job:
            job['_id'] = str(job['_id'])
        return job

    async def create_job_application(self, application_data: dict) -> str:
        """Create a new job application"""
        result = await self.database.job_applications.insert_one(application_data)
        return application_data["id"]

    async def get_job_applications(self, filters: dict = None, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get job applications with filtering"""
        query = filters or {}
        cursor = self.database.job_applications.find(query).sort("applied_at", -1).skip(skip).limit(limit)
        applications = await cursor.to_list(length=limit)
        
        for app in applications:
            app['_id'] = str(app['_id'])
        return applications

    async def get_job_applications_count(self, filters: dict = None) -> int:
        """Get count of job applications"""
        query = filters or {}
        return await self.database.job_applications.count_documents(query)

    async def get_job_application_by_id(self, application_id: str) -> Optional[dict]:
        """Get job application by ID"""
        application = await self.database.job_applications.find_one({"id": application_id})
        if application:
            application['_id'] = str(application['_id'])
        return application

    async def update_job_application(self, application_id: str, update_data: dict) -> bool:
        """Update job application"""
        update_data['updated_at'] = datetime.utcnow()
        result = await self.database.job_applications.update_one(
            {"id": application_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def increment_job_applications_count(self, job_id: str):
        """Increment applications count for a job posting"""
        await self.database.content_items.update_one(
            {"id": job_id, "content_type": "job_posting"},
            {"$inc": {"settings.applications_count": 1}}
        )

    async def get_job_statistics(self) -> dict:
        """Get job posting and application statistics"""
        try:
            # Job statistics
            total_jobs = await self.database.content_items.count_documents({"content_type": "job_posting"})
            active_jobs = await self.database.content_items.count_documents({
                "content_type": "job_posting", 
                "status": "published"
            })
            draft_jobs = await self.database.content_items.count_documents({
                "content_type": "job_posting", 
                "status": "draft"
            })
            
            # Application statistics
            total_applications = await self.database.job_applications.count_documents({})
            
            # Jobs by department aggregation
            pipeline = [
                {"$match": {"content_type": "job_posting"}},
                {"$group": {
                    "_id": "$settings.department",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]
            
            jobs_by_department = {}
            async for doc in self.database.content_items.aggregate(pipeline):
                if doc["_id"]:
                    jobs_by_department[doc["_id"]] = doc["count"]
            
            # Jobs by type aggregation
            pipeline = [
                {"$match": {"content_type": "job_posting"}},
                {"$group": {
                    "_id": "$settings.job_type",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]
            
            jobs_by_type = {}
            async for doc in self.database.content_items.aggregate(pipeline):
                if doc["_id"]:
                    jobs_by_type[doc["_id"]] = doc["count"]
            
            # Applications by status aggregation
            pipeline = [
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]
            
            applications_by_status = {}
            async for doc in self.database.job_applications.aggregate(pipeline):
                if doc["_id"]:
                    applications_by_status[doc["_id"]] = doc["count"]
            
            # Top jobs by application count
            pipeline = [
                {"$match": {"content_type": "job_posting"}},
                {"$sort": {"settings.applications_count": -1}},
                {"$limit": 5},
                {"$project": {
                    "title": 1,
                    "slug": 1,
                    "department": "$settings.department",
                    "applications_count": "$settings.applications_count",
                    "status": 1,
                    "created_at": 1
                }}
            ]
            
            top_jobs = []
            async for job in self.database.content_items.aggregate(pipeline):
                job["_id"] = str(job["_id"])
                top_jobs.append(job)
            
            # Recent applications
            recent_applications = await self.database.job_applications.find(
                {}, 
                {"name": 1, "job_title": 1, "status": 1, "applied_at": 1}
            ).sort("applied_at", -1).limit(10).to_list(length=10)
            
            for app in recent_applications:
                app["_id"] = str(app["_id"])
            
            return {
                "total_jobs": total_jobs,
                "active_jobs": active_jobs,
                "draft_jobs": draft_jobs,
                "expired_jobs": 0,  # Will implement expired logic later
                "total_applications": total_applications,
                "jobs_by_department": jobs_by_department,
                "jobs_by_type": jobs_by_type,
                "applications_by_status": applications_by_status,
                "top_jobs": top_jobs,
                "recent_applications": recent_applications
            }
        except Exception as e:
            logger.error(f"Error getting job statistics: {str(e)}")
            return {
                "total_jobs": 0,
                "active_jobs": 0,
                "draft_jobs": 0,
                "expired_jobs": 0,
                "total_applications": 0,
                "jobs_by_department": {},
                "jobs_by_type": {},
                "applications_by_status": {},
                "top_jobs": [],
                "recent_applications": []
            }

    async def get_admin_users(self) -> List[dict]:
        """Get list of admin users for notifications"""
        try:
            cursor = self.database.admins.find(
                {"status": "active"}, 
                {"id": 1, "username": 1, "email": 1, "full_name": 1, "role": 1}
            )
            admins = await cursor.to_list(length=None)
            
            for admin in admins:
                admin['_id'] = str(admin['_id'])
            
            return admins
        except Exception as e:
            logger.error(f"Error getting admin users: {str(e)}")
            return []

    # Hiring Status and Feedback Database Methods

    async def create_hiring_status(self, hiring_status_data: dict) -> dict:
        """Create a hiring status record"""
        try:
            result = await self.database.hiring_status.insert_one(hiring_status_data)
            hiring_status_data['_id'] = str(result.inserted_id)
            return hiring_status_data
        except Exception as e:
            logger.error(f"Error creating hiring status: {str(e)}")
            raise

    async def get_hiring_status_by_job_and_tradesperson(self, job_id: str, tradesperson_id: str) -> Optional[dict]:
        """Get hiring status for specific job and tradesperson"""
        try:
            status = await self.database.hiring_status.find_one({
                "job_id": job_id,
                "tradesperson_id": tradesperson_id
            })
            if status:
                status['_id'] = str(status['_id'])
            return status
        except Exception as e:
            logger.error(f"Error getting hiring status: {str(e)}")
            return None

    async def update_hiring_status(self, status_id: str, update_data: dict) -> bool:
        """Update hiring status"""
        try:
            update_data['updated_at'] = datetime.utcnow()
            result = await self.database.hiring_status.update_one(
                {"id": status_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating hiring status: {str(e)}")
            return False

    async def create_hiring_feedback(self, feedback_data: dict) -> dict:
        """Create a hiring feedback record"""
        try:
            result = await self.database.hiring_feedback.insert_one(feedback_data)
            feedback_data['_id'] = str(result.inserted_id)
            return feedback_data
        except Exception as e:
            logger.error(f"Error creating hiring feedback: {str(e)}")
            raise

    async def get_hiring_feedback_by_job_and_tradesperson(self, job_id: str, tradesperson_id: str) -> Optional[dict]:
        """Get hiring feedback for specific job and tradesperson"""
        try:
            feedback = await self.database.hiring_feedback.find_one({
                "job_id": job_id,
                "tradesperson_id": tradesperson_id
            })
            if feedback:
                feedback['_id'] = str(feedback['_id'])
            return feedback
        except Exception as e:
            logger.error(f"Error getting hiring feedback: {str(e)}")
            return None

    async def get_hiring_statistics(self) -> dict:
        """Get hiring statistics for analytics"""
        try:
            # Count total hiring status records
            total_interactions = await self.database.hiring_status.count_documents({})
            
            # Count hired vs not hired
            hired_count = await self.database.hiring_status.count_documents({"hired": True})
            not_hired_count = await self.database.hiring_status.count_documents({"hired": False})
            
            # Count by job status
            pipeline = [
                {"$match": {"hired": True}},
                {"$group": {
                    "_id": "$job_status",
                    "count": {"$sum": 1}
                }}
            ]
            job_status_counts = {}
            async for doc in self.database.hiring_status.aggregate(pipeline):
                if doc["_id"]:
                    job_status_counts[doc["_id"]] = doc["count"]
            
            # Count feedback by type
            pipeline = [
                {"$group": {
                    "_id": "$feedback_type",
                    "count": {"$sum": 1}
                }}
            ]
            feedback_type_counts = {}
            async for doc in self.database.hiring_feedback.aggregate(pipeline):
                if doc["_id"]:
                    feedback_type_counts[doc["_id"]] = doc["count"]
            
            return {
                "total_interactions": total_interactions,
                "hired_count": hired_count,
                "not_hired_count": not_hired_count,
                "job_status_distribution": job_status_counts,
                "feedback_type_distribution": feedback_type_counts,
                "hiring_rate": hired_count / total_interactions if total_interactions > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting hiring statistics: {str(e)}")
            return {
                "total_interactions": 0,
                "hired_count": 0,
                "not_hired_count": 0,
                "job_status_distribution": {},
                "feedback_type_distribution": {},
                "hiring_rate": 0
            }

    async def get_completed_jobs_for_tradesperson(self, tradesperson_id: str):
        """Get all completed jobs for a tradesperson where they showed interest"""
        try:
            # Get all interests for this tradesperson where the job is completed
            pipeline = [
                # Match interests for this tradesperson
                {"$match": {"tradesperson_id": tradesperson_id}},
                
                # Lookup the job details
                {"$lookup": {
                    "from": "jobs",
                    "localField": "job_id", 
                    "foreignField": "id",
                    "as": "job"
                }},
                
                # Only include if job exists and is completed
                {"$match": {
                    "job.status": "completed",
                    "job": {"$ne": []}
                }},
                
                # Flatten the job array
                {"$unwind": "$job"},
                
                # Project the fields we need (excluding ObjectId fields)
                {"$project": {
                    "_id": 0,  # Exclude the MongoDB _id field
                    "id": "$id",
                    "job_id": "$job_id",
                    "job_title": "$job.title",
                    "job_description": "$job.description",
                    "job_category": "$job.category",
                    "job_location": "$job.location",
                    "job_budget_min": "$job.budget_min",
                    "job_budget_max": "$job.budget_max",
                    "job_timeline": "$job.timeline",
                    "job_status": "$job.status",
                    "homeowner_id": "$job.homeowner.id",
                    "homeowner_name": "$job.homeowner.name",
                    "homeowner_email": "$job.homeowner.email",
                    "homeowner_phone": "$job.homeowner.phone",
                    "status": "$status",
                    "created_at": "$created_at",
                    "updated_at": "$updated_at",
                    "completed_at": "$job.completed_at",
                    "access_fee_naira": "$job.access_fee_naira",
                    "access_fee_coins": "$job.access_fee_coins",
                    "payment_made_at": "$payment_made_at",
                    "rating": {"$ifNull": ["$rating", None]}
                }},
                
                # Sort by completion date (most recent first)
                {"$sort": {"completed_at": -1, "updated_at": -1}}
            ]
            
            completed_jobs = []
            async for job in self.database.interests.aggregate(pipeline):
                # Clean the job data to ensure all fields are serializable
                cleaned_job = self._clean_job_data(job)
                completed_jobs.append(cleaned_job)
            
            logger.info(f"Retrieved {len(completed_jobs)} completed jobs for tradesperson {tradesperson_id}")
            return completed_jobs
            
        except Exception as e:
            logger.error(f"Error getting completed jobs for tradesperson {tradesperson_id}: {str(e)}")
            raise e

    async def get_interested_tradespeople_for_job(self, job_id: str):
        """Get all tradespeople who showed interest in a specific job"""
        try:
            # Get all interests for this job with tradesperson details
            pipeline = [
                # Match interests for this job
                {"$match": {"job_id": job_id}},
                
                # Lookup the tradesperson details
                {"$lookup": {
                    "from": "users",
                    "localField": "tradesperson_id",
                    "foreignField": "id",
                    "as": "tradesperson"
                }},
                
                # Only include if tradesperson exists
                {"$match": {"tradesperson": {"$ne": []}}},
                
                # Flatten the tradesperson array
                {"$unwind": "$tradesperson"},
                
                # Project the fields we need
                {"$project": {
                    "_id": 0,  # Exclude MongoDB _id
                    "id": "$id",
                    "job_id": "$job_id",
                    "tradesperson_id": "$tradesperson_id",
                    "status": "$status",
                    "created_at": "$created_at",
                    "updated_at": "$updated_at",
                    "tradesperson": {
                        "id": "$tradesperson.id",
                        "name": "$tradesperson.name",
                        "email": "$tradesperson.email",
                        "phone": "$tradesperson.phone"
                    }
                }}
            ]
            
            interested_tradespeople = []
            async for interest in self.database.interests.aggregate(pipeline):
                # Clean the interest data to ensure serialization
                cleaned_interest = self._clean_job_data(interest)
                interested_tradespeople.append(cleaned_interest)
            
            logger.info(f"Retrieved {len(interested_tradespeople)} interested tradespeople for job {job_id}")
            return interested_tradespeople
            
        except Exception as e:
            logger.error(f"Error getting interested tradespeople for job {job_id}: {str(e)}")
            raise e

    def _clean_job_data(self, job_data: dict) -> dict:
        """Clean job data to ensure all fields are JSON serializable"""
        from bson import ObjectId
        from datetime import datetime
        
        cleaned = {}
        for key, value in job_data.items():
            if isinstance(value, ObjectId):
                cleaned[key] = str(value)
            elif isinstance(value, datetime):
                cleaned[key] = value.isoformat()
            elif isinstance(value, dict):
                cleaned[key] = self._clean_job_data(value)
            elif isinstance(value, list):
                cleaned[key] = [self._clean_job_data(item) if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value
        
        return cleaned


# Create global database instance
database = Database()

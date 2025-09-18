from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from datetime import datetime

# Import database and routes
from database import database
from routes import jobs, tradespeople, quotes, reviews, stats, auth
from routes.admin_management import router as admin_management_router
from routes.content import router as content_router
from routes.public_content import router as public_content_router
from routes.jobs_management import router as jobs_management_router

# Add database inspection endpoint
from fastapi import HTTPException
from fastapi.responses import JSONResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.connect_to_mongo()
    logger.info("Connected to MongoDB")
    yield
    # Shutdown
    await database.close_mongo_connection()
    logger.info("MongoDB connection closed")

# Create the main app with lifespan events  
app = FastAPI(lifespan=lifespan, redirect_slashes=False)

# Create a router without prefix for health endpoints
api_router = APIRouter()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@api_router.get("/api/")
async def root():
    return {"message": "serviceHub API is running", "status": "healthy"}

@api_router.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "serviceHub API"}

@api_router.get("/api/database-info")
async def get_database_info():
    """Get database information for mobile access"""
    try:
        # Get database instance
        db = database.database
        
        # Count documents in collections
        collections_info = {}
        
        # Check common collections
        try:
            collections_info["users"] = await db.users.count_documents({})
            collections_info["jobs"] = await db.jobs.count_documents({})
            collections_info["interests"] = await db.interests.count_documents({})
            collections_info["reviews"] = await db.reviews.count_documents({})
            collections_info["messages"] = await db.messages.count_documents({})
            collections_info["notifications"] = await db.notifications.count_documents({})
        except Exception as e:
            collections_info["error"] = str(e)
        
        # Get sample data
        sample_data = {}
        try:
            if collections_info.get("users", 0) > 0:
                sample_user = await db.users.find_one({}, {"password_hash": 0})
                if sample_user:
                    sample_data["sample_user"] = {
                        "id": sample_user.get("id"),
                        "name": sample_user.get("name"),
                        "email": sample_user.get("email"),
                        "role": sample_user.get("role"),
                        "created_at": str(sample_user.get("created_at"))
                    }
            
            if collections_info.get("jobs", 0) > 0:
                sample_job = await db.jobs.find_one({})
                if sample_job:
                    sample_data["sample_job"] = {
                        "id": sample_job.get("id"),
                        "title": sample_job.get("title"),
                        "category": sample_job.get("category"),
                        "location": sample_job.get("location"),
                        "budget": sample_job.get("budget"),
                        "status": sample_job.get("status")
                    }
        except Exception as e:
            sample_data["error"] = str(e)
        
        return {
            "database": "servicehub (via test_database)",
            "collections": collections_info,
            "sample_data": sample_data,
            "timestamp": str(datetime.utcnow()),
            "mobile_access": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.get("/api/users-summary")
async def get_users_summary():
    """Get user statistics for mobile viewing"""
    try:
        db = database.database
        
        # Count users by role
        total_users = await db.users.count_documents({})
        homeowners = await db.users.count_documents({"role": "homeowner"})
        tradespeople = await db.users.count_documents({"role": "tradesperson"})
        
        # Get recent users
        recent_users = []
        async for user in db.users.find({}, {"password_hash": 0}).sort("created_at", -1).limit(5):
            recent_users.append({
                "name": user.get("name"),
                "email": user.get("email"),
                "role": user.get("role"),
                "created_at": str(user.get("created_at"))
            })
        
        return {
            "total_users": total_users,
            "homeowners": homeowners,
            "tradespeople": tradespeople,
            "recent_users": recent_users,
            "mobile_friendly": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/api/jobs-summary") 
async def get_jobs_summary():
    """Get job statistics for mobile viewing"""
    try:
        db = database.database
        
        total_jobs = await db.jobs.count_documents({})
        active_jobs = await db.jobs.count_documents({"status": "active"})
        completed_jobs = await db.jobs.count_documents({"status": "completed"})
        
        # Get recent jobs
        recent_jobs = []
        async for job in db.jobs.find({}).sort("created_at", -1).limit(5):
            recent_jobs.append({
                "title": job.get("title"),
                "category": job.get("category"),
                "location": job.get("location"),
                "status": job.get("status"),
                "budget": job.get("budget"),
                "created_at": str(job.get("created_at"))
            })
        
        return {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "completed_jobs": completed_jobs,
            "recent_jobs": recent_jobs,
            "mobile_friendly": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include route modules
from routes import auth, jobs, tradespeople, quotes, reviews, stats, portfolio, interests, notifications, reviews_advanced, wallet, admin, referrals, messages

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(tradespeople.router)
app.include_router(quotes.router)
app.include_router(reviews.router)
app.include_router(stats.router)
app.include_router(portfolio.router)
app.include_router(interests.router)
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(reviews_advanced.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(wallet.router)
app.include_router(admin.router)
app.include_router(admin_management_router)
app.include_router(content_router)
app.include_router(public_content_router)
app.include_router(jobs_management_router)
app.include_router(referrals.router)
app.include_router(messages.router)

# Include the main api router
app.include_router(api_router)
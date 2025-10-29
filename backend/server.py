from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import time
from pathlib import Path
from datetime import datetime
import uuid
import asyncio

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

# Import production logging system
from utils.logger import get_logger, log_request

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize production logger
logger = get_logger('server')

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        try:
            # Prevent startup hanging by timing out DB connect quickly
            timeout_sec = int(os.getenv("DB_STARTUP_TIMEOUT_SEC", "3"))
            await asyncio.wait_for(database.connect_to_mongo(), timeout=timeout_sec)
        except asyncio.TimeoutError:
            logger.warning("Database connection timed out during startup; running in degraded mode")
        if getattr(database, 'connected', False):
            logger.info("Connected to MongoDB")
        else:
            logger.warning("Database connection unavailable; running in degraded mode")
    except Exception as e:
        logger.error(f"Database connect failed during startup: {e}")
    yield
    # Shutdown
    try:
        await database.close_mongo_connection()
        logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")

# Create the main app with lifespan events  
app = FastAPI(lifespan=lifespan, redirect_slashes=False)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing and response status."""
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Get user ID from token if available
    user_id = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # You can decode the JWT here to get user_id if needed
        # For now, we'll just log that authentication was present
        pass
    
    response = await call_next(request)
    
    # Calculate request duration
    duration = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    # Log the request
    log_request(
        method=request.method,
        endpoint=str(request.url.path),
        status_code=response.status_code,
        duration=duration,
        user_id=user_id,
        request_id=request_id
    )
    
    return response

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
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "serviceHub API"}

@api_router.get("/api/health/detailed")
async def detailed_health_check():
    """Comprehensive health check with system metrics."""
    from utils.health_monitor import health_monitor
    try:
        health_data = await health_monitor.get_system_health()
        return health_data
    except Exception as e:
        logger.error("Detailed health check failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Health check failed")

@api_router.get("/api/health/database")
async def database_health_check():
    """Database-specific health check."""
    from utils.health_monitor import health_monitor
    try:
        db_health = await health_monitor.get_database_health()
        return db_health
    except Exception as e:
        logger.error("Database health check failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Database health check failed")

@api_router.get("/api/health/history")
async def health_history():
    """Get recent health check history."""
    from utils.health_monitor import health_monitor
    try:
        history = health_monitor.get_health_history()
        return {"history": history, "count": len(history)}
    except Exception as e:
        logger.error("Health history retrieval failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Health history retrieval failed")

@api_router.get("/api/metrics")
async def get_metrics():
    """Get system metrics in Prometheus-compatible format."""
    from utils.health_monitor import health_monitor
    try:
        health_data = await health_monitor.get_system_health()
        
        # Convert to Prometheus-style metrics
        metrics = []
        
        # System metrics
        if "system" in health_data:
            system = health_data["system"]
            if "cpu" in system:
                metrics.append(f"servicehub_cpu_usage_percent {system['cpu'].get('usage_percent', 0)}")
            if "memory" in system:
                metrics.append(f"servicehub_memory_usage_percent {system['memory'].get('usage_percent', 0)}")
                metrics.append(f"servicehub_memory_total_bytes {system['memory'].get('total_gb', 0) * 1024**3}")
            if "disk" in system:
                metrics.append(f"servicehub_disk_usage_percent {system['disk'].get('usage_percent', 0)}")
        
        # Database metrics
        if "database" in health_data and health_data["database"].get("status") == "healthy":
            db = health_data["database"]
            metrics.append(f"servicehub_database_connection_time_ms {db.get('connection_time_ms', 0)}")
            metrics.append(f"servicehub_database_size_bytes {db.get('database_size_mb', 0) * 1024**2}")
        
        # Uptime
        if "uptime" in health_data:
            metrics.append(f"servicehub_uptime_seconds {health_data['uptime'].get('seconds', 0)}")
        
        return {"metrics": metrics, "format": "prometheus"}
        
    except Exception as e:
        logger.error("Metrics retrieval failed", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Metrics retrieval failed")

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

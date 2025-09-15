from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path

# Import database and routes
from database import database
from routes import jobs, tradespeople, quotes, reviews, stats, auth
from routes.admin_management import router as admin_management_router
from routes.content import router as content_router
from routes.public_content import router as public_content_router

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
app.include_router(referrals.router)
app.include_router(messages.router)

# Include the main api router
app.include_router(api_router)
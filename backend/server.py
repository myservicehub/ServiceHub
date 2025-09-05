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
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "serviceHub API is running", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "serviceHub API"}

# Include route modules
from routes import auth, jobs, tradespeople, quotes, reviews, stats, portfolio

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(tradespeople.router)
app.include_router(quotes.router)
app.include_router(reviews.router)
app.include_router(stats.router)
app.include_router(portfolio.router)

# Include the main api router
app.include_router(api_router)
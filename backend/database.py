from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.client = None
        self.database = None

    async def connect_to_mongo(self):
        self.client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        self.database = self.client[os.environ['DB_NAME']]
        logger.info("Connected to MongoDB")

    async def close_mongo_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    # Job operations
    async def create_job(self, job_data: dict) -> dict:
        # Set expiration date (30 days from now)
        job_data['expires_at'] = datetime.utcnow() + timedelta(days=30)
        result = await self.database.jobs.insert_one(job_data)
        job_data['_id'] = str(result.inserted_id)
        return job_data

    async def get_job_by_id(self, job_id: str) -> Optional[dict]:
        job = await self.database.jobs.find_one({"id": job_id})
        if job:
            job['_id'] = str(job['_id'])
        return job

    async def get_jobs(self, skip: int = 0, limit: int = 10, filters: dict = None) -> List[dict]:
        query = filters or {}
        
        # Only return active jobs by default
        if 'status' not in query:
            query['status'] = 'active'
            
        # Add expiration check
        query['expires_at'] = {'$gt': datetime.utcnow()}
        
        cursor = self.database.jobs.find(query).sort("created_at", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        for job in jobs:
            job['_id'] = str(job['_id'])
        return jobs

    async def get_jobs_count(self, filters: dict = None) -> int:
        query = filters or {}
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

    async def get_quotes_by_job(self, job_id: str) -> List[dict]:
        cursor = self.database.quotes.find({"job_id": job_id}).sort("created_at", -1)
        quotes = await cursor.to_list(length=None)
        
        for quote in quotes:
            quote['_id'] = str(quote['_id'])
        return quotes

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
        # Total tradespeople
        total_tradespeople = await self.database.tradespeople.count_documents({})
        
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
            "status": "active",
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        # Count unique categories
        categories = await self.database.tradespeople.distinct("trade_categories")
        all_categories = set()
        for cat_list in categories:
            all_categories.update(cat_list)
        
        return {
            "total_tradespeople": total_tradespeople,
            "total_categories": len(all_categories),
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "total_jobs": total_jobs,
            "active_jobs": active_jobs
        }

    # Category operations
    async def get_categories_with_counts(self) -> List[dict]:
        # Aggregate to count tradespeople by category
        pipeline = [
            {"$unwind": "$trade_categories"},
            {"$group": {
                "_id": "$trade_categories",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        results = await self.database.tradespeople.aggregate(pipeline).to_list(None)
        
        # Define category details
        category_details = {
            "Gardening & Landscaping": {
                "description": "Dreaming of a garden that captivates and soothes? Our detailed guides will provide pricing info and help you find the perfect gardener.",
                "icon": "🌿",
                "color": "from-green-400 to-green-600"
            },
            "Painting & Decorating": {
                "description": "Thinking about giving your space a fresh, new look? Our guides will not only provide pricing info but also connect you with skilled painters.",
                "icon": "🎨",
                "color": "from-blue-400 to-blue-600"
            },
            "Plastering & Rendering": {
                "description": "Are you interested in price information about a job in this service category? To give you an idea of costs, here are some recent projects.",
                "icon": "🏗️",
                "color": "from-orange-400 to-orange-600"
            },
            "Plumbing": {
                "description": "From leaky taps to full bathroom installations, find qualified plumbers for any job. Get quotes and compare reviews.",
                "icon": "🔧",
                "color": "from-indigo-400 to-indigo-600"
            },
            "Electrical Work": {
                "description": "Safe, certified electrical work from qualified electricians. From socket installations to full rewiring projects.",
                "icon": "⚡",
                "color": "from-yellow-400 to-yellow-600"
            },
            "Carpentry & Joinery": {
                "description": "Custom woodwork, fitted wardrobes, kitchen installations and more from skilled carpenters and joiners.",
                "icon": "🪚",
                "color": "from-amber-400 to-amber-600"
            }
        }
        
        categories = []
        for result in results:
            category_name = result["_id"]
            if category_name in category_details:
                categories.append({
                    "title": category_name,
                    "tradesperson_count": result["count"],
                    **category_details[category_name]
                })
        
        return categories

# Global database instance
database = Database()
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from typing import List, Optional, Dict, Any
import logging
import uuid
from models.notifications import (
    Notification, NotificationPreferences, NotificationChannel,
    NotificationType, NotificationStatus
)
from models.reviews import (
    Review, ReviewCreate, ReviewSummary, ReviewRequest, 
    ReviewStats, ReviewType, ReviewStatus
)

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

    @property
    def portfolio_collection(self):
        """Access to portfolio collection"""
        return self.database.portfolio

    # User authentication operations
    async def create_user(self, user_data: dict) -> dict:
        """Create a new user"""
        result = await self.database.users.insert_one(user_data)
        user_data['_id'] = str(result.inserted_id)
        return user_data

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        user = await self.database.users.find_one({"id": user_id})
        if user:
            user['_id'] = str(user['_id'])
        return user

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        user = await self.database.users.find_one({"email": email})
        if user:
            user['_id'] = str(user['_id'])
        return user

    async def update_user(self, user_id: str, update_data: dict) -> bool:
        """Update user data"""
        update_data['updated_at'] = datetime.utcnow()
        result = await self.database.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def update_user_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        await self.database.users.update_one(
            {"id": user_id},
            {"$set": {"last_login": datetime.utcnow()}}
        )

    async def verify_user_email(self, user_id: str):
        """Mark user email as verified"""
        await self.database.users.update_one(
            {"id": user_id},
            {"$set": {"email_verified": True, "updated_at": datetime.utcnow()}}
        )

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
        
        # Define category details for Nigeria
        category_details = {
            "Building & Construction": {
                "description": "From foundation to roofing, find experienced builders for your construction projects. Quality workmanship guaranteed.",
                "icon": "🏗️",
                "color": "from-orange-400 to-orange-600"
            },
            "Plumbing & Water Works": {
                "description": "Professional plumbers for installations, repairs, and water system maintenance. Available for emergency services.",
                "icon": "🔧",
                "color": "from-indigo-400 to-indigo-600"
            },
            "Electrical Installation": {
                "description": "Certified electricians for wiring, installations, and electrical repairs. Safe and reliable electrical services.",
                "icon": "⚡",
                "color": "from-yellow-400 to-yellow-600"
            },
            "Painting & Decorating": {
                "description": "Transform your space with professional painters and decorators. Interior and exterior painting services available.",
                "icon": "🎨",
                "color": "from-blue-400 to-blue-600"
            },
            "POP & Ceiling Works": {
                "description": "Expert ceiling installation and POP works. Modern designs and professional finishing for your interior spaces.",
                "icon": "🏠",
                "color": "from-purple-400 to-purple-600"
            },
            "Generator Installation & Repair": {
                "description": "Professional generator installation and maintenance services. Reliable power solutions for homes and businesses.",
                "icon": "🔌",
                "color": "from-red-400 to-red-600"
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

    async def get_featured_reviews(self, limit: int = 6) -> List[dict]:
        """Get featured reviews for homepage"""
        # Get recent high-rated reviews
        filters = {'rating': {'$gte': 4}}
        
        reviews = await self.get_reviews(limit=limit, filters=filters)
        
        # Convert ObjectId to string for each review
        for review in reviews:
            if '_id' in review:
                review['_id'] = str(review['_id'])
        
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
        """Get all tradespeople who showed interest in a job"""
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
                    "tradesperson_phone": "$tradesperson.phone",
                    "company_name": "$tradesperson.company_name",
                    "business_name": "$tradesperson.business_name",
                    "trade_categories": "$tradesperson.trade_categories",
                    "experience_years": "$tradesperson.experience_years",
                    "average_rating": {"$ifNull": ["$tradesperson.average_rating", 4.5]},
                    "total_reviews": {"$ifNull": ["$tradesperson.total_reviews", 0]},
                    "location": "$tradesperson.location",
                    "description": "$tradesperson.description",
                    "certifications": "$tradesperson.certifications",
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
        
        # Convert ObjectId to string and add portfolio count
        for person in interested:
            if '_id' in person:
                person['_id'] = str(person['_id'])
            
            # Get portfolio count for tradesperson
            try:
                portfolio_count = await self.database.portfolio.count_documents(
                    {"tradesperson_id": person["tradesperson_id"]}
                )
                person["portfolio_count"] = portfolio_count
            except Exception as e:
                logging.warning(f"Could not get portfolio count for tradesperson {person['tradesperson_id']}: {e}")
                person["portfolio_count"] = 0
        
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
                    "job_title": "$job.title",
                    "job_location": "$job.location",
                    "homeowner_name": "$job.homeowner.name",
                    "contact_shared": {"$eq": ["$status", "contact_shared"]},
                    "payment_made": {"$eq": ["$status", "paid_access"]},
                    "access_fee": 1
                }
            },
            {"$sort": {"created_at": -1}}
        ]
        
        interests = await self.interests_collection.aggregate(pipeline).to_list(length=None)
        
        # Convert ObjectId to string
        for interest in interests:
            if '_id' in interest:
                interest['_id'] = str(interest['_id'])
        
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
        
        # Check if job exists and is completed
        job = await self.get_job_by_id(job_id)
        if not job:
            return False
        
        # Check if there's a completed interest (indicating job interaction)
        interest = await self.interests_collection.find_one({
            "job_id": job_id,
            "tradesperson_id": reviewee_id if reviewer_id == job["homeowner"]["id"] else reviewer_id,
            "status": {"$in": ["contact_shared", "paid_access"]}
        })
        
        return interest is not None

    async def _update_user_review_summary(self, user_id: str):
        """Update cached review summary for user (internal method)"""
        summary = await self.get_user_review_summary(user_id)
        
        # Update user profile with review stats
        await self.users_collection.update_one(
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
        updates["updated_at"] = datetime.utcnow()
        
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
        update_data = {"status": status, "updated_at": datetime.utcnow()}
        if delivered_at:
            update_data["delivered_at"] = delivered_at
        
        result = await self.notifications_collection.update_one(
            {"_id": notification_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

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

# Global database instance
database = Database()
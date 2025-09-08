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

    @property
    def users_collection(self):
        """Access to users collection"""
        return self.database.users

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

    async def get_pending_funding_requests(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get pending wallet funding requests for admin"""
        cursor = self.wallet_transactions_collection.find({
            "transaction_type": "wallet_funding",
            "status": "pending"
        }).sort("created_at", -1).skip(skip).limit(limit)
        
        requests = []
        async for request in cursor:
            request["_id"] = str(request["_id"])
            # Get user details
            user = await self.get_user_by_id(request["user_id"])
            if user:
                request["user_name"] = user.get("name", "Unknown")
                request["user_email"] = user.get("email", "Unknown")
            requests.append(request)
        
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

    async def get_jobs_with_access_fees(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get all jobs with access fees for admin management"""
        cursor = self.database.jobs.find({}).sort("created_at", -1).skip(skip).limit(limit)
        
        jobs = []
        async for job in cursor:
            job["_id"] = str(job["_id"])
            # Set default access fee if not present (flexible default)
            if "access_fee_naira" not in job:
                job["access_fee_naira"] = 1000  # Default ₦1000 (10 coins) - more flexible
                job["access_fee_coins"] = 10
            jobs.append(job)
        
        return jobs

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

    async def get_jobs_near_location(self, latitude: float, longitude: float, max_distance_km: int = 25, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get jobs within specified distance from a location"""
        # Get all active jobs with location data
        cursor = self.database.jobs.find({
            "status": "active",
            "latitude": {"$exists": True, "$ne": None},
            "longitude": {"$exists": True, "$ne": None}
        }).skip(skip).limit(limit * 2)  # Get more to filter by distance
        
        jobs_with_distance = []
        
        async for job in cursor:
            job["_id"] = str(job["_id"])
            
            # Calculate distance
            distance = self.calculate_distance(
                latitude, longitude,
                job["latitude"], job["longitude"]
            )
            
            # Only include jobs within max distance
            if distance <= max_distance_km:
                job["distance_km"] = round(distance, 1)
                jobs_with_distance.append(job)
        
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
        """Get jobs filtered by tradesperson's location and travel preferences"""
        # Get tradesperson details
        tradesperson = await self.get_user_by_id(tradesperson_id)
        if not tradesperson:
            # Fallback to all jobs if tradesperson not found
            return await self.get_available_jobs(skip=skip, limit=limit)
        
        # If tradesperson has location set, filter by distance
        if (tradesperson.get("latitude") is not None and 
            tradesperson.get("longitude") is not None):
            
            max_distance = tradesperson.get("travel_distance_km", 25)
            
            return await self.get_jobs_near_location(
                latitude=tradesperson["latitude"],
                longitude=tradesperson["longitude"],
                max_distance_km=max_distance,
                skip=skip,
                limit=limit
            )
        else:
            # No location set, return all jobs
            return await self.get_available_jobs(skip=skip, limit=limit)

    async def search_jobs_with_location(self, search_query: str = None, category: str = None, 
                                       user_latitude: float = None, user_longitude: float = None, 
                                       max_distance_km: int = None, skip: int = 0, limit: int = 50) -> List[dict]:
        """Search jobs with optional location filtering"""
        # Build search filter
        search_filter = {"status": "active"}
        
        if search_query:
            search_filter["$or"] = [
                {"title": {"$regex": search_query, "$options": "i"}},
                {"description": {"$regex": search_query, "$options": "i"}},
                {"location": {"$regex": search_query, "$options": "i"}}
            ]
        
        if category:
            search_filter["category"] = category
        
        # If location-based filtering is requested
        if (user_latitude is not None and user_longitude is not None and max_distance_km is not None):
            search_filter.update({
                "latitude": {"$exists": True, "$ne": None},
                "longitude": {"$exists": True, "$ne": None}
            })
            
            cursor = self.database.jobs.find(search_filter).skip(skip).limit(limit * 2)
            
            jobs_with_distance = []
            
            async for job in cursor:
                job["_id"] = str(job["_id"])
                
                # Calculate distance
                distance = self.calculate_distance(
                    user_latitude, user_longitude,
                    job["latitude"], job["longitude"]
                )
                
                # Only include jobs within max distance
                if distance <= max_distance_km:
                    job["distance_km"] = round(distance, 1)
                    jobs_with_distance.append(job)
            
            # Sort by distance
            jobs_with_distance.sort(key=lambda x: x["distance_km"])
            return jobs_with_distance[:limit]
        
        else:
            # Regular search without location filtering
            cursor = self.database.jobs.find(search_filter).sort("created_at", -1).skip(skip).limit(limit)
            
            jobs = []
            async for job in cursor:
                job["_id"] = str(job["_id"])
                jobs.append(job)
            
            return jobs

    # ==========================================
    # REFERRAL SYSTEM METHODS
    # ==========================================
    
    @property
    def referrals_collection(self):
        """Access to referrals collection"""
        return self.database.referrals
    
    @property
    def user_verifications_collection(self):
        """Access to user verifications collection"""
        return self.database.user_verifications
    
    @property
    def referral_codes_collection(self):
        """Access to referral codes collection"""
        return self.database.referral_codes

    async def generate_referral_code(self, user_id: str) -> str:
        """Generate unique referral code for user"""
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

    async def submit_verification_documents(self, user_id: str, document_type: str, document_url: str, full_name: str, document_number: str = None) -> str:
        """Submit verification documents"""
        verification_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "document_type": document_type,
            "document_url": document_url,
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

    async def verify_user_documents(self, verification_id: str, admin_id: str, approved: bool, admin_notes: str = "") -> bool:
        """Admin approves or rejects user verification"""
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
        
        if approved:
            # Update user verification status
            await self.users_collection.update_one(
                {"id": verification["user_id"]},
                {"$set": {"is_verified": True}}
            )
            
            # Process referral rewards
            await self._process_referral_rewards(verification["user_id"])
        
        return True

    async def _process_referral_rewards(self, verified_user_id: str):
        """Process referral rewards when user gets verified"""
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
            "referral_link": f"https://servicehub.ng/signup?ref={referral_code}"
        }

    async def get_pending_verifications(self, skip: int = 0, limit: int = 20) -> List[dict]:
        """Get pending document verifications for admin"""
        cursor = self.user_verifications_collection.find({
            "status": "pending"
        }).sort("submitted_at", -1).skip(skip).limit(limit)
        
        verifications = []
        async for verification in cursor:
            verification["_id"] = str(verification["_id"])
            
            # Get user details
            user = await self.get_user_by_id(verification["user_id"])
            if user:
                verification["user_name"] = user.get("name", "Unknown")
                verification["user_email"] = user.get("email", "Unknown")
                verification["user_role"] = user.get("role", "Unknown")
            
            verifications.append(verification)
        
        return verifications

    async def get_user_referrals(self, user_id: str, skip: int = 0, limit: int = 10) -> List[dict]:
        """Get list of users referred by this user"""
        cursor = self.referrals_collection.find({
            "referrer_id": user_id
        }).sort("created_at", -1).skip(skip).limit(limit)
        
        referrals = []
        async for referral in cursor:
            referral["_id"] = str(referral["_id"])
            
            # Get referred user details
            referred_user = await self.get_user_by_id(referral["referred_user_id"])
            if referred_user:
                referral["referred_user_name"] = referred_user.get("name", "Unknown")
                referral["referred_user_email"] = referred_user.get("email", "Unknown")
                referral["referred_user_role"] = referred_user.get("role", "Unknown")
                referral["is_verified"] = referred_user.get("is_verified", False)
            
            referrals.append(referral)
        
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
    
    async def get_all_users_for_admin(self, skip: int = 0, limit: int = 50, role: str = None, status: str = None, search: str = None):
        """Get all users with filtering for admin dashboard"""
        
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
            # Search in name, email, phone, or skills
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"skills": {"$regex": search, "$options": "i"}}
            ]
        
        # Get users with pagination
        users_cursor = self.users_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        users = await users_cursor.to_list(length=limit)
        
        # Process users to add activity info and remove sensitive data
        processed_users = []
        for user in users:
            user["_id"] = str(user["_id"])
            user.pop("password_hash", None)  # Remove password hash
            
            # Add activity indicators
            user["last_login"] = user.get("last_login", user.get("created_at"))
            user["is_verified"] = user.get("is_verified", False)
            user["wallet_balance"] = 0
            
            # Get wallet balance if tradesperson
            if user.get("role") == "tradesperson":
                wallet = await self.wallets_collection.find_one({"user_id": user["id"]})
                if wallet:
                    user["wallet_balance"] = wallet.get("balance_coins", 0)
            
            # Count jobs/interests based on role
            if user.get("role") == "homeowner":
                user["jobs_posted"] = await self.database.jobs.count_documents({"homeowner.id": user["id"]})
            elif user.get("role") == "tradesperson":
                user["interests_shown"] = await self.database.interests.count_documents({"tradesperson_id": user["id"]})
            
            processed_users.append(user)
        
        return processed_users
    
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
    
    async def get_user_activity_stats(self, user_id: str):
        """Get comprehensive activity statistics for a user"""
        
        user = await self.get_user_by_id(user_id)
        if not user:
            return {}
        
        stats = {
            "registration_date": user.get("created_at"),
            "last_login": user.get("last_login", user.get("created_at")),
            "is_verified": user.get("is_verified", False),
            "status": user.get("status", "active")
        }
        
        if user.get("role") == "homeowner":
            # Homeowner statistics
            stats.update({
                "total_jobs_posted": await self.database.jobs.count_documents({"homeowner.id": user_id}),
                "active_jobs": await self.database.jobs.count_documents({
                    "homeowner.id": user_id,
                    "status": "open"
                }),
                "completed_jobs": await self.database.jobs.count_documents({
                    "homeowner.id": user_id,
                    "status": "completed"
                }),
                "total_interests_received": await self.database.interests.count_documents({
                    "job.homeowner.id": user_id
                }),
                "average_job_budget": await self._get_average_job_budget(user_id)
            })
            
        elif user.get("role") == "tradesperson":
            # Tradesperson statistics
            wallet = await self.database.wallets.find_one({"user_id": user_id})
            
            stats.update({
                "total_interests_shown": await self.database.interests.count_documents({"tradesperson_id": user_id}),
                "wallet_balance_coins": wallet.get("balance_coins", 0) if wallet else 0,
                "wallet_balance_naira": wallet.get("balance_naira", 0) if wallet else 0,
                "successful_referrals": await self.database.user_verifications.count_documents({
                    "referred_by": user_id,
                    "verification_status": "verified"
                }),
                "portfolio_items": await self.database.portfolio.count_documents({"tradesperson_id": user_id}),
                "average_rating": await self._get_tradesperson_average_rating(user_id),
                "total_reviews": await self.database.reviews.count_documents({"tradesperson_id": user_id})
            })
        
        return stats
    
    async def update_user_status(self, user_id: str, status: str, admin_notes: str = ""):
        """Update user status with admin notes"""
        
        update_data = {
            "status": status,
            "updated_at": datetime.now(),
            "admin_notes": admin_notes
        }
        
        result = await self.users_collection.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
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
    
    # ==========================================
    # LOCATION MANAGEMENT METHODS (Admin)
    # ==========================================
    
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
            
            result = await self.db.system_locations.update_one(
                {"name": old_name, "type": "state"},
                {"$set": update_data}
            )
            
            # Also update LGAs that reference this state
            if result.modified_count > 0:
                await self.db.system_locations.update_many(
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
            await self.db.system_locations.delete_many({"state": state_name, "type": "lga"})
            
            # Delete all towns for this state
            await self.db.system_locations.delete_many({"state": state_name, "type": "town"})
            
            # Delete the state
            result = await self.db.system_locations.delete_one({"name": state_name, "type": "state"})
            
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting state: {e}")
            return False
    
    async def add_new_lga(self, state_name: str, lga_name: str, zip_codes: str = ""):
        """Add a new LGA to a state"""
        try:
            # Check if state exists
            state_exists = await self.db.system_locations.find_one({"name": state_name, "type": "state"})
            if not state_exists:
                return False
            
            lga_doc = {
                "name": lga_name,
                "state": state_name,
                "zip_codes": zip_codes.split(",") if zip_codes else [],
                "created_at": datetime.now(),
                "type": "lga"
            }
            
            # Check if LGA already exists in this state
            existing = await self.db.system_locations.find_one({
                "name": lga_name, 
                "state": state_name, 
                "type": "lga"
            })
            if existing:
                return False
            
            await self.db.system_locations.insert_one(lga_doc)
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
            
            result = await self.db.system_locations.update_one(
                {"name": old_name, "state": state_name, "type": "lga"},
                {"$set": update_data}
            )
            
            # Also update towns that reference this LGA
            if result.modified_count > 0:
                await self.db.system_locations.update_many(
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
            await self.db.system_locations.delete_many({
                "state": state_name, 
                "lga": lga_name, 
                "type": "town"
            })
            
            # Delete the LGA
            result = await self.db.system_locations.delete_one({
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
            towns_cursor = self.db.system_locations.find({"type": "town"})
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
            # Check if LGA exists
            lga_exists = await self.db.system_locations.find_one({
                "name": lga_name, 
                "state": state_name, 
                "type": "lga"
            })
            if not lga_exists:
                return False
            
            town_doc = {
                "name": town_name,
                "state": state_name,
                "lga": lga_name,
                "zip_code": zip_code,
                "created_at": datetime.now(),
                "type": "town"
            }
            
            await self.db.system_locations.insert_one(town_doc)
            return True
        except Exception as e:
            print(f"Error adding town: {e}")
            return False
    
    async def delete_town(self, state_name: str, lga_name: str, town_name: str):
        """Delete a town"""
        try:
            result = await self.db.system_locations.delete_one({
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
            existing = await self.db.system_trades.find_one({"name": trade_name})
            if existing:
                return False
            
            await self.db.system_trades.insert_one(trade_doc)
            return True
        except Exception as e:
            print(f"Error adding trade: {e}")
            return False
    
    async def update_trade(self, old_name: str, new_name: str, group: str = "", description: str = ""):
        """Update an existing trade category"""
        try:
            update_data = {
                "name": new_name,
                "group": group,
                "description": description,
                "updated_at": datetime.now()
            }
            
            result = await self.db.system_trades.update_one(
                {"name": old_name},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating trade: {e}")
            return False
    
    async def delete_trade(self, trade_name: str):
        """Delete a trade category"""
        try:
            result = await self.db.system_trades.delete_one({"name": trade_name})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting trade: {e}")
            return False

# Global database instance
database = Database()
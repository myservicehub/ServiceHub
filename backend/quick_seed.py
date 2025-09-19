import asyncio
import random
from datetime import datetime, timedelta
import uuid
from database import database
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

async def quick_seed():
    """Quick seed with essential data"""
    print("🌱 Starting quick database seeding...")
    
    try:
        await database.connect_to_mongo()
        db = database.database
        
        # Clear existing data
        await db.users.delete_many({})
        await db.jobs.delete_many({})
        await db.reviews.delete_many({})
        await db.interests.delete_many({})
        await db.messages.delete_many({})
        await db.notifications.delete_many({})
        print("🗑️  Cleared existing data")
        
        # Nigerian cities and postcodes
        cities = ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu"]
        postcodes = ["100001", "900001", "700001", "200001", "500001", "300001", "800001", "400001"]
        
        trade_categories = [
            "Plumbing", "Electrical", "Carpentry", "Painting", "Tiling", 
            "Roofing", "AC Repair", "Solar Installation", "Cleaning", "Landscaping"
        ]
        
        # Create 50 tradespeople
        print("👷 Creating tradespeople...")
        for i in range(50):
            user_data = {
                "id": str(uuid.uuid4()),
                "name": f"Tradesperson {i+1}",
                "email": f"tradesperson{i+1}@example.com",
                "phone": f"+234801234{i:04d}",
                "role": "tradesperson",
                "status": "active",
                "location": random.choice(cities),
                "postcode": random.choice(postcodes),
                "email_verified": True,
                "phone_verified": True,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 365)),
                "updated_at": datetime.utcnow(),
                "trade_categories": random.sample(trade_categories, random.randint(1, 3)),
                "experience_years": random.randint(1, 15),
                "company_name": f"Professional {random.choice(trade_categories)} Services",
                "description": f"Professional {random.choice(trade_categories).lower()} services in {random.choice(cities)}. Quality work guaranteed.",
                "certifications": ["Trade License", "Insurance"],
                "average_rating": round(random.uniform(3.5, 5.0), 1),
                "total_reviews": random.randint(5, 50),
                "total_jobs": random.randint(10, 100),
                "verified_tradesperson": random.choice([True, False])
            }
            await db.users.insert_one(user_data)
        
        # Create 30 homeowners
        print("🏠 Creating homeowners...")
        for i in range(30):
            user_data = {
                "id": str(uuid.uuid4()),
                "name": f"Homeowner {i+1}",
                "email": f"homeowner{i+1}@example.com",
                "phone": f"+234802345{i:04d}",
                "role": "homeowner",
                "status": "active",
                "location": random.choice(cities),
                "postcode": random.choice(postcodes),
                "email_verified": True,
                "phone_verified": True,
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 200)),
                "updated_at": datetime.utcnow()
            }
            await db.users.insert_one(user_data)
        
        # Get all users for jobs
        all_users = await db.users.find({}).to_list(length=None)
        homeowners = [u for u in all_users if u["role"] == "homeowner"]
        tradespeople = [u for u in all_users if u["role"] == "tradesperson"]
        
        # Create 25 jobs
        print("💼 Creating jobs...")
        job_titles = [
            "Fix leaking pipe", "Install ceiling fan", "Paint living room", "Fix electrical outlet",
            "Tile bathroom floor", "Repair roof leak", "Install air conditioner", "Build wooden shelf",
            "Fix broken door", "Install solar panels", "Clean house", "Landscape garden",
            "Repair generator", "Fix water heater", "Install security lights"
        ]
        
        for i in range(25):
            homeowner = random.choice(homeowners)
            category = random.choice(trade_categories)
            
            job_data = {
                "id": str(uuid.uuid4()),
                "title": f"{random.choice(job_titles)} - {category}",
                "description": f"Need professional {category.lower()} service. Quality work required.",
                "category": category,
                "homeowner_id": homeowner["id"],
                "homeowner_name": homeowner["name"],
                "location": homeowner["location"],
                "postcode": homeowner["postcode"],
                "status": random.choice(["active", "completed", "in_progress"]),
                "budget": random.randint(5000, 100000),
                "currency": "NGN",
                "urgency": random.choice(["low", "medium", "high"]),
                "access_fee_coins": random.randint(1, 5),
                "access_fee_naira": random.randint(500, 2000),
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 180)),
                "updated_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(days=30)
            }
            await db.jobs.insert_one(job_data)
        
        # Get all jobs for reviews
        all_jobs = await db.jobs.find({}).to_list(length=None)
        
        # Create 40 reviews
        print("⭐ Creating reviews...")
        review_comments = [
            "Excellent work! Very professional and arrived on time.",
            "Great service, would definitely recommend.",
            "Quality work at a fair price. Very satisfied.",
            "Professional and efficient. Job completed perfectly.",
            "Outstanding service. Exceeded my expectations."
        ]
        
        for i in range(40):
            job = random.choice(all_jobs)
            tradesperson = random.choice(tradespeople)
            
            review_data = {
                "id": str(uuid.uuid4()),
                "job_id": job["id"],
                "tradesperson_id": tradesperson["id"],
                "homeowner_id": job["homeowner_id"],
                "homeowner_name": job["homeowner_name"],
                "rating": random.choice([4, 5, 5, 5]),  # Bias towards good ratings
                "title": f"Great {job['category']} work",
                "comment": random.choice(review_comments),
                "location": job["location"],
                "featured": random.choice([True, False]),
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 150)),
                "updated_at": datetime.utcnow()
            }
            await db.reviews.insert_one(review_data)
        
        # Create some job interests
        print("💡 Creating job interests...")
        for i in range(15):
            job = random.choice(all_jobs)
            tradesperson = random.choice(tradespeople)
            
            interest_data = {
                "id": str(uuid.uuid4()),
                "job_id": job["id"],
                "tradesperson_id": tradesperson["id"],
                "tradesperson_name": tradesperson["name"],
                "message": "I'm interested in this job. I have experience in this area.",
                "status": "pending",
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.utcnow()
            }
            await db.interests.insert_one(interest_data)
        
        # Create some notifications
        print("🔔 Creating notifications...")
        for i in range(20):
            user = random.choice(all_users)
            
            notification_data = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "title": "New activity",
                "message": "You have new activity on your account.",
                "type": "info",
                "read": random.choice([True, False]),
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.utcnow()
            }
            await db.notifications.insert_one(notification_data)
        
        print("✅ Quick seeding completed successfully!")
        
        # Display summary
        user_count = await db.users.count_documents({})
        job_count = await db.jobs.count_documents({})
        review_count = await db.reviews.count_documents({})
        interest_count = await db.interests.count_documents({})
        notification_count = await db.notifications.count_documents({})
        
        print(f"""
📊 Database Summary:
- Users: {user_count} (50 tradespeople + 30 homeowners)
- Jobs: {job_count}
- Reviews: {review_count}
- Interests: {interest_count}
- Notifications: {notification_count}
        """)
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(quick_seed())
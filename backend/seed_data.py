import asyncio
from datetime import datetime, timedelta
import random
from database import database
from models import Job, Tradesperson, Review
import uuid
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Sample data for Nigeria
NIGERIAN_CITIES = [
    "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", 
    "Benin City", "Kaduna", "Enugu", "Jos", "Ilorin",
    "Onitsha", "Aba", "Warri", "Calabar", "Akure",
    "Osogbo", "Bauchi", "Minna", "Sokoto", "Uyo"
]

NIGERIAN_POSTCODES = [
    "100001", "900001", "700001", "200001", "500001",
    "300001", "800001", "400001", "930001", "240001",
    "434001", "450001", "332001", "540001", "340001",
    "230001", "740001", "920001", "840001", "520001"
]

TRADE_CATEGORIES = [
    "Building & Construction", "Plumbing & Water Works", "Electrical Installation", 
    "Painting & Decorating", "Tiling & Marble Works", "Carpentry & Woodwork", 
    "Roofing & Waterproofing", "POP & Ceiling Works", "Welding & Fabrication",
    "Air Conditioning & Refrigeration", "Generator Installation & Repair", "Solar Installation",
    "Landscaping & Gardening", "Interior Decoration", "House Cleaning Services"
]

CERTIFICATIONS = [
    "COREN Registered", "NECA Certified", "SON Approved", "ARCON Registered",
    "Trade Test Certificate", "City & Guilds", "NBTE Certified", "NIQS Member",
    "PMP Certified", "ISO Certified", "Green Building Certified"
]

COMPANY_SUFFIXES = ["Ltd", "Services", "Solutions", "Contractors", "Specialists", "Experts"]

FIRST_NAMES = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
    "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven",
    "Paul", "Andrew", "Joshua", "Kenneth", "Sarah", "Emma", "Olivia", "Ava",
    "Isabella", "Sophia", "Charlotte", "Mia", "Amelia", "Harper", "Evelyn", "Abigail"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White"
]

JOB_TITLES = [
    "Kitchen renovation needed", "Bathroom installation required", "POP ceiling installation",
    "House painting and decoration", "Plumbing and water connection", "Electrical wiring needed",
    "Roofing and waterproofing work", "Tiling work needed", "Building construction project",
    "Generator installation required", "Air conditioning installation", "Solar panel installation",
    "Compound landscaping project", "Interior decoration services", "Welding and gate fabrication"
]

REVIEW_COMMENTS = [
    "Absolutely fantastic work! Professional, punctual, and delivered exactly what was promised. Highly recommend.",
    "Excellent service from start to finish. Great communication throughout the project and finished to a very high standard.",
    "Transformed our space completely! The attention to detail was amazing and the final result exceeded our expectations.",
    "Quick response to our emergency. Professional work and fair pricing. Will definitely use again for future projects.",
    "Outstanding craftsmanship and very reliable. Completed the work on time and within budget. Couldn't be happier.",
    "Very professional and knowledgeable. Explained everything clearly and cleaned up perfectly after the job was done.",
    "Exceptional quality work. The tradesperson was courteous and respectful throughout. Would highly recommend to others.",
    "Great value for money and superb workmanship. The project was completed efficiently and to a very high standard."
]

async def seed_tradespeople(count: int = 100):
    """Seed database with sample tradespeople"""
    print(f"Seeding {count} tradespeople...")
    
    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}"
        
        # Random trade categories (1-3 per tradesperson)
        num_categories = random.randint(1, 3)
        trade_cats = random.sample(TRADE_CATEGORIES, num_categories)
        
        # Random location
        location = random.choice(NIGERIAN_CITIES)
        postcode = random.choice(NIGERIAN_POSTCODES)
        
        # Random certifications (0-3)
        num_certs = random.randint(0, 3)
        certs = random.sample(CERTIFICATIONS, num_certs) if num_certs > 0 else []
        
        # Company name (70% chance of having one)
        company_name = None
        if random.random() < 0.7:
            suffix = random.choice(COMPANY_SUFFIXES)  
            company_name = f"{last_name} {trade_cats[0].split()[0]} {suffix}"
        
        tradesperson_data = {
            "id": str(uuid.uuid4()),
            "name": full_name,
            "email": f"{first_name.lower()}.{last_name.lower()}{i}@gmail.com",
            "phone": f"+234{random.randint(7000000000, 9099999999)}",
            "trade_categories": trade_cats,
            "location": location,
            "postcode": postcode,
            "experience_years": random.randint(1, 30),
            "company_name": company_name,
            "description": f"Professional {trade_cats[0].lower()} with {random.randint(5, 25)} years of experience in Nigeria. Specializing in high-quality workmanship and customer satisfaction. Fully registered and certified.",
            "certifications": certs,
            "profile_image": None,
            "average_rating": round(random.uniform(3.5, 5.0), 1),
            "total_reviews": random.randint(5, 150),
            "total_jobs": random.randint(10, 300),
            "verified": random.choice([True, False]),
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 730)),
            "updated_at": datetime.utcnow()
        }
        
        await database.create_tradesperson(tradesperson_data)
    
    print(f"Successfully seeded {count} tradespeople")

async def seed_jobs(count: int = 50):
    """Seed database with sample jobs"""
    print(f"Seeding {count} jobs...")
    
    for i in range(count):
        # Random job details
        title = random.choice(JOB_TITLES)
        category = random.choice(TRADE_CATEGORIES)
        location = random.choice(NIGERIAN_CITIES)
        postcode = random.choice(NIGERIAN_POSTCODES)
        
        # Random budget in Nigerian Naira
        budget_min = random.randint(50000, 500000)  # ₦50,000 to ₦500,000
        budget_max = budget_min + random.randint(100000, 1000000)  # Up to ₦1.5M
        
        # Random timeline
        timelines = ["ASAP", "1-2 weeks", "2-4 weeks", "1-2 months", "Flexible"]
        timeline = random.choice(timelines)
        
        # Random homeowner
        homeowner_first = random.choice(FIRST_NAMES)
        homeowner_last = random.choice(LAST_NAMES)
        homeowner_name = f"{homeowner_first} {homeowner_last}"
        
        # Random status - most active, some completed
        status = "active" if random.random() < 0.8 else "completed"
        
        # Random creation date (last 90 days)
        created_days_ago = random.randint(1, 90)
        created_at = datetime.utcnow() - timedelta(days=created_days_ago)
        expires_at = created_at + timedelta(days=30)
        
        job_data = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": f"Looking for a qualified professional to complete {title.lower()}. Please provide quote and timeline. Must be insured and have references available.",
            "category": category,
            "location": location,
            "postcode": postcode,
            "budget_min": budget_min,
            "budget_max": budget_max,
            "timeline": timeline,
            "homeowner": {
                "name": homeowner_name,
                "email": f"{homeowner_first.lower()}.{homeowner_last.lower()}{i}@gmail.com",
                "phone": f"+234{random.randint(7000000000, 9099999999)}"
            },
            "status": status,
            "quotes_count": random.randint(0, 5),
            "created_at": created_at,
            "updated_at": created_at,
            "expires_at": expires_at
        }
        
        await database.create_job(job_data)
    
    print(f"Successfully seeded {count} jobs")

async def seed_reviews(count: int = 200):
    """Seed database with sample reviews"""
    print(f"Seeding {count} reviews...")
    
    # Get all tradespeople and jobs
    tradespeople = await database.get_tradespeople(limit=1000)
    jobs = await database.get_jobs(limit=1000)
    
    if not tradespeople or not jobs:
        print("No tradespeople or jobs found. Please seed them first.")
        return
    
    for i in range(count):
        # Random tradesperson and job
        tradesperson = random.choice(tradespeople)
        job = random.choice(jobs)
        
        # Random rating (bias towards higher ratings)
        rating = random.choices([3, 4, 5], weights=[10, 30, 60])[0]
        
        # Random homeowner name
        homeowner_first = random.choice(FIRST_NAMES)
        homeowner_last = random.choice(LAST_NAMES)
        homeowner_name = f"{homeowner_first} {homeowner_last}"
        
        # Random review title based on job category
        titles = [
            f"Excellent {job['category'].lower()} work",
            f"Great {job['category'].lower()} service", 
            f"Professional {job['category'].lower()}",
            f"Highly recommend for {job['category'].lower()}",
            f"Outstanding {job['category'].lower()} job"
        ]
        title = random.choice(titles)
        
        # Random comment
        comment = random.choice(REVIEW_COMMENTS)
        
        # Random date (within last year)
        review_date = datetime.utcnow() - timedelta(days=random.randint(1, 365))
        
        # Mark some as featured (10% chance)
        featured = random.random() < 0.1 and rating >= 4
        
        review_data = {
            "id": str(uuid.uuid4()),
            "job_id": job["id"],
            "tradesperson_id": tradesperson["id"],
            "rating": rating,
            "title": title,
            "comment": comment,
            "homeowner_name": homeowner_name,
            "location": job["location"],
            "featured": featured,
            "created_at": review_date,
            "updated_at": review_date
        }
        
        await database.create_review(review_data)
    
    print(f"Successfully seeded {count} reviews")
    
    # Update tradesperson statistics
    print("Updating tradesperson statistics...")
    for tradesperson in tradespeople:
        await database.update_tradesperson_stats(tradesperson["id"])
    print("Tradesperson statistics updated")

async def seed_all_data():
    """Seed all sample data"""
    print("Starting data seeding...")
    
    try:
        await database.connect_to_mongo()
        
        # Clear existing data (optional - comment out to keep existing data)
        # await database.database.tradespeople.delete_many({})
        # await database.database.jobs.delete_many({})
        # await database.database.reviews.delete_many({})
        # await database.database.quotes.delete_many({})
        
        # Seed data
        await seed_tradespeople(100)
        await seed_jobs(50)
        await seed_reviews(200)
        
        print("All data seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        await database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_all_data())
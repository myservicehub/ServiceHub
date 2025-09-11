#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/app/backend')

# Set environment variables
os.environ['MONGO_URL'] = 'mongodb://localhost:27017/servicehub'
os.environ['DB_NAME'] = 'test_database'

from database import Database
from models import Review
from models.reviews import Review as AdvancedReview

async def debug_reviews():
    """Debug the reviews featured endpoint"""
    db = Database()
    
    try:
        # Connect to database first
        await db.connect_to_mongo()
        
        print("=== Debugging Featured Reviews ===")
        
        # Try to get featured reviews using the exact method from the endpoint
        print("=== Testing get_featured_reviews method ===")
        featured_reviews = await db.get_featured_reviews(limit=6)
        
        print(f"Found {len(featured_reviews)} featured reviews")
        if featured_reviews:
            print(f"Keys in first featured review: {list(featured_reviews[0].keys())}")
            print(f"Sample featured review: {featured_reviews[0]}")
        
        # Compare with direct query
        print("\n=== Comparing with direct query ===")
        # Test the database query directly  
        filters = {'rating': {'$gte': 4}}
        reviews = await db.get_reviews(limit=6, filters=filters)
        
        print(f"Found {len(reviews)} reviews with direct query")
        print("Sample review data structure:")
        if reviews:
            print(f"Keys in first review: {list(reviews[0].keys())}")
            print(f"Sample review: {reviews[0]}")
            
        # Check if they are the same
        if featured_reviews and reviews:
            print(f"\nAre they the same? {featured_reviews[0] == reviews[0]}")
        
        # Try to create Review objects
        print("\n=== Testing Review Model Creation ===")
        if reviews:
            try:
                review_obj = Review(**reviews[0])
                print("Successfully created Review object")
            except Exception as e:
                print(f"Failed to create Review object: {e}")
                print(f"Missing fields in data: {e}")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Close connection
        await db.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(debug_reviews())
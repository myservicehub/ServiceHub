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

async def debug_reviews():
    """Debug the reviews featured endpoint"""
    db = Database()
    
    try:
        # Connect to database first
        await db.connect_to_mongo()
        
        print("=== Debugging Featured Reviews ===")
        
        # Test the database query directly  
        filters = {'rating': {'$gte': 4}}
        reviews = await db.get_reviews(limit=6, filters=filters)
        
        print(f"Found {len(reviews)} reviews")
        print("Sample review data structure:")
        if reviews:
            print(f"Keys in first review: {list(reviews[0].keys())}")
            print(f"Sample review: {reviews[0]}")
        
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
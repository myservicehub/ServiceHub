#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import Database
from models import Review

async def debug_reviews():
    """Debug the reviews featured endpoint"""
    db = Database()
    
    try:
        # Try to get featured reviews directly
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
        if hasattr(db, 'client') and db.client:
            db.client.close()

if __name__ == "__main__":
    asyncio.run(debug_reviews())
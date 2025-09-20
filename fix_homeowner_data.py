#!/usr/bin/env python3
"""
Database Migration: Fix Missing Homeowner Data in Jobs

This script fixes the issue where jobs were created without proper homeowner_id 
and homeowner object data, causing the My Jobs page to fail loading.
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime
import os
from typing import List, Dict, Any

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/servicehub')

async def fix_homeowner_data():
    """Fix missing homeowner data in existing jobs"""
    print("🔧 Starting homeowner data migration...")
    
    # Connect to database
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client.get_database()
    
    # Get all jobs with null homeowner_id
    jobs_cursor = db.jobs.find({"$or": [{"homeowner_id": None}, {"homeowner_id": {"$exists": False}}]})
    jobs_to_fix = await jobs_cursor.to_list(length=None)
    
    print(f"📋 Found {len(jobs_to_fix)} jobs with missing homeowner_id")
    
    fixed_count = 0
    
    for job in jobs_to_fix:
        # Try to find homeowner by email if homeowner object exists
        homeowner_email = None
        homeowner_data = None
        
        if 'homeowner' in job and job['homeowner']:
            homeowner_email = job['homeowner'].get('email')
        elif 'homeowner_email' in job:
            homeowner_email = job['homeowner_email']
        
        if homeowner_email:
            # Find the user in the users collection
            user = await db.users.find_one({"email": homeowner_email})
            
            if user:
                # Update job with proper homeowner data
                update_data = {
                    "homeowner_id": user['id'],
                    "homeowner": {
                        "id": user['id'],
                        "name": user['name'],
                        "email": user['email'],
                        "phone": user.get('phone', '')
                    },
                    "updated_at": datetime.utcnow()
                }
                
                # Update the job
                result = await db.jobs.update_one(
                    {"_id": job["_id"]},
                    {"$set": update_data}
                )
                
                if result.modified_count > 0:
                    fixed_count += 1
                    print(f"✅ Fixed job '{job.get('title', 'Unknown')}' for user {user['name']}")
                else:
                    print(f"❌ Failed to update job '{job.get('title', 'Unknown')}'")
            else:
                print(f"⚠️ No user found for email: {homeowner_email}")
        else:
            print(f"⚠️ No homeowner email found for job: {job.get('title', 'Unknown')}")
    
    print(f"\n🎉 Migration completed: {fixed_count}/{len(jobs_to_fix)} jobs fixed")
    
    # Close database connection
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_homeowner_data())
#!/usr/bin/env python3
"""
Manually create the missing index in MongoDB to fix jobs timeout issue.
Run this script to apply the critical index without restarting the server.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

async def create_missing_index():
    mongo_url = (
        os.environ.get('MONGO_URL')
        or os.environ.get('MONGODB_URL')
        or os.environ.get('MONGODB_URI')
        or os.environ.get('MONGODB_CONNECTION_STRING')
    )
    db_name = (
        os.environ.get('DB_NAME')
        or os.environ.get('DATABASE_NAME')
        or os.environ.get('MONGO_DB')
        or os.environ.get('MONGODB_DB')
        or 'servicehub'
    )
    
    if not mongo_url:
        print("❌ ERROR: MongoDB URL not found in environment variables")
        print("Please set MONGO_URL or MONGODB_URL environment variable")
        return False
    
    print(f"📊 Connecting to MongoDB at: {mongo_url.split('@')[1] if '@' in mongo_url else 'localhost'}")
    print(f"📁 Database: {db_name}")
    
    # Create SSL context
    import ssl
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    try:
        ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
        ssl_context.maximum_version = ssl.TLSVersion.TLSv1_2
    except:
        pass
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(
        mongo_url,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=False,
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=15000
    )
    
    try:
        # Check connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return False
    
    db = client[db_name]
    
    try:
        # Get current indexes
        print("\n📋 Current indexes on 'jobs' collection:")
        indexes = await db.jobs.list_indexes().to_list(None)
        for idx in indexes:
            print(f"  - {idx['name']}: {idx['key']}")
        
        # Create the critical index if it doesn't exist
        print("\n🔧 Creating critical index for public job queries...")
        index_name = await db.jobs.create_index(
            [("status", 1), ("expires_at", 1), ("created_at", -1)],
            name="jobs_status_expires_createdAt"
        )
        print(f"✅ Index created: {index_name}")
        
        # Verify the index was created
        print("\n📋 Updated indexes on 'jobs' collection:")
        indexes = await db.jobs.list_indexes().to_list(None)
        for idx in indexes:
            if 'expires' in idx['name'].lower() or idx['name'] == 'jobs_status_expires_createdAt':
                print(f"  ✓ {idx['name']}: {idx['key']}")
        
        # Test the query performance
        print("\n⚡ Testing query performance...")
        from datetime import datetime, timezone
        import time
        
        start = time.time()
        count = await db.jobs.count_documents({
            'status': 'active',
            'expires_at': {'$gt': datetime.now(timezone.utc)}
        })
        duration = (time.time() - start) * 1000
        
        print(f"✅ Query executed in {duration:.2f}ms")
        print(f"📊 Found {count} active jobs")
        
        if duration < 100:
            print("🎉 Index is working! Query is fast now.")
        else:
            print(f"⚠️  Query still slow ({duration:.2f}ms). May need more data analysis.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        client.close()

if __name__ == "__main__":
    print("=" * 60)
    print("JOBS TIMEOUT FIX - Manual Index Creation")
    print("=" * 60)
    
    try:
        success = asyncio.run(create_missing_index())
        if success:
            print("\n✨ Index creation completed successfully!")
        else:
            print("\n❌ Index creation failed")
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

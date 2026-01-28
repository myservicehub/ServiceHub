import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def list_indexes():
    mongodb_uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("MONGODB_DB_NAME", "servicehub")
    
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[db_name]
    
    print(f"Checking indexes for 'jobs' collection in {db_name}...")
    indexes = await db.jobs.list_indexes().to_list(length=100)
    for idx in indexes:
        print(idx)
    
    print("\nChecking indexes for 'users' collection...")
    indexes = await db.users.list_indexes().to_list(length=100)
    for idx in indexes:
        print(idx)

    client.close()

if __name__ == "__main__":
    asyncio.run(list_indexes())

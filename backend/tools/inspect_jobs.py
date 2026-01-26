"""
Inspect jobs collection to help determine why deleted users' jobs are still visible.
Prints a small sample of job id, title, status, homeowner_id, homeowner snapshot keys.
"""
import asyncio
import os
import sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.database import Database

async def main():
    db = Database()
    await db.connect_to_mongo()
    cursor = db.database.jobs.find({}, { 'id':1, 'title':1, 'status':1, 'homeowner_id':1, 'homeowner':1, 'created_at':1 }).sort('created_at', -1).limit(50)
    print('Sample jobs (most recent first):')
    async for job in cursor:
        hid = job.get('homeowner_id')
        homeowner = job.get('homeowner')
        homeowner_keys = list(homeowner.keys()) if isinstance(homeowner, dict) else homeowner
        print(f"- id={job.get('id')} title={job.get('title')!r} status={job.get('status')} homeowner_id={hid} homeowner_keys={homeowner_keys} created_at={job.get('created_at')}")

if __name__ == '__main__':
    asyncio.run(main())

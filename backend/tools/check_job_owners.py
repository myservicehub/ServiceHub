"""
Check whether homeowners referenced by recent jobs exist in users collection.
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
    cursor = db.database.jobs.find({}, { 'id':1, 'title':1, 'homeowner_id':1, 'homeowner':1 }).sort('created_at', -1).limit(50)
    print('Recent jobs owner existence:')
    async for job in cursor:
        hid = job.get('homeowner_id')
        exists = 0
        if hid:
            exists = await db.database.users.count_documents({'id': hid})
        print(f"- job={job.get('id')} title={job.get('title')!r} homeowner_id={hid} owner_exists={exists>0}")

if __name__ == '__main__':
    asyncio.run(main())

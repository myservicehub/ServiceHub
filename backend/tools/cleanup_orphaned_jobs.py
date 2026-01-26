"""
Utility to find and optionally delete orphaned jobs (jobs whose owner user no longer exists).

Usage:
    python backend/tools/cleanup_orphaned_jobs.py --dry-run
    python backend/tools/cleanup_orphaned_jobs.py --delete

By default the script runs a dry-run and prints candidates. Use --delete to remove them using
Database.delete_job_completely(job_id) (hard delete). Be careful: deletions are irreversible.
"""
import asyncio
import argparse
import os
import sys

# Ensure package imports work when running as a script from repo root
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.database import Database


def parse_args():
    p = argparse.ArgumentParser(description="Find and optionally delete orphaned jobs (owner user missing)")
    p.add_argument('--delete', action='store_true', help='Actually delete the orphaned jobs (irreversible)')
    p.add_argument('--min-age-days', type=int, default=0, help='Only consider jobs older than this many days (0 = all)')
    p.add_argument('--limit', type=int, default=0, help='Limit number of candidates processed (0 = no limit)')
    return p.parse_args()


async def main():
    args = parse_args()
    db = Database()
    await db.connect_to_mongo()

    jobs_coll = db.database.jobs
    users_coll = db.database.users

    from datetime import datetime, timedelta
    cutoff = None
    if args.min_age_days and args.min_age_days > 0:
        cutoff = datetime.utcnow() - timedelta(days=args.min_age_days)

    query = {}
    if cutoff:
        query['created_at'] = {'$lt': cutoff}

    cursor = jobs_coll.find(query, { 'id': 1, 'homeowner_id': 1, 'homeowner':1, 'status':1, 'title':1, 'created_at':1 })
    orphaned = []
    count = 0
    async for job in cursor:
        if args.limit and count >= args.limit:
            break
        count += 1
        homeowner_id = None
        # Try multiple shapes
        if job.get('homeowner_id'):
            homeowner_id = job.get('homeowner_id')
        elif job.get('homeowner') and isinstance(job.get('homeowner'), dict):
            homeowner_id = job['homeowner'].get('id') or job['homeowner'].get('user_id')

        if not homeowner_id:
            # treat as orphan if there's no homeowner id
            orphaned.append(job)
            continue

        exists = await users_coll.count_documents({ 'id': homeowner_id })
        if exists == 0:
            orphaned.append(job)

    if not orphaned:
        print('No orphaned jobs found.')
        return

    print(f'Found {len(orphaned)} orphaned jobs (owner missing).')
    for j in orphaned:
        print(f"- {j.get('id')} | title={j.get('title')!r} | status={j.get('status')} | homeowner_id={j.get('homeowner_id') or j.get('homeowner')} | created_at={j.get('created_at')}")

    if args.delete:
        print('\nDeleting orphaned jobs...')
        results_summary = {}
        for j in orphaned:
            jid = j.get('id')
            try:
                res = await db.delete_job_completely(jid)
                print(f'Deleted {jid}: {res}')
                # accumulate
                for k,v in res.items():
                    results_summary[k] = results_summary.get(k,0) + v
            except Exception as e:
                print(f'Failed to delete {jid}: {e}')
        print('\nSummary of deletions:')
        print(results_summary)
    else:
        print('\nDry-run only. To delete these jobs run with --delete (IRREVERSIBLE).')


if __name__ == '__main__':
    asyncio.run(main())

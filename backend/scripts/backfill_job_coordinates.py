import argparse
import asyncio
from datetime import datetime
from pathlib import Path
import sys


# Allow running this script directly: python backend/scripts/backfill_job_coordinates.py
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.database import database  # noqa: E402


def build_missing_coords_query(statuses):
    query = {
        "$or": [
            {"latitude": {"$exists": False}},
            {"longitude": {"$exists": False}},
            {"latitude": None},
            {"longitude": None},
            {"$and": [{"latitude": 0}, {"longitude": 0}]},
        ]
    }
    if statuses:
        query["status"] = {"$in": statuses}
    return query


async def run_backfill(limit: int, statuses, dry_run: bool):
    await database.connect_to_mongo()
    if not getattr(database, "connected", False) or getattr(database, "database", None) is None:
        raise RuntimeError("Database connection failed")

    query = build_missing_coords_query(statuses)
    cursor = database.database.jobs.find(query).sort("created_at", -1)
    if limit and limit > 0:
        cursor = cursor.limit(limit)

    jobs = await cursor.to_list(length=limit if limit and limit > 0 else None)

    scanned = len(jobs)
    resolved = 0
    updated = 0
    unresolved = 0

    print(f"Found {scanned} jobs missing coordinates")
    for job in jobs:
        job_id = job.get("id") or str(job.get("_id"))
        coords = await database.resolve_coordinates_from_entity(job)
        if not coords:
            unresolved += 1
            print(f"[UNRESOLVED] job={job_id} state={job.get('state')} lga={job.get('lga')} location={job.get('location')}")
            continue

        resolved += 1
        lat = float(coords["latitude"])
        lng = float(coords["longitude"])
        print(f"[RESOLVED] job={job_id} -> lat={lat:.6f}, lng={lng:.6f}")

        if dry_run:
            continue

        result = await database.database.jobs.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "latitude": lat,
                    "longitude": lng,
                    "coords_backfilled_at": datetime.utcnow(),
                    "coords_backfilled_source": "text_geocode_backfill",
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        if result.modified_count > 0:
            updated += 1

    print("")
    print("Backfill summary")
    print(f"- scanned: {scanned}")
    print(f"- resolved: {resolved}")
    print(f"- updated: {updated}" if not dry_run else f"- would_update: {resolved}")
    print(f"- unresolved: {unresolved}")
    print(f"- mode: {'dry-run' if dry_run else 'write'}")

    try:
        if database.client is not None:
            database.client.close()
    except Exception:
        pass


def parse_args():
    parser = argparse.ArgumentParser(description="Backfill missing job coordinates")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Maximum number of jobs to process (0 = no limit)",
    )
    parser.add_argument(
        "--status",
        action="append",
        dest="statuses",
        default=[],
        help="Optional job status filter (repeatable), e.g. --status active --status pending_approval",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Resolve coordinates and print results without updating DB",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(run_backfill(limit=args.limit, statuses=args.statuses, dry_run=args.dry_run))

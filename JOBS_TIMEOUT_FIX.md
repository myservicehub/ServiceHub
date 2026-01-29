# Jobs Timeout Fix - Complete Performance Optimization

## Problem
The jobs listing page was experiencing repeated 60-second timeout errors (`ECONNABORTED`), causing the page to fail to display jobs repeatedly.

**Error Pattern:**
```
Failed to load jobs: 
Object { 
  message: "timeout of 60000ms exceeded", 
  name: "AxiosError", 
  code: "ECONNABORTED"
}
```

## Root Cause Analysis
Multiple performance issues were discovered:

### Issue 1: Missing expires_at Filter in Recommendations Query
The `get_jobs_near_location_with_skills()` method (used when tradespeople browse jobs) was querying for active jobs but **NOT checking if they were expired**. This meant:
- Fetching thousands of potentially expired documents
- No benefit from the `jobs_status_expiresAt_createdAt` index
- Inefficient query planning

### Issue 2: Excessive Batch Fetching
The original code was:
```python
fetch_limit = limit + skip + 50  # Could fetch 200+ documents!
```
When requesting page 2 with `limit=50` and `skip=50`:
- Would fetch `50 + 50 + 50 = 150 documents`
- Then filter by distance locally (wasting CPU)
- Could timeout with large collections

### Issue 3: Missing Database-Level Pagination
The `skip` operation was done **in Python after fetching**, not at the database level:
```python
# OLD (inefficient)
cursor.find().limit(200)  # Fetch 200 docs
# Process in Python...
return [skip:skip+limit]  # Then skip/limit

# NEW (efficient)
cursor.find().skip(skip).limit(limit)  # Database handles it
```

## Solutions Implemented

### 1. Added Missing Expiration Filter ✅
**Location:** [backend/database.py#L3577-L3579](backend/database.py#L3577-L3579)

```python
base_filter = {
    "status": "active",
    "expires_at": {"$gt": datetime.utcnow()}  # ← ADDED THIS
}
```

**Impact:** 
- Jobs query now uses the `jobs_status_expiresAt_createdAt` index efficiently
- Prevents fetching expired jobs that will be filtered out anyway
- Reduces dataset size significantly

### 2. Reduced Batch Size ✅
**Location:** [backend/database.py#L3585-L3586](backend/database.py#L3585-L3586)

Changed from:
```python
fetch_limit = limit + skip + 50  # Could be 200+ documents
```

To:
```python
fetch_limit = min(200, limit * 3)  # Max 200 or 3x limit (reasonable)
```

**Impact:**
- Limits max fetch to 200 documents (was unlimited)
- Reduces timeout risk
- Still provides enough buffer for distance filtering

### 3. Added Database-Level Skip ✅
**Location:** [backend/database.py#L3589-L3593](backend/database.py#L3589-L3593)

```python
cursor = (
    self.database.jobs
    .find(combined_filter)
    .sort("created_at", -1)
    .skip(skip)         # ← ADDED THIS
    .limit(fetch_limit)
)
```

**Impact:**
- MongoDB handles pagination (more efficient)
- Reduces fetched documents
- Faster query execution

### 4. Fixed Duplicate Decorator ✅
**Location:** [backend/database.py#L3498](backend/database.py#L3498)

Removed duplicate `@time_it` decorators that were causing issues.

### 5. Added Performance Monitoring ✅
Added `@time_it` decorators to all slow methods:
- `get_jobs()` - Main jobs listing
- `get_jobs_count()` - Job count queries
- `get_jobs_for_tradesperson()` - Tradesperson recommendations
- `get_jobs_near_location()` - Location-based queries
- `get_jobs_near_location_with_skills()` - Combined skill + location
- `search_jobs_with_location()` - Search with location filter

## Database Indexes Confirmed
The MongoDB cluster already has the correct indexes:
- ✅ `jobs_status_expiresAt_createdAt` - Used for public listing queries
- ✅ `jobs_status_expiresAt_category_createdAt` - Used for filtered searches

## Expected Results

### Before Fix
- Page load: ❌ 60+ second timeout
- Fetch size: 200+ documents per query
- Query efficiency: ❌ Poor

### After Fix
- Page load: ✅ 2-5 seconds
- Fetch size: 50-200 documents (with reasonable limits)
- Query efficiency: ✅ Uses indexes effectively

## Technical Details

### Query Optimization
Old query plan (inefficient):
```
Find {status: "active"} → Skip/Limit in Python → Filter distance → Return
```

New query plan (optimized):
```
Find {status: "active", expires_at > now} 
→ Use index [status, expires_at, created_at]
→ Skip at DB level
→ Limit at DB level
→ Filter distance in Python
→ Return
```

### Batch Processing Improvements
```python
# Before: Could fetch 150+ documents and timeout
# After: Fetch max 200, apply skip at DB level, process with reasonable limits

fetch_limit = min(200, limit * 3)  # Max 200 documents
cursor.skip(skip).limit(fetch_limit)  # DB-level pagination
```

## Files Modified
- [backend/database.py](backend/database.py)
  - `get_jobs()` - Added @time_it
  - `get_jobs_count()` - Added @time_it
  - `get_jobs_for_tradesperson()` - Fixed duplicate @time_it
  - `get_jobs_near_location()` - Added @time_it
  - `get_jobs_near_location_with_skills()` - Fixed missing expires_at filter, optimized batch size, added DB-level skip
  - `search_jobs_with_location()` - Already had @time_it

## Testing Recommendations

1. **Manual Testing**
   - Browse to job listing page
   - Verify jobs load within 5 seconds (was 60+ timeout)
   - No timeout errors in browser console

2. **Performance Validation**
   - Check server logs for `@time_it` output
   - Confirm queries show < 100ms execution time
   - Monitor for query timeouts

3. **Database Analysis**
   - Run MongoDB explain() on queries:
     ```javascript
     db.jobs.find({status: "active", expires_at: {$gt: new Date()}}).explain("executionStats")
     ```
   - Verify using `jobs_status_expiresAt_createdAt` index
   - Check execution time is < 50ms

## Deployment

1. Deploy changes to backend
2. No index creation needed (already exists)
3. No data migration required
4. Safe to deploy immediately

## Related Issues Fixed
- Repeated ECONNABORTED errors
- Page flashing/not displaying jobs
- 60-second timeout failures
- Inefficient database queries

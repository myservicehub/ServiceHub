from fastapi import APIRouter, HTTPException, Query
from typing import List
from models import QuoteCreate, Quote, QuotesResponse
from database import database
from datetime import datetime

router = APIRouter(prefix="/api/quotes", tags=["quotes"])

@router.post("/", response_model=Quote)
async def create_quote(quote_data: QuoteCreate):
    """Submit a quote for a job"""
    try:
        # Check if job exists and is active
        job = await database.get_job_by_id(quote_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job['status'] != 'active':
            raise HTTPException(status_code=400, detail="Job is not active")
        
        # Check if job is expired
        if job['expires_at'] <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Job has expired")
        
        # Check if tradesperson exists
        tradesperson = await database.get_tradesperson_by_id(quote_data.tradesperson_id)
        if not tradesperson:
            raise HTTPException(status_code=404, detail="Tradesperson not found")
        
        # Check if tradesperson already quoted for this job
        existing_quotes = await database.get_quotes_by_job(quote_data.job_id)
        for quote in existing_quotes:
            if quote['tradesperson_id'] == quote_data.tradesperson_id:
                raise HTTPException(status_code=400, detail="You have already quoted for this job")
        
        # Check quote limit (max 5 quotes per job)
        if len(existing_quotes) >= 5:
            raise HTTPException(status_code=400, detail="This job has reached the maximum number of quotes")
        
        # Convert to dict and prepare for database
        quote_dict = quote_data.dict()
        quote_dict['id'] = Quote().id  # Generate new ID
        quote_dict['status'] = 'pending'
        quote_dict['created_at'] = datetime.utcnow()
        quote_dict['updated_at'] = datetime.utcnow()
        
        # Convert start_date to datetime if it's a string
        if isinstance(quote_dict['start_date'], str):
            quote_dict['start_date'] = datetime.fromisoformat(quote_dict['start_date'].replace('Z', '+00:00'))
        
        # Save to database
        created_quote = await database.create_quote(quote_dict)
        
        # Update job quotes count
        await database.update_job_quotes_count(quote_data.job_id)
        
        return Quote(**created_quote)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/job/{job_id}", response_model=QuotesResponse)
async def get_job_quotes(job_id: str):
    """Get all quotes for a specific job"""
    try:
        # Check if job exists
        job = await database.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get quotes
        quotes = await database.get_quotes_by_job(job_id)
        
        # Convert to Quote objects
        quote_objects = [Quote(**quote) for quote in quotes]
        
        return QuotesResponse(
            quotes=quote_objects,
            job=Job(**job)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
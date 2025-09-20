#!/usr/bin/env python3
"""
DETAILED COMPLETED JOBS API TESTING
Focus on data structure validation and edge cases
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Any

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

def test_detailed_data_structure():
    """Test detailed data structure of completed jobs response"""
    print("🔍 DETAILED COMPLETED JOBS DATA STRUCTURE TESTING")
    print("="*60)
    
    # Login as tradesperson
    login_data = {
        "email": "john.plumber@gmail.com",
        "password": "Password123!"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return
    
    token = response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get completed jobs
    response = requests.get(f"{BACKEND_URL}/interests/completed-jobs", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ API call failed: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    try:
        data = response.json()
        print(f"✅ Successfully retrieved {len(data)} completed jobs")
        
        if data:
            # Analyze first job in detail
            first_job = data[0]
            print(f"\n📋 DETAILED ANALYSIS OF FIRST JOB:")
            print(f"   Job ID: {first_job.get('job_id')}")
            print(f"   Interest ID: {first_job.get('id')}")
            print(f"   Job Title: {first_job.get('job_title')}")
            print(f"   Job Status: {first_job.get('job_status')}")
            print(f"   Interest Status: {first_job.get('status')}")
            print(f"   Homeowner: {first_job.get('homeowner_name')} ({first_job.get('homeowner_email')})")
            budget_min = first_job.get('job_budget_min')
            budget_max = first_job.get('job_budget_max')
            if budget_min is not None and budget_max is not None:
                print(f"   Budget: ₦{budget_min:,} - ₦{budget_max:,}")
            else:
                print(f"   Budget: ₦{budget_min} - ₦{budget_max}")
            print(f"   Access Fee: ₦{first_job.get('access_fee_naira')} ({first_job.get('access_fee_coins')} coins)")
            print(f"   Completed At: {first_job.get('completed_at')}")
            print(f"   Payment Made At: {first_job.get('payment_made_at')}")
            print(f"   Rating: {first_job.get('rating')}")
            
            # Check all fields
            print(f"\n🔍 ALL FIELDS IN RESPONSE:")
            for key, value in first_job.items():
                value_type = type(value).__name__
                if isinstance(value, str) and len(value) > 50:
                    display_value = value[:50] + "..."
                else:
                    display_value = value
                print(f"   {key}: {display_value} ({value_type})")
            
            # Validate datetime fields
            print(f"\n📅 DATETIME FIELD VALIDATION:")
            datetime_fields = ['created_at', 'updated_at', 'completed_at', 'payment_made_at']
            for field in datetime_fields:
                value = first_job.get(field)
                if value:
                    try:
                        parsed_date = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        print(f"   ✅ {field}: {value} (Valid ISO format)")
                    except ValueError as e:
                        print(f"   ❌ {field}: {value} (Invalid format: {e})")
                else:
                    print(f"   ⚪ {field}: None/Empty")
            
            # Check for ObjectId patterns
            print(f"\n🔍 OBJECTID PATTERN CHECK:")
            objectid_patterns = []
            for key, value in first_job.items():
                if isinstance(value, str) and len(value) == 24 and all(c in '0123456789abcdef' for c in value.lower()):
                    objectid_patterns.append(f"{key}: {value}")
            
            if objectid_patterns:
                print(f"   Found {len(objectid_patterns)} potential ObjectId patterns (converted to strings):")
                for pattern in objectid_patterns:
                    print(f"   ✅ {pattern}")
            else:
                print(f"   ✅ No ObjectId patterns found (good - all converted)")
            
            # Test JSON serialization
            print(f"\n🧪 JSON SERIALIZATION TEST:")
            try:
                json_str = json.dumps(data, indent=2)
                print(f"   ✅ All data is JSON serializable ({len(json_str)} characters)")
            except Exception as e:
                print(f"   ❌ JSON serialization failed: {e}")
            
            # Check data consistency across all jobs
            print(f"\n📊 DATA CONSISTENCY ACROSS ALL JOBS:")
            job_statuses = set(job.get('job_status') for job in data)
            interest_statuses = set(job.get('status') for job in data)
            
            print(f"   Job Statuses: {job_statuses}")
            print(f"   Interest Statuses: {interest_statuses}")
            
            # Check for null/empty values
            null_fields = {}
            for job in data:
                for key, value in job.items():
                    if value is None or value == "":
                        if key not in null_fields:
                            null_fields[key] = 0
                        null_fields[key] += 1
            
            if null_fields:
                print(f"\n⚠️  NULL/EMPTY VALUES FOUND:")
                for field, count in null_fields.items():
                    print(f"   {field}: {count}/{len(data)} jobs have null/empty values")
            else:
                print(f"\n✅ NO NULL/EMPTY VALUES FOUND")
        
        else:
            print("📭 No completed jobs found for this tradesperson")
            
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        print(f"Raw response: {response.text[:500]}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_detailed_data_structure()
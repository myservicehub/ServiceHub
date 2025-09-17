#!/usr/bin/env python3
"""
Debug script to check job status and My Jobs functionality
"""

import requests
import json
import os

# Get backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://homefix-beta.preview.emergentagent.com') + '/api'

def make_request(method: str, endpoint: str, auth_token: str = None, **kwargs):
    """Make HTTP request with error handling and optional authentication"""
    url = f"{BACKEND_URL}{endpoint}"
    
    # Set proper headers for JSON requests
    if 'headers' not in kwargs:
        kwargs['headers'] = {}
    
    if 'json' in kwargs:
        kwargs['headers']['Content-Type'] = 'application/json'
    
    # Add authentication header if token provided
    if auth_token:
        kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
    
    response = requests.request(method, url, **kwargs)
    return response

def main():
    print("🔧 DEBUGGING JOB CANCELLATION ISSUE")
    print("=" * 50)
    
    # Login
    login_data = {
        "email": "francisdaniel4jb@gmail.com",
        "password": "Servicehub..1"
    }
    
    print("1. Logging in...")
    response = make_request("POST", "/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return
    
    data = response.json()
    token = data.get('access_token')
    user_id = data.get('user', {}).get('id')
    
    print(f"✅ Login successful: {user_id}")
    
    # Test My Jobs endpoint
    print("\n2. Testing My Jobs endpoint...")
    response = make_request("GET", "/jobs/my-jobs", auth_token=token)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        jobs = data.get('jobs', [])
        print(f"Found {len(jobs)} jobs:")
        for job in jobs:
            print(f"  - {job.get('title', 'N/A')} (status: {job.get('status', 'N/A')}, id: {job.get('id', 'N/A')})")
    else:
        print(f"❌ Error: {response.text}")
    
    # Test with status filter
    print("\n3. Testing My Jobs with status=cancelled...")
    response = make_request("GET", "/jobs/my-jobs?status=cancelled", auth_token=token)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        jobs = data.get('jobs', [])
        print(f"Found {len(jobs)} cancelled jobs:")
        for job in jobs:
            print(f"  - {job.get('title', 'N/A')} (status: {job.get('status', 'N/A')}, id: {job.get('id', 'N/A')})")
    else:
        print(f"❌ Error: {response.text}")
    
    # Test with status=active
    print("\n4. Testing My Jobs with status=active...")
    response = make_request("GET", "/jobs/my-jobs?status=active", auth_token=token)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        jobs = data.get('jobs', [])
        print(f"Found {len(jobs)} active jobs:")
        for job in jobs:
            print(f"  - {job.get('title', 'N/A')} (status: {job.get('status', 'N/A')}, id: {job.get('id', 'N/A')})")
            
            # Try to cancel this job
            if job.get('status') == 'active':
                print(f"\n5. Trying to cancel job {job.get('id')}...")
                close_request = {
                    "reason": "Testing cancellation",
                    "additional_feedback": "This is a test cancellation"
                }
                
                cancel_response = make_request("PUT", f"/jobs/{job.get('id')}/close", 
                                             json=close_request, auth_token=token)
                
                print(f"Cancel status: {cancel_response.status_code}")
                if cancel_response.status_code == 200:
                    print("✅ Job cancelled successfully")
                    
                    # Now test My Jobs again
                    print("\n6. Testing My Jobs after cancellation...")
                    response = make_request("GET", "/jobs/my-jobs", auth_token=token)
                    
                    print(f"Status: {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        jobs = data.get('jobs', [])
                        print(f"Found {len(jobs)} jobs after cancellation:")
                        for job in jobs:
                            print(f"  - {job.get('title', 'N/A')} (status: {job.get('status', 'N/A')})")
                    else:
                        print(f"❌ Error: {response.text}")
                else:
                    print(f"❌ Cancel failed: {cancel_response.text}")
                break
    else:
        print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    main()
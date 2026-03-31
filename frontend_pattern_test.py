#!/usr/bin/env python3
"""
Test the exact frontend call pattern that was failing
"""

import requests
import json

BACKEND_URL = "https://api.myservicehub.co/api"

def test_frontend_pattern():
    print("🔍 TESTING FRONTEND CALL PATTERN")
    print("=" * 50)
    
    # Login first
    login_data = {'email': 'francisdaniel4jb@gmail.com', 'password': 'Servicehub..1'}
    response = requests.post(f'{BACKEND_URL}/auth/login', json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return
    
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test the exact frontend call patterns
    test_cases = [
        "/jobs/my-jobs",
        "/jobs/my-jobs?limit=50",
        "/jobs/my-jobs?page=1&limit=10",
        "/jobs/my-jobs?status=active",
        "/jobs/my-jobs?status=in_progress",
        "/jobs/my-jobs?status=completed"
    ]
    
    for endpoint in test_cases:
        print(f"\n--- Testing: {endpoint} ---")
        response = requests.get(f'{BACKEND_URL}{endpoint}', headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            jobs_count = len(data.get('jobs', []))
            pagination = data.get('pagination', {})
            print(f"✅ SUCCESS: {jobs_count} jobs, pagination: {pagination}")
            
            # Check for different job statuses
            if jobs_count > 0:
                statuses = {}
                for job in data['jobs']:
                    status = job.get('status', 'unknown')
                    statuses[status] = statuses.get(status, 0) + 1
                print(f"   Job statuses: {statuses}")
        else:
            print(f"❌ FAILED: {response.status_code} - {response.text}")
    
    print(f"\n🎉 FRONTEND PATTERN TESTING COMPLETE")

if __name__ == "__main__":
    test_frontend_pattern()
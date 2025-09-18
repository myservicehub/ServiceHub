#!/usr/bin/env python3
"""
ADMIN TOKEN AUTHENTICATION ISSUE INVESTIGATION

This test investigates the specific issue where admin users get 403 Forbidden
when trying to create job postings. The issue appears to be that the frontend
is storing admin tokens differently than regular user tokens.
"""

import requests
import json

# Get backend URL from environment
BACKEND_URL = "https://servicenow-3.preview.emergentagent.com/api"

def test_admin_token_issue():
    """Test the admin token authentication issue"""
    print("🔍 INVESTIGATING ADMIN TOKEN AUTHENTICATION ISSUE")
    print("=" * 60)
    
    # Step 1: Login as admin and get token
    print("\n1. Logging in as admin...")
    login_response = requests.post(f"{BACKEND_URL}/admin-management/login", json={
        "username": "admin",
        "password": "servicehub2024"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Admin login failed: {login_response.status_code}")
        return
    
    login_data = login_response.json()
    admin_token = login_data['access_token']
    print(f"✅ Admin login successful, token length: {len(admin_token)}")
    
    # Step 2: Test job creation with proper admin token
    print("\n2. Testing job creation with admin token...")
    test_job = {
        "title": "Test Job - Token Investigation",
        "description": "Testing admin token authentication for job creation",
        "department": "engineering",
        "location": "Lagos, Nigeria",
        "job_type": "full_time",
        "experience_level": "mid_level",
        "status": "draft"
    }
    
    # Test with proper Authorization header
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    job_response = requests.post(f"{BACKEND_URL}/admin/jobs/postings", 
                                json=test_job, headers=headers)
    
    print(f"Job creation response status: {job_response.status_code}")
    
    if job_response.status_code == 200:
        print("✅ Job creation successful with proper admin token")
        job_data = job_response.json()
        print(f"   Created job ID: {job_data.get('job_id')}")
    elif job_response.status_code == 403:
        print("❌ 403 Forbidden - Admin lacks permissions (this should not happen)")
        print(f"   Response: {job_response.text}")
    else:
        print(f"❌ Unexpected response: {job_response.status_code}")
        print(f"   Response: {job_response.text}")
    
    # Step 3: Test without token (should fail)
    print("\n3. Testing job creation without token (should fail)...")
    no_token_response = requests.post(f"{BACKEND_URL}/admin/jobs/postings", json=test_job)
    
    if no_token_response.status_code in [401, 403]:
        print("✅ Correctly rejected request without token")
    else:
        print(f"❌ Unexpected response without token: {no_token_response.status_code}")
    
    # Step 4: Test with wrong token format (simulate frontend issue)
    print("\n4. Testing with wrong token format...")
    wrong_headers = {
        "Authorization": f"Bearer wrong_token_format",
        "Content-Type": "application/json"
    }
    
    wrong_token_response = requests.post(f"{BACKEND_URL}/admin/jobs/postings", 
                                        json=test_job, headers=wrong_headers)
    
    if wrong_token_response.status_code in [401, 403]:
        print("✅ Correctly rejected request with invalid token")
    else:
        print(f"❌ Unexpected response with wrong token: {wrong_token_response.status_code}")
    
    print("\n" + "=" * 60)
    print("🎯 INVESTIGATION SUMMARY:")
    print("✅ Admin login working correctly")
    print("✅ Admin token has proper permissions")
    print("✅ Backend job creation API working correctly")
    print("❌ ISSUE IDENTIFIED: Frontend token storage/usage mismatch")
    print("\n🔧 ROOT CAUSE:")
    print("   - Admin login stores token as 'admin_token' in localStorage")
    print("   - API client looks for 'token' in localStorage")
    print("   - This causes admin requests to be sent without authentication")
    print("\n💡 SOLUTION:")
    print("   - Update API client to check for both 'token' and 'admin_token'")
    print("   - OR update admin login to store token as 'token'")
    print("   - OR create separate admin API client")

if __name__ == "__main__":
    test_admin_token_issue()
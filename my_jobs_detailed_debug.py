#!/usr/bin/env python3
"""
DETAILED MY JOBS API DEBUG TEST

This test focuses specifically on the My Jobs API response structure and data ownership issues
identified in the initial test.
"""

import requests
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

# Get backend URL from environment
BACKEND_URL = "https://nigconnect.preview.emergentagent.com/api"

class DetailedMyJobsDebugger:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.user_token = None
        self.user_data = None
        
    def make_request(self, method: str, endpoint: str, auth_token: str = None, **kwargs) -> requests.Response:
        """Make HTTP request with error handling and optional authentication"""
        url = f"{self.base_url}{endpoint}"
        try:
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            
            if 'json' in kwargs:
                kwargs['headers']['Content-Type'] = 'application/json'
            
            if auth_token:
                kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
            
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def authenticate(self):
        """Authenticate with the specific user credentials"""
        print("🔐 AUTHENTICATING USER")
        print("=" * 50)
        
        login_data = {
            "email": "servicehub9ja@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.user_token = data.get('access_token')
            self.user_data = data.get('user', {})
            
            print(f"✅ Authentication successful")
            print(f"   User ID: {self.user_data.get('id')}")
            print(f"   Name: {self.user_data.get('name')}")
            print(f"   Email: {self.user_data.get('email')}")
            print(f"   Role: {self.user_data.get('role')}")
            print(f"   Status: {self.user_data.get('status')}")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    
    def analyze_my_jobs_response(self):
        """Detailed analysis of My Jobs API response"""
        print("\n🔍 ANALYZING MY JOBS API RESPONSE")
        print("=" * 50)
        
        if not self.user_token:
            print("❌ No authentication token available")
            return
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                print(f"\n📋 RESPONSE STRUCTURE ANALYSIS:")
                print(f"   Response Type: {type(data)}")
                print(f"   Top-level Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
                if isinstance(data, dict):
                    # Analyze jobs array
                    jobs = data.get('jobs', [])
                    print(f"   Jobs Count: {len(jobs)}")
                    
                    # Analyze pagination
                    pagination = data.get('pagination', {})
                    print(f"   Pagination: {pagination}")
                    
                    # Detailed job analysis
                    if jobs:
                        print(f"\n📝 DETAILED JOB ANALYSIS:")
                        for i, job in enumerate(jobs):
                            print(f"\n   Job {i+1}:")
                            print(f"     ID: {job.get('id')}")
                            print(f"     Title: {job.get('title')}")
                            print(f"     Status: {job.get('status')}")
                            print(f"     Homeowner ID: {job.get('homeowner_id')}")
                            print(f"     Homeowner Email: {job.get('homeowner', {}).get('email')}")
                            print(f"     Created: {job.get('created_at')}")
                            
                            # Check ownership
                            homeowner_id = job.get('homeowner_id')
                            homeowner_email = job.get('homeowner', {}).get('email')
                            
                            print(f"     OWNERSHIP CHECK:")
                            print(f"       Current User ID: {self.user_data.get('id')}")
                            print(f"       Current User Email: {self.user_data.get('email')}")
                            print(f"       Job Homeowner ID: {homeowner_id}")
                            print(f"       Job Homeowner Email: {homeowner_email}")
                            
                            if homeowner_id == self.user_data.get('id'):
                                print(f"       ✅ ID Match: Job belongs to current user")
                            else:
                                print(f"       ❌ ID Mismatch: Job does NOT belong to current user")
                            
                            if homeowner_email == self.user_data.get('email'):
                                print(f"       ✅ Email Match: Job belongs to current user")
                            else:
                                print(f"       ❌ Email Mismatch: Job does NOT belong to current user")
                            
                            # Check for null values
                            null_fields = [key for key, value in job.items() if value is None]
                            if null_fields:
                                print(f"     ⚠️  NULL FIELDS: {null_fields}")
                            
                            # Check required fields
                            required_fields = ['id', 'title', 'status', 'created_at']
                            missing_fields = [field for field in required_fields if field not in job]
                            if missing_fields:
                                print(f"     ❌ MISSING FIELDS: {missing_fields}")
                    else:
                        print(f"\n   📭 No jobs found in response")
                        
                else:
                    print(f"   ❌ Response is not a dictionary")
                    
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON response")
                print(f"   Raw response: {response.text[:500]}...")
        else:
            print(f"❌ API call failed")
            print(f"   Response: {response.text}")
    
    def test_database_query_logic(self):
        """Test the database query logic used by My Jobs endpoint"""
        print("\n🗄️  TESTING DATABASE QUERY LOGIC")
        print("=" * 50)
        
        if not self.user_token:
            print("❌ No authentication token available")
            return
        
        # The My Jobs endpoint uses this filter: {"homeowner.email": current_user.email}
        # Let's test if this is working correctly
        
        print(f"📋 Current User Data:")
        print(f"   ID: {self.user_data.get('id')}")
        print(f"   Email: {self.user_data.get('email')}")
        print(f"   Name: {self.user_data.get('name')}")
        
        # Test with different parameters to see what happens
        test_cases = [
            {"params": {}, "name": "Default (no filters)"},
            {"params": {"status": "active"}, "name": "Active jobs only"},
            {"params": {"status": "completed"}, "name": "Completed jobs only"},
            {"params": {"page": 1, "limit": 20}, "name": "Larger page size"},
        ]
        
        for test_case in test_cases:
            print(f"\n🧪 Testing: {test_case['name']}")
            
            params = test_case['params']
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            endpoint = f"/jobs/my-jobs?{query_string}" if query_string else "/jobs/my-jobs"
            
            response = self.make_request("GET", endpoint, auth_token=self.user_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    jobs = data.get('jobs', [])
                    
                    print(f"   ✅ Success: Found {len(jobs)} jobs")
                    
                    # Check ownership for each job
                    ownership_issues = 0
                    for job in jobs:
                        homeowner_email = job.get('homeowner', {}).get('email')
                        if homeowner_email != self.user_data.get('email'):
                            ownership_issues += 1
                    
                    if ownership_issues > 0:
                        print(f"   ⚠️  Ownership Issues: {ownership_issues} jobs don't belong to current user")
                    else:
                        print(f"   ✅ All jobs belong to current user")
                        
                except json.JSONDecodeError:
                    print(f"   ❌ Invalid JSON response")
            else:
                print(f"   ❌ Failed: {response.status_code}")
    
    def test_frontend_compatibility(self):
        """Test response format compatibility with frontend expectations"""
        print("\n🖥️  TESTING FRONTEND COMPATIBILITY")
        print("=" * 50)
        
        if not self.user_token:
            print("❌ No authentication token available")
            return
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                print("📋 Frontend Compatibility Check:")
                
                # Check for expected structure
                expected_structure = {
                    'jobs': list,
                    'pagination': dict
                }
                
                for key, expected_type in expected_structure.items():
                    if key in data:
                        if isinstance(data[key], expected_type):
                            print(f"   ✅ {key}: Correct type ({expected_type.__name__})")
                        else:
                            print(f"   ❌ {key}: Wrong type (expected {expected_type.__name__}, got {type(data[key]).__name__})")
                    else:
                        print(f"   ❌ {key}: Missing from response")
                
                # Check pagination structure
                pagination = data.get('pagination', {})
                expected_pagination_fields = ['page', 'limit', 'total', 'pages']
                
                print(f"\n📄 Pagination Structure:")
                for field in expected_pagination_fields:
                    if field in pagination:
                        print(f"   ✅ {field}: {pagination[field]}")
                    else:
                        print(f"   ❌ {field}: Missing")
                
                # Check job structure
                jobs = data.get('jobs', [])
                if jobs:
                    print(f"\n📝 Job Structure (First Job):")
                    first_job = jobs[0]
                    
                    # Frontend typically expects these fields
                    expected_job_fields = [
                        'id', 'title', 'description', 'category', 'status',
                        'created_at', 'updated_at', 'budget_min', 'budget_max',
                        'location', 'homeowner'
                    ]
                    
                    for field in expected_job_fields:
                        if field in first_job:
                            value = first_job[field]
                            if value is not None:
                                print(f"   ✅ {field}: {type(value).__name__} - {str(value)[:50]}...")
                            else:
                                print(f"   ⚠️  {field}: null")
                        else:
                            print(f"   ❌ {field}: Missing")
                            
                else:
                    print(f"   📭 No jobs to analyze structure")
                    
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON response")
        else:
            print(f"❌ API call failed: {response.status_code}")
    
    def test_potential_fixes(self):
        """Test potential fixes for the identified issues"""
        print("\n🔧 TESTING POTENTIAL FIXES")
        print("=" * 50)
        
        if not self.user_token:
            print("❌ No authentication token available")
            return
        
        # The issue seems to be that jobs are being returned that don't belong to the current user
        # This suggests the database filter might not be working correctly
        
        print("🔍 Root Cause Analysis:")
        print("   The My Jobs endpoint uses filter: {'homeowner.email': current_user.email}")
        print("   But jobs are being returned with homeowner_id = None")
        print("   This suggests either:")
        print("   1. The database query is not filtering correctly")
        print("   2. The job documents don't have the correct homeowner.email field")
        print("   3. There's a data inconsistency in the database")
        
        # Let's check what the actual database query should be
        print(f"\n📊 Expected Database Filter:")
        print(f"   Filter: {{'homeowner.email': '{self.user_data.get('email')}'}}")
        
        # Test if we can get jobs with a different approach
        print(f"\n🧪 Testing Alternative Approaches:")
        
        # Try getting all jobs and see what we get
        response = self.make_request("GET", "/jobs/", auth_token=self.user_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                all_jobs = data.get('jobs', [])
                
                print(f"   📋 Total jobs in system: {len(all_jobs)}")
                
                # Check how many belong to current user by email
                user_jobs_by_email = [
                    job for job in all_jobs 
                    if job.get('homeowner', {}).get('email') == self.user_data.get('email')
                ]
                
                print(f"   📋 Jobs belonging to user (by email): {len(user_jobs_by_email)}")
                
                # Check how many belong to current user by ID
                user_jobs_by_id = [
                    job for job in all_jobs 
                    if job.get('homeowner_id') == self.user_data.get('id')
                ]
                
                print(f"   📋 Jobs belonging to user (by ID): {len(user_jobs_by_id)}")
                
                if user_jobs_by_email:
                    print(f"\n   ✅ Found user jobs by email - filter should work")
                    for job in user_jobs_by_email[:3]:  # Show first 3
                        print(f"      - {job.get('title')} (Status: {job.get('status')})")
                else:
                    print(f"\n   ❌ No jobs found by email - this explains the issue!")
                
                if user_jobs_by_id:
                    print(f"\n   ✅ Found user jobs by ID")
                    for job in user_jobs_by_id[:3]:  # Show first 3
                        print(f"      - {job.get('title')} (Status: {job.get('status')})")
                else:
                    print(f"\n   ❌ No jobs found by ID either")
                    
            except json.JSONDecodeError:
                print(f"   ❌ Invalid JSON response from /jobs/")
        else:
            print(f"   ❌ Failed to get all jobs: {response.status_code}")
    
    def run_detailed_debug(self):
        """Run all debug tests"""
        print("🚀 STARTING DETAILED MY JOBS DEBUG")
        print("=" * 60)
        
        if not self.authenticate():
            return
        
        self.analyze_my_jobs_response()
        self.test_database_query_logic()
        self.test_frontend_compatibility()
        self.test_potential_fixes()
        
        print("\n" + "=" * 60)
        print("🎯 DEBUG SUMMARY")
        print("=" * 60)
        print("Key findings will help identify the root cause of 'Failed to load jobs' error")

if __name__ == "__main__":
    debugger = DetailedMyJobsDebugger()
    debugger.run_detailed_debug()
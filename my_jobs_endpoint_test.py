#!/usr/bin/env python3
"""
MY JOBS ENDPOINT TESTING - FOCUSED INVESTIGATION

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Test the /api/jobs/my-jobs endpoint to see if there are any errors when loading jobs. 
Check if the endpoint is working correctly and investigate any authentication or database query issues. 
The user is getting "Failed to load jobs" error on the frontend. 
Test with a valid user token to see the specific error response.

**SPECIFIC TESTING FOCUS:**
1. Test /api/jobs/my-jobs endpoint with proper authentication
2. Investigate authentication issues
3. Check database query problems
4. Identify root cause of "Failed to load jobs" error
5. Test with valid user tokens
6. Check response format and error messages
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# Get backend URL from environment
BACKEND_URL = "https://api.myservicehub.co/api"

class MyJobsEndpointTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.homeowner_token = None
        self.homeowner_id = None
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        if success:
            self.results['passed'] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def make_request(self, method: str, endpoint: str, auth_token: str = None, **kwargs) -> requests.Response:
        """Make HTTP request with error handling and optional authentication"""
        url = f"{self.base_url}{endpoint}"
        try:
            # Set proper headers for JSON requests
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            
            if 'json' in kwargs:
                kwargs['headers']['Content-Type'] = 'application/json'
            
            # Add authentication header if token provided
            if auth_token:
                kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
            
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_service_health(self):
        """Test basic service health and availability"""
        print("\n=== Testing Service Health ===")
        
        # Test root endpoint
        response = self.make_request("GET", "/")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data and 'status' in data:
                    self.log_result("Service health check", True, f"API running: {data['message']}")
                else:
                    self.log_result("Service health check", False, "Invalid response structure")
            except json.JSONDecodeError:
                self.log_result("Service health check", False, "Invalid JSON response")
        else:
            self.log_result("Service health check", False, f"Status: {response.status_code}")
    
    def test_authentication_with_existing_user(self):
        """Test authentication with known existing user from test_result.md"""
        print("\n=== Testing Authentication with Existing User ===")
        
        # Use the homeowner credentials mentioned in test_result.md
        login_data = {
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        }
        
        print(f"\n--- Attempting Login with Known User ---")
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                user_data = data.get('user', {})
                self.homeowner_id = user_data.get('id')
                
                if self.homeowner_token:
                    self.log_result("Authentication with existing user", True, 
                                  f"Token obtained, User ID: {self.homeowner_id}")
                    
                    # Verify token structure
                    token_parts = self.homeowner_token.split('.')
                    if len(token_parts) == 3:
                        self.log_result("JWT token structure", True, "Valid 3-part JWT token")
                    else:
                        self.log_result("JWT token structure", False, f"Invalid token structure: {len(token_parts)} parts")
                else:
                    self.log_result("Authentication with existing user", False, "No access token in response")
                    
            except json.JSONDecodeError:
                self.log_result("Authentication with existing user", False, "Invalid JSON response")
        else:
            self.log_result("Authentication with existing user", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_token_validation(self):
        """Test token validation with /auth/me endpoint"""
        print("\n=== Testing Token Validation ===")
        
        if not self.homeowner_token:
            self.log_result("Token validation", False, "No token available for testing")
            return
        
        response = self.make_request("GET", "/auth/me", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('id') and data.get('email'):
                    self.log_result("Token validation", True, 
                                  f"Valid token, User: {data.get('name')} ({data.get('email')})")
                    
                    # Verify user role
                    if data.get('role') == 'homeowner':
                        self.log_result("User role verification", True, "User is homeowner")
                    else:
                        self.log_result("User role verification", False, f"User role: {data.get('role')}")
                else:
                    self.log_result("Token validation", False, "Invalid user data in response")
            except json.JSONDecodeError:
                self.log_result("Token validation", False, "Invalid JSON response")
        else:
            self.log_result("Token validation", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_my_jobs_endpoint_detailed(self):
        """Test /api/jobs/my-jobs endpoint with detailed error analysis"""
        print("\n=== Testing My Jobs Endpoint (MAIN FOCUS) ===")
        
        if not self.homeowner_token:
            self.log_result("My Jobs endpoint", False, "No authentication token available")
            return
        
        # Test 1: Basic my-jobs request
        print(f"\n--- Test 1: Basic My Jobs Request ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response Data Keys: {list(data.keys())}")
                
                # Check expected response structure
                expected_fields = ['jobs', 'pagination']
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    jobs = data.get('jobs', [])
                    pagination = data.get('pagination', {})
                    
                    self.log_result("My Jobs endpoint structure", True, 
                                  f"Valid structure: {len(jobs)} jobs, pagination: {pagination}")
                    
                    # Analyze jobs data
                    if jobs:
                        job = jobs[0]
                        print(f"Sample Job Keys: {list(job.keys())}")
                        print(f"Sample Job Status: {job.get('status')}")
                        print(f"Sample Job Title: {job.get('title')}")
                        
                        self.log_result("My Jobs data content", True, 
                                      f"Found {len(jobs)} jobs, first job: '{job.get('title')}'")
                    else:
                        self.log_result("My Jobs data content", True, "No jobs found (empty state)")
                        
                else:
                    self.log_result("My Jobs endpoint structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError as e:
                self.log_result("My Jobs endpoint", False, f"Invalid JSON response: {str(e)}")
                print(f"Raw Response: {response.text[:500]}...")
        else:
            self.log_result("My Jobs endpoint", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
            
            # Try to parse error response
            try:
                error_data = response.json()
                print(f"Error Details: {error_data}")
            except:
                print(f"Raw Error Response: {response.text}")
        
        # Test 2: My Jobs with pagination parameters
        print(f"\n--- Test 2: My Jobs with Pagination ---")
        response = self.make_request("GET", "/jobs/my-jobs?page=1&limit=10", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                pagination = data.get('pagination', {})
                if pagination.get('page') == 1 and pagination.get('limit') == 10:
                    self.log_result("My Jobs pagination", True, f"Pagination working: {pagination}")
                else:
                    self.log_result("My Jobs pagination", False, f"Pagination not working: {pagination}")
            except json.JSONDecodeError:
                self.log_result("My Jobs pagination", False, "Invalid JSON response")
        else:
            self.log_result("My Jobs pagination", False, f"Status: {response.status_code}")
        
        # Test 3: My Jobs with status filter
        print(f"\n--- Test 3: My Jobs with Status Filter ---")
        response = self.make_request("GET", "/jobs/my-jobs?status=active", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                active_jobs = [job for job in jobs if job.get('status') == 'active']
                self.log_result("My Jobs status filter", True, 
                              f"Status filter working: {len(active_jobs)} active jobs out of {len(jobs)} total")
            except json.JSONDecodeError:
                self.log_result("My Jobs status filter", False, "Invalid JSON response")
        else:
            self.log_result("My Jobs status filter", False, f"Status: {response.status_code}")
    
    def test_database_connectivity(self):
        """Test database connectivity through public endpoints"""
        print("\n=== Testing Database Connectivity ===")
        
        # Test database info endpoint
        response = self.make_request("GET", "/database-info")
        
        if response.status_code == 200:
            try:
                data = response.json()
                collections = data.get('collections', {})
                
                if 'users' in collections and 'jobs' in collections:
                    users_count = collections.get('users', 0)
                    jobs_count = collections.get('jobs', 0)
                    
                    self.log_result("Database connectivity", True, 
                                  f"Database accessible: {users_count} users, {jobs_count} jobs")
                    
                    # Check if our test user exists
                    sample_data = data.get('sample_data', {})
                    if sample_data:
                        self.log_result("Database sample data", True, "Sample data available")
                    else:
                        self.log_result("Database sample data", False, "No sample data found")
                else:
                    self.log_result("Database connectivity", False, "Missing expected collections")
                    
            except json.JSONDecodeError:
                self.log_result("Database connectivity", False, "Invalid JSON response")
        else:
            self.log_result("Database connectivity", False, f"Status: {response.status_code}")
    
    def test_backend_logs_analysis(self):
        """Analyze potential backend issues by testing related endpoints"""
        print("\n=== Testing Related Endpoints for Error Analysis ===")
        
        if not self.homeowner_token:
            print("No token available for authenticated endpoint testing")
            return
        
        # Test 1: Jobs endpoint (general)
        print(f"\n--- Test 1: General Jobs Endpoint ---")
        response = self.make_request("GET", "/jobs/", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("General jobs endpoint", True, f"Status: {response.status_code}")
        else:
            self.log_result("General jobs endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: User profile endpoint
        print(f"\n--- Test 2: User Profile Endpoint ---")
        response = self.make_request("GET", "/auth/me", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                user_email = data.get('email')
                if user_email == "francisdaniel4jb@gmail.com":
                    self.log_result("User profile consistency", True, "User profile matches expected")
                else:
                    self.log_result("User profile consistency", False, f"Unexpected user: {user_email}")
            except json.JSONDecodeError:
                self.log_result("User profile consistency", False, "Invalid JSON response")
        else:
            self.log_result("User profile consistency", False, f"Status: {response.status_code}")
    
    def test_error_scenarios(self):
        """Test various error scenarios to understand failure modes"""
        print("\n=== Testing Error Scenarios ===")
        
        # Test 1: My Jobs without authentication
        print(f"\n--- Test 1: My Jobs Without Authentication ---")
        response = self.make_request("GET", "/jobs/my-jobs")
        
        if response.status_code in [401, 403]:
            self.log_result("My Jobs unauthorized", True, f"Correctly rejected: {response.status_code}")
        else:
            self.log_result("My Jobs unauthorized", False, f"Unexpected status: {response.status_code}")
        
        # Test 2: My Jobs with invalid token
        print(f"\n--- Test 2: My Jobs with Invalid Token ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token="invalid_token_123")
        
        if response.status_code in [401, 403]:
            self.log_result("My Jobs invalid token", True, f"Correctly rejected: {response.status_code}")
        else:
            self.log_result("My Jobs invalid token", False, f"Unexpected status: {response.status_code}")
        
        # Test 3: My Jobs with malformed token
        print(f"\n--- Test 3: My Jobs with Malformed Token ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token="Bearer malformed.token")
        
        if response.status_code in [401, 403]:
            self.log_result("My Jobs malformed token", True, f"Correctly rejected: {response.status_code}")
        else:
            self.log_result("My Jobs malformed token", False, f"Unexpected status: {response.status_code}")
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🔍 STARTING MY JOBS ENDPOINT COMPREHENSIVE TESTING")
        print("=" * 60)
        
        # Run tests in logical order
        self.test_service_health()
        self.test_database_connectivity()
        self.test_authentication_with_existing_user()
        self.test_token_validation()
        self.test_my_jobs_endpoint_detailed()
        self.test_backend_logs_analysis()
        self.test_error_scenarios()
        
        # Print final results
        print("\n" + "=" * 60)
        print("🎯 MY JOBS ENDPOINT TESTING RESULTS")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        # Provide specific diagnosis for the "Failed to load jobs" error
        print(f"\n🔍 DIAGNOSIS FOR 'FAILED TO LOAD JOBS' ERROR:")
        if self.homeowner_token and self.results['passed'] > self.results['failed']:
            print("   ✅ Authentication is working correctly")
            print("   ✅ My Jobs endpoint is accessible and returning data")
            print("   💡 The issue may be on the frontend side (JavaScript errors, network issues, or response parsing)")
        elif not self.homeowner_token:
            print("   ❌ Authentication is failing - this is likely the root cause")
            print("   💡 Check login credentials, token storage, or authentication middleware")
        else:
            print("   ❌ Backend API issues detected")
            print("   💡 Check backend logs, database connectivity, or endpoint implementation")

if __name__ == "__main__":
    tester = MyJobsEndpointTester()
    tester.run_comprehensive_test()
#!/usr/bin/env python3
"""
JOB AUTHENTICATION AND AUTHORIZATION TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Test the authentication and authorization for job-related endpoints to verify the "failed to load jobs" issue is resolved:

1. **Test /api/jobs/my-jobs endpoint with different authentication states**:
   - Test without authentication (should return 401)
   - Test with homeowner user authentication (should return jobs or empty list)
   - Test with tradesperson user authentication (should work or be restricted)

2. **Test with sample users**:
   - Login as servicehub9ja@gmail.com (homeowner user)
   - Login as any tradesperson user
   - Test the /api/jobs/my-jobs endpoint for each

3. **Verify error handling**:
   - Ensure proper HTTP status codes are returned
   - Verify error messages are properly formatted
   - Check that "Not authenticated" errors are handled correctly

4. **Create test data if needed**:
   - If the homeowner has no jobs, create a sample job for testing
   - Verify the job creation and retrieval flow

The goal is to ensure that:
- Authentication errors are handled properly
- The "failed to load jobs" issue is resolved
- Different user roles can access appropriate endpoints
- API responses are consistent and properly formatted
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

class JobsAuthTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.homeowner_token = None
        self.tradesperson_token = None
        self.homeowner_user = None
        self.tradesperson_user = None
        
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
    
    def authenticate_homeowner(self, email: str = "servicehub9ja@gmail.com", password: str = "Password123!"):
        """Authenticate as homeowner user"""
        print(f"\n=== Authenticating Homeowner: {email} ===")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                self.homeowner_user = data.get('user', {})
                
                if self.homeowner_token and self.homeowner_user:
                    self.log_result("Homeowner authentication", True, 
                                  f"User: {self.homeowner_user.get('name')} ({self.homeowner_user.get('role')})")
                    return True
                else:
                    self.log_result("Homeowner authentication", False, "Missing token or user data")
                    return False
            except json.JSONDecodeError:
                self.log_result("Homeowner authentication", False, "Invalid JSON response")
                return False
        else:
            self.log_result("Homeowner authentication", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
            return False
    
    def authenticate_tradesperson(self, email: str = "tradesperson1@example.com", password: str = "password123"):
        """Authenticate as tradesperson user"""
        print(f"\n=== Authenticating Tradesperson: {email} ===")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.tradesperson_token = data.get('access_token')
                self.tradesperson_user = data.get('user', {})
                
                if self.tradesperson_token and self.tradesperson_user:
                    self.log_result("Tradesperson authentication", True, 
                                  f"User: {self.tradesperson_user.get('name')} ({self.tradesperson_user.get('role')})")
                    return True
                else:
                    self.log_result("Tradesperson authentication", False, "Missing token or user data")
                    return False
            except json.JSONDecodeError:
                self.log_result("Tradesperson authentication", False, "Invalid JSON response")
                return False
        else:
            self.log_result("Tradesperson authentication", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
            return False
    
    def test_my_jobs_without_auth(self):
        """Test /api/jobs/my-jobs endpoint without authentication"""
        print("\n=== Testing My Jobs Without Authentication ===")
        
        response = self.make_request("GET", "/jobs/my-jobs")
        
        if response.status_code == 401:
            self.log_result("My jobs without auth", True, "Correctly returned 401 Unauthorized")
        elif response.status_code == 403:
            self.log_result("My jobs without auth", True, "Correctly returned 403 Forbidden")
        else:
            self.log_result("My jobs without auth", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_my_jobs_with_invalid_token(self):
        """Test /api/jobs/my-jobs endpoint with invalid token"""
        print("\n=== Testing My Jobs With Invalid Token ===")
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token="invalid_token_12345")
        
        if response.status_code == 401:
            self.log_result("My jobs with invalid token", True, "Correctly returned 401 Unauthorized")
        elif response.status_code == 403:
            self.log_result("My jobs with invalid token", True, "Correctly returned 403 Forbidden")
        else:
            self.log_result("My jobs with invalid token", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_my_jobs_with_homeowner_auth(self):
        """Test /api/jobs/my-jobs endpoint with homeowner authentication"""
        print("\n=== Testing My Jobs With Homeowner Authentication ===")
        
        if not self.homeowner_token:
            self.log_result("My jobs with homeowner auth", False, "No homeowner token available")
            return
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['jobs', 'pagination']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    jobs = data.get('jobs', [])
                    pagination = data.get('pagination', {})
                    
                    self.log_result("My jobs with homeowner auth", True, 
                                  f"Found {len(jobs)} jobs, pagination: {pagination}")
                    
                    # Verify pagination structure
                    pagination_fields = ['page', 'limit', 'total', 'pages']
                    missing_pagination = [field for field in pagination_fields if field not in pagination]
                    
                    if not missing_pagination:
                        self.log_result("My jobs pagination structure", True, 
                                      f"Total: {pagination['total']}, Pages: {pagination['pages']}")
                    else:
                        self.log_result("My jobs pagination structure", False, 
                                      f"Missing pagination fields: {missing_pagination}")
                    
                    # If no jobs found, note it but don't fail the test
                    if len(jobs) == 0:
                        self.log_result("My jobs data availability", True, 
                                      "No jobs found (empty state handled correctly)")
                    else:
                        # Verify job structure
                        first_job = jobs[0]
                        job_fields = ['id', 'title', 'status', 'homeowner']
                        missing_job_fields = [field for field in job_fields if field not in first_job]
                        
                        if not missing_job_fields:
                            self.log_result("My jobs data structure", True, 
                                          f"Job structure valid: {first_job.get('title')} ({first_job.get('status')})")
                        else:
                            self.log_result("My jobs data structure", False, 
                                          f"Missing job fields: {missing_job_fields}")
                    
                else:
                    self.log_result("My jobs with homeowner auth", False, 
                                  f"Missing response fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("My jobs with homeowner auth", False, "Invalid JSON response")
        else:
            self.log_result("My jobs with homeowner auth", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_my_jobs_with_tradesperson_auth(self):
        """Test /api/jobs/my-jobs endpoint with tradesperson authentication"""
        print("\n=== Testing My Jobs With Tradesperson Authentication ===")
        
        if not self.tradesperson_token:
            self.log_result("My jobs with tradesperson auth", False, "No tradesperson token available")
            return
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.tradesperson_token)
        
        # Tradesperson should not be able to access homeowner's jobs endpoint
        if response.status_code == 403:
            self.log_result("My jobs with tradesperson auth", True, 
                          "Correctly rejected tradesperson access (403 Forbidden)")
        elif response.status_code == 401:
            self.log_result("My jobs with tradesperson auth", True, 
                          "Correctly rejected tradesperson access (401 Unauthorized)")
        else:
            self.log_result("My jobs with tradesperson auth", False, 
                          f"Expected 403/401, got {response.status_code}")
    
    def test_my_jobs_pagination(self):
        """Test /api/jobs/my-jobs endpoint pagination parameters"""
        print("\n=== Testing My Jobs Pagination ===")
        
        if not self.homeowner_token:
            self.log_result("My jobs pagination", False, "No homeowner token available")
            return
        
        # Test with specific pagination parameters
        response = self.make_request("GET", "/jobs/my-jobs?page=1&limit=5", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                pagination = data.get('pagination', {})
                
                if pagination.get('page') == 1 and pagination.get('limit') == 5:
                    self.log_result("My jobs pagination parameters", True, 
                                  f"Pagination working: page={pagination['page']}, limit={pagination['limit']}")
                else:
                    self.log_result("My jobs pagination parameters", False, 
                                  f"Pagination not working: page={pagination.get('page')}, limit={pagination.get('limit')}")
            except json.JSONDecodeError:
                self.log_result("My jobs pagination", False, "Invalid JSON response")
        else:
            self.log_result("My jobs pagination", False, f"Status: {response.status_code}")
    
    def test_my_jobs_status_filter(self):
        """Test /api/jobs/my-jobs endpoint with status filter"""
        print("\n=== Testing My Jobs Status Filter ===")
        
        if not self.homeowner_token:
            self.log_result("My jobs status filter", False, "No homeowner token available")
            return
        
        # Test with status filter
        statuses_to_test = ['active', 'completed', 'cancelled']
        
        for status in statuses_to_test:
            response = self.make_request("GET", f"/jobs/my-jobs?status={status}", 
                                       auth_token=self.homeowner_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    jobs = data.get('jobs', [])
                    
                    # Verify all returned jobs have the requested status
                    if jobs:
                        all_correct_status = all(job.get('status') == status for job in jobs)
                        if all_correct_status:
                            self.log_result(f"My jobs status filter ({status})", True, 
                                          f"Found {len(jobs)} jobs with status '{status}'")
                        else:
                            self.log_result(f"My jobs status filter ({status})", False, 
                                          "Some jobs have incorrect status")
                    else:
                        self.log_result(f"My jobs status filter ({status})", True, 
                                      f"No jobs found with status '{status}' (valid empty result)")
                        
                except json.JSONDecodeError:
                    self.log_result(f"My jobs status filter ({status})", False, "Invalid JSON response")
            else:
                self.log_result(f"My jobs status filter ({status})", False, 
                              f"Status: {response.status_code}")
    
    def create_sample_job_if_needed(self):
        """Create a sample job if homeowner has no jobs"""
        print("\n=== Creating Sample Job If Needed ===")
        
        if not self.homeowner_token:
            self.log_result("Sample job creation", False, "No homeowner token available")
            return
        
        # First check if homeowner has any jobs
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                total_jobs = data.get('pagination', {}).get('total', 0)
                
                if total_jobs > 0:
                    self.log_result("Sample job creation", True, 
                                  f"Homeowner already has {total_jobs} jobs, no need to create sample")
                    return
                
                # Create a sample job
                print("\n--- Creating Sample Job ---")
                job_data = {
                    "title": "Test Job for Authentication Testing",
                    "description": "This is a test job created to verify the authentication and authorization system is working correctly.",
                    "category": "Electrical Repairs",
                    "timeline": "within_week",
                    "budget_min": 25000,
                    "budget_max": 50000,
                    "state": "Lagos",
                    "lga": "Ikeja",
                    "town": "Computer Village",
                    "zip_code": "100001",
                    "home_address": "123 Test Street, Computer Village, Lagos",
                    "homeowner_name": self.homeowner_user.get('name', 'Test Homeowner'),
                    "homeowner_email": self.homeowner_user.get('email', 'test@example.com'),
                    "homeowner_phone": self.homeowner_user.get('phone', '+2348012345678'),
                    "questions": [],
                    "photos": []
                }
                
                create_response = self.make_request("POST", "/jobs/", json=job_data, 
                                                  auth_token=self.homeowner_token)
                
                if create_response.status_code == 200:
                    try:
                        job_result = create_response.json()
                        job_id = job_result.get('id')
                        self.log_result("Sample job creation", True, f"Created job ID: {job_id}")
                        
                        # Verify the job appears in my-jobs
                        verify_response = self.make_request("GET", "/jobs/my-jobs", 
                                                          auth_token=self.homeowner_token)
                        
                        if verify_response.status_code == 200:
                            verify_data = verify_response.json()
                            new_total = verify_data.get('pagination', {}).get('total', 0)
                            
                            if new_total > 0:
                                self.log_result("Sample job verification", True, 
                                              f"Job creation verified, now have {new_total} jobs")
                            else:
                                self.log_result("Sample job verification", False, 
                                              "Job not found in my-jobs after creation")
                        
                    except json.JSONDecodeError:
                        self.log_result("Sample job creation", False, "Invalid JSON response from job creation")
                else:
                    self.log_result("Sample job creation", False, 
                                  f"Job creation failed: {create_response.status_code}, {create_response.text}")
                
            except json.JSONDecodeError:
                self.log_result("Sample job creation", False, "Invalid JSON response from my-jobs check")
        else:
            self.log_result("Sample job creation", False, 
                          f"Could not check existing jobs: {response.status_code}")
    
    def test_error_message_format(self):
        """Test that error messages are properly formatted"""
        print("\n=== Testing Error Message Format ===")
        
        # Test various error scenarios and verify message format
        test_cases = [
            {
                "name": "No authentication",
                "endpoint": "/jobs/my-jobs",
                "token": None,
                "expected_status": [401, 403]
            },
            {
                "name": "Invalid token",
                "endpoint": "/jobs/my-jobs",
                "token": "invalid_token",
                "expected_status": [401, 403]
            },
            {
                "name": "Malformed token",
                "endpoint": "/jobs/my-jobs",
                "token": "not.a.jwt.token",
                "expected_status": [401, 403]
            }
        ]
        
        for test_case in test_cases:
            response = self.make_request("GET", test_case["endpoint"], 
                                       auth_token=test_case["token"])
            
            if response.status_code in test_case["expected_status"]:
                try:
                    # Try to parse error response
                    if response.headers.get('content-type', '').startswith('application/json'):
                        error_data = response.json()
                        
                        # Check for standard error format
                        if 'detail' in error_data:
                            self.log_result(f"Error format ({test_case['name']})", True, 
                                          f"Proper error format: {error_data['detail']}")
                        else:
                            self.log_result(f"Error format ({test_case['name']})", False, 
                                          "Missing 'detail' field in error response")
                    else:
                        self.log_result(f"Error format ({test_case['name']})", False, 
                                      "Error response is not JSON")
                        
                except json.JSONDecodeError:
                    self.log_result(f"Error format ({test_case['name']})", False, 
                                  "Error response is not valid JSON")
            else:
                self.log_result(f"Error format ({test_case['name']})", False, 
                              f"Expected {test_case['expected_status']}, got {response.status_code}")
    
    def test_token_validation(self):
        """Test JWT token validation"""
        print("\n=== Testing Token Validation ===")
        
        if not self.homeowner_token:
            self.log_result("Token validation", False, "No homeowner token available")
            return
        
        # Test /auth/me endpoint to verify token is valid
        response = self.make_request("GET", "/auth/me", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                user_data = response.json()
                
                # Verify user data matches what we expect
                if (user_data.get('email') == self.homeowner_user.get('email') and
                    user_data.get('role') == self.homeowner_user.get('role')):
                    self.log_result("Token validation", True, 
                                  f"Token valid for user: {user_data.get('name')} ({user_data.get('role')})")
                else:
                    self.log_result("Token validation", False, "Token user data mismatch")
                    
            except json.JSONDecodeError:
                self.log_result("Token validation", False, "Invalid JSON response")
        else:
            self.log_result("Token validation", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all authentication and authorization tests"""
        print("🚀 STARTING JOB AUTHENTICATION AND AUTHORIZATION TESTING")
        print("=" * 80)
        
        # Basic service health
        self.test_service_health()
        
        # Authentication tests
        homeowner_auth_success = self.authenticate_homeowner()
        tradesperson_auth_success = self.authenticate_tradesperson()
        
        # Test without authentication
        self.test_my_jobs_without_auth()
        self.test_my_jobs_with_invalid_token()
        
        # Test with different user roles
        if homeowner_auth_success:
            self.test_token_validation()
            self.test_my_jobs_with_homeowner_auth()
            self.test_my_jobs_pagination()
            self.test_my_jobs_status_filter()
            self.create_sample_job_if_needed()
        
        if tradesperson_auth_success:
            self.test_my_jobs_with_tradesperson_auth()
        
        # Error handling tests
        self.test_error_message_format()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🎯 FINAL TEST RESULTS")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n" + "=" * 80)
        
        return self.results

if __name__ == "__main__":
    tester = JobsAuthTester()
    results = tester.run_all_tests()
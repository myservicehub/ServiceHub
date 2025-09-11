#!/usr/bin/env python3
"""
COMPREHENSIVE SHOW INTEREST FUNCTIONALITY TESTING

Testing the complete show interest functionality that users are reporting as failing.

Focus Areas:
1. Authentication Flow:
   - Test tradesperson login with credentials: john.plumber.d553d0b3@tradework.com / SecurePass123
   - Verify JWT token generation and validation
   - Test tradesperson role verification
   - Confirm token is being properly included in API requests

2. Show Interest API Endpoint:
   - Test POST /api/interests/show-interest with valid tradesperson token
   - Test with different job IDs to verify job lookup
   - Test duplicate interest prevention (same tradesperson, same job)
   - Test with inactive/non-existent jobs
   - Verify proper error responses and status codes

3. Job Data Integration:
   - Test GET /api/jobs/for-tradesperson to ensure jobs are available
   - Verify job IDs are valid and can be used for showing interest
   - Test job status validation (active vs inactive)
   - Confirm job-tradesperson matching logic

4. Database Operations:
   - Test interest record creation in database
   - Verify interest status and metadata
   - Test interest retrieval and querying
   - Check for database constraint violations

5. Background Tasks & Notifications:
   - Test notification system integration when interest is shown
   - Verify background task processing
   - Test homeowner notification delivery

SPECIFIC ERROR SCENARIOS TO TEST:
1. Authentication Errors: Invalid token, expired token, wrong role
2. Validation Errors: Missing job_id, invalid job_id format
3. Business Logic Errors: Job not found, job inactive, duplicate interest
4. Database Errors: Connection issues, constraint violations

EXPECTED BEHAVIORS:
- ✅ Valid tradesperson can show interest in active jobs
- ✅ Duplicate interests are prevented with clear error message
- ✅ Invalid/inactive jobs return proper error responses
- ✅ Interest records are properly stored in database
- ✅ Homeowner notifications are triggered

CRITICAL VALIDATION:
Users are reporting that "showing interest for jobs failed" - please identify the root cause of this failure.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import time

# Get backend URL from environment
BACKEND_URL = "https://notify-connect.preview.emergentagent.com/api"

class ShowInterestTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.auth_tokens = {}  # Store auth tokens for different users
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
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
    
    def test_tradesperson_authentication(self):
        """Test tradesperson authentication with specific credentials"""
        print("\n=== Testing Tradesperson Authentication ===")
        
        # Test login with the specific credentials mentioned in the review request
        login_data = {
            "email": "john.plumber.d553d0b3@tradework.com",
            "password": "SecurePass123"
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        if response.status_code == 200:
            login_response = response.json()
            if 'access_token' in login_response and 'user' in login_response:
                self.auth_tokens['tradesperson'] = login_response['access_token']
                self.test_data['tradesperson_user'] = login_response['user']
                
                # Verify user role is tradesperson
                user_role = login_response['user'].get('role')
                if user_role == 'tradesperson':
                    self.log_result("Tradesperson login and role verification", True, 
                                  f"User ID: {login_response['user']['id']}, Role: {user_role}")
                else:
                    self.log_result("Tradesperson role verification", False, 
                                  f"Expected 'tradesperson', got '{user_role}'")
            else:
                self.log_result("Tradesperson login", False, "Missing access_token or user in response")
        else:
            # If specific user doesn't exist, create a test tradesperson
            self.log_result("Specific tradesperson login", False, 
                          f"Status: {response.status_code}, trying to create test user")
            self._create_test_tradesperson()
    
    def _create_test_tradesperson(self):
        """Create a test tradesperson if the specific one doesn't exist"""
        print("\n--- Creating Test Tradesperson ---")
        
        tradesperson_data = {
            "name": "John Plumber",
            "email": f"john.plumber.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "+2348123456789",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing"],
            "experience_years": 5,
            "company_name": "John's Plumbing Services",
            "description": "Professional plumbing services in Lagos",
            "certifications": ["Licensed Plumber"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            
            # Now login with the created user
            login_data = {
                "email": tradesperson_data["email"],
                "password": tradesperson_data["password"]
            }
            
            login_response = self.make_request("POST", "/auth/login", json=login_data)
            if login_response.status_code == 200:
                login_data_response = login_response.json()
                self.auth_tokens['tradesperson'] = login_data_response['access_token']
                self.test_data['tradesperson_user'] = login_data_response['user']
                self.log_result("Test tradesperson creation and login", True, 
                              f"Created and logged in: {tradesperson_data['email']}")
            else:
                self.log_result("Test tradesperson login after creation", False, 
                              f"Status: {login_response.status_code}")
        else:
            self.log_result("Test tradesperson creation", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_homeowner_authentication(self):
        """Create a test homeowner for job posting"""
        print("\n=== Testing Homeowner Authentication ===")
        
        homeowner_data = {
            "name": "Sarah Johnson",
            "email": f"sarah.johnson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "+2348123456790",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            if 'access_token' in homeowner_profile:
                self.auth_tokens['homeowner'] = homeowner_profile['access_token']
                self.test_data['homeowner_user'] = homeowner_profile['user']
                self.log_result("Create test homeowner", True, 
                              f"ID: {homeowner_profile['user']['id']}")
            else:
                self.log_result("Create test homeowner", False, "No access token in response")
        else:
            self.log_result("Create test homeowner", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_job_creation_for_interest_testing(self):
        """Create test jobs for interest testing"""
        print("\n=== Creating Test Jobs for Interest Testing ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job creation setup", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        # Create active job
        active_job_data = {
            "title": "Plumbing Services Needed - Active Job",
            "description": "Need professional plumber for bathroom renovation. Includes pipe installation and fixture replacement.",
            "category": "Plumbing",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Allen Avenue, Ikeja",
            "budget_min": 50000,
            "budget_max": 150000,
            "timeline": "Within 2 weeks",
            "homeowner_name": homeowner_user['name'],
            "homeowner_email": homeowner_user['email'],
            "homeowner_phone": homeowner_user['phone']
        }
        
        response = self.make_request("POST", "/jobs/", json=active_job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            job_response = response.json()
            self.test_data['active_job_id'] = job_response.get('id')
            self.test_data['active_job'] = job_response
            self.log_result("Create active test job", True, f"Job ID: {job_response.get('id')}")
        else:
            self.log_result("Create active test job", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Create another active job for duplicate testing
        duplicate_test_job_data = {
            "title": "Electrical Work - Duplicate Test Job",
            "description": "Need electrical installation for new office space.",
            "category": "Electrical",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Ikeja",
            "zip_code": "101001",
            "home_address": "456 Broad Street, Victoria Island",
            "budget_min": 75000,
            "budget_max": 200000,
            "timeline": "Within 1 week",
            "homeowner_name": homeowner_user['name'],
            "homeowner_email": homeowner_user['email'],
            "homeowner_phone": homeowner_user['phone']
        }
        
        response = self.make_request("POST", "/jobs/", json=duplicate_test_job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            job_response = response.json()
            self.test_data['duplicate_test_job_id'] = job_response.get('id')
            self.log_result("Create duplicate test job", True, f"Job ID: {job_response.get('id')}")
        else:
            self.log_result("Create duplicate test job", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_jobs_for_tradesperson_endpoint(self):
        """Test GET /api/jobs/for-tradesperson to ensure jobs are available"""
        print("\n=== Testing Jobs for Tradesperson Endpoint ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Jobs for tradesperson test", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test default parameters
        response = self.make_request("GET", "/jobs/for-tradesperson", auth_token=tradesperson_token)
        if response.status_code == 200:
            jobs_data = response.json()
            jobs_list = jobs_data.get('jobs', [])
            total_jobs = jobs_data.get('total', 0)
            
            if total_jobs > 0:
                self.log_result("Jobs for tradesperson - availability", True, 
                              f"Found {total_jobs} jobs available")
                
                # Store some job IDs for testing
                if jobs_list:
                    self.test_data['available_job_ids'] = [job['id'] for job in jobs_list[:3]]
                    
                    # Verify job structure has required fields
                    first_job = jobs_list[0]
                    required_fields = ['id', 'title', 'description', 'category', 'status']
                    missing_fields = [field for field in required_fields if field not in first_job]
                    
                    if not missing_fields:
                        self.log_result("Job data structure validation", True, 
                                      "All required fields present in job data")
                    else:
                        self.log_result("Job data structure validation", False, 
                                      f"Missing fields: {missing_fields}")
            else:
                self.log_result("Jobs for tradesperson - availability", False, 
                              "No jobs available for testing")
        else:
            self.log_result("Jobs for tradesperson endpoint", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Test with pagination parameters
        response = self.make_request("GET", "/jobs/for-tradesperson?skip=0&limit=5", 
                                   auth_token=tradesperson_token)
        if response.status_code == 200:
            jobs_data = response.json()
            pagination = jobs_data.get('pagination', {})
            if pagination.get('skip') == 0 and pagination.get('limit') == 5:
                self.log_result("Jobs for tradesperson - pagination", True, 
                              "Pagination parameters working correctly")
            else:
                self.log_result("Jobs for tradesperson - pagination", False, 
                              f"Pagination incorrect: {pagination}")
        else:
            self.log_result("Jobs for tradesperson - pagination", False, 
                          f"Status: {response.status_code}")
    
    def test_show_interest_api_endpoint(self):
        """Test POST /api/interests/show-interest with various scenarios"""
        print("\n=== Testing Show Interest API Endpoint ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Show interest test setup", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Valid show interest request
        if 'active_job_id' in self.test_data:
            job_id = self.test_data['active_job_id']
            interest_data = {"job_id": job_id}
            
            response = self.make_request("POST", "/interests/show-interest", 
                                       json=interest_data, auth_token=tradesperson_token)
            
            if response.status_code == 200:
                interest_response = response.json()
                required_fields = ['id', 'job_id', 'tradesperson_id', 'status', 'created_at']
                missing_fields = [field for field in required_fields if field not in interest_response]
                
                if not missing_fields:
                    self.test_data['created_interest_id'] = interest_response.get('id')
                    self.log_result("Show interest - valid request", True, 
                                  f"Interest created with ID: {interest_response.get('id')}")
                    
                    # Verify interest data structure
                    if (interest_response.get('job_id') == job_id and 
                        interest_response.get('status') == 'interested'):
                        self.log_result("Show interest - data structure", True, 
                                      "Interest data structure correct")
                    else:
                        self.log_result("Show interest - data structure", False, 
                                      f"Data mismatch: job_id={interest_response.get('job_id')}, status={interest_response.get('status')}")
                else:
                    self.log_result("Show interest - response structure", False, 
                                  f"Missing fields: {missing_fields}")
            else:
                self.log_result("Show interest - valid request", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Duplicate interest prevention
        if 'active_job_id' in self.test_data:
            job_id = self.test_data['active_job_id']
            interest_data = {"job_id": job_id}
            
            response = self.make_request("POST", "/interests/show-interest", 
                                       json=interest_data, auth_token=tradesperson_token)
            
            if response.status_code == 400:
                error_response = response.json()
                if "already shown interest" in error_response.get('detail', '').lower():
                    self.log_result("Show interest - duplicate prevention", True, 
                                  "Duplicate interest correctly prevented")
                else:
                    self.log_result("Show interest - duplicate prevention", False, 
                                  f"Wrong error message: {error_response.get('detail')}")
            else:
                self.log_result("Show interest - duplicate prevention", False, 
                              f"Expected 400, got {response.status_code}")
        
        # Test 3: Invalid job ID
        invalid_job_id = str(uuid.uuid4())
        interest_data = {"job_id": invalid_job_id}
        
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, auth_token=tradesperson_token)
        
        if response.status_code == 404:
            self.log_result("Show interest - invalid job ID", True, 
                          "Invalid job ID correctly rejected")
        else:
            self.log_result("Show interest - invalid job ID", False, 
                          f"Expected 404, got {response.status_code}")
        
        # Test 4: Missing job_id in request
        response = self.make_request("POST", "/interests/show-interest", 
                                   json={}, auth_token=tradesperson_token)
        
        if response.status_code in [400, 422]:
            self.log_result("Show interest - missing job_id", True, 
                          "Missing job_id correctly rejected")
        else:
            self.log_result("Show interest - missing job_id", False, 
                          f"Expected 400/422, got {response.status_code}")
        
        # Test 5: Unauthenticated request
        if 'active_job_id' in self.test_data:
            job_id = self.test_data['active_job_id']
            interest_data = {"job_id": job_id}
            
            response = self.make_request("POST", "/interests/show-interest", json=interest_data)
            
            if response.status_code in [401, 403]:
                self.log_result("Show interest - unauthenticated", True, 
                              "Unauthenticated request correctly rejected")
            else:
                self.log_result("Show interest - unauthenticated", False, 
                              f"Expected 401/403, got {response.status_code}")
    
    def test_homeowner_role_restriction(self):
        """Test that homeowners cannot show interest in jobs"""
        print("\n=== Testing Homeowner Role Restriction ===")
        
        if 'homeowner' not in self.auth_tokens or 'active_job_id' not in self.test_data:
            self.log_result("Homeowner role restriction test", False, 
                          "Missing homeowner token or active job ID")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['active_job_id']
        interest_data = {"job_id": job_id}
        
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, auth_token=homeowner_token)
        
        if response.status_code == 403:
            self.log_result("Homeowner role restriction", True, 
                          "Homeowner correctly prevented from showing interest")
        else:
            self.log_result("Homeowner role restriction", False, 
                          f"Expected 403, got {response.status_code}")
    
    def test_interest_retrieval_endpoints(self):
        """Test interest retrieval endpoints"""
        print("\n=== Testing Interest Retrieval Endpoints ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Interest retrieval test setup", False, "No tradesperson token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Get my interests
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests_data = response.json()
            if isinstance(interests_data, list):
                self.log_result("Get my interests", True, 
                              f"Retrieved {len(interests_data)} interests")
                
                # If we have interests, verify structure
                if interests_data and 'created_interest_id' in self.test_data:
                    first_interest = interests_data[0]
                    required_fields = ['id', 'job_id', 'status', 'created_at']
                    missing_fields = [field for field in required_fields if field not in first_interest]
                    
                    if not missing_fields:
                        self.log_result("My interests - data structure", True, 
                                      "Interest data structure correct")
                    else:
                        self.log_result("My interests - data structure", False, 
                                      f"Missing fields: {missing_fields}")
            else:
                self.log_result("Get my interests - response format", False, 
                              "Expected list response")
        else:
            self.log_result("Get my interests", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Get job interested tradespeople (as homeowner)
        if 'homeowner' in self.auth_tokens and 'active_job_id' in self.test_data:
            homeowner_token = self.auth_tokens['homeowner']
            job_id = self.test_data['active_job_id']
            
            response = self.make_request("GET", f"/interests/job/{job_id}", 
                                       auth_token=homeowner_token)
            
            if response.status_code == 200:
                job_interests = response.json()
                if 'interested_tradespeople' in job_interests and 'total' in job_interests:
                    total_interested = job_interests.get('total', 0)
                    self.log_result("Get job interested tradespeople", True, 
                                  f"Found {total_interested} interested tradespeople")
                    
                    # Verify tradesperson data structure if we have interests
                    if total_interested > 0:
                        first_tradesperson = job_interests['interested_tradespeople'][0]
                        required_fields = ['tradesperson_id', 'tradesperson_name', 'status']
                        missing_fields = [field for field in required_fields if field not in first_tradesperson]
                        
                        if not missing_fields:
                            self.log_result("Job interests - tradesperson data", True, 
                                          "Tradesperson data structure correct")
                        else:
                            self.log_result("Job interests - tradesperson data", False, 
                                          f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Get job interested tradespeople - structure", False, 
                                  "Missing required response fields")
            else:
                self.log_result("Get job interested tradespeople", False, 
                              f"Status: {response.status_code}")
    
    def test_job_status_validation(self):
        """Test that interests can only be shown for active jobs"""
        print("\n=== Testing Job Status Validation ===")
        
        # This test would require creating an inactive job or modifying job status
        # For now, we'll test with the assumption that our created jobs are active
        # In a real scenario, you'd want to test with inactive/expired jobs
        
        if 'tradesperson' not in self.auth_tokens or 'active_job_id' not in self.test_data:
            self.log_result("Job status validation test", False, 
                          "Missing required test data")
            return
        
        # Verify that our active job allows interest
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Create a new tradesperson to test with active job
        new_tradesperson_data = {
            "name": "Mike Electrician",
            "email": f"mike.electrician.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "+2348123456791",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical"],
            "experience_years": 3,
            "company_name": "Mike's Electrical Services",
            "description": "Professional electrical services",
            "certifications": ["Licensed Electrician"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=new_tradesperson_data)
        if response.status_code == 200:
            # Login with new tradesperson
            login_data = {
                "email": new_tradesperson_data["email"],
                "password": new_tradesperson_data["password"]
            }
            
            login_response = self.make_request("POST", "/auth/login", json=login_data)
            if login_response.status_code == 200:
                new_tradesperson_token = login_response.json()['access_token']
                
                # Test showing interest in active job
                if 'duplicate_test_job_id' in self.test_data:
                    job_id = self.test_data['duplicate_test_job_id']
                    interest_data = {"job_id": job_id}
                    
                    response = self.make_request("POST", "/interests/show-interest", 
                                               json=interest_data, auth_token=new_tradesperson_token)
                    
                    if response.status_code == 200:
                        self.log_result("Job status validation - active job", True, 
                                      "Active job allows interest")
                    else:
                        self.log_result("Job status validation - active job", False, 
                                      f"Active job rejected interest: {response.status_code}")
                else:
                    self.log_result("Job status validation", False, "No test job available")
            else:
                self.log_result("Job status validation setup", False, "Failed to login new tradesperson")
        else:
            self.log_result("Job status validation setup", False, "Failed to create new tradesperson")
    
    def test_authentication_edge_cases(self):
        """Test various authentication edge cases"""
        print("\n=== Testing Authentication Edge Cases ===")
        
        if 'active_job_id' not in self.test_data:
            self.log_result("Authentication edge cases", False, "No active job ID")
            return
        
        job_id = self.test_data['active_job_id']
        interest_data = {"job_id": job_id}
        
        # Test 1: Invalid token format
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, 
                                   headers={"Authorization": "Bearer invalid_token_format"})
        
        if response.status_code in [401, 403]:
            self.log_result("Authentication - invalid token format", True, 
                          "Invalid token correctly rejected")
        else:
            self.log_result("Authentication - invalid token format", False, 
                          f"Expected 401/403, got {response.status_code}")
        
        # Test 2: Missing Bearer prefix
        if 'tradesperson' in self.auth_tokens:
            token = self.auth_tokens['tradesperson']
            response = self.make_request("POST", "/interests/show-interest", 
                                       json=interest_data, 
                                       headers={"Authorization": token})  # Missing "Bearer "
            
            if response.status_code in [401, 403]:
                self.log_result("Authentication - missing Bearer prefix", True, 
                              "Missing Bearer prefix correctly rejected")
            else:
                self.log_result("Authentication - missing Bearer prefix", False, 
                              f"Expected 401/403, got {response.status_code}")
        
        # Test 3: Empty Authorization header
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, 
                                   headers={"Authorization": ""})
        
        if response.status_code in [401, 403]:
            self.log_result("Authentication - empty header", True, 
                          "Empty authorization header correctly rejected")
        else:
            self.log_result("Authentication - empty header", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_notification_system_integration(self):
        """Test that notifications are triggered when interest is shown"""
        print("\n=== Testing Notification System Integration ===")
        
        # This is a complex test that would require checking notification records
        # For now, we'll verify that the show interest endpoint completes successfully
        # which should trigger background notification tasks
        
        if ('tradesperson' not in self.auth_tokens or 
            'homeowner' not in self.auth_tokens):
            self.log_result("Notification system test", False, 
                          "Missing required authentication tokens")
            return
        
        # Create a fresh job and show interest to test notifications
        homeowner_token = self.auth_tokens['homeowner']
        
        notification_test_job = {
            "title": "Notification Test Job - Carpentry Work",
            "description": "Testing notification system with carpentry job.",
            "category": "Carpentry",
            "state": "Lagos",
            "lga": "Surulere",
            "town": "Surulere",
            "zip_code": "101001",
            "home_address": "789 Bode Thomas Street, Surulere",
            "budget_min": 60000,
            "budget_max": 120000,
            "timeline": "Within 3 days",
            "homeowner_name": self.test_data['homeowner_user']['name'],
            "homeowner_email": self.test_data['homeowner_user']['email'],
            "homeowner_phone": self.test_data['homeowner_user']['phone']
        }
        
        response = self.make_request("POST", "/jobs/", json=notification_test_job, 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            job_response = response.json()
            notification_job_id = job_response.get('id')
            
            # Create another tradesperson for this test
            carpenter_data = {
                "name": "David Carpenter",
                "email": f"david.carpenter.{uuid.uuid4().hex[:8]}@tradework.com",
                "password": "SecurePass123",
                "phone": "+2348123456792",
                "location": "Lagos",
                "postcode": "101001",
                "trade_categories": ["Carpentry"],
                "experience_years": 4,
                "company_name": "David's Carpentry",
                "description": "Professional carpentry services",
                "certifications": ["Certified Carpenter"]
            }
            
            reg_response = self.make_request("POST", "/auth/register/tradesperson", json=carpenter_data)
            if reg_response.status_code == 200:
                # Login carpenter
                login_data = {
                    "email": carpenter_data["email"],
                    "password": carpenter_data["password"]
                }
                
                login_response = self.make_request("POST", "/auth/login", json=login_data)
                if login_response.status_code == 200:
                    carpenter_token = login_response.json()['access_token']
                    
                    # Show interest (this should trigger notifications)
                    interest_data = {"job_id": notification_job_id}
                    interest_response = self.make_request("POST", "/interests/show-interest", 
                                                        json=interest_data, auth_token=carpenter_token)
                    
                    if interest_response.status_code == 200:
                        self.log_result("Notification system integration", True, 
                                      "Interest shown successfully (notifications should be triggered)")
                        
                        # Wait a moment for background tasks
                        time.sleep(2)
                        
                        # Verify the interest was created properly
                        interest_id = interest_response.json().get('id')
                        if interest_id:
                            self.log_result("Notification system - interest creation", True, 
                                          f"Interest created with ID: {interest_id}")
                        else:
                            self.log_result("Notification system - interest creation", False, 
                                          "No interest ID returned")
                    else:
                        self.log_result("Notification system integration", False, 
                                      f"Failed to show interest: {interest_response.status_code}")
                else:
                    self.log_result("Notification system setup", False, "Failed to login carpenter")
            else:
                self.log_result("Notification system setup", False, "Failed to create carpenter")
        else:
            self.log_result("Notification system setup", False, "Failed to create notification test job")
    
    def run_show_interest_tests(self):
        """Run comprehensive show interest functionality testing"""
        print("🎯 STARTING COMPREHENSIVE SHOW INTEREST FUNCTIONALITY TESTING")
        print("=" * 80)
        
        # Setup authentication and test data
        self.test_tradesperson_authentication()
        self.test_homeowner_authentication()
        
        # Create test jobs
        self.test_job_creation_for_interest_testing()
        
        # Test job data integration
        self.test_jobs_for_tradesperson_endpoint()
        
        # Test core show interest functionality
        self.test_show_interest_api_endpoint()
        
        # Test role restrictions
        self.test_homeowner_role_restriction()
        
        # Test interest retrieval
        self.test_interest_retrieval_endpoints()
        
        # Test job status validation
        self.test_job_status_validation()
        
        # Test authentication edge cases
        self.test_authentication_edge_cases()
        
        # Test notification system integration
        self.test_notification_system_integration()
        
        # Print final summary
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE SHOW INTEREST FUNCTIONALITY TESTING COMPLETE")
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['failed'] > 0:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        # Provide specific diagnosis for show interest failures
        print(f"\n🔍 SHOW INTEREST FAILURE DIAGNOSIS:")
        if self.results['failed'] == 0:
            print("   ✅ No issues found - show interest functionality is working correctly")
        else:
            print("   ❌ Issues identified that may cause 'showing interest for jobs failed' error:")
            for error in self.results['errors']:
                if 'show interest' in error.lower():
                    print(f"      • {error}")
        
        return success_rate >= 85  # Consider 85%+ as successful

if __name__ == "__main__":
    tester = ShowInterestTester()
    tester.run_show_interest_tests()
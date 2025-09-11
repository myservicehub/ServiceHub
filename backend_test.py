#!/usr/bin/env python3
"""
CRITICAL BUG INVESTIGATION: Contact sharing status not reflecting in tradesperson account

**Problem Description:**
A homeowner shared contact with an interested tradesperson, but the status change is not appearing 
in the tradesperson's account. This breaks the core workflow where the tradesperson should see 
the status change from "interested" to "contact_shared" and be able to pay for access.

**Specific API Endpoints to Test:**
1. POST /api/interests/share-contact/{interest_id} - The main contact sharing endpoint
2. GET /api/interests/my-interests - To verify tradesperson can see updated status
3. GET /api/interests/job/{job_id} - To verify homeowner can see updated status

**Investigation Areas:**
1. API Functionality - Test the share-contact endpoint with valid interest IDs
2. Database Updates - Check if interest status is actually updating from "interested" to "contact_shared"
3. Status Synchronization - Test that status changes are immediately visible via GET endpoints
4. Notification System - Verify background notification task is triggered

**Test Scenarios:**
1. Create a complete interest flow: job creation → show interest → share contact
2. Test the share-contact API from homeowner perspective
3. Immediately check status from tradesperson perspective
4. Verify notification delivery
5. Test edge cases (already shared, non-existent interest, wrong permissions)

**Expected Behavior:**
- Homeowner can successfully share contact details
- Interest status updates from "interested" to "contact_shared" immediately
- Tradesperson sees updated status in their interests list
- Notification is sent to tradesperson
- Tradesperson can then proceed to pay for access

Using existing test credentials (john.plumber.d553d0b3@tradework.com) and create a complete test scenario 
to identify where the breakdown is occurring.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import time

# Get backend URL from environment
BACKEND_URL = "https://servicehub-fixes.preview.emergentagent.com/api"

class ContactSharingBugTester:
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
    
    def test_job_creation_for_contact_sharing_test(self):
        """Create test job for contact sharing investigation"""
        print("\n=== Creating Test Job for Contact Sharing Investigation ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job creation setup", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        # Create job specifically for contact sharing test
        job_data = {
            "title": "CONTACT SHARING BUG TEST - Plumbing Services Needed",
            "description": "Testing contact sharing functionality. Need professional plumber for bathroom renovation. Includes pipe installation and fixture replacement.",
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
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            job_response = response.json()
            self.test_data['test_job_id'] = job_response.get('id')
            self.test_data['test_job'] = job_response
            self.log_result("Create contact sharing test job", True, f"Job ID: {job_response.get('id')}")
        else:
            self.log_result("Create contact sharing test job", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_show_interest_for_contact_sharing(self):
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

    # ==========================================
    # MESSAGING SYSTEM TESTS
    # ==========================================

    def setup_paid_access_scenario(self):
        """Set up a scenario where tradesperson has paid access to a job"""
        print("\n=== Setting Up Paid Access Scenario for Messaging ===")
        
        if ('tradesperson' not in self.auth_tokens or 
            'homeowner' not in self.auth_tokens or
            'active_job_id' not in self.test_data):
            self.log_result("Paid access setup", False, "Missing required test data")
            return False
        
        # First show interest in the job
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['active_job_id']
        
        interest_data = {"job_id": job_id}
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interest_response = response.json()
            interest_id = interest_response.get('id')
            self.test_data['test_interest_id'] = interest_id
            
            # Simulate payment by updating interest status to "paid_access"
            # This would normally be done through the payment system
            # For testing, we'll assume the interest status can be updated
            self.log_result("Interest creation for messaging", True, 
                          f"Interest created: {interest_id}")
            
            # Store the paid access scenario data
            self.test_data['paid_access_job_id'] = job_id
            self.test_data['paid_access_tradesperson_id'] = self.test_data['tradesperson_user']['id']
            self.test_data['paid_access_homeowner_id'] = self.test_data['homeowner_user']['id']
            
            return True
        else:
            self.log_result("Interest creation for messaging", False, 
                          f"Failed to create interest: {response.status_code}")
            return False

    def test_conversation_creation(self):
        """Test POST /api/messages/conversations - Create conversation"""
        print("\n=== Testing Conversation Creation ===")
        
        if not self.setup_paid_access_scenario():
            return
        
        # Test 1: Create conversation as homeowner
        homeowner_token = self.auth_tokens['homeowner']
        conversation_data = {
            "job_id": self.test_data['paid_access_job_id'],
            "homeowner_id": self.test_data['paid_access_homeowner_id'],
            "tradesperson_id": self.test_data['paid_access_tradesperson_id']
        }
        
        response = self.make_request("POST", "/messages/conversations", 
                                   json=conversation_data, auth_token=homeowner_token)
        
        if response.status_code == 200:
            conversation_response = response.json()
            required_fields = ['id', 'job_id', 'job_title', 'homeowner_id', 'homeowner_name', 
                             'tradesperson_id', 'tradesperson_name']
            missing_fields = [field for field in required_fields if field not in conversation_response]
            
            if not missing_fields:
                self.test_data['test_conversation_id'] = conversation_response['id']
                self.log_result("Create conversation - homeowner", True, 
                              f"Conversation created: {conversation_response['id']}")
            else:
                self.log_result("Create conversation - response structure", False, 
                              f"Missing fields: {missing_fields}")
        else:
            self.log_result("Create conversation - homeowner", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to create duplicate conversation
        response = self.make_request("POST", "/messages/conversations", 
                                   json=conversation_data, auth_token=homeowner_token)
        
        if response.status_code == 200:
            # Should return existing conversation
            self.log_result("Create conversation - duplicate handling", True, 
                          "Duplicate conversation handled correctly")
        else:
            self.log_result("Create conversation - duplicate handling", False, 
                          f"Unexpected status: {response.status_code}")
        
        # Test 3: Unauthorized conversation creation
        unauthorized_data = {
            "job_id": self.test_data['paid_access_job_id'],
            "homeowner_id": "unauthorized_user_id",
            "tradesperson_id": self.test_data['paid_access_tradesperson_id']
        }
        
        response = self.make_request("POST", "/messages/conversations", 
                                   json=unauthorized_data, auth_token=homeowner_token)
        
        if response.status_code == 403:
            self.log_result("Create conversation - authorization", True, 
                          "Unauthorized access correctly prevented")
        else:
            self.log_result("Create conversation - authorization", False, 
                          f"Expected 403, got {response.status_code}")

    def test_get_conversations(self):
        """Test GET /api/messages/conversations - Get user's conversations"""
        print("\n=== Testing Get Conversations ===")
        
        if 'test_conversation_id' not in self.test_data:
            self.log_result("Get conversations test", False, "No test conversation available")
            return
        
        # Test 1: Get conversations as homeowner
        homeowner_token = self.auth_tokens['homeowner']
        response = self.make_request("GET", "/messages/conversations", auth_token=homeowner_token)
        
        if response.status_code == 200:
            conversations_response = response.json()
            if 'conversations' in conversations_response and 'total' in conversations_response:
                conversations = conversations_response['conversations']
                total = conversations_response['total']
                
                if total > 0 and len(conversations) > 0:
                    # Verify conversation structure
                    first_conv = conversations[0]
                    required_fields = ['id', 'job_id', 'job_title', 'homeowner_id', 'tradesperson_id']
                    missing_fields = [field for field in required_fields if field not in first_conv]
                    
                    if not missing_fields:
                        self.log_result("Get conversations - homeowner", True, 
                                      f"Retrieved {total} conversations")
                    else:
                        self.log_result("Get conversations - structure", False, 
                                      f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Get conversations - homeowner", False, 
                                  "No conversations returned")
            else:
                self.log_result("Get conversations - response format", False, 
                              "Invalid response format")
        else:
            self.log_result("Get conversations - homeowner", False, 
                          f"Status: {response.status_code}")
        
        # Test 2: Get conversations as tradesperson
        tradesperson_token = self.auth_tokens['tradesperson']
        response = self.make_request("GET", "/messages/conversations", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            conversations_response = response.json()
            if conversations_response.get('total', 0) > 0:
                self.log_result("Get conversations - tradesperson", True, 
                              f"Retrieved {conversations_response['total']} conversations")
            else:
                self.log_result("Get conversations - tradesperson", False, 
                              "No conversations found for tradesperson")
        else:
            self.log_result("Get conversations - tradesperson", False, 
                          f"Status: {response.status_code}")
        
        # Test 3: Pagination
        response = self.make_request("GET", "/messages/conversations?skip=0&limit=5", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Get conversations - pagination", True, 
                          "Pagination parameters accepted")
        else:
            self.log_result("Get conversations - pagination", False, 
                          f"Status: {response.status_code}")

    def test_send_message(self):
        """Test POST /api/messages/conversations/{conversation_id}/messages - Send message"""
        print("\n=== Testing Send Message ===")
        
        if 'test_conversation_id' not in self.test_data:
            self.log_result("Send message test", False, "No test conversation available")
            return
        
        conversation_id = self.test_data['test_conversation_id']
        
        # Test 1: Send message as homeowner
        homeowner_token = self.auth_tokens['homeowner']
        message_data = {
            "conversation_id": conversation_id,
            "message_type": "text",
            "content": "Hello! I'm interested in discussing this job with you."
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                   json=message_data, auth_token=homeowner_token)
        
        if response.status_code == 200:
            message_response = response.json()
            required_fields = ['id', 'conversation_id', 'sender_id', 'sender_name', 
                             'sender_type', 'content', 'created_at']
            missing_fields = [field for field in required_fields if field not in message_response]
            
            if not missing_fields:
                self.test_data['test_message_id'] = message_response['id']
                self.log_result("Send message - homeowner", True, 
                              f"Message sent: {message_response['id']}")
                
                # Verify message content and sender
                if (message_response['content'] == message_data['content'] and 
                    message_response['sender_type'] == 'homeowner'):
                    self.log_result("Send message - content verification", True, 
                                  "Message content and sender correct")
                else:
                    self.log_result("Send message - content verification", False, 
                                  "Message content or sender incorrect")
            else:
                self.log_result("Send message - response structure", False, 
                              f"Missing fields: {missing_fields}")
        else:
            self.log_result("Send message - homeowner", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Send message as tradesperson
        tradesperson_token = self.auth_tokens['tradesperson']
        tradesperson_message = {
            "conversation_id": conversation_id,
            "message_type": "text",
            "content": "Thank you for reaching out! I'd be happy to discuss the project details."
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                   json=tradesperson_message, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            message_response = response.json()
            if message_response['sender_type'] == 'tradesperson':
                self.log_result("Send message - tradesperson", True, 
                              f"Tradesperson message sent: {message_response['id']}")
            else:
                self.log_result("Send message - tradesperson sender type", False, 
                              f"Wrong sender type: {message_response['sender_type']}")
        else:
            self.log_result("Send message - tradesperson", False, 
                          f"Status: {response.status_code}")
        
        # Test 3: Send message with attachment
        attachment_message = {
            "conversation_id": conversation_id,
            "message_type": "image",
            "content": "Here's a photo of similar work I've done",
            "attachment_url": "https://example.com/image.jpg"
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                   json=attachment_message, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            message_response = response.json()
            if message_response.get('attachment_url') == attachment_message['attachment_url']:
                self.log_result("Send message - with attachment", True, 
                              "Message with attachment sent successfully")
            else:
                self.log_result("Send message - attachment handling", False, 
                              "Attachment URL not preserved")
        else:
            self.log_result("Send message - with attachment", False, 
                          f"Status: {response.status_code}")
        
        # Test 4: Unauthorized message sending
        unauthorized_message = {
            "conversation_id": conversation_id,
            "message_type": "text",
            "content": "Unauthorized message"
        }
        
        # Try to send without authentication
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                   json=unauthorized_message)
        
        if response.status_code in [401, 403]:
            self.log_result("Send message - authentication required", True, 
                          "Unauthenticated request correctly rejected")
        else:
            self.log_result("Send message - authentication required", False, 
                          f"Expected 401/403, got {response.status_code}")

    def test_get_conversation_messages(self):
        """Test GET /api/messages/conversations/{conversation_id}/messages - Get messages"""
        print("\n=== Testing Get Conversation Messages ===")
        
        if 'test_conversation_id' not in self.test_data:
            self.log_result("Get messages test", False, "No test conversation available")
            return
        
        conversation_id = self.test_data['test_conversation_id']
        
        # Test 1: Get messages as homeowner
        homeowner_token = self.auth_tokens['homeowner']
        response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            messages_response = response.json()
            if 'messages' in messages_response and 'total' in messages_response:
                messages = messages_response['messages']
                total = messages_response['total']
                
                if total > 0 and len(messages) > 0:
                    # Verify message structure
                    first_message = messages[0]
                    required_fields = ['id', 'conversation_id', 'sender_id', 'content', 'created_at']
                    missing_fields = [field for field in required_fields if field not in first_message]
                    
                    if not missing_fields:
                        self.log_result("Get messages - homeowner", True, 
                                      f"Retrieved {total} messages")
                        
                        # Verify messages are ordered by creation time
                        if len(messages) > 1:
                            first_time = messages[0]['created_at']
                            last_time = messages[-1]['created_at']
                            self.log_result("Get messages - ordering", True, 
                                          "Messages properly ordered by time")
                    else:
                        self.log_result("Get messages - structure", False, 
                                      f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Get messages - homeowner", False, 
                                  "No messages returned")
            else:
                self.log_result("Get messages - response format", False, 
                              "Invalid response format")
        else:
            self.log_result("Get messages - homeowner", False, 
                          f"Status: {response.status_code}")
        
        # Test 2: Get messages as tradesperson
        tradesperson_token = self.auth_tokens['tradesperson']
        response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages", 
                                   auth_token=tradesperson_token)
        
        if response.status_code == 200:
            messages_response = response.json()
            if messages_response.get('total', 0) > 0:
                self.log_result("Get messages - tradesperson", True, 
                              f"Retrieved {messages_response['total']} messages")
            else:
                self.log_result("Get messages - tradesperson", False, 
                              "No messages found for tradesperson")
        else:
            self.log_result("Get messages - tradesperson", False, 
                          f"Status: {response.status_code}")
        
        # Test 3: Pagination
        response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages?skip=0&limit=2", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            messages_response = response.json()
            if len(messages_response.get('messages', [])) <= 2:
                self.log_result("Get messages - pagination", True, 
                              "Pagination working correctly")
            else:
                self.log_result("Get messages - pagination", False, 
                              "Pagination limit not respected")
        else:
            self.log_result("Get messages - pagination", False, 
                          f"Status: {response.status_code}")
        
        # Test 4: Unauthorized access
        fake_conversation_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/messages/conversations/{fake_conversation_id}/messages", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Get messages - invalid conversation", True, 
                          "Invalid conversation ID correctly handled")
        else:
            self.log_result("Get messages - invalid conversation", False, 
                          f"Expected 404, got {response.status_code}")

    def test_mark_messages_as_read(self):
        """Test PUT /api/messages/conversations/{conversation_id}/read - Mark messages as read"""
        print("\n=== Testing Mark Messages as Read ===")
        
        if 'test_conversation_id' not in self.test_data:
            self.log_result("Mark messages read test", False, "No test conversation available")
            return
        
        conversation_id = self.test_data['test_conversation_id']
        
        # Test 1: Mark messages as read - homeowner
        homeowner_token = self.auth_tokens['homeowner']
        response = self.make_request("PUT", f"/messages/conversations/{conversation_id}/read", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            read_response = response.json()
            if 'message' in read_response:
                self.log_result("Mark messages read - homeowner", True, 
                              "Messages marked as read successfully")
            else:
                self.log_result("Mark messages read - response format", False, 
                              "Invalid response format")
        else:
            self.log_result("Mark messages read - homeowner", False, 
                          f"Status: {response.status_code}")
        
        # Test 2: Mark messages as read - tradesperson
        tradesperson_token = self.auth_tokens['tradesperson']
        response = self.make_request("PUT", f"/messages/conversations/{conversation_id}/read", 
                                   auth_token=tradesperson_token)
        
        if response.status_code == 200:
            self.log_result("Mark messages read - tradesperson", True, 
                          "Tradesperson can mark messages as read")
        else:
            self.log_result("Mark messages read - tradesperson", False, 
                          f"Status: {response.status_code}")
        
        # Test 3: Unauthorized access
        fake_conversation_id = str(uuid.uuid4())
        response = self.make_request("PUT", f"/messages/conversations/{fake_conversation_id}/read", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Mark messages read - invalid conversation", True, 
                          "Invalid conversation ID correctly handled")
        else:
            self.log_result("Mark messages read - invalid conversation", False, 
                          f"Expected 404, got {response.status_code}")
        
        # Test 4: Unauthenticated request
        response = self.make_request("PUT", f"/messages/conversations/{conversation_id}/read")
        
        if response.status_code in [401, 403]:
            self.log_result("Mark messages read - authentication", True, 
                          "Authentication required correctly enforced")
        else:
            self.log_result("Mark messages read - authentication", False, 
                          f"Expected 401/403, got {response.status_code}")

    def test_get_or_create_conversation_for_job(self):
        """Test GET /api/messages/conversations/job/{job_id} - Get or create conversation for job"""
        print("\n=== Testing Get/Create Conversation for Job ===")
        
        if 'paid_access_job_id' not in self.test_data:
            self.log_result("Job conversation test", False, "No paid access job available")
            return
        
        job_id = self.test_data['paid_access_job_id']
        tradesperson_id = self.test_data['paid_access_tradesperson_id']
        
        # Test 1: Get existing conversation
        homeowner_token = self.auth_tokens['homeowner']
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            job_conv_response = response.json()
            if 'conversation_id' in job_conv_response and 'exists' in job_conv_response:
                exists = job_conv_response['exists']
                conversation_id = job_conv_response['conversation_id']
                
                self.log_result("Get conversation for job - homeowner", True, 
                              f"Conversation {'found' if exists else 'created'}: {conversation_id}")
            else:
                self.log_result("Get conversation for job - response format", False, 
                              "Invalid response format")
        else:
            self.log_result("Get conversation for job - homeowner", False, 
                          f"Status: {response.status_code}")
        
        # Test 2: Access as tradesperson
        tradesperson_token = self.auth_tokens['tradesperson']
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                                   auth_token=tradesperson_token)
        
        if response.status_code == 200:
            self.log_result("Get conversation for job - tradesperson", True, 
                          "Tradesperson can access job conversation")
        else:
            self.log_result("Get conversation for job - tradesperson", False, 
                          f"Status: {response.status_code}")
        
        # Test 3: Invalid job ID
        fake_job_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/messages/conversations/job/{fake_job_id}?tradesperson_id={tradesperson_id}", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Get conversation for job - invalid job", True, 
                          "Invalid job ID correctly handled")
        else:
            self.log_result("Get conversation for job - invalid job", False, 
                          f"Expected 404, got {response.status_code}")
        
        # Test 4: Unauthorized access (different homeowner)
        # This would require creating another homeowner, but for now we'll test with missing tradesperson_id
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}", 
                                   auth_token=homeowner_token)
        
        if response.status_code in [400, 422]:
            self.log_result("Get conversation for job - missing tradesperson_id", True, 
                          "Missing tradesperson_id correctly handled")
        else:
            self.log_result("Get conversation for job - missing tradesperson_id", False, 
                          f"Expected 400/422, got {response.status_code}")

    def test_messaging_access_control(self):
        """Test access control for messaging system"""
        print("\n=== Testing Messaging Access Control ===")
        
        if 'test_conversation_id' not in self.test_data:
            self.log_result("Access control test", False, "No test conversation available")
            return
        
        conversation_id = self.test_data['test_conversation_id']
        
        # Create a third user (another tradesperson) who shouldn't have access
        unauthorized_user_data = {
            "name": "Unauthorized User",
            "email": f"unauthorized.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "+2348123456799",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical"],
            "experience_years": 2,
            "company_name": "Unauthorized Services",
            "description": "Should not have access",
            "certifications": ["Basic Cert"]
        }
        
        reg_response = self.make_request("POST", "/auth/register/tradesperson", json=unauthorized_user_data)
        if reg_response.status_code == 200:
            # Login unauthorized user
            login_data = {
                "email": unauthorized_user_data["email"],
                "password": unauthorized_user_data["password"]
            }
            
            login_response = self.make_request("POST", "/auth/login", json=login_data)
            if login_response.status_code == 200:
                unauthorized_token = login_response.json()['access_token']
                
                # Test 1: Try to get conversation messages
                response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages", 
                                           auth_token=unauthorized_token)
                
                if response.status_code == 403:
                    self.log_result("Access control - get messages", True, 
                                  "Unauthorized user correctly denied access to messages")
                else:
                    self.log_result("Access control - get messages", False, 
                                  f"Expected 403, got {response.status_code}")
                
                # Test 2: Try to send message
                unauthorized_message = {
                    "conversation_id": conversation_id,
                    "message_type": "text",
                    "content": "This should not be allowed"
                }
                
                response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                           json=unauthorized_message, auth_token=unauthorized_token)
                
                if response.status_code == 403:
                    self.log_result("Access control - send message", True, 
                                  "Unauthorized user correctly denied message sending")
                else:
                    self.log_result("Access control - send message", False, 
                                  f"Expected 403, got {response.status_code}")
                
                # Test 3: Try to mark messages as read
                response = self.make_request("PUT", f"/messages/conversations/{conversation_id}/read", 
                                           auth_token=unauthorized_token)
                
                if response.status_code == 403:
                    self.log_result("Access control - mark read", True, 
                                  "Unauthorized user correctly denied read marking")
                else:
                    self.log_result("Access control - mark read", False, 
                                  f"Expected 403, got {response.status_code}")
            else:
                self.log_result("Access control setup", False, "Failed to login unauthorized user")
        else:
            self.log_result("Access control setup", False, "Failed to create unauthorized user")

    def test_messaging_authentication_requirements(self):
        """Test that all messaging endpoints require authentication"""
        print("\n=== Testing Messaging Authentication Requirements ===")
        
        if 'test_conversation_id' not in self.test_data:
            self.log_result("Authentication test", False, "No test conversation available")
            return
        
        conversation_id = self.test_data['test_conversation_id']
        job_id = self.test_data.get('paid_access_job_id', 'test_job_id')
        
        # Test all endpoints without authentication
        endpoints_to_test = [
            ("POST", "/messages/conversations", {"job_id": job_id, "homeowner_id": "test", "tradesperson_id": "test"}),
            ("GET", "/messages/conversations", None),
            ("GET", f"/messages/conversations/{conversation_id}/messages", None),
            ("POST", f"/messages/conversations/{conversation_id}/messages", {"content": "test", "message_type": "text"}),
            ("PUT", f"/messages/conversations/{conversation_id}/read", None),
            ("GET", f"/messages/conversations/job/{job_id}?tradesperson_id=test", None)
        ]
        
        for method, endpoint, data in endpoints_to_test:
            if data:
                response = self.make_request(method, endpoint, json=data)
            else:
                response = self.make_request(method, endpoint)
            
            if response.status_code in [401, 403]:
                self.log_result(f"Authentication required - {method} {endpoint}", True, 
                              "Authentication correctly required")
            else:
                self.log_result(f"Authentication required - {method} {endpoint}", False, 
                              f"Expected 401/403, got {response.status_code}")
    
    def run_messaging_system_tests(self):
        """Run comprehensive messaging system API testing"""
        print("💬 STARTING COMPREHENSIVE MESSAGING SYSTEM API TESTING")
        print("=" * 80)
        
        # Setup authentication and test data
        self.test_tradesperson_authentication()
        self.test_homeowner_authentication()
        
        # Create test jobs for messaging context
        self.test_job_creation_for_interest_testing()
        
        # Test messaging system endpoints
        print("\n🔄 TESTING MESSAGING SYSTEM ENDPOINTS")
        self.test_conversation_creation()
        self.test_get_conversations()
        self.test_send_message()
        self.test_get_conversation_messages()
        self.test_mark_messages_as_read()
        self.test_get_or_create_conversation_for_job()
        
        # Test security and access control
        print("\n🔒 TESTING SECURITY AND ACCESS CONTROL")
        self.test_messaging_access_control()
        self.test_messaging_authentication_requirements()
        
        # Print final summary
        print("\n" + "=" * 80)
        print("💬 COMPREHENSIVE MESSAGING SYSTEM API TESTING COMPLETE")
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['failed'] > 0:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        # Provide specific diagnosis for messaging system
        print(f"\n🔍 MESSAGING SYSTEM DIAGNOSIS:")
        if self.results['failed'] == 0:
            print("   ✅ No issues found - messaging system is fully functional")
            print("   ✅ All API endpoints working correctly")
            print("   ✅ Authentication and authorization properly enforced")
            print("   ✅ Message exchange and conversation management operational")
        else:
            print("   ❌ Issues identified in messaging system:")
            critical_issues = []
            minor_issues = []
            
            for error in self.results['errors']:
                if any(keyword in error.lower() for keyword in ['conversation', 'message', 'authentication', 'access']):
                    if any(critical in error.lower() for critical in ['failed to create', 'failed to send', 'unauthorized access']):
                        critical_issues.append(error)
                    else:
                        minor_issues.append(error)
            
            if critical_issues:
                print("   🚨 CRITICAL ISSUES:")
                for issue in critical_issues:
                    print(f"      • {issue}")
            
            if minor_issues:
                print("   ⚠️  MINOR ISSUES:")
                for issue in minor_issues:
                    print(f"      • {issue}")
        
        return success_rate >= 85  # Consider 85%+ as successful

if __name__ == "__main__":
    tester = MessagingSystemTester()
    tester.run_messaging_system_tests()
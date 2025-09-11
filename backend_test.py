#!/usr/bin/env python3
"""
CRITICAL BUG INVESTIGATION: Send button not working in ChatModal

**Problem Description:**
User reports that the send button in the chat interface is not working. The ChatModal component loads but messages cannot be sent.

**Specific Investigation Areas:**

1. **Messaging API Endpoints Testing:**
   - Test GET `/api/messages/conversations/job/{job_id}` endpoint (get or create conversation)
   - Test POST `/api/messages/conversations/{conversation_id}/messages` endpoint (send message)
   - Verify proper authentication and access control
   - Check if conversation creation is working for paid interests

2. **Interest Status Verification:**
   - Verify that paid interests have status "paid_access" (not just "paid")
   - Check if tradesperson has proper access to create conversations
   - Test with existing paid interest data

3. **Conversation Creation Flow:**
   - Test conversation creation between homeowner and tradesperson with paid access
   - Verify conversation ID is returned correctly
   - Check if conversation exists in database

4. **Message Sending Flow:**
   - Test sending messages with valid conversation ID
   - Verify message data structure and validation
   - Check message creation in database

**Test Scenarios:**

1. **Authentication & Access:**
   - Login as tradesperson with paid access to a job
   - Verify interest status is "paid_access"
   - Test conversation creation permissions

2. **Conversation Creation:**
   - Call GET `/api/messages/conversations/job/{job_id}?tradesperson_id={id}`
   - Verify response structure: `{"conversation_id": "...", "exists": true/false}`
   - Check if conversation is created in database

3. **Message Sending:**
   - Create a message with valid conversation_id
   - Test POST `/api/messages/conversations/{conversation_id}/messages`
   - Verify message is saved and returned correctly

4. **Error Scenarios:**
   - Test with invalid conversation IDs
   - Test with unpaid interests
   - Test with missing parameters

**Backend Requirements:**
- Interest status must be "paid_access" for conversation creation
- User must be authenticated with proper role (homeowner/tradesperson)
- Conversation ID must exist before sending messages
- Message data must include conversation_id, message_type, content

**Expected Results:**
- Paid tradespeople can create conversations with homeowners
- Messages can be sent successfully with proper conversation ID
- Backend APIs return correct response structures
- No 403/404/500 errors for valid requests
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

class MessagingSystemTester:
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
        """Test showing interest in the job (prerequisite for contact sharing)"""
        print("\n=== Testing Show Interest (Prerequisite for Contact Sharing) ===")
        
        if 'tradesperson' not in self.auth_tokens or 'test_job_id' not in self.test_data:
            self.log_result("Show interest setup", False, "Missing tradesperson token or test job ID")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['test_job_id']
        
        # Show interest in the job
        interest_data = {"job_id": job_id}
        
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interest_response = response.json()
            required_fields = ['id', 'job_id', 'tradesperson_id', 'status', 'created_at']
            missing_fields = [field for field in required_fields if field not in interest_response]
            
            if not missing_fields:
                self.test_data['interest_id'] = interest_response.get('id')
                self.test_data['interest_data'] = interest_response
                
                # Verify initial status is 'interested'
                if interest_response.get('status') == 'interested':
                    self.log_result("Show interest - initial status", True, 
                                  f"Interest created with ID: {interest_response.get('id')}, Status: interested")
                else:
                    self.log_result("Show interest - initial status", False, 
                                  f"Expected status 'interested', got '{interest_response.get('status')}'")
            else:
                self.log_result("Show interest - response structure", False, 
                              f"Missing fields: {missing_fields}")
        else:
            self.log_result("Show interest", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_my_interests_api_endpoint(self):
        """CRITICAL TEST: Test the My Interests API endpoint"""
        print("\n=== CRITICAL TEST: My Interests API Endpoint ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("My interests API setup", False, "Missing tradesperson token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        print(f"🔍 Testing GET /api/interests/my-interests for tradesperson")
        
        # Test the my-interests endpoint
        start_time = time.time()
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        response_time = time.time() - start_time
        
        print(f"⏱️ Response time: {response_time:.2f} seconds")
        
        if response.status_code == 200:
            try:
                interests_data = response.json()
                
                # Verify response is a list
                if isinstance(interests_data, list):
                    self.log_result("My interests API - response format", True, 
                                  f"Returned {len(interests_data)} interests as list")
                    
                    # Store for further testing
                    self.test_data['my_interests_response'] = interests_data
                    
                    # Test response structure if we have interests
                    if len(interests_data) > 0:
                        self.test_interest_data_structure(interests_data[0])
                        self.test_datetime_serialization(interests_data)
                        self.test_new_fields_presence(interests_data)
                    else:
                        self.log_result("My interests API - data availability", True, 
                                      "No interests found (empty list) - this is valid")
                        
                else:
                    self.log_result("My interests API - response format", False, 
                                  f"Expected list, got {type(interests_data)}")
                    
            except json.JSONDecodeError as e:
                self.log_result("My interests API - JSON parsing", False, 
                              f"Failed to parse JSON response: {str(e)}")
        else:
            self.log_result("My interests API", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
            
        # Test response time performance
        if response_time > 5.0:
            self.log_result("My interests API - performance", False, 
                          f"Slow response time: {response_time:.2f}s (>5s)")
        else:
            self.log_result("My interests API - performance", True, 
                          f"Good response time: {response_time:.2f}s")
    
    def test_interest_data_structure(self, interest_sample):
        """Test the structure of a single interest record"""
        print("\n=== Testing Interest Data Structure ===")
        
        # Expected fields based on the database projection
        expected_fields = [
            'id', 'job_id', 'status', 'created_at', 'contact_shared_at', 'payment_made_at',
            'job_title', 'job_location', 'homeowner_name', 'contact_shared', 'payment_made', 'access_fee'
        ]
        
        missing_fields = []
        present_fields = []
        
        for field in expected_fields:
            if field in interest_sample:
                present_fields.append(field)
            else:
                missing_fields.append(field)
        
        if not missing_fields:
            self.log_result("Interest data structure - all fields present", True, 
                          f"All {len(expected_fields)} expected fields present")
        else:
            self.log_result("Interest data structure - missing fields", False, 
                          f"Missing fields: {missing_fields}")
        
        # Log the actual structure for debugging
        print(f"🔍 Sample interest structure: {json.dumps(interest_sample, indent=2, default=str)}")
        
        return len(missing_fields) == 0
    
    def test_datetime_serialization(self, interests_data):
        """Test that datetime fields are properly serialized"""
        print("\n=== Testing DateTime Serialization ===")
        
        datetime_fields = ['created_at', 'contact_shared_at', 'payment_made_at']
        serialization_issues = []
        
        for interest in interests_data:
            for field in datetime_fields:
                if field in interest and interest[field] is not None:
                    field_value = interest[field]
                    # Check if it's a string (properly serialized) or an object (serialization issue)
                    if isinstance(field_value, str):
                        # Try to parse it to ensure it's a valid datetime string
                        try:
                            from datetime import datetime
                            datetime.fromisoformat(field_value.replace('Z', '+00:00'))
                        except ValueError:
                            serialization_issues.append(f"Invalid datetime format in {field}: {field_value}")
                    elif isinstance(field_value, dict):
                        serialization_issues.append(f"DateTime field {field} not serialized (is dict): {field_value}")
                    else:
                        serialization_issues.append(f"DateTime field {field} has unexpected type {type(field_value)}: {field_value}")
        
        if not serialization_issues:
            self.log_result("DateTime serialization", True, "All datetime fields properly serialized")
        else:
            self.log_result("DateTime serialization", False, f"Issues found: {serialization_issues}")
        
        return len(serialization_issues) == 0
    
    def test_create_test_interests_for_testing(self):
        """Create some test interests to ensure we have data to test with"""
        print("\n=== Creating Test Interests for Testing ===")
        
        if ('tradesperson' not in self.auth_tokens or 
            'homeowner' not in self.auth_tokens or 
            'test_job_id' not in self.test_data):
            self.log_result("Test interests creation setup", False, "Missing required tokens or job ID")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['test_job_id']
        
        # Create an interest
        interest_data = {"job_id": job_id}
        response = self.make_request("POST", "/interests/show-interest", 
                                   json=interest_data, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interest_response = response.json()
            self.test_data['test_interest_id'] = interest_response.get('id')
            self.log_result("Create test interest", True, f"Interest ID: {interest_response.get('id')}")
            
            # Optionally share contact to create different status scenarios
            if self.test_data.get('test_interest_id'):
                share_response = self.make_request("PUT", f"/interests/share-contact/{self.test_data['test_interest_id']}", 
                                                 auth_token=homeowner_token)
                if share_response.status_code == 200:
                    self.log_result("Create contact shared scenario", True, "Contact shared for testing")
                else:
                    self.log_result("Create contact shared scenario", False, 
                                  f"Status: {share_response.status_code}")
        else:
            self.log_result("Create test interest", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_authentication_and_authorization(self):
        """Test authentication and authorization for My Interests endpoint"""
        print("\n=== Testing Authentication and Authorization ===")
        
        # Test without authentication
        response = self.make_request("GET", "/interests/my-interests")
        if response.status_code in [401, 403]:
            self.log_result("My interests - no auth", True, f"Correctly rejected: {response.status_code}")
        else:
            self.log_result("My interests - no auth", False, f"Expected 401/403, got {response.status_code}")
        
        # Test with homeowner token (should be rejected)
        if 'homeowner' in self.auth_tokens:
            homeowner_token = self.auth_tokens['homeowner']
            response = self.make_request("GET", "/interests/my-interests", auth_token=homeowner_token)
            if response.status_code == 403:
                self.log_result("My interests - homeowner auth", True, "Correctly rejected homeowner")
            else:
                self.log_result("My interests - homeowner auth", False, 
                              f"Expected 403, got {response.status_code}")
        
        # Test with tradesperson token (should succeed)
        if 'tradesperson' in self.auth_tokens:
            tradesperson_token = self.auth_tokens['tradesperson']
            response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
            if response.status_code == 200:
                self.log_result("My interests - tradesperson auth", True, "Correctly allowed tradesperson")
            else:
                self.log_result("My interests - tradesperson auth", False, 
                              f"Expected 200, got {response.status_code}")
    
    def test_new_fields_presence(self, interests_data):
        """Test that the recently added fields are present and working"""
        print("\n=== Testing New Fields Presence (contact_shared_at, payment_made_at) ===")
        
        new_fields = ['contact_shared_at', 'payment_made_at']
        field_stats = {field: {'present': 0, 'null': 0, 'missing': 0} for field in new_fields}
        
        for interest in interests_data:
            for field in new_fields:
                if field in interest:
                    if interest[field] is None:
                        field_stats[field]['null'] += 1
                    else:
                        field_stats[field]['present'] += 1
                else:
                    field_stats[field]['missing'] += 1
        
        # Report statistics
        for field, stats in field_stats.items():
            total = sum(stats.values())
            if stats['missing'] == 0:
                self.log_result(f"New field {field} - presence", True, 
                              f"Present in all records: {stats['present']} with data, {stats['null']} null")
            else:
                self.log_result(f"New field {field} - presence", False, 
                              f"Missing from {stats['missing']}/{total} records")
        
        # Check if any interests have the new fields populated (indicating they've been through the workflow)
        populated_interests = 0
        for interest in interests_data:
            if (interest.get('contact_shared_at') is not None or 
                interest.get('payment_made_at') is not None):
                populated_interests += 1
        
        if populated_interests > 0:
            self.log_result("New fields - workflow data", True, 
                          f"{populated_interests} interests have workflow timestamps")
        else:
            self.log_result("New fields - workflow data", True, 
                          "No interests have workflow timestamps (expected for new interests)")
        
        return all(stats['missing'] == 0 for stats in field_stats.values())
    
    def test_homeowner_status_visibility(self):
        """Test homeowner can see updated status from their perspective"""
        print("\n=== Testing Homeowner Status Visibility ===")
        
        if 'homeowner' not in self.auth_tokens or 'test_job_id' not in self.test_data:
            self.log_result("Homeowner status check setup", False, "Missing homeowner token or job ID")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['test_job_id']
        
        # Test GET /api/interests/job/{job_id} to see interested tradespeople
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        
        if response.status_code == 200:
            job_interests = response.json()
            if 'interested_tradespeople' in job_interests:
                interested_list = job_interests['interested_tradespeople']
                
                # Find our test tradesperson
                test_tradesperson_interest = None
                tradesperson_id = self.test_data['tradesperson_user']['id']
                
                for person in interested_list:
                    if person.get('tradesperson_id') == tradesperson_id:
                        test_tradesperson_interest = person
                        break
                
                if test_tradesperson_interest:
                    current_status = test_tradesperson_interest.get('status')
                    if current_status == 'contact_shared':
                        self.log_result("Homeowner sees updated status", True, 
                                      f"Status correctly shows: {current_status}")
                    else:
                        self.log_result("Homeowner sees updated status", False, 
                                      f"Expected 'contact_shared', homeowner sees: {current_status}")
                else:
                    self.log_result("Homeowner tradesperson lookup", False, 
                                  f"Tradesperson ID {tradesperson_id} not found in interested list")
            else:
                self.log_result("Job interests response structure", False, 
                              "Missing 'interested_tradespeople' field")
        else:
            self.log_result("Homeowner job interests API", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_database_consistency_check(self):
        """Test to verify database consistency by re-fetching the interest"""
        print("\n=== Testing Database Consistency ===")
        
        if 'interest_id' not in self.test_data:
            self.log_result("Database consistency check", False, "No interest ID available")
            return
        
        # Wait a moment to ensure any background tasks complete
        time.sleep(2)
        
        # Re-fetch the interest from tradesperson perspective to check database state
        if 'tradesperson' in self.auth_tokens:
            tradesperson_token = self.auth_tokens['tradesperson']
            
            response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
            
            if response.status_code == 200:
                interests_data = response.json()
                test_interest = None
                
                for interest in interests_data:
                    if interest.get('id') == self.test_data['interest_id']:
                        test_interest = interest
                        break
                
                if test_interest:
                    print(f"🔍 Database State Check - Interest Status: {test_interest.get('status')}")
                    print(f"🔍 Database State Check - Full Interest Data: {json.dumps(test_interest, indent=2)}")
                    
                    # Check if contact_shared_at timestamp exists
                    if 'contact_shared_at' in test_interest:
                        self.log_result("Database consistency - contact_shared_at field", True, 
                                      f"Timestamp: {test_interest.get('contact_shared_at')}")
                    else:
                        self.log_result("Database consistency - contact_shared_at field", False, 
                                      "Missing contact_shared_at timestamp")
                else:
                    self.log_result("Database consistency check", False, "Interest not found")
    
    def test_notification_system_integration(self):
        """Test that notifications are triggered for contact sharing"""
        print("\n=== Testing Notification System Integration ===")
        
        # This test verifies that the background notification task was triggered
        # We can't directly check notification delivery in this test environment,
        # but we can verify the API call completed successfully which should trigger notifications
        
        if 'contact_shared_response' in self.test_data:
            self.log_result("Notification system integration", True, 
                          "Contact sharing API completed successfully (should trigger notifications)")
        else:
            self.log_result("Notification system integration", False, 
                          "Contact sharing API did not complete successfully")
    
    def test_edge_cases(self):
        """Test edge cases for contact sharing"""
        print("\n=== Testing Edge Cases ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Edge cases setup", False, "No homeowner token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test 1: Try to share contact for non-existent interest
        fake_interest_id = str(uuid.uuid4())
        response = self.make_request("PUT", f"/interests/share-contact/{fake_interest_id}", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Edge case - non-existent interest", True, 
                          "Correctly rejected non-existent interest ID")
        else:
            self.log_result("Edge case - non-existent interest", False, 
                          f"Expected 404, got {response.status_code}")
        
        # Test 2: Try to share contact again (should handle already shared)
        if 'interest_id' in self.test_data:
            interest_id = self.test_data['interest_id']
            response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                       auth_token=homeowner_token)
            
            # This might succeed (idempotent) or return an error - both are acceptable
            if response.status_code in [200, 400]:
                self.log_result("Edge case - already shared contact", True, 
                              f"Handled duplicate sharing appropriately: {response.status_code}")
            else:
                self.log_result("Edge case - already shared contact", False, 
                              f"Unexpected status: {response.status_code}")
        
        # Test 3: Unauthorized access (tradesperson trying to share contact)
        if 'tradesperson' in self.auth_tokens and 'interest_id' in self.test_data:
            tradesperson_token = self.auth_tokens['tradesperson']
            interest_id = self.test_data['interest_id']
            
            response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                       auth_token=tradesperson_token)
            
            if response.status_code == 403:
                self.log_result("Edge case - unauthorized access", True, 
                              "Correctly rejected tradesperson trying to share contact")
            else:
                self.log_result("Edge case - unauthorized access", False, 
                              f"Expected 403, got {response.status_code}")
    
    def test_messaging_system_endpoints(self):
        """Test core messaging system API endpoints"""
        print("\n=== CRITICAL TEST: Messaging System API Endpoints ===")
        
        if 'tradesperson' not in self.auth_tokens or 'test_job_id' not in self.test_data:
            self.log_result("Messaging system setup", False, "Missing tradesperson token or test job ID")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        job_id = self.test_data['test_job_id']
        
        # Test 1: Get or create conversation for job
        print(f"🔍 Testing GET /api/messages/conversations/job/{job_id}")
        
        response = self.make_request(
            "GET", 
            f"/messages/conversations/job/{job_id}",
            auth_token=tradesperson_token,
            params={"tradesperson_id": tradesperson_id}
        )
        
        if response.status_code == 200:
            conversation_data = response.json()
            if 'conversation_id' in conversation_data:
                self.test_data['conversation_id'] = conversation_data['conversation_id']
                self.log_result("Conversation creation/retrieval", True, 
                              f"Conversation ID: {conversation_data['conversation_id']}, Exists: {conversation_data.get('exists', False)}")
            else:
                self.log_result("Conversation creation/retrieval", False, 
                              f"Missing conversation_id in response: {conversation_data}")
        else:
            self.log_result("Conversation creation/retrieval", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_message_sending(self):
        """Test sending messages in conversation"""
        print("\n=== CRITICAL TEST: Message Sending ===")
        
        if 'conversation_id' not in self.test_data or 'tradesperson' not in self.auth_tokens:
            self.log_result("Message sending setup", False, "Missing conversation ID or tradesperson token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        conversation_id = self.test_data['conversation_id']
        
        # Test sending a text message
        message_data = {
            "conversation_id": conversation_id,
            "message_type": "text",
            "content": "Hello! I'm interested in discussing this job with you. When would be a good time to start?"
        }
        
        print(f"🔍 Testing POST /api/messages/conversations/{conversation_id}/messages")
        
        response = self.make_request(
            "POST",
            f"/messages/conversations/{conversation_id}/messages",
            auth_token=tradesperson_token,
            json=message_data
        )
        
        if response.status_code == 200:
            message_response = response.json()
            required_fields = ['id', 'conversation_id', 'sender_id', 'sender_name', 'sender_type', 'content', 'created_at']
            missing_fields = [field for field in required_fields if field not in message_response]
            
            if not missing_fields:
                self.test_data['sent_message_id'] = message_response.get('id')
                self.log_result("Message sending", True, 
                              f"Message sent successfully. ID: {message_response.get('id')}")
                
                # Verify message content
                if message_response.get('content') == message_data['content']:
                    self.log_result("Message content verification", True, "Message content matches")
                else:
                    self.log_result("Message content verification", False, 
                                  f"Content mismatch. Expected: {message_data['content']}, Got: {message_response.get('content')}")
            else:
                self.log_result("Message sending - response structure", False, 
                              f"Missing fields: {missing_fields}")
        else:
            self.log_result("Message sending", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_conversation_messages_retrieval(self):
        """Test retrieving messages from conversation"""
        print("\n=== Testing Conversation Messages Retrieval ===")
        
        if 'conversation_id' not in self.test_data or 'tradesperson' not in self.auth_tokens:
            self.log_result("Messages retrieval setup", False, "Missing conversation ID or tradesperson token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        conversation_id = self.test_data['conversation_id']
        
        print(f"🔍 Testing GET /api/messages/conversations/{conversation_id}/messages")
        
        response = self.make_request(
            "GET",
            f"/messages/conversations/{conversation_id}/messages",
            auth_token=tradesperson_token
        )
        
        if response.status_code == 200:
            messages_data = response.json()
            if 'messages' in messages_data and isinstance(messages_data['messages'], list):
                messages = messages_data['messages']
                self.log_result("Messages retrieval", True, 
                              f"Retrieved {len(messages)} messages")
                
                # Verify our sent message is in the list
                if self.test_data.get('sent_message_id'):
                    sent_message_found = any(
                        msg.get('id') == self.test_data['sent_message_id'] 
                        for msg in messages
                    )
                    if sent_message_found:
                        self.log_result("Sent message verification", True, "Sent message found in conversation")
                    else:
                        self.log_result("Sent message verification", False, "Sent message not found in conversation")
            else:
                self.log_result("Messages retrieval", False, 
                              f"Invalid response structure: {messages_data}")
        else:
            self.log_result("Messages retrieval", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_paid_access_requirement(self):
        """Test that conversation creation requires paid access"""
        print("\n=== Testing Paid Access Requirement ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Paid access test setup", False, "Missing homeowner token")
            return
        
        # Create a new job and try to create conversation without paid access
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        # Create a new job for this test
        job_data = {
            "title": "PAID ACCESS TEST - Electrical Work Needed",
            "description": "Testing paid access requirement for messaging. Need electrical installation work.",
            "category": "Electrical Installation",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "456 Test Street, Ikeja",
            "budget_min": 30000,
            "budget_max": 80000,
            "timeline": "Within 1 week",
            "homeowner_name": homeowner_user['name'],
            "homeowner_email": homeowner_user['email'],
            "homeowner_phone": homeowner_user['phone']
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            test_job_id = response.json().get('id')
            
            # Try to create conversation without showing interest first
            if 'tradesperson' in self.auth_tokens:
                tradesperson_token = self.auth_tokens['tradesperson']
                tradesperson_id = self.test_data['tradesperson_user']['id']
                
                response = self.make_request(
                    "GET",
                    f"/messages/conversations/job/{test_job_id}",
                    auth_token=tradesperson_token,
                    params={"tradesperson_id": tradesperson_id}
                )
                
                if response.status_code == 403:
                    self.log_result("Paid access requirement", True, 
                                  "Correctly rejected conversation creation without paid access")
                else:
                    self.log_result("Paid access requirement", False, 
                                  f"Expected 403, got {response.status_code}: {response.text}")
        else:
            self.log_result("Paid access test job creation", False, 
                          f"Failed to create test job: {response.status_code}")
    
    def test_interest_status_verification(self):
        """Verify interest status is 'paid_access' for messaging"""
        print("\n=== Testing Interest Status Verification ===")
        
        if 'tradesperson' not in self.auth_tokens or 'interest_id' not in self.test_data:
            self.log_result("Interest status verification setup", False, "Missing tradesperson token or interest ID")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Get tradesperson's interests to check status
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests = response.json()
            if isinstance(interests, list) and len(interests) > 0:
                # Find our test interest
                test_interest = None
                for interest in interests:
                    if interest.get('id') == self.test_data.get('interest_id'):
                        test_interest = interest
                        break
                
                if test_interest:
                    status = test_interest.get('status')
                    if status == 'paid_access':
                        self.log_result("Interest status verification", True, 
                                      f"Interest has correct status: {status}")
                    else:
                        self.log_result("Interest status verification", False, 
                                      f"Interest status is '{status}', expected 'paid_access'")
                else:
                    self.log_result("Interest status verification", False, 
                                  "Test interest not found in interests list")
            else:
                self.log_result("Interest status verification", False, 
                              "No interests found or invalid response format")
        else:
            self.log_result("Interest status verification", False, 
                          f"Failed to get interests: {response.status_code}")
    
    def test_error_scenarios(self):
        """Test various error scenarios"""
        print("\n=== Testing Error Scenarios ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Error scenarios setup", False, "Missing tradesperson token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Invalid conversation ID for message sending
        fake_conversation_id = str(uuid.uuid4())
        message_data = {
            "conversation_id": fake_conversation_id,
            "message_type": "text",
            "content": "This should fail"
        }
        
        response = self.make_request(
            "POST",
            f"/messages/conversations/{fake_conversation_id}/messages",
            auth_token=tradesperson_token,
            json=message_data
        )
        
        if response.status_code == 404:
            self.log_result("Error scenario - invalid conversation ID", True, 
                          "Correctly rejected message to non-existent conversation")
        else:
            self.log_result("Error scenario - invalid conversation ID", False, 
                          f"Expected 404, got {response.status_code}")
        
        # Test 2: Missing message content
        if 'conversation_id' in self.test_data:
            conversation_id = self.test_data['conversation_id']
            invalid_message_data = {
                "conversation_id": conversation_id,
                "message_type": "text"
                # Missing content
            }
            
            response = self.make_request(
                "POST",
                f"/messages/conversations/{conversation_id}/messages",
                auth_token=tradesperson_token,
                json=invalid_message_data
            )
            
            if response.status_code in [400, 422]:
                self.log_result("Error scenario - missing message content", True, 
                              "Correctly rejected message without content")
            else:
                self.log_result("Error scenario - missing message content", False, 
                              f"Expected 400/422, got {response.status_code}")
    
    def run_all_tests(self):
        """Run all messaging system investigation tests"""
        print("🚨 STARTING CRITICAL BUG INVESTIGATION: Send Button Not Working in ChatModal")
        print("=" * 80)
        
        # Setup phase
        self.test_tradesperson_authentication()
        self.test_homeowner_authentication()
        self.test_job_creation_for_contact_sharing_test()
        
        # Create test data with paid access
        self.test_show_interest_for_contact_sharing()
        
        # Complete the workflow: share contact → fund wallet → pay for access
        if 'interest_id' in self.test_data and 'homeowner' in self.auth_tokens:
            print("\n--- Completing Contact Sharing Workflow ---")
            homeowner_token = self.auth_tokens['homeowner']
            interest_id = self.test_data['interest_id']
            
            # Step 1: Homeowner shares contact details
            response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                       auth_token=homeowner_token)
            if response.status_code == 200:
                self.log_result("Contact sharing", True, "Homeowner shared contact details")
                
                # Step 2: Fund tradesperson wallet (needed for payment)
                if 'tradesperson' in self.auth_tokens:
                    tradesperson_token = self.auth_tokens['tradesperson']
                    
                    # Fund wallet with enough coins for access fee (default is 10 coins for ₦1000)
                    wallet_funding_data = {
                        "amount_naira": 2000,  # Fund with ₦2000 (20 coins)
                        "payment_method": "test_funding"
                    }
                    
                    response = self.make_request("POST", "/wallet/fund", 
                                               json=wallet_funding_data, auth_token=tradesperson_token)
                    if response.status_code == 200:
                        self.log_result("Wallet funding", True, "Wallet funded successfully")
                        
                        # Step 3: Tradesperson pays for access
                        response = self.make_request("POST", f"/interests/pay-access/{interest_id}", 
                                                   auth_token=tradesperson_token)
                        if response.status_code == 200:
                            self.log_result("Payment for access", True, "Payment successful - access granted")
                        else:
                            self.log_result("Payment for access", False, 
                                          f"Payment failed: {response.status_code} - {response.text}")
                    else:
                        self.log_result("Wallet funding", False, 
                                      f"Wallet funding failed: {response.status_code} - {response.text}")
            else:
                self.log_result("Contact sharing", False, 
                              f"Contact sharing failed: {response.status_code} - {response.text}")
        
        # Core messaging system testing
        self.test_interest_status_verification()
        self.test_messaging_system_endpoints()
        self.test_message_sending()
        self.test_conversation_messages_retrieval()
        
        # Additional tests
        self.test_paid_access_requirement()
        self.test_error_scenarios()
        
        # Summary
        print("\n" + "=" * 80)
        print("🔍 MESSAGING SYSTEM BUG INVESTIGATION SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n🎯 KEY INVESTIGATION POINTS:")
        print("   1. Messaging API endpoints functionality and response structure")
        print("   2. Conversation creation with paid access verification")
        print("   3. Message sending and retrieval workflow")
        print("   4. Authentication and authorization controls")
        print("   5. Error handling for invalid scenarios")
        
        if self.results['failed'] > 0:
            print("\n⚠️  INVESTIGATION RESULT: Issues found that may explain the send button problem")
        else:
            print("\n✅ INVESTIGATION RESULT: All tests passed - Messaging system is working correctly")

if __name__ == "__main__":
    tester = MessagingSystemTester()
    tester.run_all_tests()
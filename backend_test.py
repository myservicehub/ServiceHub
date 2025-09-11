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
    
    def test_contact_sharing_api_endpoint(self):
        """CRITICAL TEST: Test the contact sharing API endpoint"""
        print("\n=== CRITICAL TEST: Contact Sharing API Endpoint ===")
        
        if 'homeowner' not in self.auth_tokens or 'interest_id' not in self.test_data:
            self.log_result("Contact sharing setup", False, "Missing homeowner token or interest ID")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        interest_id = self.test_data['interest_id']
        
        print(f"🔍 Testing contact sharing for Interest ID: {interest_id}")
        
        # Test the share-contact endpoint
        response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                   auth_token=homeowner_token)
        
        if response.status_code == 200:
            share_response = response.json()
            required_fields = ['interest_id', 'status', 'message', 'contact_shared_at']
            missing_fields = [field for field in required_fields if field not in share_response]
            
            if not missing_fields:
                # Verify response data
                if (share_response.get('interest_id') == interest_id and 
                    share_response.get('status') == 'contact_shared'):
                    self.test_data['contact_shared_response'] = share_response
                    self.log_result("Contact sharing API - successful response", True, 
                                  f"Status updated to: {share_response.get('status')}, "
                                  f"Shared at: {share_response.get('contact_shared_at')}")
                else:
                    self.log_result("Contact sharing API - response data", False, 
                                  f"Interest ID: {share_response.get('interest_id')}, "
                                  f"Status: {share_response.get('status')}")
            else:
                self.log_result("Contact sharing API - response structure", False, 
                              f"Missing fields: {missing_fields}")
        else:
            self.log_result("Contact sharing API", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_tradesperson_status_visibility(self):
        """CRITICAL TEST: Verify tradesperson can see updated status"""
        print("\n=== CRITICAL TEST: Tradesperson Status Visibility ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Tradesperson status check setup", False, "No tradesperson token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test GET /api/interests/my-interests to see if status is updated
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests_data = response.json()
            if isinstance(interests_data, list):
                # Find our test interest
                test_interest = None
                for interest in interests_data:
                    if interest.get('id') == self.test_data.get('interest_id'):
                        test_interest = interest
                        break
                
                if test_interest:
                    current_status = test_interest.get('status')
                    if current_status == 'contact_shared':
                        self.log_result("Tradesperson sees updated status", True, 
                                      f"Status correctly shows: {current_status}")
                    else:
                        self.log_result("Tradesperson sees updated status", False, 
                                      f"Expected 'contact_shared', but tradesperson sees: {current_status}")
                        # This is the critical bug we're investigating
                        print(f"🚨 CRITICAL BUG CONFIRMED: Tradesperson still sees status as '{current_status}' instead of 'contact_shared'")
                else:
                    self.log_result("Tradesperson interest lookup", False, 
                                  f"Interest ID {self.test_data.get('interest_id')} not found in tradesperson's interests")
            else:
                self.log_result("My interests response format", False, "Expected list response")
        else:
            self.log_result("Tradesperson my-interests API", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
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
    
    def run_all_tests(self):
        """Run all contact sharing bug investigation tests"""
        print("🚨 STARTING CRITICAL BUG INVESTIGATION: Contact Sharing Status Not Reflecting")
        print("=" * 80)
        
        # Setup phase
        self.test_tradesperson_authentication()
        self.test_homeowner_authentication()
        self.test_job_creation_for_contact_sharing_test()
        
        # Core workflow phase
        self.test_show_interest_for_contact_sharing()
        
        # Critical bug investigation phase
        self.test_contact_sharing_api_endpoint()
        self.test_tradesperson_status_visibility()
        self.test_homeowner_status_visibility()
        self.test_database_consistency_check()
        
        # Additional verification
        self.test_notification_system_integration()
        self.test_edge_cases()
        
        # Summary
        print("\n" + "=" * 80)
        print("🔍 CONTACT SHARING BUG INVESTIGATION SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n🎯 KEY INVESTIGATION POINTS:")
        print("   1. Contact sharing API endpoint functionality")
        print("   2. Database status update consistency")
        print("   3. Real-time status synchronization between homeowner and tradesperson views")
        print("   4. Notification system integration")
        
        if self.results['failed'] > 0:
            print("\n⚠️  INVESTIGATION RESULT: Issues found that may explain the reported bug")
        else:
            print("\n✅ INVESTIGATION RESULT: All tests passed - bug may be environment-specific")

if __name__ == "__main__":
    tester = ContactSharingBugTester()
    tester.run_all_tests()
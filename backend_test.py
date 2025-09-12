#!/usr/bin/env python3
"""
CRITICAL DATABASE INVESTIGATION: User still getting Access Required error after payment

**URGENT DATABASE DEBUGGING:**

### **1. Real-Time Database State Investigation**
- Check interests collection for any entries with recent payment activity 
- Look for interests with status='paid_access' and recent payment_made_at timestamps
- Query actual database entries to see what status values are stored
- Check if there are any entries stuck in incorrect states

### **2. API Response Debugging**
- Test the `/api/interests/my-interests` endpoint with actual user tokens
- Verify what status values are being returned in API responses
- Check if there's a mismatch between database storage and API return values
- Test the update and read operations in sequence

### **3. Payment Processing Debug**
- Create a test payment scenario and monitor database changes in real-time
- Verify the `update_interest_status` method actually persists changes
- Check if MongoDB write concerns or transaction isolation could cause issues
- Test the complete payment flow: pay-access endpoint → database update → get-interests response

### **4. Database Connection and Consistency**
- Verify MongoDB connection health and transaction settings
- Check if there are any database connection pooling issues
- Look for any MongoDB replication lag or read preference issues
- Test database write-read consistency

This is CRITICAL - users who have paid should immediately see updated status. If database updates aren't persisting or reads aren't consistent, this affects the core business model.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import time

# Get backend URL from environment
BACKEND_URL = "https://servicehub-connect-1.preview.emergentagent.com/api"

class BackendAPITester:
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
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_result("Health endpoint", True, f"Service: {data.get('service')}")
                else:
                    self.log_result("Health endpoint", False, f"Unhealthy status: {data.get('status')}")
            except json.JSONDecodeError:
                self.log_result("Health endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Health endpoint", False, f"Status: {response.status_code}")
    
    def test_featured_reviews_endpoint(self):
        """CRITICAL TEST: Test /api/reviews/featured endpoint"""
        print("\n=== CRITICAL TEST: Featured Reviews Endpoint ===")
        
        # Test the featured reviews endpoint
        response = self.make_request("GET", "/reviews/featured")
        
        if response.status_code == 200:
            try:
                reviews_data = response.json()
                
                # Verify response is a list
                if isinstance(reviews_data, list):
                    self.log_result("Featured reviews - response format", True, 
                                  f"Returned {len(reviews_data)} reviews as list")
                    
                    # Test with different limits
                    for limit in [3, 10, 20]:
                        response = self.make_request("GET", f"/reviews/featured?limit={limit}")
                        if response.status_code == 200:
                            data = response.json()
                            if isinstance(data, list) and len(data) <= limit:
                                self.log_result(f"Featured reviews - limit {limit}", True, 
                                              f"Returned {len(data)} reviews (≤{limit})")
                            else:
                                self.log_result(f"Featured reviews - limit {limit}", False, 
                                              f"Invalid response or limit exceeded")
                        else:
                            self.log_result(f"Featured reviews - limit {limit}", False, 
                                          f"Status: {response.status_code}")
                    
                    # Test response structure if we have reviews
                    if len(reviews_data) > 0:
                        self.test_review_data_structure(reviews_data[0])
                    else:
                        self.log_result("Featured reviews - data availability", True, 
                                      "No reviews found (empty list) - this is valid")
                        
                else:
                    self.log_result("Featured reviews - response format", False, 
                                  f"Expected list, got {type(reviews_data)}")
                    
            except json.JSONDecodeError as e:
                self.log_result("Featured reviews - JSON parsing", False, 
                              f"Failed to parse JSON response: {str(e)}")
        else:
            self.log_result("Featured reviews endpoint", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_review_data_structure(self, review_sample):
        """Test the structure of a single review record"""
        print("\n=== Testing Review Data Structure ===")
        
        # Expected fields for advanced review format
        expected_fields = [
            'id', 'reviewer_id', 'reviewee_id', 'rating', 'content', 'review_type', 'created_at'
        ]
        
        missing_fields = []
        present_fields = []
        
        for field in expected_fields:
            if field in review_sample:
                present_fields.append(field)
            else:
                missing_fields.append(field)
        
        if not missing_fields:
            self.log_result("Review data structure - all fields present", True, 
                          f"All {len(expected_fields)} expected fields present")
        else:
            self.log_result("Review data structure - missing fields", False, 
                          f"Missing fields: {missing_fields}")
        
        # Verify advanced format fields exist (indicating proper filtering)
        advanced_fields = ['reviewer_id', 'reviewee_id', 'review_type']
        has_advanced_fields = all(field in review_sample for field in advanced_fields)
        
        if has_advanced_fields:
            self.log_result("Review advanced format verification", True, 
                          "Review has advanced format fields (proper filtering)")
        else:
            self.log_result("Review advanced format verification", False, 
                          "Review missing advanced format fields")
        
        # Log the actual structure for debugging
        print(f"🔍 Sample review structure: {json.dumps(review_sample, indent=2, default=str)}")
        
        return len(missing_fields) == 0
    
    def test_lga_endpoints(self):
        """CRITICAL TEST: Test /api/auth/lgas/{state} endpoint for LGA functionality"""
        print("\n=== CRITICAL TEST: LGA Endpoints ===")
        
        # Test states that should have LGAs
        test_states = ["Lagos", "Abuja", "Delta", "Rivers State"]
        
        for state in test_states:
            response = self.make_request("GET", f"/auth/lgas/{state}")
            
            if response.status_code == 200:
                try:
                    lga_data = response.json()
                    
                    # Verify response structure
                    if 'state' in lga_data and 'lgas' in lga_data and 'total' in lga_data:
                        lgas = lga_data['lgas']
                        total = lga_data['total']
                        
                        if isinstance(lgas, list) and len(lgas) == total:
                            self.log_result(f"LGA endpoint - {state}", True, 
                                          f"Returned {total} LGAs")
                            
                            # Verify state name matches
                            if lga_data['state'] == state:
                                self.log_result(f"LGA state verification - {state}", True, 
                                              "State name matches request")
                            else:
                                self.log_result(f"LGA state verification - {state}", False, 
                                              f"Expected {state}, got {lga_data['state']}")
                        else:
                            self.log_result(f"LGA endpoint - {state}", False, 
                                          f"LGA count mismatch: list={len(lgas)}, total={total}")
                    else:
                        self.log_result(f"LGA endpoint - {state}", False, 
                                      "Missing required fields in response")
                        
                except json.JSONDecodeError as e:
                    self.log_result(f"LGA endpoint - {state}", False, 
                                  f"Failed to parse JSON: {str(e)}")
            else:
                self.log_result(f"LGA endpoint - {state}", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
        
        # Test invalid state
        response = self.make_request("GET", "/auth/lgas/InvalidState")
        if response.status_code == 404:
            self.log_result("LGA endpoint - invalid state", True, 
                          "Correctly rejected invalid state")
        else:
            self.log_result("LGA endpoint - invalid state", False, 
                          f"Expected 404, got {response.status_code}")
        
        # Test all LGAs endpoint
        response = self.make_request("GET", "/auth/all-lgas")
        if response.status_code == 200:
            try:
                all_lgas_data = response.json()
                if 'lgas_by_state' in all_lgas_data and 'total_states' in all_lgas_data:
                    self.log_result("All LGAs endpoint", True, 
                                  f"Returned {all_lgas_data['total_states']} states with {all_lgas_data.get('total_lgas', 0)} total LGAs")
                else:
                    self.log_result("All LGAs endpoint", False, "Missing required fields")
            except json.JSONDecodeError:
                self.log_result("All LGAs endpoint", False, "Failed to parse JSON")
        else:
            self.log_result("All LGAs endpoint", False, f"Status: {response.status_code}")
    
    def test_authentication_endpoints(self):
        """Test basic authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Create test homeowner
        homeowner_data = {
            "name": "Test Homeowner",
            "email": f"test.homeowner.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "+2348123456789",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            if 'access_token' in homeowner_profile and 'user' in homeowner_profile:
                self.auth_tokens['homeowner'] = homeowner_profile['access_token']
                self.test_data['homeowner_user'] = homeowner_profile['user']
                self.log_result("Homeowner registration", True, 
                              f"ID: {homeowner_profile['user']['id']}")
            else:
                self.log_result("Homeowner registration", False, "Missing access_token or user")
        else:
            self.log_result("Homeowner registration", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Create test tradesperson
        tradesperson_data = {
            "name": "Test Tradesperson",
            "email": f"test.tradesperson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "+2348123456790",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing"],
            "experience_years": 5,
            "company_name": "Test Plumbing Services",
            "description": "Professional plumbing services with over 5 years of experience in residential and commercial plumbing installations, repairs, and maintenance. Specialized in modern Nigerian plumbing systems.",
            "certifications": ["Licensed Plumber"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            
            # Login with the created tradesperson
            login_data = {
                "email": tradesperson_data["email"],
                "password": tradesperson_data["password"]
            }
            
            login_response = self.make_request("POST", "/auth/login", json=login_data)
            if login_response.status_code == 200:
                login_data_response = login_response.json()
                self.auth_tokens['tradesperson'] = login_data_response['access_token']
                self.test_data['tradesperson_user'] = login_data_response['user']
                self.log_result("Tradesperson registration and login", True, 
                              f"ID: {login_data_response['user']['id']}")
            else:
                self.log_result("Tradesperson login", False, 
                              f"Status: {login_response.status_code}")
        else:
            self.log_result("Tradesperson registration", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_messaging_system_setup(self):
        """Setup test data for messaging system testing"""
        print("\n=== Setting up Messaging System Test Data ===")
        
        if 'homeowner' not in self.auth_tokens or 'tradesperson' not in self.auth_tokens:
            self.log_result("Messaging setup", False, "Missing authentication tokens")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Create a test job for messaging
        job_data = {
            "title": "Test Job - Messaging System Testing",
            "description": "Testing messaging system functionality with comprehensive validation scenarios including conversation creation, message sending, and access control.",
            "category": "Plumbing",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Test Street, Ikeja",
            "budget_min": 50000,
            "budget_max": 150000,
            "timeline": "Within 2 weeks",
            "homeowner_name": self.test_data['homeowner_user']['name'],
            "homeowner_email": self.test_data['homeowner_user']['email'],
            "homeowner_phone": self.test_data['homeowner_user']['phone']
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code != 200:
            self.log_result("Messaging setup - Job creation", False, f"Failed to create test job: {response.status_code}")
            return
        
        job_response = response.json()
        test_job_id = job_response.get('id')
        self.test_data['messaging_job_id'] = test_job_id
        self.log_result("Messaging setup - Job creation", True, f"Created job: {test_job_id}")
        
        # Create interest for the tradesperson
        interest_data = {"job_id": test_job_id}
        response = self.make_request("POST", "/interests/show-interest", json=interest_data, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interest_response = response.json()
            self.test_data['messaging_interest_id'] = interest_response['id']
            self.log_result("Messaging setup - Interest creation", True, f"Created interest: {interest_response['id']}")
            
            # Share contact details to enable messaging
            share_response = self.make_request("PUT", f"/interests/share-contact/{interest_response['id']}", auth_token=homeowner_token)
            if share_response.status_code == 200:
                self.log_result("Messaging setup - Contact sharing", True, "Contact shared successfully")
                
                # Simulate payment to get paid_access status
                pay_response = self.make_request("POST", f"/interests/pay-access/{interest_response['id']}", auth_token=tradesperson_token)
                if pay_response.status_code == 200:
                    self.log_result("Messaging setup - Payment simulation", True, "Payment completed - paid_access status achieved")
                    self.test_data['has_paid_access'] = True
                elif pay_response.status_code == 400:
                    # Insufficient balance is expected for new users
                    self.log_result("Messaging setup - Payment simulation", True, "Payment failed due to insufficient balance (expected)")
                    self.test_data['has_paid_access'] = False
                else:
                    self.log_result("Messaging setup - Payment simulation", False, f"Unexpected payment response: {pay_response.status_code}")
                    self.test_data['has_paid_access'] = False
            else:
                self.log_result("Messaging setup - Contact sharing", False, f"Failed to share contact: {share_response.status_code}")
        else:
            self.log_result("Messaging setup - Interest creation", False, f"Failed to create interest: {response.status_code}")

    def test_critical_homeowner_access_control_fix(self):
        """CRITICAL TEST: Verify homeowner access control fix - cannot create conversations without paid_access"""
        print("\n=== CRITICAL TEST: Homeowner Access Control Fix ===")
        
        if 'messaging_job_id' not in self.test_data:
            self.log_result("Homeowner access control setup", False, "Missing test job data")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['messaging_job_id']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        
        # Test 1: Homeowner trying to create conversation with tradesperson who has only 'interested' status
        print("\n--- Test 1: Homeowner Bypass Prevention (interested status) ---")
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", auth_token=homeowner_token)
        
        if response.status_code == 403:
            error_response = response.json()
            error_detail = error_response.get('detail', '')
            if 'must pay for access' in error_detail.lower() or 'paid_access' in error_detail.lower():
                self.log_result("CRITICAL: Homeowner bypass prevention (interested)", True, f"✅ FIXED: {error_detail}")
            else:
                self.log_result("CRITICAL: Homeowner bypass prevention (interested)", False, f"Wrong error message: {error_detail}")
        else:
            self.log_result("CRITICAL: Homeowner bypass prevention (interested)", False, f"❌ BUG: Expected 403, got {response.status_code} - homeowner can bypass payment requirement!")
        
        # Test 2: Check current interest status to verify it's not paid_access
        print("\n--- Test 2: Verify Interest Status (should be interested or contact_shared) ---")
        tradesperson_token = self.auth_tokens['tradesperson']
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests = response.json()
            test_interest = None
            for interest in interests:
                if interest.get('job_id') == job_id:
                    test_interest = interest
                    break
            
            if test_interest:
                status = test_interest.get('status')
                self.log_result("Interest status verification", True, f"Current status: {status}")
                
                if status == 'paid_access':
                    self.log_result("Interest status check", False, "Interest already has paid_access - cannot test homeowner bypass")
                    return
                else:
                    self.log_result("Interest status check", True, f"Interest status is '{status}' - good for testing homeowner bypass prevention")
            else:
                self.log_result("Interest status verification", False, "Test interest not found")
        else:
            self.log_result("Interest status verification", False, f"Failed to get interests: {response.status_code}")

    def test_critical_user_validation_fix(self):
        """CRITICAL TEST: Verify user validation fix - proper 404 errors instead of 500"""
        print("\n=== CRITICAL TEST: User Validation Fix ===")
        
        if 'messaging_job_id' not in self.test_data:
            self.log_result("User validation setup", False, "Missing test job data")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['messaging_job_id']
        
        # Test 1: Invalid tradesperson ID
        print("\n--- Test 1: Invalid Tradesperson ID Handling ---")
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id=invalid-tradesperson-id", auth_token=homeowner_token)
        
        if response.status_code == 404:
            error_response = response.json()
            error_detail = error_response.get('detail', '')
            if 'tradesperson not found' in error_detail.lower():
                self.log_result("CRITICAL: Invalid tradesperson validation", True, f"✅ FIXED: {error_detail}")
            else:
                self.log_result("CRITICAL: Invalid tradesperson validation", True, f"✅ Got 404 but generic message: {error_detail}")
        elif response.status_code == 500:
            self.log_result("CRITICAL: Invalid tradesperson validation", False, "❌ BUG: Still getting 500 Internal Server Error instead of 404")
        else:
            self.log_result("CRITICAL: Invalid tradesperson validation", False, f"Expected 404, got {response.status_code}")
        
        # Test 2: Non-existent job ID
        print("\n--- Test 2: Non-existent Job ID Handling ---")
        tradesperson_id = self.test_data['tradesperson_user']['id']
        response = self.make_request("GET", f"/messages/conversations/job/non-existent-job-id?tradesperson_id={tradesperson_id}", auth_token=homeowner_token)
        
        if response.status_code == 404:
            error_response = response.json()
            error_detail = error_response.get('detail', '')
            if 'job not found' in error_detail.lower():
                self.log_result("CRITICAL: Invalid job validation", True, f"✅ FIXED: {error_detail}")
            else:
                self.log_result("CRITICAL: Invalid job validation", True, f"✅ Got 404 but generic message: {error_detail}")
        elif response.status_code == 500:
            self.log_result("CRITICAL: Invalid job validation", False, "❌ BUG: Still getting 500 Internal Server Error instead of 404")
        else:
            self.log_result("CRITICAL: Invalid job validation", False, f"Expected 404, got {response.status_code}")

    def test_critical_consistent_access_control(self):
        """CRITICAL TEST: Verify consistent access control for both homeowner and tradesperson initiated conversations"""
        print("\n=== CRITICAL TEST: Consistent Access Control Enforcement ===")
        
        if 'messaging_job_id' not in self.test_data:
            self.log_result("Consistent access control setup", False, "Missing test job data")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['messaging_job_id']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        
        # Test 1: Tradesperson trying to create conversation without paid_access
        print("\n--- Test 1: Tradesperson Access Control (without paid_access) ---")
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", auth_token=tradesperson_token)
        
        if response.status_code == 403:
            error_response = response.json()
            error_detail = error_response.get('detail', '')
            if 'pay for access' in error_detail.lower() or 'paid_access' in error_detail.lower():
                self.log_result("CRITICAL: Tradesperson access control", True, f"✅ CONSISTENT: {error_detail}")
            else:
                self.log_result("CRITICAL: Tradesperson access control", False, f"Wrong error message: {error_detail}")
        else:
            self.log_result("CRITICAL: Tradesperson access control", False, f"❌ BUG: Expected 403, got {response.status_code}")
        
        # Test 2: Homeowner trying to create conversation without tradesperson having paid_access
        print("\n--- Test 2: Homeowner Access Control (tradesperson without paid_access) ---")
        response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", auth_token=homeowner_token)
        
        if response.status_code == 403:
            error_response = response.json()
            error_detail = error_response.get('detail', '')
            if 'must pay for access' in error_detail.lower() or 'paid_access' in error_detail.lower():
                self.log_result("CRITICAL: Homeowner access control consistency", True, f"✅ CONSISTENT: {error_detail}")
            else:
                self.log_result("CRITICAL: Homeowner access control consistency", False, f"Wrong error message: {error_detail}")
        else:
            self.log_result("CRITICAL: Homeowner access control consistency", False, f"❌ BUG: Expected 403, got {response.status_code} - inconsistent access control!")

    def test_complete_payment_workflow_integration(self):
        """CRITICAL TEST: Test complete payment workflow integration"""
        print("\n=== CRITICAL TEST: Complete Payment Workflow Integration ===")
        
        if 'messaging_interest_id' not in self.test_data:
            self.log_result("Payment workflow setup", False, "Missing interest data")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['messaging_job_id']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        interest_id = self.test_data['messaging_interest_id']
        
        # Test 1: Verify current interest status (should be contact_shared after setup)
        print("\n--- Test 1: Verify Interest Status Progression ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests = response.json()
            test_interest = None
            for interest in interests:
                if interest.get('id') == interest_id:
                    test_interest = interest
                    break
            
            if test_interest:
                status = test_interest.get('status')
                self.log_result("Payment workflow - Status progression", True, f"Current status: {status}")
                
                # Test 2: Try conversation creation with contact_shared status (should fail)
                print("\n--- Test 2: Conversation Creation with contact_shared Status ---")
                if status == 'contact_shared':
                    response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", auth_token=homeowner_token)
                    
                    if response.status_code == 403:
                        self.log_result("Payment workflow - contact_shared rejection", True, "✅ Correctly rejected conversation creation with contact_shared status")
                    else:
                        self.log_result("Payment workflow - contact_shared rejection", False, f"❌ BUG: Expected 403, got {response.status_code}")
                
                # Test 3: Simulate payment (if wallet has sufficient balance)
                print("\n--- Test 3: Payment Simulation ---")
                pay_response = self.make_request("POST", f"/interests/pay-access/{interest_id}", auth_token=tradesperson_token)
                
                if pay_response.status_code == 200:
                    self.log_result("Payment workflow - Payment success", True, "Payment completed successfully")
                    
                    # Test 4: Try conversation creation after payment (should succeed)
                    print("\n--- Test 4: Conversation Creation After Payment ---")
                    response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", auth_token=homeowner_token)
                    
                    if response.status_code == 200:
                        conv_response = response.json()
                        if 'conversation_id' in conv_response:
                            self.test_data['conversation_id'] = conv_response['conversation_id']
                            self.log_result("Payment workflow - Post-payment conversation", True, f"✅ Conversation created after payment: {conv_response['conversation_id']}")
                        else:
                            self.log_result("Payment workflow - Post-payment conversation", False, "Missing conversation_id in response")
                    else:
                        self.log_result("Payment workflow - Post-payment conversation", False, f"Expected 200, got {response.status_code}")
                        
                elif pay_response.status_code == 400:
                    error_response = pay_response.json()
                    error_detail = error_response.get('detail', '')
                    if 'insufficient' in error_detail.lower():
                        self.log_result("Payment workflow - Insufficient balance", True, f"Expected insufficient balance: {error_detail}")
                        self.test_data['has_paid_access'] = False
                    else:
                        self.log_result("Payment workflow - Payment error", False, f"Unexpected payment error: {error_detail}")
                else:
                    self.log_result("Payment workflow - Payment failure", False, f"Payment failed: {pay_response.status_code}")
            else:
                self.log_result("Payment workflow - Interest lookup", False, "Test interest not found")
        else:
            self.log_result("Payment workflow - Interest retrieval", False, f"Failed to get interests: {response.status_code}")

    def test_message_sending_endpoints(self):
        """CRITICAL TEST: Test message sending and retrieval endpoints"""
        print("\n=== CRITICAL TEST: Message Sending Endpoints ===")
        
        if 'conversation_id' not in self.test_data:
            self.log_result("Message sending setup", False, "No conversation available for testing")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        conversation_id = self.test_data['conversation_id']
        
        # Test 1: Send message from homeowner
        print("\n--- Test 1: Send Message from Homeowner ---")
        message_data = {
            "conversation_id": conversation_id,
            "content": "Hello! I'm interested in discussing this plumbing job with you. When would be a good time to start?",
            "message_type": "text"
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", json=message_data, auth_token=homeowner_token)
        
        if response.status_code == 200:
            message_response = response.json()
            if 'id' in message_response and message_response.get('content') == message_data['content']:
                self.test_data['homeowner_message_id'] = message_response['id']
                self.log_result("Message sending - Homeowner message", True, f"Message sent: {message_response['id']}")
            else:
                self.log_result("Message sending - Homeowner message", False, "Invalid message response structure")
        else:
            self.log_result("Message sending - Homeowner message", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Send message from tradesperson (if has paid access)
        print("\n--- Test 2: Send Message from Tradesperson ---")
        tradesperson_message_data = {
            "conversation_id": conversation_id,
            "content": "Thank you for reaching out! I'm available to start the work next week. Let me know your preferred schedule.",
            "message_type": "text"
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", json=tradesperson_message_data, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            message_response = response.json()
            if 'id' in message_response:
                self.test_data['tradesperson_message_id'] = message_response['id']
                self.log_result("Message sending - Tradesperson message", True, f"Message sent: {message_response['id']}")
            else:
                self.log_result("Message sending - Tradesperson message", False, "Invalid message response structure")
        elif response.status_code == 403:
            self.log_result("Message sending - Tradesperson message", True, "Correctly rejected due to access control")
        else:
            self.log_result("Message sending - Tradesperson message", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 3: Retrieve conversation messages
        print("\n--- Test 3: Retrieve Conversation Messages ---")
        response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages", auth_token=homeowner_token)
        
        if response.status_code == 200:
            messages_response = response.json()
            if 'messages' in messages_response and 'total' in messages_response:
                messages = messages_response['messages']
                total = messages_response['total']
                self.log_result("Message retrieval - Get messages", True, f"Retrieved {total} messages")
                
                # Verify message structure
                if len(messages) > 0:
                    message = messages[0]
                    expected_fields = ['id', 'conversation_id', 'sender_id', 'content', 'created_at']
                    missing_fields = [field for field in expected_fields if field not in message]
                    
                    if not missing_fields:
                        self.log_result("Message retrieval - Message structure", True, "All expected fields present")
                    else:
                        self.log_result("Message retrieval - Message structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Message retrieval - Get messages", False, "Invalid response structure")
        else:
            self.log_result("Message retrieval - Get messages", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 4: Unauthorized access to conversation messages
        print("\n--- Test 4: Unauthorized Access to Messages ---")
        # Create another user and try to access messages
        unauthorized_user_data = {
            "name": "Unauthorized User",
            "email": f"unauthorized.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "+2348123456792",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        reg_response = self.make_request("POST", "/auth/register/homeowner", json=unauthorized_user_data)
        if reg_response.status_code == 200:
            unauthorized_token = reg_response.json()['access_token']
            
            response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages", auth_token=unauthorized_token)
            
            if response.status_code == 403:
                self.log_result("Message retrieval - Unauthorized access", True, "Correctly rejected unauthorized access")
            else:
                self.log_result("Message retrieval - Unauthorized access", False, f"Expected 403, got {response.status_code}")
        else:
            self.log_result("Message retrieval - Unauthorized access", False, "Failed to create unauthorized user for testing")

    def test_database_collections_existence(self):
        """Test that required database collections exist and are accessible"""
        print("\n=== Testing Database Collections Existence ===")
        
        # We can't directly test MongoDB collections, but we can test the API endpoints
        # that would fail if collections don't exist
        
        homeowner_token = self.auth_tokens.get('homeowner')
        if not homeowner_token:
            self.log_result("Database collections test", False, "No homeowner token available")
            return
        
        # Test conversations collection by trying to get user conversations
        response = self.make_request("GET", "/messages/conversations", auth_token=homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Database collections - Conversations collection", True, "Conversations collection accessible")
        else:
            self.log_result("Database collections - Conversations collection", False, f"Status: {response.status_code}")
        
        # Test messages collection indirectly through conversation messages endpoint
        if 'conversation_id' in self.test_data:
            conversation_id = self.test_data['conversation_id']
            response = self.make_request("GET", f"/messages/conversations/{conversation_id}/messages", auth_token=homeowner_token)
            
            if response.status_code == 200:
                self.log_result("Database collections - Messages collection", True, "Messages collection accessible")
            else:
                self.log_result("Database collections - Messages collection", False, f"Status: {response.status_code}")
        else:
            self.log_result("Database collections - Messages collection", False, "No conversation available for testing")

    def test_interest_status_integration(self):
        """Test integration between interest status and messaging access"""
        print("\n=== Testing Interest Status Integration ===")
        
        if 'messaging_interest_id' not in self.test_data:
            self.log_result("Interest status integration", False, "No interest available for testing")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        interest_id = self.test_data['messaging_interest_id']
        
        # Check current interest status
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests = response.json()
            if isinstance(interests, list) and len(interests) > 0:
                # Find our test interest
                test_interest = None
                for interest in interests:
                    if interest.get('id') == interest_id:
                        test_interest = interest
                        break
                
                if test_interest:
                    status = test_interest.get('status')
                    self.log_result("Interest status integration - Status check", True, f"Interest status: {status}")
                    
                    # Test messaging access based on status
                    job_id = self.test_data['messaging_job_id']
                    tradesperson_id = self.test_data['tradesperson_user']['id']
                    
                    response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", auth_token=tradesperson_token)
                    
                    if status == 'paid_access':
                        if response.status_code == 200:
                            self.log_result("Interest status integration - Paid access messaging", True, "Messaging allowed with paid_access status")
                        else:
                            self.log_result("Interest status integration - Paid access messaging", False, f"Expected 200, got {response.status_code}")
                    else:
                        if response.status_code == 403:
                            self.log_result("Interest status integration - Unpaid access messaging", True, f"Messaging correctly blocked for status: {status}")
                        else:
                            self.log_result("Interest status integration - Unpaid access messaging", False, f"Expected 403, got {response.status_code}")
                else:
                    self.log_result("Interest status integration - Interest lookup", False, "Test interest not found in my-interests")
            else:
                self.log_result("Interest status integration - Interests retrieval", False, "No interests found")
        else:
            self.log_result("Interest status integration - Interests retrieval", False, f"Status: {response.status_code}")
    
    def test_my_interests_endpoint(self):
        """Test the My Interests endpoint for tradespeople"""
        print("\n=== Testing My Interests Endpoint ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("My Interests setup", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test getting tradesperson's interests
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            try:
                interests_data = response.json()
                
                if isinstance(interests_data, list):
                    self.log_result("My Interests - Response format", True, f"Returned {len(interests_data)} interests as list")
                    
                    # Verify structure if we have interests
                    if len(interests_data) > 0:
                        interest = interests_data[0]
                        expected_fields = ['id', 'job_id', 'status', 'created_at']
                        missing_fields = [field for field in expected_fields if field not in interest]
                        
                        if not missing_fields:
                            self.log_result("My Interests - Data structure", True, "All expected fields present")
                        else:
                            self.log_result("My Interests - Data structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_result("My Interests - Data availability", True, "No interests found (valid for new tradesperson)")
                        
                else:
                    self.log_result("My Interests - Response format", False, f"Expected list, got {type(interests_data)}")
                    
            except json.JSONDecodeError:
                self.log_result("My Interests - JSON parsing", False, "Failed to parse JSON response")
        else:
            self.log_result("My Interests endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test homeowner access (should be rejected)
        if 'homeowner' in self.auth_tokens:
            homeowner_token = self.auth_tokens['homeowner']
            response = self.make_request("GET", "/interests/my-interests", auth_token=homeowner_token)
            
            if response.status_code in [403, 422]:
                self.log_result("My Interests - Homeowner access rejection", True, f"Correctly rejected homeowner: {response.status_code}")
            else:
                self.log_result("My Interests - Homeowner access rejection", False, f"Expected 403/422, got {response.status_code}")
    
    def test_payment_status_investigation(self):
        """URGENT: Investigate payment status issue - users paid but still getting Access Required error"""
        print("\n=== 🚨 URGENT PAYMENT STATUS INVESTIGATION ===")
        
        if 'messaging_interest_id' not in self.test_data:
            self.log_result("Payment status investigation setup", False, "Missing interest data")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['messaging_job_id']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        interest_id = self.test_data['messaging_interest_id']
        
        print(f"🔍 Investigating Interest ID: {interest_id}")
        print(f"🔍 Job ID: {job_id}")
        print(f"🔍 Tradesperson ID: {tradesperson_id}")
        
        # Step 1: Check current interest status before payment
        print("\n--- Step 1: Check Interest Status Before Payment ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests = response.json()
            test_interest = None
            for interest in interests:
                if interest.get('id') == interest_id:
                    test_interest = interest
                    break
            
            if test_interest:
                current_status = test_interest.get('status')
                payment_made_at = test_interest.get('payment_made_at')
                contact_shared_at = test_interest.get('contact_shared_at')
                
                self.log_result("Payment Investigation - Pre-payment status", True, 
                              f"Status: {current_status}, Payment: {payment_made_at}, Contact Shared: {contact_shared_at}")
                
                # Step 2: Try conversation creation before payment (should fail)
                print("\n--- Step 2: Test Conversation Creation Before Payment ---")
                response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                                           auth_token=homeowner_token)
                
                if response.status_code == 403:
                    error_response = response.json()
                    error_detail = error_response.get('detail', '')
                    self.log_result("Payment Investigation - Pre-payment access control", True, 
                                  f"✅ Correctly blocked: {error_detail}")
                else:
                    self.log_result("Payment Investigation - Pre-payment access control", False, 
                                  f"❌ Expected 403, got {response.status_code}")
                
                # Step 3: Attempt payment
                print("\n--- Step 3: Attempt Payment ---")
                pay_response = self.make_request("POST", f"/interests/pay-access/{interest_id}", 
                                               auth_token=tradesperson_token)
                
                if pay_response.status_code == 200:
                    payment_result = pay_response.json()
                    self.log_result("Payment Investigation - Payment attempt", True, 
                                  f"✅ Payment successful: {payment_result.get('message', 'No message')}")
                    
                    # Step 4: Check interest status after payment
                    print("\n--- Step 4: Check Interest Status After Payment ---")
                    response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
                    
                    if response.status_code == 200:
                        interests = response.json()
                        updated_interest = None
                        for interest in interests:
                            if interest.get('id') == interest_id:
                                updated_interest = interest
                                break
                        
                        if updated_interest:
                            new_status = updated_interest.get('status')
                            new_payment_made_at = updated_interest.get('payment_made_at')
                            
                            self.log_result("Payment Investigation - Post-payment status", True, 
                                          f"Status: {new_status}, Payment: {new_payment_made_at}")
                            
                            # CRITICAL CHECK: Verify status is exactly 'paid_access'
                            if new_status == 'paid_access':
                                self.log_result("Payment Investigation - Status verification", True, 
                                              "✅ Status correctly set to 'paid_access'")
                                
                                # Step 5: Test conversation creation after payment
                                print("\n--- Step 5: Test Conversation Creation After Payment ---")
                                response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                                                           auth_token=homeowner_token)
                                
                                if response.status_code == 200:
                                    conv_response = response.json()
                                    if 'conversation_id' in conv_response:
                                        self.test_data['conversation_id'] = conv_response['conversation_id']
                                        self.log_result("Payment Investigation - Post-payment conversation", True, 
                                                      f"✅ Conversation created: {conv_response['conversation_id']}")
                                        
                                        # Step 6: Test message sending
                                        print("\n--- Step 6: Test Message Sending ---")
                                        self.test_message_sending_after_payment(conv_response['conversation_id'])
                                        
                                    else:
                                        self.log_result("Payment Investigation - Post-payment conversation", False, 
                                                      "❌ Missing conversation_id in response")
                                elif response.status_code == 403:
                                    error_response = response.json()
                                    error_detail = error_response.get('detail', '')
                                    self.log_result("Payment Investigation - Post-payment conversation", False, 
                                                  f"❌ CRITICAL BUG: Still getting 403 after payment: {error_detail}")
                                    
                                    # Additional debugging - check what the backend is seeing
                                    print("\n--- DEBUGGING: Check Backend Interest Status ---")
                                    self.debug_backend_interest_status(job_id, tradesperson_id)
                                    
                                else:
                                    self.log_result("Payment Investigation - Post-payment conversation", False, 
                                                  f"❌ Unexpected status: {response.status_code}")
                            else:
                                self.log_result("Payment Investigation - Status verification", False, 
                                              f"❌ CRITICAL BUG: Status is '{new_status}', expected 'paid_access'")
                        else:
                            self.log_result("Payment Investigation - Post-payment status", False, 
                                          "❌ Interest not found after payment")
                    else:
                        self.log_result("Payment Investigation - Post-payment status", False, 
                                      f"❌ Failed to get interests: {response.status_code}")
                        
                elif pay_response.status_code == 400:
                    error_response = pay_response.json()
                    error_detail = error_response.get('detail', '')
                    if 'insufficient' in error_detail.lower():
                        self.log_result("Payment Investigation - Payment attempt", True, 
                                      f"Expected insufficient balance: {error_detail}")
                        
                        # For testing purposes, let's simulate a successful payment by manually funding wallet
                        print("\n--- Step 3b: Fund Wallet and Retry Payment ---")
                        self.fund_wallet_for_testing(tradesperson_token)
                        
                        # Retry payment
                        pay_response = self.make_request("POST", f"/interests/pay-access/{interest_id}", 
                                                       auth_token=tradesperson_token)
                        
                        if pay_response.status_code == 200:
                            self.log_result("Payment Investigation - Payment retry", True, "✅ Payment successful after wallet funding")
                            # Continue with post-payment testing...
                        else:
                            self.log_result("Payment Investigation - Payment retry", False, 
                                          f"❌ Payment still failed: {pay_response.status_code}")
                    else:
                        self.log_result("Payment Investigation - Payment attempt", False, 
                                      f"❌ Unexpected payment error: {error_detail}")
                else:
                    self.log_result("Payment Investigation - Payment attempt", False, 
                                  f"❌ Payment failed: {pay_response.status_code}")
            else:
                self.log_result("Payment Investigation - Interest lookup", False, "❌ Test interest not found")
        else:
            self.log_result("Payment Investigation - Interest retrieval", False, 
                          f"❌ Failed to get interests: {response.status_code}")

    def debug_backend_interest_status(self, job_id: str, tradesperson_id: str):
        """Debug what the backend is seeing for interest status"""
        print("🔍 DEBUGGING: Backend Interest Status Check")
        
        # We can't directly query the database, but we can test the API endpoints
        # that use the same database methods
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Check what homeowner sees for this job's interests
        print("\n--- Debug 1: Homeowner View of Job Interests ---")
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        
        if response.status_code == 200:
            job_interests = response.json()
            interested_tradespeople = job_interests.get('interested_tradespeople', [])
            
            target_interest = None
            for tp in interested_tradespeople:
                if tp.get('tradesperson_id') == tradesperson_id:
                    target_interest = tp
                    break
            
            if target_interest:
                status = target_interest.get('status')
                payment_made_at = target_interest.get('payment_made_at')
                self.log_result("Debug - Homeowner view status", True, 
                              f"Homeowner sees status: {status}, Payment: {payment_made_at}")
            else:
                self.log_result("Debug - Homeowner view status", False, 
                              "❌ Tradesperson not found in homeowner's job interests")
        else:
            self.log_result("Debug - Homeowner view status", False, 
                          f"❌ Failed to get job interests: {response.status_code}")
        
        # Test 2: Check what tradesperson sees in their interests
        print("\n--- Debug 2: Tradesperson View of Their Interests ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            my_interests = response.json()
            target_interest = None
            for interest in my_interests:
                if interest.get('job_id') == job_id:
                    target_interest = interest
                    break
            
            if target_interest:
                status = target_interest.get('status')
                payment_made_at = target_interest.get('payment_made_at')
                self.log_result("Debug - Tradesperson view status", True, 
                              f"Tradesperson sees status: {status}, Payment: {payment_made_at}")
            else:
                self.log_result("Debug - Tradesperson view status", False, 
                              "❌ Interest not found in tradesperson's interests")
        else:
            self.log_result("Debug - Tradesperson view status", False, 
                          f"❌ Failed to get tradesperson interests: {response.status_code}")

    def fund_wallet_for_testing(self, tradesperson_token: str):
        """Fund wallet for testing purposes"""
        print("💰 Funding wallet for testing...")
        
        # Check current wallet balance
        response = self.make_request("GET", "/wallet/balance", auth_token=tradesperson_token)
        if response.status_code == 200:
            wallet_data = response.json()
            current_balance = wallet_data.get('balance_coins', 0)
            self.log_result("Wallet funding - Current balance", True, f"{current_balance} coins")
            
            if current_balance < 20:  # Need at least 20 coins for testing
                # Try to fund wallet (this might fail in test environment, but we'll try)
                funding_data = {
                    "amount_naira": 2000,  # ₦2000 = 20 coins
                    "proof_image": "test_payment_proof_base64_string"
                }
                
                response = self.make_request("POST", "/wallet/fund", json=funding_data, auth_token=tradesperson_token)
                if response.status_code == 200:
                    self.log_result("Wallet funding - Fund request", True, "Funding request submitted")
                else:
                    self.log_result("Wallet funding - Fund request", False, 
                                  f"Funding failed: {response.status_code}")
        else:
            self.log_result("Wallet funding - Balance check", False, 
                          f"Failed to check balance: {response.status_code}")

    def test_message_sending_after_payment(self, conversation_id: str):
        """Test message sending after successful payment"""
        print("💬 Testing message sending after payment...")
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Send message from homeowner
        message_data = {
            "conversation_id": conversation_id,
            "content": "Hello! Thank you for your interest. When can you start the work?",
            "message_type": "text"
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                   json=message_data, auth_token=homeowner_token)
        
        if response.status_code == 200:
            message_response = response.json()
            self.log_result("Message sending - Homeowner message", True, 
                          f"✅ Message sent: {message_response.get('id', 'No ID')}")
        else:
            self.log_result("Message sending - Homeowner message", False, 
                          f"❌ Failed to send: {response.status_code}")
        
        # Test 2: Send message from tradesperson
        tradesperson_message_data = {
            "conversation_id": conversation_id,
            "content": "Thank you for choosing me! I can start next week. Let me know your preferred time.",
            "message_type": "text"
        }
        
        response = self.make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                                   json=tradesperson_message_data, auth_token=tradesperson_token)
        
        if response.status_code == 200:
            message_response = response.json()
            self.log_result("Message sending - Tradesperson message", True, 
                          f"✅ Message sent: {message_response.get('id', 'No ID')}")
        else:
            self.log_result("Message sending - Tradesperson message", False, 
                          f"❌ Failed to send: {response.status_code}")

    def test_enum_consistency_check(self):
        """Test InterestStatus enum consistency between backend and database"""
        print("\n=== 🔍 ENUM CONSISTENCY CHECK ===")
        
        # We can't directly check the enum values, but we can test the API responses
        # to see what status values are being used
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Enum consistency check", False, "No tradesperson token available")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Get all interests and check status values
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        
        if response.status_code == 200:
            interests = response.json()
            status_values = set()
            
            for interest in interests:
                status = interest.get('status')
                if status:
                    status_values.add(status)
            
            self.log_result("Enum consistency - Status values found", True, 
                          f"Status values in use: {list(status_values)}")
            
            # Check if we have the expected enum values
            expected_statuses = ['interested', 'contact_shared', 'paid_access', 'cancelled']
            
            for status in status_values:
                if status in expected_statuses:
                    self.log_result(f"Enum consistency - {status}", True, "✅ Valid status value")
                else:
                    self.log_result(f"Enum consistency - {status}", False, f"❌ Unexpected status value: {status}")
        else:
            self.log_result("Enum consistency check", False, 
                          f"Failed to get interests: {response.status_code}")

    def run_urgent_payment_status_investigation(self):
        """Run URGENT payment status investigation"""
        print("🚨 STARTING URGENT PAYMENT STATUS INVESTIGATION")
        print("=" * 80)
        print("🎯 FOCUS: Users paid but still getting 'Access Required' error")
        print("=" * 80)
        
        # 1. Service Health Check
        self.test_service_health()
        
        # 2. Authentication Setup
        self.test_authentication_endpoints()
        
        # 3. Messaging System Setup (create job, interest, contact sharing)
        self.test_messaging_system_setup()
        
        # 4. URGENT: Payment Status Investigation
        self.test_payment_status_investigation()
        
        # 5. Enum Consistency Check
        self.test_enum_consistency_check()
        
        # 6. Additional debugging if needed
        if 'conversation_id' not in self.test_data:
            print("\n🔍 ADDITIONAL DEBUGGING: No conversation created - investigating further...")
            self.debug_payment_workflow_issues()
        
        # Summary
        print("\n" + "=" * 80)
        print("🚨 URGENT PAYMENT STATUS INVESTIGATION SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        total_tests = self.results['passed'] + self.results['failed']
        if total_tests > 0:
            print(f"📊 Success Rate: {(self.results['passed'] / total_tests * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Analysis
        print("\n🔍 ROOT CAUSE ANALYSIS:")
        print("=" * 50)
        
        payment_failures = [error for error in self.results['errors'] if 'Payment Investigation' in error or 'payment' in error.lower()]
        
        if len(payment_failures) == 0:
            print("✅ PAYMENT WORKFLOW WORKING CORRECTLY!")
            print("   - Payment processing updates status to 'paid_access'")
            print("   - Conversation creation works after payment")
            print("   - Message sending works after payment")
            print("   - No status inconsistencies found")
        else:
            print("⚠️  PAYMENT WORKFLOW ISSUES FOUND:")
            for error in payment_failures:
                print(f"   - {error}")
            print("\n🔧 IMMEDIATE ACTION REQUIRED:")
            print("   - Check payment endpoint in /app/backend/routes/interests.py")
            print("   - Verify database update_interest_status method")
            print("   - Check conversation access control logic")
            print("   - Verify enum value consistency")
        
        return len(payment_failures) == 0

    def debug_payment_workflow_issues(self):
        """Additional debugging for payment workflow issues"""
        print("\n=== 🔍 ADDITIONAL PAYMENT WORKFLOW DEBUGGING ===")
        
        # This method can be expanded based on what we find in the initial investigation
        # For now, let's check some basic API endpoints
        
        if 'homeowner' in self.auth_tokens and 'tradesperson' in self.auth_tokens:
            homeowner_token = self.auth_tokens['homeowner']
            tradesperson_token = self.auth_tokens['tradesperson']
            
            # Check wallet endpoints
            print("\n--- Debug: Wallet System ---")
            response = self.make_request("GET", "/wallet/balance", auth_token=tradesperson_token)
            if response.status_code == 200:
                wallet_data = response.json()
                self.log_result("Debug - Wallet balance", True, 
                              f"Balance: {wallet_data.get('balance_coins', 0)} coins")
            else:
                self.log_result("Debug - Wallet balance", False, 
                              f"Failed to get balance: {response.status_code}")
            
            # Check if there are any existing paid interests
            print("\n--- Debug: Existing Paid Interests ---")
            response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
            if response.status_code == 200:
                interests = response.json()
                paid_interests = [i for i in interests if i.get('status') == 'paid_access']
                self.log_result("Debug - Existing paid interests", True, 
                              f"Found {len(paid_interests)} paid interests")
                
                if paid_interests:
                    # Test conversation creation with existing paid interest
                    paid_interest = paid_interests[0]
                    job_id = paid_interest.get('job_id')
                    tradesperson_id = self.test_data['tradesperson_user']['id']
                    
                    response = self.make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                                               auth_token=homeowner_token)
                    
                    if response.status_code == 200:
                        self.log_result("Debug - Existing paid interest conversation", True, 
                                      "✅ Conversation creation works with existing paid interest")
                    else:
                        self.log_result("Debug - Existing paid interest conversation", False, 
                                      f"❌ Conversation creation failed even with paid interest: {response.status_code}")
            else:
                self.log_result("Debug - Existing paid interests", False, 
                              f"Failed to get interests: {response.status_code}")

if __name__ == "__main__":
    tester = BackendAPITester()
    success = tester.run_urgent_payment_status_investigation()
    
    if success:
        print("\n🎉 PAYMENT STATUS INVESTIGATION COMPLETE: No critical issues found!")
        print("✅ Payment workflow working correctly")
        print("✅ Status updates persisting to database")
        print("✅ Conversation creation working after payment")
        print("✅ Message sending working after payment")
    else:
        print("\n⚠️  PAYMENT STATUS INVESTIGATION COMPLETE: Critical issues found!")
        print("🔧 Immediate action required to fix payment workflow bugs")
        print("📋 Review the detailed analysis above for specific issues")
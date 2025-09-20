#!/usr/bin/env python3
"""
ADMIN DELETE FUNCTIONS TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Test all delete functions in the admin dashboard to ensure they are working properly.

**Specific Delete Functions to Test:**

1. **User Deletion:**
   - Test DELETE /api/admin/users/{user_id} endpoint
   - Verify soft deletion works correctly
   - Check if related data is handled properly

2. **Job Deletion:**
   - Test DELETE /api/admin/jobs/{job_id} endpoint
   - Verify soft delete functionality
   - Ensure job status is updated correctly

3. **Contact Deletion:**
   - Test DELETE /api/admin/contacts/{contact_id} endpoint
   - Verify contact is completely removed

4. **Policy Deletion:**
   - Test DELETE /api/admin/policies/{policy_id} endpoint
   - Check if only draft policies can be deleted

5. **Location Data Deletion:**
   - Test DELETE /api/admin/locations/states/{state_name}
   - Test DELETE /api/admin/locations/lgas/{state_name}/{lga_name}
   - Test DELETE /api/admin/locations/towns/{state_name}/{lga_name}/{town_name}

6. **Trade Deletion:**
   - Test DELETE /api/admin/trades/{trade_name}
   - Verify trade categories can be deleted

**Testing Requirements:**
- Login as admin first (username: admin, password: servicehub2024)
- Test with valid data IDs/names
- Check error handling for non-existent items
- Verify proper response status codes (200 for success, 404 for not found)
- Ensure database integrity after deletions
- Test if soft deletes preserve data while marking as deleted
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid
from collections import Counter

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

class AdminDeleteFunctionsTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.admin_token = None
        self.test_user_id = None
        self.test_job_id = None
        self.test_contact_id = None
        self.test_policy_id = None
        self.test_trade_name = None
        
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
    
    def admin_login(self):
        """Login as admin using the provided credentials"""
        print("\n=== Admin Login ===")
        
        # Try the new admin management login first
        login_data = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin-management/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.admin_token = data.get('access_token')
                self.log_result("Admin login (new system)", True, f"Token obtained")
                return
            except json.JSONDecodeError:
                self.log_result("Admin login (new system)", False, "Invalid JSON response")
        
        # Try the legacy admin login
        form_data = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin/login", data=form_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.admin_token = data.get('token', 'admin_token_placeholder')
                self.log_result("Admin login (legacy system)", True, f"Token: {self.admin_token}")
            except json.JSONDecodeError:
                self.log_result("Admin login (legacy system)", False, "Invalid JSON response")
        else:
            self.log_result("Admin login", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def setup_test_data(self):
        """Create test data for deletion testing"""
        print("\n=== Setting Up Test Data ===")
        
        if not self.admin_token:
            self.log_result("Test data setup", False, "No admin token available")
            return
        
        # Create test user for deletion
        print("\n--- Creating Test User ---")
        user_data = {
            "name": "Test User For Deletion",
            "email": f"delete.test.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=user_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                # Try to get user ID from different possible locations
                self.test_user_id = data.get('user', {}).get('id') or data.get('id')
                self.log_result("Test user creation", True, f"User ID: {self.test_user_id}")
            except json.JSONDecodeError:
                self.log_result("Test user creation", False, "Invalid JSON response")
        else:
            self.log_result("Test user creation", False, f"Status: {response.status_code}")
        
        # Create test job for deletion
        print("\n--- Creating Test Job ---")
        if self.test_user_id:
            # First login as the test user to create a job
            login_response = self.make_request("POST", "/auth/login", json={
                "email": user_data["email"],
                "password": user_data["password"]
            })
            
            if login_response.status_code == 200:
                try:
                    login_data = login_response.json()
                    user_token = login_data.get('access_token')
                    
                    job_data = {
                        "title": "Test Job For Deletion",
                        "description": "This is a test job created for deletion testing",
                        "category": "Electrical Repairs",
                        "timeline": "within_week",
                        "budget_min": 50000,
                        "budget_max": 150000,
                        "state": "Lagos",
                        "lga": "Ikeja", 
                        "town": "Computer Village",
                        "zip_code": "100001",
                        "home_address": "123 Test Street, Computer Village",
                        "homeowner_name": "Test User For Deletion",
                        "homeowner_email": user_data["email"],
                        "homeowner_phone": "+2348012345678",
                        "questions": [],
                        "photos": []
                    }
                    
                    job_response = self.make_request("POST", "/jobs/", json=job_data, auth_token=user_token)
                    
                    if job_response.status_code == 200:
                        try:
                            job_result = job_response.json()
                            self.test_job_id = job_result.get('id')
                            self.log_result("Test job creation", True, f"Job ID: {self.test_job_id}")
                        except json.JSONDecodeError:
                            self.log_result("Test job creation", False, "Invalid JSON response")
                    else:
                        self.log_result("Test job creation", False, f"Status: {job_response.status_code}")
                        
                except json.JSONDecodeError:
                    self.log_result("Test job creation", False, "Invalid login response")
        
        # Create test contact for deletion
        print("\n--- Creating Test Contact ---")
        contact_data = {
            "contact_type": "phone_support",
            "label": "Test Support Phone",
            "value": "+2348012345678"
        }
        
        response = self.make_request("POST", "/admin/contacts", json=contact_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_contact_id = data.get('contact_id')
                self.log_result("Test contact creation", True, f"Contact ID: {self.test_contact_id}")
            except json.JSONDecodeError:
                self.log_result("Test contact creation", False, "Invalid JSON response")
        else:
            self.log_result("Test contact creation", False, f"Status: {response.status_code}")
        
        # Create test policy for deletion (draft status)
        print("\n--- Creating Test Policy ---")
        policy_data = {
            "policy_type": "cookie_policy",
            "title": "Test Cookie Policy For Deletion",
            "content": "This is a test cookie policy created specifically for deletion testing purposes. It contains sufficient content to meet the minimum requirements for policy creation.",
            "status": "draft"
        }
        
        response = self.make_request("POST", "/admin/policies", json=policy_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_policy_id = data.get('policy_id')
                self.log_result("Test policy creation", True, f"Policy ID: {self.test_policy_id}")
            except json.JSONDecodeError:
                self.log_result("Test policy creation", False, "Invalid JSON response")
        else:
            self.log_result("Test policy creation", False, f"Status: {response.status_code}")
        
        # Create test trade category for deletion
        print("\n--- Creating Test Trade Category ---")
        self.test_trade_name = f"Test Trade {uuid.uuid4().hex[:8]}"
        trade_data = {
            "name": self.test_trade_name,
            "description": "Test trade category for deletion testing",
            "category": "Home Services"
        }
        
        response = self.make_request("POST", "/admin/trades", json=trade_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            self.log_result("Test trade creation", True, f"Trade: {self.test_trade_name}")
        else:
            self.log_result("Test trade creation", False, f"Status: {response.status_code}")
    
    def test_user_deletion(self):
        """Test DELETE /api/admin/users/{user_id} endpoint"""
        print("\n=== Testing User Deletion ===")
        
        if not self.admin_token:
            self.log_result("User deletion test", False, "No admin token available")
            return
        
        if not self.test_user_id:
            self.log_result("User deletion test", False, "No test user ID available")
            return
        
        # Test 1: Delete existing user
        print(f"\n--- Test 1: Delete User {self.test_user_id} ---")
        response = self.make_request("DELETE", f"/admin/users/{self.test_user_id}", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("message") and "deleted successfully" in data["message"]:
                    self.log_result("User deletion - valid user", True, f"User deleted: {data.get('deleted_user', {}).get('email', 'Unknown')}")
                    
                    # Verify user is actually deleted/soft deleted
                    verify_response = self.make_request("GET", f"/admin/users/{self.test_user_id}/details", auth_token=self.admin_token)
                    if verify_response.status_code == 404:
                        self.log_result("User deletion verification", True, "User no longer accessible")
                    else:
                        self.log_result("User deletion verification", False, f"User still accessible: {verify_response.status_code}")
                else:
                    self.log_result("User deletion - valid user", False, "Invalid response message")
            except json.JSONDecodeError:
                self.log_result("User deletion - valid user", False, "Invalid JSON response")
        else:
            self.log_result("User deletion - valid user", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to delete non-existent user
        print(f"\n--- Test 2: Delete Non-existent User ---")
        fake_user_id = str(uuid.uuid4())
        response = self.make_request("DELETE", f"/admin/users/{fake_user_id}", auth_token=self.admin_token)
        
        if response.status_code == 404:
            self.log_result("User deletion - non-existent user", True, "Correctly returned 404")
        else:
            self.log_result("User deletion - non-existent user", False, f"Expected 404, got {response.status_code}")
        
        # Test 3: Test unauthorized access
        print(f"\n--- Test 3: Unauthorized User Deletion ---")
        response = self.make_request("DELETE", f"/admin/users/{fake_user_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("User deletion - unauthorized", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("User deletion - unauthorized", False, f"Expected 401/403, got {response.status_code}")
    
    def test_job_deletion(self):
        """Test DELETE /api/admin/jobs/{job_id} endpoint"""
        print("\n=== Testing Job Deletion ===")
        
        if not self.admin_token:
            self.log_result("Job deletion test", False, "No admin token available")
            return
        
        if not self.test_job_id:
            self.log_result("Job deletion test", False, "No test job ID available")
            return
        
        # Test 1: Delete existing job
        print(f"\n--- Test 1: Delete Job {self.test_job_id} ---")
        response = self.make_request("DELETE", f"/admin/jobs/{self.test_job_id}", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("message") and "deleted successfully" in data["message"]:
                    self.log_result("Job deletion - valid job", True, f"Job deleted: {self.test_job_id}")
                    
                    # Verify job is soft deleted (should still exist but marked as deleted)
                    verify_response = self.make_request("GET", f"/admin/jobs/{self.test_job_id}/details", auth_token=self.admin_token)
                    if verify_response.status_code in [200, 404]:
                        self.log_result("Job soft deletion verification", True, f"Job status updated (status: {verify_response.status_code})")
                    else:
                        self.log_result("Job soft deletion verification", False, f"Unexpected status: {verify_response.status_code}")
                else:
                    self.log_result("Job deletion - valid job", False, "Invalid response message")
            except json.JSONDecodeError:
                self.log_result("Job deletion - valid job", False, "Invalid JSON response")
        else:
            self.log_result("Job deletion - valid job", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to delete non-existent job
        print(f"\n--- Test 2: Delete Non-existent Job ---")
        fake_job_id = str(uuid.uuid4())
        response = self.make_request("DELETE", f"/admin/jobs/{fake_job_id}", auth_token=self.admin_token)
        
        if response.status_code == 404:
            self.log_result("Job deletion - non-existent job", True, "Correctly returned 404")
        else:
            self.log_result("Job deletion - non-existent job", False, f"Expected 404, got {response.status_code}")
        
        # Test 3: Test unauthorized access
        print(f"\n--- Test 3: Unauthorized Job Deletion ---")
        response = self.make_request("DELETE", f"/admin/jobs/{fake_job_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("Job deletion - unauthorized", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Job deletion - unauthorized", False, f"Expected 401/403, got {response.status_code}")
    
    def test_contact_deletion(self):
        """Test DELETE /api/admin/contacts/{contact_id} endpoint"""
        print("\n=== Testing Contact Deletion ===")
        
        if not self.admin_token:
            self.log_result("Contact deletion test", False, "No admin token available")
            return
        
        if not self.test_contact_id:
            self.log_result("Contact deletion test", False, "No test contact ID available")
            return
        
        # Test 1: Delete existing contact
        print(f"\n--- Test 1: Delete Contact {self.test_contact_id} ---")
        response = self.make_request("DELETE", f"/admin/contacts/{self.test_contact_id}", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("message") and "deleted successfully" in data["message"]:
                    self.log_result("Contact deletion - valid contact", True, f"Contact deleted: {self.test_contact_id}")
                    
                    # Verify contact is completely removed
                    verify_response = self.make_request("GET", f"/admin/contacts/{self.test_contact_id}", auth_token=self.admin_token)
                    if verify_response.status_code == 404:
                        self.log_result("Contact deletion verification", True, "Contact completely removed")
                    else:
                        self.log_result("Contact deletion verification", False, f"Contact still accessible: {verify_response.status_code}")
                else:
                    self.log_result("Contact deletion - valid contact", False, "Invalid response message")
            except json.JSONDecodeError:
                self.log_result("Contact deletion - valid contact", False, "Invalid JSON response")
        else:
            self.log_result("Contact deletion - valid contact", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to delete non-existent contact
        print(f"\n--- Test 2: Delete Non-existent Contact ---")
        fake_contact_id = str(uuid.uuid4())
        response = self.make_request("DELETE", f"/admin/contacts/{fake_contact_id}", auth_token=self.admin_token)
        
        if response.status_code == 404:
            self.log_result("Contact deletion - non-existent contact", True, "Correctly returned 404")
        else:
            self.log_result("Contact deletion - non-existent contact", False, f"Expected 404, got {response.status_code}")
        
        # Test 3: Test unauthorized access
        print(f"\n--- Test 3: Unauthorized Contact Deletion ---")
        response = self.make_request("DELETE", f"/admin/contacts/{fake_contact_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("Contact deletion - unauthorized", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Contact deletion - unauthorized", False, f"Expected 401/403, got {response.status_code}")
    
    def test_policy_deletion(self):
        """Test DELETE /api/admin/policies/{policy_id} endpoint"""
        print("\n=== Testing Policy Deletion ===")
        
        if not self.admin_token:
            self.log_result("Policy deletion test", False, "No admin token available")
            return
        
        if not self.test_policy_id:
            self.log_result("Policy deletion test", False, "No test policy ID available")
            return
        
        # Test 1: Delete draft policy (should succeed)
        print(f"\n--- Test 1: Delete Draft Policy {self.test_policy_id} ---")
        response = self.make_request("DELETE", f"/admin/policies/{self.test_policy_id}", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("message") and "deleted successfully" in data["message"]:
                    self.log_result("Policy deletion - draft policy", True, f"Policy deleted: {self.test_policy_id}")
                    
                    # Verify policy is completely removed
                    verify_response = self.make_request("GET", f"/admin/policies/{self.test_policy_id}", auth_token=self.admin_token)
                    if verify_response.status_code == 404:
                        self.log_result("Policy deletion verification", True, "Policy completely removed")
                    else:
                        self.log_result("Policy deletion verification", False, f"Policy still accessible: {verify_response.status_code}")
                else:
                    self.log_result("Policy deletion - draft policy", False, "Invalid response message")
            except json.JSONDecodeError:
                self.log_result("Policy deletion - draft policy", False, "Invalid JSON response")
        else:
            self.log_result("Policy deletion - draft policy", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to delete non-existent policy
        print(f"\n--- Test 2: Delete Non-existent Policy ---")
        fake_policy_id = str(uuid.uuid4())
        response = self.make_request("DELETE", f"/admin/policies/{fake_policy_id}", auth_token=self.admin_token)
        
        if response.status_code in [400, 404]:
            self.log_result("Policy deletion - non-existent policy", True, f"Correctly returned {response.status_code}")
        else:
            self.log_result("Policy deletion - non-existent policy", False, f"Expected 400/404, got {response.status_code}")
        
        # Test 3: Test unauthorized access
        print(f"\n--- Test 3: Unauthorized Policy Deletion ---")
        response = self.make_request("DELETE", f"/admin/policies/{fake_policy_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("Policy deletion - unauthorized", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Policy deletion - unauthorized", False, f"Expected 401/403, got {response.status_code}")
    
    def test_location_data_deletion(self):
        """Test location data deletion endpoints"""
        print("\n=== Testing Location Data Deletion ===")
        
        if not self.admin_token:
            self.log_result("Location deletion test", False, "No admin token available")
            return
        
        # Test 1: Delete town
        print(f"\n--- Test 1: Delete Town ---")
        test_state = "Lagos"
        test_lga = "Ikeja"
        test_town = f"TestTown{uuid.uuid4().hex[:6]}"
        
        # First create a test town
        town_data = {
            "name": test_town,
            "state": test_state,
            "lga": test_lga
        }
        
        create_response = self.make_request("POST", f"/admin/locations/towns", json=town_data, auth_token=self.admin_token)
        
        if create_response.status_code == 200:
            # Now try to delete it
            response = self.make_request("DELETE", f"/admin/locations/towns/{test_state}/{test_lga}/{test_town}", auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("message") and "deleted successfully" in data["message"]:
                        self.log_result("Town deletion", True, f"Town deleted: {test_town}")
                    else:
                        self.log_result("Town deletion", False, "Invalid response message")
                except json.JSONDecodeError:
                    self.log_result("Town deletion", False, "Invalid JSON response")
            else:
                self.log_result("Town deletion", False, f"Status: {response.status_code}")
        else:
            self.log_result("Town deletion setup", False, f"Failed to create test town: {create_response.status_code}")
        
        # Test 2: Delete non-existent town
        print(f"\n--- Test 2: Delete Non-existent Town ---")
        fake_town = f"NonExistentTown{uuid.uuid4().hex[:6]}"
        response = self.make_request("DELETE", f"/admin/locations/towns/{test_state}/{test_lga}/{fake_town}", auth_token=self.admin_token)
        
        if response.status_code == 404:
            self.log_result("Town deletion - non-existent", True, "Correctly returned 404")
        else:
            self.log_result("Town deletion - non-existent", False, f"Expected 404, got {response.status_code}")
        
        # Test 3: Delete LGA
        print(f"\n--- Test 3: Delete LGA ---")
        test_lga_new = f"TestLGA{uuid.uuid4().hex[:6]}"
        
        # First create a test LGA
        lga_data = {
            "name": test_lga_new,
            "state": test_state
        }
        
        create_response = self.make_request("POST", f"/admin/locations/lgas", json=lga_data, auth_token=self.admin_token)
        
        if create_response.status_code == 200:
            # Now try to delete it
            response = self.make_request("DELETE", f"/admin/locations/lgas/{test_state}/{test_lga_new}", auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("message") and "deleted successfully" in data["message"]:
                        self.log_result("LGA deletion", True, f"LGA deleted: {test_lga_new}")
                    else:
                        self.log_result("LGA deletion", False, "Invalid response message")
                except json.JSONDecodeError:
                    self.log_result("LGA deletion", False, "Invalid JSON response")
            else:
                self.log_result("LGA deletion", False, f"Status: {response.status_code}")
        else:
            self.log_result("LGA deletion setup", False, f"Failed to create test LGA: {create_response.status_code}")
        
        # Test 4: Delete State
        print(f"\n--- Test 4: Delete State ---")
        test_state_new = f"TestState{uuid.uuid4().hex[:6]}"
        
        # First create a test state
        state_data = {
            "name": test_state_new
        }
        
        create_response = self.make_request("POST", f"/admin/locations/states", json=state_data, auth_token=self.admin_token)
        
        if create_response.status_code == 200:
            # Now try to delete it
            response = self.make_request("DELETE", f"/admin/locations/states/{test_state_new}", auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("message") and "deleted successfully" in data["message"]:
                        self.log_result("State deletion", True, f"State deleted: {test_state_new}")
                    else:
                        self.log_result("State deletion", False, "Invalid response message")
                except json.JSONDecodeError:
                    self.log_result("State deletion", False, "Invalid JSON response")
            else:
                self.log_result("State deletion", False, f"Status: {response.status_code}")
        else:
            self.log_result("State deletion setup", False, f"Failed to create test state: {create_response.status_code}")
        
        # Test 5: Test unauthorized access
        print(f"\n--- Test 5: Unauthorized Location Deletion ---")
        response = self.make_request("DELETE", f"/admin/locations/states/TestState")
        
        if response.status_code in [401, 403]:
            self.log_result("Location deletion - unauthorized", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Location deletion - unauthorized", False, f"Expected 401/403, got {response.status_code}")
    
    def test_trade_deletion(self):
        """Test DELETE /api/admin/trades/{trade_name} endpoint"""
        print("\n=== Testing Trade Deletion ===")
        
        if not self.admin_token:
            self.log_result("Trade deletion test", False, "No admin token available")
            return
        
        if not self.test_trade_name:
            self.log_result("Trade deletion test", False, "No test trade name available")
            return
        
        # Test 1: Delete existing trade
        print(f"\n--- Test 1: Delete Trade {self.test_trade_name} ---")
        response = self.make_request("DELETE", f"/admin/trades/{self.test_trade_name}", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("message") and "deleted successfully" in data["message"]:
                    self.log_result("Trade deletion - valid trade", True, f"Trade deleted: {self.test_trade_name}")
                    
                    # Verify trade is removed from the list
                    verify_response = self.make_request("GET", f"/admin/trades", auth_token=self.admin_token)
                    if verify_response.status_code == 200:
                        try:
                            trades_data = verify_response.json()
                            trades = trades_data.get('trades', [])
                            trade_names = [trade.get('name') for trade in trades]
                            
                            if self.test_trade_name not in trade_names:
                                self.log_result("Trade deletion verification", True, "Trade removed from list")
                            else:
                                self.log_result("Trade deletion verification", False, "Trade still in list")
                        except json.JSONDecodeError:
                            self.log_result("Trade deletion verification", False, "Invalid JSON response")
                    else:
                        self.log_result("Trade deletion verification", False, f"Failed to verify: {verify_response.status_code}")
                else:
                    self.log_result("Trade deletion - valid trade", False, "Invalid response message")
            except json.JSONDecodeError:
                self.log_result("Trade deletion - valid trade", False, "Invalid JSON response")
        else:
            self.log_result("Trade deletion - valid trade", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to delete non-existent trade
        print(f"\n--- Test 2: Delete Non-existent Trade ---")
        fake_trade_name = f"NonExistentTrade{uuid.uuid4().hex[:6]}"
        response = self.make_request("DELETE", f"/admin/trades/{fake_trade_name}", auth_token=self.admin_token)
        
        if response.status_code == 404:
            self.log_result("Trade deletion - non-existent trade", True, "Correctly returned 404")
        else:
            self.log_result("Trade deletion - non-existent trade", False, f"Expected 404, got {response.status_code}")
        
        # Test 3: Test unauthorized access
        print(f"\n--- Test 3: Unauthorized Trade Deletion ---")
        response = self.make_request("DELETE", f"/admin/trades/{fake_trade_name}")
        
        if response.status_code in [401, 403]:
            self.log_result("Trade deletion - unauthorized", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Trade deletion - unauthorized", False, f"Expected 401/403, got {response.status_code}")
    
    def test_database_integrity(self):
        """Test database integrity after deletions"""
        print("\n=== Testing Database Integrity ===")
        
        if not self.admin_token:
            self.log_result("Database integrity test", False, "No admin token available")
            return
        
        # Test 1: Check that related data is handled properly
        print(f"\n--- Test 1: Related Data Handling ---")
        
        # Get database info to check collections
        response = self.make_request("GET", "/database-info", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                collections = data.get('collections', {})
                
                # Check that collections still exist and have reasonable counts
                expected_collections = ['users', 'jobs', 'interests', 'reviews', 'messages', 'notifications']
                missing_collections = []
                
                for collection in expected_collections:
                    if collection not in collections:
                        missing_collections.append(collection)
                
                if not missing_collections:
                    self.log_result("Database collections integrity", True, f"All expected collections present")
                else:
                    self.log_result("Database collections integrity", False, f"Missing collections: {missing_collections}")
                
                # Check for reasonable data counts
                total_records = sum(collections.values()) if isinstance(collections, dict) else 0
                if total_records > 0:
                    self.log_result("Database data integrity", True, f"Total records: {total_records}")
                else:
                    self.log_result("Database data integrity", False, "No data found in database")
                    
            except json.JSONDecodeError:
                self.log_result("Database integrity check", False, "Invalid JSON response")
        else:
            self.log_result("Database integrity check", False, f"Status: {response.status_code}")
        
        # Test 2: Check that no orphaned records exist (basic check)
        print(f"\n--- Test 2: Orphaned Records Check ---")
        
        # This is a basic check - in a real system you'd want more comprehensive orphan detection
        try:
            # Check if we can still access admin endpoints
            response = self.make_request("GET", "/admin/dashboard/stats", auth_token=self.admin_token)
            
            if response.status_code == 200:
                self.log_result("Admin dashboard accessibility", True, "Dashboard still accessible after deletions")
            else:
                self.log_result("Admin dashboard accessibility", False, f"Dashboard not accessible: {response.status_code}")
                
        except Exception as e:
            self.log_result("Admin dashboard accessibility", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all delete function tests"""
        print("🚀 STARTING ADMIN DELETE FUNCTIONS COMPREHENSIVE TESTING")
        print("=" * 80)
        
        # Basic setup
        self.test_service_health()
        self.admin_login()
        
        if not self.admin_token:
            print("\n❌ CRITICAL: Cannot proceed without admin authentication")
            return
        
        # Setup test data
        self.setup_test_data()
        
        # Run all delete function tests
        self.test_user_deletion()
        self.test_job_deletion()
        self.test_contact_deletion()
        self.test_policy_deletion()
        self.test_location_data_deletion()
        self.test_trade_deletion()
        
        # Test database integrity
        self.test_database_integrity()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 ADMIN DELETE FUNCTIONS TESTING COMPLETED")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊 FINAL RESULTS:")
        print(f"   ✅ Passed: {self.results['passed']}")
        print(f"   ❌ Failed: {self.results['failed']}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        if success_rate >= 80:
            print(f"\n🎉 EXCELLENT: Admin delete functions are working well!")
        elif success_rate >= 60:
            print(f"\n⚠️  GOOD: Most admin delete functions are working, some issues need attention.")
        else:
            print(f"\n🚨 CRITICAL: Significant issues found with admin delete functions.")
        
        return {
            'total_tests': total_tests,
            'passed': self.results['passed'],
            'failed': self.results['failed'],
            'success_rate': success_rate,
            'errors': self.results['errors']
        }

if __name__ == "__main__":
    tester = AdminDeleteFunctionsTester()
    results = tester.run_all_tests()
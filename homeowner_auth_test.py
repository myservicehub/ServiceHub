#!/usr/bin/env python3
"""
HOMEOWNER REGISTRATION AND AUTHENTICATION FLOW TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Focus specifically on testing the homeowner registration and authentication flow:

1. **Homeowner Registration Test**:
   - Test POST /api/auth/register/homeowner endpoint with valid data
   - Verify the response includes both user object with name field and access_token
   - Test with unique email: homeownertest$(date +%s)@example.com
   - Use data: {"name": "Test Homeowner", "email": "unique_email", "phone": "08012345678", "password": "TestPassword123!", "location": "Lagos", "postcode": "100001"}

2. **Login Test After Registration**:
   - Use the same credentials to test POST /api/auth/login
   - Verify login response includes user object with name field
   - Check that user.name is not null or undefined

3. **Current User Endpoint Test**:
   - Test GET /api/auth/me with the received token
   - Verify it returns user data with name field populated

4. **Data Integrity Check**:
   - Verify that the user.name field is consistently returned in all responses
   - Check if there are any database issues affecting user data retrieval

Focus on the specific issue: homeowner accounts showing "undefined" in welcome messages, which suggests user.name is not being properly stored or retrieved.
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

class HomeownerAuthTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.test_user_data = {}
        self.access_token = None
        
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
    
    def test_homeowner_registration(self):
        """Test POST /api/auth/register/homeowner endpoint with valid data"""
        print("\n=== Testing Homeowner Registration ===")
        
        # Generate unique email with timestamp
        timestamp = int(time.time())
        unique_email = f"homeownertest{timestamp}@example.com"
        
        # Test data as specified in review request
        self.test_user_data = {
            "name": "Test Homeowner",
            "email": unique_email,
            "phone": "08012345678",
            "password": "TestPassword123!",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        print(f"Testing with unique email: {unique_email}")
        
        response = self.make_request("POST", "/auth/register/homeowner", json=self.test_user_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check response structure
                required_fields = ['user', 'access_token', 'token_type']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Registration response structure", True, "All required fields present")
                    
                    # Store access token for later tests
                    self.access_token = data.get('access_token')
                    
                    # Verify user object structure
                    user_obj = data.get('user', {})
                    user_required_fields = ['id', 'name', 'email', 'phone', 'role']
                    user_missing_fields = [field for field in user_required_fields if field not in user_obj]
                    
                    if not user_missing_fields:
                        self.log_result("User object structure", True, "All required user fields present")
                        
                        # CRITICAL TEST: Verify user.name field is populated
                        user_name = user_obj.get('name')
                        if user_name and user_name == self.test_user_data['name']:
                            self.log_result("User name field verification", True, f"Name correctly stored: '{user_name}'")
                        elif user_name is None:
                            self.log_result("User name field verification", False, "Name field is null")
                        elif user_name == "":
                            self.log_result("User name field verification", False, "Name field is empty string")
                        else:
                            self.log_result("User name field verification", False, f"Name mismatch: expected '{self.test_user_data['name']}', got '{user_name}'")
                        
                        # Verify other critical fields
                        if user_obj.get('email') == self.test_user_data['email']:
                            self.log_result("User email verification", True, f"Email correctly stored: {user_obj.get('email')}")
                        else:
                            self.log_result("User email verification", False, f"Email mismatch")
                        
                        if user_obj.get('role') == 'homeowner':
                            self.log_result("User role verification", True, "Role correctly set to homeowner")
                        else:
                            self.log_result("User role verification", False, f"Role incorrect: {user_obj.get('role')}")
                            
                        # Verify phone number formatting
                        expected_phone = "+2348012345678"  # Nigerian format
                        if user_obj.get('phone') == expected_phone:
                            self.log_result("Phone number formatting", True, f"Phone correctly formatted: {user_obj.get('phone')}")
                        else:
                            self.log_result("Phone number formatting", False, f"Phone format issue: expected '{expected_phone}', got '{user_obj.get('phone')}'")
                            
                    else:
                        self.log_result("User object structure", False, f"Missing user fields: {user_missing_fields}")
                    
                    # Verify access token structure
                    if self.access_token and len(self.access_token.split('.')) == 3:
                        self.log_result("Access token structure", True, "JWT token has correct 3-part structure")
                    else:
                        self.log_result("Access token structure", False, "Invalid JWT token structure")
                        
                else:
                    self.log_result("Registration response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Homeowner registration", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner registration", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_login_after_registration(self):
        """Test POST /api/auth/login with the same credentials"""
        print("\n=== Testing Login After Registration ===")
        
        if not self.test_user_data:
            self.log_result("Login test setup", False, "No test user data available")
            return
        
        login_data = {
            "email": self.test_user_data['email'],
            "password": self.test_user_data['password']
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check response structure
                required_fields = ['user', 'access_token', 'token_type', 'expires_in']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Login response structure", True, "All required fields present")
                    
                    # Verify user object in login response
                    user_obj = data.get('user', {})
                    
                    # CRITICAL TEST: Verify user.name field is populated in login response
                    user_name = user_obj.get('name')
                    if user_name and user_name == self.test_user_data['name']:
                        self.log_result("Login user name field verification", True, f"Name correctly returned: '{user_name}'")
                    elif user_name is None:
                        self.log_result("Login user name field verification", False, "Name field is null in login response")
                    elif user_name == "":
                        self.log_result("Login user name field verification", False, "Name field is empty string in login response")
                    else:
                        self.log_result("Login user name field verification", False, f"Name mismatch in login: expected '{self.test_user_data['name']}', got '{user_name}'")
                    
                    # Update access token for subsequent tests
                    self.access_token = data.get('access_token')
                    
                    # Verify token expiration
                    expires_in = data.get('expires_in')
                    if expires_in and expires_in > 0:
                        self.log_result("Login token expiration", True, f"Token expires in {expires_in} seconds")
                    else:
                        self.log_result("Login token expiration", False, "Invalid token expiration")
                        
                else:
                    self.log_result("Login response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Login after registration", False, "Invalid JSON response")
        else:
            self.log_result("Login after registration", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_current_user_endpoint(self):
        """Test GET /api/auth/me with the received token"""
        print("\n=== Testing Current User Endpoint ===")
        
        if not self.access_token:
            self.log_result("Current user test setup", False, "No access token available")
            return
        
        response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # CRITICAL TEST: Verify user.name field is populated in /me response
                user_name = data.get('name')
                if user_name and user_name == self.test_user_data['name']:
                    self.log_result("Current user name field verification", True, f"Name correctly returned: '{user_name}'")
                elif user_name is None:
                    self.log_result("Current user name field verification", False, "Name field is null in /me response")
                elif user_name == "":
                    self.log_result("Current user name field verification", False, "Name field is empty string in /me response")
                else:
                    self.log_result("Current user name field verification", False, f"Name mismatch in /me: expected '{self.test_user_data['name']}', got '{user_name}'")
                
                # Verify other critical fields
                if data.get('email') == self.test_user_data['email']:
                    self.log_result("Current user email verification", True, f"Email correctly returned: {data.get('email')}")
                else:
                    self.log_result("Current user email verification", False, "Email mismatch in /me response")
                
                if data.get('role') == 'homeowner':
                    self.log_result("Current user role verification", True, "Role correctly returned as homeowner")
                else:
                    self.log_result("Current user role verification", False, f"Role incorrect in /me: {data.get('role')}")
                
                # Verify user ID consistency
                if data.get('id'):
                    self.log_result("Current user ID verification", True, f"User ID present: {data.get('id')}")
                else:
                    self.log_result("Current user ID verification", False, "User ID missing in /me response")
                    
            except json.JSONDecodeError:
                self.log_result("Current user endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Current user endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_data_integrity_checks(self):
        """Perform comprehensive data integrity checks"""
        print("\n=== Testing Data Integrity ===")
        
        if not self.access_token:
            self.log_result("Data integrity test setup", False, "No access token available")
            return
        
        # Test 1: Verify name field consistency across all endpoints
        print("\n--- Test 1: Name Field Consistency Check ---")
        
        # Get current user data
        me_response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
        
        if me_response.status_code == 200:
            try:
                me_data = me_response.json()
                me_name = me_data.get('name')
                
                # Test login again to compare
                login_data = {
                    "email": self.test_user_data['email'],
                    "password": self.test_user_data['password']
                }
                login_response = self.make_request("POST", "/auth/login", json=login_data)
                
                if login_response.status_code == 200:
                    login_data_resp = login_response.json()
                    login_name = login_data_resp.get('user', {}).get('name')
                    
                    if me_name == login_name == self.test_user_data['name']:
                        self.log_result("Name consistency across endpoints", True, f"Name '{me_name}' consistent across all endpoints")
                    else:
                        self.log_result("Name consistency across endpoints", False, f"Name inconsistency: /me='{me_name}', login='{login_name}', original='{self.test_user_data['name']}'")
                else:
                    self.log_result("Name consistency check", False, "Failed to re-login for consistency check")
                    
            except json.JSONDecodeError:
                self.log_result("Data integrity check", False, "Invalid JSON response during integrity check")
        else:
            self.log_result("Data integrity check", False, "Failed to get current user data for integrity check")
        
        # Test 2: Check for null/undefined values in critical fields
        print("\n--- Test 2: Null/Undefined Values Check ---")
        
        me_response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
        if me_response.status_code == 200:
            try:
                data = me_response.json()
                critical_fields = ['id', 'name', 'email', 'role']
                
                null_fields = []
                empty_fields = []
                
                for field in critical_fields:
                    value = data.get(field)
                    if value is None:
                        null_fields.append(field)
                    elif value == "":
                        empty_fields.append(field)
                
                if not null_fields and not empty_fields:
                    self.log_result("Critical fields null/empty check", True, "No null or empty critical fields found")
                else:
                    error_msg = ""
                    if null_fields:
                        error_msg += f"Null fields: {null_fields}. "
                    if empty_fields:
                        error_msg += f"Empty fields: {empty_fields}."
                    self.log_result("Critical fields null/empty check", False, error_msg)
                    
            except json.JSONDecodeError:
                self.log_result("Null/undefined check", False, "Invalid JSON response")
    
    def test_edge_cases(self):
        """Test edge cases and error scenarios"""
        print("\n=== Testing Edge Cases ===")
        
        # Test 1: Duplicate email registration
        print("\n--- Test 1: Duplicate Email Registration ---")
        
        duplicate_data = self.test_user_data.copy()
        response = self.make_request("POST", "/auth/register/homeowner", json=duplicate_data)
        
        if response.status_code == 400:
            try:
                data = response.json()
                if "already registered" in data.get('detail', '').lower():
                    self.log_result("Duplicate email prevention", True, "Correctly rejected duplicate email")
                else:
                    self.log_result("Duplicate email prevention", False, f"Unexpected error message: {data.get('detail')}")
            except json.JSONDecodeError:
                self.log_result("Duplicate email prevention", False, "Invalid JSON error response")
        else:
            self.log_result("Duplicate email prevention", False, f"Expected 400, got {response.status_code}")
        
        # Test 2: Invalid login credentials
        print("\n--- Test 2: Invalid Login Credentials ---")
        
        invalid_login = {
            "email": self.test_user_data['email'],
            "password": "WrongPassword123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=invalid_login)
        
        if response.status_code == 401:
            self.log_result("Invalid credentials rejection", True, "Correctly rejected invalid password")
        else:
            self.log_result("Invalid credentials rejection", False, f"Expected 401, got {response.status_code}")
        
        # Test 3: Unauthorized access to /me endpoint
        print("\n--- Test 3: Unauthorized Access to /me ---")
        
        response = self.make_request("GET", "/auth/me")
        
        if response.status_code in [401, 403]:
            self.log_result("Unauthorized /me access", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Unauthorized /me access", False, f"Expected 401/403, got {response.status_code}")
        
        # Test 4: Invalid token access
        print("\n--- Test 4: Invalid Token Access ---")
        
        response = self.make_request("GET", "/auth/me", auth_token="invalid_token")
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token rejection", True, "Correctly rejected invalid token")
        else:
            self.log_result("Invalid token rejection", False, f"Expected 401/403, got {response.status_code}")
    
    def run_all_tests(self):
        """Run all homeowner authentication tests"""
        print("🏠 HOMEOWNER REGISTRATION AND AUTHENTICATION FLOW TESTING")
        print("=" * 80)
        
        # Run tests in sequence
        self.test_service_health()
        self.test_homeowner_registration()
        self.test_login_after_registration()
        self.test_current_user_endpoint()
        self.test_data_integrity_checks()
        self.test_edge_cases()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏠 HOMEOWNER AUTHENTICATION TESTING RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Specific analysis for the reported issue
        print(f"\n🔍 SPECIFIC ISSUE ANALYSIS:")
        print(f"   Issue: Homeowner accounts showing 'undefined' in welcome messages")
        
        if self.results['failed'] == 0:
            print(f"   ✅ RESOLVED: All name field tests passed - user.name is properly stored and retrieved")
        else:
            name_related_errors = [error for error in self.results['errors'] if 'name' in error.lower()]
            if name_related_errors:
                print(f"   ❌ CONFIRMED: Name field issues detected:")
                for error in name_related_errors:
                    print(f"      • {error}")
            else:
                print(f"   ⚠️  INCONCLUSIVE: Tests failed but not specifically related to name field")
        
        return success_rate >= 90  # Consider successful if 90%+ tests pass

if __name__ == "__main__":
    tester = HomeownerAuthTester()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n🎉 HOMEOWNER AUTHENTICATION TESTING COMPLETED SUCCESSFULLY")
    else:
        print(f"\n🚨 HOMEOWNER AUTHENTICATION TESTING COMPLETED WITH ISSUES")
    
    exit(0 if success else 1)
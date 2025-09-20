#!/usr/bin/env python3
"""
LOGIN API ENDPOINT TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Test the login API endpoint to verify it's working correctly after services restart.

**Test the login endpoint:**
- POST /api/auth/login
- Test with valid homeowner credentials: francisdaniel4jb@gmail.com / Servicehub..1
- Test with valid tradesperson credentials: john.plumber@gmail.com / Password123!
- Verify response contains access_token and user data
- Check response structure matches expected format

**Expected Results:**
- Status 200 for valid credentials
- Response should contain: access_token, user (with id, name, email, role)
- Status 401 for invalid credentials
- Proper error handling

**Context:**
- Frontend testing agent found that login form wasn't making network requests
- Need to verify backend login endpoint is working correctly
- This will help determine if issue is frontend or backend related
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, Any

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

class LoginAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
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
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            # Set proper headers for JSON requests
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            
            if 'json' in kwargs:
                kwargs['headers']['Content-Type'] = 'application/json'
            
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
    
    def test_login_endpoint_structure(self):
        """Test login endpoint basic structure and error handling"""
        print("\n=== Testing Login Endpoint Structure ===")
        
        # Test 1: Empty request (should return 422 validation error)
        print("\n--- Test 1: Empty Login Request ---")
        response = self.make_request("POST", "/auth/login", json={})
        
        if response.status_code == 422:
            self.log_result("Empty login request validation", True, "Correctly rejected empty request")
        else:
            self.log_result("Empty login request validation", False, f"Expected 422, got {response.status_code}")
        
        # Test 2: Missing password (should return 422 validation error)
        print("\n--- Test 2: Missing Password ---")
        response = self.make_request("POST", "/auth/login", json={"email": "test@example.com"})
        
        if response.status_code == 422:
            self.log_result("Missing password validation", True, "Correctly rejected missing password")
        else:
            self.log_result("Missing password validation", False, f"Expected 422, got {response.status_code}")
        
        # Test 3: Missing email (should return 422 validation error)
        print("\n--- Test 3: Missing Email ---")
        response = self.make_request("POST", "/auth/login", json={"password": "testpassword"})
        
        if response.status_code == 422:
            self.log_result("Missing email validation", True, "Correctly rejected missing email")
        else:
            self.log_result("Missing email validation", False, f"Expected 422, got {response.status_code}")
        
        # Test 4: Invalid email format (should return 422 validation error)
        print("\n--- Test 4: Invalid Email Format ---")
        response = self.make_request("POST", "/auth/login", json={
            "email": "invalid-email",
            "password": "testpassword"
        })
        
        if response.status_code == 422:
            self.log_result("Invalid email format validation", True, "Correctly rejected invalid email format")
        else:
            self.log_result("Invalid email format validation", False, f"Expected 422, got {response.status_code}")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        print("\n=== Testing Invalid Credentials ===")
        
        # Test 1: Non-existent user
        print("\n--- Test 1: Non-existent User ---")
        response = self.make_request("POST", "/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "somepassword"
        })
        
        if response.status_code == 401:
            try:
                data = response.json()
                if "detail" in data:
                    self.log_result("Non-existent user login", True, f"Correctly returned 401: {data['detail']}")
                else:
                    self.log_result("Non-existent user login", False, "Missing error detail")
            except json.JSONDecodeError:
                self.log_result("Non-existent user login", False, "Invalid JSON response")
        else:
            self.log_result("Non-existent user login", False, f"Expected 401, got {response.status_code}")
        
        # Test 2: Wrong password for existing user (using homeowner credentials with wrong password)
        print("\n--- Test 2: Wrong Password ---")
        response = self.make_request("POST", "/auth/login", json={
            "email": "francisdaniel4jb@gmail.com",
            "password": "WrongPassword123!"
        })
        
        if response.status_code == 401:
            try:
                data = response.json()
                if "detail" in data:
                    self.log_result("Wrong password login", True, f"Correctly returned 401: {data['detail']}")
                else:
                    self.log_result("Wrong password login", False, "Missing error detail")
            except json.JSONDecodeError:
                self.log_result("Wrong password login", False, "Invalid JSON response")
        else:
            self.log_result("Wrong password login", False, f"Expected 401, got {response.status_code}")
    
    def test_valid_homeowner_login(self):
        """Test login with valid homeowner credentials"""
        print("\n=== Testing Valid Homeowner Login ===")
        
        # Test with homeowner credentials: francisdaniel4jb@gmail.com / Servicehub..1
        print("\n--- Testing Homeowner: francisdaniel4jb@gmail.com ---")
        response = self.make_request("POST", "/auth/login", json={
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        })
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check required fields in response
                required_fields = ['access_token', 'token_type', 'user', 'expires_in']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Homeowner login response structure", True, "All required fields present")
                    
                    # Verify access_token
                    if data.get('access_token') and len(data['access_token']) > 20:
                        self.log_result("Homeowner access token", True, f"Token length: {len(data['access_token'])}")
                    else:
                        self.log_result("Homeowner access token", False, "Invalid or missing access token")
                    
                    # Verify token_type
                    if data.get('token_type') == 'bearer':
                        self.log_result("Homeowner token type", True, "Token type is 'bearer'")
                    else:
                        self.log_result("Homeowner token type", False, f"Expected 'bearer', got {data.get('token_type')}")
                    
                    # Verify user data
                    user_data = data.get('user', {})
                    required_user_fields = ['id', 'name', 'email', 'role']
                    missing_user_fields = [field for field in required_user_fields if field not in user_data]
                    
                    if not missing_user_fields:
                        self.log_result("Homeowner user data structure", True, "All required user fields present")
                        
                        # Verify specific user data
                        if user_data.get('email') == 'francisdaniel4jb@gmail.com':
                            self.log_result("Homeowner email verification", True, f"Email: {user_data['email']}")
                        else:
                            self.log_result("Homeowner email verification", False, f"Expected francisdaniel4jb@gmail.com, got {user_data.get('email')}")
                        
                        if user_data.get('role') == 'homeowner':
                            self.log_result("Homeowner role verification", True, f"Role: {user_data['role']}")
                        else:
                            self.log_result("Homeowner role verification", False, f"Expected 'homeowner', got {user_data.get('role')}")
                        
                        if user_data.get('name'):
                            self.log_result("Homeowner name verification", True, f"Name: {user_data['name']}")
                        else:
                            self.log_result("Homeowner name verification", False, "Missing user name")
                        
                        if user_data.get('id'):
                            self.log_result("Homeowner ID verification", True, f"User ID: {user_data['id']}")
                        else:
                            self.log_result("Homeowner ID verification", False, "Missing user ID")
                            
                    else:
                        self.log_result("Homeowner user data structure", False, f"Missing user fields: {missing_user_fields}")
                    
                    # Verify expires_in
                    if isinstance(data.get('expires_in'), int) and data['expires_in'] > 0:
                        self.log_result("Homeowner token expiration", True, f"Expires in: {data['expires_in']} seconds")
                    else:
                        self.log_result("Homeowner token expiration", False, "Invalid expiration time")
                        
                else:
                    self.log_result("Homeowner login response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Homeowner login", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner login", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_valid_tradesperson_login(self):
        """Test login with valid tradesperson credentials"""
        print("\n=== Testing Valid Tradesperson Login ===")
        
        # Test with tradesperson credentials: john.plumber@gmail.com / Password123!
        print("\n--- Testing Tradesperson: john.plumber@gmail.com ---")
        response = self.make_request("POST", "/auth/login", json={
            "email": "john.plumber@gmail.com",
            "password": "Password123!"
        })
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check required fields in response
                required_fields = ['access_token', 'token_type', 'user', 'expires_in']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Tradesperson login response structure", True, "All required fields present")
                    
                    # Verify access_token
                    if data.get('access_token') and len(data['access_token']) > 20:
                        self.log_result("Tradesperson access token", True, f"Token length: {len(data['access_token'])}")
                    else:
                        self.log_result("Tradesperson access token", False, "Invalid or missing access token")
                    
                    # Verify token_type
                    if data.get('token_type') == 'bearer':
                        self.log_result("Tradesperson token type", True, "Token type is 'bearer'")
                    else:
                        self.log_result("Tradesperson token type", False, f"Expected 'bearer', got {data.get('token_type')}")
                    
                    # Verify user data
                    user_data = data.get('user', {})
                    required_user_fields = ['id', 'name', 'email', 'role']
                    missing_user_fields = [field for field in required_user_fields if field not in user_data]
                    
                    if not missing_user_fields:
                        self.log_result("Tradesperson user data structure", True, "All required user fields present")
                        
                        # Verify specific user data
                        if user_data.get('email') == 'john.plumber@gmail.com':
                            self.log_result("Tradesperson email verification", True, f"Email: {user_data['email']}")
                        else:
                            self.log_result("Tradesperson email verification", False, f"Expected john.plumber@gmail.com, got {user_data.get('email')}")
                        
                        if user_data.get('role') == 'tradesperson':
                            self.log_result("Tradesperson role verification", True, f"Role: {user_data['role']}")
                        else:
                            self.log_result("Tradesperson role verification", False, f"Expected 'tradesperson', got {user_data.get('role')}")
                        
                        if user_data.get('name'):
                            self.log_result("Tradesperson name verification", True, f"Name: {user_data['name']}")
                        else:
                            self.log_result("Tradesperson name verification", False, "Missing user name")
                        
                        if user_data.get('id'):
                            self.log_result("Tradesperson ID verification", True, f"User ID: {user_data['id']}")
                        else:
                            self.log_result("Tradesperson ID verification", False, "Missing user ID")
                        
                        # Verify tradesperson-specific fields
                        if user_data.get('trade_categories'):
                            self.log_result("Tradesperson trade categories", True, f"Categories: {user_data['trade_categories']}")
                        else:
                            self.log_result("Tradesperson trade categories", False, "Missing trade categories")
                            
                    else:
                        self.log_result("Tradesperson user data structure", False, f"Missing user fields: {missing_user_fields}")
                    
                    # Verify expires_in
                    if isinstance(data.get('expires_in'), int) and data['expires_in'] > 0:
                        self.log_result("Tradesperson token expiration", True, f"Expires in: {data['expires_in']} seconds")
                    else:
                        self.log_result("Tradesperson token expiration", False, "Invalid expiration time")
                        
                else:
                    self.log_result("Tradesperson login response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Tradesperson login", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson login", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_token_validation(self):
        """Test that returned tokens work for authenticated endpoints"""
        print("\n=== Testing Token Validation ===")
        
        # First get a valid token from homeowner login
        print("\n--- Getting Token for Validation Test ---")
        login_response = self.make_request("POST", "/auth/login", json={
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        })
        
        if login_response.status_code == 200:
            try:
                login_data = login_response.json()
                access_token = login_data.get('access_token')
                
                if access_token:
                    # Test token with /auth/me endpoint
                    print("\n--- Testing Token with /auth/me Endpoint ---")
                    me_response = self.make_request("GET", "/auth/me", headers={
                        "Authorization": f"Bearer {access_token}"
                    })
                    
                    if me_response.status_code == 200:
                        try:
                            me_data = me_response.json()
                            if me_data.get('email') == 'francisdaniel4jb@gmail.com':
                                self.log_result("Token validation with /auth/me", True, f"Successfully authenticated user: {me_data['email']}")
                            else:
                                self.log_result("Token validation with /auth/me", False, "User data mismatch")
                        except json.JSONDecodeError:
                            self.log_result("Token validation with /auth/me", False, "Invalid JSON response")
                    else:
                        self.log_result("Token validation with /auth/me", False, f"Status: {me_response.status_code}")
                else:
                    self.log_result("Token validation setup", False, "No access token received")
            except json.JSONDecodeError:
                self.log_result("Token validation setup", False, "Invalid login response")
        else:
            self.log_result("Token validation setup", False, f"Login failed: {login_response.status_code}")
    
    def run_all_tests(self):
        """Run all login API tests"""
        print("🚀 STARTING LOGIN API ENDPOINT TESTING")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all test suites
        self.test_service_health()
        self.test_login_endpoint_structure()
        self.test_invalid_credentials()
        self.test_valid_homeowner_login()
        self.test_valid_tradesperson_login()
        self.test_token_validation()
        
        # Print summary
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 60)
        print("🎯 LOGIN API TESTING SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"⏱️  Total Duration: {duration:.2f} seconds")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n" + "=" * 60)
        
        # Determine overall result
        if self.results['failed'] == 0:
            print("🎉 ALL TESTS PASSED - LOGIN API IS FULLY OPERATIONAL!")
        elif self.results['passed'] > self.results['failed']:
            print("⚠️  MOSTLY WORKING - Some issues found but core functionality works")
        else:
            print("🚨 CRITICAL ISSUES - Login API has significant problems")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = LoginAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
#!/usr/bin/env python3
"""
COMPREHENSIVE AUTHENTICATION SYSTEM TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**AUTHENTICATION ISSUE:** The frontend testing shows that login is failing with "Could not validate credentials" errors, 
preventing access to the My Jobs page and blocking testing of the Edit button functionality.

**SPECIFIC TESTING REQUIREMENTS:**

1. **User Database Verification**:
   - Check if user 'francisdaniel4jb@gmail.com' exists in database
   - Verify user status is 'active' 
   - Check password hash format and validity
   - Confirm user role is 'homeowner'

2. **Login API Testing**:
   - Test POST /api/auth/login with credentials: francisdaniel4jb@gmail.com / Servicehub..1
   - Verify API response format (should return access_token, user info)
   - Check if JWT token is generated correctly
   - Test token expiration and format

3. **Token Validation Testing**:
   - Test GET /api/auth/me with generated JWT token
   - Verify protected endpoints work with valid token
   - Check Authorization header format
   - Test token decoding and user identification

4. **Password Hash Verification**:
   - Verify the password 'Servicehub..1' matches the stored hash
   - Test bcrypt password comparison
   - Check if password was recently changed/updated correctly

5. **Database Connection**:
   - Verify MongoDB connection is working
   - Test user collection queries
   - Check if database operations complete successfully

6. **Recent Changes Impact**:
   - Check if recent toast hook fix affected authentication
   - Verify no authentication middleware issues
   - Test if JWT secret/configuration is correct

**EXPECTED RESULTS:**
- User should exist with correct credentials
- Login API should return valid JWT token
- Token validation should work for protected endpoints
- No database connectivity issues
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid
from collections import Counter
import bcrypt
import jwt

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tradesman-connect.preview.emergentagent.com') + '/api'

class AuthenticationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.target_user_email = "francisdaniel4jb@gmail.com"
        self.target_user_password = "Servicehub..1"
        self.target_user_token = None
        self.target_user_data = None
        
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
    
    def test_database_connection(self):
        """Test database connectivity through API endpoints"""
        print("\n=== Testing Database Connection ===")
        
        # Test an endpoint that requires database access
        response = self.make_request("GET", "/auth/trade-categories")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'categories' in data and 'total' in data:
                    self.log_result("Database connectivity", True, f"Found {data['total']} trade categories")
                else:
                    self.log_result("Database connectivity", False, "Invalid response structure")
            except json.JSONDecodeError:
                self.log_result("Database connectivity", False, "Invalid JSON response")
        else:
            self.log_result("Database connectivity", False, f"Status: {response.status_code}")
    
    def test_user_database_verification(self):
        """Test if target user exists in database and verify details"""
        print("\n=== Testing User Database Verification ===")
        
        # We can't directly query the database, but we can test registration to see if user exists
        print(f"\n--- Test 1: Check if user {self.target_user_email} exists ---")
        
        # Try to register with the same email to see if it's already taken
        test_registration_data = {
            "name": "Test User",
            "email": self.target_user_email,
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=test_registration_data)
        
        if response.status_code == 400:
            try:
                data = response.json()
                if "already registered" in data.get("detail", "").lower():
                    self.log_result("User exists in database", True, f"User {self.target_user_email} exists")
                else:
                    self.log_result("User exists in database", False, f"Unexpected error: {data.get('detail')}")
            except json.JSONDecodeError:
                self.log_result("User exists in database", False, "Invalid JSON response")
        elif response.status_code == 200:
            self.log_result("User exists in database", False, f"User {self.target_user_email} does not exist - registration succeeded")
        else:
            self.log_result("User exists in database", False, f"Unexpected status: {response.status_code}")
    
    def test_login_api(self):
        """Test login API with target user credentials"""
        print("\n=== Testing Login API ===")
        
        print(f"\n--- Test 1: Login with credentials {self.target_user_email} / {self.target_user_password} ---")
        
        login_data = {
            "email": self.target_user_email,
            "password": self.target_user_password
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check response structure
                required_fields = ['access_token', 'token_type', 'user', 'expires_in']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.target_user_token = data['access_token']
                    self.target_user_data = data['user']
                    
                    self.log_result("Login API response structure", True, "All required fields present")
                    
                    # Verify user data
                    user = data['user']
                    if user.get('email') == self.target_user_email:
                        self.log_result("Login user email verification", True, f"Email matches: {user['email']}")
                    else:
                        self.log_result("Login user email verification", False, f"Email mismatch: {user.get('email')}")
                    
                    if user.get('role') == 'homeowner':
                        self.log_result("Login user role verification", True, f"Role is homeowner")
                    else:
                        self.log_result("Login user role verification", False, f"Role is: {user.get('role')}")
                    
                    if user.get('status') == 'active':
                        self.log_result("Login user status verification", True, f"Status is active")
                    else:
                        self.log_result("Login user status verification", False, f"Status is: {user.get('status')}")
                    
                    # Verify token format
                    if self.target_user_token and len(self.target_user_token.split('.')) == 3:
                        self.log_result("JWT token format", True, "Token has 3 parts (header.payload.signature)")
                    else:
                        self.log_result("JWT token format", False, "Invalid JWT token format")
                    
                    # Verify token type
                    if data.get('token_type') == 'bearer':
                        self.log_result("Token type verification", True, "Token type is bearer")
                    else:
                        self.log_result("Token type verification", False, f"Token type is: {data.get('token_type')}")
                    
                    # Verify expires_in
                    if isinstance(data.get('expires_in'), int) and data.get('expires_in') > 0:
                        self.log_result("Token expiration", True, f"Expires in {data.get('expires_in')} seconds")
                    else:
                        self.log_result("Token expiration", False, f"Invalid expiration: {data.get('expires_in')}")
                        
                else:
                    self.log_result("Login API response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Login API", False, "Invalid JSON response")
        elif response.status_code == 401:
            try:
                data = response.json()
                error_detail = data.get('detail', 'Unknown error')
                self.log_result("Login API", False, f"Authentication failed: {error_detail}")
            except json.JSONDecodeError:
                self.log_result("Login API", False, f"Authentication failed with status 401")
        else:
            self.log_result("Login API", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_token_validation(self):
        """Test token validation with protected endpoints"""
        print("\n=== Testing Token Validation ===")
        
        if not self.target_user_token:
            self.log_result("Token validation", False, "No token available from login")
            return
        
        print(f"\n--- Test 1: GET /api/auth/me with JWT token ---")
        
        response = self.make_request("GET", "/auth/me", auth_token=self.target_user_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify user data consistency
                if data.get('email') == self.target_user_email:
                    self.log_result("Token validation - user data", True, f"User data consistent: {data['email']}")
                else:
                    self.log_result("Token validation - user data", False, f"User data mismatch: {data.get('email')}")
                
                # Check if user ID matches
                if self.target_user_data and data.get('id') == self.target_user_data.get('id'):
                    self.log_result("Token validation - user ID", True, f"User ID consistent: {data['id']}")
                else:
                    self.log_result("Token validation - user ID", False, f"User ID mismatch")
                    
            except json.JSONDecodeError:
                self.log_result("Token validation", False, "Invalid JSON response")
        elif response.status_code == 401:
            try:
                data = response.json()
                error_detail = data.get('detail', 'Unknown error')
                self.log_result("Token validation", False, f"Token validation failed: {error_detail}")
            except json.JSONDecodeError:
                self.log_result("Token validation", False, f"Token validation failed with status 401")
        else:
            self.log_result("Token validation", False, f"Status: {response.status_code}")
        
        # Test another protected endpoint
        print(f"\n--- Test 2: Test protected endpoint /api/jobs/my-jobs ---")
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.target_user_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'jobs' in data:
                    self.log_result("Protected endpoint access", True, f"My jobs endpoint accessible, found {len(data['jobs'])} jobs")
                else:
                    self.log_result("Protected endpoint access", False, "Invalid response structure")
            except json.JSONDecodeError:
                self.log_result("Protected endpoint access", False, "Invalid JSON response")
        elif response.status_code == 401:
            self.log_result("Protected endpoint access", False, "Authentication failed for protected endpoint")
        else:
            self.log_result("Protected endpoint access", False, f"Status: {response.status_code}")
    
    def test_password_hash_verification(self):
        """Test password hash verification indirectly through login attempts"""
        print("\n=== Testing Password Hash Verification ===")
        
        # Test with correct password
        print(f"\n--- Test 1: Login with correct password ---")
        login_data = {
            "email": self.target_user_email,
            "password": self.target_user_password
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            self.log_result("Correct password verification", True, "Login successful with correct password")
        else:
            self.log_result("Correct password verification", False, f"Login failed with correct password: {response.status_code}")
        
        # Test with incorrect password
        print(f"\n--- Test 2: Login with incorrect password ---")
        wrong_login_data = {
            "email": self.target_user_email,
            "password": "WrongPassword123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=wrong_login_data)
        
        if response.status_code == 401:
            self.log_result("Incorrect password rejection", True, "Login correctly rejected with wrong password")
        else:
            self.log_result("Incorrect password rejection", False, f"Unexpected status with wrong password: {response.status_code}")
        
        # Test with variations of the correct password
        print(f"\n--- Test 3: Login with password variations ---")
        password_variations = [
            "servicehub..1",  # lowercase
            "SERVICEHUB..1",  # uppercase
            "Servicehub.1",   # single dot
            "Servicehub..11", # extra character
        ]
        
        for i, variation in enumerate(password_variations, 1):
            variation_login_data = {
                "email": self.target_user_email,
                "password": variation
            }
            
            response = self.make_request("POST", "/auth/login", json=variation_login_data)
            
            if response.status_code == 401:
                self.log_result(f"Password variation {i} rejection", True, f"Correctly rejected '{variation}'")
            else:
                self.log_result(f"Password variation {i} rejection", False, f"Unexpected status for '{variation}': {response.status_code}")
    
    def test_authentication_middleware(self):
        """Test authentication middleware and JWT configuration"""
        print("\n=== Testing Authentication Middleware ===")
        
        # Test with no token
        print(f"\n--- Test 1: Access protected endpoint without token ---")
        response = self.make_request("GET", "/auth/me")
        
        if response.status_code in [401, 403]:
            self.log_result("No token rejection", True, f"Correctly rejected request without token: {response.status_code}")
        else:
            self.log_result("No token rejection", False, f"Unexpected status without token: {response.status_code}")
        
        # Test with invalid token
        print(f"\n--- Test 2: Access protected endpoint with invalid token ---")
        response = self.make_request("GET", "/auth/me", auth_token="invalid_token")
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token rejection", True, f"Correctly rejected invalid token: {response.status_code}")
        else:
            self.log_result("Invalid token rejection", False, f"Unexpected status with invalid token: {response.status_code}")
        
        # Test with malformed token
        print(f"\n--- Test 3: Access protected endpoint with malformed token ---")
        response = self.make_request("GET", "/auth/me", auth_token="Bearer.malformed.token")
        
        if response.status_code in [401, 403]:
            self.log_result("Malformed token rejection", True, f"Correctly rejected malformed token: {response.status_code}")
        else:
            self.log_result("Malformed token rejection", False, f"Unexpected status with malformed token: {response.status_code}")
    
    def test_jwt_token_details(self):
        """Test JWT token details and structure"""
        print("\n=== Testing JWT Token Details ===")
        
        if not self.target_user_token:
            self.log_result("JWT token details", False, "No token available")
            return
        
        try:
            # Decode token without verification to inspect payload
            # Note: This is for testing purposes only
            parts = self.target_user_token.split('.')
            if len(parts) != 3:
                self.log_result("JWT token structure", False, "Token doesn't have 3 parts")
                return
            
            self.log_result("JWT token structure", True, "Token has correct 3-part structure")
            
            # Try to decode header and payload (without signature verification)
            import base64
            
            # Decode header
            try:
                header_padding = '=' * (4 - len(parts[0]) % 4)
                header_data = base64.urlsafe_b64decode(parts[0] + header_padding)
                header = json.loads(header_data)
                
                if header.get('typ') == 'JWT':
                    self.log_result("JWT header type", True, "Header type is JWT")
                else:
                    self.log_result("JWT header type", False, f"Header type is: {header.get('typ')}")
                
                if 'alg' in header:
                    self.log_result("JWT algorithm", True, f"Algorithm: {header['alg']}")
                else:
                    self.log_result("JWT algorithm", False, "No algorithm specified")
                    
            except Exception as e:
                self.log_result("JWT header decode", False, f"Failed to decode header: {e}")
            
            # Decode payload
            try:
                payload_padding = '=' * (4 - len(parts[1]) % 4)
                payload_data = base64.urlsafe_b64decode(parts[1] + payload_padding)
                payload = json.loads(payload_data)
                
                # Check required claims
                if 'sub' in payload:
                    self.log_result("JWT subject claim", True, f"Subject: {payload['sub']}")
                else:
                    self.log_result("JWT subject claim", False, "No subject claim")
                
                if 'email' in payload:
                    if payload['email'] == self.target_user_email:
                        self.log_result("JWT email claim", True, f"Email matches: {payload['email']}")
                    else:
                        self.log_result("JWT email claim", False, f"Email mismatch: {payload['email']}")
                else:
                    self.log_result("JWT email claim", False, "No email claim")
                
                if 'exp' in payload:
                    exp_time = datetime.fromtimestamp(payload['exp'])
                    if exp_time > datetime.now():
                        self.log_result("JWT expiration", True, f"Token expires at: {exp_time}")
                    else:
                        self.log_result("JWT expiration", False, f"Token expired at: {exp_time}")
                else:
                    self.log_result("JWT expiration", False, "No expiration claim")
                    
            except Exception as e:
                self.log_result("JWT payload decode", False, f"Failed to decode payload: {e}")
                
        except Exception as e:
            self.log_result("JWT token analysis", False, f"Failed to analyze token: {e}")
    
    def test_recent_changes_impact(self):
        """Test if recent changes affected authentication"""
        print("\n=== Testing Recent Changes Impact ===")
        
        # Test multiple login attempts to check consistency
        print(f"\n--- Test 1: Multiple login attempts consistency ---")
        
        login_data = {
            "email": self.target_user_email,
            "password": self.target_user_password
        }
        
        success_count = 0
        total_attempts = 3
        
        for i in range(total_attempts):
            response = self.make_request("POST", "/auth/login", json=login_data)
            if response.status_code == 200:
                success_count += 1
            time.sleep(1)  # Small delay between attempts
        
        if success_count == total_attempts:
            self.log_result("Login consistency", True, f"All {total_attempts} login attempts successful")
        else:
            self.log_result("Login consistency", False, f"Only {success_count}/{total_attempts} login attempts successful")
        
        # Test token validation consistency
        if self.target_user_token:
            print(f"\n--- Test 2: Token validation consistency ---")
            
            success_count = 0
            total_attempts = 3
            
            for i in range(total_attempts):
                response = self.make_request("GET", "/auth/me", auth_token=self.target_user_token)
                if response.status_code == 200:
                    success_count += 1
                time.sleep(1)
            
            if success_count == total_attempts:
                self.log_result("Token validation consistency", True, f"All {total_attempts} token validations successful")
            else:
                self.log_result("Token validation consistency", False, f"Only {success_count}/{total_attempts} token validations successful")
    
    def test_comprehensive_authentication_flow(self):
        """Test complete authentication flow end-to-end"""
        print("\n=== Testing Comprehensive Authentication Flow ===")
        
        print(f"\n--- Complete Flow: Registration Check → Login → Token Validation → Protected Access ---")
        
        # Step 1: Verify user exists
        test_registration_data = {
            "name": "Test User",
            "email": self.target_user_email,
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        reg_response = self.make_request("POST", "/auth/register/homeowner", json=test_registration_data)
        user_exists = reg_response.status_code == 400
        
        # Step 2: Login
        login_data = {
            "email": self.target_user_email,
            "password": self.target_user_password
        }
        
        login_response = self.make_request("POST", "/auth/login", json=login_data)
        login_success = login_response.status_code == 200
        
        token = None
        if login_success:
            try:
                login_data_response = login_response.json()
                token = login_data_response.get('access_token')
            except:
                pass
        
        # Step 3: Token validation
        token_valid = False
        if token:
            me_response = self.make_request("GET", "/auth/me", auth_token=token)
            token_valid = me_response.status_code == 200
        
        # Step 4: Protected endpoint access
        protected_access = False
        if token:
            jobs_response = self.make_request("GET", "/jobs/my-jobs", auth_token=token)
            protected_access = jobs_response.status_code == 200
        
        # Evaluate complete flow
        if user_exists and login_success and token_valid and protected_access:
            self.log_result("Complete authentication flow", True, "All steps successful")
        else:
            flow_status = f"User exists: {user_exists}, Login: {login_success}, Token valid: {token_valid}, Protected access: {protected_access}"
            self.log_result("Complete authentication flow", False, flow_status)
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🔐 COMPREHENSIVE AUTHENTICATION SYSTEM TESTING")
        print("=" * 60)
        print(f"Target User: {self.target_user_email}")
        print(f"Target Password: {self.target_user_password}")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Run all test categories
        self.test_service_health()
        self.test_database_connection()
        self.test_user_database_verification()
        self.test_login_api()
        self.test_token_validation()
        self.test_password_hash_verification()
        self.test_authentication_middleware()
        self.test_jwt_token_details()
        self.test_recent_changes_impact()
        self.test_comprehensive_authentication_flow()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🔐 AUTHENTICATION TESTING SUMMARY")
        print("=" * 60)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 CRITICAL ISSUES IDENTIFIED:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Provide specific recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        
        if self.target_user_token:
            print(f"   ✅ Authentication system is working - user can login and get valid token")
            print(f"   ✅ Token: {self.target_user_token[:50]}...")
        else:
            print(f"   🚨 CRITICAL: User cannot login - check password hash or user status")
        
        if self.target_user_data:
            print(f"   ✅ User data retrieved: ID={self.target_user_data.get('id')}, Role={self.target_user_data.get('role')}, Status={self.target_user_data.get('status')}")
        else:
            print(f"   🚨 CRITICAL: No user data retrieved from login")
        
        print(f"\n🎯 NEXT STEPS:")
        if success_rate >= 80:
            print(f"   • Authentication system appears to be working correctly")
            print(f"   • If frontend is still failing, check frontend token storage/usage")
            print(f"   • Verify frontend is using correct backend URL: {self.base_url}")
        else:
            print(f"   • Fix critical authentication issues identified above")
            print(f"   • Check backend logs for detailed error messages")
            print(f"   • Verify database connectivity and user data integrity")

if __name__ == "__main__":
    tester = AuthenticationTester()
    tester.run_all_tests()
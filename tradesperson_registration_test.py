#!/usr/bin/env python3
"""
TRADESPERSON REGISTRATION ENDPOINT TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Test the tradesperson registration endpoint to verify it's working correctly with the phone number format fix:

**1. Registration API Testing:** 
- Test the POST /api/auth/register/tradesperson endpoint with properly formatted data
- Use Nigerian phone number format with +234 prefix
- Include all required fields: name, email, password, phone, location, postcode, trade_categories, experience_years, company_name, description, certifications
- Verify successful registration response (201 status)
- Check that user is created in the database
- Verify JWT token is returned

**2. Phone Number Validation:** 
- Test with +234 prefix: "+2348012345678"
- Verify it passes Nigerian phone validation
- Check that the phone number is stored correctly

**3. Authentication Flow:** 
- Register a new tradesperson user
- Verify login works with the same credentials
- Test that JWT token authentication works
- Verify user profile data is correctly returned

**4. Database Verification:** 
- Verify user record exists in users collection
- Check that all fields are properly saved
- Verify password is hashed correctly
- Confirm tradesperson role is set

**EXPECTED RESULTS:**
- Registration endpoint should return 201 success
- Phone number validation should pass with +234 format
- User should be created in database with proper data
- Authentication flow should work end-to-end
- JWT tokens should be valid and functional
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
try:
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BACKEND_URL = line.split('=')[1].strip() + '/api'
                break
        else:
            BACKEND_URL = "http://localhost:8001/api"
except FileNotFoundError:
    BACKEND_URL = "http://localhost:8001/api"

class TradespersonRegistrationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.test_user_data = None
        self.access_token = None
        self.user_id = None
        
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
    
    def test_tradesperson_registration_with_phone_format(self):
        """Test tradesperson registration with proper Nigerian phone number format"""
        print("\n=== Testing Tradesperson Registration with Phone Number Format ===")
        
        # Generate unique test data
        unique_id = uuid.uuid4().hex[:8]
        
        # Test data with all required fields and proper +234 phone format
        self.test_user_data = {
            "name": f"John Test Tradesperson {unique_id}",
            "email": f"john.tradesperson.{unique_id}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",  # Nigerian phone number with +234 prefix
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing", "Electrical Repairs"],
            "experience_years": 5,
            "company_name": f"Test Plumbing Services {unique_id}",
            "description": "Experienced plumber and electrician with over 5 years of experience in residential and commercial work. Specializing in pipe repairs, electrical installations, and maintenance services.",
            "certifications": ["Licensed Plumber", "Electrical Safety Certificate"]
        }
        
        print(f"\n--- Test 1: Registration with +234 Phone Format ---")
        print(f"Testing with phone: {self.test_user_data['phone']}")
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=self.test_user_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check response structure
                if 'id' in data:
                    self.user_id = data['id']
                    self.log_result("Tradesperson registration success", True, f"User ID: {self.user_id}")
                    
                    # Verify all required fields are present in response
                    required_fields = ['id', 'name', 'email', 'phone', 'role', 'trade_categories', 'experience_years']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        self.log_result("Registration response structure", True, "All required fields present")
                        
                        # Verify phone number format is preserved
                        if data.get('phone') == "+2348012345678":
                            self.log_result("Phone number format preservation", True, f"Phone stored as: {data['phone']}")
                        else:
                            self.log_result("Phone number format preservation", False, f"Expected +2348012345678, got {data.get('phone')}")
                        
                        # Verify role is set correctly
                        if data.get('role') == 'tradesperson':
                            self.log_result("User role verification", True, "Role set to tradesperson")
                        else:
                            self.log_result("User role verification", False, f"Expected 'tradesperson', got {data.get('role')}")
                        
                        # Verify trade categories
                        if data.get('trade_categories') == self.test_user_data['trade_categories']:
                            self.log_result("Trade categories verification", True, f"Categories: {data['trade_categories']}")
                        else:
                            self.log_result("Trade categories verification", False, "Trade categories mismatch")
                        
                        # Verify experience years
                        if data.get('experience_years') == 5:
                            self.log_result("Experience years verification", True, f"Experience: {data['experience_years']} years")
                        else:
                            self.log_result("Experience years verification", False, f"Expected 5, got {data.get('experience_years')}")
                            
                    else:
                        self.log_result("Registration response structure", False, f"Missing fields: {missing_fields}")
                        
                else:
                    self.log_result("Tradesperson registration success", False, "No user ID in response")
                    
            except json.JSONDecodeError:
                self.log_result("Tradesperson registration success", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson registration success", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_phone_number_validation_variations(self):
        """Test different phone number format variations"""
        print("\n=== Testing Phone Number Validation Variations ===")
        
        phone_test_cases = [
            {
                "phone": "+2348012345678",
                "description": "Standard +234 format",
                "should_pass": True
            },
            {
                "phone": "08012345678",
                "description": "Nigerian local format (0 prefix)",
                "should_pass": True
            },
            {
                "phone": "8012345678",
                "description": "10-digit format",
                "should_pass": True
            },
            {
                "phone": "+234 801 234 5678",
                "description": "+234 format with spaces",
                "should_pass": True
            },
            {
                "phone": "+1234567890",
                "description": "Non-Nigerian number",
                "should_pass": False
            },
            {
                "phone": "123456789",
                "description": "Too short",
                "should_pass": False
            }
        ]
        
        for i, test_case in enumerate(phone_test_cases, 1):
            print(f"\n--- Test {i}: {test_case['description']} ---")
            
            unique_id = uuid.uuid4().hex[:8]
            test_data = {
                "name": f"Phone Test User {unique_id}",
                "email": f"phone.test.{unique_id}@test.com",
                "password": "TestPassword123!",
                "phone": test_case['phone'],
                "location": "Lagos",
                "postcode": "100001",
                "trade_categories": ["Plumbing"],
                "experience_years": 3,
                "description": "Test user for phone validation"
            }
            
            response = self.make_request("POST", "/auth/register/tradesperson", json=test_data)
            
            if test_case['should_pass']:
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Check if phone was formatted to +234 format
                        formatted_phone = data.get('phone', '')
                        if formatted_phone.startswith('+234'):
                            self.log_result(f"Phone validation - {test_case['description']}", True, 
                                          f"Formatted to: {formatted_phone}")
                        else:
                            self.log_result(f"Phone validation - {test_case['description']}", False, 
                                          f"Not formatted correctly: {formatted_phone}")
                    except json.JSONDecodeError:
                        self.log_result(f"Phone validation - {test_case['description']}", False, "Invalid JSON response")
                else:
                    self.log_result(f"Phone validation - {test_case['description']}", False, 
                                  f"Expected success, got {response.status_code}")
            else:
                if response.status_code == 400:
                    self.log_result(f"Phone validation - {test_case['description']}", True, 
                                  "Correctly rejected invalid phone")
                else:
                    self.log_result(f"Phone validation - {test_case['description']}", False, 
                                  f"Expected 400, got {response.status_code}")
    
    def test_authentication_flow(self):
        """Test complete authentication flow after registration"""
        print("\n=== Testing Authentication Flow ===")
        
        if not self.test_user_data or not self.user_id:
            self.log_result("Authentication flow", False, "No registered user available for testing")
            return
        
        # Test 1: Login with registered credentials
        print(f"\n--- Test 1: Login with Registered Credentials ---")
        login_data = {
            "email": self.test_user_data['email'],
            "password": self.test_user_data['password']
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check login response structure
                required_fields = ['access_token', 'token_type', 'user', 'expires_in']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.access_token = data['access_token']
                    self.log_result("Login success", True, f"Token type: {data['token_type']}, Expires in: {data['expires_in']}s")
                    
                    # Verify user data in login response
                    user_data = data.get('user', {})
                    if user_data.get('id') == self.user_id:
                        self.log_result("Login user data verification", True, "User ID matches registered user")
                    else:
                        self.log_result("Login user data verification", False, "User ID mismatch")
                        
                    # Verify JWT token format (should have 3 parts separated by dots)
                    token_parts = self.access_token.split('.')
                    if len(token_parts) == 3:
                        self.log_result("JWT token format", True, "Token has correct 3-part structure")
                    else:
                        self.log_result("JWT token format", False, f"Token has {len(token_parts)} parts, expected 3")
                        
                else:
                    self.log_result("Login success", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Login success", False, "Invalid JSON response")
        else:
            self.log_result("Login success", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Use JWT token to access protected endpoint
        print(f"\n--- Test 2: JWT Token Authentication ---")
        if self.access_token:
            response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify user profile data
                    if data.get('id') == self.user_id:
                        self.log_result("JWT token authentication", True, "Successfully accessed protected endpoint")
                        
                        # Verify profile data completeness
                        profile_fields = ['id', 'name', 'email', 'phone', 'role', 'trade_categories']
                        missing_profile_fields = [field for field in profile_fields if field not in data]
                        
                        if not missing_profile_fields:
                            self.log_result("User profile data completeness", True, "All profile fields present")
                        else:
                            self.log_result("User profile data completeness", False, f"Missing fields: {missing_profile_fields}")
                            
                    else:
                        self.log_result("JWT token authentication", False, "User ID mismatch in profile")
                        
                except json.JSONDecodeError:
                    self.log_result("JWT token authentication", False, "Invalid JSON response")
            else:
                self.log_result("JWT token authentication", False, f"Status: {response.status_code}")
        else:
            self.log_result("JWT token authentication", False, "No access token available")
    
    def test_registration_validation(self):
        """Test registration validation for required fields and data types"""
        print("\n=== Testing Registration Validation ===")
        
        # Test 1: Missing required fields
        print(f"\n--- Test 1: Missing Required Fields ---")
        incomplete_data = {
            "name": "Test User",
            "email": "test@example.com",
            # Missing password, phone, location, trade_categories, experience_years
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=incomplete_data)
        
        if response.status_code in [400, 422]:
            self.log_result("Missing required fields validation", True, "Correctly rejected incomplete data")
        else:
            self.log_result("Missing required fields validation", False, f"Expected 400/422, got {response.status_code}")
        
        # Test 2: Invalid email format
        print(f"\n--- Test 2: Invalid Email Format ---")
        invalid_email_data = {
            "name": "Test User",
            "email": "invalid-email",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing"],
            "experience_years": 3,
            "description": "Test description"
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=invalid_email_data)
        
        if response.status_code in [400, 422]:
            self.log_result("Invalid email validation", True, "Correctly rejected invalid email")
        else:
            self.log_result("Invalid email validation", False, f"Expected 400/422, got {response.status_code}")
        
        # Test 3: Weak password
        print(f"\n--- Test 3: Weak Password Validation ---")
        weak_password_data = {
            "name": "Test User",
            "email": f"weak.password.{uuid.uuid4().hex[:8]}@test.com",
            "password": "weak",  # Too short, no uppercase, no numbers
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing"],
            "experience_years": 3,
            "description": "Test description"
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=weak_password_data)
        
        if response.status_code in [400, 422]:
            self.log_result("Weak password validation", True, "Correctly rejected weak password")
        else:
            self.log_result("Weak password validation", False, f"Expected 400/422, got {response.status_code}")
        
        # Test 4: Invalid trade categories
        print(f"\n--- Test 4: Invalid Trade Categories ---")
        invalid_categories_data = {
            "name": "Test User",
            "email": f"invalid.categories.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Invalid Category", "Another Invalid"],
            "experience_years": 3,
            "description": "Test description"
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=invalid_categories_data)
        
        if response.status_code in [400, 422]:
            self.log_result("Invalid trade categories validation", True, "Correctly rejected invalid categories")
        else:
            self.log_result("Invalid trade categories validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_duplicate_registration(self):
        """Test duplicate email registration prevention"""
        print("\n=== Testing Duplicate Registration Prevention ===")
        
        if not self.test_user_data:
            self.log_result("Duplicate registration prevention", False, "No test user data available")
            return
        
        # Try to register with the same email again
        print(f"\n--- Test: Duplicate Email Registration ---")
        duplicate_data = self.test_user_data.copy()
        duplicate_data['name'] = "Different Name"  # Change name but keep same email
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=duplicate_data)
        
        if response.status_code == 400:
            try:
                data = response.json()
                if 'already registered' in data.get('detail', '').lower():
                    self.log_result("Duplicate registration prevention", True, "Correctly prevented duplicate email registration")
                else:
                    self.log_result("Duplicate registration prevention", False, f"Wrong error message: {data.get('detail')}")
            except json.JSONDecodeError:
                self.log_result("Duplicate registration prevention", True, "Correctly rejected duplicate (no JSON response)")
        else:
            self.log_result("Duplicate registration prevention", False, f"Expected 400, got {response.status_code}")
    
    def test_database_verification(self):
        """Test that user data is properly stored in database"""
        print("\n=== Testing Database Verification ===")
        
        if not self.access_token or not self.user_id:
            self.log_result("Database verification", False, "No authenticated user available for testing")
            return
        
        # Get user profile to verify database storage
        print(f"\n--- Test: Database Storage Verification ---")
        response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify all key fields are stored correctly
                verification_checks = [
                    ("User ID", data.get('id') == self.user_id),
                    ("Name", data.get('name') == self.test_user_data['name']),
                    ("Email", data.get('email') == self.test_user_data['email']),
                    ("Phone", data.get('phone') == "+2348012345678"),  # Should be formatted
                    ("Role", data.get('role') == 'tradesperson'),
                    ("Location", data.get('location') == self.test_user_data['location']),
                    ("Trade Categories", data.get('trade_categories') == self.test_user_data['trade_categories']),
                    ("Experience Years", data.get('experience_years') == self.test_user_data['experience_years']),
                    ("Company Name", data.get('company_name') == self.test_user_data['company_name']),
                    ("Description", data.get('description') == self.test_user_data['description']),
                    ("Certifications", data.get('certifications') == self.test_user_data['certifications'])
                ]
                
                passed_checks = sum(1 for _, check in verification_checks if check)
                total_checks = len(verification_checks)
                
                if passed_checks == total_checks:
                    self.log_result("Database storage verification", True, f"All {total_checks} fields stored correctly")
                else:
                    failed_checks = [name for name, check in verification_checks if not check]
                    self.log_result("Database storage verification", False, 
                                  f"{passed_checks}/{total_checks} checks passed. Failed: {failed_checks}")
                
                # Verify password is not returned (security check)
                if 'password' not in data and 'password_hash' not in data:
                    self.log_result("Password security check", True, "Password not exposed in API response")
                else:
                    self.log_result("Password security check", False, "Password data exposed in response")
                
                # Verify timestamps are set
                if data.get('created_at') and data.get('updated_at'):
                    self.log_result("Timestamp fields", True, f"Created: {data['created_at']}, Updated: {data['updated_at']}")
                else:
                    self.log_result("Timestamp fields", False, "Missing timestamp fields")
                    
            except json.JSONDecodeError:
                self.log_result("Database verification", False, "Invalid JSON response")
        else:
            self.log_result("Database verification", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Tradesperson Registration Endpoint Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Run tests in logical order
        self.test_service_health()
        self.test_tradesperson_registration_with_phone_format()
        self.test_phone_number_validation_variations()
        self.test_authentication_flow()
        self.test_registration_validation()
        self.test_duplicate_registration()
        self.test_database_verification()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🏁 TESTING SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"  • {error}")
        
        print("\n" + "=" * 80)
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = TradespersonRegistrationTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
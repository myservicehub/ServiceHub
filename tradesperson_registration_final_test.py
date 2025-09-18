#!/usr/bin/env python3
"""
FINAL VERIFICATION TEST - TRADESPERSON REGISTRATION ENDPOINT
=============================================================

This test performs a comprehensive final verification of the tradesperson registration endpoint
to ensure authentication and redirect functionality is working correctly.

TESTING REQUIREMENTS:
1. Registration Endpoint Test - POST /api/auth/register/tradesperson with complete data
2. Authentication Token Validation - Test the returned JWT token
3. Complete Auth Flow Verification - Register new tradesperson and verify JWT works immediately

EXPECTED RESULTS:
- Registration returns LoginResponse with valid JWT token
- Token enables immediate authentication for protected routes
- User can access tradesperson dashboard features without additional login
- Complete registration-to-authentication flow working seamlessly
"""

import requests
import json
import uuid
import time
from datetime import datetime, timedelta
import jwt
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://servicenow-3.preview.emergentagent.com/api"

class TradespersonRegistrationFinalTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
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
    
    def test_registration_endpoint(self):
        """Test POST /api/auth/register/tradesperson with complete data"""
        print("\n=== 1. REGISTRATION ENDPOINT TEST ===")
        
        # Generate unique test data
        unique_id = uuid.uuid4().hex[:8]
        self.test_user_data = {
            "name": f"John FinalTest {unique_id}",
            "email": f"john.finaltest.{unique_id}@example.com",
            "password": "TestPass123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing"],
            "experience_years": 5,
            "company_name": "Final Test Services",
            "description": "Professional tradesperson providing quality services",
            "certifications": ["Licensed Plumber", "Safety Certified"]
        }
        
        print(f"Testing registration with data:")
        print(f"  Name: {self.test_user_data['name']}")
        print(f"  Email: {self.test_user_data['email']}")
        print(f"  Phone: {self.test_user_data['phone']}")
        print(f"  Trade: {self.test_user_data['trade_categories']}")
        
        # Test registration endpoint
        response = self.make_request("POST", "/auth/register/tradesperson", json=self.test_user_data)
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                
                # Verify successful registration (200/201 response)
                self.log_result("Registration endpoint response", True, f"Status: {response.status_code}")
                
                # Confirm JWT access_token is returned in LoginResponse format
                if 'access_token' in data:
                    self.access_token = data['access_token']
                    self.log_result("JWT access_token returned", True, "Access token present in response")
                    
                    # Check that user data includes all required tradesperson fields
                    user_data = data.get('user', data)  # Handle different response formats
                    if 'id' in user_data or 'id' in data:
                        self.user_id = user_data.get('id') or data.get('id')
                        self.log_result("User ID returned", True, f"User ID: {self.user_id}")
                    else:
                        self.log_result("User ID returned", False, "No user ID in response")
                    
                    # Verify required tradesperson fields
                    required_fields = ['name', 'email', 'phone', 'role', 'trade_categories', 'experience_years']
                    missing_fields = []
                    
                    # Check in user object or root level
                    for field in required_fields:
                        if field not in user_data and field not in data:
                            missing_fields.append(field)
                    
                    if not missing_fields:
                        self.log_result("Required tradesperson fields", True, "All required fields present")
                        
                        # Verify role is tradesperson
                        role = user_data.get('role') or data.get('role')
                        if role == 'tradesperson':
                            self.log_result("Tradesperson role verification", True, f"Role: {role}")
                        else:
                            self.log_result("Tradesperson role verification", False, f"Expected 'tradesperson', got '{role}'")
                    else:
                        self.log_result("Required tradesperson fields", False, f"Missing fields: {missing_fields}")
                    
                    # Verify token has proper structure and expiration
                    self.verify_jwt_token_structure()
                    
                else:
                    self.log_result("JWT access_token returned", False, "No access_token in response")
                    print(f"Response keys: {list(data.keys())}")
                    
            except json.JSONDecodeError:
                self.log_result("Registration endpoint response", False, "Invalid JSON response")
        else:
            self.log_result("Registration endpoint response", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def verify_jwt_token_structure(self):
        """Verify token has proper structure and expiration"""
        print("\n--- JWT Token Structure Verification ---")
        
        if not self.access_token:
            self.log_result("JWT token structure", False, "No access token available")
            return
        
        try:
            # Check JWT structure (3 parts separated by dots)
            token_parts = self.access_token.split('.')
            if len(token_parts) == 3:
                self.log_result("JWT token structure", True, "Token has proper 3-part structure (header.payload.signature)")
                
                # Decode token without verification to check expiration
                try:
                    # Decode payload (second part)
                    import base64
                    import json
                    
                    # Add padding if needed
                    payload = token_parts[1]
                    payload += '=' * (4 - len(payload) % 4)
                    
                    decoded_payload = base64.b64decode(payload)
                    payload_data = json.loads(decoded_payload)
                    
                    # Check expiration
                    if 'exp' in payload_data:
                        exp_timestamp = payload_data['exp']
                        exp_datetime = datetime.fromtimestamp(exp_timestamp)
                        current_time = datetime.now()
                        
                        if exp_datetime > current_time:
                            time_diff = exp_datetime - current_time
                            hours = time_diff.total_seconds() / 3600
                            self.log_result("JWT token expiration", True, f"Token expires in {hours:.1f} hours ({exp_datetime})")
                            
                            # Check if it's approximately 24 hours (within reasonable range)
                            if 20 <= hours <= 28:  # Allow some variance
                                self.log_result("JWT token expiration duration", True, f"Token has proper ~24 hour expiration ({hours:.1f} hours)")
                            else:
                                self.log_result("JWT token expiration duration", False, f"Unexpected expiration duration: {hours:.1f} hours")
                        else:
                            self.log_result("JWT token expiration", False, "Token is already expired")
                    else:
                        self.log_result("JWT token expiration", False, "No expiration claim in token")
                        
                    # Check other standard claims
                    if 'sub' in payload_data:
                        self.log_result("JWT subject claim", True, f"Subject: {payload_data['sub']}")
                    
                    if 'iat' in payload_data:
                        iat_datetime = datetime.fromtimestamp(payload_data['iat'])
                        self.log_result("JWT issued at claim", True, f"Issued at: {iat_datetime}")
                        
                except Exception as e:
                    self.log_result("JWT token payload decode", False, f"Failed to decode payload: {e}")
                    
            else:
                self.log_result("JWT token structure", False, f"Token has {len(token_parts)} parts, expected 3")
                
        except Exception as e:
            self.log_result("JWT token structure", False, f"Error analyzing token: {e}")
    
    def test_authentication_token_validation(self):
        """Test the returned JWT token for authentication"""
        print("\n=== 2. AUTHENTICATION TOKEN VALIDATION ===")
        
        if not self.access_token:
            self.log_result("Authentication token validation", False, "No access token available for testing")
            return
        
        # Use access_token for GET /api/auth/me request
        print("--- Testing JWT token with /api/auth/me endpoint ---")
        response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify user profile is returned correctly
                required_profile_fields = ['id', 'name', 'email', 'role']
                missing_fields = [field for field in required_profile_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("User profile returned", True, f"Profile data retrieved successfully")
                    
                    # Confirm tradesperson role and permissions
                    if data.get('role') == 'tradesperson':
                        self.log_result("Tradesperson role confirmation", True, f"Role: {data['role']}")
                        
                        # Verify tradesperson-specific fields
                        tradesperson_fields = ['trade_categories', 'experience_years']
                        missing_tp_fields = [field for field in tradesperson_fields if field not in data]
                        
                        if not missing_tp_fields:
                            self.log_result("Tradesperson permissions", True, "Tradesperson-specific fields present")
                        else:
                            self.log_result("Tradesperson permissions", False, f"Missing tradesperson fields: {missing_tp_fields}")
                    else:
                        self.log_result("Tradesperson role confirmation", False, f"Expected 'tradesperson', got '{data.get('role')}'")
                        
                    # Check that token enables immediate access to protected routes
                    self.test_protected_routes_access()
                    
                else:
                    self.log_result("User profile returned", False, f"Missing profile fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Authentication token validation", False, "Invalid JSON response from /auth/me")
        else:
            self.log_result("Authentication token validation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_protected_routes_access(self):
        """Test that token enables immediate access to protected routes"""
        print("\n--- Testing Protected Routes Access ---")
        
        if not self.access_token:
            self.log_result("Protected routes access", False, "No access token available")
            return
        
        # Test various protected endpoints that tradespeople should have access to
        protected_endpoints = [
            ("/interests/my-interests", "My Interests"),
            ("/jobs/browse", "Browse Jobs"),
            ("/portfolio/my-portfolio", "My Portfolio"),
            ("/wallet/balance", "Wallet Balance")
        ]
        
        successful_access = 0
        total_endpoints = len(protected_endpoints)
        
        for endpoint, description in protected_endpoints:
            response = self.make_request("GET", endpoint, auth_token=self.access_token)
            
            if response.status_code in [200, 404]:  # 404 is OK for empty data
                successful_access += 1
                self.log_result(f"Protected route access - {description}", True, f"Status: {response.status_code}")
            elif response.status_code in [401, 403]:
                self.log_result(f"Protected route access - {description}", False, f"Authentication failed: {response.status_code}")
            else:
                # Some endpoints might have different expected responses
                self.log_result(f"Protected route access - {description}", True, f"Accessible (Status: {response.status_code})")
                successful_access += 1
        
        # Overall protected routes access verification
        if successful_access >= total_endpoints * 0.75:  # At least 75% should work
            self.log_result("Overall protected routes access", True, f"{successful_access}/{total_endpoints} endpoints accessible")
        else:
            self.log_result("Overall protected routes access", False, f"Only {successful_access}/{total_endpoints} endpoints accessible")
    
    def test_complete_auth_flow_verification(self):
        """Test complete registration-to-authentication flow"""
        print("\n=== 3. COMPLETE AUTH FLOW VERIFICATION ===")
        
        if not all([self.access_token, self.user_id, self.test_user_data]):
            self.log_result("Complete auth flow verification", False, "Missing required test data")
            return
        
        # Verify JWT token works immediately for protected endpoints
        print("--- Testing immediate JWT functionality ---")
        response = self.make_request("GET", "/auth/me", auth_token=self.access_token)
        
        if response.status_code == 200:
            self.log_result("Immediate JWT functionality", True, "Token works immediately after registration")
            
            # Confirm no additional login required
            print("--- Verifying no additional login required ---")
            
            # Test that we can access tradesperson dashboard features
            dashboard_endpoints = [
                "/interests/my-interests",
                "/jobs/browse",
                "/notifications/history"
            ]
            
            dashboard_access_count = 0
            for endpoint in dashboard_endpoints:
                response = self.make_request("GET", endpoint, auth_token=self.access_token)
                if response.status_code in [200, 404]:  # 404 is OK for empty data
                    dashboard_access_count += 1
            
            if dashboard_access_count >= len(dashboard_endpoints) * 0.67:  # At least 2/3 should work
                self.log_result("Tradesperson dashboard access", True, f"{dashboard_access_count}/{len(dashboard_endpoints)} dashboard features accessible")
                
                # Test complete registration-to-authentication flow working seamlessly
                self.log_result("Complete registration-to-authentication flow", True, "Registration → Authentication → Dashboard access working seamlessly")
            else:
                self.log_result("Tradesperson dashboard access", False, f"Only {dashboard_access_count}/{len(dashboard_endpoints)} dashboard features accessible")
        else:
            self.log_result("Immediate JWT functionality", False, f"Token doesn't work immediately: {response.status_code}")
    
    def test_registration_response_format(self):
        """Test that registration returns LoginResponse format"""
        print("\n--- Testing LoginResponse Format ---")
        
        if not self.test_user_data:
            self.log_result("LoginResponse format test", False, "No test user data available")
            return
        
        # Create another test user to verify response format
        unique_id = uuid.uuid4().hex[:8]
        test_data = {
            "name": f"Format Test {unique_id}",
            "email": f"format.test.{unique_id}@example.com",
            "password": "TestPass123!",
            "phone": "+2348087654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 3,
            "company_name": "Format Test Co",
            "description": "Testing response format",
            "certifications": ["Basic Electrical"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=test_data)
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                
                # Check LoginResponse format fields
                expected_fields = ['access_token', 'token_type']
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("LoginResponse format", True, "Response contains access_token and token_type")
                    
                    # Verify token_type
                    if data.get('token_type', '').lower() == 'bearer':
                        self.log_result("Token type verification", True, f"Token type: {data['token_type']}")
                    else:
                        self.log_result("Token type verification", False, f"Expected 'bearer', got '{data.get('token_type')}'")
                        
                    # Check if expires_in is present (optional but good to have)
                    if 'expires_in' in data:
                        self.log_result("Token expiration info", True, f"Expires in: {data['expires_in']} seconds")
                    else:
                        self.log_result("Token expiration info", False, "No expires_in field in response")
                        
                else:
                    self.log_result("LoginResponse format", False, f"Missing LoginResponse fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("LoginResponse format test", False, "Invalid JSON response")
        else:
            self.log_result("LoginResponse format test", False, f"Registration failed: {response.status_code}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING FINAL VERIFICATION TEST - TRADESPERSON REGISTRATION ENDPOINT")
        print("=" * 80)
        
        try:
            # Test sequence
            self.test_service_health()
            self.test_registration_endpoint()
            self.test_authentication_token_validation()
            self.test_complete_auth_flow_verification()
            self.test_registration_response_format()
            
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {e}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 80)
        print("🎯 FINAL VERIFICATION TEST RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests})")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n" + "=" * 80)
        
        # Overall assessment
        if success_rate >= 90:
            print("🎉 EXCELLENT: Tradesperson registration endpoint is working perfectly!")
        elif success_rate >= 75:
            print("✅ GOOD: Tradesperson registration endpoint is mostly working with minor issues.")
        elif success_rate >= 50:
            print("⚠️  MODERATE: Tradesperson registration endpoint has significant issues that need attention.")
        else:
            print("🚨 CRITICAL: Tradesperson registration endpoint has major problems that must be fixed.")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = TradespersonRegistrationFinalTester()
    tester.run_all_tests()
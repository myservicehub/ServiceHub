#!/usr/bin/env python3
"""
CRITICAL AUTHENTICATION BUG INVESTIGATION
Testing authentication system where logged-in homeowners are being told 
"You must be logged in to post a job" even though they are authenticated.

Focus Areas:
1. JWT token validation and authentication chain
2. get_current_homeowner dependency functionality  
3. Bearer token validation
4. User role validation (homeowner vs tradesperson)
5. Edge cases: expired tokens, invalid tokens, missing tokens
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

class AuthenticationBugTester:
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
            
            print(f"🔍 Making {method} request to {endpoint}")
            if auth_token:
                print(f"   🔑 Using Bearer token: {auth_token[:20]}...")
            
            response = self.session.request(method, url, **kwargs)
            print(f"   📊 Response: {response.status_code}")
            
            return response
        except Exception as e:
            print(f"❌ Request failed: {e}")
            raise
    
    def test_homeowner_registration_and_login(self):
        """Test homeowner account creation and authentication"""
        print("\n=== 🏠 Testing Homeowner Registration & Authentication ===")
        
        # Create unique homeowner for testing
        homeowner_data = {
            "name": "Adebayo Johnson",
            "email": f"adebayo.test.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        # Test homeowner registration
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            registration_response = response.json()
            if (registration_response.get('user', {}).get('role') == 'homeowner' and 
                'access_token' in registration_response):
                self.log_result("Homeowner registration", True, 
                               f"ID: {registration_response['user']['id']}")
                self.test_data['homeowner_profile'] = registration_response['user']
                self.test_data['homeowner_credentials'] = {
                    'email': homeowner_data['email'],
                    'password': homeowner_data['password']
                }
                # Store access token from registration
                self.auth_tokens['homeowner'] = registration_response['access_token']
                self.test_data['homeowner_user'] = registration_response['user']
            else:
                self.log_result("Homeowner registration", False, "Invalid registration response structure")
        else:
            self.log_result("Homeowner registration", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test homeowner login (separate from registration)
        if 'homeowner_credentials' in self.test_data:
            login_data = self.test_data['homeowner_credentials']
            response = self.make_request("POST", "/auth/login", json=login_data)
            if response.status_code == 200:
                login_response = response.json()
                if ('access_token' in login_response and 
                    login_response.get('user', {}).get('role') == 'homeowner'):
                    self.log_result("Homeowner login", True, "Login successful with valid token")
                    # Update token from login (should be same as registration but testing both paths)
                    self.auth_tokens['homeowner_login'] = login_response['access_token']
                    self.test_data['homeowner_login_user'] = login_response['user']
                else:
                    self.log_result("Homeowner login", False, "Invalid login response structure")
            else:
                self.log_result("Homeowner login", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
    
    def test_authentication_endpoints(self):
        """Test authentication verification endpoints"""
        print("\n=== 🔐 Testing Authentication Verification Endpoints ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Authentication endpoint tests", False, "No homeowner token available")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test /auth/me endpoint with valid token
        response = self.make_request("GET", "/auth/me", auth_token=homeowner_token)
        if response.status_code == 200:
            profile = response.json()
            if (profile.get('role') == 'homeowner' and 
                profile.get('id') == self.test_data.get('homeowner_user', {}).get('id')):
                self.log_result("GET /auth/me with valid token", True, 
                               f"Role: {profile['role']}, Name: {profile['name']}")
                self.test_data['auth_me_profile'] = profile
            else:
                self.log_result("GET /auth/me with valid token", False, 
                               f"Profile mismatch or wrong role: {profile.get('role')}")
        else:
            self.log_result("GET /auth/me with valid token", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test /auth/me endpoint without token
        response = self.make_request("GET", "/auth/me")
        if response.status_code in [401, 403]:
            self.log_result("GET /auth/me without token", True, 
                           f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("GET /auth/me without token", False, 
                           f"Expected 401/403, got {response.status_code}")
        
        # Test /auth/me endpoint with invalid token
        response = self.make_request("GET", "/auth/me", auth_token="invalid_token_12345")
        if response.status_code in [401, 403]:
            self.log_result("GET /auth/me with invalid token", True, 
                           f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("GET /auth/me with invalid token", False, 
                           f"Expected 401/403, got {response.status_code}")
        
        # Test /auth/me endpoint with malformed Bearer token
        response = self.make_request("GET", "/auth/me", auth_token="")
        if response.status_code in [401, 403, 422]:
            self.log_result("GET /auth/me with empty token", True, 
                           f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("GET /auth/me with empty token", False, 
                           f"Expected 401/403/422, got {response.status_code}")
    
    def test_job_posting_authentication(self):
        """Test job posting endpoint with authentication - THE CRITICAL BUG AREA"""
        print("\n=== 🚨 Testing Job Posting Authentication (CRITICAL BUG AREA) ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job posting authentication tests", False, "No homeowner token available")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data.get('homeowner_user', {})
        
        # Test job creation with proper authentication - THIS IS WHERE THE BUG OCCURS
        job_data = {
            "title": "Bathroom Plumbing Installation - Authentication Test",
            "description": "Testing job posting with proper authentication. This should work if authentication is functioning correctly.",
            "category": "Plumbing",
            "state": "Lagos",
            "lga": "Lagos Island",
            "town": "Victoria Island",
            "zip_code": "101001",
            "home_address": "123 Test Street, Victoria Island",
            "budget_min": 200000,
            "budget_max": 400000,
            "timeline": "Within 2 weeks",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        print(f"🔍 Testing job creation with homeowner token")
        print(f"   👤 Homeowner: {homeowner_user.get('name')} ({homeowner_user.get('email')})")
        print(f"   🔑 Token: {homeowner_token[:30]}...")
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        
        if response.status_code == 200:
            created_job = response.json()
            if ('id' in created_job and 
                created_job['title'] == job_data['title'] and
                created_job.get('homeowner', {}).get('email') == homeowner_user.get('email')):
                self.log_result("✅ CRITICAL: Job creation with authentication", True, 
                               f"Job ID: {created_job['id']}")
                self.test_data['created_job'] = created_job
                print(f"   ✅ Job successfully created by authenticated homeowner")
                print(f"   📋 Job details: {created_job.get('title')}")
                print(f"   👤 Job owner: {created_job.get('homeowner', {}).get('name')}")
            else:
                self.log_result("❌ CRITICAL: Job creation with authentication", False, 
                               "Job created but with incorrect data")
                print(f"   ❌ Job creation response: {response.text}")
        elif response.status_code in [401, 403]:
            self.log_result("❌ CRITICAL: Job creation with authentication", False, 
                           f"🚨 BUG CONFIRMED: Authenticated homeowner rejected with {response.status_code}")
            print(f"   🚨 THIS IS THE BUG: Homeowner with valid token getting: {response.text}")
            print(f"   🔍 Token being used: {homeowner_token[:50]}...")
            print(f"   👤 User data: {homeowner_user}")
        else:
            self.log_result("❌ CRITICAL: Job creation with authentication", False, 
                           f"Unexpected status: {response.status_code}, Response: {response.text}")
        
        # Test job creation without authentication
        response = self.make_request("POST", "/jobs/", json=job_data)
        if response.status_code in [401, 403]:
            self.log_result("Job creation without authentication", True, 
                           f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("Job creation without authentication", False, 
                           f"Expected 401/403, got {response.status_code}")
        
        # Test job creation with invalid token
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token="invalid_token")
        if response.status_code in [401, 403]:
            self.log_result("Job creation with invalid token", True, 
                           f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("Job creation with invalid token", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_role_based_authentication(self):
        """Test role-based access control"""
        print("\n=== 👥 Testing Role-Based Authentication ===")
        
        # Create a tradesperson account for role testing
        tradesperson_data = {
            "name": "Emeka Okafor",
            "email": f"emeka.test.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Abuja",
            "postcode": "900001",
            "trade_categories": ["Plumbing"],
            "experience_years": 5,
            "company_name": "Test Plumbing Services",
            "description": "Professional plumber for testing.",
            "certifications": ["Licensed Plumber"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            if tradesperson_profile.get('role') == 'tradesperson':
                self.log_result("Tradesperson registration", True, 
                               f"ID: {tradesperson_profile['id']}")
                
                # Login tradesperson to get token
                login_data = {
                    'email': tradesperson_data['email'],
                    'password': tradesperson_data['password']
                }
                response = self.make_request("POST", "/auth/login", json=login_data)
                if response.status_code == 200:
                    login_response = response.json()
                    self.auth_tokens['tradesperson'] = login_response['access_token']
                    self.test_data['tradesperson_user'] = login_response['user']
                    self.log_result("Tradesperson login", True, "Login successful")
                else:
                    self.log_result("Tradesperson login", False, f"Status: {response.status_code}")
            else:
                self.log_result("Tradesperson registration", False, "Invalid role in response")
        else:
            self.log_result("Tradesperson registration", False, f"Status: {response.status_code}")
        
        # Test tradesperson trying to create job (should fail)
        if 'tradesperson' in self.auth_tokens:
            job_data = {
                "title": "Test Job by Tradesperson",
                "description": "This should fail",
                "category": "Plumbing",
                "state": "Lagos",
                "lga": "Lagos Island", 
                "town": "Victoria Island",
                "zip_code": "101001",
                "home_address": "123 Test Street",
                "budget_min": 100000,
                "budget_max": 200000,
                "timeline": "Within 1 week",
                "homeowner_name": "Test Name",
                "homeowner_email": "test@example.com",
                "homeowner_phone": "08123456789"
            }
            
            response = self.make_request("POST", "/jobs/", json=job_data, 
                                       auth_token=self.auth_tokens['tradesperson'])
            if response.status_code == 403:
                self.log_result("Tradesperson job creation prevention", True, 
                               "Correctly prevented tradesperson from creating jobs")
            else:
                self.log_result("Tradesperson job creation prevention", False, 
                               f"Expected 403, got {response.status_code}")
        
        # Test homeowner accessing tradesperson-only endpoints
        if 'homeowner' in self.auth_tokens:
            response = self.make_request("GET", "/jobs/for-tradesperson", 
                                       auth_token=self.auth_tokens['homeowner'])
            if response.status_code == 403:
                self.log_result("Homeowner tradesperson endpoint prevention", True, 
                               "Correctly prevented homeowner from accessing tradesperson endpoints")
            else:
                self.log_result("Homeowner tradesperson endpoint prevention", False, 
                               f"Expected 403, got {response.status_code}")
    
    def test_token_edge_cases(self):
        """Test edge cases with JWT tokens"""
        print("\n=== 🔍 Testing Token Edge Cases ===")
        
        # Test with malformed Authorization header
        malformed_headers = [
            "Bearer",  # Missing token
            "bearer token123",  # Wrong case
            "Token abc123",  # Wrong scheme
            "Bearer ",  # Empty token
            "Bearer token with spaces",  # Invalid token format
        ]
        
        for i, auth_header in enumerate(malformed_headers):
            response = self.session.get(
                f"{self.base_url}/auth/me",
                headers={"Authorization": auth_header}
            )
            if response.status_code in [401, 403, 422]:
                self.log_result(f"Malformed auth header {i+1}", True, 
                               f"Correctly rejected '{auth_header}' with {response.status_code}")
            else:
                self.log_result(f"Malformed auth header {i+1}", False, 
                               f"Expected 401/403/422 for '{auth_header}', got {response.status_code}")
        
        # Test with expired token (simulate by creating token with past expiry)
        # Note: This would require creating a token with past expiry, which is complex
        # For now, we'll test with a clearly invalid token format
        invalid_tokens = [
            "clearly_invalid_token",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid",  # Invalid JWT
            "a.b.c",  # Invalid JWT structure
        ]
        
        for i, token in enumerate(invalid_tokens):
            response = self.make_request("GET", "/auth/me", auth_token=token)
            if response.status_code in [401, 403]:
                self.log_result(f"Invalid token format {i+1}", True, 
                               f"Correctly rejected invalid token with {response.status_code}")
            else:
                self.log_result(f"Invalid token format {i+1}", False, 
                               f"Expected 401/403, got {response.status_code}")
    
    def test_my_jobs_endpoint(self):
        """Test the /my-jobs endpoint authentication"""
        print("\n=== 📋 Testing /my-jobs Endpoint Authentication ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("My jobs endpoint tests", False, "No homeowner token available")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test accessing my-jobs with valid homeowner token
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=homeowner_token)
        if response.status_code == 200:
            data = response.json()
            if 'jobs' in data and 'pagination' in data:
                self.log_result("GET /jobs/my-jobs with homeowner token", True, 
                               f"Found {len(data['jobs'])} jobs")
            else:
                self.log_result("GET /jobs/my-jobs with homeowner token", False, 
                               "Invalid response structure")
        else:
            self.log_result("GET /jobs/my-jobs with homeowner token", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test accessing my-jobs without token
        response = self.make_request("GET", "/jobs/my-jobs")
        if response.status_code in [401, 403]:
            self.log_result("GET /jobs/my-jobs without token", True, 
                           f"Correctly rejected with {response.status_code}")
        else:
            self.log_result("GET /jobs/my-jobs without token", False, 
                           f"Expected 401/403, got {response.status_code}")
        
        # Test accessing my-jobs with tradesperson token (should fail)
        if 'tradesperson' in self.auth_tokens:
            response = self.make_request("GET", "/jobs/my-jobs", 
                                       auth_token=self.auth_tokens['tradesperson'])
            if response.status_code == 403:
                self.log_result("GET /jobs/my-jobs with tradesperson token", True, 
                               "Correctly prevented tradesperson access")
            else:
                self.log_result("GET /jobs/my-jobs with tradesperson token", False, 
                               f"Expected 403, got {response.status_code}")
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting Critical Authentication Bug Investigation")
        print("=" * 80)
        
        try:
            self.test_homeowner_registration_and_login()
            self.test_authentication_endpoints()
            self.test_job_posting_authentication()  # CRITICAL TEST
            self.test_role_based_authentication()
            self.test_token_edge_cases()
            self.test_my_jobs_endpoint()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("🔍 AUTHENTICATION BUG INVESTIGATION SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print(f"\n🚨 CRITICAL ISSUES FOUND:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        if self.results['failed'] == 0:
            print(f"\n🎉 ALL TESTS PASSED - Authentication system working correctly")
        else:
            print(f"\n⚠️  AUTHENTICATION ISSUES DETECTED - Investigation needed")
        
        return self.results

if __name__ == "__main__":
    tester = AuthenticationBugTester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    exit(0 if results['failed'] == 0 else 1)
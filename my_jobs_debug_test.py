#!/usr/bin/env python3
"""
MY JOBS LOADING ISSUE DEBUG TEST

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Debug the My Jobs loading issue that the user is experiencing. The frontend shows "Failed to load jobs" error 
but the API seems to work when tested directly.

**Test the complete flow:**

1. **Authentication Flow Test**:
   - Test login with servicehub9ja@gmail.com / Password123!
   - Verify the token is valid and not expired
   - Test the /api/auth/me endpoint to verify user role and authentication

2. **My Jobs API Test**:
   - Test /api/jobs/my-jobs with the valid token
   - Verify the response format matches what the frontend expects
   - Check for any CORS issues or API response format changes

3. **User Role Verification**:
   - Verify the user role is "homeowner" (required for My Jobs page)
   - Check if the jobs belong to the correct user

4. **Response Format Analysis**:
   - Compare the API response structure with what the frontend expects
   - Check if there are any null values or missing fields causing issues
   - Verify pagination structure

5. **Error Scenario Testing**:
   - Test with invalid/expired tokens
   - Test with non-homeowner users
   - Test various error conditions

The goal is to identify why the frontend shows "Failed to load jobs" when the API appears to be working correctly in direct tests.
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

class MyJobsDebugTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.user_token = None
        self.user_id = None
        self.user_data = None
        
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
    
    def test_authentication_flow(self):
        """Test authentication flow with the specific user credentials"""
        print("\n=== Testing Authentication Flow ===")
        
        # Test 1: Login with servicehub9ja@gmail.com / Password123!
        print(f"\n--- Test 1: Login with Specific Credentials ---")
        login_data = {
            "email": "servicehub9ja@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.user_token = data.get('access_token')
                self.user_data = data.get('user', {})
                self.user_id = self.user_data.get('id')
                
                if self.user_token:
                    self.log_result("Login authentication", True, f"Token obtained, User ID: {self.user_id}")
                    
                    # Verify token structure (JWT should have 3 parts)
                    token_parts = self.user_token.split('.')
                    if len(token_parts) == 3:
                        self.log_result("JWT token structure", True, f"Valid JWT with {len(token_parts)} parts")
                    else:
                        self.log_result("JWT token structure", False, f"Invalid JWT structure: {len(token_parts)} parts")
                        
                    # Check user role
                    user_role = self.user_data.get('role')
                    if user_role == 'homeowner':
                        self.log_result("User role verification", True, f"Role: {user_role}")
                    else:
                        self.log_result("User role verification", False, f"Expected 'homeowner', got '{user_role}'")
                        
                    # Check user status
                    user_status = self.user_data.get('status')
                    if user_status == 'active':
                        self.log_result("User status verification", True, f"Status: {user_status}")
                    else:
                        self.log_result("User status verification", False, f"User status: {user_status}")
                        
                else:
                    self.log_result("Login authentication", False, "No access token in response")
                    
            except json.JSONDecodeError:
                self.log_result("Login authentication", False, "Invalid JSON response")
        else:
            self.log_result("Login authentication", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        # Test 2: Verify token with /api/auth/me endpoint
        print(f"\n--- Test 2: Token Verification with /auth/me ---")
        if self.user_token:
            response = self.make_request("GET", "/auth/me", auth_token=self.user_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify user data consistency
                    if data.get('id') == self.user_id and data.get('email') == 'servicehub9ja@gmail.com':
                        self.log_result("Token validation", True, f"User data consistent: {data.get('name')}")
                        
                        # Update user data with complete info
                        self.user_data = data
                        
                        # Check required fields for My Jobs functionality
                        required_fields = ['id', 'email', 'role', 'name']
                        missing_fields = [field for field in required_fields if field not in data]
                        
                        if not missing_fields:
                            self.log_result("User data completeness", True, "All required fields present")
                        else:
                            self.log_result("User data completeness", False, f"Missing fields: {missing_fields}")
                            
                    else:
                        self.log_result("Token validation", False, "User data inconsistency")
                        
                except json.JSONDecodeError:
                    self.log_result("Token validation", False, "Invalid JSON response")
            else:
                self.log_result("Token validation", False, f"Status: {response.status_code}, Response: {response.text}")
        else:
            self.log_result("Token validation", False, "No token available for validation")
    
    def test_my_jobs_api_endpoint(self):
        """Test the My Jobs API endpoint with detailed analysis"""
        print("\n=== Testing My Jobs API Endpoint ===")
        
        if not self.user_token:
            self.log_result("My Jobs API test", False, "No authentication token available")
            return
        
        # Test 1: Basic My Jobs API call
        print(f"\n--- Test 1: Basic My Jobs API Call ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Analyze response structure
                print(f"Response structure analysis:")
                print(f"  - Response type: {type(data)}")
                print(f"  - Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
                # Check for expected structure
                if isinstance(data, dict):
                    # Check for jobs array
                    if 'jobs' in data:
                        jobs = data['jobs']
                        self.log_result("My Jobs response structure", True, f"Found 'jobs' key with {len(jobs)} jobs")
                        
                        # Analyze job structure if jobs exist
                        if jobs and len(jobs) > 0:
                            first_job = jobs[0]
                            print(f"  - First job keys: {list(first_job.keys())}")
                            
                            # Check for required job fields
                            required_job_fields = ['id', 'title', 'status', 'created_at']
                            missing_job_fields = [field for field in required_job_fields if field not in first_job]
                            
                            if not missing_job_fields:
                                self.log_result("Job data structure", True, f"Job has all required fields")
                            else:
                                self.log_result("Job data structure", False, f"Missing job fields: {missing_job_fields}")
                                
                            # Check for null values that might cause frontend issues
                            null_fields = [key for key, value in first_job.items() if value is None]
                            if null_fields:
                                self.log_result("Job null values check", False, f"Found null fields: {null_fields}")
                            else:
                                self.log_result("Job null values check", True, "No null values in job data")
                                
                        else:
                            self.log_result("Jobs data", True, "No jobs found (empty state)")
                            
                        # Check for pagination fields
                        pagination_fields = ['total', 'page', 'limit', 'total_pages']
                        found_pagination = [field for field in pagination_fields if field in data]
                        
                        if found_pagination:
                            self.log_result("Pagination structure", True, f"Found pagination fields: {found_pagination}")
                        else:
                            self.log_result("Pagination structure", False, "No pagination fields found")
                            
                        # Check for statistics
                        if 'statistics' in data:
                            stats = data['statistics']
                            self.log_result("Job statistics", True, f"Statistics: {stats}")
                        else:
                            self.log_result("Job statistics", False, "No statistics in response")
                            
                    else:
                        self.log_result("My Jobs response structure", False, "Missing 'jobs' key in response")
                        
                else:
                    self.log_result("My Jobs response structure", False, f"Response is not a dict: {type(data)}")
                    
            except json.JSONDecodeError:
                self.log_result("My Jobs API test", False, "Invalid JSON response")
        else:
            self.log_result("My Jobs API test", False, f"Status: {response.status_code}, Response: {response.text}")
            
            # If failed, check response headers for CORS issues
            print(f"Response headers: {dict(response.headers)}")
    
    def test_response_format_analysis(self):
        """Detailed analysis of response format for frontend compatibility"""
        print("\n=== Testing Response Format Analysis ===")
        
        if not self.user_token:
            self.log_result("Response format analysis", False, "No authentication token available")
            return
        
        # Test with different parameters to see response variations
        test_cases = [
            {"params": {}, "name": "Default parameters"},
            {"params": {"page": 1, "limit": 10}, "name": "With pagination"},
            {"params": {"status": "active"}, "name": "With status filter"},
            {"params": {"page": 1, "limit": 5, "status": "active"}, "name": "Full parameters"}
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n--- Test {i}: {test_case['name']} ---")
            
            # Build query string
            params = test_case['params']
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            endpoint = f"/jobs/my-jobs?{query_string}" if query_string else "/jobs/my-jobs"
            
            response = self.make_request("GET", endpoint, auth_token=self.user_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check response consistency
                    if isinstance(data, dict) and 'jobs' in data:
                        jobs_count = len(data['jobs'])
                        total = data.get('total', 'N/A')
                        page = data.get('page', 'N/A')
                        limit = data.get('limit', 'N/A')
                        
                        self.log_result(f"Format test - {test_case['name']}", True, 
                                      f"Jobs: {jobs_count}, Total: {total}, Page: {page}, Limit: {limit}")
                        
                        # Check for data type consistency
                        if jobs_count > 0:
                            job = data['jobs'][0]
                            
                            # Check date formats
                            date_fields = ['created_at', 'updated_at']
                            for date_field in date_fields:
                                if date_field in job:
                                    date_value = job[date_field]
                                    if isinstance(date_value, str):
                                        try:
                                            # Try to parse ISO format
                                            datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                                            self.log_result(f"Date format - {date_field}", True, f"Valid ISO format: {date_value}")
                                        except ValueError:
                                            self.log_result(f"Date format - {date_field}", False, f"Invalid date format: {date_value}")
                                    else:
                                        self.log_result(f"Date format - {date_field}", False, f"Date is not string: {type(date_value)}")
                                        
                    else:
                        self.log_result(f"Format test - {test_case['name']}", False, "Invalid response structure")
                        
                except json.JSONDecodeError:
                    self.log_result(f"Format test - {test_case['name']}", False, "Invalid JSON response")
            else:
                self.log_result(f"Format test - {test_case['name']}", False, f"Status: {response.status_code}")
    
    def test_error_scenarios(self):
        """Test various error scenarios that might cause frontend issues"""
        print("\n=== Testing Error Scenarios ===")
        
        # Test 1: Invalid/expired token
        print(f"\n--- Test 1: Invalid Token ---")
        invalid_token = "invalid.jwt.token"
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=invalid_token)
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token handling", True, f"Correctly rejected invalid token: {response.status_code}")
        else:
            self.log_result("Invalid token handling", False, f"Unexpected status: {response.status_code}")
        
        # Test 2: No token
        print(f"\n--- Test 2: No Authentication Token ---")
        response = self.make_request("GET", "/jobs/my-jobs")
        
        if response.status_code in [401, 403]:
            self.log_result("No token handling", True, f"Correctly rejected no token: {response.status_code}")
        else:
            self.log_result("No token handling", False, f"Unexpected status: {response.status_code}")
        
        # Test 3: Malformed token
        print(f"\n--- Test 3: Malformed Token ---")
        malformed_token = "not.a.valid.jwt.token.structure"
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=malformed_token)
        
        if response.status_code in [401, 403]:
            self.log_result("Malformed token handling", True, f"Correctly rejected malformed token: {response.status_code}")
        else:
            self.log_result("Malformed token handling", False, f"Unexpected status: {response.status_code}")
        
        # Test 4: Test with tradesperson token (if we can create one)
        print(f"\n--- Test 4: Wrong User Role (Tradesperson) ---")
        # Try to login as a tradesperson to test role-based access
        tradesperson_login = {
            "email": "john.plumber@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=tradesperson_login)
        
        if response.status_code == 200:
            try:
                data = response.json()
                tradesperson_token = data.get('access_token')
                
                if tradesperson_token:
                    # Test My Jobs with tradesperson token
                    response = self.make_request("GET", "/jobs/my-jobs", auth_token=tradesperson_token)
                    
                    if response.status_code == 403:
                        self.log_result("Wrong role handling", True, "Correctly rejected tradesperson access")
                    elif response.status_code == 200:
                        # Some APIs might allow this but return empty results
                        try:
                            data = response.json()
                            if data.get('jobs', []) == []:
                                self.log_result("Wrong role handling", True, "Tradesperson gets empty results")
                            else:
                                self.log_result("Wrong role handling", False, "Tradesperson should not see homeowner jobs")
                        except json.JSONDecodeError:
                            self.log_result("Wrong role handling", False, "Invalid JSON response")
                    else:
                        self.log_result("Wrong role handling", False, f"Unexpected status: {response.status_code}")
                else:
                    self.log_result("Tradesperson login for role test", False, "No token received")
                    
            except json.JSONDecodeError:
                self.log_result("Tradesperson login for role test", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson login for role test", False, f"Login failed: {response.status_code}")
    
    def test_cors_and_headers(self):
        """Test CORS and response headers that might affect frontend"""
        print("\n=== Testing CORS and Headers ===")
        
        if not self.user_token:
            self.log_result("CORS and headers test", False, "No authentication token available")
            return
        
        # Test with Origin header (simulating frontend request)
        print(f"\n--- Test 1: CORS Headers ---")
        headers = {
            'Origin': 'https://trademe-platform.preview.emergentagent.com',
            'Referer': 'https://trademe-platform.preview.emergentagent.com/my-jobs'
        }
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token, headers=headers)
        
        if response.status_code == 200:
            # Check CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            print(f"CORS Headers: {cors_headers}")
            
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_result("CORS headers present", True, f"Origin: {cors_headers['Access-Control-Allow-Origin']}")
            else:
                self.log_result("CORS headers present", False, "No CORS headers found")
                
            # Check Content-Type
            content_type = response.headers.get('Content-Type')
            if content_type and 'application/json' in content_type:
                self.log_result("Content-Type header", True, f"Content-Type: {content_type}")
            else:
                self.log_result("Content-Type header", False, f"Unexpected Content-Type: {content_type}")
                
        else:
            self.log_result("CORS test request", False, f"Status: {response.status_code}")
    
    def test_network_timing(self):
        """Test network timing and performance that might affect frontend"""
        print("\n=== Testing Network Timing ===")
        
        if not self.user_token:
            self.log_result("Network timing test", False, "No authentication token available")
            return
        
        # Test multiple requests to check for consistency
        response_times = []
        
        for i in range(3):
            print(f"\n--- Test {i+1}: Response Time Measurement ---")
            start_time = time.time()
            
            response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token)
            
            end_time = time.time()
            response_time = end_time - start_time
            response_times.append(response_time)
            
            if response.status_code == 200:
                self.log_result(f"Response time test {i+1}", True, f"Response time: {response_time:.3f}s")
            else:
                self.log_result(f"Response time test {i+1}", False, f"Status: {response.status_code}")
        
        # Calculate average response time
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            print(f"\nResponse Time Analysis:")
            print(f"  - Average: {avg_response_time:.3f}s")
            print(f"  - Maximum: {max_response_time:.3f}s")
            print(f"  - Minimum: {min_response_time:.3f}s")
            
            if avg_response_time < 2.0:
                self.log_result("Average response time", True, f"Good performance: {avg_response_time:.3f}s")
            else:
                self.log_result("Average response time", False, f"Slow response: {avg_response_time:.3f}s")
    
    def test_data_integrity(self):
        """Test data integrity and consistency"""
        print("\n=== Testing Data Integrity ===")
        
        if not self.user_token:
            self.log_result("Data integrity test", False, "No authentication token available")
            return
        
        # Get My Jobs data
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'jobs' in data and data['jobs']:
                    jobs = data['jobs']
                    
                    # Test data consistency across multiple calls
                    print(f"\n--- Test 1: Data Consistency Across Calls ---")
                    
                    # Make second call
                    response2 = self.make_request("GET", "/jobs/my-jobs", auth_token=self.user_token)
                    
                    if response2.status_code == 200:
                        try:
                            data2 = response2.json()
                            
                            if data == data2:
                                self.log_result("Data consistency", True, "Data identical across calls")
                            else:
                                self.log_result("Data consistency", False, "Data differs between calls")
                                
                        except json.JSONDecodeError:
                            self.log_result("Data consistency", False, "Invalid JSON in second call")
                    else:
                        self.log_result("Data consistency", False, f"Second call failed: {response2.status_code}")
                    
                    # Test individual job data integrity
                    print(f"\n--- Test 2: Individual Job Data Integrity ---")
                    
                    for i, job in enumerate(jobs[:3]):  # Test first 3 jobs
                        job_id = job.get('id')
                        
                        if job_id:
                            # Check if job belongs to the authenticated user
                            homeowner_id = job.get('homeowner_id')
                            
                            if homeowner_id == self.user_id:
                                self.log_result(f"Job {i+1} ownership", True, f"Job belongs to user")
                            else:
                                self.log_result(f"Job {i+1} ownership", False, f"Job belongs to different user: {homeowner_id}")
                                
                            # Check required fields
                            required_fields = ['id', 'title', 'status']
                            missing_fields = [field for field in required_fields if not job.get(field)]
                            
                            if not missing_fields:
                                self.log_result(f"Job {i+1} required fields", True, "All required fields present")
                            else:
                                self.log_result(f"Job {i+1} required fields", False, f"Missing: {missing_fields}")
                        else:
                            self.log_result(f"Job {i+1} ID", False, "Job missing ID")
                            
                else:
                    self.log_result("Data integrity test", True, "No jobs to test (empty state)")
                    
            except json.JSONDecodeError:
                self.log_result("Data integrity test", False, "Invalid JSON response")
        else:
            self.log_result("Data integrity test", False, f"Status: {response.status_code}")
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🔍 STARTING MY JOBS LOADING ISSUE DEBUG TEST")
        print("=" * 60)
        
        # Run all test methods
        self.test_service_health()
        self.test_authentication_flow()
        self.test_my_jobs_api_endpoint()
        self.test_response_format_analysis()
        self.test_error_scenarios()
        self.test_cors_and_headers()
        self.test_network_timing()
        self.test_data_integrity()
        
        # Print final results
        print("\n" + "=" * 60)
        print("🎯 MY JOBS DEBUG TEST RESULTS")
        print("=" * 60)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 CRITICAL ISSUES IDENTIFIED:")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        # Provide diagnosis
        print(f"\n🔍 DIAGNOSIS:")
        if self.results['failed'] == 0:
            print("  ✅ All tests passed - API appears to be working correctly")
            print("  💡 Issue might be frontend-specific (JavaScript errors, state management, etc.)")
        else:
            print("  🚨 Issues found in backend API that could cause frontend failures")
            print("  💡 Focus on fixing the failed tests above")
        
        return self.results

if __name__ == "__main__":
    tester = MyJobsDebugTester()
    results = tester.run_comprehensive_test()
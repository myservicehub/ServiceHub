#!/usr/bin/env python3
"""
SERVICEHUB COMPREHENSIVE BACKEND TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Perform comprehensive backend testing for the ServiceHub application. Test all major API endpoints including:

1. **Authentication System**:
   - Login endpoint with real user credentials (servicehub9ja@gmail.com / Password123!)
   - Registration endpoints for both homeowners and tradespeople
   - JWT token validation
   - Protected endpoints access

2. **Core API Endpoints**:
   - /api/health (health check)
   - /api/stats (site statistics)
   - /api/admin/trades (trade categories)
   - /api/jobs/locations/states (location data)
   - /api/reviews/featured (reviews)
   - /api/database-info (database connectivity)
   - /api/users-summary (user data)

3. **Database Operations**:
   - Verify MongoDB connection is stable
   - Check data integrity across collections (users: 82, jobs: 25, interests: 15, reviews: 40)
   - Test CRUD operations on critical collections

4. **Service Health**:
   - Backend service status (should be RUNNING)
   - Response times and error rates
   - Memory and performance check

5. **API Security & Validation**:
   - Input validation on forms
   - CORS configuration
   - Error handling and responses

Current setup shows backend is running on port 8001 with MongoDB connection established. Database contains real user data and sample data. Test with both successful and failure scenarios to ensure robust error handling.
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
BACKEND_URL = "https://nigconnect.preview.emergentagent.com/api"

class ServiceHubBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.auth_token = None
        self.homeowner_token = None
        self.tradesperson_token = None
        
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
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'status' in data and data['status'] == 'healthy':
                    self.log_result("Health check endpoint", True, f"Service healthy: {data}")
                else:
                    self.log_result("Health check endpoint", False, "Invalid health response")
            except json.JSONDecodeError:
                self.log_result("Health check endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Health check endpoint", False, f"Status: {response.status_code}")
        
        # Test root endpoint
        response = self.make_request("GET", "/")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data and 'status' in data:
                    self.log_result("Root API endpoint", True, f"API running: {data['message']}")
                else:
                    self.log_result("Root API endpoint", False, "Invalid response structure")
            except json.JSONDecodeError:
                self.log_result("Root API endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Root API endpoint", False, f"Status: {response.status_code}")
    
    def test_database_connectivity(self):
        """Test database connectivity and data integrity"""
        print("\n=== Testing Database Connectivity ===")
        
        # Test database info endpoint
        response = self.make_request("GET", "/database-info")
        if response.status_code == 200:
            try:
                data = response.json()
                collections = data.get('collections', {})
                
                # Check expected collection counts
                expected_counts = {
                    'users': 82,
                    'jobs': 25,
                    'interests': 15,
                    'reviews': 40
                }
                
                all_counts_valid = True
                for collection, expected_count in expected_counts.items():
                    actual_count = collections.get(collection, 0)
                    if actual_count >= expected_count:
                        self.log_result(f"Database {collection} count", True, f"Found {actual_count} (expected >= {expected_count})")
                    else:
                        self.log_result(f"Database {collection} count", False, f"Found {actual_count} (expected >= {expected_count})")
                        all_counts_valid = False
                
                # Check sample data
                sample_data = data.get('sample_data', {})
                if 'sample_user' in sample_data and 'sample_job' in sample_data:
                    self.log_result("Database sample data", True, "Sample user and job data available")
                else:
                    self.log_result("Database sample data", False, "Missing sample data")
                    
            except json.JSONDecodeError:
                self.log_result("Database info endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Database info endpoint", False, f"Status: {response.status_code}")
        
        # Test users summary endpoint
        response = self.make_request("GET", "/users-summary")
        if response.status_code == 200:
            try:
                data = response.json()
                total_users = data.get('total_users', 0)
                homeowners = data.get('homeowners', 0)
                tradespeople = data.get('tradespeople', 0)
                
                if total_users >= 82:
                    self.log_result("Users summary endpoint", True, f"Total: {total_users}, Homeowners: {homeowners}, Tradespeople: {tradespeople}")
                else:
                    self.log_result("Users summary endpoint", False, f"Expected >= 82 users, found {total_users}")
                    
            except json.JSONDecodeError:
                self.log_result("Users summary endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Users summary endpoint", False, f"Status: {response.status_code}")
    
    def test_authentication_system(self):
        """Test authentication system with real credentials"""
        print("\n=== Testing Authentication System ===")
        
        # Test login with real credentials
        login_data = {
            "email": "servicehub9ja@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        if response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data:
                    self.auth_token = data['access_token']
                    self.log_result("Login with real credentials", True, f"Token obtained: {self.auth_token[:20]}...")
                    
                    # Verify token structure (JWT should have 3 parts)
                    token_parts = self.auth_token.split('.')
                    if len(token_parts) == 3:
                        self.log_result("JWT token structure", True, "Valid 3-part JWT token")
                    else:
                        self.log_result("JWT token structure", False, f"Invalid token structure: {len(token_parts)} parts")
                        
                else:
                    self.log_result("Login with real credentials", False, "No access token in response")
            except json.JSONDecodeError:
                self.log_result("Login with real credentials", False, "Invalid JSON response")
        else:
            self.log_result("Login with real credentials", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test JWT token validation
        if self.auth_token:
            response = self.make_request("GET", "/auth/me", auth_token=self.auth_token)
            if response.status_code == 200:
                try:
                    data = response.json()
                    if 'id' in data and 'email' in data:
                        self.log_result("JWT token validation", True, f"User: {data.get('email')}, Role: {data.get('role')}")
                    else:
                        self.log_result("JWT token validation", False, "Invalid user data structure")
                except json.JSONDecodeError:
                    self.log_result("JWT token validation", False, "Invalid JSON response")
            else:
                self.log_result("JWT token validation", False, f"Status: {response.status_code}")
        
        # Test invalid credentials
        invalid_login_data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/login", json=invalid_login_data)
        if response.status_code == 401:
            self.log_result("Invalid credentials rejection", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid credentials rejection", False, f"Expected 401, got {response.status_code}")
        
        # Test protected endpoint without token
        response = self.make_request("GET", "/auth/me")
        if response.status_code in [401, 403]:
            self.log_result("Protected endpoint security", True, "Correctly rejected request without token")
        else:
            self.log_result("Protected endpoint security", False, f"Expected 401/403, got {response.status_code}")
    
    def test_registration_endpoints(self):
        """Test registration endpoints for both user types"""
        print("\n=== Testing Registration Endpoints ===")
        
        # Test homeowner registration
        homeowner_data = {
            "name": "Test Homeowner Backend",
            "email": f"homeowner.backend.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.homeowner_token = data['access_token']
                    self.log_result("Homeowner registration", True, f"User ID: {data['user'].get('id')}")
                else:
                    self.log_result("Homeowner registration", False, "Missing token or user data")
            except json.JSONDecodeError:
                self.log_result("Homeowner registration", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner registration", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test tradesperson registration
        tradesperson_data = {
            "name": "Test Tradesperson Backend",
            "email": f"tradesperson.backend.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348087654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 5,
            "company_name": "Test Electrical Services",
            "description": "Professional electrician with over 5 years of experience in residential and commercial electrical work. Specializing in wiring, repairs, and installations."
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data:
                    self.tradesperson_token = data['access_token']
                    self.log_result("Tradesperson registration", True, f"User ID: {data.get('id')}")
                else:
                    self.log_result("Tradesperson registration", False, "Missing token")
            except json.JSONDecodeError:
                self.log_result("Tradesperson registration", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson registration", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test registration validation
        invalid_registration = {
            "name": "Test",
            "email": "invalid-email",
            "password": "weak"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=invalid_registration)
        if response.status_code in [400, 422]:
            self.log_result("Registration validation", True, "Correctly rejected invalid registration data")
        else:
            self.log_result("Registration validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_core_api_endpoints(self):
        """Test core API endpoints"""
        print("\n=== Testing Core API Endpoints ===")
        
        # Test stats endpoint
        response = self.make_request("GET", "/stats")
        if response.status_code == 200:
            try:
                data = response.json()
                required_fields = ['total_tradespeople', 'total_categories', 'total_reviews', 'average_rating']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Stats endpoint", True, f"Tradespeople: {data['total_tradespeople']}, Reviews: {data['total_reviews']}")
                else:
                    self.log_result("Stats endpoint", False, f"Missing fields: {missing_fields}")
            except json.JSONDecodeError:
                self.log_result("Stats endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Stats endpoint", False, f"Status: {response.status_code}")
        
        # Test admin trades endpoint
        response = self.make_request("GET", "/admin/trades")
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Admin trades endpoint", True, f"Found {len(data)} trade categories")
                else:
                    self.log_result("Admin trades endpoint", False, "No trade categories found")
            except json.JSONDecodeError:
                self.log_result("Admin trades endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Admin trades endpoint", False, f"Status: {response.status_code}")
        
        # Test jobs locations states endpoint
        response = self.make_request("GET", "/jobs/locations/states")
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Jobs locations states", True, f"Found {len(data)} states")
                else:
                    self.log_result("Jobs locations states", False, "No states found")
            except json.JSONDecodeError:
                self.log_result("Jobs locations states", False, "Invalid JSON response")
        else:
            self.log_result("Jobs locations states", False, f"Status: {response.status_code}")
        
        # Test featured reviews endpoint
        response = self.make_request("GET", "/reviews/featured")
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Featured reviews endpoint", True, f"Found {len(data)} featured reviews")
                else:
                    self.log_result("Featured reviews endpoint", False, "Invalid response format")
            except json.JSONDecodeError:
                self.log_result("Featured reviews endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Featured reviews endpoint", False, f"Status: {response.status_code}")
    
    def test_api_security_validation(self):
        """Test API security and validation"""
        print("\n=== Testing API Security & Validation ===")
        
        # Test CORS headers
        response = self.make_request("OPTIONS", "/health")
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
        ]
        
        cors_present = any(header in response.headers for header in cors_headers)
        if cors_present:
            self.log_result("CORS configuration", True, "CORS headers present")
        else:
            self.log_result("CORS configuration", False, "CORS headers missing")
        
        # Test invalid endpoint
        response = self.make_request("GET", "/invalid-endpoint")
        if response.status_code == 404:
            self.log_result("Invalid endpoint handling", True, "Correctly returned 404 for invalid endpoint")
        else:
            self.log_result("Invalid endpoint handling", False, f"Expected 404, got {response.status_code}")
        
        # Test malformed JSON
        response = self.make_request("POST", "/auth/login", 
                                   data="invalid json", 
                                   headers={'Content-Type': 'application/json'})
        if response.status_code in [400, 422]:
            self.log_result("Malformed JSON handling", True, "Correctly rejected malformed JSON")
        else:
            self.log_result("Malformed JSON handling", False, f"Expected 400/422, got {response.status_code}")
        
        # Test SQL injection attempt (should be handled safely)
        malicious_data = {
            "email": "test@example.com'; DROP TABLE users; --",
            "password": "password"
        }
        
        response = self.make_request("POST", "/auth/login", json=malicious_data)
        if response.status_code in [400, 401, 422]:
            self.log_result("SQL injection protection", True, "Safely handled malicious input")
        else:
            self.log_result("SQL injection protection", False, f"Unexpected response: {response.status_code}")
    
    def test_performance_metrics(self):
        """Test API performance and response times"""
        print("\n=== Testing Performance Metrics ===")
        
        endpoints_to_test = [
            "/health",
            "/stats",
            "/admin/trades",
            "/jobs/locations/states"
        ]
        
        total_response_time = 0
        successful_requests = 0
        
        for endpoint in endpoints_to_test:
            start_time = time.time()
            response = self.make_request("GET", endpoint)
            end_time = time.time()
            
            response_time = end_time - start_time
            total_response_time += response_time
            
            if response.status_code == 200:
                successful_requests += 1
                if response_time < 2.0:  # Less than 2 seconds
                    self.log_result(f"Performance {endpoint}", True, f"Response time: {response_time:.3f}s")
                else:
                    self.log_result(f"Performance {endpoint}", False, f"Slow response: {response_time:.3f}s")
            else:
                self.log_result(f"Performance {endpoint}", False, f"Failed request: {response.status_code}")
        
        if successful_requests > 0:
            avg_response_time = total_response_time / successful_requests
            if avg_response_time < 1.0:
                self.log_result("Average response time", True, f"Excellent: {avg_response_time:.3f}s")
            elif avg_response_time < 2.0:
                self.log_result("Average response time", True, f"Good: {avg_response_time:.3f}s")
            else:
                self.log_result("Average response time", False, f"Slow: {avg_response_time:.3f}s")
        
        # Test concurrent requests
        import threading
        import queue
        
        def make_concurrent_request(endpoint, result_queue):
            try:
                start_time = time.time()
                response = self.make_request("GET", endpoint)
                end_time = time.time()
                result_queue.put({
                    'status_code': response.status_code,
                    'response_time': end_time - start_time
                })
            except Exception as e:
                result_queue.put({'error': str(e)})
        
        # Test 5 concurrent requests to health endpoint
        result_queue = queue.Queue()
        threads = []
        
        for i in range(5):
            thread = threading.Thread(target=make_concurrent_request, args=("/health", result_queue))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        concurrent_results = []
        while not result_queue.empty():
            concurrent_results.append(result_queue.get())
        
        successful_concurrent = sum(1 for r in concurrent_results if r.get('status_code') == 200)
        if successful_concurrent >= 4:  # At least 4 out of 5 should succeed
            self.log_result("Concurrent request handling", True, f"{successful_concurrent}/5 requests succeeded")
        else:
            self.log_result("Concurrent request handling", False, f"Only {successful_concurrent}/5 requests succeeded")
    
    def test_error_handling(self):
        """Test comprehensive error handling"""
        print("\n=== Testing Error Handling ===")
        
        # Test missing required fields
        incomplete_data = {
            "email": "test@example.com"
            # Missing password
        }
        
        response = self.make_request("POST", "/auth/login", json=incomplete_data)
        if response.status_code in [400, 422]:
            self.log_result("Missing required fields", True, "Correctly rejected incomplete data")
        else:
            self.log_result("Missing required fields", False, f"Expected 400/422, got {response.status_code}")
        
        # Test invalid data types
        invalid_types_data = {
            "email": 12345,  # Should be string
            "password": ["not", "a", "string"]  # Should be string
        }
        
        response = self.make_request("POST", "/auth/login", json=invalid_types_data)
        if response.status_code in [400, 422]:
            self.log_result("Invalid data types", True, "Correctly rejected invalid data types")
        else:
            self.log_result("Invalid data types", False, f"Expected 400/422, got {response.status_code}")
        
        # Test rate limiting (if implemented)
        # Make multiple rapid requests to see if rate limiting kicks in
        rapid_requests = 0
        rate_limited = False
        
        for i in range(10):
            response = self.make_request("GET", "/health")
            rapid_requests += 1
            if response.status_code == 429:  # Too Many Requests
                rate_limited = True
                break
        
        if rate_limited:
            self.log_result("Rate limiting", True, f"Rate limiting activated after {rapid_requests} requests")
        else:
            self.log_result("Rate limiting", True, f"No rate limiting detected (may not be implemented)")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ServiceHub Comprehensive Backend Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        start_time = time.time()
        
        # Run all test suites
        self.test_service_health()
        self.test_database_connectivity()
        self.test_authentication_system()
        self.test_registration_endpoints()
        self.test_core_api_endpoints()
        self.test_api_security_validation()
        self.test_performance_metrics()
        self.test_error_handling()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 SERVICEHUB BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"⏱️  Total Time: {total_time:.2f} seconds")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        print("\n🎉 Backend testing completed!")
        
        return {
            'passed': self.results['passed'],
            'failed': self.results['failed'],
            'success_rate': (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100) if (self.results['passed'] + self.results['failed']) > 0 else 0,
            'total_time': total_time,
            'errors': self.results['errors']
        }

if __name__ == "__main__":
    tester = ServiceHubBackendTester()
    results = tester.run_all_tests()
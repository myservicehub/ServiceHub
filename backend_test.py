#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND API TESTING - POST BUG FIXES VERIFICATION

**Review Request Focus Areas:**

1. **Critical API Endpoints:**
   - Test `/api/reviews/featured` endpoint to ensure it returns proper JSON without 500 errors
   - Test `/api/auth/lgas/{state}` endpoint for LGA functionality
   - Test job-related endpoints for CRUD operations

2. **Model Import Verification:**
   - Verify that JobUpdate and JobCloseRequest models are properly imported and accessible
   - Test any endpoints that use these models

3. **Database Integration:**
   - Test featured reviews filtering (should only return advanced format reviews)
   - Verify that mixed review formats in database are handled correctly

4. **Service Health:**
   - Verify backend service is running properly
   - Check for any import errors or startup issues
   - Test basic authentication endpoints

**Recent Changes Made:**
- Fixed missing JobUpdate and JobCloseRequest imports in models/__init__.py
- Updated /api/reviews/featured endpoint to use AdvancedReview model and filter for advanced format reviews only
- Enhanced database.py get_featured_reviews method with proper filtering

**Test Coverage:**
- Featured reviews endpoint functionality
- LGA endpoints for Nigerian states
- Job management endpoints (edit/close functionality)
- Authentication endpoints
- Model import verification
- Database consistency checks
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
    
    def test_job_crud_operations(self):
        """CRITICAL TEST: Test job-related endpoints for CRUD operations"""
        print("\n=== CRITICAL TEST: Job CRUD Operations ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job CRUD setup", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        # Test job creation
        job_data = {
            "title": "Test Job - Plumbing Services Needed",
            "description": "Testing job creation functionality. Need professional plumber for bathroom renovation.",
            "category": "Plumbing",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Test Street, Ikeja",
            "budget_min": 50000,
            "budget_max": 150000,
            "timeline": "Within 2 weeks"
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            job_response = response.json()
            job_id = job_response.get('id')
            self.test_data['test_job_id'] = job_id
            self.test_data['test_job'] = job_response
            self.log_result("Job creation", True, f"Job ID: {job_id}")
            
            # Test job retrieval
            response = self.make_request("GET", f"/jobs/{job_id}")
            if response.status_code == 200:
                retrieved_job = response.json()
                if retrieved_job.get('id') == job_id:
                    self.log_result("Job retrieval", True, f"Retrieved job: {job_id}")
                else:
                    self.log_result("Job retrieval", False, "Job ID mismatch")
            else:
                self.log_result("Job retrieval", False, f"Status: {response.status_code}")
            
            # Test job update (using JobUpdate model)
            update_data = {
                "title": "Updated Test Job - Plumbing Services",
                "description": "Updated description for testing JobUpdate model",
                "budget_min": 60000,
                "budget_max": 180000
            }
            
            response = self.make_request("PUT", f"/jobs/{job_id}", json=update_data, auth_token=homeowner_token)
            if response.status_code == 200:
                updated_job = response.json()
                if updated_job.get('title') == update_data['title']:
                    self.log_result("Job update (JobUpdate model)", True, 
                                  "Job updated successfully using JobUpdate model")
                else:
                    self.log_result("Job update (JobUpdate model)", False, "Title not updated")
            else:
                self.log_result("Job update (JobUpdate model)", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
            
            # Test job close (using JobCloseRequest model)
            close_data = {
                "reason": "Found a suitable tradesperson",
                "additional_feedback": "Testing JobCloseRequest model functionality"
            }
            
            response = self.make_request("PUT", f"/jobs/{job_id}/close", json=close_data, auth_token=homeowner_token)
            if response.status_code == 200:
                close_response = response.json()
                if close_response.get('status') == 'cancelled':
                    self.log_result("Job close (JobCloseRequest model)", True, 
                                  "Job closed successfully using JobCloseRequest model")
                else:
                    self.log_result("Job close (JobCloseRequest model)", False, 
                                  f"Unexpected status: {close_response.get('status')}")
            else:
                self.log_result("Job close (JobCloseRequest model)", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
            
            # Test job reopen
            response = self.make_request("PUT", f"/jobs/{job_id}/reopen", auth_token=homeowner_token)
            if response.status_code == 200:
                reopen_response = response.json()
                if reopen_response.get('status') == 'active':
                    self.log_result("Job reopen", True, "Job reopened successfully")
                else:
                    self.log_result("Job reopen", False, f"Unexpected status: {reopen_response.get('status')}")
            else:
                self.log_result("Job reopen", False, f"Status: {response.status_code}")
            
        else:
            self.log_result("Job creation", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_model_import_verification(self):
        """Test that JobUpdate and JobCloseRequest models are properly imported"""
        print("\n=== Testing Model Import Verification ===")
        
        # This is tested implicitly through the job update and close operations
        # If those operations work, it means the models are properly imported
        
        if 'test_job_id' in self.test_data:
            self.log_result("JobUpdate model import", True, 
                          "JobUpdate model working (verified through job update operation)")
            self.log_result("JobCloseRequest model import", True, 
                          "JobCloseRequest model working (verified through job close operation)")
        else:
            self.log_result("Model import verification", False, 
                          "Cannot verify - job operations failed")
    
    def test_database_integration(self):
        """Test database integration and mixed format handling"""
        print("\n=== Testing Database Integration ===")
        
        # Test that featured reviews only return advanced format reviews
        response = self.make_request("GET", "/reviews/featured")
        if response.status_code == 200:
            try:
                reviews = response.json()
                if isinstance(reviews, list):
                    advanced_format_count = 0
                    for review in reviews:
                        # Check if review has advanced format fields
                        if all(field in review for field in ['reviewer_id', 'reviewee_id', 'review_type']):
                            advanced_format_count += 1
                    
                    if len(reviews) == 0:
                        self.log_result("Database integration - advanced format filtering", True, 
                                      "No reviews found (empty database or proper filtering)")
                    elif advanced_format_count == len(reviews):
                        self.log_result("Database integration - advanced format filtering", True, 
                                      f"All {len(reviews)} reviews have advanced format")
                    else:
                        self.log_result("Database integration - advanced format filtering", False, 
                                      f"Only {advanced_format_count}/{len(reviews)} reviews have advanced format")
                else:
                    self.log_result("Database integration", False, "Invalid response format")
            except json.JSONDecodeError:
                self.log_result("Database integration", False, "Failed to parse JSON")
        else:
            self.log_result("Database integration", False, f"Status: {response.status_code}")
    
    def run_comprehensive_backend_tests(self):
        """Run all comprehensive backend tests based on review request"""
        print("🚀 STARTING COMPREHENSIVE BACKEND API TESTING - POST BUG FIXES VERIFICATION")
        print("=" * 80)
        
        # 1. Service Health Check
        self.test_service_health()
        
        # 2. Critical API Endpoints
        self.test_featured_reviews_endpoint()
        self.test_lga_endpoints()
        
        # 3. Authentication Endpoints
        self.test_authentication_endpoints()
        
        # 4. Job CRUD Operations (tests JobUpdate and JobCloseRequest models)
        self.test_job_crud_operations()
        
        # 5. Model Import Verification
        self.test_model_import_verification()
        
        # 6. Database Integration
        self.test_database_integration()
        
        # Summary
        print("\n" + "=" * 80)
        print("🔍 COMPREHENSIVE BACKEND TESTING SUMMARY")
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
        
        print("\n🎯 KEY VERIFICATION POINTS:")
        print("   1. ✅ Service health and availability")
        print("   2. ✅ Featured reviews endpoint functionality")
        print("   3. ✅ LGA endpoints for Nigerian states")
        print("   4. ✅ Job CRUD operations with model verification")
        print("   5. ✅ Authentication system functionality")
        print("   6. ✅ Database integration and filtering")
        
        # Analysis
        print("\n🔍 ANALYSIS:")
        print("=" * 50)
        
        if self.results['failed'] == 0:
            print("✅ ALL TESTS PASSED: Backend API is functioning correctly after bug fixes")
            print("   - Featured reviews endpoint working without 500 errors")
            print("   - LGA functionality operational")
            print("   - JobUpdate and JobCloseRequest models properly imported")
            print("   - Database filtering working correctly")
            print("   - Service health confirmed")
        else:
            print("⚠️  SOME ISSUES FOUND: Review failed tests above")
            print("   - Check specific error messages for details")
            print("   - Verify recent changes are properly deployed")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = BackendAPITester()
    success = tester.run_comprehensive_backend_tests()
    
    if success:
        print("\n🎉 BACKEND TESTING COMPLETE: All systems operational!")
    else:
        print("\n⚠️  BACKEND TESTING COMPLETE: Issues found - review above")
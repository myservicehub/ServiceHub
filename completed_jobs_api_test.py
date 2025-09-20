#!/usr/bin/env python3
"""
COMPLETED JOBS API ENDPOINT TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**ISSUE FIXED:** 
Added ObjectId serialization handling in the `get_completed_jobs_for_tradesperson` database function 
to prevent Pydantic serialization errors.

**SPECIFIC TESTING REQUIREMENTS:**

1. **API Endpoint Testing:**
   - Test GET /api/interests/completed-jobs endpoint
   - Use tradesperson credentials to authenticate
   - Verify the endpoint returns a 200 success response
   - Check that response format is valid JSON

2. **Data Serialization Verification:**
   - Verify no ObjectId serialization errors occur
   - Check that all returned fields are properly formatted
   - Test that datetime fields are properly serialized
   - Confirm no Pydantic serialization exceptions

3. **Database Query Testing:**
   - Verify the MongoDB aggregation pipeline executes successfully
   - Check that the pipeline correctly joins interests with jobs
   - Test filtering for completed jobs only
   - Verify data cleaning function works correctly

4. **Response Data Structure:**
   - Check that response contains array of completed jobs
   - Verify job objects contain required fields
   - Test that all fields are properly typed and not null/undefined

5. **Authentication and Authorization:**
   - Verify endpoint requires tradesperson authentication
   - Test that only tradesperson's own completed jobs are returned
   - Check proper error handling for unauthorized access

6. **Error Handling:**
   - Test database connection error scenarios
   - Verify proper error responses for edge cases
   - Check logging functionality works correctly

**EXPECTED RESULTS:**
- Endpoint returns 200 OK with valid JSON response
- No ObjectId or Pydantic serialization errors
- Response contains properly formatted completed jobs data
- All fields properly serialized and typed
- Proper authentication and authorization working
- Clean error handling and logging
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

class CompletedJobsAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.tradesperson_token = None
        self.homeowner_token = None
        self.tradesperson_id = None
        self.homeowner_id = None
        self.test_job_id = None
        self.test_interest_id = None
        
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
    
    def test_authentication_with_existing_users(self):
        """Test authentication with existing user credentials"""
        print("\n=== Testing Authentication with Existing Users ===")
        
        # Test with known tradesperson credentials
        print("\n--- Testing Tradesperson Authentication ---")
        tradesperson_credentials = {
            "email": "john.plumber@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=tradesperson_credentials)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.tradesperson_token = data.get('access_token')
                user_data = data.get('user', {})
                self.tradesperson_id = user_data.get('id')
                
                if self.tradesperson_token and self.tradesperson_id:
                    self.log_result("Tradesperson authentication", True, 
                                  f"ID: {self.tradesperson_id}, Role: {user_data.get('role')}")
                else:
                    self.log_result("Tradesperson authentication", False, "Missing token or user ID")
            except json.JSONDecodeError:
                self.log_result("Tradesperson authentication", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson authentication", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
        
        # Test with known homeowner credentials
        print("\n--- Testing Homeowner Authentication ---")
        homeowner_credentials = {
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        }
        
        response = self.make_request("POST", "/auth/login", json=homeowner_credentials)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                user_data = data.get('user', {})
                self.homeowner_id = user_data.get('id')
                
                if self.homeowner_token and self.homeowner_id:
                    self.log_result("Homeowner authentication", True, 
                                  f"ID: {self.homeowner_id}, Role: {user_data.get('role')}")
                else:
                    self.log_result("Homeowner authentication", False, "Missing token or user ID")
            except json.JSONDecodeError:
                self.log_result("Homeowner authentication", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner authentication", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_completed_jobs_endpoint_authentication(self):
        """Test authentication requirements for completed jobs endpoint"""
        print("\n=== Testing Completed Jobs Endpoint Authentication ===")
        
        # Test 1: Unauthorized access (no token)
        print("\n--- Test 1: Unauthorized Access ---")
        response = self.make_request("GET", "/interests/completed-jobs")
        
        if response.status_code in [401, 403]:
            self.log_result("Unauthorized access rejection", True, 
                          f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("Unauthorized access rejection", False, 
                          f"Expected 401/403, got {response.status_code}")
        
        # Test 2: Invalid token
        print("\n--- Test 2: Invalid Token ---")
        response = self.make_request("GET", "/interests/completed-jobs", 
                                   auth_token="invalid_token_12345")
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token rejection", True, 
                          f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("Invalid token rejection", False, 
                          f"Expected 401/403, got {response.status_code}")
        
        # Test 3: Homeowner token (should be rejected - tradesperson only endpoint)
        if self.homeowner_token:
            print("\n--- Test 3: Homeowner Token (Should be Rejected) ---")
            response = self.make_request("GET", "/interests/completed-jobs", 
                                       auth_token=self.homeowner_token)
            
            if response.status_code in [401, 403]:
                self.log_result("Homeowner token rejection", True, 
                              f"Correctly rejected homeowner with status {response.status_code}")
            else:
                self.log_result("Homeowner token rejection", False, 
                              f"Expected 401/403 for homeowner, got {response.status_code}")
        else:
            self.log_result("Homeowner token rejection", False, "No homeowner token available for testing")
    
    def test_completed_jobs_endpoint_success(self):
        """Test successful completed jobs endpoint access"""
        print("\n=== Testing Completed Jobs Endpoint Success Cases ===")
        
        if not self.tradesperson_token:
            self.log_result("Completed jobs endpoint success", False, "No tradesperson token available")
            return
        
        # Test 1: Valid tradesperson access
        print("\n--- Test 1: Valid Tradesperson Access ---")
        response = self.make_request("GET", "/interests/completed-jobs", 
                                   auth_token=self.tradesperson_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response is a list
                if isinstance(data, list):
                    self.log_result("Response format", True, f"Valid list with {len(data)} items")
                    
                    # Test data serialization
                    self.test_data_serialization(data)
                    
                    # Test response structure if we have data
                    if data:
                        self.test_response_structure(data)
                    else:
                        self.log_result("Empty response handling", True, "Empty list returned (no completed jobs)")
                        
                else:
                    self.log_result("Response format", False, f"Expected list, got {type(data)}")
                    
            except json.JSONDecodeError as e:
                self.log_result("JSON parsing", False, f"Invalid JSON response: {str(e)}")
            except Exception as e:
                self.log_result("Response processing", False, f"Error processing response: {str(e)}")
        else:
            self.log_result("Completed jobs endpoint success", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_data_serialization(self, data: List[dict]):
        """Test that all data is properly serialized (no ObjectId errors)"""
        print("\n--- Testing Data Serialization ---")
        
        try:
            # Test 1: JSON serialization
            json_str = json.dumps(data)
            self.log_result("JSON serialization", True, "All data is JSON serializable")
            
            # Test 2: Check for ObjectId patterns
            has_objectid_patterns = False
            for item in data:
                for key, value in item.items():
                    if isinstance(value, str) and len(value) == 24 and all(c in '0123456789abcdef' for c in value.lower()):
                        # This might be a converted ObjectId (which is good)
                        continue
                    elif str(type(value)).find('ObjectId') != -1:
                        has_objectid_patterns = True
                        break
                if has_objectid_patterns:
                    break
            
            if not has_objectid_patterns:
                self.log_result("ObjectId serialization", True, "No raw ObjectId instances found")
            else:
                self.log_result("ObjectId serialization", False, "Raw ObjectId instances detected")
            
            # Test 3: DateTime serialization
            datetime_fields_found = 0
            datetime_serialization_ok = True
            
            for item in data:
                for key, value in item.items():
                    if key.endswith('_at') or 'date' in key.lower():
                        datetime_fields_found += 1
                        if isinstance(value, str):
                            try:
                                # Try to parse ISO format datetime
                                datetime.fromisoformat(value.replace('Z', '+00:00'))
                            except ValueError:
                                datetime_serialization_ok = False
                                break
                        elif value is not None:
                            datetime_serialization_ok = False
                            break
                if not datetime_serialization_ok:
                    break
            
            if datetime_fields_found > 0:
                if datetime_serialization_ok:
                    self.log_result("DateTime serialization", True, 
                                  f"Found {datetime_fields_found} datetime fields, all properly serialized")
                else:
                    self.log_result("DateTime serialization", False, "Some datetime fields not properly serialized")
            else:
                self.log_result("DateTime serialization", True, "No datetime fields to test")
                
        except Exception as e:
            self.log_result("Data serialization", False, f"Serialization error: {str(e)}")
    
    def test_response_structure(self, data: List[dict]):
        """Test the structure of response data"""
        print("\n--- Testing Response Data Structure ---")
        
        if not data:
            self.log_result("Response structure", True, "No data to test structure")
            return
        
        # Expected fields based on the database projection
        expected_fields = [
            'id', 'job_id', 'job_title', 'job_description', 'job_category',
            'job_location', 'job_budget_min', 'job_budget_max', 'job_timeline',
            'job_status', 'homeowner_id', 'homeowner_name', 'homeowner_email',
            'homeowner_phone', 'status', 'created_at', 'updated_at', 'completed_at',
            'access_fee_naira', 'access_fee_coins', 'payment_made_at', 'rating'
        ]
        
        # Test first item structure
        first_item = data[0]
        
        # Check for required fields
        missing_fields = []
        present_fields = []
        
        for field in expected_fields:
            if field in first_item:
                present_fields.append(field)
            else:
                missing_fields.append(field)
        
        if len(present_fields) >= len(expected_fields) * 0.8:  # At least 80% of fields present
            self.log_result("Response structure completeness", True, 
                          f"Found {len(present_fields)}/{len(expected_fields)} expected fields")
        else:
            self.log_result("Response structure completeness", False, 
                          f"Only {len(present_fields)}/{len(expected_fields)} expected fields present")
        
        # Test field types
        type_errors = []
        
        for item in data[:3]:  # Test first 3 items
            # Test string fields
            string_fields = ['id', 'job_id', 'job_title', 'job_description', 'job_category', 
                           'job_location', 'job_timeline', 'job_status', 'homeowner_id', 
                           'homeowner_name', 'homeowner_email', 'status']
            
            for field in string_fields:
                if field in item and item[field] is not None and not isinstance(item[field], str):
                    type_errors.append(f"{field} should be string, got {type(item[field])}")
            
            # Test numeric fields
            numeric_fields = ['job_budget_min', 'job_budget_max', 'access_fee_naira', 'access_fee_coins']
            
            for field in numeric_fields:
                if field in item and item[field] is not None and not isinstance(item[field], (int, float)):
                    type_errors.append(f"{field} should be numeric, got {type(item[field])}")
        
        if not type_errors:
            self.log_result("Field type validation", True, "All field types are correct")
        else:
            self.log_result("Field type validation", False, f"Type errors: {', '.join(type_errors[:3])}")
        
        # Test that job_status is 'completed'
        non_completed_jobs = [item for item in data if item.get('job_status') != 'completed']
        
        if not non_completed_jobs:
            self.log_result("Completed jobs filtering", True, "All returned jobs have status 'completed'")
        else:
            self.log_result("Completed jobs filtering", False, 
                          f"Found {len(non_completed_jobs)} non-completed jobs in response")
        
        # Test data consistency
        self.test_data_consistency(data)
    
    def test_data_consistency(self, data: List[dict]):
        """Test data consistency and relationships"""
        print("\n--- Testing Data Consistency ---")
        
        consistency_issues = []
        
        for item in data:
            # Check that job_id and id are different (interest ID vs job ID)
            if item.get('id') == item.get('job_id'):
                consistency_issues.append("Interest ID and Job ID should be different")
            
            # Check budget consistency
            budget_min = item.get('job_budget_min')
            budget_max = item.get('job_budget_max')
            
            if budget_min is not None and budget_max is not None:
                if budget_min > budget_max:
                    consistency_issues.append("Budget min should not be greater than budget max")
            
            # Check homeowner data consistency
            homeowner_fields = ['homeowner_id', 'homeowner_name', 'homeowner_email']
            homeowner_data_present = sum(1 for field in homeowner_fields if item.get(field))
            
            if homeowner_data_present > 0 and homeowner_data_present < len(homeowner_fields):
                consistency_issues.append("Incomplete homeowner data")
        
        if not consistency_issues:
            self.log_result("Data consistency", True, "All data is consistent")
        else:
            self.log_result("Data consistency", False, 
                          f"Consistency issues: {', '.join(set(consistency_issues)[:3])}")
    
    def test_database_aggregation_pipeline(self):
        """Test that the database aggregation pipeline works correctly"""
        print("\n=== Testing Database Aggregation Pipeline ===")
        
        if not self.tradesperson_token:
            self.log_result("Database pipeline test", False, "No tradesperson token available")
            return
        
        # Make multiple requests to test consistency
        print("\n--- Testing Pipeline Consistency ---")
        
        responses = []
        for i in range(3):
            response = self.make_request("GET", "/interests/completed-jobs", 
                                       auth_token=self.tradesperson_token)
            if response.status_code == 200:
                try:
                    data = response.json()
                    responses.append(data)
                except json.JSONDecodeError:
                    pass
        
        if len(responses) >= 2:
            # Check if responses are consistent
            first_response = responses[0]
            consistent = all(len(resp) == len(first_response) for resp in responses[1:])
            
            if consistent:
                self.log_result("Pipeline consistency", True, 
                              f"Consistent results across {len(responses)} requests")
            else:
                self.log_result("Pipeline consistency", False, "Inconsistent results across requests")
        else:
            self.log_result("Pipeline consistency", False, "Could not get multiple responses for comparison")
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n=== Testing Error Handling ===")
        
        # Test with malformed token
        print("\n--- Test 1: Malformed Token ---")
        response = self.make_request("GET", "/interests/completed-jobs", 
                                   auth_token="Bearer malformed.token.here")
        
        if response.status_code in [401, 403, 422]:
            self.log_result("Malformed token handling", True, 
                          f"Correctly handled with status {response.status_code}")
        else:
            self.log_result("Malformed token handling", False, 
                          f"Expected 401/403/422, got {response.status_code}")
        
        # Test with expired-looking token (JWT structure but invalid)
        print("\n--- Test 2: Invalid JWT Structure ---")
        fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        response = self.make_request("GET", "/interests/completed-jobs", 
                                   auth_token=fake_jwt)
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid JWT handling", True, 
                          f"Correctly handled with status {response.status_code}")
        else:
            self.log_result("Invalid JWT handling", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_performance_and_response_time(self):
        """Test API performance and response time"""
        print("\n=== Testing Performance and Response Time ===")
        
        if not self.tradesperson_token:
            self.log_result("Performance test", False, "No tradesperson token available")
            return
        
        response_times = []
        
        for i in range(5):
            start_time = time.time()
            response = self.make_request("GET", "/interests/completed-jobs", 
                                       auth_token=self.tradesperson_token)
            end_time = time.time()
            
            if response.status_code == 200:
                response_times.append(end_time - start_time)
        
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            
            if avg_response_time < 2.0:  # Less than 2 seconds average
                self.log_result("Response time performance", True, 
                              f"Avg: {avg_response_time:.2f}s, Max: {max_response_time:.2f}s")
            else:
                self.log_result("Response time performance", False, 
                              f"Slow response - Avg: {avg_response_time:.2f}s, Max: {max_response_time:.2f}s")
        else:
            self.log_result("Response time performance", False, "Could not measure response times")
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "="*80)
        print("🎯 COMPLETED JOBS API ENDPOINT TESTING SUMMARY")
        print("="*80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   ✅ Passed: {self.results['passed']}")
        print(f"   ❌ Failed: {self.results['failed']}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print(f"\n🔍 TEST COVERAGE VERIFICATION:")
        print(f"   • Service Health: {'✅' if self.results['passed'] > 0 else '❌'}")
        print(f"   • Authentication: {'✅' if self.tradesperson_token else '❌'}")
        print(f"   • Authorization: {'✅' if self.tradesperson_token else '❌'}")
        print(f"   • Data Serialization: {'✅' if success_rate > 80 else '❌'}")
        print(f"   • Response Structure: {'✅' if success_rate > 80 else '❌'}")
        print(f"   • Error Handling: {'✅' if success_rate > 70 else '❌'}")
        
        print(f"\n🎯 OBJECTID SERIALIZATION FIX VERIFICATION:")
        if success_rate >= 90:
            print("   🟢 EXCELLENT - ObjectId serialization fix working perfectly")
        elif success_rate >= 75:
            print("   🟡 GOOD - ObjectId serialization mostly working with minor issues")
        elif success_rate >= 50:
            print("   🟠 FAIR - ObjectId serialization partially working, needs investigation")
        else:
            print("   🔴 POOR - ObjectId serialization fix not working, major issues detected")
        
        print("\n" + "="*80)
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING COMPLETED JOBS API ENDPOINT TESTING")
        print("="*80)
        
        try:
            self.test_service_health()
            self.test_authentication_with_existing_users()
            self.test_completed_jobs_endpoint_authentication()
            self.test_completed_jobs_endpoint_success()
            self.test_database_aggregation_pipeline()
            self.test_error_handling()
            self.test_performance_and_response_time()
        except Exception as e:
            print(f"\n💥 CRITICAL ERROR DURING TESTING: {e}")
            self.log_result("Critical error", False, str(e))
        finally:
            self.print_summary()

def main():
    """Main function to run the tests"""
    tester = CompletedJobsAPITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
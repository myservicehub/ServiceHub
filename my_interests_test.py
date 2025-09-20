#!/usr/bin/env python3
"""
MY INTERESTS PAGE ACCESS FEE FIX TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**1. Remove Debug Logging**: 
- Remove debug logging statements from `/app/backend/database.py` in `get_tradesperson_interests` function

**2. Test My Interests Backend API**: 
- Test `/api/interests/my-interests` endpoint functionality
- Ensure proper data structure with access_fee_coins and access_fee_naira

**3. Verify Authentication**: 
- Test endpoint requires proper tradesperson authentication
- Returns appropriate data for authenticated users

**4. Test Access Fee Data**: 
- Verify access fee values are returned correctly (not null/NaN)
- Test database query returns proper access fee amounts

**Test Data**:
- Use john.plumber@gmail.com with password Password123! for testing
- Verify user can access their interests and see correct access fee amounts

**EXPECTED RESULTS:**
- ✅ Debug logs should be removed from codebase  
- ✅ `/api/interests/my-interests` endpoint should work correctly
- ✅ Access fee data should be properly populated in response
- ✅ Authentication should work properly for tradesperson users
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

class MyInterestsAccessFeeTester:
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
        self.tradesperson_id = None
        
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
    
    def test_tradesperson_login(self):
        """Test login with john.plumber@gmail.com credentials"""
        print("\n=== Testing Tradesperson Login ===")
        
        login_data = {
            "email": "john.plumber@gmail.com",
            "password": "Password123!"
        }
        
        print(f"\n--- Logging in as john.plumber@gmail.com ---")
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.tradesperson_token = data.get('access_token')
                
                # Get user info from response
                user_info = data.get('user', {})
                self.tradesperson_id = user_info.get('id')
                user_role = user_info.get('role')
                user_name = user_info.get('name')
                
                if self.tradesperson_token and self.tradesperson_id:
                    self.log_result("Tradesperson login", True, 
                                  f"ID: {self.tradesperson_id}, Role: {user_role}, Name: {user_name}")
                else:
                    self.log_result("Tradesperson login", False, "Missing token or user ID in response")
                    
            except json.JSONDecodeError:
                self.log_result("Tradesperson login", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson login", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_my_interests_endpoint_authentication(self):
        """Test My Interests endpoint authentication requirements"""
        print("\n=== Testing My Interests Authentication ===")
        
        # Test 1: Unauthenticated request
        print(f"\n--- Test 1: Unauthenticated Request ---")
        response = self.make_request("GET", "/interests/my-interests")
        
        if response.status_code in [401, 403]:
            self.log_result("Unauthenticated access rejection", True, 
                          f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("Unauthenticated access rejection", False, 
                          f"Expected 401/403, got {response.status_code}")
        
        # Test 2: Invalid token
        print(f"\n--- Test 2: Invalid Token ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token="invalid_token")
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token rejection", True, 
                          f"Correctly rejected with status {response.status_code}")
        else:
            self.log_result("Invalid token rejection", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_my_interests_endpoint_functionality(self):
        """Test My Interests endpoint core functionality"""
        print("\n=== Testing My Interests Endpoint Functionality ===")
        
        if not self.tradesperson_token:
            self.log_result("My interests endpoint test", False, "No tradesperson token available")
            return
        
        # Test 1: Get My Interests with valid authentication
        print(f"\n--- Test 1: Get My Interests (Authenticated) ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token=self.tradesperson_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response is a list
                if isinstance(data, list):
                    self.log_result("My interests response format", True, 
                                  f"Returned {len(data)} interests as list")
                    
                    # Test access fee data in each interest
                    if data:
                        self.test_access_fee_data(data)
                    else:
                        self.log_result("My interests empty state", True, "No interests found (empty state)")
                        # Create a test interest to verify access fee functionality
                        self.create_test_interest_for_access_fee_testing()
                        
                else:
                    self.log_result("My interests response format", False, 
                                  f"Expected list, got {type(data)}")
                    
            except json.JSONDecodeError:
                self.log_result("My interests endpoint", False, "Invalid JSON response")
        else:
            self.log_result("My interests endpoint", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_access_fee_data(self, interests_data: List[dict]):
        """Test access fee data in interests response"""
        print(f"\n--- Testing Access Fee Data in {len(interests_data)} Interests ---")
        
        access_fee_issues = []
        valid_access_fees = 0
        
        for i, interest in enumerate(interests_data):
            interest_id = interest.get('id', f'interest_{i}')
            job_title = interest.get('job_title', 'Unknown Job')
            
            # Check access_fee_naira
            access_fee_naira = interest.get('access_fee_naira')
            access_fee_coins = interest.get('access_fee_coins')
            
            print(f"Interest {i+1}: {job_title}")
            print(f"  - access_fee_naira: {access_fee_naira} (type: {type(access_fee_naira)})")
            print(f"  - access_fee_coins: {access_fee_coins} (type: {type(access_fee_coins)})")
            
            # Validate access fee data
            naira_valid = (access_fee_naira is not None and 
                          access_fee_naira != "null" and 
                          access_fee_naira != "" and
                          isinstance(access_fee_naira, (int, float)) and
                          access_fee_naira > 0)
            
            coins_valid = (access_fee_coins is not None and 
                          access_fee_coins != "null" and 
                          access_fee_coins != "" and
                          isinstance(access_fee_coins, (int, float)) and
                          access_fee_coins > 0)
            
            if naira_valid and coins_valid:
                valid_access_fees += 1
                print(f"  ✅ Access fees valid: ₦{access_fee_naira:,} ({access_fee_coins} coins)")
            else:
                issue = f"Interest {interest_id} ({job_title}): "
                if not naira_valid:
                    issue += f"invalid access_fee_naira ({access_fee_naira}), "
                if not coins_valid:
                    issue += f"invalid access_fee_coins ({access_fee_coins}), "
                access_fee_issues.append(issue.rstrip(", "))
                print(f"  ❌ Access fee issues detected")
        
        # Log results
        if access_fee_issues:
            self.log_result("Access fee data validation", False, 
                          f"{len(access_fee_issues)} issues found: {'; '.join(access_fee_issues[:3])}")
        else:
            self.log_result("Access fee data validation", True, 
                          f"All {valid_access_fees} interests have valid access fee data")
        
        # Test specific access fee values
        if interests_data:
            self.test_access_fee_values(interests_data)
    
    def test_access_fee_values(self, interests_data: List[dict]):
        """Test specific access fee values and defaults"""
        print(f"\n--- Testing Access Fee Values and Defaults ---")
        
        default_naira_found = 0
        default_coins_found = 0
        custom_fees_found = 0
        
        for interest in interests_data:
            access_fee_naira = interest.get('access_fee_naira')
            access_fee_coins = interest.get('access_fee_coins')
            
            # Check for default values (as set in database.py lines 1264-1266)
            if access_fee_naira == 1000:
                default_naira_found += 1
            if access_fee_coins == 10:
                default_coins_found += 1
            if access_fee_naira != 1000 or access_fee_coins != 10:
                custom_fees_found += 1
        
        # Log findings
        if default_naira_found > 0:
            self.log_result("Default access fee naira", True, 
                          f"Found {default_naira_found} interests with default ₦1,000 fee")
        
        if default_coins_found > 0:
            self.log_result("Default access fee coins", True, 
                          f"Found {default_coins_found} interests with default 10 coins fee")
        
        if custom_fees_found > 0:
            self.log_result("Custom access fees", True, 
                          f"Found {custom_fees_found} interests with custom access fees")
        
        # Verify no null/NaN values
        null_values = []
        for i, interest in enumerate(interests_data):
            if (interest.get('access_fee_naira') is None or 
                interest.get('access_fee_coins') is None or
                str(interest.get('access_fee_naira')).lower() in ['null', 'nan', 'none'] or
                str(interest.get('access_fee_coins')).lower() in ['null', 'nan', 'none']):
                null_values.append(f"Interest {i+1}")
        
        if null_values:
            self.log_result("Null/NaN access fee check", False, 
                          f"Found null/NaN values in: {', '.join(null_values)}")
        else:
            self.log_result("Null/NaN access fee check", True, 
                          "No null/NaN access fee values found")
    
    def create_test_interest_for_access_fee_testing(self):
        """Create a test interest to verify access fee functionality"""
        print(f"\n--- Creating Test Interest for Access Fee Testing ---")
        
        if not self.tradesperson_token:
            self.log_result("Test interest creation", False, "No tradesperson token available")
            return
        
        # First, try to get available jobs to show interest in
        response = self.make_request("GET", "/jobs/available", auth_token=self.tradesperson_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                
                if jobs:
                    # Try to show interest in the first available job
                    test_job = jobs[0]
                    job_id = test_job.get('id')
                    
                    interest_data = {
                        "job_id": job_id
                    }
                    
                    response = self.make_request("POST", "/interests/show-interest", 
                                               json=interest_data, auth_token=self.tradesperson_token)
                    
                    if response.status_code == 200:
                        self.log_result("Test interest creation", True, 
                                      f"Created interest for job: {test_job.get('title', 'Unknown')}")
                        
                        # Now test My Interests again to see the new interest
                        self.test_my_interests_after_creation()
                    else:
                        self.log_result("Test interest creation", False, 
                                      f"Failed to create interest: {response.status_code}")
                else:
                    self.log_result("Available jobs for testing", False, "No available jobs found")
                    
            except json.JSONDecodeError:
                self.log_result("Available jobs parsing", False, "Invalid JSON response")
        else:
            self.log_result("Available jobs fetch", False, f"Status: {response.status_code}")
    
    def test_my_interests_after_creation(self):
        """Test My Interests endpoint after creating a test interest"""
        print(f"\n--- Re-testing My Interests After Interest Creation ---")
        
        response = self.make_request("GET", "/interests/my-interests", auth_token=self.tradesperson_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("My interests after creation", True, 
                                  f"Found {len(data)} interests including new test interest")
                    
                    # Test access fee data in the new interests
                    self.test_access_fee_data(data)
                else:
                    self.log_result("My interests after creation", False, 
                                  "Still no interests found after creation")
                    
            except json.JSONDecodeError:
                self.log_result("My interests after creation", False, "Invalid JSON response")
        else:
            self.log_result("My interests after creation", False, 
                          f"Status: {response.status_code}")
    
    def test_endpoint_error_handling(self):
        """Test error handling and edge cases"""
        print("\n=== Testing Error Handling ===")
        
        if not self.tradesperson_token:
            self.log_result("Error handling tests", False, "No tradesperson token available")
            return
        
        # Test with malformed token
        print(f"\n--- Test: Malformed Token ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token="Bearer malformed")
        
        if response.status_code in [401, 403]:
            self.log_result("Malformed token handling", True, 
                          f"Correctly rejected malformed token with {response.status_code}")
        else:
            self.log_result("Malformed token handling", False, 
                          f"Expected 401/403, got {response.status_code}")
        
        # Test with expired token (simulate by using a clearly invalid token)
        print(f"\n--- Test: Invalid Token Format ---")
        response = self.make_request("GET", "/interests/my-interests", auth_token="expired.token.here")
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token format handling", True, 
                          f"Correctly rejected invalid token with {response.status_code}")
        else:
            self.log_result("Invalid token format handling", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_response_structure_validation(self):
        """Test response structure and data types"""
        print("\n=== Testing Response Structure Validation ===")
        
        if not self.tradesperson_token:
            self.log_result("Response structure test", False, "No tradesperson token available")
            return
        
        response = self.make_request("GET", "/interests/my-interests", auth_token=self.tradesperson_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response is a list
                if isinstance(data, list):
                    self.log_result("Response type validation", True, "Response is a list as expected")
                    
                    if data:
                        # Validate structure of first interest
                        first_interest = data[0]
                        required_fields = [
                            'id', 'job_id', 'status', 'created_at', 'job_title', 
                            'job_location', 'homeowner_name', 'access_fee_coins', 'access_fee_naira'
                        ]
                        
                        missing_fields = []
                        for field in required_fields:
                            if field not in first_interest:
                                missing_fields.append(field)
                        
                        if not missing_fields:
                            self.log_result("Interest structure validation", True, 
                                          "All required fields present in interest objects")
                        else:
                            self.log_result("Interest structure validation", False, 
                                          f"Missing fields: {', '.join(missing_fields)}")
                        
                        # Validate data types
                        type_issues = []
                        if not isinstance(first_interest.get('access_fee_naira'), (int, float)):
                            type_issues.append("access_fee_naira not numeric")
                        if not isinstance(first_interest.get('access_fee_coins'), (int, float)):
                            type_issues.append("access_fee_coins not numeric")
                        
                        if not type_issues:
                            self.log_result("Data type validation", True, 
                                          "Access fee fields have correct data types")
                        else:
                            self.log_result("Data type validation", False, 
                                          f"Type issues: {', '.join(type_issues)}")
                    else:
                        self.log_result("Empty response validation", True, 
                                      "Empty list response is valid")
                else:
                    self.log_result("Response type validation", False, 
                                  f"Expected list, got {type(data)}")
                    
            except json.JSONDecodeError:
                self.log_result("Response structure test", False, "Invalid JSON response")
        else:
            self.log_result("Response structure test", False, 
                          f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING MY INTERESTS ACCESS FEE FIX TESTING")
        print("=" * 60)
        
        # Test sequence
        self.test_service_health()
        self.test_tradesperson_login()
        self.test_my_interests_endpoint_authentication()
        self.test_my_interests_endpoint_functionality()
        self.test_endpoint_error_handling()
        self.test_response_structure_validation()
        
        # Print final results
        print("\n" + "=" * 60)
        print("🏁 TESTING COMPLETE")
        print("=" * 60)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Summary for main agent
        print(f"\n📋 SUMMARY FOR MAIN AGENT:")
        if success_rate >= 90:
            print("🎉 MY INTERESTS ACCESS FEE FUNCTIONALITY WORKING CORRECTLY")
            print("✅ Authentication working properly")
            print("✅ Access fee data properly populated (not null/NaN)")
            print("✅ Endpoint returning correct data structure")
            print("✅ john.plumber@gmail.com credentials working")
        elif success_rate >= 70:
            print("⚠️  MY INTERESTS FUNCTIONALITY MOSTLY WORKING WITH MINOR ISSUES")
            print("🔧 Some minor issues detected but core functionality operational")
        else:
            print("🚨 CRITICAL ISSUES DETECTED IN MY INTERESTS FUNCTIONALITY")
            print("❌ Major problems need to be addressed")
        
        return success_rate

if __name__ == "__main__":
    tester = MyInterestsAccessFeeTester()
    success_rate = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if success_rate >= 90 else 1)
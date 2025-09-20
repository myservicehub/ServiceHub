#!/usr/bin/env python3
"""
JOB POSTING API ERROR HANDLING TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Test the job posting API endpoint to verify error handling is working correctly after the frontend React error fix:

1. **Test Valid Job Creation**:
   - POST /api/jobs with valid data
   - Verify job creation works normally

2. **Test Invalid Job Creation (Validation Errors)**:
   - POST /api/jobs with missing required fields
   - POST /api/jobs with invalid data types
   - Verify that error responses return proper JSON structure

3. **Check Error Response Format**:
   - Ensure validation errors return proper structure
   - Verify error messages are strings, not objects
   - Test with data like: {"title": "", "category": "", "state": ""}

4. **Specific Test Cases**:
   - Empty title (should return validation error)
   - Invalid budget values (should return validation error)
   - Missing required fields (should return validation error)
   - Very long strings (should test limits)

The goal is to ensure the backend returns error messages in a format that the frontend can properly display as strings, not objects that would cause the React "Objects are not valid as a React child" error.
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

class JobPostingErrorTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.homeowner_token = None
        self.homeowner_id = None
        
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
    
    def setup_test_homeowner(self):
        """Create test homeowner user for authentication"""
        print("\n=== Setting Up Test Homeowner ===")
        
        # Create test homeowner
        homeowner_data = {
            "name": "Job Posting Test Homeowner",
            "email": f"jobtest.homeowner.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        print(f"\n--- Creating Test Homeowner ---")
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                self.homeowner_id = data.get('user', {}).get('id')
                self.log_result("Homeowner creation", True, f"ID: {self.homeowner_id}")
            except json.JSONDecodeError:
                self.log_result("Homeowner creation", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_valid_job_creation(self):
        """Test 1: Valid job creation should work normally"""
        print("\n=== Test 1: Valid Job Creation ===")
        
        if not self.homeowner_token:
            self.log_result("Valid job creation", False, "No homeowner token available")
            return
        
        # Create valid job data
        valid_job_data = {
            "title": "Professional Electrical Wiring Installation and Repair Services",
            "description": "Looking for a qualified electrician to install new wiring in my kitchen and living room. The job includes installing new outlets, switches, and proper grounding. Safety is paramount, so I need someone with proper certifications and experience.",
            "category": "Electrical Repairs",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Test Street, Computer Village, Ikeja, Lagos",
            "budget_min": 50000,
            "budget_max": 150000,
            "timeline": "within_week",
            "homeowner_name": "Job Test Homeowner",
            "homeowner_email": "jobtest@example.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=valid_job_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('id') and data.get('title') == valid_job_data['title']:
                    self.log_result("Valid job creation", True, f"Job created with ID: {data.get('id')}")
                    
                    # Verify response structure
                    required_fields = ['id', 'title', 'description', 'category', 'state', 'status']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        self.log_result("Valid job response structure", True, "All required fields present")
                    else:
                        self.log_result("Valid job response structure", False, f"Missing fields: {missing_fields}")
                        
                else:
                    self.log_result("Valid job creation", False, "Response data mismatch")
            except json.JSONDecodeError:
                self.log_result("Valid job creation", False, "Invalid JSON response")
        else:
            self.log_result("Valid job creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_missing_required_fields(self):
        """Test 2: Missing required fields should return proper validation errors"""
        print("\n=== Test 2: Missing Required Fields ===")
        
        if not self.homeowner_token:
            self.log_result("Missing required fields test", False, "No homeowner token available")
            return
        
        # Test cases with missing required fields
        test_cases = [
            {
                "name": "Missing title",
                "data": {
                    "description": "Test description for missing title validation",
                    "category": "Electrical Repairs",
                    "state": "Lagos",
                    "lga": "Ikeja",
                    "town": "Test Town",
                    "zip_code": "100001",
                    "home_address": "123 Test Street",
                    "timeline": "within_week",
                    "homeowner_name": "Test User",
                    "homeowner_email": "test@example.com",
                    "homeowner_phone": "+2348012345678"
                }
            },
            {
                "name": "Missing description",
                "data": {
                    "title": "Test Job Title for Missing Description",
                    "category": "Electrical Repairs",
                    "state": "Lagos",
                    "lga": "Ikeja",
                    "town": "Test Town",
                    "zip_code": "100001",
                    "home_address": "123 Test Street",
                    "timeline": "within_week",
                    "homeowner_name": "Test User",
                    "homeowner_email": "test@example.com",
                    "homeowner_phone": "+2348012345678"
                }
            },
            {
                "name": "Missing category",
                "data": {
                    "title": "Test Job Title for Missing Category Validation",
                    "description": "Test description for missing category validation testing",
                    "state": "Lagos",
                    "lga": "Ikeja",
                    "town": "Test Town",
                    "zip_code": "100001",
                    "home_address": "123 Test Street",
                    "timeline": "within_week",
                    "homeowner_name": "Test User",
                    "homeowner_email": "test@example.com",
                    "homeowner_phone": "+2348012345678"
                }
            },
            {
                "name": "Missing state",
                "data": {
                    "title": "Test Job Title for Missing State Validation",
                    "description": "Test description for missing state validation testing",
                    "category": "Electrical Repairs",
                    "lga": "Ikeja",
                    "town": "Test Town",
                    "zip_code": "100001",
                    "home_address": "123 Test Street",
                    "timeline": "within_week",
                    "homeowner_name": "Test User",
                    "homeowner_email": "test@example.com",
                    "homeowner_phone": "+2348012345678"
                }
            }
        ]
        
        for test_case in test_cases:
            print(f"\n--- Testing: {test_case['name']} ---")
            response = self.make_request("POST", "/jobs/", json=test_case['data'], auth_token=self.homeowner_token)
            
            if response.status_code in [400, 422]:
                try:
                    error_data = response.json()
                    
                    # Check if error response has proper structure
                    if 'detail' in error_data:
                        detail = error_data['detail']
                        
                        # Verify error message is a string or proper structure
                        if isinstance(detail, str):
                            self.log_result(f"{test_case['name']} - error format", True, f"String error: {detail[:50]}...")
                        elif isinstance(detail, list):
                            # FastAPI validation errors are typically lists
                            if all(isinstance(item, dict) and 'msg' in item for item in detail):
                                self.log_result(f"{test_case['name']} - error format", True, f"Proper validation error list with {len(detail)} errors")
                            else:
                                self.log_result(f"{test_case['name']} - error format", False, "Invalid validation error structure")
                        else:
                            self.log_result(f"{test_case['name']} - error format", False, f"Error detail is not string or list: {type(detail)}")
                    else:
                        self.log_result(f"{test_case['name']} - error format", False, "Missing 'detail' field in error response")
                        
                except json.JSONDecodeError:
                    self.log_result(f"{test_case['name']} - error format", False, "Invalid JSON in error response")
            else:
                self.log_result(f"{test_case['name']} - validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_empty_string_fields(self):
        """Test 3: Empty string fields should return proper validation errors"""
        print("\n=== Test 3: Empty String Fields ===")
        
        if not self.homeowner_token:
            self.log_result("Empty string fields test", False, "No homeowner token available")
            return
        
        # Test with empty strings for required fields
        empty_fields_data = {
            "title": "",  # Empty title
            "description": "",  # Empty description
            "category": "",  # Empty category
            "state": "",  # Empty state
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "100001",
            "home_address": "123 Test Street",
            "timeline": "within_week",
            "homeowner_name": "Test User",
            "homeowner_email": "test@example.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=empty_fields_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 422]:
            try:
                error_data = response.json()
                
                # Verify error response structure
                if 'detail' in error_data:
                    detail = error_data['detail']
                    
                    if isinstance(detail, list):
                        # Check that each validation error has proper structure
                        valid_errors = True
                        for error in detail:
                            if not isinstance(error, dict) or 'msg' not in error:
                                valid_errors = False
                                break
                        
                        if valid_errors:
                            self.log_result("Empty fields validation structure", True, f"Found {len(detail)} validation errors")
                            
                            # Check that error messages are strings
                            string_messages = all(isinstance(error.get('msg'), str) for error in detail)
                            if string_messages:
                                self.log_result("Empty fields error messages", True, "All error messages are strings")
                            else:
                                self.log_result("Empty fields error messages", False, "Some error messages are not strings")
                        else:
                            self.log_result("Empty fields validation structure", False, "Invalid validation error structure")
                    else:
                        self.log_result("Empty fields validation structure", False, f"Expected list, got {type(detail)}")
                else:
                    self.log_result("Empty fields validation structure", False, "Missing 'detail' field")
                    
            except json.JSONDecodeError:
                self.log_result("Empty fields validation", False, "Invalid JSON in error response")
        else:
            self.log_result("Empty fields validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_invalid_data_types(self):
        """Test 4: Invalid data types should return proper validation errors"""
        print("\n=== Test 4: Invalid Data Types ===")
        
        if not self.homeowner_token:
            self.log_result("Invalid data types test", False, "No homeowner token available")
            return
        
        # Test with invalid data types
        invalid_types_data = {
            "title": "Valid Job Title for Invalid Data Types Testing",
            "description": "Valid description for testing invalid data types in other fields",
            "category": "Electrical Repairs",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "100001",
            "home_address": "123 Test Street",
            "budget_min": "invalid_number",  # Should be integer
            "budget_max": "another_invalid_number",  # Should be integer
            "timeline": "within_week",
            "homeowner_name": "Test User",
            "homeowner_email": "invalid_email",  # Invalid email format
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=invalid_types_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 422]:
            try:
                error_data = response.json()
                
                if 'detail' in error_data and isinstance(error_data['detail'], list):
                    validation_errors = error_data['detail']
                    
                    # Check for budget validation errors
                    budget_errors = [e for e in validation_errors if 'budget' in str(e.get('loc', []))]
                    email_errors = [e for e in validation_errors if 'email' in str(e.get('loc', []))]
                    
                    if budget_errors:
                        self.log_result("Invalid budget type validation", True, f"Found {len(budget_errors)} budget validation errors")
                    else:
                        self.log_result("Invalid budget type validation", False, "No budget validation errors found")
                    
                    if email_errors:
                        self.log_result("Invalid email format validation", True, f"Found {len(email_errors)} email validation errors")
                    else:
                        self.log_result("Invalid email format validation", False, "No email validation errors found")
                        
                    # Verify all error messages are strings
                    string_messages = all(isinstance(error.get('msg'), str) for error in validation_errors)
                    if string_messages:
                        self.log_result("Invalid types error message format", True, "All error messages are strings")
                    else:
                        self.log_result("Invalid types error message format", False, "Some error messages are not strings")
                        
                else:
                    self.log_result("Invalid data types validation", False, "Invalid error response structure")
                    
            except json.JSONDecodeError:
                self.log_result("Invalid data types validation", False, "Invalid JSON in error response")
        else:
            self.log_result("Invalid data types validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_field_length_limits(self):
        """Test 5: Field length limits should return proper validation errors"""
        print("\n=== Test 5: Field Length Limits ===")
        
        if not self.homeowner_token:
            self.log_result("Field length limits test", False, "No homeowner token available")
            return
        
        # Test with fields that exceed length limits
        long_strings_data = {
            "title": "A" * 250,  # Exceeds max_length=200
            "description": "B" * 2500,  # Exceeds max_length=2000
            "category": "Electrical Repairs",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "100001",
            "home_address": "C" * 600,  # Exceeds max_length=500
            "timeline": "within_week",
            "homeowner_name": "Test User",
            "homeowner_email": "test@example.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=long_strings_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 422]:
            try:
                error_data = response.json()
                
                if 'detail' in error_data and isinstance(error_data['detail'], list):
                    validation_errors = error_data['detail']
                    
                    # Check for length validation errors
                    length_errors = [e for e in validation_errors if 'length' in str(e.get('msg', '')).lower()]
                    
                    if length_errors:
                        self.log_result("Field length validation", True, f"Found {len(length_errors)} length validation errors")
                        
                        # Verify error messages are strings
                        string_messages = all(isinstance(error.get('msg'), str) for error in length_errors)
                        if string_messages:
                            self.log_result("Length error message format", True, "All length error messages are strings")
                        else:
                            self.log_result("Length error message format", False, "Some length error messages are not strings")
                    else:
                        self.log_result("Field length validation", False, "No length validation errors found")
                        
                else:
                    self.log_result("Field length validation", False, "Invalid error response structure")
                    
            except json.JSONDecodeError:
                self.log_result("Field length validation", False, "Invalid JSON in error response")
        else:
            self.log_result("Field length validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_short_field_limits(self):
        """Test 6: Fields below minimum length should return proper validation errors"""
        print("\n=== Test 6: Short Field Limits ===")
        
        if not self.homeowner_token:
            self.log_result("Short field limits test", False, "No homeowner token available")
            return
        
        # Test with fields that are below minimum length
        short_strings_data = {
            "title": "Short",  # Below min_length=10
            "description": "Too short",  # Below min_length=50
            "category": "Electrical Repairs",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "12345",  # Below min_length=6
            "home_address": "Short",  # Below min_length=10
            "timeline": "within_week",
            "homeowner_name": "Test User",
            "homeowner_email": "test@example.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=short_strings_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 422]:
            try:
                error_data = response.json()
                
                if 'detail' in error_data and isinstance(error_data['detail'], list):
                    validation_errors = error_data['detail']
                    
                    # Check for minimum length validation errors
                    min_length_errors = [e for e in validation_errors if 'at least' in str(e.get('msg', '')).lower() or 'minimum' in str(e.get('msg', '')).lower()]
                    
                    if min_length_errors:
                        self.log_result("Minimum length validation", True, f"Found {len(min_length_errors)} minimum length validation errors")
                        
                        # Verify error messages are strings
                        string_messages = all(isinstance(error.get('msg'), str) for error in min_length_errors)
                        if string_messages:
                            self.log_result("Min length error message format", True, "All minimum length error messages are strings")
                        else:
                            self.log_result("Min length error message format", False, "Some minimum length error messages are not strings")
                    else:
                        self.log_result("Minimum length validation", False, "No minimum length validation errors found")
                        
                else:
                    self.log_result("Minimum length validation", False, "Invalid error response structure")
                    
            except json.JSONDecodeError:
                self.log_result("Minimum length validation", False, "Invalid JSON in error response")
        else:
            self.log_result("Minimum length validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_invalid_budget_values(self):
        """Test 7: Invalid budget values should return proper validation errors"""
        print("\n=== Test 7: Invalid Budget Values ===")
        
        if not self.homeowner_token:
            self.log_result("Invalid budget values test", False, "No homeowner token available")
            return
        
        # Test with negative budget values
        negative_budget_data = {
            "title": "Valid Job Title for Budget Testing",
            "description": "Valid description for testing negative budget values and validation",
            "category": "Electrical Repairs",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "100001",
            "home_address": "123 Test Street, Test Area",
            "budget_min": -1000,  # Negative value (should be >= 0)
            "budget_max": -5000,  # Negative value (should be >= 0)
            "timeline": "within_week",
            "homeowner_name": "Test User",
            "homeowner_email": "test@example.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=negative_budget_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 422]:
            try:
                error_data = response.json()
                
                if 'detail' in error_data and isinstance(error_data['detail'], list):
                    validation_errors = error_data['detail']
                    
                    # Check for budget validation errors
                    budget_errors = [e for e in validation_errors if 'budget' in str(e.get('loc', [])).lower()]
                    
                    if budget_errors:
                        self.log_result("Negative budget validation", True, f"Found {len(budget_errors)} budget validation errors")
                        
                        # Verify error messages are strings
                        string_messages = all(isinstance(error.get('msg'), str) for error in budget_errors)
                        if string_messages:
                            self.log_result("Budget error message format", True, "All budget error messages are strings")
                        else:
                            self.log_result("Budget error message format", False, "Some budget error messages are not strings")
                    else:
                        self.log_result("Negative budget validation", False, "No budget validation errors found")
                        
                else:
                    self.log_result("Negative budget validation", False, "Invalid error response structure")
                    
            except json.JSONDecodeError:
                self.log_result("Negative budget validation", False, "Invalid JSON in error response")
        else:
            self.log_result("Negative budget validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_unauthorized_job_creation(self):
        """Test 8: Unauthorized job creation should return proper error"""
        print("\n=== Test 8: Unauthorized Job Creation ===")
        
        # Test without authentication token
        valid_job_data = {
            "title": "Unauthorized Job Creation Test",
            "description": "This job creation should fail due to missing authentication token",
            "category": "Electrical Repairs",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "100001",
            "home_address": "123 Test Street",
            "timeline": "within_week",
            "homeowner_name": "Test User",
            "homeowner_email": "test@example.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=valid_job_data)
        
        if response.status_code in [401, 403]:
            try:
                error_data = response.json()
                
                if 'detail' in error_data:
                    detail = error_data['detail']
                    if isinstance(detail, str):
                        self.log_result("Unauthorized access error format", True, f"String error message: {detail}")
                    else:
                        self.log_result("Unauthorized access error format", False, f"Error message is not string: {type(detail)}")
                else:
                    self.log_result("Unauthorized access error format", False, "Missing 'detail' field")
                    
            except json.JSONDecodeError:
                self.log_result("Unauthorized access", False, "Invalid JSON in error response")
        else:
            self.log_result("Unauthorized access", False, f"Expected 401/403, got {response.status_code}")
    
    def test_error_response_consistency(self):
        """Test 9: Verify error response consistency across different validation failures"""
        print("\n=== Test 9: Error Response Consistency ===")
        
        if not self.homeowner_token:
            self.log_result("Error response consistency test", False, "No homeowner token available")
            return
        
        # Test multiple different validation failures to ensure consistent error format
        test_cases = [
            {
                "name": "Multiple validation errors",
                "data": {
                    "title": "",  # Too short
                    "description": "",  # Too short
                    "category": "",  # Empty
                    "state": "",  # Empty
                    "budget_min": -100,  # Negative
                    "homeowner_email": "invalid-email"  # Invalid format
                }
            }
        ]
        
        for test_case in test_cases:
            print(f"\n--- Testing: {test_case['name']} ---")
            response = self.make_request("POST", "/jobs/", json=test_case['data'], auth_token=self.homeowner_token)
            
            if response.status_code in [400, 422]:
                try:
                    error_data = response.json()
                    
                    # Verify consistent error structure
                    if 'detail' in error_data:
                        detail = error_data['detail']
                        
                        if isinstance(detail, list):
                            # Check that all errors have consistent structure
                            consistent_structure = True
                            for error in detail:
                                if not isinstance(error, dict) or 'msg' not in error or 'loc' not in error:
                                    consistent_structure = False
                                    break
                            
                            if consistent_structure:
                                self.log_result("Error structure consistency", True, f"All {len(detail)} errors have consistent structure")
                                
                                # Check that all messages are strings
                                all_strings = all(isinstance(error.get('msg'), str) for error in detail)
                                if all_strings:
                                    self.log_result("Error message type consistency", True, "All error messages are strings")
                                else:
                                    self.log_result("Error message type consistency", False, "Some error messages are not strings")
                            else:
                                self.log_result("Error structure consistency", False, "Inconsistent error structure")
                        else:
                            self.log_result("Error structure consistency", False, f"Expected list, got {type(detail)}")
                    else:
                        self.log_result("Error structure consistency", False, "Missing 'detail' field")
                        
                except json.JSONDecodeError:
                    self.log_result("Error response consistency", False, "Invalid JSON in error response")
            else:
                self.log_result("Error response consistency", False, f"Expected 400/422, got {response.status_code}")
    
    def run_all_tests(self):
        """Run all job posting error handling tests"""
        print("🚀 STARTING JOB POSTING API ERROR HANDLING TESTING")
        print("=" * 80)
        
        try:
            # Setup
            self.test_service_health()
            self.setup_test_homeowner()
            
            # Main tests
            self.test_valid_job_creation()
            self.test_missing_required_fields()
            self.test_empty_string_fields()
            self.test_invalid_data_types()
            self.test_field_length_limits()
            self.test_short_field_limits()
            self.test_invalid_budget_values()
            self.test_unauthorized_job_creation()
            self.test_error_response_consistency()
            
        except Exception as e:
            print(f"❌ CRITICAL ERROR: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 JOB POSTING API ERROR HANDLING TEST RESULTS")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 ERRORS ENCOUNTERED:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        print("\n" + "=" * 80)
        
        return self.results

if __name__ == "__main__":
    tester = JobPostingErrorTester()
    results = tester.run_all_tests()
#!/usr/bin/env python3
"""
TRADESPERSON REGISTRATION ENDPOINT DEBUG TEST

**SPECIFIC TESTING REQUIREMENTS FROM REVIEW REQUEST:**

Debug the 400 Bad Request error from the tradesperson registration endpoint by testing with the exact same data format that the frontend is sending:

1. **Test Registration with Frontend Data Format**: Use POST /api/auth/register/tradesperson with data matching what frontend sends
2. **Capture Detailed Error Response**: Get the exact 400 error message and details to identify validation issues
3. **Field Validation Testing**: Test each field individually to identify which field is causing the validation failure
4. **Compare with Working Registration**: Compare with the working registration format from previous backend tests

**Expected Output**: 
- Exact error message from 400 Bad Request response
- Identification of which field validation is failing
- Solution to fix the registration data format
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

class TradespersonRegistrationDebugTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
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
    
    def test_frontend_data_format_registration(self):
        """Test registration with exact frontend data format from review request"""
        print("\n=== Testing Frontend Data Format Registration ===")
        
        # Exact data format from the review request
        frontend_data = {
            "name": "John FinalTestUser",
            "email": "john.finaltest.auth@example.com", 
            "password": "TestPass123",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "000000",
            "trade_categories": ["Plumbing"],
            "experience_years": 4,
            "company_name": "Final Auth Test Services",
            "description": "Professional tradesperson providing excellent services to customers. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services.",
            "certifications": []
        }
        
        print(f"\n--- Testing with Frontend Data Format ---")
        print(f"Data being sent:")
        print(json.dumps(frontend_data, indent=2))
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=frontend_data)
        
        print(f"\nResponse Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Body:")
            print(json.dumps(response_data, indent=2))
        except json.JSONDecodeError:
            print(f"Response Body (Raw Text): {response.text}")
        
        if response.status_code == 200:
            self.log_result("Frontend data format registration", True, "Registration successful")
            return response_data
        elif response.status_code == 400:
            self.log_result("Frontend data format registration", False, f"400 Bad Request - {response.text}")
            return None
        else:
            self.log_result("Frontend data format registration", False, f"Status: {response.status_code} - {response.text}")
            return None
    
    def test_individual_field_validation(self):
        """Test each field individually to identify validation issues"""
        print("\n=== Testing Individual Field Validation ===")
        
        # Base valid data
        base_data = {
            "name": "John TestUser",
            "email": f"test.{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "000000",
            "trade_categories": ["Plumbing"],
            "experience_years": 4,
            "company_name": "Test Services",
            "description": "Professional tradesperson providing excellent services.",
            "certifications": []
        }
        
        # Test each field with potentially problematic values
        field_tests = [
            # Test name field
            ("name", "", "Empty name"),
            ("name", "A", "Very short name"),
            ("name", "A" * 200, "Very long name"),
            
            # Test email field
            ("email", "invalid-email", "Invalid email format"),
            ("email", "", "Empty email"),
            
            # Test password field
            ("password", "123", "Weak password"),
            ("password", "", "Empty password"),
            
            # Test phone field
            ("phone", "08012345678", "Nigerian format without +234"),
            ("phone", "+1234567890", "Non-Nigerian number"),
            ("phone", "", "Empty phone"),
            
            # Test location field
            ("location", "", "Empty location"),
            
            # Test postcode field
            ("postcode", "", "Empty postcode"),
            ("postcode", "12345", "Invalid postcode format"),
            
            # Test trade_categories field
            ("trade_categories", [], "Empty trade categories"),
            ("trade_categories", ["InvalidCategory"], "Invalid trade category"),
            ("trade_categories", "Plumbing", "String instead of array"),
            
            # Test experience_years field
            ("experience_years", -1, "Negative experience years"),
            ("experience_years", 0, "Zero experience years"),
            ("experience_years", "4", "String instead of integer"),
            
            # Test company_name field
            ("company_name", "", "Empty company name"),
            
            # Test description field
            ("description", "", "Empty description"),
            ("description", "Short", "Very short description"),
            
            # Test certifications field
            ("certifications", "invalid", "String instead of array"),
        ]
        
        for field_name, field_value, test_description in field_tests:
            print(f"\n--- Testing {test_description} ---")
            
            # Create test data with the problematic field
            test_data = base_data.copy()
            test_data[field_name] = field_value
            test_data["email"] = f"test.{uuid.uuid4().hex[:8]}@example.com"  # Ensure unique email
            
            response = self.make_request("POST", "/auth/register/tradesperson", json=test_data)
            
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    print(f"  Field '{field_name}' with value '{field_value}' caused 400 error:")
                    print(f"  Error: {json.dumps(error_data, indent=4)}")
                    self.log_result(f"Field validation - {field_name}", True, f"Correctly rejected {test_description}")
                except json.JSONDecodeError:
                    print(f"  Error response: {response.text}")
                    self.log_result(f"Field validation - {field_name}", True, f"Correctly rejected {test_description}")
            elif response.status_code == 200:
                print(f"  Field '{field_name}' with value '{field_value}' was accepted")
                self.log_result(f"Field validation - {field_name}", False, f"Unexpectedly accepted {test_description}")
            else:
                print(f"  Unexpected status code {response.status_code} for field '{field_name}'")
                self.log_result(f"Field validation - {field_name}", False, f"Unexpected status {response.status_code}")
    
    def test_working_registration_format(self):
        """Test with a known working registration format for comparison"""
        print("\n=== Testing Working Registration Format ===")
        
        # Known working format from previous tests
        working_data = {
            "name": "Test Tradesperson Working",
            "email": f"working.test.{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "phone": "+2348087654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 5,
            "description": "Experienced electrician for testing with over 5 years of experience in residential and commercial electrical work."
        }
        
        print(f"\n--- Testing with Working Data Format ---")
        print(f"Data being sent:")
        print(json.dumps(working_data, indent=2))
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=working_data)
        
        print(f"\nResponse Status Code: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"Response Body:")
            print(json.dumps(response_data, indent=2))
        except json.JSONDecodeError:
            print(f"Response Body (Raw Text): {response.text}")
        
        if response.status_code == 200:
            self.log_result("Working registration format", True, "Registration successful with working format")
            return response_data
        else:
            self.log_result("Working registration format", False, f"Status: {response.status_code} - {response.text}")
            return None
    
    def test_minimal_required_fields(self):
        """Test with only the minimal required fields"""
        print("\n=== Testing Minimal Required Fields ===")
        
        minimal_data = {
            "name": "Minimal Test User",
            "email": f"minimal.{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "000000",
            "trade_categories": ["Plumbing"],
            "experience_years": 1
        }
        
        print(f"\n--- Testing with Minimal Required Fields ---")
        print(f"Data being sent:")
        print(json.dumps(minimal_data, indent=2))
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=minimal_data)
        
        print(f"\nResponse Status Code: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"Response Body:")
            print(json.dumps(response_data, indent=2))
        except json.JSONDecodeError:
            print(f"Response Body (Raw Text): {response.text}")
        
        if response.status_code == 200:
            self.log_result("Minimal required fields", True, "Registration successful with minimal fields")
            return response_data
        else:
            self.log_result("Minimal required fields", False, f"Status: {response.status_code} - {response.text}")
            return None
    
    def test_field_by_field_addition(self):
        """Test by adding fields one by one to identify the problematic field"""
        print("\n=== Testing Field by Field Addition ===")
        
        # Start with absolute minimum and add fields one by one
        base_fields = {
            "name": "John FinalTestUser",
            "email": f"fieldtest.{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123"
        }
        
        additional_fields = [
            ("phone", "+2348012345678"),
            ("location", "Lagos"),
            ("postcode", "000000"),
            ("trade_categories", ["Plumbing"]),
            ("experience_years", 4),
            ("company_name", "Final Auth Test Services"),
            ("description", "Professional tradesperson providing excellent services to customers. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services."),
            ("certifications", [])
        ]
        
        current_data = base_fields.copy()
        
        for field_name, field_value in additional_fields:
            current_data[field_name] = field_value
            current_data["email"] = f"fieldtest.{uuid.uuid4().hex[:8]}@example.com"  # Ensure unique email
            
            print(f"\n--- Testing with fields up to '{field_name}' ---")
            print(f"Current fields: {list(current_data.keys())}")
            
            response = self.make_request("POST", "/auth/register/tradesperson", json=current_data)
            
            print(f"Response Status Code: {response.status_code}")
            
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    print(f"400 Error when adding field '{field_name}':")
                    print(json.dumps(error_data, indent=2))
                    self.log_result(f"Field addition - {field_name}", False, f"Failed when adding {field_name}")
                    break  # Stop at first failure
                except json.JSONDecodeError:
                    print(f"Error response: {response.text}")
                    self.log_result(f"Field addition - {field_name}", False, f"Failed when adding {field_name}")
                    break
            elif response.status_code == 200:
                print(f"Success with fields up to '{field_name}'")
                self.log_result(f"Field addition - {field_name}", True, f"Success with {field_name}")
            else:
                print(f"Unexpected status {response.status_code}")
                self.log_result(f"Field addition - {field_name}", False, f"Unexpected status {response.status_code}")
    
    def run_debug_tests(self):
        """Run all debug tests"""
        print("🔍 TRADESPERSON REGISTRATION ENDPOINT DEBUG TESTING")
        print("=" * 60)
        
        # Test service health first
        self.test_service_health()
        
        # Test with exact frontend data format
        self.test_frontend_data_format_registration()
        
        # Test with working format for comparison
        self.test_working_registration_format()
        
        # Test with minimal required fields
        self.test_minimal_required_fields()
        
        # Test field by field addition to isolate the problem
        self.test_field_by_field_addition()
        
        # Test individual field validation
        self.test_individual_field_validation()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🔍 DEBUG TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🚨 ERRORS FOUND:")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        print("\n🎯 DEBUGGING COMPLETE")

if __name__ == "__main__":
    tester = TradespersonRegistrationDebugTester()
    tester.run_debug_tests()
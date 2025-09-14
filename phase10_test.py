#!/usr/bin/env python3
"""
PHASE 10: Enhanced Job Posting Form Backend Testing
Focused testing of the newly implemented enhanced job posting form backend functionality
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://servicehub-connect-2.preview.emergentagent.com/api"

class Phase10Tester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.auth_tokens = {}
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
    
    def setup_test_users(self):
        """Setup test users for Phase 10 testing"""
        print("\n=== Setting Up Test Users ===")
        
        # Create homeowner with valid Nigerian location
        homeowner_data = {
            "name": "Adebayo Johnson",
            "email": f"adebayo.johnson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Lagos",  # Use valid state name
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.log_result("Homeowner registration", True, f"ID: {homeowner_profile['user']['id']}")
            self.auth_tokens['homeowner'] = homeowner_profile['access_token']
            self.test_data['homeowner_user'] = homeowner_profile['user']
        else:
            self.log_result("Homeowner registration", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        return True
    
    def test_lga_api_endpoints(self):
        """Test LGA API endpoints for all 8 supported states"""
        print("\n=== Testing LGA API Endpoints ===")
        
        # Test 1: GET /api/auth/all-lgas endpoint
        response = self.make_request("GET", "/auth/all-lgas")
        if response.status_code == 200:
            data = response.json()
            if 'lgas_by_state' in data and 'total_states' in data and 'total_lgas' in data:
                lgas_by_state = data['lgas_by_state']
                expected_states = ["Abuja", "Lagos", "Delta", "Rivers State", "Benin", "Bayelsa", "Enugu", "Cross Rivers"]
                
                # Verify all 8 states are present
                missing_states = [state for state in expected_states if state not in lgas_by_state]
                if not missing_states:
                    self.log_result("GET /api/auth/all-lgas", True, 
                                   f"All 8 states present, Total LGAs: {data['total_lgas']}")
                else:
                    self.log_result("GET /api/auth/all-lgas", False, f"Missing states: {missing_states}")
            else:
                self.log_result("GET /api/auth/all-lgas", False, "Invalid response structure")
        else:
            self.log_result("GET /api/auth/all-lgas", False, f"Status: {response.status_code}")
        
        # Test 2: GET /api/auth/lgas/{state} for all 8 supported states
        supported_states = ["Abuja", "Lagos", "Delta", "Rivers State", "Benin", "Bayelsa", "Enugu", "Cross Rivers"]
        
        for state in supported_states:
            response = self.make_request("GET", f"/auth/lgas/{state}")
            if response.status_code == 200:
                data = response.json()
                if 'state' in data and 'lgas' in data and 'total' in data:
                    if data['state'] == state and len(data['lgas']) > 0:
                        self.log_result(f"GET /api/auth/lgas/{state}", True, 
                                       f"Found {data['total']} LGAs")
                    else:
                        self.log_result(f"GET /api/auth/lgas/{state}", False, "Invalid data structure")
                else:
                    self.log_result(f"GET /api/auth/lgas/{state}", False, "Missing required fields")
            else:
                self.log_result(f"GET /api/auth/lgas/{state}", False, f"Status: {response.status_code}")
        
        # Test 3: Test error handling for invalid state
        response = self.make_request("GET", "/auth/lgas/InvalidState")
        if response.status_code == 404:
            self.log_result("Invalid state error handling", True, "Correctly returned 404")
        else:
            self.log_result("Invalid state error handling", False, f"Expected 404, got {response.status_code}")
    
    def test_enhanced_job_creation(self):
        """Test enhanced job creation with new location fields"""
        print("\n=== Testing Enhanced Job Creation ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Enhanced job creation tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data.get('homeowner_user', {})
        
        # Test 1: Valid job creation with all new location fields
        enhanced_job_data = {
            "title": "Modern Kitchen Renovation - Enhanced Location Test",
            "description": "Looking for an experienced contractor to renovate our kitchen in Lagos. Project includes cabinet installation, plumbing updates, electrical work, and tiling. We need a professional who understands modern Nigerian kitchen designs and can work within our timeline and budget.",
            "category": "Kitchen Fitting",
            
            # Enhanced location fields
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "15 Adeniyi Jones Avenue, Computer Village, Ikeja, Lagos State",
            
            "budget_min": 500000,
            "budget_max": 800000,
            "timeline": "Within 6 weeks",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        response = self.make_request("POST", "/jobs/", json=enhanced_job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            required_fields = ['id', 'state', 'lga', 'town', 'zip_code', 'home_address', 'location', 'postcode']
            missing_fields = [field for field in required_fields if field not in created_job]
            
            if not missing_fields:
                # Verify legacy fields are auto-populated
                if (created_job['location'] == enhanced_job_data['state'] and 
                    created_job['postcode'] == enhanced_job_data['zip_code']):
                    self.log_result("Enhanced job creation with all fields", True, 
                                   f"Job ID: {created_job['id']}, Legacy fields auto-populated")
                    self.test_data['enhanced_job'] = created_job
                else:
                    self.log_result("Enhanced job creation with all fields", False, 
                                   "Legacy fields not auto-populated correctly")
            else:
                self.log_result("Enhanced job creation with all fields", False, 
                               f"Missing fields: {missing_fields}")
        else:
            self.log_result("Enhanced job creation with all fields", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Test LGA-state relationship validation (valid combination)
        valid_combo_data = enhanced_job_data.copy()
        valid_combo_data['title'] = "Valid LGA-State Combination Test"
        valid_combo_data['state'] = "Abuja"
        valid_combo_data['lga'] = "Municipal Area Council (AMAC)"
        valid_combo_data['zip_code'] = "900001"
        
        response = self.make_request("POST", "/jobs/", json=valid_combo_data, auth_token=homeowner_token)
        if response.status_code == 200:
            self.log_result("Valid LGA-state combination", True, "Abuja + AMAC accepted")
        else:
            self.log_result("Valid LGA-state combination", False, f"Status: {response.status_code}")
        
        # Test 3: Test invalid LGA-state combination
        invalid_combo_data = enhanced_job_data.copy()
        invalid_combo_data['title'] = "Invalid LGA-State Combination Test"
        invalid_combo_data['state'] = "Lagos"
        invalid_combo_data['lga'] = "Municipal Area Council (AMAC)"  # This belongs to Abuja, not Lagos
        
        response = self.make_request("POST", "/jobs/", json=invalid_combo_data, auth_token=homeowner_token)
        if response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'does not belong to state' in error_detail:
                self.log_result("Invalid LGA-state combination rejection", True, "Correctly rejected invalid combination")
            else:
                self.log_result("Invalid LGA-state combination rejection", False, f"Wrong error message: {error_detail}")
        else:
            self.log_result("Invalid LGA-state combination rejection", False, f"Expected 400, got {response.status_code}")
        
        # Test 4: Test Nigerian zip code validation (valid 6-digit)
        valid_zip_data = enhanced_job_data.copy()
        valid_zip_data['title'] = "Valid Zip Code Test"
        valid_zip_data['zip_code'] = "123456"  # Valid 6-digit format
        
        response = self.make_request("POST", "/jobs/", json=valid_zip_data, auth_token=homeowner_token)
        if response.status_code == 200:
            self.log_result("Valid 6-digit zip code", True, "123456 accepted")
        else:
            self.log_result("Valid 6-digit zip code", False, f"Status: {response.status_code}")
        
        # Test 5: Test invalid zip code formats
        invalid_zip_formats = [
            ("12345", "5 digits"),
            ("1234567", "7 digits"),
            ("12345a", "non-numeric"),
            ("abc123", "mixed characters")
        ]
        
        for invalid_zip, description in invalid_zip_formats:
            invalid_zip_data = enhanced_job_data.copy()
            invalid_zip_data['title'] = f"Invalid Zip Code Test - {description}"
            invalid_zip_data['zip_code'] = invalid_zip
            
            response = self.make_request("POST", "/jobs/", json=invalid_zip_data, auth_token=homeowner_token)
            if response.status_code == 400:
                self.log_result(f"Invalid zip code rejection ({description})", True, f"Correctly rejected {invalid_zip}")
            else:
                self.log_result(f"Invalid zip code rejection ({description})", False, 
                               f"Expected 400, got {response.status_code}")
        
        # Test 6: Test home address validation (minimum 10 characters)
        short_address_data = enhanced_job_data.copy()
        short_address_data['title'] = "Short Address Test"
        short_address_data['home_address'] = "Short"  # Less than 10 characters
        
        response = self.make_request("POST", "/jobs/", json=short_address_data, auth_token=homeowner_token)
        if response.status_code == 422:  # Pydantic validation error
            self.log_result("Short home address rejection", True, "Correctly rejected address < 10 chars")
        else:
            self.log_result("Short home address rejection", False, f"Expected 422, got {response.status_code}")
    
    def test_database_integration(self):
        """Test database integration and data persistence"""
        print("\n=== Testing Database Integration ===")
        
        if 'enhanced_job' not in self.test_data:
            self.log_result("Database integration tests", False, "No enhanced job available for testing")
            return
        
        job_id = self.test_data['enhanced_job']['id']
        
        # Test 1: Verify job was saved with all enhanced location fields
        response = self.make_request("GET", f"/jobs/{job_id}")
        if response.status_code == 200:
            saved_job = response.json()
            enhanced_fields = ['state', 'lga', 'town', 'zip_code', 'home_address']
            legacy_fields = ['location', 'postcode']
            
            missing_enhanced = [field for field in enhanced_fields if field not in saved_job]
            missing_legacy = [field for field in legacy_fields if field not in saved_job]
            
            if not missing_enhanced and not missing_legacy:
                # Verify legacy fields are properly populated
                if (saved_job['location'] == saved_job['state'] and 
                    saved_job['postcode'] == saved_job['zip_code']):
                    self.log_result("Database persistence of enhanced fields", True, 
                                   "All fields saved and legacy fields auto-populated")
                else:
                    self.log_result("Database persistence of enhanced fields", False, 
                                   "Legacy fields not properly auto-populated")
            else:
                self.log_result("Database persistence of enhanced fields", False, 
                               f"Missing enhanced: {missing_enhanced}, Missing legacy: {missing_legacy}")
        else:
            self.log_result("Database persistence of enhanced fields", False, f"Status: {response.status_code}")
        
        # Test 2: Verify job appears in job listings with enhanced location data
        response = self.make_request("GET", "/jobs/", params={"category": "Kitchen Fitting"})
        if response.status_code == 200:
            jobs_data = response.json()
            jobs = jobs_data.get('jobs', [])
            
            # Find our enhanced job
            enhanced_job_found = None
            for job in jobs:
                if job.get('id') == job_id:
                    enhanced_job_found = job
                    break
            
            if enhanced_job_found:
                if all(field in enhanced_job_found for field in ['state', 'lga', 'town', 'zip_code', 'home_address']):
                    self.log_result("Enhanced job in listings", True, "Job appears with all enhanced fields")
                else:
                    self.log_result("Enhanced job in listings", False, "Job missing enhanced fields in listings")
            else:
                self.log_result("Enhanced job in listings", False, "Enhanced job not found in listings")
        else:
            self.log_result("Enhanced job in listings", False, f"Status: {response.status_code}")
    
    def run_phase_10_tests(self):
        """Run all Phase 10 Enhanced Job Posting Form backend tests"""
        print("🚀 Starting Phase 10: Enhanced Job Posting Form Backend Testing")
        print("="*80)
        print(f"Backend URL: {self.base_url}")
        print("="*80)
        
        # Setup test users
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Cannot proceed with Phase 10 tests.")
            return
        
        # Run Phase 10 test suites
        self.test_lga_api_endpoints()
        self.test_enhanced_job_creation()
        self.test_database_integration()
        
        # Print final results
        print("\n" + "="*80)
        print("🏁 PHASE 10 TEST RESULTS")
        print("="*80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100)
            print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ FAILED TESTS ({len(self.results['errors'])}):")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n🎯 Phase 10 Test Summary:")
        print("   • LGA API Endpoints: Testing all 8 Nigerian states and LGA data retrieval")
        print("   • Enhanced Job Creation: New location fields validation and processing")
        print("   • Model Validation: JobCreate and Job model field validation")
        print("   • Error Handling: Invalid data rejection and proper error responses")
        print("   • Database Integration: Data persistence and backward compatibility")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = Phase10Tester()
    success = tester.run_phase_10_tests()
    exit(0 if success else 1)
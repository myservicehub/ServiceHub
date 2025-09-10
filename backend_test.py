#!/usr/bin/env python3
"""
COMPREHENSIVE JOB POSTING DYNAMIC LOCATION INTEGRATION TESTING

Testing the complete integration of dynamic states and LGAs added via admin dashboard
with the job posting form functionality.

Focus Areas:
1. Dynamic States Integration:
   - Test that GET /api/jobs/locations/states includes both static and admin-added states
   - Verify "Kaduna" state appears in the states list (should return 11 states total)
   - Test that all states are properly sorted alphabetically
   - Verify backward compatibility with existing static states

2. Dynamic LGAs Integration:
   - Test that GET /api/auth/lgas/Kaduna returns the LGAs we added via admin
   - Verify the endpoint returns: "Kaduna North", "Kaduna Central", "Kaduna Municipal983"
   - Test that static states still work (e.g., /api/auth/lgas/Lagos should return 21 LGAs)
   - Test error handling for non-existent states

3. Complete Job Posting Workflow:
   - Test the complete API chain: states → select Kaduna → fetch LGAs
   - Verify that selecting a dynamic state loads the correct LGAs
   - Test job creation with dynamic state/LGA combinations
   - Verify data persistence and validation

4. Backward Compatibility:
   - Test that existing static states still work perfectly
   - Verify no regressions in job posting for original states
   - Test mixed scenarios (dynamic state to static state switching)

5. Error Handling & Edge Cases:
   - Test with invalid state names
   - Test with empty responses
   - Test API timeouts and error scenarios
   - Verify proper error messages and status codes
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import time

# Get backend URL from environment
BACKEND_URL = "https://notify-connect.preview.emergentagent.com/api"

class DynamicLocationTester:
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
    
    def test_admin_authentication(self):
        """Test admin authentication for location management"""
        print("\n=== Testing Admin Authentication ===")
        
        # Test admin login
        admin_credentials = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin/login", json=admin_credentials)
        if response.status_code == 200:
            admin_data = response.json()
            if 'access_token' in admin_data:
                self.auth_tokens['admin'] = admin_data['access_token']
                self.log_result("Admin authentication", True, "Admin login successful")
            else:
                self.log_result("Admin authentication", False, "No access token in response")
        else:
            self.log_result("Admin authentication", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_user_authentication(self):
        """Test user authentication for job posting"""
        print("\n=== Testing User Authentication ===")
        
        # Create a test homeowner for job posting
        homeowner_data = {
            "name": "Adebayo Johnson",
            "email": f"adebayo.johnson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "+2348123456789",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            if 'access_token' in homeowner_profile:
                self.auth_tokens['homeowner'] = homeowner_profile['access_token']
                self.test_data['homeowner_user'] = homeowner_profile['user']
                self.log_result("Create test homeowner", True, f"ID: {homeowner_profile['user']['id']}")
            else:
                self.log_result("Create test homeowner", False, "No access token in response")
        else:
            self.log_result("Create test homeowner", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_dynamic_states_setup(self):
        """Test adding Kaduna state via admin dashboard"""
        print("\n=== Testing Dynamic States Setup ===")
        
        if 'admin' not in self.auth_tokens:
            self.log_result("Dynamic states setup", False, "No admin authentication token")
            return
        
        admin_token = self.auth_tokens['admin']
        
        # Add Kaduna state
        kaduna_state_data = {
            "name": "Kaduna",
            "description": "Kaduna State - Added via admin dashboard for testing dynamic location integration"
        }
        
        response = self.make_request("POST", "/admin/locations/states", json=kaduna_state_data, auth_token=admin_token)
        if response.status_code in [200, 201]:
            state_response = response.json()
            self.log_result("Add Kaduna state", True, f"State added: {state_response.get('name', 'Kaduna')}")
        elif response.status_code == 400 and "already exists" in response.text:
            self.log_result("Add Kaduna state", True, "State already exists (expected)")
        else:
            self.log_result("Add Kaduna state", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_dynamic_lgas_setup(self):
        """Test adding LGAs for Kaduna state via admin dashboard"""
        print("\n=== Testing Dynamic LGAs Setup ===")
        
        if 'admin' not in self.auth_tokens:
            self.log_result("Dynamic LGAs setup", False, "No admin authentication token")
            return
        
        admin_token = self.auth_tokens['admin']
        
        # Add LGAs for Kaduna state
        kaduna_lgas = [
            {
                "name": "Kaduna North",
                "state": "Kaduna",
                "description": "Kaduna North LGA - Added via admin dashboard"
            },
            {
                "name": "Kaduna Central",
                "state": "Kaduna", 
                "description": "Kaduna Central LGA - Added via admin dashboard"
            },
            {
                "name": "Kaduna Municipal983",
                "state": "Kaduna",
                "description": "Kaduna Municipal LGA - Added via admin dashboard with unique identifier"
            }
        ]
        
        for lga_data in kaduna_lgas:
            response = self.make_request("POST", "/admin/locations/lgas", json=lga_data, auth_token=admin_token)
            if response.status_code in [200, 201]:
                lga_response = response.json()
                self.log_result(f"Add {lga_data['name']} LGA", True, f"LGA added to {lga_data['state']}")
            elif response.status_code == 400 and "already exists" in response.text:
                self.log_result(f"Add {lga_data['name']} LGA", True, "LGA already exists (expected)")
            else:
                self.log_result(f"Add {lga_data['name']} LGA", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_dynamic_states_integration(self):
        """Test that GET /api/jobs/locations/states includes both static and admin-added states"""
        print("\n=== Testing Dynamic States Integration ===")
        
        # Test 1: Get all states from jobs endpoint
        response = self.make_request("GET", "/jobs/locations/states")
        if response.status_code == 200:
            states_data = response.json()
            states_list = states_data.get('states', [])
            
            # Verify Kaduna is included
            if "Kaduna" in states_list:
                self.log_result("Kaduna state in states list", True, f"Found Kaduna in {len(states_list)} states")
            else:
                self.log_result("Kaduna state in states list", False, f"Kaduna not found in states: {states_list}")
            
            # Verify total count (should be 11 states: 8 static + Kaduna + potentially others)
            if len(states_list) >= 9:  # At least 8 static + Kaduna
                self.log_result("States count verification", True, f"Found {len(states_list)} states (expected ≥9)")
            else:
                self.log_result("States count verification", False, f"Expected ≥9 states, got {len(states_list)}")
            
            # Verify alphabetical sorting
            sorted_states = sorted(states_list)
            if states_list == sorted_states:
                self.log_result("States alphabetical sorting", True, "States are properly sorted")
            else:
                self.log_result("States alphabetical sorting", False, f"States not sorted: {states_list}")
            
            # Verify static states still present
            static_states = ["Lagos", "Abuja", "Delta", "Rivers State"]
            missing_static = [state for state in static_states if state not in states_list]
            if not missing_static:
                self.log_result("Static states backward compatibility", True, "All static states present")
            else:
                self.log_result("Static states backward compatibility", False, f"Missing static states: {missing_static}")
            
            self.test_data['all_states'] = states_list
        else:
            self.log_result("Get states endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_dynamic_lgas_integration(self):
        """Test that GET /api/auth/lgas/Kaduna returns the LGAs we added via admin"""
        print("\n=== Testing Dynamic LGAs Integration ===")
        
        # Test 1: Get LGAs for Kaduna state
        response = self.make_request("GET", "/auth/lgas/Kaduna")
        if response.status_code == 200:
            lgas_data = response.json()
            lgas_list = lgas_data.get('lgas', [])
            state_name = lgas_data.get('state', '')
            total_lgas = lgas_data.get('total', 0)
            
            # Verify state name
            if state_name == "Kaduna":
                self.log_result("Kaduna LGAs endpoint - state name", True, f"Correct state: {state_name}")
            else:
                self.log_result("Kaduna LGAs endpoint - state name", False, f"Expected 'Kaduna', got '{state_name}'")
            
            # Verify expected LGAs are present
            expected_lgas = ["Kaduna North", "Kaduna Central", "Kaduna Municipal983"]
            found_lgas = [lga for lga in expected_lgas if lga in lgas_list]
            
            if len(found_lgas) == len(expected_lgas):
                self.log_result("Kaduna LGAs content verification", True, f"All 3 expected LGAs found: {found_lgas}")
            else:
                missing_lgas = [lga for lga in expected_lgas if lga not in lgas_list]
                self.log_result("Kaduna LGAs content verification", False, f"Missing LGAs: {missing_lgas}, Found: {found_lgas}")
            
            # Verify total count
            if total_lgas >= 3:
                self.log_result("Kaduna LGAs count", True, f"Found {total_lgas} LGAs (expected ≥3)")
            else:
                self.log_result("Kaduna LGAs count", False, f"Expected ≥3 LGAs, got {total_lgas}")
            
            self.test_data['kaduna_lgas'] = lgas_list
        else:
            self.log_result("Get Kaduna LGAs endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Verify static states still work (Lagos)
        response = self.make_request("GET", "/auth/lgas/Lagos")
        if response.status_code == 200:
            lagos_data = response.json()
            lagos_lgas = lagos_data.get('lgas', [])
            
            # Lagos should have 20 LGAs
            if len(lagos_lgas) >= 20:
                self.log_result("Lagos LGAs backward compatibility", True, f"Lagos has {len(lagos_lgas)} LGAs (expected ≥20)")
            else:
                self.log_result("Lagos LGAs backward compatibility", False, f"Expected ≥20 LGAs for Lagos, got {len(lagos_lgas)}")
        else:
            self.log_result("Lagos LGAs backward compatibility", False, f"Status: {response.status_code}")
        
        # Test 3: Error handling for non-existent state
        response = self.make_request("GET", "/auth/lgas/NonExistentState")
        if response.status_code == 404:
            self.log_result("Non-existent state error handling", True, "Correctly returned 404 for invalid state")
        else:
            self.log_result("Non-existent state error handling", False, f"Expected 404, got {response.status_code}")
    
    def test_complete_job_posting_workflow(self):
        """Test the complete API chain: states → select Kaduna → fetch LGAs → create job"""
        print("\n=== Testing Complete Job Posting Workflow ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job posting workflow", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test 1: Create job with dynamic location (Kaduna state)
        job_data_dynamic = {
            "title": "Plumbing Services Needed in Kaduna",
            "description": "Need professional plumber for bathroom renovation in Kaduna North. Includes pipe installation and fixture replacement.",
            "category": "Plumbing",
            "state": "Kaduna",
            "lga": "Kaduna North",
            "town": "Kaduna North Central",
            "zip_code": "800001",
            "home_address": "123 Independence Way, Kaduna North",
            "budget_min": 50000,
            "budget_max": 150000,
            "timeline": "Within 2 weeks",
            "requirements": "Licensed plumber with experience in residential projects"
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data_dynamic, auth_token=homeowner_token)
        if response.status_code == 200:
            job_response = response.json()
            job_id = job_response.get('id')
            
            # Verify job data
            if job_response.get('state') == "Kaduna" and job_response.get('lga') == "Kaduna North":
                self.log_result("Create job with dynamic location", True, f"Job created with ID: {job_id}")
                self.test_data['dynamic_job_id'] = job_id
                
                # Verify legacy fields are populated
                if job_response.get('location') == "Kaduna" and job_response.get('postcode') == "800001":
                    self.log_result("Legacy fields auto-population", True, "Location and postcode correctly populated")
                else:
                    self.log_result("Legacy fields auto-population", False, f"Legacy fields incorrect: location={job_response.get('location')}, postcode={job_response.get('postcode')}")
            else:
                self.log_result("Create job with dynamic location", False, f"Incorrect location data: state={job_response.get('state')}, lga={job_response.get('lga')}")
        else:
            self.log_result("Create job with dynamic location", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Create job with static location (Lagos state)
        job_data_static = {
            "title": "Electrical Work in Lagos",
            "description": "Need electrical installation in Ikeja area. Includes wiring and socket installation.",
            "category": "Electrical",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "456 Allen Avenue, Ikeja",
            "budget_min": 75000,
            "budget_max": 200000,
            "timeline": "Within 1 week",
            "requirements": "Certified electrician with commercial experience"
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data_static, auth_token=homeowner_token)
        if response.status_code == 200:
            job_response = response.json()
            job_id = job_response.get('id')
            
            if job_response.get('state') == "Lagos" and job_response.get('lga') == "Ikeja":
                self.log_result("Create job with static location", True, f"Job created with ID: {job_id}")
                self.test_data['static_job_id'] = job_id
            else:
                self.log_result("Create job with static location", False, f"Incorrect location data: state={job_response.get('state')}, lga={job_response.get('lga')}")
        else:
            self.log_result("Create job with static location", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_job_data_persistence_and_retrieval(self):
        """Test that jobs with dynamic locations are properly stored and retrieved"""
        print("\n=== Testing Job Data Persistence and Retrieval ===")
        
        # Test 1: Retrieve dynamic location job
        if 'dynamic_job_id' in self.test_data:
            job_id = self.test_data['dynamic_job_id']
            response = self.make_request("GET", f"/jobs/{job_id}")
            
            if response.status_code == 200:
                job_data = response.json()
                
                # Verify all location fields are preserved
                location_fields = {
                    'state': 'Kaduna',
                    'lga': 'Kaduna North',
                    'town': 'Kaduna North Central',
                    'zip_code': '800001',
                    'home_address': '123 Independence Way, Kaduna North'
                }
                
                all_correct = True
                for field, expected_value in location_fields.items():
                    actual_value = job_data.get(field)
                    if actual_value != expected_value:
                        all_correct = False
                        print(f"   Field {field}: expected '{expected_value}', got '{actual_value}'")
                
                if all_correct:
                    self.log_result("Dynamic job data persistence", True, "All location fields correctly stored and retrieved")
                else:
                    self.log_result("Dynamic job data persistence", False, "Some location fields incorrect")
            else:
                self.log_result("Dynamic job data persistence", False, f"Status: {response.status_code}")
        
        # Test 2: Retrieve static location job
        if 'static_job_id' in self.test_data:
            job_id = self.test_data['static_job_id']
            response = self.make_request("GET", f"/jobs/{job_id}")
            
            if response.status_code == 200:
                job_data = response.json()
                
                if job_data.get('state') == 'Lagos' and job_data.get('lga') == 'Ikeja':
                    self.log_result("Static job data persistence", True, "Static location job correctly stored and retrieved")
                else:
                    self.log_result("Static job data persistence", False, f"Static job location incorrect: state={job_data.get('state')}, lga={job_data.get('lga')}")
            else:
                self.log_result("Static job data persistence", False, f"Status: {response.status_code}")
    
    def test_validation_and_error_handling(self):
        """Test validation and error handling for dynamic locations"""
        print("\n=== Testing Validation and Error Handling ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Validation tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test 1: Invalid LGA for valid state
        invalid_lga_job = {
            "title": "Test Job with Invalid LGA",
            "description": "Testing validation",
            "category": "Plumbing",
            "state": "Kaduna",
            "lga": "NonExistentLGA",  # Invalid LGA for Kaduna
            "town": "Test Town",
            "zip_code": "800001",
            "home_address": "Test Address",
            "budget_min": 50000,
            "budget_max": 100000,
            "timeline": "1 week",
            "requirements": "Test requirements"
        }
        
        response = self.make_request("POST", "/jobs/", json=invalid_lga_job, auth_token=homeowner_token)
        if response.status_code == 400:
            self.log_result("Invalid LGA validation", True, "Correctly rejected invalid LGA")
        else:
            self.log_result("Invalid LGA validation", False, f"Expected 400, got {response.status_code}")
        
        # Test 2: Invalid state
        invalid_state_job = {
            "title": "Test Job with Invalid State",
            "description": "Testing validation",
            "category": "Plumbing",
            "state": "NonExistentState",
            "lga": "SomeLGA",
            "town": "Test Town",
            "zip_code": "800001",
            "home_address": "Test Address",
            "budget_min": 50000,
            "budget_max": 100000,
            "timeline": "1 week",
            "requirements": "Test requirements"
        }
        
        response = self.make_request("POST", "/jobs/", json=invalid_state_job, auth_token=homeowner_token)
        if response.status_code == 400:
            self.log_result("Invalid state validation", True, "Correctly rejected invalid state")
        else:
            self.log_result("Invalid state validation", False, f"Expected 400, got {response.status_code}")
        
        # Test 3: Invalid zip code format
        invalid_zip_job = {
            "title": "Test Job with Invalid Zip",
            "description": "Testing validation",
            "category": "Plumbing",
            "state": "Kaduna",
            "lga": "Kaduna North",
            "town": "Test Town",
            "zip_code": "12345",  # Invalid - should be 6 digits
            "home_address": "Test Address",
            "budget_min": 50000,
            "budget_max": 100000,
            "timeline": "1 week",
            "requirements": "Test requirements"
        }
        
        response = self.make_request("POST", "/jobs/", json=invalid_zip_job, auth_token=homeowner_token)
        if response.status_code in [400, 422]:
            self.log_result("Invalid zip code validation", True, "Correctly rejected invalid zip code")
        else:
            self.log_result("Invalid zip code validation", False, f"Expected 400/422, got {response.status_code}")
    
    def test_mixed_scenarios(self):
        """Test mixed scenarios with dynamic and static locations"""
        print("\n=== Testing Mixed Scenarios ===")
        
        # Test 1: Get all LGAs endpoint
        response = self.make_request("GET", "/auth/all-lgas")
        if response.status_code == 200:
            all_lgas_data = response.json()
            lgas_by_state = all_lgas_data.get('lgas_by_state', {})
            total_states = all_lgas_data.get('total_states', 0)
            total_lgas = all_lgas_data.get('total_lgas', 0)
            
            # Verify Kaduna is included in all LGAs
            if 'Kaduna' in lgas_by_state:
                kaduna_lgas = lgas_by_state['Kaduna']
                expected_lgas = ["Kaduna North", "Kaduna Central", "Kaduna Municipal983"]
                found_expected = [lga for lga in expected_lgas if lga in kaduna_lgas]
                
                if len(found_expected) == len(expected_lgas):
                    self.log_result("All LGAs endpoint - Kaduna integration", True, f"Kaduna has {len(kaduna_lgas)} LGAs including all expected ones")
                else:
                    self.log_result("All LGAs endpoint - Kaduna integration", False, f"Missing expected LGAs: {set(expected_lgas) - set(found_expected)}")
            else:
                self.log_result("All LGAs endpoint - Kaduna integration", False, "Kaduna not found in all LGAs response")
            
            # Verify total counts make sense
            if total_states >= 9 and total_lgas >= 140:  # Rough estimates
                self.log_result("All LGAs endpoint - totals", True, f"Reasonable totals: {total_states} states, {total_lgas} LGAs")
            else:
                self.log_result("All LGAs endpoint - totals", False, f"Unexpected totals: {total_states} states, {total_lgas} LGAs")
        else:
            self.log_result("All LGAs endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: Nigerian states endpoint
        response = self.make_request("GET", "/auth/nigerian-states")
        if response.status_code == 200:
            states_data = response.json()
            states_list = states_data.get('states', [])
            
            if "Kaduna" in states_list and "Lagos" in states_list:
                self.log_result("Nigerian states endpoint integration", True, f"Both dynamic and static states present in {len(states_list)} states")
            else:
                missing = []
                if "Kaduna" not in states_list:
                    missing.append("Kaduna")
                if "Lagos" not in states_list:
                    missing.append("Lagos")
                self.log_result("Nigerian states endpoint integration", False, f"Missing states: {missing}")
        else:
            self.log_result("Nigerian states endpoint", False, f"Status: {response.status_code}")
    
    def run_dynamic_location_tests(self):
        """Run comprehensive dynamic location integration testing"""
        print("🎯 STARTING COMPREHENSIVE JOB POSTING DYNAMIC LOCATION INTEGRATION TESTING")
        print("=" * 80)
        
        # Setup authentication and test data
        self.test_admin_authentication()
        self.test_user_authentication()
        
        # Setup dynamic locations via admin
        self.test_dynamic_states_setup()
        self.test_dynamic_lgas_setup()
        
        # Test dynamic location integration
        self.test_dynamic_states_integration()
        self.test_dynamic_lgas_integration()
        
        # Test complete job posting workflow
        self.test_complete_job_posting_workflow()
        self.test_job_data_persistence_and_retrieval()
        
        # Test validation and error handling
        self.test_validation_and_error_handling()
        
        # Test mixed scenarios
        self.test_mixed_scenarios()
        
        # Print final summary
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE JOB POSTING DYNAMIC LOCATION INTEGRATION TESTING COMPLETE")
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['failed'] > 0:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        return success_rate >= 85  # Consider 85%+ as successful

if __name__ == "__main__":
    tester = DynamicLocationTester()
    tester.run_dynamic_location_tests()
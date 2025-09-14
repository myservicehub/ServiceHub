#!/usr/bin/env python3
"""
Enhanced Job Posting Backend Testing
Test the enhanced job posting functionality with new location fields
"""

import requests
import json
import uuid
from datetime import datetime, timedelta

# Get backend URL from environment
BACKEND_URL = "https://servicehub-connect-2.preview.emergentagent.com/api"

class EnhancedJobPostingTester:
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
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            
            if 'json' in kwargs:
                kwargs['headers']['Content-Type'] = 'application/json'
            
            if auth_token:
                kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
            
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_lga_api_endpoints(self):
        """Test LGA API endpoints for Nigerian states"""
        print("\n=== Testing LGA API Endpoints ===")
        
        # Test 1: Get all LGAs
        response = self.make_request("GET", "/auth/all-lgas")
        if response.status_code == 200:
            data = response.json()
            if 'lgas_by_state' in data and 'total_states' in data and 'total_lgas' in data:
                lgas_by_state = data['lgas_by_state']
                total_states = data['total_states']
                total_lgas = data['total_lgas']
                
                if total_states >= 8:
                    self.log_result("Get all LGAs", True, f"Found {total_states} states with {total_lgas} total LGAs")
                    self.test_data['lgas_by_state'] = lgas_by_state
                else:
                    self.log_result("Get all LGAs", False, f"Expected at least 8 states, got {total_states}")
            else:
                self.log_result("Get all LGAs", False, "Invalid response structure")
        else:
            self.log_result("Get all LGAs", False, f"Status: {response.status_code}")
        
        # Test 2: Get LGAs for specific states
        test_states = ["Lagos", "Abuja", "Delta", "Rivers State"]
        for state in test_states:
            response = self.make_request("GET", f"/auth/lgas/{state}")
            if response.status_code == 200:
                data = response.json()
                if 'state' in data and 'lgas' in data and 'total' in data:
                    lgas = data['lgas']
                    if len(lgas) > 0:
                        self.log_result(f"Get LGAs for {state}", True, f"Found {len(lgas)} LGAs")
                    else:
                        self.log_result(f"Get LGAs for {state}", False, "No LGAs found")
                else:
                    self.log_result(f"Get LGAs for {state}", False, "Invalid response structure")
            else:
                self.log_result(f"Get LGAs for {state}", False, f"Status: {response.status_code}")
        
        # Test 3: Test invalid state
        response = self.make_request("GET", "/auth/lgas/InvalidState")
        if response.status_code == 404:
            self.log_result("Invalid state handling", True, "Correctly returned 404 for invalid state")
        else:
            self.log_result("Invalid state handling", False, f"Expected 404, got {response.status_code}")

    def test_authentication_setup(self):
        """Set up authentication for testing"""
        print("\n=== Setting Up Authentication ===")
        
        # Use the provided credentials
        login_data = {
            "email": "john.plumber@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        if response.status_code == 200:
            login_response = response.json()
            if 'access_token' in login_response and login_response.get('user', {}).get('role') == 'homeowner':
                self.log_result("Homeowner login", True, f"User: {login_response['user']['name']}")
                self.auth_tokens['homeowner'] = login_response['access_token']
                self.test_data['homeowner_user'] = login_response['user']
                return True
            else:
                self.log_result("Homeowner login", False, "Invalid login response or wrong role")
        else:
            self.log_result("Homeowner login", False, f"Status: {response.status_code}, Response: {response.text}")
        
        return False

    def test_enhanced_job_creation_authenticated(self):
        """Test enhanced job creation with authenticated user"""
        print("\n=== Testing Enhanced Job Creation (Authenticated) ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Enhanced job creation tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test enhanced job creation with new location fields
        enhanced_job_data = {
            "title": "Modern Kitchen Renovation - Enhanced Location Test",
            "description": "Looking for an experienced contractor to renovate our kitchen in Lekki, Lagos. The project includes installing new cabinets, countertops, and modern appliances. We need professional installation with proper electrical and plumbing connections. The kitchen is approximately 15 square meters.",
            "category": "Kitchen Fitting",
            "state": "Lagos",
            "lga": "Eti-Osa",
            "town": "Lekki Phase 1",
            "zip_code": "105102",
            "home_address": "15 Admiralty Way, Lekki Phase 1, Lagos State, Nigeria",
            "budget_min": 500000,
            "budget_max": 800000,
            "timeline": "Within 6 weeks"
        }
        
        response = self.make_request("POST", "/jobs/", json=enhanced_job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            
            # Verify enhanced location fields are present
            required_fields = ['state', 'lga', 'town', 'zip_code', 'home_address']
            missing_fields = [field for field in required_fields if field not in created_job or not created_job[field]]
            
            if not missing_fields:
                self.log_result("Enhanced job creation (authenticated)", True, f"Job ID: {created_job['id']}")
                self.test_data['enhanced_job'] = created_job
                
                # Verify legacy fields are auto-populated
                if created_job.get('location') == enhanced_job_data['state'] and created_job.get('postcode') == enhanced_job_data['zip_code']:
                    self.log_result("Legacy fields auto-population", True, "location and postcode correctly set")
                else:
                    self.log_result("Legacy fields auto-population", False, f"location: {created_job.get('location')}, postcode: {created_job.get('postcode')}")
                
                # Verify homeowner data is from authenticated user
                homeowner = created_job.get('homeowner', {})
                if homeowner.get('email') == self.test_data['homeowner_user']['email']:
                    self.log_result("Authenticated user data integration", True, "Homeowner data from authenticated user")
                else:
                    self.log_result("Authenticated user data integration", False, "Homeowner data mismatch")
            else:
                self.log_result("Enhanced job creation (authenticated)", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Enhanced job creation (authenticated)", False, f"Status: {response.status_code}, Response: {response.text}")

    def test_enhanced_job_creation_non_authenticated(self):
        """Test enhanced job creation without authentication (should fail)"""
        print("\n=== Testing Enhanced Job Creation (Non-Authenticated) ===")
        
        enhanced_job_data = {
            "title": "Plumbing Repair - Non-Auth Test",
            "description": "Need urgent plumbing repair for bathroom. Leaking pipes and blocked drain need professional attention in our Ikeja home.",
            "category": "Plumbing",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Ikeja GRA",
            "zip_code": "100001",
            "home_address": "25 Obafemi Awolowo Way, Ikeja GRA, Lagos State",
            "budget_min": 50000,
            "budget_max": 100000,
            "timeline": "Within 1 week"
        }
        
        # Try to create job without authentication
        response = self.make_request("POST", "/jobs/", json=enhanced_job_data)
        if response.status_code in [401, 403]:
            self.log_result("Non-authenticated job creation prevention", True, "Correctly requires authentication")
        else:
            self.log_result("Non-authenticated job creation prevention", False, f"Expected 401/403, got {response.status_code}")

    def test_location_field_validation(self):
        """Test validation of enhanced location fields"""
        print("\n=== Testing Location Field Validation ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Location validation tests", False, "No homeowner token available")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test 1: Invalid LGA for state
        invalid_lga_job = {
            "title": "Test Job - Invalid LGA",
            "description": "This is a test job with invalid LGA for the specified state to test validation.",
            "category": "Plumbing",
            "state": "Lagos",
            "lga": "Gwagwalada",  # This LGA belongs to Abuja, not Lagos
            "town": "Test Town",
            "zip_code": "100001",
            "home_address": "Test Address for validation",
            "budget_min": 50000,
            "budget_max": 100000,
            "timeline": "Within 2 weeks"
        }
        
        response = self.make_request("POST", "/jobs/", json=invalid_lga_job, auth_token=homeowner_token)
        if response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'does not belong to state' in error_detail:
                self.log_result("Invalid LGA-state validation", True, "Correctly rejected invalid LGA")
            else:
                self.log_result("Invalid LGA-state validation", False, f"Wrong error message: {error_detail}")
        else:
            self.log_result("Invalid LGA-state validation", False, f"Expected 400, got {response.status_code}")
        
        # Test 2: Invalid zip code format
        invalid_zip_job = {
            "title": "Test Job - Invalid Zip Code",
            "description": "This is a test job with invalid zip code format to test validation.",
            "category": "Electrical",
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Test Town",
            "zip_code": "12345",  # Invalid - should be 6 digits
            "home_address": "Test Address for zip validation",
            "budget_min": 75000,
            "budget_max": 150000,
            "timeline": "Within 3 weeks"
        }
        
        response = self.make_request("POST", "/jobs/", json=invalid_zip_job, auth_token=homeowner_token)
        if response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'zip code' in error_detail.lower() and '6 digits' in error_detail:
                self.log_result("Invalid zip code validation", True, "Correctly rejected invalid zip code")
            else:
                self.log_result("Invalid zip code validation", False, f"Wrong error message: {error_detail}")
        else:
            self.log_result("Invalid zip code validation", False, f"Expected 400, got {response.status_code}")
        
        # Test 3: Valid enhanced job creation
        valid_enhanced_job = {
            "title": "Test Job - Valid Enhanced Fields",
            "description": "This is a test job with all valid enhanced location fields to verify successful creation.",
            "category": "Painting",
            "state": "Lagos",
            "lga": "Victoria Island",
            "town": "Victoria Island",
            "zip_code": "101241",
            "home_address": "123 Ahmadu Bello Way, Victoria Island, Lagos State",
            "budget_min": 150000,
            "budget_max": 300000,
            "timeline": "Within 5 weeks"
        }
        
        response = self.make_request("POST", "/jobs/", json=valid_enhanced_job, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            self.log_result("Valid enhanced job creation", True, f"Job ID: {created_job['id']}")
        else:
            self.log_result("Valid enhanced job creation", False, f"Status: {response.status_code}, Response: {response.text}")

    def test_backward_compatibility(self):
        """Test backward compatibility with existing job records"""
        print("\n=== Testing Backward Compatibility ===")
        
        # Test that jobs can be retrieved even if they don't have enhanced fields
        response = self.make_request("GET", "/jobs/", params={"page": 1, "limit": 5})
        if response.status_code == 200:
            data = response.json()
            jobs = data.get('jobs', [])
            if len(jobs) > 0:
                # Check if jobs without enhanced fields still work
                jobs_with_legacy_only = [job for job in jobs if not job.get('state')]
                jobs_with_enhanced = [job for job in jobs if job.get('state')]
                
                self.log_result("Backward compatibility - job retrieval", True, 
                               f"Retrieved {len(jobs)} jobs ({len(jobs_with_enhanced)} enhanced, {len(jobs_with_legacy_only)} legacy)")
                
                # Verify that enhanced jobs have both legacy and new fields
                if jobs_with_enhanced:
                    enhanced_job = jobs_with_enhanced[0]
                    has_legacy = enhanced_job.get('location') and enhanced_job.get('postcode')
                    has_enhanced = enhanced_job.get('state') and enhanced_job.get('lga')
                    
                    if has_legacy and has_enhanced:
                        self.log_result("Enhanced job field compatibility", True, "Enhanced jobs have both legacy and new fields")
                    else:
                        self.log_result("Enhanced job field compatibility", False, f"Legacy: {has_legacy}, Enhanced: {has_enhanced}")
            else:
                self.log_result("Backward compatibility - job retrieval", True, "No jobs found (expected for new system)")
        else:
            self.log_result("Backward compatibility - job retrieval", False, f"Status: {response.status_code}")

    def run_all_tests(self):
        """Run all enhanced job posting tests"""
        print("🚀 Starting Enhanced Job Posting Backend Testing")
        print("=" * 60)
        
        try:
            # Step 1: Test LGA API endpoints
            self.test_lga_api_endpoints()
            
            # Step 2: Set up authentication
            if self.test_authentication_setup():
                # Step 3: Test enhanced job creation with authentication
                self.test_enhanced_job_creation_authenticated()
                
                # Step 4: Test location field validation
                self.test_location_field_validation()
            
            # Step 5: Test enhanced job creation without authentication
            self.test_enhanced_job_creation_non_authenticated()
            
            # Step 6: Test backward compatibility
            self.test_backward_compatibility()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            self.results['errors'].append(f"Test suite error: {str(e)}")
        
        # Print final results
        print("\n" + "=" * 60)
        print("📊 ENHANCED JOB POSTING TEST RESULTS")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100)
            print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 Failed Tests:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = EnhancedJobPostingTester()
    results = tester.run_all_tests()
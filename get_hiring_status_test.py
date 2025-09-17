#!/usr/bin/env python3
"""
FOCUSED GET HIRING STATUS ENDPOINT TESTING

Testing the new GET /api/messages/hiring-status/{job_id} endpoint as requested:

1. GET Hiring Status Endpoint:
   - Test GET /api/messages/hiring-status/{job_id}
   - Verify it returns hiring status data for jobs where homeowner has answered
   - Test it returns 404 for jobs without hiring status
   - Test authentication (homeowner-only access)
   - Test authorization (only for homeowner's own jobs)

2. Complete Workflow Testing:
   - Create a job and hiring status record
   - Verify GET endpoint returns the hiring status correctly
   - Test the data structure includes hired/job_status fields
   - Verify the frontend can determine if homeowner has answered questions

3. Integration with Existing System:
   - Test that existing hiring status creation still works
   - Test that the get endpoint works with previously created records
   - Verify the workflow: Answer questions → Status saved → Button appears

4. Database Integration:
   - Test querying hiring_status collection by job_id and homeowner_id
   - Verify sorting by created_at to get latest status
   - Test with multiple status records for same job
"""

import requests
import json
import uuid
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://tradesman-connect.preview.emergentagent.com/api"

class GetHiringStatusTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {'passed': 0, 'failed': 0, 'errors': []}
        self.homeowner_token = None
        self.tradesperson_token = None
        self.homeowner_id = None
        self.tradesperson_id = None
        self.test_job_id = None
        
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
    
    def setup_test_data(self):
        """Create test homeowner, tradesperson, and job"""
        print("\n=== Setting Up Test Data ===")
        
        # Create test homeowner
        homeowner_data = {
            "name": "GET Hiring Status Test Homeowner",
            "email": f"get.hiring.homeowner.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            data = response.json()
            self.homeowner_token = data.get('access_token')
            self.homeowner_id = data.get('user', {}).get('id')
            self.log_result("Homeowner creation", True, f"ID: {self.homeowner_id}")
        else:
            self.log_result("Homeowner creation", False, f"Status: {response.status_code}")
            return False
        
        # Create test tradesperson
        tradesperson_data = {
            "name": "GET Hiring Status Test Tradesperson",
            "email": f"get.hiring.tradesperson.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348087654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 5,
            "description": "Test tradesperson for GET hiring status endpoint testing"
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            data = response.json()
            self.tradesperson_token = data.get('access_token')
            self.tradesperson_id = data.get('id')
            self.log_result("Tradesperson creation", True, f"ID: {self.tradesperson_id}")
        else:
            self.log_result("Tradesperson creation", False, f"Status: {response.status_code}")
            return False
        
        # Create test job
        job_data = {
            "title": "GET Hiring Status Test Job",
            "description": "Test job for GET hiring status endpoint testing",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 50000,
            "budget_max": 150000,
            "state": "Lagos",
            "lga": "Ikeja", 
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Test Street, Computer Village",
            "homeowner_name": "GET Hiring Status Test Homeowner",
            "homeowner_email": homeowner_data["email"],
            "homeowner_phone": "+2348012345678",
            "questions": [],
            "photos": []
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=self.homeowner_token)
        if response.status_code == 200:
            data = response.json()
            self.test_job_id = data.get('id')
            self.log_result("Test job creation", True, f"Job ID: {self.test_job_id}")
            return True
        else:
            self.log_result("Test job creation", False, f"Status: {response.status_code}")
            return False
    
    def test_get_hiring_status_basic_functionality(self):
        """Test basic GET hiring status functionality"""
        print("\n=== Testing GET Hiring Status Basic Functionality ===")
        
        # Test 1: GET hiring status for job without status (should return 404)
        print("\n--- Test 1: GET Hiring Status for Job Without Status ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 404:
            self.log_result("GET hiring status - no status", True, "Correctly returned 404 for job without status")
        else:
            self.log_result("GET hiring status - no status", False, f"Expected 404, got {response.status_code}")
        
        # Test 2: Create hiring status record
        print("\n--- Test 2: Create Hiring Status Record ---")
        hiring_data = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": True,
            "jobStatus": "completed"
        }
        
        response = self.make_request("POST", "/messages/hiring-status", 
                                   json=hiring_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Create hiring status", True, "Successfully created hiring status")
        else:
            self.log_result("Create hiring status", False, f"Status: {response.status_code}")
            return
        
        # Test 3: GET hiring status for job with status (should return 200)
        print("\n--- Test 3: GET Hiring Status for Job With Status ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['id', 'job_id', 'homeowner_id', 'tradesperson_id', 'hired', 'job_status', 'created_at']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("GET hiring status structure", True, 
                                  f"All required fields present: {list(data.keys())}")
                    
                    # Verify data values
                    if (data.get('hired') == True and 
                        data.get('job_status') == 'completed' and 
                        data.get('job_id') == self.test_job_id and
                        data.get('homeowner_id') == self.homeowner_id and
                        data.get('tradesperson_id') == self.tradesperson_id):
                        self.log_result("GET hiring status data", True, "All data values correct")
                    else:
                        self.log_result("GET hiring status data", False, "Data values mismatch")
                        
                    # Verify frontend can determine homeowner has answered
                    if data.get('hired') is not None and data.get('job_status') is not None:
                        self.log_result("Frontend determination", True, "Frontend can determine homeowner has answered questions")
                    else:
                        self.log_result("Frontend determination", False, "Missing data for frontend determination")
                        
                else:
                    self.log_result("GET hiring status structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("GET hiring status with status", False, "Invalid JSON response")
        else:
            self.log_result("GET hiring status with status", False, f"Status: {response.status_code}")
    
    def test_authentication_and_authorization(self):
        """Test authentication and authorization requirements"""
        print("\n=== Testing Authentication and Authorization ===")
        
        # Test 1: No authentication token
        print("\n--- Test 1: No Authentication Token ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("No auth token", True, "Correctly rejected unauthenticated request")
        else:
            self.log_result("No auth token", False, f"Expected 401/403, got {response.status_code}")
        
        # Test 2: Tradesperson trying to access (homeowner-only endpoint)
        print("\n--- Test 2: Tradesperson Access (Should Fail) ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                   auth_token=self.tradesperson_token)
        
        if response.status_code == 403:
            self.log_result("Tradesperson access", True, "Correctly rejected tradesperson access")
        else:
            self.log_result("Tradesperson access", False, f"Expected 403, got {response.status_code}")
        
        # Test 3: Different homeowner trying to access (authorization check)
        print("\n--- Test 3: Different Homeowner Access (Should Fail) ---")
        # Create another homeowner
        other_homeowner_data = {
            "name": "Other Homeowner",
            "email": f"other.homeowner.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345679",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=other_homeowner_data)
        if response.status_code == 200:
            other_data = response.json()
            other_token = other_data.get('access_token')
            
            # Try to access original homeowner's job hiring status
            response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                       auth_token=other_token)
            
            if response.status_code == 403:
                self.log_result("Other homeowner access", True, "Correctly rejected access to other homeowner's job")
            else:
                self.log_result("Other homeowner access", False, f"Expected 403, got {response.status_code}")
        else:
            self.log_result("Other homeowner access", False, "Could not create other homeowner for test")
    
    def test_database_integration_and_sorting(self):
        """Test database integration and sorting by created_at"""
        print("\n=== Testing Database Integration and Sorting ===")
        
        # Test 1: Create multiple hiring status records for same job
        print("\n--- Test 1: Create Multiple Hiring Status Records ---")
        
        # Create second hiring status record
        hiring_data_2 = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": True,
            "jobStatus": "in_progress"
        }
        
        response = self.make_request("POST", "/messages/hiring-status", 
                                   json=hiring_data_2, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Create second hiring status", True, "Successfully created second hiring status")
        else:
            self.log_result("Create second hiring status", False, f"Status: {response.status_code}")
            return
        
        # Create third hiring status record
        hiring_data_3 = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": False,
            "jobStatus": "cancelled"
        }
        
        response = self.make_request("POST", "/messages/hiring-status", 
                                   json=hiring_data_3, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Create third hiring status", True, "Successfully created third hiring status")
        else:
            self.log_result("Create third hiring status", False, f"Status: {response.status_code}")
            return
        
        # Test 2: GET hiring status should return latest record (sorted by created_at DESC)
        print("\n--- Test 2: GET Latest Hiring Status (Sorting Test) ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Should return the latest record (hired=False, job_status="cancelled")
                if data.get('hired') == False and data.get('job_status') == 'cancelled':
                    self.log_result("Latest hiring status", True, "Correctly returned latest hiring status record")
                else:
                    self.log_result("Latest hiring status", False, 
                                  f"Expected hired=False, job_status='cancelled', got hired={data.get('hired')}, job_status={data.get('job_status')}")
                    
                # Verify created_at field exists
                if data.get('created_at'):
                    self.log_result("Created_at field", True, f"Created_at: {data.get('created_at')}")
                else:
                    self.log_result("Created_at field", False, "Missing created_at field")
                    
            except json.JSONDecodeError:
                self.log_result("Latest hiring status", False, "Invalid JSON response")
        else:
            self.log_result("Latest hiring status", False, f"Status: {response.status_code}")
    
    def test_complete_workflow(self):
        """Test the complete workflow: Answer questions → Status saved → Button appears"""
        print("\n=== Testing Complete Workflow ===")
        
        # Create a new job for workflow testing
        print("\n--- Creating New Job for Workflow Test ---")
        workflow_job_data = {
            "title": "Workflow Test Job",
            "description": "Job for testing complete workflow",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 30000,
            "budget_max": 80000,
            "state": "Lagos",
            "lga": "Ikeja", 
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "456 Workflow Street",
            "homeowner_name": "Workflow Test Homeowner",
            "homeowner_email": f"workflow.{uuid.uuid4().hex[:8]}@test.com",
            "homeowner_phone": "+2348012345678",
            "questions": [],
            "photos": []
        }
        
        response = self.make_request("POST", "/jobs/", json=workflow_job_data, auth_token=self.homeowner_token)
        if response.status_code == 200:
            workflow_job_id = response.json().get('id')
            self.log_result("Workflow job creation", True, f"Job ID: {workflow_job_id}")
        else:
            self.log_result("Workflow job creation", False, f"Status: {response.status_code}")
            return
        
        # Step 1: Verify no hiring status initially (button should NOT appear)
        print("\n--- Step 1: Verify No Initial Hiring Status ---")
        response = self.make_request("GET", f"/messages/hiring-status/{workflow_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 404:
            self.log_result("No initial status", True, "No hiring status initially - button should NOT appear")
        else:
            self.log_result("No initial status", False, f"Expected 404, got {response.status_code}")
        
        # Step 2: Homeowner answers hiring questions (creates hiring status)
        print("\n--- Step 2: Homeowner Answers Hiring Questions ---")
        hiring_workflow_data = {
            "jobId": workflow_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": True,
            "jobStatus": "completed"
        }
        
        response = self.make_request("POST", "/messages/hiring-status", 
                                   json=hiring_workflow_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Answer hiring questions", True, "Homeowner successfully answered hiring questions")
        else:
            self.log_result("Answer hiring questions", False, f"Status: {response.status_code}")
            return
        
        # Step 3: Verify hiring status is saved and retrievable (button should appear)
        print("\n--- Step 3: Verify Status Saved - Button Should Appear ---")
        response = self.make_request("GET", f"/messages/hiring-status/{workflow_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('hired') == True and data.get('job_status') == 'completed':
                    self.log_result("Workflow completion", True, 
                                  "Complete workflow successful - frontend can now show 'Mark as Completed' button")
                else:
                    self.log_result("Workflow completion", False, "Workflow data mismatch")
            except json.JSONDecodeError:
                self.log_result("Workflow completion", False, "Invalid JSON response")
        else:
            self.log_result("Workflow completion", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all GET hiring status endpoint tests"""
        print("🚀 Starting GET Hiring Status Endpoint Testing")
        print("=" * 80)
        
        try:
            # Setup test data
            if not self.setup_test_data():
                print("❌ Failed to setup test data, aborting tests")
                return
            
            # Run all tests
            self.test_get_hiring_status_basic_functionality()
            self.test_authentication_and_authorization()
            self.test_database_integration_and_sorting()
            self.test_complete_workflow()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
        
        # Print results
        print("\n" + "=" * 80)
        print("🏁 GET HIRING STATUS ENDPOINT TESTING RESULTS")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        if success_rate >= 90:
            print(f"\n🎯 OVERALL ASSESSMENT:")
            print(f"✅ EXCELLENT: GET hiring status endpoint is working excellently")
            print(f"✅ PRODUCTION READY: All critical functionality verified")
        else:
            print(f"\n🎯 OVERALL ASSESSMENT:")
            print(f"⚠️ NEEDS ATTENTION: Some tests failed, review required")

if __name__ == "__main__":
    tester = GetHiringStatusTester()
    tester.run_all_tests()
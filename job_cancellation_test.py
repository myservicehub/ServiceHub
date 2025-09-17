#!/usr/bin/env python3
"""
JOB CANCELLATION FUNCTIONALITY TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**ISSUE REPORTED:** 
User cancelled a job but it's not appearing in the "Cancelled" tab of their My Jobs page. 
The page shows "No cancelled found" even after cancelling a job.

**CRITICAL TESTING NEEDED:**

**1. Job Cancellation API Testing:**
- Test the PUT /api/jobs/{job_id}/close endpoint
- Verify that when a job is closed, its status is correctly updated to "cancelled" in the database
- Test with homeowner credentials (francisdaniel4jb@gmail.com / Servicehub..1)
- Verify the job close request includes proper reason and feedback

**2. Database Status Update Verification:**
- Check that JobStatus.CANCELLED maps to "cancelled" string value
- Verify the database update_job function correctly sets status to "cancelled"
- Test that jobs collection in MongoDB gets the correct status value

**3. My Jobs API Testing:**
- Test the GET /api/jobs/my-jobs endpoint after job cancellation
- Verify that cancelled jobs are included in the response
- Check that the job status field is correctly set to "cancelled" in the API response
- Test filtering/querying of jobs by status

**4. Job Status Flow Testing:**
- Create/find an active job for the test homeowner
- Cancel the job using the close job API
- Immediately query my-jobs to verify the cancelled job appears
- Check that the job has proper cancelled status fields (closed_at, closure_reason, etc.)

**5. Data Consistency Verification:**
- Verify job closure timestamps are set correctly
- Check that closure_reason and closure_feedback are saved
- Test that job status transitions work correctly (active → cancelled)

**EXPECTED RESULTS:**
- ✅ Job close API should successfully update job status to "cancelled"
- ✅ Database should contain the job with status="cancelled"
- ✅ My jobs API should return cancelled jobs in the response
- ✅ Job should have proper closure metadata (reason, feedback, timestamp)
- ✅ No data synchronization issues between close and retrieve operations
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
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://tradepro-connect-1.preview.emergentagent.com') + '/api'

class JobCancellationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.homeowner_token = None
        self.homeowner_id = None
        self.test_job_id = None
        self.cancelled_job_id = None
        
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
    
    def authenticate_homeowner(self):
        """Authenticate with the specific homeowner credentials"""
        print("\n=== Authenticating Homeowner ===")
        
        # Use the specific homeowner credentials from the issue
        login_data = {
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        }
        
        print(f"--- Logging in as {login_data['email']} ---")
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                user_data = data.get('user', {})
                self.homeowner_id = user_data.get('id')
                
                if self.homeowner_token and self.homeowner_id:
                    self.log_result("Homeowner authentication", True, 
                                  f"ID: {self.homeowner_id}, Name: {user_data.get('name', 'N/A')}")
                else:
                    self.log_result("Homeowner authentication", False, "Missing token or user ID")
            except json.JSONDecodeError:
                self.log_result("Homeowner authentication", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner authentication", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def get_homeowner_jobs(self):
        """Get homeowner's existing jobs to find an active one for testing"""
        print("\n=== Getting Homeowner's Jobs ===")
        
        if not self.homeowner_token:
            self.log_result("Get homeowner jobs", False, "No homeowner token available")
            return
        
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                total_jobs = data.get('pagination', {}).get('total', len(jobs))
                
                self.log_result("Get homeowner jobs", True, f"Found {total_jobs} total jobs")
                
                # Categorize jobs by status
                job_stats = {}
                active_jobs = []
                cancelled_jobs = []
                
                for job in jobs:
                    status = job.get('status', 'unknown')
                    job_stats[status] = job_stats.get(status, 0) + 1
                    
                    if status == 'active':
                        active_jobs.append(job)
                    elif status == 'cancelled':
                        cancelled_jobs.append(job)
                
                print(f"Job status breakdown: {job_stats}")
                
                # Find an active job for testing
                if active_jobs:
                    self.test_job_id = active_jobs[0].get('id')
                    self.log_result("Found active job for testing", True, 
                                  f"Job ID: {self.test_job_id}, Title: {active_jobs[0].get('title', 'N/A')}")
                else:
                    self.log_result("Found active job for testing", False, "No active jobs found")
                
                # Check existing cancelled jobs
                if cancelled_jobs:
                    self.log_result("Existing cancelled jobs", True, 
                                  f"Found {len(cancelled_jobs)} cancelled jobs")
                    for job in cancelled_jobs:
                        print(f"  - {job.get('title', 'N/A')} (ID: {job.get('id', 'N/A')})")
                else:
                    self.log_result("Existing cancelled jobs", True, "No cancelled jobs found (expected)")
                
                return jobs
                
            except json.JSONDecodeError:
                self.log_result("Get homeowner jobs", False, "Invalid JSON response")
        else:
            self.log_result("Get homeowner jobs", False, f"Status: {response.status_code}")
        
        return []
    
    def create_test_job_if_needed(self):
        """Create a test job if no active job is available"""
        print("\n=== Creating Test Job (if needed) ===")
        
        if self.test_job_id:
            self.log_result("Test job creation", True, "Using existing active job")
            return
        
        if not self.homeowner_token:
            self.log_result("Test job creation", False, "No homeowner token available")
            return
        
        # Create a test job for cancellation testing
        job_data = {
            "title": "Test Job for Cancellation Testing - Electrical Work",
            "description": "This is a test job created specifically for testing the job cancellation functionality. Need electrical work done in the living room area including outlet installation and wiring inspection.",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 25000,
            "budget_max": 50000,
            "state": "Lagos",
            "lga": "Lagos Island", 
            "town": "Victoria Island",
            "zip_code": "101241",
            "home_address": "15 Ahmadu Bello Way, Victoria Island, Lagos",
            "homeowner_name": "Francis Daniel",
            "homeowner_email": "francisdaniel4jb@gmail.com",
            "homeowner_phone": "+2348012345678"
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_job_id = data.get('id')
                self.log_result("Test job creation", True, f"Created job ID: {self.test_job_id}")
            except json.JSONDecodeError:
                self.log_result("Test job creation", False, "Invalid JSON response")
        else:
            self.log_result("Test job creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_job_close_reasons_endpoint(self):
        """Test the job close reasons endpoint"""
        print("\n=== Testing Job Close Reasons Endpoint ===")
        
        response = self.make_request("GET", "/jobs/close-reasons")
        
        if response.status_code == 200:
            try:
                data = response.json()
                reasons = data.get('reasons', [])
                
                if reasons and len(reasons) > 0:
                    self.log_result("Job close reasons endpoint", True, f"Found {len(reasons)} close reasons")
                    print("Available close reasons:")
                    for reason in reasons:
                        print(f"  - {reason}")
                else:
                    self.log_result("Job close reasons endpoint", False, "No close reasons found")
                    
            except json.JSONDecodeError:
                self.log_result("Job close reasons endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Job close reasons endpoint", False, f"Status: {response.status_code}")
    
    def test_job_cancellation_api(self):
        """Test the PUT /api/jobs/{job_id}/close endpoint - MAIN FOCUS"""
        print("\n=== Testing Job Cancellation API (MAIN FOCUS) ===")
        
        if not self.test_job_id or not self.homeowner_token:
            self.log_result("Job cancellation API", False, "Missing job ID or homeowner token")
            return
        
        # Test 1: Cancel job with proper reason and feedback
        print(f"\n--- Test 1: Cancel Job with Reason and Feedback ---")
        close_request = {
            "reason": "Found a suitable tradesperson",
            "additional_feedback": "I found a local electrician through a friend's recommendation. Thank you for the service."
        }
        
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}/close", 
                                   json=close_request, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['message', 'job_id', 'status', 'closure_reason']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Check if status is correctly set to "cancelled"
                    if data.get('status') == 'cancelled':
                        self.cancelled_job_id = data.get('job_id')
                        self.log_result("Job cancellation API - status update", True, 
                                      f"Job {self.cancelled_job_id} status set to 'cancelled'")
                        
                        # Verify closure reason is saved
                        if data.get('closure_reason') == close_request['reason']:
                            self.log_result("Job cancellation API - closure reason", True, 
                                          f"Closure reason: {data.get('closure_reason')}")
                        else:
                            self.log_result("Job cancellation API - closure reason", False, 
                                          f"Expected: {close_request['reason']}, Got: {data.get('closure_reason')}")
                    else:
                        self.log_result("Job cancellation API - status update", False, 
                                      f"Expected status 'cancelled', got '{data.get('status')}'")
                else:
                    self.log_result("Job cancellation API", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Job cancellation API", False, "Invalid JSON response")
        else:
            self.log_result("Job cancellation API", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to cancel already cancelled job (should fail)
        print(f"\n--- Test 2: Try to Cancel Already Cancelled Job ---")
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}/close", 
                                   json=close_request, auth_token=self.homeowner_token)
        
        if response.status_code == 400:
            self.log_result("Job cancellation API - duplicate cancellation", True, 
                          "Correctly rejected cancellation of already cancelled job")
        else:
            self.log_result("Job cancellation API - duplicate cancellation", False, 
                          f"Expected 400, got {response.status_code}")
        
        # Test 3: Test with missing reason
        print(f"\n--- Test 3: Cancel Job with Missing Reason ---")
        invalid_request = {
            "additional_feedback": "Test feedback without reason"
        }
        
        # Create another test job for this test
        if self.cancelled_job_id:  # Only if we successfully cancelled the first job
            response = self.make_request("PUT", f"/jobs/{self.cancelled_job_id}/close", 
                                       json=invalid_request, auth_token=self.homeowner_token)
            
            if response.status_code in [400, 422]:
                self.log_result("Job cancellation API - missing reason validation", True, 
                              "Correctly rejected request with missing reason")
            else:
                self.log_result("Job cancellation API - missing reason validation", False, 
                              f"Expected 400/422, got {response.status_code}")
        
        # Test 4: Test unauthorized cancellation
        print(f"\n--- Test 4: Unauthorized Job Cancellation ---")
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}/close", json=close_request)
        
        if response.status_code in [401, 403]:
            self.log_result("Job cancellation API - unauthorized", True, 
                          "Correctly rejected unauthorized cancellation")
        else:
            self.log_result("Job cancellation API - unauthorized", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_my_jobs_api_after_cancellation(self):
        """Test GET /api/jobs/my-jobs after job cancellation - CRITICAL TEST"""
        print("\n=== Testing My Jobs API After Cancellation (CRITICAL) ===")
        
        if not self.homeowner_token:
            self.log_result("My Jobs API after cancellation", False, "No homeowner token available")
            return
        
        # Test 1: Get all jobs and verify cancelled job appears
        print(f"\n--- Test 1: Get All Jobs - Verify Cancelled Job Appears ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                total_jobs = data.get('pagination', {}).get('total', len(jobs))
                
                self.log_result("My Jobs API - basic functionality", True, f"Retrieved {total_jobs} total jobs")
                
                # Find cancelled jobs
                cancelled_jobs = [job for job in jobs if job.get('status') == 'cancelled']
                
                if cancelled_jobs:
                    self.log_result("My Jobs API - cancelled jobs present", True, 
                                  f"Found {len(cancelled_jobs)} cancelled jobs")
                    
                    # Check if our specific cancelled job is present
                    if self.cancelled_job_id:
                        cancelled_job_ids = [job.get('id') for job in cancelled_jobs]
                        if self.cancelled_job_id in cancelled_job_ids:
                            self.log_result("My Jobs API - specific cancelled job found", True, 
                                          f"Cancelled job {self.cancelled_job_id} found in results")
                            
                            # Verify cancelled job has proper metadata
                            cancelled_job = next((job for job in cancelled_jobs if job.get('id') == self.cancelled_job_id), None)
                            if cancelled_job:
                                self.verify_cancelled_job_metadata(cancelled_job)
                        else:
                            self.log_result("My Jobs API - specific cancelled job found", False, 
                                          f"Cancelled job {self.cancelled_job_id} NOT found in results")
                else:
                    self.log_result("My Jobs API - cancelled jobs present", False, 
                                  "No cancelled jobs found in My Jobs response")
                
                # Print job status breakdown for debugging
                job_stats = {}
                for job in jobs:
                    status = job.get('status', 'unknown')
                    job_stats[status] = job_stats.get(status, 0) + 1
                
                print(f"Current job status breakdown: {job_stats}")
                
            except json.JSONDecodeError:
                self.log_result("My Jobs API after cancellation", False, "Invalid JSON response")
        else:
            self.log_result("My Jobs API after cancellation", False, f"Status: {response.status_code}")
        
        # Test 2: Filter jobs by cancelled status
        print(f"\n--- Test 2: Filter Jobs by Cancelled Status ---")
        response = self.make_request("GET", "/jobs/my-jobs?status=cancelled", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                
                # All jobs should have cancelled status
                all_cancelled = all(job.get('status') == 'cancelled' for job in jobs)
                
                if all_cancelled:
                    self.log_result("My Jobs API - cancelled status filter", True, 
                                  f"Filter working correctly, found {len(jobs)} cancelled jobs")
                    
                    # Check if our cancelled job is in the filtered results
                    if self.cancelled_job_id:
                        cancelled_job_ids = [job.get('id') for job in jobs]
                        if self.cancelled_job_id in cancelled_job_ids:
                            self.log_result("My Jobs API - cancelled job in filtered results", True, 
                                          "Cancelled job appears in status=cancelled filter")
                        else:
                            self.log_result("My Jobs API - cancelled job in filtered results", False, 
                                          "Cancelled job NOT in status=cancelled filter results")
                else:
                    self.log_result("My Jobs API - cancelled status filter", False, 
                                  "Filter not working - non-cancelled jobs in results")
                
            except json.JSONDecodeError:
                self.log_result("My Jobs API - cancelled status filter", False, "Invalid JSON response")
        else:
            self.log_result("My Jobs API - cancelled status filter", False, f"Status: {response.status_code}")
    
    def verify_cancelled_job_metadata(self, cancelled_job: dict):
        """Verify that cancelled job has proper metadata"""
        print(f"\n--- Verifying Cancelled Job Metadata ---")
        
        # Check required fields for cancelled job
        required_fields = ['id', 'status', 'title', 'description']
        missing_fields = [field for field in required_fields if field not in cancelled_job]
        
        if not missing_fields:
            self.log_result("Cancelled job - required fields", True, "All required fields present")
        else:
            self.log_result("Cancelled job - required fields", False, f"Missing fields: {missing_fields}")
        
        # Verify status is exactly "cancelled"
        if cancelled_job.get('status') == 'cancelled':
            self.log_result("Cancelled job - status field", True, "Status correctly set to 'cancelled'")
        else:
            self.log_result("Cancelled job - status field", False, 
                          f"Expected 'cancelled', got '{cancelled_job.get('status')}'")
        
        # Check for cancellation metadata (these might be optional)
        metadata_fields = ['closed_at', 'closure_reason', 'closure_feedback']
        present_metadata = [field for field in metadata_fields if field in cancelled_job and cancelled_job[field]]
        
        if present_metadata:
            self.log_result("Cancelled job - metadata fields", True, 
                          f"Found metadata: {', '.join(present_metadata)}")
            
            # Verify closure_reason if present
            if 'closure_reason' in present_metadata:
                reason = cancelled_job.get('closure_reason')
                if reason and len(reason) > 0:
                    self.log_result("Cancelled job - closure reason", True, f"Reason: {reason}")
                else:
                    self.log_result("Cancelled job - closure reason", False, "Empty closure reason")
            
            # Verify closed_at timestamp if present
            if 'closed_at' in present_metadata:
                closed_at = cancelled_job.get('closed_at')
                if closed_at:
                    self.log_result("Cancelled job - closure timestamp", True, f"Closed at: {closed_at}")
                else:
                    self.log_result("Cancelled job - closure timestamp", False, "Empty closure timestamp")
        else:
            self.log_result("Cancelled job - metadata fields", False, "No cancellation metadata found")
    
    def test_job_status_consistency(self):
        """Test job status consistency across different endpoints"""
        print("\n=== Testing Job Status Consistency ===")
        
        if not self.cancelled_job_id or not self.homeowner_token:
            self.log_result("Job status consistency", False, "Missing cancelled job ID or token")
            return
        
        # Test 1: Get specific job by ID and verify status
        print(f"\n--- Test 1: Get Specific Job by ID ---")
        response = self.make_request("GET", f"/jobs/{self.cancelled_job_id}")
        
        if response.status_code == 200:
            try:
                job_data = response.json()
                
                if job_data.get('status') == 'cancelled':
                    self.log_result("Job status consistency - individual job", True, 
                                  "Individual job endpoint shows correct cancelled status")
                else:
                    self.log_result("Job status consistency - individual job", False, 
                                  f"Individual job shows status '{job_data.get('status')}', expected 'cancelled'")
                
            except json.JSONDecodeError:
                self.log_result("Job status consistency - individual job", False, "Invalid JSON response")
        else:
            self.log_result("Job status consistency - individual job", False, f"Status: {response.status_code}")
        
        # Test 2: Compare status across My Jobs and individual job endpoints
        print(f"\n--- Test 2: Cross-Endpoint Status Consistency ---")
        
        # Get job from My Jobs endpoint
        my_jobs_response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if my_jobs_response.status_code == 200:
            try:
                my_jobs_data = my_jobs_response.json()
                jobs = my_jobs_data.get('jobs', [])
                
                # Find our cancelled job in the list
                cancelled_job_in_list = next((job for job in jobs if job.get('id') == self.cancelled_job_id), None)
                
                if cancelled_job_in_list:
                    my_jobs_status = cancelled_job_in_list.get('status')
                    
                    # Compare with individual job endpoint (if we got it successfully above)
                    if my_jobs_status == 'cancelled':
                        self.log_result("Job status consistency - cross-endpoint", True, 
                                      "Status consistent across My Jobs and individual job endpoints")
                    else:
                        self.log_result("Job status consistency - cross-endpoint", False, 
                                      f"My Jobs shows status '{my_jobs_status}', expected 'cancelled'")
                else:
                    self.log_result("Job status consistency - cross-endpoint", False, 
                                  "Cancelled job not found in My Jobs list")
                
            except json.JSONDecodeError:
                self.log_result("Job status consistency - cross-endpoint", False, "Invalid JSON response from My Jobs")
    
    def test_job_reopen_functionality(self):
        """Test job reopen functionality (bonus test)"""
        print("\n=== Testing Job Reopen Functionality (Bonus) ===")
        
        if not self.cancelled_job_id or not self.homeowner_token:
            self.log_result("Job reopen functionality", False, "Missing cancelled job ID or token")
            return
        
        # Test reopening the cancelled job
        print(f"\n--- Test: Reopen Cancelled Job ---")
        response = self.make_request("PUT", f"/jobs/{self.cancelled_job_id}/reopen", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if data.get('status') == 'active':
                    self.log_result("Job reopen functionality", True, 
                                  f"Job successfully reopened with status 'active'")
                    
                    # Verify the job is no longer in cancelled status
                    time.sleep(1)  # Brief delay to ensure database consistency
                    
                    # Check My Jobs to see if it's no longer in cancelled list
                    my_jobs_response = self.make_request("GET", "/jobs/my-jobs?status=cancelled", 
                                                       auth_token=self.homeowner_token)
                    
                    if my_jobs_response.status_code == 200:
                        cancelled_jobs_data = my_jobs_response.json()
                        cancelled_jobs = cancelled_jobs_data.get('jobs', [])
                        cancelled_job_ids = [job.get('id') for job in cancelled_jobs]
                        
                        if self.cancelled_job_id not in cancelled_job_ids:
                            self.log_result("Job reopen - removed from cancelled list", True, 
                                          "Reopened job no longer appears in cancelled jobs list")
                        else:
                            self.log_result("Job reopen - removed from cancelled list", False, 
                                          "Reopened job still appears in cancelled jobs list")
                else:
                    self.log_result("Job reopen functionality", False, 
                                  f"Expected status 'active', got '{data.get('status')}'")
                
            except json.JSONDecodeError:
                self.log_result("Job reopen functionality", False, "Invalid JSON response")
        else:
            self.log_result("Job reopen functionality", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all job cancellation tests"""
        print("🔧 STARTING JOB CANCELLATION FUNCTIONALITY TESTING")
        print("=" * 60)
        
        # Basic setup tests
        self.test_service_health()
        self.authenticate_homeowner()
        
        if not self.homeowner_token:
            print("\n❌ CRITICAL: Cannot proceed without homeowner authentication")
            return self.print_final_results()
        
        # Get existing jobs and prepare test data
        self.get_homeowner_jobs()
        self.create_test_job_if_needed()
        
        if not self.test_job_id:
            print("\n❌ CRITICAL: Cannot proceed without a test job")
            return self.print_final_results()
        
        # Core cancellation functionality tests
        self.test_job_close_reasons_endpoint()
        self.test_job_cancellation_api()
        
        # Critical test: verify cancelled jobs appear in My Jobs
        self.test_my_jobs_api_after_cancellation()
        
        # Additional verification tests
        self.test_job_status_consistency()
        
        # Bonus test: job reopen functionality
        self.test_job_reopen_functionality()
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print final test results summary"""
        print("\n" + "=" * 60)
        print("🏁 JOB CANCELLATION TESTING COMPLETE")
        print("=" * 60)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊 RESULTS SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {self.results['passed']}")
        print(f"   ❌ Failed: {self.results['failed']}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        # Critical issue analysis
        critical_issues = []
        for error in self.results['errors']:
            if any(keyword in error.lower() for keyword in ['cancelled job', 'my jobs api', 'status update']):
                critical_issues.append(error)
        
        if critical_issues:
            print(f"\n🔥 CRITICAL ISSUES IDENTIFIED:")
            for issue in critical_issues:
                print(f"   - {issue}")
        
        print(f"\n📝 TEST DATA CREATED:")
        if self.homeowner_id:
            print(f"   - Homeowner ID: {self.homeowner_id}")
        if self.test_job_id:
            print(f"   - Test Job ID: {self.test_job_id}")
        if self.cancelled_job_id:
            print(f"   - Cancelled Job ID: {self.cancelled_job_id}")
        
        return success_rate

if __name__ == "__main__":
    tester = JobCancellationTester()
    tester.run_all_tests()
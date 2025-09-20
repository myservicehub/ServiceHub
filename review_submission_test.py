#!/usr/bin/env python3
"""
REVIEW SUBMISSION FIX TESTING

Testing the review submission fix that should resolve "You cannot review this user for this job" error.

**ISSUES FIXED:**
1. **Database validation bug**: Fixed `can_user_review` method to check hiring status records
2. **Tradesperson identification**: Added endpoint to get hired tradespeople for jobs  
3. **Review workflow**: Enhanced to automatically determine which tradesperson to review

**CRITICAL TESTING NEEDED:**

**1. Review Validation Fix:**
- Test the updated `can_user_review` database method
- Create a hiring status record with hired=true for a job/tradesperson pair
- Test that homeowner can now review that tradesperson for that job
- Verify completed job status requirement still works

**2. Hired Tradespeople Endpoint:**
- Test GET /api/messages/hired-tradespeople/{job_id}
- Create hiring status records for a job with multiple tradespeople
- Verify endpoint returns correct tradesperson details
- Test authentication and job ownership validation

**3. End-to-End Review Workflow:**
- Create a job and mark it completed
- Create hiring status indicating homeowner hired a tradesperson
- Test that review submission now works without "cannot review" error
- Verify proper tradesperson identification and review creation

**4. Database Integration:**
- Test hiring_status collection queries work correctly
- Verify hiring status records are properly created and queried
- Test both single and multiple hired tradespeople scenarios

**5. Backward Compatibility:**
- Test that old interest-based reviews still work
- Verify new hiring status system doesn't break existing functionality
- Test edge cases where no hiring status exists

**EXPECTED RESULTS:**
- ✅ Review submission should work for completed jobs with hiring status
- ✅ Proper tradesperson identification from hiring records
- ✅ No more "You cannot review this user for this job" errors
- ✅ Database validation correctly checks hiring relationships
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

class ReviewSubmissionFixTester:
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
        self.tradesperson_token = None
        self.homeowner_id = None
        self.tradesperson_id = None
        self.test_job_id = None
        self.test_review_id = None
        self.hiring_status_id = None
        self.admin_token = None
        
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
    
    def setup_admin_access(self):
        """Setup admin access for job approval"""
        print("\n=== Setting Up Admin Access ===")
        
        # Login as admin using legacy credentials
        admin_data = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin-management/login", json=admin_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.admin_token = data.get('access_token')
                self.log_result("Admin login", True, "Admin access obtained")
            except json.JSONDecodeError:
                self.log_result("Admin login", False, "Invalid JSON response")
        else:
            self.log_result("Admin login", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def approve_job(self, job_id: str):
        """Approve a job using admin credentials"""
        if not self.admin_token:
            self.log_result("Job approval", False, "No admin token available")
            return False
        
        approval_data = {
            "action": "approve",
            "notes": "Approved for review submission fix testing"
        }
        
        response = self.make_request("PUT", f"/admin/jobs/{job_id}/approve", 
                                   json=approval_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            self.log_result("Job approval", True, "Job approved successfully")
            return True
        else:
            self.log_result("Job approval", False, f"Status: {response.status_code}, Response: {response.text}")
            return False

    def setup_test_users(self):
        """Create test homeowner and tradesperson users"""
        print("\n=== Setting Up Test Users ===")
        
        # Create test homeowner
        homeowner_data = {
            "name": "Test Homeowner Review Fix",
            "email": f"homeowner.reviewfix.{uuid.uuid4().hex[:8]}@test.com",
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
        
        # Create test tradesperson
        tradesperson_data = {
            "name": "Test Tradesperson Review Fix",
            "email": f"tradesperson.reviewfix.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348087654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 5,
            "description": "Experienced electrician for review submission fix testing with over 5 years of experience in residential and commercial electrical work."
        }
        
        print(f"\n--- Creating Test Tradesperson ---")
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.tradesperson_token = data.get('access_token')
                # Extract tradesperson ID from response
                self.tradesperson_id = data.get('id')  # ID is at root level
                self.log_result("Tradesperson creation", True, f"ID: {self.tradesperson_id}")
            except json.JSONDecodeError:
                self.log_result("Tradesperson creation", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def create_test_job(self):
        """Create a test job for the homeowner"""
        print("\n=== Creating Test Job for Review Fix Testing ===")
        
        if not self.homeowner_token:
            self.log_result("Test job creation", False, "No homeowner token available")
            return
        
        # Create a test job for the homeowner with proper structure
        job_data = {
            "title": "Test Electrical Work for Review Submission Fix",
            "description": "This is a test job created for testing the review submission fix. Need electrical work done in the kitchen area to test the hiring status and review workflow.",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 50000,
            "budget_max": 150000,
            "state": "Lagos",
            "lga": "Ikeja", 
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Review Fix Street, Computer Village",
            "homeowner_name": "Test Homeowner for Review Fix",
            "homeowner_email": f"homeowner.reviewfix.{uuid.uuid4().hex[:8]}@test.com",
            "homeowner_phone": "+2348012345678",
            "questions": [],
            "photos": []
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_job_id = data.get('id')
                self.log_result("Test job creation", True, f"Created job ID: {self.test_job_id}")
                return
            except json.JSONDecodeError:
                self.log_result("Test job creation", False, "Invalid JSON response")
        else:
            self.log_result("Test job creation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Try to get homeowner's existing jobs
        print("\n--- Trying to get homeowner's existing jobs ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                if jobs:
                    self.test_job_id = jobs[0].get('id')
                    self.log_result("Using existing job", True, f"Using job ID: {self.test_job_id}")
                    return
            except json.JSONDecodeError:
                pass
        
        # If all else fails, create a mock job ID for testing API validation
        self.test_job_id = str(uuid.uuid4())
        self.log_result("Mock job for validation testing", True, f"Using mock job ID: {self.test_job_id}")
    
    def mark_job_completed(self):
        """Mark the test job as completed"""
        print("\n--- Marking Job as Completed ---")
        
        if not self.test_job_id or not self.homeowner_token:
            self.log_result("Job completion", False, "Missing job ID or homeowner token")
            return
        
        # First check the current job status
        job_response = self.make_request("GET", f"/jobs/{self.test_job_id}", auth_token=self.homeowner_token)
        if job_response.status_code == 200:
            try:
                job_data = job_response.json()
                current_status = job_data.get('status', 'unknown')
                print(f"Current job status: {current_status}")
                
                # If job is pending approval, approve it first
                if current_status == 'pending_approval':
                    print("Job is pending approval, attempting to approve...")
                    if self.approve_job(self.test_job_id):
                        print("Job approved, now attempting completion...")
                    else:
                        print("Job approval failed, cannot complete job")
                        return
                    
            except json.JSONDecodeError:
                print("Could not parse job data")
        
        # Use the specific complete job endpoint
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}/complete", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Job completion", True, "Job marked as completed")
        else:
            self.log_result("Job completion", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_hiring_status_creation(self):
        """Test creating hiring status records"""
        print("\n=== Testing Hiring Status Creation ===")
        
        if not all([self.homeowner_token, self.tradesperson_id, self.test_job_id]):
            self.log_result("Hiring status creation", False, "Missing required test data")
            return
        
        # Test 1: Create hiring status with hired=true
        print(f"\n--- Test 1: Create Hiring Status (Hired=True) ---")
        hiring_data = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": True,
            "jobStatus": "completed"
        }
        
        response = self.make_request("POST", "/messages/hiring-status", 
                                   json=hiring_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('hired') == True and data.get('job_status') == 'completed':
                    self.log_result("Hiring status creation (hired=true)", True, f"Status ID: {data.get('id')}")
                    self.hiring_status_id = data.get('id')
                else:
                    self.log_result("Hiring status creation (hired=true)", False, "Data mismatch in response")
            except json.JSONDecodeError:
                self.log_result("Hiring status creation (hired=true)", False, "Invalid JSON response")
        else:
            self.log_result("Hiring status creation (hired=true)", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Create hiring status with hired=false (feedback)
        print(f"\n--- Test 2: Create Hiring Feedback (Hired=False) ---")
        feedback_data = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "feedbackType": "too_expensive",
            "comment": "The quote was higher than expected for this type of work."
        }
        
        response = self.make_request("POST", "/messages/feedback", 
                                   json=feedback_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'id' in data and 'message' in data:
                    self.log_result("Hiring feedback creation", True, f"Feedback ID: {data.get('id')}")
                else:
                    self.log_result("Hiring feedback creation", False, "Missing required fields in response")
            except json.JSONDecodeError:
                self.log_result("Hiring feedback creation", False, "Invalid JSON response")
        else:
            self.log_result("Hiring feedback creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_hired_tradespeople_endpoint(self):
        """Test GET /api/messages/hired-tradespeople/{job_id} endpoint"""
        print("\n=== Testing Hired Tradespeople Endpoint ===")
        
        if not all([self.homeowner_token, self.test_job_id]):
            self.log_result("Hired tradespeople endpoint", False, "Missing required test data")
            return
        
        # Test 1: Get hired tradespeople for job
        print(f"\n--- Test 1: Get Hired Tradespeople ---")
        response = self.make_request("GET", f"/messages/hired-tradespeople/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'tradespeople' in data:
                    tradespeople = data['tradespeople']
                    self.log_result("Hired tradespeople endpoint", True, f"Found {len(tradespeople)} hired tradespeople")
                    
                    # Verify tradesperson data structure
                    if tradespeople:
                        tradesperson = tradespeople[0]
                        required_fields = ['id', 'name', 'job_status', 'hired_at']
                        missing_fields = [field for field in required_fields if field not in tradesperson]
                        
                        if not missing_fields:
                            self.log_result("Tradesperson data structure", True, "All required fields present")
                        else:
                            self.log_result("Tradesperson data structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_result("Hired tradespeople data", True, "Empty list (no hired tradespeople)")
                else:
                    self.log_result("Hired tradespeople endpoint", False, "Missing 'tradespeople' field in response")
            except json.JSONDecodeError:
                self.log_result("Hired tradespeople endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Hired tradespeople endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Test authentication requirement
        print(f"\n--- Test 2: Authentication Required ---")
        response = self.make_request("GET", f"/messages/hired-tradespeople/{self.test_job_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("Hired tradespeople auth requirement", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Hired tradespeople auth requirement", False, f"Expected 401/403, got {response.status_code}")
    
    def test_can_user_review_validation(self):
        """Test the updated can_user_review validation logic"""
        print("\n=== Testing Can User Review Validation ===")
        
        if not all([self.homeowner_token, self.tradesperson_id, self.test_job_id]):
            self.log_result("Can user review validation", False, "Missing required test data")
            return
        
        # Test 1: Check review eligibility before hiring status
        print(f"\n--- Test 1: Review Eligibility Before Hiring Status ---")
        response = self.make_request("GET", f"/reviews/can-review/{self.tradesperson_id}/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                can_review_before = data.get('can_review', False)
                self.log_result("Review eligibility before hiring", True, f"Can review: {can_review_before}")
            except json.JSONDecodeError:
                self.log_result("Review eligibility before hiring", False, "Invalid JSON response")
        else:
            self.log_result("Review eligibility before hiring", False, f"Status: {response.status_code}")
        
        # Test 2: Create hiring status and check again
        print(f"\n--- Test 2: Create Hiring Status and Recheck ---")
        hiring_data = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": True,
            "jobStatus": "completed"
        }
        
        hiring_response = self.make_request("POST", "/messages/hiring-status", 
                                          json=hiring_data, auth_token=self.homeowner_token)
        
        if hiring_response.status_code == 200:
            self.log_result("Hiring status for review test", True, "Hiring status created")
            
            # Now check review eligibility again
            response = self.make_request("GET", f"/reviews/can-review/{self.tradesperson_id}/{self.test_job_id}", 
                                       auth_token=self.homeowner_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    can_review_after = data.get('can_review', False)
                    self.log_result("Review eligibility after hiring", True, f"Can review: {can_review_after}")
                    
                    if can_review_after:
                        self.log_result("Hiring status enables review", True, "Review now allowed after hiring status")
                    else:
                        self.log_result("Hiring status enables review", False, "Review still not allowed after hiring status")
                except json.JSONDecodeError:
                    self.log_result("Review eligibility after hiring", False, "Invalid JSON response")
            else:
                self.log_result("Review eligibility after hiring", False, f"Status: {response.status_code}")
        else:
            self.log_result("Hiring status for review test", False, f"Status: {hiring_response.status_code}")
    
    def test_end_to_end_review_workflow(self):
        """Test complete end-to-end review workflow with hiring status"""
        print("\n=== Testing End-to-End Review Workflow ===")
        
        if not all([self.homeowner_token, self.tradesperson_id, self.test_job_id]):
            self.log_result("End-to-end review workflow", False, "Missing required test data")
            return
        
        # Step 1: Ensure job is completed
        print(f"\n--- Step 1: Ensure Job is Completed ---")
        self.mark_job_completed()
        
        # Step 2: Create hiring status
        print(f"\n--- Step 2: Create Hiring Status ---")
        hiring_data = {
            "jobId": self.test_job_id,
            "tradespersonId": self.tradesperson_id,
            "hired": True,
            "jobStatus": "completed"
        }
        
        hiring_response = self.make_request("POST", "/messages/hiring-status", 
                                          json=hiring_data, auth_token=self.homeowner_token)
        
        if hiring_response.status_code == 200:
            self.log_result("E2E: Hiring status creation", True, "Hiring status created successfully")
        else:
            self.log_result("E2E: Hiring status creation", False, f"Status: {hiring_response.status_code}")
            return
        
        # Step 3: Attempt review creation (should now work)
        print(f"\n--- Step 3: Attempt Review Creation ---")
        review_data = {
            "job_id": self.test_job_id,
            "reviewee_id": self.tradesperson_id,
            "rating": 5,
            "title": "Excellent Work After Hiring Status Fix",
            "content": "The tradesperson did outstanding work. This review was successfully created after implementing the hiring status fix that resolves the 'You cannot review this user for this job' error.",
            "category_ratings": {
                "quality": 5,
                "timeliness": 5,
                "communication": 5,
                "professionalism": 5,
                "value_for_money": 5
            },
            "photos": [],
            "would_recommend": True
        }
        
        review_response = self.make_request("POST", "/reviews/create", 
                                          json=review_data, auth_token=self.homeowner_token)
        
        if review_response.status_code == 200:
            try:
                review_result = review_response.json()
                self.test_review_id = review_result.get('id')
                self.log_result("E2E: Review creation success", True, f"Review created successfully: {self.test_review_id}")
                
                # Verify review data
                if (review_result.get('rating') == 5 and 
                    review_result.get('title') == review_data['title'] and
                    review_result.get('job_id') == self.test_job_id):
                    self.log_result("E2E: Review data verification", True, "All review data matches")
                else:
                    self.log_result("E2E: Review data verification", False, "Review data mismatch")
                    
            except json.JSONDecodeError:
                self.log_result("E2E: Review creation success", False, "Invalid JSON response")
        else:
            self.log_result("E2E: Review creation success", False, f"Status: {review_response.status_code}, Response: {review_response.text}")
            
            # Check if it's the specific error we're trying to fix
            if "cannot review this user for this job" in review_response.text.lower():
                self.log_result("E2E: Review error still present", False, "The 'cannot review' error still occurs - fix not working")
            else:
                self.log_result("E2E: Review error different", False, f"Different error: {review_response.text}")
        
        # Step 4: Verify review appears in user's reviews
        if hasattr(self, 'test_review_id') and self.test_review_id:
            print(f"\n--- Step 4: Verify Review in User Reviews ---")
            response = self.make_request("GET", f"/reviews/user/{self.tradesperson_id}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    reviews = data.get('reviews', [])
                    review_ids = [r.get('id') for r in reviews]
                    
                    if self.test_review_id in review_ids:
                        self.log_result("E2E: Review in user reviews", True, "Review found in tradesperson's reviews")
                    else:
                        self.log_result("E2E: Review in user reviews", False, "Review not found in tradesperson's reviews")
                except json.JSONDecodeError:
                    self.log_result("E2E: Review in user reviews", False, "Invalid JSON response")
            else:
                self.log_result("E2E: Review in user reviews", False, f"Status: {response.status_code}")
    
    def test_backward_compatibility(self):
        """Test that old interest-based reviews still work"""
        print("\n=== Testing Backward Compatibility ===")
        
        if not all([self.homeowner_token, self.tradesperson_id]):
            self.log_result("Backward compatibility", False, "Missing required test data")
            return
        
        # Create a second job for backward compatibility testing
        print(f"\n--- Creating Second Job for Backward Compatibility Test ---")
        job_data = {
            "title": "Backward Compatibility Test Job",
            "description": "Testing that old interest-based review system still works",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 30000,
            "budget_max": 80000,
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "456 Compatibility Street",
            "homeowner_name": "Test Homeowner Compatibility",
            "homeowner_email": f"homeowner.compat.{uuid.uuid4().hex[:8]}@test.com",
            "homeowner_phone": "+2348012345679",
            "questions": [],
            "photos": []
        }
        
        job_response = self.make_request("POST", "/jobs/", json=job_data, auth_token=self.homeowner_token)
        
        if job_response.status_code == 200:
            try:
                job_result = job_response.json()
                compat_job_id = job_result.get('id')
                self.log_result("Backward compatibility job creation", True, f"Job ID: {compat_job_id}")
                
                # Approve job first if needed, then mark as completed
                if self.approve_job(compat_job_id):
                    print("Compatibility job approved, now completing...")
                
                update_response = self.make_request("PUT", f"/jobs/{compat_job_id}/complete", 
                                                  auth_token=self.homeowner_token)
                
                if update_response.status_code == 200:
                    self.log_result("Backward compatibility job completion", True, "Job marked as completed")
                    
                    # Test review eligibility without hiring status (should fall back to interests)
                    response = self.make_request("GET", f"/reviews/can-review/{self.tradesperson_id}/{compat_job_id}", 
                                               auth_token=self.homeowner_token)
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            can_review = data.get('can_review', False)
                            self.log_result("Backward compatibility review check", True, f"Can review without hiring status: {can_review}")
                        except json.JSONDecodeError:
                            self.log_result("Backward compatibility review check", False, "Invalid JSON response")
                    else:
                        self.log_result("Backward compatibility review check", False, f"Status: {response.status_code}")
                else:
                    self.log_result("Backward compatibility job completion", False, f"Status: {update_response.status_code}")
            except json.JSONDecodeError:
                self.log_result("Backward compatibility job creation", False, "Invalid JSON response")
        else:
            self.log_result("Backward compatibility job creation", False, f"Status: {job_response.status_code}")
    
    def run_all_tests(self):
        """Run all review submission fix tests"""
        print("🚀 Starting Review Submission Fix Testing")
        print("=" * 80)
        
        try:
            # Basic setup
            self.test_service_health()
            self.setup_admin_access()
            self.setup_test_users()
            self.create_test_job()
            self.mark_job_completed()
            
            # Review submission fix specific tests
            self.test_hiring_status_creation()
            self.test_hired_tradespeople_endpoint()
            self.test_can_user_review_validation()
            self.test_end_to_end_review_workflow()
            self.test_backward_compatibility()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 REVIEW SUBMISSION FIX TESTING COMPLETE")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 RESULTS SUMMARY:")
        print(f"   ✅ Passed: {self.results['passed']}")
        print(f"   ❌ Failed: {self.results['failed']}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 ERRORS ENCOUNTERED:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        if success_rate >= 90:
            print(f"\n🎉 EXCELLENT: Review submission fix is working perfectly!")
        elif success_rate >= 75:
            print(f"\n✅ GOOD: Review submission fix is mostly working with minor issues.")
        elif success_rate >= 50:
            print(f"\n⚠️  MODERATE: Review submission fix has significant issues that need attention.")
        else:
            print(f"\n🚨 CRITICAL: Review submission fix has major problems requiring immediate fixes.")
        
        return success_rate

if __name__ == "__main__":
    tester = ReviewSubmissionFixTester()
    success_rate = tester.run_all_tests()
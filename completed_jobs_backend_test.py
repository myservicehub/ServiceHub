#!/usr/bin/env python3
"""
COMPLETED JOBS DISPLAY FUNCTIONALITY BACKEND TESTING

This test focuses specifically on testing the backend API endpoints related to 
the completed jobs display functionality as requested in the review.

TESTING SCOPE:
1. Authentication Endpoints (homeowner registration/login, JWT tokens)
2. Jobs API Endpoints (GET /api/jobs/my-jobs, POST /api/jobs/{job_id}/complete, job filtering)
3. Hiring Status Endpoints (POST/GET /api/messages/hiring-status)
4. Review System Endpoints (GET /api/reviews/my-reviews, POST /api/reviews/create)
5. End-to-End Workflow Testing (create homeowner → create job → mark completed → verify display)
"""

import requests
import json
import uuid
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# Use local backend URL
BACKEND_URL = "http://localhost:8001/api"

class CompletedJobsBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
        # Test data storage
        self.homeowner_token = None
        self.homeowner_id = None
        self.tradesperson_token = None
        self.tradesperson_id = None
        self.test_job_id = None
        self.test_review_id = None
        self.hiring_status_id = None
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result with proper formatting"""
        if success:
            self.results['passed'] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def make_request(self, method: str, endpoint: str, auth_token: str = None, **kwargs) -> requests.Response:
        """Make HTTP request with proper error handling and authentication"""
        url = f"{self.base_url}{endpoint}"
        
        # Set headers
        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        
        if 'json' in kwargs:
            kwargs['headers']['Content-Type'] = 'application/json'
        
        # Add authentication header
        if auth_token:
            kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
        
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {method} {url} - {e}")
            raise
    
    def test_service_health(self):
        """Test basic service health and availability"""
        print("\n🔍 === TESTING SERVICE HEALTH ===")
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'status' in data:
                    self.log_result("Backend service health", True, f"Status: {data.get('status')}")
                else:
                    self.log_result("Backend service health", False, "Invalid health response")
            except json.JSONDecodeError:
                self.log_result("Backend service health", False, "Invalid JSON in health response")
        else:
            self.log_result("Backend service health", False, f"Health check failed: {response.status_code}")
        
        # Test root API endpoint
        response = self.make_request("GET", "/")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data:
                    self.log_result("API root endpoint", True, f"Message: {data.get('message')}")
                else:
                    self.log_result("API root endpoint", False, "Invalid root response")
            except json.JSONDecodeError:
                self.log_result("API root endpoint", False, "Invalid JSON in root response")
        else:
            self.log_result("API root endpoint", False, f"Root endpoint failed: {response.status_code}")
    
    def test_authentication_endpoints(self):
        """Test homeowner registration and login with JWT token generation"""
        print("\n🔐 === TESTING AUTHENTICATION ENDPOINTS ===")
        
        # Generate unique test data
        unique_id = uuid.uuid4().hex[:8]
        homeowner_email = f"homeowner.completed.{unique_id}@test.com"
        tradesperson_email = f"tradesperson.completed.{unique_id}@test.com"
        
        # Test 1: Homeowner Registration
        print("\n--- Test 1: Homeowner Registration ---")
        homeowner_data = {
            "name": "Test Homeowner Completed Jobs",
            "email": homeowner_email,
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                self.homeowner_id = data.get('user', {}).get('id')
                
                if self.homeowner_token and self.homeowner_id:
                    self.log_result("Homeowner registration", True, f"ID: {self.homeowner_id}")
                    
                    # Verify JWT token format (should have 3 parts separated by dots)
                    if len(self.homeowner_token.split('.')) == 3:
                        self.log_result("JWT token format", True, "Valid 3-part JWT token")
                    else:
                        self.log_result("JWT token format", False, "Invalid JWT token format")
                else:
                    self.log_result("Homeowner registration", False, "Missing token or user ID")
            except json.JSONDecodeError:
                self.log_result("Homeowner registration", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner registration", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Tradesperson Registration (for testing purposes)
        print("\n--- Test 2: Tradesperson Registration ---")
        tradesperson_data = {
            "name": "Test Tradesperson Completed Jobs",
            "email": tradesperson_email,
            "password": "TestPassword123!",
            "phone": "+2348087654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 5,
            "description": "Experienced electrician for completed jobs testing"
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.tradesperson_token = data.get('access_token')
                self.tradesperson_id = data.get('id')
                
                if self.tradesperson_token and self.tradesperson_id:
                    self.log_result("Tradesperson registration", True, f"ID: {self.tradesperson_id}")
                else:
                    self.log_result("Tradesperson registration", False, "Missing token or ID")
            except json.JSONDecodeError:
                self.log_result("Tradesperson registration", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson registration", False, f"Status: {response.status_code}")
        
        # Test 3: JWT Token Validation
        print("\n--- Test 3: JWT Token Validation ---")
        if self.homeowner_token:
            # Test accessing protected endpoint with token
            response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
            
            if response.status_code == 200:
                self.log_result("JWT token validation", True, "Token successfully validated")
            elif response.status_code in [401, 403]:
                self.log_result("JWT token validation", False, "Token validation failed")
            else:
                self.log_result("JWT token validation", True, f"Token accepted (status: {response.status_code})")
        else:
            self.log_result("JWT token validation", False, "No token available for testing")
    
    def test_jobs_api_endpoints(self):
        """Test Jobs API endpoints including my-jobs, job creation, and completion"""
        print("\n📋 === TESTING JOBS API ENDPOINTS ===")
        
        if not self.homeowner_token:
            self.log_result("Jobs API endpoints", False, "No homeowner token available")
            return
        
        # Test 1: GET /api/jobs/my-jobs
        print("\n--- Test 1: GET /api/jobs/my-jobs ---")
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                if 'jobs' in data:
                    jobs = data['jobs']
                    self.log_result("My jobs endpoint structure", True, f"Found {len(jobs)} jobs")
                    
                    # Check if response includes pagination info
                    if 'total' in data and 'page' in data:
                        self.log_result("My jobs pagination info", True, f"Total: {data['total']}, Page: {data['page']}")
                    else:
                        self.log_result("My jobs pagination info", False, "Missing pagination information")
                else:
                    self.log_result("My jobs endpoint structure", False, "Missing 'jobs' field in response")
            except json.JSONDecodeError:
                self.log_result("My jobs endpoint", False, "Invalid JSON response")
        else:
            self.log_result("My jobs endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: Create a test job
        print("\n--- Test 2: Create Test Job ---")
        job_data = {
            "title": "Test Electrical Work - Completed Jobs Testing",
            "description": "This is a test job for testing completed jobs display functionality. Need electrical work in kitchen area.",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 50000,
            "budget_max": 150000,
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Test Street, Computer Village",
            "homeowner_name": "Test Homeowner Completed Jobs",
            "homeowner_email": f"homeowner.completed.{uuid.uuid4().hex[:8]}@test.com",
            "homeowner_phone": "+2348012345678",
            "questions": [],
            "photos": []
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_job_id = data.get('id')
                
                if self.test_job_id:
                    self.log_result("Job creation", True, f"Created job ID: {self.test_job_id}")
                    
                    # Verify job data
                    if data.get('title') == job_data['title'] and data.get('status') == 'active':
                        self.log_result("Job data verification", True, "Job created with correct data")
                    else:
                        self.log_result("Job data verification", False, "Job data mismatch")
                else:
                    self.log_result("Job creation", False, "No job ID returned")
            except json.JSONDecodeError:
                self.log_result("Job creation", False, "Invalid JSON response")
        else:
            self.log_result("Job creation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 3: Job filtering by status
        print("\n--- Test 3: Job Filtering by Status ---")
        if self.test_job_id:
            # Test filtering for active jobs
            response = self.make_request("GET", "/jobs/my-jobs?status=active", auth_token=self.homeowner_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    active_jobs = data.get('jobs', [])
                    
                    # Check if our test job is in active jobs
                    job_ids = [job.get('id') for job in active_jobs]
                    if self.test_job_id in job_ids:
                        self.log_result("Active jobs filtering", True, f"Found test job in {len(active_jobs)} active jobs")
                    else:
                        self.log_result("Active jobs filtering", False, "Test job not found in active jobs")
                except json.JSONDecodeError:
                    self.log_result("Active jobs filtering", False, "Invalid JSON response")
            else:
                self.log_result("Active jobs filtering", False, f"Status: {response.status_code}")
            
            # Test filtering for completed jobs (should be empty initially)
            response = self.make_request("GET", "/jobs/my-jobs?status=completed", auth_token=self.homeowner_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    completed_jobs = data.get('jobs', [])
                    self.log_result("Completed jobs filtering", True, f"Found {len(completed_jobs)} completed jobs")
                except json.JSONDecodeError:
                    self.log_result("Completed jobs filtering", False, "Invalid JSON response")
            else:
                self.log_result("Completed jobs filtering", False, f"Status: {response.status_code}")
    
    def test_job_completion_endpoint(self):
        """Test POST /api/jobs/{job_id}/complete endpoint"""
        print("\n✅ === TESTING JOB COMPLETION ENDPOINT ===")
        
        if not self.test_job_id or not self.homeowner_token:
            self.log_result("Job completion endpoint", False, "Missing job ID or homeowner token")
            return
        
        # Test 1: Mark job as completed
        print("\n--- Test 1: Mark Job as Completed ---")
        completion_data = {
            "completion_notes": "Job completed successfully for testing completed jobs display functionality"
        }
        
        response = self.make_request("POST", f"/jobs/{self.test_job_id}/complete", 
                                   json=completion_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify job status changed to completed
                if data.get('status') == 'completed':
                    self.log_result("Job completion", True, f"Job status: {data.get('status')}")
                    
                    # Verify completion timestamp
                    if data.get('completed_at'):
                        self.log_result("Job completion timestamp", True, f"Completed at: {data.get('completed_at')}")
                    else:
                        self.log_result("Job completion timestamp", False, "Missing completion timestamp")
                        
                    # Verify completion notes
                    if data.get('completion_notes') == completion_data['completion_notes']:
                        self.log_result("Job completion notes", True, "Completion notes saved correctly")
                    else:
                        self.log_result("Job completion notes", False, "Completion notes mismatch")
                else:
                    self.log_result("Job completion", False, f"Job status not updated: {data.get('status')}")
            except json.JSONDecodeError:
                self.log_result("Job completion", False, "Invalid JSON response")
        else:
            self.log_result("Job completion", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Verify job appears in completed jobs list
        print("\n--- Test 2: Verify Job in Completed Jobs List ---")
        response = self.make_request("GET", "/jobs/my-jobs?status=completed", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                completed_jobs = data.get('jobs', [])
                
                # Check if our test job is now in completed jobs
                job_ids = [job.get('id') for job in completed_jobs]
                if self.test_job_id in job_ids:
                    self.log_result("Job in completed list", True, f"Found test job in {len(completed_jobs)} completed jobs")
                    
                    # Find our specific job and verify its data
                    test_job = next((job for job in completed_jobs if job.get('id') == self.test_job_id), None)
                    if test_job and test_job.get('status') == 'completed':
                        self.log_result("Completed job data verification", True, "Job data correct in completed list")
                    else:
                        self.log_result("Completed job data verification", False, "Job data incorrect in completed list")
                else:
                    self.log_result("Job in completed list", False, "Test job not found in completed jobs")
            except json.JSONDecodeError:
                self.log_result("Job in completed list", False, "Invalid JSON response")
        else:
            self.log_result("Job in completed list", False, f"Status: {response.status_code}")
        
        # Test 3: Try to complete already completed job (should fail)
        print("\n--- Test 3: Prevent Double Completion ---")
        response = self.make_request("POST", f"/jobs/{self.test_job_id}/complete", 
                                   json=completion_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 409]:
            self.log_result("Prevent double completion", True, "Correctly prevented double completion")
        else:
            self.log_result("Prevent double completion", False, f"Expected 400/409, got {response.status_code}")
    
    def test_hiring_status_endpoints(self):
        """Test hiring status endpoints for completed jobs workflow"""
        print("\n🤝 === TESTING HIRING STATUS ENDPOINTS ===")
        
        if not all([self.homeowner_token, self.tradesperson_id, self.test_job_id]):
            self.log_result("Hiring status endpoints", False, "Missing required test data")
            return
        
        # Test 1: POST /api/messages/hiring-status
        print("\n--- Test 1: Create Hiring Status ---")
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
                self.hiring_status_id = data.get('id')
                
                if self.hiring_status_id:
                    self.log_result("Hiring status creation", True, f"Status ID: {self.hiring_status_id}")
                    
                    # Verify hiring status data
                    if (data.get('hired') == True and 
                        data.get('job_status') == 'completed' and
                        data.get('job_id') == self.test_job_id):
                        self.log_result("Hiring status data verification", True, "All fields correct")
                    else:
                        self.log_result("Hiring status data verification", False, "Data mismatch")
                else:
                    self.log_result("Hiring status creation", False, "No status ID returned")
            except json.JSONDecodeError:
                self.log_result("Hiring status creation", False, "Invalid JSON response")
        else:
            self.log_result("Hiring status creation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: GET /api/messages/hiring-status/{job_id}
        print("\n--- Test 2: Get Hiring Status ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['id', 'job_id', 'homeowner_id', 'tradesperson_id', 'hired', 'job_status']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Hiring status retrieval structure", True, "All required fields present")
                    
                    # Verify data matches what we created
                    if (data.get('hired') == True and 
                        data.get('job_status') == 'completed' and
                        data.get('job_id') == self.test_job_id and
                        data.get('id') == self.hiring_status_id):
                        self.log_result("Hiring status retrieval data", True, "Data matches created record")
                    else:
                        self.log_result("Hiring status retrieval data", False, "Data mismatch")
                else:
                    self.log_result("Hiring status retrieval structure", False, f"Missing fields: {missing_fields}")
            except json.JSONDecodeError:
                self.log_result("Hiring status retrieval", False, "Invalid JSON response")
        else:
            self.log_result("Hiring status retrieval", False, f"Status: {response.status_code}")
        
        # Test 3: Test hiring status for non-existent job (should return 404)
        print("\n--- Test 3: Hiring Status for Non-existent Job ---")
        fake_job_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/messages/hiring-status/{fake_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Non-existent job hiring status", True, "Correctly returned 404")
        else:
            self.log_result("Non-existent job hiring status", False, f"Expected 404, got {response.status_code}")
        
        # Test 4: Test authentication requirement
        print("\n--- Test 4: Hiring Status Authentication ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}")
        
        if response.status_code in [401, 403]:
            self.log_result("Hiring status authentication", True, "Correctly requires authentication")
        else:
            self.log_result("Hiring status authentication", False, f"Expected 401/403, got {response.status_code}")
    
    def test_review_system_endpoints(self):
        """Test review system endpoints for completed jobs"""
        print("\n⭐ === TESTING REVIEW SYSTEM ENDPOINTS ===")
        
        if not all([self.homeowner_token, self.tradesperson_id, self.test_job_id]):
            self.log_result("Review system endpoints", False, "Missing required test data")
            return
        
        # Test 1: GET /api/reviews/my-reviews (should be empty initially)
        print("\n--- Test 1: Get My Reviews (Empty State) ---")
        response = self.make_request("GET", "/reviews/my-reviews", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['reviews', 'total', 'page', 'limit', 'total_pages']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("My reviews endpoint structure", True, 
                                  f"Total: {data['total']}, Reviews: {len(data['reviews'])}")
                    
                    # Verify data types
                    if (isinstance(data['reviews'], list) and 
                        isinstance(data['total'], int) and 
                        isinstance(data['page'], int)):
                        self.log_result("My reviews data types", True, "All fields have correct types")
                    else:
                        self.log_result("My reviews data types", False, "Incorrect data types")
                else:
                    self.log_result("My reviews endpoint structure", False, f"Missing fields: {missing_fields}")
            except json.JSONDecodeError:
                self.log_result("My reviews endpoint", False, "Invalid JSON response")
        else:
            self.log_result("My reviews endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: POST /api/reviews/create
        print("\n--- Test 2: Create Review for Completed Job ---")
        review_data = {
            "job_id": self.test_job_id,
            "reviewee_id": self.tradesperson_id,
            "rating": 5,
            "title": "Excellent Electrical Work - Completed Job Test",
            "content": "The electrician did outstanding work on this completed job. Very professional, punctual, and high-quality work. This review is part of the completed jobs display functionality testing.",
            "category_ratings": {
                "quality": 5,
                "timeliness": 5,
                "communication": 4,
                "professionalism": 5,
                "value_for_money": 4
            },
            "photos": ["https://example.com/completed-job-photo1.jpg"],
            "would_recommend": True
        }
        
        response = self.make_request("POST", "/reviews/create", 
                                   json=review_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_review_id = data.get('id')
                
                if self.test_review_id:
                    self.log_result("Review creation", True, f"Review ID: {self.test_review_id}")
                    
                    # Verify review data
                    if (data.get('rating') == 5 and 
                        data.get('title') == review_data['title'] and
                        data.get('job_id') == self.test_job_id):
                        self.log_result("Review data verification", True, "All fields correct")
                    else:
                        self.log_result("Review data verification", False, "Data mismatch")
                        
                    # Verify category ratings
                    if data.get('category_ratings') and len(data['category_ratings']) == 5:
                        self.log_result("Review category ratings", True, f"Found {len(data['category_ratings'])} categories")
                    else:
                        self.log_result("Review category ratings", False, "Category ratings missing or incomplete")
                else:
                    self.log_result("Review creation", False, "No review ID returned")
            except json.JSONDecodeError:
                self.log_result("Review creation", False, "Invalid JSON response")
        else:
            self.log_result("Review creation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 3: GET /api/reviews/my-reviews (should now have the review)
        print("\n--- Test 3: Get My Reviews (With Data) ---")
        response = self.make_request("GET", "/reviews/my-reviews", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if data['total'] > 0 and len(data['reviews']) > 0:
                    self.log_result("My reviews with data", True, f"Found {data['total']} reviews")
                    
                    # Check if our test review is included
                    if self.test_review_id:
                        review_ids = [r.get('id') for r in data['reviews']]
                        if self.test_review_id in review_ids:
                            self.log_result("Test review in my reviews", True, "Test review found in results")
                            
                            # Verify review data structure
                            test_review = next((r for r in data['reviews'] if r.get('id') == self.test_review_id), None)
                            if test_review:
                                required_review_fields = ['id', 'rating', 'title', 'content', 'created_at']
                                missing_review_fields = [field for field in required_review_fields if field not in test_review]
                                
                                if not missing_review_fields:
                                    self.log_result("Review data structure", True, "All required fields present")
                                else:
                                    self.log_result("Review data structure", False, f"Missing fields: {missing_review_fields}")
                        else:
                            self.log_result("Test review in my reviews", False, "Test review not found in results")
                else:
                    self.log_result("My reviews with data", False, "No reviews found after creation")
            except json.JSONDecodeError:
                self.log_result("My reviews with data", False, "Invalid JSON response")
        else:
            self.log_result("My reviews with data", False, f"Status: {response.status_code}")
        
        # Test 4: Test review authentication
        print("\n--- Test 4: Review Authentication ---")
        response = self.make_request("GET", "/reviews/my-reviews")
        
        if response.status_code in [401, 403]:
            self.log_result("Review authentication", True, "Correctly requires authentication")
        else:
            self.log_result("Review authentication", False, f"Expected 401/403, got {response.status_code}")
    
    def test_end_to_end_workflow(self):
        """Test the complete end-to-end workflow for completed jobs display"""
        print("\n🔄 === TESTING END-TO-END WORKFLOW ===")
        
        # Verify all components are working together
        if not all([self.homeowner_token, self.test_job_id, self.hiring_status_id, self.test_review_id]):
            self.log_result("End-to-end workflow", False, "Missing required components for workflow test")
            return
        
        # Test 1: Verify completed job workflow
        print("\n--- Test 1: Complete Workflow Verification ---")
        
        # Get homeowner's jobs and verify the completed job is there
        response = self.make_request("GET", "/jobs/my-jobs?status=completed", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                completed_jobs = data.get('jobs', [])
                
                # Find our test job
                test_job = next((job for job in completed_jobs if job.get('id') == self.test_job_id), None)
                
                if test_job:
                    self.log_result("Completed job in workflow", True, f"Job status: {test_job.get('status')}")
                    
                    # Verify job has completion timestamp
                    if test_job.get('completed_at'):
                        self.log_result("Job completion timestamp in workflow", True, "Completion timestamp present")
                    else:
                        self.log_result("Job completion timestamp in workflow", False, "Missing completion timestamp")
                else:
                    self.log_result("Completed job in workflow", False, "Test job not found in completed jobs")
            except json.JSONDecodeError:
                self.log_result("Completed job in workflow", False, "Invalid JSON response")
        else:
            self.log_result("Completed job in workflow", False, f"Status: {response.status_code}")
        
        # Test 2: Verify hiring status is accessible for the completed job
        print("\n--- Test 2: Hiring Status Workflow Integration ---")
        response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('hired') == True and data.get('job_status') == 'completed':
                    self.log_result("Hiring status workflow integration", True, "Hiring status correctly linked to completed job")
                else:
                    self.log_result("Hiring status workflow integration", False, "Hiring status data incorrect")
            except json.JSONDecodeError:
                self.log_result("Hiring status workflow integration", False, "Invalid JSON response")
        else:
            self.log_result("Hiring status workflow integration", False, f"Status: {response.status_code}")
        
        # Test 3: Verify review is accessible and linked to completed job
        print("\n--- Test 3: Review Workflow Integration ---")
        response = self.make_request("GET", "/reviews/my-reviews", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                reviews = data.get('reviews', [])
                
                # Find our test review
                test_review = next((review for review in reviews if review.get('id') == self.test_review_id), None)
                
                if test_review and test_review.get('job_id') == self.test_job_id:
                    self.log_result("Review workflow integration", True, "Review correctly linked to completed job")
                else:
                    self.log_result("Review workflow integration", False, "Review not properly linked to job")
            except json.JSONDecodeError:
                self.log_result("Review workflow integration", False, "Invalid JSON response")
        else:
            self.log_result("Review workflow integration", False, f"Status: {response.status_code}")
        
        # Test 4: Verify the complete data flow supports frontend completed jobs display
        print("\n--- Test 4: Frontend Data Flow Verification ---")
        
        # This test simulates what the frontend would do to display completed jobs
        workflow_success = True
        workflow_errors = []
        
        # Step 1: Get completed jobs
        jobs_response = self.make_request("GET", "/jobs/my-jobs?status=completed", auth_token=self.homeowner_token)
        if jobs_response.status_code != 200:
            workflow_success = False
            workflow_errors.append("Cannot fetch completed jobs")
        
        # Step 2: For each completed job, get hiring status
        if workflow_success and self.test_job_id:
            hiring_response = self.make_request("GET", f"/messages/hiring-status/{self.test_job_id}", 
                                              auth_token=self.homeowner_token)
            if hiring_response.status_code != 200:
                workflow_success = False
                workflow_errors.append("Cannot fetch hiring status for completed job")
        
        # Step 3: Get user's reviews
        if workflow_success:
            reviews_response = self.make_request("GET", "/reviews/my-reviews", auth_token=self.homeowner_token)
            if reviews_response.status_code != 200:
                workflow_success = False
                workflow_errors.append("Cannot fetch user reviews")
        
        if workflow_success:
            self.log_result("Frontend data flow verification", True, "All required data accessible for frontend")
        else:
            self.log_result("Frontend data flow verification", False, f"Workflow errors: {', '.join(workflow_errors)}")
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "="*80)
        print("🎯 COMPLETED JOBS BACKEND TESTING SUMMARY")
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
        print(f"   • Authentication Endpoints: {'✅' if self.homeowner_token else '❌'}")
        print(f"   • Jobs API Endpoints: {'✅' if self.test_job_id else '❌'}")
        print(f"   • Job Completion: {'✅' if self.test_job_id else '❌'}")
        print(f"   • Hiring Status Endpoints: {'✅' if self.hiring_status_id else '❌'}")
        print(f"   • Review System Endpoints: {'✅' if self.test_review_id else '❌'}")
        print(f"   • End-to-End Workflow: {'✅' if all([self.homeowner_token, self.test_job_id, self.hiring_status_id]) else '❌'}")
        
        print(f"\n🎯 COMPLETED JOBS DISPLAY FUNCTIONALITY:")
        if success_rate >= 90:
            print("   🟢 EXCELLENT - Backend fully supports completed jobs display")
        elif success_rate >= 75:
            print("   🟡 GOOD - Backend mostly supports completed jobs display with minor issues")
        elif success_rate >= 50:
            print("   🟠 FAIR - Backend partially supports completed jobs display, needs fixes")
        else:
            print("   🔴 POOR - Backend has major issues supporting completed jobs display")
        
        print("\n" + "="*80)
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING COMPLETED JOBS BACKEND TESTING")
        print("="*80)
        
        try:
            self.test_service_health()
            self.test_authentication_endpoints()
            self.test_jobs_api_endpoints()
            self.test_job_completion_endpoint()
            self.test_hiring_status_endpoints()
            self.test_review_system_endpoints()
            self.test_end_to_end_workflow()
        except Exception as e:
            print(f"\n💥 CRITICAL ERROR DURING TESTING: {e}")
            self.log_result("Critical error", False, str(e))
        finally:
            self.print_summary()

def main():
    """Main function to run the tests"""
    tester = CompletedJobsBackendTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
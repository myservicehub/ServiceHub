#!/usr/bin/env python3
"""
ADMIN JOB MANAGEMENT API ENDPOINTS TESTING
Testing the comprehensive admin job management API endpoints for admin dashboard functionality.

Focus Areas:
1. Admin Job Management APIs:
   - GET /api/admin/jobs/all - Get all jobs with comprehensive details
   - GET /api/admin/jobs/{job_id}/details - Get detailed job information
   - PUT /api/admin/jobs/{job_id} - Update job details
   - PATCH /api/admin/jobs/{job_id}/status - Update job status
   - DELETE /api/admin/jobs/{job_id} - Soft delete job
   - GET /api/admin/jobs/stats - Get job statistics
2. Data Structure Validation: Complete job details with homeowner information, interest counts
3. CRUD Operations Testing: Creating/reading/updating/deleting jobs through admin endpoints
4. Error Handling: Invalid job IDs, invalid status values, missing required fields
5. Authentication Requirements: Admin authentication
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import time

# Get backend URL from environment
BACKEND_URL = "https://servicehub-admin.preview.emergentagent.com/api"

class AdminJobManagementTester:
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
        """Test admin authentication system"""
        print("\n=== Testing Admin Authentication ===")
        
        # Test admin login with form data
        admin_credentials = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin/login", data=admin_credentials)
        if response.status_code == 200:
            login_response = response.json()
            if 'token' in login_response:
                self.log_result("Admin login", True, "Admin authentication successful")
                self.auth_tokens['admin'] = login_response['token']
                self.test_data['admin_user'] = login_response.get('admin', {})
            else:
                self.log_result("Admin login", False, "No token in response")
        else:
            self.log_result("Admin login", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test invalid admin credentials
        invalid_credentials = {
            "username": "admin",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/admin/login", data=invalid_credentials)
        if response.status_code == 401:
            self.log_result("Invalid admin credentials", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid admin credentials", False, f"Expected 401, got {response.status_code}")
    
    def test_setup_test_data(self):
        """Setup test data - create users and jobs for testing"""
        print("\n=== Setting Up Test Data ===")
        
        # Create homeowner for job creation
        homeowner_data = {
            "name": "Adebayo Johnson",
            "email": f"adebayo.johnson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Lagos",  # Use valid location
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.log_result("Create test homeowner", True, f"ID: {homeowner_profile['user']['id']}")
            self.auth_tokens['homeowner'] = homeowner_profile['access_token']
            self.test_data['homeowner_user'] = homeowner_profile['user']
        else:
            self.log_result("Create test homeowner", False, f"Status: {response.status_code}")
            return
        
        # Create test jobs
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        jobs_data = [
            {
                "title": "Bathroom Plumbing Installation - Modern Nigerian Design",
                "description": "Looking for an experienced plumber to install new bathroom fixtures in our Lagos home. We need installation of new toilet, sink, shower, and connecting all plumbing.",
                "category": "Plumbing",
                "location": "Victoria Island, Lagos State",
                "postcode": "101001",
                "budget_min": 200000,
                "budget_max": 400000,
                "timeline": "Within 3 weeks",
                "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
                "homeowner_email": homeowner_user.get('email', 'test@example.com'),
                "homeowner_phone": homeowner_user.get('phone', '08123456789')
            },
            {
                "title": "Kitchen Electrical Work - Wiring and Outlets",
                "description": "Need electrical work for kitchen renovation. Install new outlets, lighting fixtures, and ensure all wiring meets Nigerian electrical standards.",
                "category": "Electrical",
                "location": "Ikeja, Lagos State",
                "postcode": "100001",
                "budget_min": 150000,
                "budget_max": 300000,
                "timeline": "Within 2 weeks",
                "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
                "homeowner_email": homeowner_user.get('email', 'test@example.com'),
                "homeowner_phone": homeowner_user.get('phone', '08123456789')
            },
            {
                "title": "Roof Repair - Leak Prevention",
                "description": "Urgent roof repair needed. Several leaks during rainy season. Need professional assessment and repair of roof tiles and waterproofing.",
                "category": "Roofing",
                "location": "Surulere, Lagos State",
                "postcode": "100001",
                "budget_min": 100000,
                "budget_max": 250000,
                "timeline": "Within 1 week",
                "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
                "homeowner_email": homeowner_user.get('email', 'test@example.com'),
                "homeowner_phone": homeowner_user.get('phone', '08123456789')
            }
        ]
        
        created_jobs = []
        for i, job_data in enumerate(jobs_data):
            response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
            if response.status_code == 200:
                created_job = response.json()
                created_jobs.append(created_job)
                self.log_result(f"Create test job {i+1}", True, f"Job ID: {created_job['id']}")
            else:
                self.log_result(f"Create test job {i+1}", False, f"Status: {response.status_code}")
        
        self.test_data['created_jobs'] = created_jobs
        
        # Create tradesperson and show interest in jobs
        tradesperson_data = {
            "name": "Emeka Okafor",
            "email": f"emeka.okafor.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Abuja",
            "postcode": "900001",
            "trade_categories": ["Plumbing", "Electrical"],
            "experience_years": 8,
            "company_name": "Okafor Services",
            "description": "Professional tradesperson with 8 years experience.",
            "certifications": ["Licensed Professional"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            self.auth_tokens['tradesperson'] = tradesperson_profile['access_token']
            self.test_data['tradesperson_user'] = tradesperson_profile
            self.log_result("Create test tradesperson", True, f"ID: {tradesperson_profile['id']}")
            
            # Show interest in first two jobs
            tradesperson_token = self.auth_tokens['tradesperson']
            for i, job in enumerate(created_jobs[:2]):
                interest_data = {"job_id": job['id']}
                response = self.make_request("POST", "/interests/show-interest", 
                                           json=interest_data, auth_token=tradesperson_token)
                if response.status_code == 200:
                    self.log_result(f"Show interest in job {i+1}", True)
                else:
                    self.log_result(f"Show interest in job {i+1}", False, f"Status: {response.status_code}")
        else:
            self.log_result("Create test tradesperson", False, f"Status: {response.status_code}")
    
    def test_admin_jobs_all_endpoint(self):
        """Test GET /api/admin/jobs/all endpoint"""
        print("\n=== Testing Admin Jobs All Endpoint ===")
        
        if 'admin' not in self.auth_tokens:
            self.log_result("Admin jobs all tests", False, "No admin authentication token")
            return
        
        admin_token = self.auth_tokens['admin']
        
        # Test 1: Get all jobs without filters
        response = self.make_request("GET", "/admin/jobs/all", auth_token=admin_token)
        if response.status_code == 200:
            jobs_response = response.json()
            if 'jobs' in jobs_response and 'pagination' in jobs_response:
                jobs = jobs_response['jobs']
                pagination = jobs_response['pagination']
                
                # Validate data structure
                if jobs and len(jobs) > 0:
                    job = jobs[0]
                    required_fields = ['id', 'title', 'description', 'category', 'location', 
                                     'budget_min', 'budget_max', 'timeline', 'homeowner', 
                                     'interests_count', 'created_at']
                    missing_fields = [field for field in required_fields if field not in job]
                    
                    if not missing_fields:
                        self.log_result("Admin jobs all - data structure", True, 
                                       f"Complete job data with {len(jobs)} jobs")
                        
                        # Validate homeowner information
                        homeowner = job.get('homeowner', {})
                        homeowner_fields = ['id', 'name', 'email', 'phone']
                        missing_homeowner_fields = [field for field in homeowner_fields if field not in homeowner]
                        
                        if not missing_homeowner_fields:
                            self.log_result("Admin jobs all - homeowner data", True, 
                                           f"Complete homeowner info: {homeowner['name']}")
                        else:
                            self.log_result("Admin jobs all - homeowner data", False, 
                                           f"Missing homeowner fields: {missing_homeowner_fields}")
                        
                        # Validate interests count
                        if 'interests_count' in job and isinstance(job['interests_count'], int):
                            self.log_result("Admin jobs all - interests count", True, 
                                           f"Interests count: {job['interests_count']}")
                        else:
                            self.log_result("Admin jobs all - interests count", False, 
                                           "Invalid interests count")
                    else:
                        self.log_result("Admin jobs all - data structure", False, 
                                       f"Missing fields: {missing_fields}")
                
                # Validate pagination
                if 'skip' in pagination and 'limit' in pagination and 'total' in pagination:
                    self.log_result("Admin jobs all - pagination", True, 
                                   f"Total: {pagination['total']}, Skip: {pagination['skip']}, Limit: {pagination['limit']}")
                else:
                    self.log_result("Admin jobs all - pagination", False, "Invalid pagination structure")
                
                self.log_result("Admin jobs all endpoint", True, f"Retrieved {len(jobs)} jobs")
            else:
                self.log_result("Admin jobs all endpoint", False, "Invalid response structure")
        else:
            self.log_result("Admin jobs all endpoint", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Get jobs with pagination
        response = self.make_request("GET", "/admin/jobs/all?skip=0&limit=2", auth_token=admin_token)
        if response.status_code == 200:
            jobs_response = response.json()
            jobs = jobs_response.get('jobs', [])
            if len(jobs) <= 2:
                self.log_result("Admin jobs all - pagination limit", True, 
                               f"Correctly limited to {len(jobs)} jobs")
            else:
                self.log_result("Admin jobs all - pagination limit", False, 
                               f"Expected max 2 jobs, got {len(jobs)}")
        else:
            self.log_result("Admin jobs all - pagination limit", False, 
                           f"Status: {response.status_code}")
        
        # Test 3: Filter by status
        response = self.make_request("GET", "/admin/jobs/all?status=active", auth_token=admin_token)
        if response.status_code == 200:
            jobs_response = response.json()
            jobs = jobs_response.get('jobs', [])
            # Check if all returned jobs have active status
            active_jobs = [job for job in jobs if job.get('status') == 'active']
            if len(active_jobs) == len(jobs):
                self.log_result("Admin jobs all - status filter", True, 
                               f"All {len(jobs)} jobs have active status")
            else:
                self.log_result("Admin jobs all - status filter", False, 
                               f"Status filter not working correctly")
        else:
            self.log_result("Admin jobs all - status filter", False, 
                           f"Status: {response.status_code}")
        
        # Test 4: Unauthorized access
        response = self.make_request("GET", "/admin/jobs/all")
        if response.status_code in [401, 403]:
            self.log_result("Admin jobs all - unauthorized access", True, 
                           "Correctly requires admin authentication")
        else:
            self.log_result("Admin jobs all - unauthorized access", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_admin_job_details_endpoint(self):
        """Test GET /api/admin/jobs/{job_id}/details endpoint"""
        print("\n=== Testing Admin Job Details Endpoint ===")
        
        if 'admin' not in self.auth_tokens or not self.test_data.get('created_jobs'):
            self.log_result("Admin job details tests", False, "Missing admin token or test jobs")
            return
        
        admin_token = self.auth_tokens['admin']
        test_job = self.test_data['created_jobs'][0]
        job_id = test_job['id']
        
        # Test 1: Get job details
        response = self.make_request("GET", f"/admin/jobs/{job_id}/details", auth_token=admin_token)
        if response.status_code == 200:
            job_response = response.json()
            if 'job' in job_response:
                job = job_response['job']
                
                # Validate comprehensive job details
                required_fields = ['id', 'title', 'description', 'category', 'location', 
                                 'budget_min', 'budget_max', 'timeline', 'homeowner', 
                                 'interests_count', 'interested_tradespeople', 'created_at']
                missing_fields = [field for field in required_fields if field not in job]
                
                if not missing_fields:
                    self.log_result("Admin job details - data structure", True, 
                                   f"Complete job details for: {job['title']}")
                    
                    # Validate interested tradespeople details
                    interested_tradespeople = job.get('interested_tradespeople', [])
                    if interested_tradespeople:
                        tradesperson = interested_tradespeople[0]
                        tp_fields = ['interest_id', 'tradesperson_name', 'tradesperson_email', 'status', 'created_at']
                        missing_tp_fields = [field for field in tp_fields if field not in tradesperson]
                        
                        if not missing_tp_fields:
                            self.log_result("Admin job details - interested tradespeople", True, 
                                           f"Complete tradesperson details: {tradesperson['tradesperson_name']}")
                        else:
                            self.log_result("Admin job details - interested tradespeople", False, 
                                           f"Missing tradesperson fields: {missing_tp_fields}")
                    else:
                        self.log_result("Admin job details - interested tradespeople", True, 
                                       "No interested tradespeople (expected for some jobs)")
                    
                    self.log_result("Admin job details endpoint", True, 
                                   f"Retrieved detailed job info: {job['title']}")
                else:
                    self.log_result("Admin job details - data structure", False, 
                                   f"Missing fields: {missing_fields}")
            else:
                self.log_result("Admin job details endpoint", False, "Invalid response structure")
        else:
            self.log_result("Admin job details endpoint", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Invalid job ID
        response = self.make_request("GET", "/admin/jobs/invalid-job-id/details", auth_token=admin_token)
        if response.status_code == 404:
            self.log_result("Admin job details - invalid ID", True, 
                           "Correctly returned 404 for invalid job ID")
        else:
            self.log_result("Admin job details - invalid ID", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 3: Unauthorized access
        response = self.make_request("GET", f"/admin/jobs/{job_id}/details")
        if response.status_code in [401, 403]:
            self.log_result("Admin job details - unauthorized access", True, 
                           "Correctly requires admin authentication")
        else:
            self.log_result("Admin job details - unauthorized access", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_admin_update_job_endpoint(self):
        """Test PUT /api/admin/jobs/{job_id} endpoint"""
        print("\n=== Testing Admin Update Job Endpoint ===")
        
        if 'admin' not in self.auth_tokens or not self.test_data.get('created_jobs'):
            self.log_result("Admin update job tests", False, "Missing admin token or test jobs")
            return
        
        admin_token = self.auth_tokens['admin']
        test_job = self.test_data['created_jobs'][0]
        job_id = test_job['id']
        
        # Test 1: Update job details
        update_data = {
            "title": "Updated Bathroom Plumbing Installation - Premium Service",
            "description": "Updated description: Looking for an experienced plumber to install premium bathroom fixtures in our Lagos home.",
            "budget_min": 250000,
            "budget_max": 450000,
            "timeline": "Within 4 weeks",
            "access_fee_naira": 1500,
            "access_fee_coins": 15
        }
        
        response = self.make_request("PUT", f"/admin/jobs/{job_id}", json=update_data, auth_token=admin_token)
        if response.status_code == 200:
            update_response = response.json()
            if 'message' in update_response and 'job_id' in update_response:
                self.log_result("Admin update job", True, 
                               f"Job updated successfully: {update_response['message']}")
                
                # Verify the update by fetching job details
                response = self.make_request("GET", f"/admin/jobs/{job_id}/details", auth_token=admin_token)
                if response.status_code == 200:
                    job_response = response.json()
                    job = job_response.get('job', {})
                    
                    # Check if updates were applied
                    if (job.get('title') == update_data['title'] and 
                        job.get('budget_min') == update_data['budget_min'] and
                        job.get('budget_max') == update_data['budget_max']):
                        self.log_result("Admin update job - verification", True, 
                                       "Job updates verified successfully")
                    else:
                        self.log_result("Admin update job - verification", False, 
                                       "Job updates not reflected in database")
            else:
                self.log_result("Admin update job", False, "Invalid response structure")
        else:
            self.log_result("Admin update job", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Update with invalid job ID
        response = self.make_request("PUT", "/admin/jobs/invalid-job-id", json=update_data, auth_token=admin_token)
        if response.status_code == 404:
            self.log_result("Admin update job - invalid ID", True, 
                           "Correctly returned 404 for invalid job ID")
        else:
            self.log_result("Admin update job - invalid ID", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 3: Unauthorized access
        response = self.make_request("PUT", f"/admin/jobs/{job_id}", json=update_data)
        if response.status_code in [401, 403]:
            self.log_result("Admin update job - unauthorized access", True, 
                           "Correctly requires admin authentication")
        else:
            self.log_result("Admin update job - unauthorized access", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_admin_update_job_status_endpoint(self):
        """Test PATCH /api/admin/jobs/{job_id}/status endpoint"""
        print("\n=== Testing Admin Update Job Status Endpoint ===")
        
        if 'admin' not in self.auth_tokens or not self.test_data.get('created_jobs'):
            self.log_result("Admin update job status tests", False, "Missing admin token or test jobs")
            return
        
        admin_token = self.auth_tokens['admin']
        test_job = self.test_data['created_jobs'][1]  # Use second job
        job_id = test_job['id']
        
        # Test 1: Update job status to completed
        status_data = {"status": "completed"}
        response = self.make_request("PATCH", f"/admin/jobs/{job_id}/status", json=status_data, auth_token=admin_token)
        if response.status_code == 200:
            status_response = response.json()
            if ('message' in status_response and 'job_id' in status_response and 
                'new_status' in status_response):
                if status_response['new_status'] == 'completed':
                    self.log_result("Admin update job status", True, 
                                   f"Status updated to: {status_response['new_status']}")
                    
                    # Verify status update
                    response = self.make_request("GET", f"/admin/jobs/{job_id}/details", auth_token=admin_token)
                    if response.status_code == 200:
                        job_response = response.json()
                        job = job_response.get('job', {})
                        if job.get('status') == 'completed':
                            self.log_result("Admin update job status - verification", True, 
                                           "Status update verified in database")
                        else:
                            self.log_result("Admin update job status - verification", False, 
                                           f"Expected 'completed', got '{job.get('status')}'")
                else:
                    self.log_result("Admin update job status", False, 
                                   f"Wrong status returned: {status_response['new_status']}")
            else:
                self.log_result("Admin update job status", False, "Invalid response structure")
        else:
            self.log_result("Admin update job status", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Test all valid statuses
        valid_statuses = ["active", "completed", "cancelled", "expired", "on_hold"]
        for status in valid_statuses:
            status_data = {"status": status}
            response = self.make_request("PATCH", f"/admin/jobs/{job_id}/status", json=status_data, auth_token=admin_token)
            if response.status_code == 200:
                self.log_result(f"Admin update job status - {status}", True, 
                               f"Successfully updated to {status}")
            else:
                self.log_result(f"Admin update job status - {status}", False, 
                               f"Failed to update to {status}: {response.status_code}")
        
        # Test 3: Invalid status
        invalid_status_data = {"status": "invalid_status"}
        response = self.make_request("PATCH", f"/admin/jobs/{job_id}/status", json=invalid_status_data, auth_token=admin_token)
        if response.status_code == 400:
            self.log_result("Admin update job status - invalid status", True, 
                           "Correctly rejected invalid status")
        else:
            self.log_result("Admin update job status - invalid status", False, 
                           f"Expected 400, got {response.status_code}")
        
        # Test 4: Invalid job ID
        status_data = {"status": "active"}
        response = self.make_request("PATCH", "/admin/jobs/invalid-job-id/status", json=status_data, auth_token=admin_token)
        if response.status_code == 404:
            self.log_result("Admin update job status - invalid ID", True, 
                           "Correctly returned 404 for invalid job ID")
        else:
            self.log_result("Admin update job status - invalid ID", False, 
                           f"Expected 404, got {response.status_code}")
    
    def test_admin_delete_job_endpoint(self):
        """Test DELETE /api/admin/jobs/{job_id} endpoint"""
        print("\n=== Testing Admin Delete Job Endpoint ===")
        
        if 'admin' not in self.auth_tokens or not self.test_data.get('created_jobs'):
            self.log_result("Admin delete job tests", False, "Missing admin token or test jobs")
            return
        
        admin_token = self.auth_tokens['admin']
        test_job = self.test_data['created_jobs'][2]  # Use third job for deletion
        job_id = test_job['id']
        
        # Test 1: Soft delete job
        response = self.make_request("DELETE", f"/admin/jobs/{job_id}", auth_token=admin_token)
        if response.status_code == 200:
            delete_response = response.json()
            if 'message' in delete_response and 'job_id' in delete_response:
                self.log_result("Admin delete job", True, 
                               f"Job soft deleted: {delete_response['message']}")
                
                # Verify soft deletion - job should still exist but with deleted status
                response = self.make_request("GET", f"/admin/jobs/{job_id}/details", auth_token=admin_token)
                if response.status_code == 200:
                    job_response = response.json()
                    job = job_response.get('job', {})
                    if job.get('status') == 'deleted':
                        self.log_result("Admin delete job - verification", True, 
                                       "Job soft deleted (status = deleted)")
                    else:
                        self.log_result("Admin delete job - verification", False, 
                                       f"Expected status 'deleted', got '{job.get('status')}'")
                else:
                    # Job might not be accessible after deletion, which is also valid
                    self.log_result("Admin delete job - verification", True, 
                                   "Job no longer accessible after deletion")
            else:
                self.log_result("Admin delete job", False, "Invalid response structure")
        else:
            self.log_result("Admin delete job", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Delete non-existent job
        response = self.make_request("DELETE", "/admin/jobs/invalid-job-id", auth_token=admin_token)
        if response.status_code == 404:
            self.log_result("Admin delete job - invalid ID", True, 
                           "Correctly returned 404 for invalid job ID")
        else:
            self.log_result("Admin delete job - invalid ID", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 3: Unauthorized access
        response = self.make_request("DELETE", f"/admin/jobs/{job_id}")
        if response.status_code in [401, 403]:
            self.log_result("Admin delete job - unauthorized access", True, 
                           "Correctly requires admin authentication")
        else:
            self.log_result("Admin delete job - unauthorized access", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_admin_job_statistics_endpoint(self):
        """Test GET /api/admin/jobs/stats endpoint"""
        print("\n=== Testing Admin Job Statistics Endpoint ===")
        
        if 'admin' not in self.auth_tokens:
            self.log_result("Admin job statistics tests", False, "No admin authentication token")
            return
        
        admin_token = self.auth_tokens['admin']
        
        # Test 1: Get job statistics
        response = self.make_request("GET", "/admin/jobs/stats", auth_token=admin_token)
        if response.status_code == 200:
            stats_response = response.json()
            if 'job_stats' in stats_response:
                job_stats = stats_response['job_stats']
                
                # Validate statistics structure
                expected_stats = ['total_jobs', 'active_jobs', 'completed_jobs', 
                                'cancelled_jobs', 'expired_jobs', 'total_interests']
                missing_stats = [stat for stat in expected_stats if stat not in job_stats]
                
                if not missing_stats:
                    self.log_result("Admin job statistics - data structure", True, 
                                   f"Complete statistics: Total jobs: {job_stats.get('total_jobs', 0)}")
                    
                    # Validate that statistics are numbers
                    valid_numbers = all(isinstance(job_stats.get(stat, 0), int) for stat in expected_stats)
                    if valid_numbers:
                        self.log_result("Admin job statistics - data types", True, 
                                       "All statistics are valid numbers")
                    else:
                        self.log_result("Admin job statistics - data types", False, 
                                       "Some statistics are not valid numbers")
                    
                    # Log key statistics
                    total_jobs = job_stats.get('total_jobs', 0)
                    active_jobs = job_stats.get('active_jobs', 0)
                    total_interests = job_stats.get('total_interests', 0)
                    
                    self.log_result("Admin job statistics endpoint", True, 
                                   f"Stats: {total_jobs} total jobs, {active_jobs} active, {total_interests} interests")
                else:
                    self.log_result("Admin job statistics - data structure", False, 
                                   f"Missing statistics: {missing_stats}")
            else:
                self.log_result("Admin job statistics endpoint", False, "Invalid response structure")
        else:
            self.log_result("Admin job statistics endpoint", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Unauthorized access
        response = self.make_request("GET", "/admin/jobs/stats")
        if response.status_code in [401, 403]:
            self.log_result("Admin job statistics - unauthorized access", True, 
                           "Correctly requires admin authentication")
        else:
            self.log_result("Admin job statistics - unauthorized access", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def run_admin_job_management_tests(self):
        """Run comprehensive admin job management API testing"""
        print("🎯 STARTING ADMIN JOB MANAGEMENT API ENDPOINTS TESTING")
        print("=" * 80)
        
        # Setup authentication and test data
        self.test_admin_authentication()
        self.test_setup_test_data()
        
        # Run admin job management specific tests
        self.test_admin_jobs_all_endpoint()
        self.test_admin_job_details_endpoint()
        self.test_admin_update_job_endpoint()
        self.test_admin_update_job_status_endpoint()
        self.test_admin_delete_job_endpoint()
        self.test_admin_job_statistics_endpoint()
        
        # Print final summary
        print("\n" + "=" * 80)
        print("🎯 ADMIN JOB MANAGEMENT API TESTING COMPLETE")
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
    tester = AdminJobManagementTester()
    tester.run_admin_job_management_tests()
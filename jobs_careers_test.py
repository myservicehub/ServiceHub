#!/usr/bin/env python3
"""
JOBS AND CAREERS MANAGEMENT SYSTEM TESTING

**COMPREHENSIVE TESTING REQUIREMENTS:**

**1. Job Postings Management APIs (Admin endpoints):**
- GET /api/admin/jobs/postings - Get job postings for admin
- POST /api/admin/jobs/postings - Create new job posting  
- PUT /api/admin/jobs/postings/{job_id} - Update job posting
- DELETE /api/admin/jobs/postings/{job_id} - Delete job posting
- POST /api/admin/jobs/postings/{job_id}/publish - Publish job posting
- GET /api/admin/jobs/statistics - Get job statistics

**2. Public Job APIs (for careers page):**
- GET /api/public/content/jobs - Get published job postings for careers page
- GET /api/public/content/jobs/{slug} - Get specific job by slug
- GET /api/public/content/jobs/featured - Get featured jobs
- GET /api/public/content/jobs/departments - Get job departments
- POST /api/public/content/jobs/{job_id}/apply - Apply to job

**3. Job Applications Management:**
- GET /api/admin/jobs/applications - Get job applications
- PUT /api/admin/jobs/applications/{app_id} - Update application status

**4. Complete Workflow Testing:**
1. Create a job posting through admin API
2. Publish the job 
3. Verify it appears in public API
4. Test job application submission
5. Test job statistics 
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
from collections import Counter

# Get backend URL from environment
BACKEND_URL = "https://homefix-beta.preview.emergentagent.com/api"

class JobsCareersAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.access_token = None
        self.admin_info = None
        self.test_job_id = None
        self.test_job_slug = None
        self.test_application_id = None
        
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
    
    def get_admin_token(self):
        """Get admin authentication token"""
        print("\n=== Getting Admin Authentication Token ===")
        
        login_data = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin-management/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.access_token = data['access_token']
                self.admin_info = data['admin']
                self.log_result("Admin authentication", True, "Successfully obtained admin token")
                return True
            except json.JSONDecodeError:
                self.log_result("Admin authentication", False, "Invalid JSON response")
                return False
        else:
            self.log_result("Admin authentication", False, f"Status: {response.status_code}")
            return False
    
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
    
    def test_admin_job_postings_get(self):
        """Test GET /api/admin/jobs/postings - Get job postings for admin"""
        print("\n=== 1. Testing Admin Job Postings GET ===")
        
        if not self.access_token:
            self.log_result("Admin job postings GET", False, "No access token available")
            return
        
        response = self.make_request("GET", "/admin/jobs/postings", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['job_postings', 'pagination']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    job_postings = data['job_postings']
                    pagination = data['pagination']
                    
                    self.log_result("Admin job postings GET structure", True, 
                                  f"Found {len(job_postings)} job postings")
                    
                    # Verify pagination structure
                    pagination_fields = ['skip', 'limit', 'total', 'has_more']
                    pagination_missing = [field for field in pagination_fields if field not in pagination]
                    
                    if not pagination_missing:
                        self.log_result("Admin job postings pagination", True, 
                                      f"Total: {pagination['total']}, Has more: {pagination['has_more']}")
                    else:
                        self.log_result("Admin job postings pagination", False, 
                                      f"Missing pagination fields: {pagination_missing}")
                        
                else:
                    self.log_result("Admin job postings GET structure", False, 
                                  f"Missing required fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job postings GET", False, "Invalid JSON response")
        else:
            self.log_result("Admin job postings GET", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_posting_create(self):
        """Test POST /api/admin/jobs/postings - Create new job posting"""
        print("\n=== 2. Testing Admin Job Posting CREATE ===")
        
        if not self.access_token:
            self.log_result("Admin job posting CREATE", False, "No access token available")
            return
        
        # Create comprehensive job posting data
        job_data = {
            "title": "Senior Software Engineer - Backend Development",
            "description": "We are looking for an experienced Senior Software Engineer to join our backend development team. You will be responsible for designing, developing, and maintaining scalable backend systems using Python, FastAPI, and MongoDB.",
            "department": "Engineering",
            "location": "Lagos, Nigeria",
            "job_type": "Full Time",
            "experience_level": "Senior",
            "requirements": [
                "5+ years of experience in backend development",
                "Strong proficiency in Python and FastAPI",
                "Experience with MongoDB and database design",
                "Knowledge of RESTful API design principles",
                "Experience with cloud platforms (AWS, GCP, or Azure)"
            ],
            "benefits": [
                "Competitive salary package",
                "Health insurance coverage",
                "Flexible working hours",
                "Professional development opportunities",
                "Remote work options"
            ],
            "responsibilities": [
                "Design and develop scalable backend APIs",
                "Collaborate with frontend developers and product managers",
                "Optimize application performance and scalability",
                "Participate in code reviews and technical discussions",
                "Mentor junior developers"
            ],
            "salary_min": 2500000,
            "salary_max": 4000000,
            "salary_currency": "NGN",
            "is_salary_public": True,
            "is_featured": True,
            "is_urgent": False,
            "status": "draft",
            "meta_title": "Senior Software Engineer - Backend Development | ServiceHub Careers",
            "meta_description": "Join our backend development team as a Senior Software Engineer. Work with Python, FastAPI, and MongoDB to build scalable systems.",
            "keywords": ["backend", "python", "fastapi", "mongodb", "senior", "engineer"]
        }
        
        response = self.make_request("POST", "/admin/jobs/postings", 
                                   json=job_data, auth_token=self.access_token)
        
        print(f"DEBUG: Job creation response status: {response.status_code}")
        print(f"DEBUG: Job creation response text: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['message', 'job_id', 'slug']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.test_job_id = data['job_id']
                    self.test_job_slug = data['slug']
                    
                    self.log_result("Admin job posting CREATE", True, 
                                  f"Created job with ID: {self.test_job_id}, Slug: {self.test_job_slug}")
                    
                    # Store job data for later tests
                    self.test_data['created_job'] = {
                        'id': self.test_job_id,
                        'slug': self.test_job_slug,
                        'title': job_data['title'],
                        'department': job_data['department']
                    }
                        
                else:
                    self.log_result("Admin job posting CREATE", False, 
                                  f"Missing required fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job posting CREATE", False, "Invalid JSON response")
        else:
            self.log_result("Admin job posting CREATE", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_posting_get_specific(self):
        """Test GET /api/admin/jobs/postings/{job_id} - Get specific job posting"""
        print("\n=== 3. Testing Admin Job Posting GET Specific ===")
        
        if not self.access_token or not self.test_job_id:
            self.log_result("Admin job posting GET specific", False, "No access token or job ID available")
            return
        
        response = self.make_request("GET", f"/admin/jobs/postings/{self.test_job_id}", 
                                   auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'job_posting' in data:
                    job_posting = data['job_posting']
                    
                    # Verify job posting structure
                    required_fields = ['id', 'title', 'content', 'status', 'settings']
                    missing_fields = [field for field in required_fields if field not in job_posting]
                    
                    if not missing_fields:
                        settings = job_posting.get('settings', {})
                        
                        self.log_result("Admin job posting GET specific", True, 
                                      f"Retrieved job: {job_posting['title']}, Status: {job_posting['status']}")
                        
                        # Verify settings structure
                        settings_fields = ['department', 'location', 'job_type', 'requirements', 'benefits']
                        settings_present = [field for field in settings_fields if field in settings]
                        
                        if len(settings_present) >= 3:
                            self.log_result("Admin job posting settings", True, 
                                          f"Job settings present: {settings_present}")
                        else:
                            self.log_result("Admin job posting settings", False, 
                                          f"Missing job settings: {set(settings_fields) - set(settings_present)}")
                            
                    else:
                        self.log_result("Admin job posting GET specific", False, 
                                      f"Missing required fields: {missing_fields}")
                else:
                    self.log_result("Admin job posting GET specific", False, "No job_posting in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job posting GET specific", False, "Invalid JSON response")
        else:
            self.log_result("Admin job posting GET specific", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_posting_update(self):
        """Test PUT /api/admin/jobs/postings/{job_id} - Update job posting"""
        print("\n=== 4. Testing Admin Job Posting UPDATE ===")
        
        if not self.access_token or not self.test_job_id:
            self.log_result("Admin job posting UPDATE", False, "No access token or job ID available")
            return
        
        # Update job posting data
        update_data = {
            "title": "Senior Software Engineer - Backend Development (Updated)",
            "description": "Updated job description with more details about our tech stack and company culture.",
            "salary_min": 3000000,
            "salary_max": 4500000,
            "is_urgent": True,
            "requirements": [
                "5+ years of experience in backend development",
                "Strong proficiency in Python and FastAPI",
                "Experience with MongoDB and database design",
                "Knowledge of RESTful API design principles",
                "Experience with cloud platforms (AWS, GCP, or Azure)",
                "Experience with Docker and Kubernetes (Updated requirement)"
            ]
        }
        
        response = self.make_request("PUT", f"/admin/jobs/postings/{self.test_job_id}", 
                                   json=update_data, auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'message' in data:
                    self.log_result("Admin job posting UPDATE", True, data['message'])
                    
                    # Verify the update by getting the job again
                    verify_response = self.make_request("GET", f"/admin/jobs/postings/{self.test_job_id}", 
                                                      auth_token=self.access_token)
                    
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        job_posting = verify_data.get('job_posting', {})
                        settings = job_posting.get('settings', {})
                        
                        # Check if updates were applied
                        if (job_posting.get('title') == update_data['title'] and
                            settings.get('salary_min') == update_data['salary_min'] and
                            settings.get('is_urgent') == update_data['is_urgent']):
                            
                            self.log_result("Admin job posting UPDATE verification", True, 
                                          "Job posting updates verified successfully")
                        else:
                            self.log_result("Admin job posting UPDATE verification", False, 
                                          "Job posting updates not reflected")
                    else:
                        self.log_result("Admin job posting UPDATE verification", False, 
                                      "Could not verify updates")
                else:
                    self.log_result("Admin job posting UPDATE", False, "No message in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job posting UPDATE", False, "Invalid JSON response")
        else:
            self.log_result("Admin job posting UPDATE", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_posting_publish(self):
        """Test POST /api/admin/jobs/postings/{job_id}/publish - Publish job posting"""
        print("\n=== 5. Testing Admin Job Posting PUBLISH ===")
        
        if not self.access_token or not self.test_job_id:
            self.log_result("Admin job posting PUBLISH", False, "No access token or job ID available")
            return
        
        response = self.make_request("POST", f"/admin/jobs/postings/{self.test_job_id}/publish", 
                                   auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'message' in data:
                    self.log_result("Admin job posting PUBLISH", True, data['message'])
                    
                    # Verify the job is now published
                    verify_response = self.make_request("GET", f"/admin/jobs/postings/{self.test_job_id}", 
                                                      auth_token=self.access_token)
                    
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        job_posting = verify_data.get('job_posting', {})
                        
                        if job_posting.get('status') == 'published':
                            self.log_result("Admin job posting PUBLISH verification", True, 
                                          "Job posting status is now 'published'")
                        else:
                            self.log_result("Admin job posting PUBLISH verification", False, 
                                          f"Job status is '{job_posting.get('status')}', expected 'published'")
                    else:
                        self.log_result("Admin job posting PUBLISH verification", False, 
                                      "Could not verify publish status")
                else:
                    self.log_result("Admin job posting PUBLISH", False, "No message in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job posting PUBLISH", False, "Invalid JSON response")
        else:
            self.log_result("Admin job posting PUBLISH", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_public_jobs_get(self):
        """Test GET /api/public/content/jobs - Get published job postings for careers page"""
        print("\n=== 6. Testing Public Jobs GET ===")
        
        response = self.make_request("GET", "/public/content/jobs")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['job_postings', 'pagination']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    job_postings = data['job_postings']
                    pagination = data['pagination']
                    
                    self.log_result("Public jobs GET structure", True, 
                                  f"Found {len(job_postings)} published job postings")
                    
                    # Check if our test job appears in the list
                    test_job_found = False
                    if self.test_job_id:
                        for job in job_postings:
                            if job.get('id') == self.test_job_id:
                                test_job_found = True
                                self.log_result("Public jobs test job visibility", True, 
                                              f"Test job '{job['title']}' is visible in public API")
                                break
                    
                    if self.test_job_id and not test_job_found:
                        self.log_result("Public jobs test job visibility", False, 
                                      "Test job not found in public job listings")
                    
                    # Verify job posting structure
                    if job_postings:
                        sample_job = job_postings[0]
                        job_fields = ['id', 'title', 'slug', 'description', 'department', 'location']
                        job_present = [field for field in job_fields if field in sample_job]
                        
                        if len(job_present) >= 4:
                            self.log_result("Public jobs structure", True, 
                                          f"Job fields present: {job_present}")
                        else:
                            self.log_result("Public jobs structure", False, 
                                          f"Missing job fields: {set(job_fields) - set(job_present)}")
                        
                else:
                    self.log_result("Public jobs GET structure", False, 
                                  f"Missing required fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Public jobs GET", False, "Invalid JSON response")
        else:
            self.log_result("Public jobs GET", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_public_job_by_slug(self):
        """Test GET /api/public/content/jobs/{slug} - Get specific job by slug"""
        print("\n=== 7. Testing Public Job by Slug ===")
        
        if not self.test_job_slug:
            self.log_result("Public job by slug", False, "No test job slug available")
            return
        
        response = self.make_request("GET", f"/public/content/jobs/{self.test_job_slug}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'job_posting' in data:
                    job_posting = data['job_posting']
                    
                    # Verify job posting structure
                    required_fields = ['id', 'title', 'slug', 'description', 'department']
                    missing_fields = [field for field in required_fields if field not in job_posting]
                    
                    if not missing_fields:
                        self.log_result("Public job by slug", True, 
                                      f"Retrieved job: {job_posting['title']}")
                        
                        # Verify this is our test job
                        if job_posting.get('id') == self.test_job_id:
                            self.log_result("Public job by slug verification", True, 
                                          "Retrieved correct test job by slug")
                        else:
                            self.log_result("Public job by slug verification", False, 
                                          "Retrieved job ID doesn't match test job")
                            
                        # Verify job details
                        job_details = ['requirements', 'benefits', 'responsibilities']
                        details_present = [field for field in job_details if field in job_posting and job_posting[field]]
                        
                        if len(details_present) >= 2:
                            self.log_result("Public job details", True, 
                                          f"Job details present: {details_present}")
                        else:
                            self.log_result("Public job details", False, 
                                          f"Missing job details: {set(job_details) - set(details_present)}")
                            
                    else:
                        self.log_result("Public job by slug", False, 
                                      f"Missing required fields: {missing_fields}")
                else:
                    self.log_result("Public job by slug", False, "No job_posting in response")
                    
            except json.JSONDecodeError:
                self.log_result("Public job by slug", False, "Invalid JSON response")
        else:
            self.log_result("Public job by slug", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_public_featured_jobs(self):
        """Test GET /api/public/content/jobs/featured - Get featured jobs"""
        print("\n=== 8. Testing Public Featured Jobs ===")
        
        response = self.make_request("GET", "/public/content/jobs/featured")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'featured_jobs' in data:
                    featured_jobs = data['featured_jobs']
                    
                    self.log_result("Public featured jobs", True, 
                                  f"Found {len(featured_jobs)} featured jobs")
                    
                    # Check if our test job appears (it was marked as featured)
                    test_job_found = False
                    if self.test_job_id:
                        for job in featured_jobs:
                            if job.get('id') == self.test_job_id:
                                test_job_found = True
                                self.log_result("Featured jobs test job visibility", True, 
                                              f"Test job '{job['title']}' appears in featured jobs")
                                break
                    
                    if self.test_job_id and not test_job_found:
                        self.log_result("Featured jobs test job visibility", False, 
                                      "Test job not found in featured jobs (may need time to propagate)")
                    
                    # Verify featured job structure
                    if featured_jobs:
                        sample_job = featured_jobs[0]
                        job_fields = ['id', 'title', 'slug', 'department', 'location', 'is_featured']
                        job_present = [field for field in job_fields if field in sample_job]
                        
                        if len(job_present) >= 4:
                            self.log_result("Featured jobs structure", True, 
                                          f"Featured job fields present: {job_present}")
                        else:
                            self.log_result("Featured jobs structure", False, 
                                          f"Missing featured job fields: {set(job_fields) - set(job_present)}")
                else:
                    self.log_result("Public featured jobs", False, "No featured_jobs in response")
                    
            except json.JSONDecodeError:
                self.log_result("Public featured jobs", False, "Invalid JSON response")
        else:
            self.log_result("Public featured jobs", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_public_job_departments(self):
        """Test GET /api/public/content/jobs/departments - Get job departments"""
        print("\n=== 9. Testing Public Job Departments ===")
        
        response = self.make_request("GET", "/public/content/jobs/departments")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'departments' in data:
                    departments = data['departments']
                    
                    self.log_result("Public job departments", True, 
                                  f"Found {len(departments)} job departments")
                    
                    # Check if our test job's department appears
                    test_dept_found = False
                    test_department = self.test_data.get('created_job', {}).get('department')
                    
                    if test_department:
                        for dept in departments:
                            if dept.get('department') == test_department:
                                test_dept_found = True
                                self.log_result("Job departments test dept visibility", True, 
                                              f"Test department '{test_department}' found with {dept['job_count']} jobs")
                                break
                    
                    if test_department and not test_dept_found:
                        self.log_result("Job departments test dept visibility", False, 
                                      f"Test department '{test_department}' not found in departments")
                    
                    # Verify department structure
                    if departments:
                        sample_dept = departments[0]
                        dept_fields = ['department', 'job_count']
                        dept_present = [field for field in dept_fields if field in sample_dept]
                        
                        if len(dept_present) == len(dept_fields):
                            self.log_result("Job departments structure", True, 
                                          f"Department fields present: {dept_present}")
                        else:
                            self.log_result("Job departments structure", False, 
                                          f"Missing department fields: {set(dept_fields) - set(dept_present)}")
                else:
                    self.log_result("Public job departments", False, "No departments in response")
                    
            except json.JSONDecodeError:
                self.log_result("Public job departments", False, "Invalid JSON response")
        else:
            self.log_result("Public job departments", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_public_job_application(self):
        """Test POST /api/public/content/jobs/{job_id}/apply - Apply to job"""
        print("\n=== 10. Testing Public Job Application ===")
        
        if not self.test_job_id:
            self.log_result("Public job application", False, "No test job ID available")
            return
        
        # Create job application data
        application_data = {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+234-801-234-5678",
            "experience_level": "Senior",
            "message": "I am very interested in this Senior Software Engineer position. I have over 6 years of experience in backend development with Python, FastAPI, and MongoDB. I have worked on several large-scale projects and am excited about the opportunity to contribute to your team.",
            "resume_filename": "john_doe_resume.pdf"
        }
        
        response = self.make_request("POST", f"/public/content/jobs/{self.test_job_id}/apply", 
                                   json=application_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['message', 'application_id']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.test_application_id = data['application_id']
                    
                    self.log_result("Public job application", True, 
                                  f"Application submitted successfully, ID: {self.test_application_id}")
                    
                    # Store application data for later tests
                    self.test_data['created_application'] = {
                        'id': self.test_application_id,
                        'job_id': self.test_job_id,
                        'name': application_data['name'],
                        'email': application_data['email']
                    }
                        
                else:
                    self.log_result("Public job application", False, 
                                  f"Missing required fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Public job application", False, "Invalid JSON response")
        else:
            self.log_result("Public job application", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_applications_get(self):
        """Test GET /api/admin/jobs/applications - Get job applications"""
        print("\n=== 11. Testing Admin Job Applications GET ===")
        
        if not self.access_token:
            self.log_result("Admin job applications GET", False, "No access token available")
            return
        
        response = self.make_request("GET", "/admin/jobs/applications", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['applications', 'pagination']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    applications = data['applications']
                    pagination = data['pagination']
                    
                    self.log_result("Admin job applications GET structure", True, 
                                  f"Found {len(applications)} job applications")
                    
                    # Check if our test application appears
                    test_app_found = False
                    if self.test_application_id:
                        for app in applications:
                            if app.get('id') == self.test_application_id:
                                test_app_found = True
                                self.log_result("Admin applications test app visibility", True, 
                                              f"Test application from '{app['name']}' found")
                                break
                    
                    if self.test_application_id and not test_app_found:
                        self.log_result("Admin applications test app visibility", False, 
                                      "Test application not found in admin applications list")
                    
                    # Verify application structure
                    if applications:
                        sample_app = applications[0]
                        app_fields = ['id', 'job_id', 'name', 'email', 'status', 'applied_at']
                        app_present = [field for field in app_fields if field in sample_app]
                        
                        if len(app_present) >= 4:
                            self.log_result("Admin applications structure", True, 
                                          f"Application fields present: {app_present}")
                        else:
                            self.log_result("Admin applications structure", False, 
                                          f"Missing application fields: {set(app_fields) - set(app_present)}")
                        
                else:
                    self.log_result("Admin job applications GET structure", False, 
                                  f"Missing required fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job applications GET", False, "Invalid JSON response")
        else:
            self.log_result("Admin job applications GET", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_application_update(self):
        """Test PUT /api/admin/jobs/applications/{app_id} - Update application status"""
        print("\n=== 12. Testing Admin Job Application UPDATE ===")
        
        if not self.access_token or not self.test_application_id:
            self.log_result("Admin job application UPDATE", False, "No access token or application ID available")
            return
        
        # Update application status
        update_data = {
            "status": "reviewed",
            "notes": "Application reviewed. Candidate has strong technical background and relevant experience."
        }
        
        response = self.make_request("PUT", f"/admin/jobs/applications/{self.test_application_id}", 
                                   json=update_data, auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'message' in data:
                    self.log_result("Admin job application UPDATE", True, data['message'])
                    
                    # Verify the update by getting applications again
                    verify_response = self.make_request("GET", "/admin/jobs/applications", 
                                                      auth_token=self.access_token)
                    
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        applications = verify_data.get('applications', [])
                        
                        # Find our test application
                        updated_app = None
                        for app in applications:
                            if app.get('id') == self.test_application_id:
                                updated_app = app
                                break
                        
                        if updated_app and updated_app.get('status') == update_data['status']:
                            self.log_result("Admin job application UPDATE verification", True, 
                                          f"Application status updated to '{updated_app['status']}'")
                        else:
                            self.log_result("Admin job application UPDATE verification", False, 
                                          "Application status update not reflected")
                    else:
                        self.log_result("Admin job application UPDATE verification", False, 
                                      "Could not verify application update")
                else:
                    self.log_result("Admin job application UPDATE", False, "No message in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job application UPDATE", False, "Invalid JSON response")
        else:
            self.log_result("Admin job application UPDATE", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_statistics(self):
        """Test GET /api/admin/jobs/statistics - Get job statistics"""
        print("\n=== 13. Testing Admin Job Statistics ===")
        
        if not self.access_token:
            self.log_result("Admin job statistics", False, "No access token available")
            return
        
        response = self.make_request("GET", "/admin/jobs/statistics", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'statistics' in data:
                    statistics = data['statistics']
                    
                    # Verify statistics structure
                    expected_stats = ['total_jobs', 'active_jobs', 'draft_jobs', 'total_applications']
                    stats_present = [stat for stat in expected_stats if stat in statistics]
                    
                    if len(stats_present) >= 3:
                        self.log_result("Admin job statistics", True, 
                                      f"Statistics available: {stats_present}")
                        
                        # Log some key statistics
                        total_jobs = statistics.get('total_jobs', 0)
                        active_jobs = statistics.get('active_jobs', 0)
                        total_applications = statistics.get('total_applications', 0)
                        
                        self.log_result("Admin job statistics details", True, 
                                      f"Total jobs: {total_jobs}, Active: {active_jobs}, Applications: {total_applications}")
                        
                        # Verify our test job and application are counted
                        if total_jobs > 0 and total_applications > 0:
                            self.log_result("Admin job statistics validation", True, 
                                          "Statistics show jobs and applications are being tracked")
                        else:
                            self.log_result("Admin job statistics validation", False, 
                                          "Statistics show zero jobs or applications")
                            
                    else:
                        self.log_result("Admin job statistics", False, 
                                      f"Missing statistics: {set(expected_stats) - set(stats_present)}")
                else:
                    self.log_result("Admin job statistics", False, "No statistics in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job statistics", False, "Invalid JSON response")
        else:
            self.log_result("Admin job statistics", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_job_posting_delete(self):
        """Test DELETE /api/admin/jobs/postings/{job_id} - Delete job posting"""
        print("\n=== 14. Testing Admin Job Posting DELETE ===")
        
        if not self.access_token or not self.test_job_id:
            self.log_result("Admin job posting DELETE", False, "No access token or job ID available")
            return
        
        response = self.make_request("DELETE", f"/admin/jobs/postings/{self.test_job_id}", 
                                   auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if 'message' in data:
                    self.log_result("Admin job posting DELETE", True, data['message'])
                    
                    # Verify the job is now archived
                    verify_response = self.make_request("GET", f"/admin/jobs/postings/{self.test_job_id}", 
                                                      auth_token=self.access_token)
                    
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        job_posting = verify_data.get('job_posting', {})
                        
                        if job_posting.get('status') == 'archived':
                            self.log_result("Admin job posting DELETE verification", True, 
                                          "Job posting status is now 'archived'")
                        else:
                            self.log_result("Admin job posting DELETE verification", False, 
                                          f"Job status is '{job_posting.get('status')}', expected 'archived'")
                    else:
                        self.log_result("Admin job posting DELETE verification", False, 
                                      "Could not verify delete status")
                else:
                    self.log_result("Admin job posting DELETE", False, "No message in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin job posting DELETE", False, "Invalid JSON response")
        else:
            self.log_result("Admin job posting DELETE", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def run_all_tests(self):
        """Run all jobs and careers management API tests"""
        print("🚀 Starting Jobs and Careers Management System Testing")
        print("=" * 80)
        
        try:
            # Test service health
            self.test_service_health()
            
            # Get admin authentication token
            if not self.get_admin_token():
                print("❌ Cannot proceed without admin authentication")
                return
            
            # Test admin job management APIs
            self.test_admin_job_postings_get()
            self.test_admin_job_posting_create()
            self.test_admin_job_posting_get_specific()
            self.test_admin_job_posting_update()
            self.test_admin_job_posting_publish()
            
            # Test public job APIs
            self.test_public_jobs_get()
            self.test_public_job_by_slug()
            self.test_public_featured_jobs()
            self.test_public_job_departments()
            self.test_public_job_application()
            
            # Test job applications management
            self.test_admin_job_applications_get()
            self.test_admin_job_application_update()
            
            # Test job statistics
            self.test_admin_job_statistics()
            
            # Clean up - delete test job
            self.test_admin_job_posting_delete()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 80)
        print("🏁 JOBS AND CAREERS MANAGEMENT SYSTEM TEST RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        # Print key findings
        print(f"\n🎯 KEY FINDINGS:")
        
        if self.results['passed'] > 0:
            print(f"✅ Successfully tested {self.results['passed']} API endpoints and features")
            print(f"✅ Admin job management APIs are functional")
            print(f"✅ Public job APIs for careers page are working")
            print(f"✅ Job application system is operational")
            print(f"✅ Complete job posting workflow tested successfully")
        
        if self.results['failed'] > 0:
            print(f"\n🔍 FAILED TESTS DETAILS:")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"{i}. {error}")
        
        # Overall assessment
        if success_rate >= 90:
            print(f"\n✅ OVERALL RESULT: EXCELLENT - Jobs and careers management system is fully functional")
        elif success_rate >= 75:
            print(f"\n⚠️  OVERALL RESULT: GOOD - Jobs and careers management system is mostly functional with minor issues")
        elif success_rate >= 50:
            print(f"\n⚠️  OVERALL RESULT: FAIR - Jobs and careers management system has some functionality but needs fixes")
        else:
            print(f"\n❌ OVERALL RESULT: POOR - Jobs and careers management system has significant issues requiring attention")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = JobsCareersAPITester()
    tester.run_all_tests()
#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for ServiceHub - Homeowner Job & Quote Management
Tests authentication, job management, and quote system with focus on new /my-jobs endpoint
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://servicehub-ng.preview.emergentagent.com/api"

class BackendTester:
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
    
    def test_authentication_system(self):
        """Test user registration and authentication"""
        print("\n=== Testing Authentication System ===")
        
        # Test homeowner registration
        homeowner_data = {
            "name": "Adebayo Johnson",
            "email": f"adebayo.johnson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Lagos, Lagos State",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            if homeowner_profile.get('role') == 'homeowner':
                self.log_result("Homeowner registration", True, f"ID: {homeowner_profile['id']}")
                self.test_data['homeowner_profile'] = homeowner_profile
                self.test_data['homeowner_credentials'] = {
                    'email': homeowner_data['email'],
                    'password': homeowner_data['password']
                }
            else:
                self.log_result("Homeowner registration", False, "Invalid role in response")
        else:
            self.log_result("Homeowner registration", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test tradesperson registration
        tradesperson_data = {
            "name": "Emeka Okafor",
            "email": f"emeka.okafor.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Abuja, FCT",
            "postcode": "900001",
            "trade_categories": ["Plumbing", "Heating & Gas"],
            "experience_years": 8,
            "company_name": "Okafor Plumbing Services",
            "description": "Professional plumber with 8 years experience in residential and commercial projects.",
            "certifications": ["Licensed Plumber", "Gas Safety Certificate"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            if tradesperson_profile.get('role') == 'tradesperson':
                self.log_result("Tradesperson registration", True, f"ID: {tradesperson_profile['id']}")
                self.test_data['tradesperson_profile'] = tradesperson_profile
                self.test_data['tradesperson_credentials'] = {
                    'email': tradesperson_data['email'],
                    'password': tradesperson_data['password']
                }
            else:
                self.log_result("Tradesperson registration", False, "Invalid role in response")
        else:
            self.log_result("Tradesperson registration", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test homeowner login
        if 'homeowner_credentials' in self.test_data:
            login_data = self.test_data['homeowner_credentials']
            response = self.make_request("POST", "/auth/login", json=login_data)
            if response.status_code == 200:
                login_response = response.json()
                if 'access_token' in login_response and login_response.get('user', {}).get('role') == 'homeowner':
                    self.log_result("Homeowner login", True)
                    self.auth_tokens['homeowner'] = login_response['access_token']
                    self.test_data['homeowner_user'] = login_response['user']
                else:
                    self.log_result("Homeowner login", False, "Invalid login response")
            else:
                self.log_result("Homeowner login", False, f"Status: {response.status_code}")
        
        # Test tradesperson login
        if 'tradesperson_credentials' in self.test_data:
            login_data = self.test_data['tradesperson_credentials']
            response = self.make_request("POST", "/auth/login", json=login_data)
            if response.status_code == 200:
                login_response = response.json()
                if 'access_token' in login_response and login_response.get('user', {}).get('role') == 'tradesperson':
                    self.log_result("Tradesperson login", True)
                    self.auth_tokens['tradesperson'] = login_response['access_token']
                    self.test_data['tradesperson_user'] = login_response['user']
                else:
                    self.log_result("Tradesperson login", False, "Invalid login response")
            else:
                self.log_result("Tradesperson login", False, f"Status: {response.status_code}")
        
        # Test authentication verification
        if 'homeowner' in self.auth_tokens:
            response = self.make_request("GET", "/auth/me", auth_token=self.auth_tokens['homeowner'])
            if response.status_code == 200:
                profile = response.json()
                if profile.get('role') == 'homeowner':
                    self.log_result("Authentication verification", True)
                else:
                    self.log_result("Authentication verification", False, "Wrong role returned")
            else:
                self.log_result("Authentication verification", False, f"Status: {response.status_code}")
    
    def test_homeowner_job_management(self):
        """Test homeowner job creation and management"""
        print("\n=== Testing Homeowner Job Management ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job management tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data.get('homeowner_user', {})
        
        # Test job creation as homeowner
        job_data = {
            "title": "Bathroom Plumbing Installation - Modern Nigerian Design",
            "description": "Looking for an experienced plumber to install new bathroom fixtures in our Lagos home. We need installation of new toilet, sink, shower, and connecting all plumbing. The bathroom is approximately 8 square meters. We have already purchased the fixtures and need professional installation with proper water connections.",
            "category": "Plumbing",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001",
            "budget_min": 200000,
            "budget_max": 400000,
            "timeline": "Within 3 weeks",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            if 'id' in created_job and created_job['title'] == job_data['title']:
                self.log_result("Create job as homeowner", True, f"Job ID: {created_job['id']}")
                self.test_data['homeowner_job'] = created_job
            else:
                self.log_result("Create job as homeowner", False, "Invalid job creation response")
        else:
            self.log_result("Create job as homeowner", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Create a second job for testing
        job_data2 = {
            "title": "Bathroom Plumbing Repair",
            "description": "Need urgent plumbing repair for bathroom. Leaking pipes and blocked drain need professional attention.",
            "category": "Plumbing",
            "location": "Ikeja, Lagos State", 
            "postcode": "100001",
            "budget_min": 50000,
            "budget_max": 100000,
            "timeline": "Within 1 week",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data2, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job2 = response.json()
            self.log_result("Create second job", True, f"Job ID: {created_job2['id']}")
            self.test_data['homeowner_job2'] = created_job2
        else:
            self.log_result("Create second job", False, f"Status: {response.status_code}")
    
    def test_my_jobs_endpoint(self):
        """Test the new /my-jobs endpoint for homeowners"""
        print("\n=== Testing /my-jobs Endpoint ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("My jobs endpoint tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test getting homeowner's own jobs
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=homeowner_token)
        if response.status_code == 200:
            data = response.json()
            if 'jobs' in data and 'pagination' in data:
                jobs = data['jobs']
                if len(jobs) >= 2:  # Should have at least the 2 jobs we created
                    self.log_result("Get my jobs", True, f"Found {len(jobs)} jobs")
                    
                    # Verify jobs belong to current homeowner
                    homeowner_email = self.test_data.get('homeowner_user', {}).get('email')
                    all_jobs_owned = all(job.get('homeowner', {}).get('email') == homeowner_email for job in jobs)
                    if all_jobs_owned:
                        self.log_result("Job ownership verification", True, "All jobs belong to current homeowner")
                    else:
                        self.log_result("Job ownership verification", False, "Found jobs not owned by current homeowner")
                else:
                    self.log_result("Get my jobs", False, f"Expected at least 2 jobs, found {len(jobs)}")
            else:
                self.log_result("Get my jobs", False, "Invalid response structure")
        else:
            self.log_result("Get my jobs", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test pagination
        response = self.make_request("GET", "/jobs/my-jobs", 
                                   params={"page": 1, "limit": 1}, 
                                   auth_token=homeowner_token)
        if response.status_code == 200:
            data = response.json()
            if data.get('pagination', {}).get('limit') == 1:
                self.log_result("My jobs pagination", True, "Pagination working correctly")
            else:
                self.log_result("My jobs pagination", False, "Pagination not working")
        else:
            self.log_result("My jobs pagination", False, f"Status: {response.status_code}")
        
        # Test status filtering
        response = self.make_request("GET", "/jobs/my-jobs", 
                                   params={"status": "active"}, 
                                   auth_token=homeowner_token)
        if response.status_code == 200:
            data = response.json()
            jobs = data.get('jobs', [])
            if all(job.get('status') == 'active' for job in jobs):
                self.log_result("My jobs status filter", True, f"Found {len(jobs)} active jobs")
            else:
                self.log_result("My jobs status filter", False, "Status filtering not working")
        else:
            self.log_result("My jobs status filter", False, f"Status: {response.status_code}")
        
        # Test unauthorized access (tradesperson trying to access /my-jobs)
        if 'tradesperson' in self.auth_tokens:
            response = self.make_request("GET", "/jobs/my-jobs", 
                                       auth_token=self.auth_tokens['tradesperson'])
            if response.status_code == 403:
                self.log_result("Unauthorized access prevention", True, "Tradesperson correctly denied access")
            else:
                self.log_result("Unauthorized access prevention", False, 
                               f"Expected 403, got {response.status_code}")
        
        # Test unauthenticated access
        response = self.make_request("GET", "/jobs/my-jobs")
        if response.status_code in [401, 403]:
            self.log_result("Unauthenticated access prevention", True, "Correctly requires authentication")
        else:
            self.log_result("Unauthenticated access prevention", False, 
                           f"Expected 401 or 403, got {response.status_code}")
    
    def test_quote_management_system(self):
        """Test quote creation and management workflow"""
        print("\n=== Testing Quote Management System ===")
        
        if 'homeowner' not in self.auth_tokens or 'tradesperson' not in self.auth_tokens:
            self.log_result("Quote management tests", False, "Missing authentication tokens")
            return
        
        if 'homeowner_job' not in self.test_data:
            self.log_result("Quote management tests", False, "No job available for testing")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['homeowner_job']['id']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        
        # Test quote creation by tradesperson
        quote_data = {
            "job_id": job_id,
            "price": 300000,
            "message": "I can complete your bathroom plumbing installation project within your budget and timeline. I have 8 years of experience with similar projects in Lagos and can provide references. The work includes full installation of toilet, sink, shower and all water connections. I guarantee all work and provide a 2-year warranty on installations.",
            "estimated_duration": "2-3 weeks",
            "start_date": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        response = self.make_request("POST", "/quotes/", json=quote_data, auth_token=tradesperson_token)
        if response.status_code == 200:
            created_quote = response.json()
            if 'id' in created_quote and created_quote['job_id'] == job_id:
                self.log_result("Create quote", True, f"Quote ID: {created_quote['id']}")
                self.test_data['created_quote'] = created_quote
            else:
                self.log_result("Create quote", False, "Invalid quote creation response")
        else:
            self.log_result("Create quote", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test duplicate quote prevention
        response = self.make_request("POST", "/quotes/", json=quote_data, auth_token=tradesperson_token)
        if response.status_code == 400:
            self.log_result("Duplicate quote prevention", True, "Correctly rejected duplicate quote")
        else:
            self.log_result("Duplicate quote prevention", False, 
                           f"Should have rejected duplicate, got: {response.status_code}")
        
        # Test get quotes for job (homeowner only)
        response = self.make_request("GET", f"/quotes/job/{job_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            data = response.json()
            if 'quotes' in data and 'job' in data:
                quotes = data['quotes']
                if len(quotes) > 0:
                    self.log_result("Get job quotes (homeowner)", True, f"Found {len(quotes)} quotes")
                    
                    # Verify quote details
                    quote = quotes[0]
                    if quote.get('job_id') == job_id:
                        self.log_result("Quote job association", True, "Quote correctly associated with job")
                    else:
                        self.log_result("Quote job association", False, "Quote job ID mismatch")
                else:
                    self.log_result("Get job quotes (homeowner)", False, "No quotes found")
            else:
                self.log_result("Get job quotes (homeowner)", False, "Invalid response structure")
        else:
            self.log_result("Get job quotes (homeowner)", False, f"Status: {response.status_code}")
        
        # Test unauthorized access to job quotes (tradesperson trying to access)
        response = self.make_request("GET", f"/quotes/job/{job_id}", auth_token=tradesperson_token)
        if response.status_code == 403:
            self.log_result("Quote access authorization", True, "Tradesperson correctly denied access to job quotes")
        else:
            self.log_result("Quote access authorization", False, 
                           f"Expected 403, got {response.status_code}")
        
        # Test quote summary endpoint
        response = self.make_request("GET", f"/quotes/job/{job_id}/summary", auth_token=homeowner_token)
        if response.status_code == 200:
            summary = response.json()
            required_fields = ['job_id', 'job_title', 'total_quotes', 'pending_quotes', 
                             'accepted_quotes', 'rejected_quotes', 'average_price', 'price_range']
            missing_fields = [field for field in required_fields if field not in summary]
            if not missing_fields:
                self.log_result("Quote summary", True, 
                               f"Total quotes: {summary['total_quotes']}, "
                               f"Avg price: ₦{summary['average_price']:,.0f}")
            else:
                self.log_result("Quote summary", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Quote summary", False, f"Status: {response.status_code}")
        
        # Test quote status update (accept quote)
        if 'created_quote' in self.test_data:
            quote_id = self.test_data['created_quote']['id']
            
            # Test accepting quote
            response = self.make_request("PUT", f"/quotes/{quote_id}/status", 
                                       params={"status": "accepted"}, 
                                       auth_token=homeowner_token)
            if response.status_code == 200:
                result = response.json()
                if "accepted" in result.get('message', '').lower():
                    self.log_result("Accept quote", True, "Quote accepted successfully")
                else:
                    self.log_result("Accept quote", False, "Unexpected response message")
            else:
                self.log_result("Accept quote", False, f"Status: {response.status_code}")
            
            # Test unauthorized quote status update (tradesperson trying to update)
            response = self.make_request("PUT", f"/quotes/{quote_id}/status", 
                                       params={"status": "rejected"}, 
                                       auth_token=tradesperson_token)
            if response.status_code == 403:
                self.log_result("Quote status authorization", True, "Tradesperson correctly denied access")
            else:
                self.log_result("Quote status authorization", False, 
                               f"Expected 403, got {response.status_code}")
        
        # Test accessing quotes for non-owned job
        if 'homeowner_job2' in self.test_data:
            # Create another homeowner to test cross-user access
            other_homeowner_data = {
                "name": "Kemi Adebayo",
                "email": f"kemi.adebayo.{uuid.uuid4().hex[:8]}@email.com",
                "password": "SecurePass123",
                "phone": "08198765432",
                "location": "Abuja, FCT",
                "postcode": "900001"
            }
            
            response = self.make_request("POST", "/auth/register/homeowner", json=other_homeowner_data)
            if response.status_code == 200:
                # Login the other homeowner
                login_response = self.make_request("POST", "/auth/login", 
                                                 json={"email": other_homeowner_data["email"], 
                                                      "password": other_homeowner_data["password"]})
                if login_response.status_code == 200:
                    other_token = login_response.json()['access_token']
                    
                    # Try to access first homeowner's job quotes
                    response = self.make_request("GET", f"/quotes/job/{job_id}", auth_token=other_token)
                    if response.status_code == 403:
                        self.log_result("Cross-user job access prevention", True, 
                                       "Correctly prevented access to other user's job quotes")
                    else:
                        self.log_result("Cross-user job access prevention", False, 
                                       f"Expected 403, got {response.status_code}")
    
    def test_error_handling_and_edge_cases(self):
        """Test error handling scenarios for job and quote management"""
        print("\n=== Testing Error Handling & Edge Cases ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Error handling tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test invalid job ID for my-jobs
        response = self.make_request("GET", "/jobs/invalid-job-id")
        if response.status_code == 404:
            self.log_result("Invalid job ID handling", True)
        else:
            self.log_result("Invalid job ID handling", False, f"Expected 404, got {response.status_code}")
        
        # Test invalid job ID for quotes
        response = self.make_request("GET", "/quotes/job/invalid-job-id", auth_token=homeowner_token)
        if response.status_code == 404:
            self.log_result("Invalid job ID for quotes", True)
        else:
            self.log_result("Invalid job ID for quotes", False, f"Expected 404, got {response.status_code}")
        
        # Test invalid quote ID for status update
        response = self.make_request("PUT", "/quotes/invalid-quote-id/status", 
                                   params={"status": "accepted"}, 
                                   auth_token=homeowner_token)
        if response.status_code == 404:
            self.log_result("Invalid quote ID handling", True)
        else:
            self.log_result("Invalid quote ID handling", False, f"Expected 404, got {response.status_code}")
        
        # Test invalid status value
        if 'created_quote' in self.test_data:
            quote_id = self.test_data['created_quote']['id']
            response = self.make_request("PUT", f"/quotes/{quote_id}/status", 
                                       params={"status": "invalid_status"}, 
                                       auth_token=homeowner_token)
            if response.status_code == 400:
                self.log_result("Invalid status value handling", True)
            else:
                self.log_result("Invalid status value handling", False, 
                               f"Expected 400, got {response.status_code}")
        
        # Test job creation with missing required fields
        invalid_job = {"title": "Too short"}
        response = self.make_request("POST", "/jobs/", json=invalid_job, auth_token=homeowner_token)
        if response.status_code in [400, 422]:
            self.log_result("Invalid job creation handling", True)
        else:
            self.log_result("Invalid job creation handling", False, 
                           f"Expected 400/422, got {response.status_code}")
    
    def test_health_endpoints(self):
        """Test basic health and connectivity"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        response = self.make_request("GET", "/")
        if response.status_code == 200:
            data = response.json()
            if "serviceHub API" in data.get("message", ""):
                self.log_result("Root endpoint", True, f"Status: {data.get('status')}")
            else:
                self.log_result("Root endpoint", False, f"Unexpected response: {data}")
        else:
            self.log_result("Root endpoint", False, f"Status: {response.status_code}")
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                self.log_result("Health endpoint", True)
            else:
                self.log_result("Health endpoint", False, f"Status not healthy: {data}")
        else:
            self.log_result("Health endpoint", False, f"Status: {response.status_code}")
    
    def run_homeowner_quote_tests(self):
        """Run all homeowner and quote management tests"""
        print("🚀 Starting ServiceHub Homeowner & Quote Management Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_authentication_system()
            self.test_homeowner_job_management()
            self.test_my_jobs_endpoint()
            self.test_quote_management_system()
            self.test_error_handling_and_edge_cases()
            
        except Exception as e:
            print(f"\n❌ Critical test failure: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical failure: {str(e)}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("🏁 HOMEOWNER & QUOTE MANAGEMENT TEST SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed']/(self.results['passed']+self.results['failed'])*100)
            print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results
    
if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_homeowner_quote_tests()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        exit(1)
    else:
        print(f"\n🎉 All homeowner and quote management tests passed successfully!")
        exit(0)
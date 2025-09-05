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
BACKEND_URL = "https://skillhub-ng.preview.emergentagent.com/api"

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
    
    def test_profile_management_system(self):
        """Test comprehensive profile management for both user types"""
        print("\n=== Testing Profile Management System ===")
        
        if 'homeowner' not in self.auth_tokens or 'tradesperson' not in self.auth_tokens:
            self.log_result("Profile management tests", False, "Missing authentication tokens")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Profile Retrieval - Homeowner
        response = self.make_request("GET", "/auth/me", auth_token=homeowner_token)
        if response.status_code == 200:
            homeowner_profile = response.json()
            required_fields = ['id', 'name', 'email', 'phone', 'role', 'location', 'postcode', 
                             'email_verified', 'phone_verified', 'created_at', 'updated_at']
            missing_fields = [field for field in required_fields if field not in homeowner_profile]
            
            if not missing_fields and homeowner_profile.get('role') == 'homeowner':
                self.log_result("Homeowner profile retrieval", True, 
                               f"Name: {homeowner_profile['name']}, Role: {homeowner_profile['role']}")
                self.test_data['homeowner_profile_data'] = homeowner_profile
            else:
                self.log_result("Homeowner profile retrieval", False, 
                               f"Missing fields: {missing_fields} or wrong role")
        else:
            self.log_result("Homeowner profile retrieval", False, f"Status: {response.status_code}")
        
        # Test 2: Profile Retrieval - Tradesperson
        response = self.make_request("GET", "/auth/me", auth_token=tradesperson_token)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            required_fields = ['id', 'name', 'email', 'phone', 'role', 'location', 'postcode',
                             'trade_categories', 'experience_years', 'company_name', 'description', 
                             'certifications', 'average_rating', 'total_reviews']
            missing_fields = [field for field in required_fields if field not in tradesperson_profile]
            
            if not missing_fields and tradesperson_profile.get('role') == 'tradesperson':
                self.log_result("Tradesperson profile retrieval", True, 
                               f"Name: {tradesperson_profile['name']}, Trade: {tradesperson_profile['trade_categories']}")
                self.test_data['tradesperson_profile_data'] = tradesperson_profile
            else:
                self.log_result("Tradesperson profile retrieval", False, 
                               f"Missing fields: {missing_fields} or wrong role")
        else:
            self.log_result("Tradesperson profile retrieval", False, f"Status: {response.status_code}")
        
        # Test 3: Unauthenticated Profile Access
        response = self.make_request("GET", "/auth/me")
        if response.status_code in [401, 403]:
            self.log_result("Unauthenticated profile access prevention", True, "Correctly requires authentication")
        else:
            self.log_result("Unauthenticated profile access prevention", False, 
                           f"Expected 401/403, got {response.status_code}")
        
        # Test 4: General Profile Update - Homeowner
        original_phone = self.test_data.get('homeowner_profile_data', {}).get('phone')
        update_data = {
            "name": "Adebayo Johnson Updated",
            "phone": "08134567890",  # Different valid Nigerian number
            "location": "Lekki, Lagos State",
            "postcode": "101001"
        }
        
        response = self.make_request("PUT", "/auth/profile", json=update_data, auth_token=homeowner_token)
        if response.status_code == 200:
            updated_profile = response.json()
            if (updated_profile['name'] == update_data['name'] and 
                updated_profile['location'] == update_data['location'] and
                updated_profile['phone'] != original_phone):
                self.log_result("Homeowner profile update", True, "All fields updated correctly")
                
                # Verify phone_verified was reset
                if not updated_profile.get('phone_verified', True):
                    self.log_result("Phone verification reset", True, "Phone verification correctly reset on phone change")
                else:
                    self.log_result("Phone verification reset", False, "Phone verification should be reset when phone changes")
            else:
                self.log_result("Homeowner profile update", False, "Fields not updated correctly")
        else:
            self.log_result("Homeowner profile update", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 5: Partial Profile Update
        partial_update = {"name": "Adebayo Johnson Final"}
        response = self.make_request("PUT", "/auth/profile", json=partial_update, auth_token=homeowner_token)
        if response.status_code == 200:
            updated_profile = response.json()
            if updated_profile['name'] == partial_update['name']:
                self.log_result("Partial profile update", True, "Name updated successfully")
            else:
                self.log_result("Partial profile update", False, "Name not updated")
        else:
            self.log_result("Partial profile update", False, f"Status: {response.status_code}")
        
        # Test 6: Invalid Phone Number Validation
        invalid_phone_data = {"phone": "123456789"}  # Invalid Nigerian number
        response = self.make_request("PUT", "/auth/profile", json=invalid_phone_data, auth_token=homeowner_token)
        if response.status_code == 400:
            self.log_result("Invalid phone validation", True, "Correctly rejected invalid phone number")
        else:
            self.log_result("Invalid phone validation", False, f"Expected 400, got {response.status_code}")
        
        # Test 7: Tradesperson-Specific Profile Update
        tradesperson_update = {
            "name": "Emeka Okafor Professional",
            "trade_categories": ["Plumbing", "Heating & Gas", "Electrical"],
            "experience_years": 10,
            "company_name": "Okafor Professional Services Ltd",
            "description": "Expert plumber and electrician with over 10 years of experience in residential and commercial projects across Lagos and Abuja. Specialized in modern plumbing systems and electrical installations.",
            "certifications": ["Licensed Plumber", "Gas Safety Certificate", "Electrical Installation Certificate"]
        }
        
        response = self.make_request("PUT", "/auth/profile/tradesperson", 
                                   json=tradesperson_update, auth_token=tradesperson_token)
        if response.status_code == 200:
            updated_profile = response.json()
            if (updated_profile['name'] == tradesperson_update['name'] and 
                updated_profile['experience_years'] == tradesperson_update['experience_years'] and
                len(updated_profile['certifications']) == 3):
                self.log_result("Tradesperson profile update", True, 
                               f"Experience: {updated_profile['experience_years']} years, "
                               f"Certifications: {len(updated_profile['certifications'])}")
            else:
                self.log_result("Tradesperson profile update", False, "Fields not updated correctly")
        else:
            self.log_result("Tradesperson profile update", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 8: Role-Based Access Control - Homeowner accessing tradesperson endpoint
        response = self.make_request("PUT", "/auth/profile/tradesperson", 
                                   json={"experience_years": 5}, auth_token=homeowner_token)
        if response.status_code == 403:
            self.log_result("Homeowner tradesperson endpoint access", True, "Correctly denied access")
        else:
            self.log_result("Homeowner tradesperson endpoint access", False, 
                           f"Expected 403, got {response.status_code}")
        
        # Test 9: Unauthenticated Profile Update
        response = self.make_request("PUT", "/auth/profile", json={"name": "Test"})
        if response.status_code in [401, 403]:
            self.log_result("Unauthenticated profile update prevention", True, "Correctly requires authentication")
        else:
            self.log_result("Unauthenticated profile update prevention", False, 
                           f"Expected 401/403, got {response.status_code}")
        
        # Test 10: Certification Management
        cert_update = {"certifications": ["New Certification", "Updated Certificate"]}
        response = self.make_request("PUT", "/auth/profile/tradesperson", 
                                   json=cert_update, auth_token=tradesperson_token)
        if response.status_code == 200:
            updated_profile = response.json()
            if len(updated_profile['certifications']) == 2:
                self.log_result("Certification management", True, "Certifications updated successfully")
            else:
                self.log_result("Certification management", False, "Certifications not updated correctly")
        else:
            self.log_result("Certification management", False, f"Status: {response.status_code}")

    def test_portfolio_management_system(self):
        """Test comprehensive portfolio management for tradespeople"""
        print("\n=== Testing Portfolio Management System ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Portfolio management tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Portfolio Image Upload with Form Data
        print("\n--- Testing Portfolio Image Upload ---")
        
        # Create a test image file (1x1 pixel JPEG)
        import io
        from PIL import Image
        
        # Create a small test image
        test_image = Image.new('RGB', (100, 100), color='red')
        img_buffer = io.BytesIO()
        test_image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        # Test valid image upload
        files = {'file': ('test_image.jpg', img_buffer, 'image/jpeg')}
        data = {
            'title': 'Modern Bathroom Installation - Lagos Project',
            'description': 'Complete bathroom renovation with modern fixtures and professional plumbing installation in Victoria Island, Lagos.',
            'category': 'bathroom_fitting'
        }
        
        response = self.session.post(
            f"{self.base_url}/portfolio/upload",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {tradesperson_token}'}
        )
        
        if response.status_code == 200:
            portfolio_item = response.json()
            required_fields = ['id', 'tradesperson_id', 'title', 'description', 'category', 
                             'image_url', 'image_filename', 'created_at', 'is_public']
            missing_fields = [field for field in required_fields if field not in portfolio_item]
            
            if not missing_fields:
                self.log_result("Portfolio image upload", True, 
                               f"ID: {portfolio_item['id']}, Category: {portfolio_item['category']}")
                self.test_data['portfolio_item'] = portfolio_item
            else:
                self.log_result("Portfolio image upload", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Portfolio image upload", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Invalid File Upload - Wrong Format
        img_buffer.seek(0)
        files = {'file': ('test_image.txt', img_buffer, 'text/plain')}
        data = {
            'title': 'Test Upload',
            'category': 'plumbing'
        }
        
        response = self.session.post(
            f"{self.base_url}/portfolio/upload",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {tradesperson_token}'}
        )
        
        if response.status_code == 400:
            self.log_result("Invalid file format rejection", True, "Correctly rejected non-image file")
        else:
            self.log_result("Invalid file format rejection", False, 
                           f"Expected 400, got {response.status_code}")
        
        # Test 3: Unauthorized Upload (Homeowner trying to upload)
        if 'homeowner' in self.auth_tokens:
            img_buffer.seek(0)
            files = {'file': ('test_image.jpg', img_buffer, 'image/jpeg')}
            data = {'title': 'Test', 'category': 'plumbing'}
            
            response = self.session.post(
                f"{self.base_url}/portfolio/upload",
                files=files,
                data=data,
                headers={'Authorization': f'Bearer {self.auth_tokens["homeowner"]}'}
            )
            
            if response.status_code == 403:
                self.log_result("Homeowner upload prevention", True, "Correctly denied homeowner access")
            else:
                self.log_result("Homeowner upload prevention", False, 
                               f"Expected 403, got {response.status_code}")
        
        # Test 4: Get My Portfolio
        response = self.make_request("GET", "/portfolio/my-portfolio", auth_token=tradesperson_token)
        if response.status_code == 200:
            portfolio_data = response.json()
            if 'items' in portfolio_data and 'total' in portfolio_data:
                items = portfolio_data['items']
                if len(items) > 0:
                    self.log_result("Get my portfolio", True, f"Found {len(items)} portfolio items")
                    
                    # Verify all items belong to current tradesperson
                    tradesperson_id = self.test_data.get('tradesperson_user', {}).get('id')
                    all_owned = all(item.get('tradesperson_id') == tradesperson_id for item in items)
                    if all_owned:
                        self.log_result("Portfolio ownership verification", True, 
                                       "All items belong to current tradesperson")
                    else:
                        self.log_result("Portfolio ownership verification", False, 
                                       "Found items not owned by current tradesperson")
                else:
                    self.log_result("Get my portfolio", True, "No portfolio items found (expected for new account)")
            else:
                self.log_result("Get my portfolio", False, "Invalid response structure")
        else:
            self.log_result("Get my portfolio", False, f"Status: {response.status_code}")
        
        # Test 5: Get Public Portfolio for Tradesperson
        tradesperson_id = self.test_data.get('tradesperson_user', {}).get('id')
        if tradesperson_id:
            response = self.make_request("GET", f"/portfolio/tradesperson/{tradesperson_id}")
            if response.status_code == 200:
                portfolio_data = response.json()
                if 'items' in portfolio_data and 'total' in portfolio_data:
                    self.log_result("Get public tradesperson portfolio", True, 
                                   f"Found {len(portfolio_data['items'])} public items")
                else:
                    self.log_result("Get public tradesperson portfolio", False, "Invalid response structure")
            else:
                self.log_result("Get public tradesperson portfolio", False, f"Status: {response.status_code}")
        
        # Test 6: Portfolio Item Update
        if 'portfolio_item' in self.test_data:
            item_id = self.test_data['portfolio_item']['id']
            
            # Test updating portfolio item details using query parameters
            params = {
                'title': 'Updated Bathroom Installation Project',
                'description': 'Updated description with more details about the modern bathroom renovation project.',
                'category': 'plumbing',
                'is_public': 'false'
            }
            
            response = self.make_request("PUT", f"/portfolio/{item_id}", 
                                       params=params, auth_token=tradesperson_token)
            if response.status_code == 200:
                updated_item = response.json()
                if (updated_item['title'] == params['title'] and 
                    updated_item['is_public'] == False):
                    self.log_result("Portfolio item update", True, "All fields updated correctly")
                else:
                    self.log_result("Portfolio item update", False, "Fields not updated correctly")
            else:
                self.log_result("Portfolio item update", False, f"Status: {response.status_code}")
            
            # Test unauthorized update (homeowner trying to update)
            if 'homeowner' in self.auth_tokens:
                response = self.make_request("PUT", f"/portfolio/{item_id}", 
                                           params={'title': 'Hacked'}, 
                                           auth_token=self.auth_tokens['homeowner'])
                if response.status_code == 403:
                    self.log_result("Unauthorized portfolio update prevention", True, 
                                   "Correctly denied homeowner access")
                else:
                    self.log_result("Unauthorized portfolio update prevention", False, 
                                   f"Expected 403, got {response.status_code}")
        
        # Test 7: Get All Public Portfolio Items
        response = self.make_request("GET", "/portfolio/")
        if response.status_code == 200:
            portfolio_data = response.json()
            if 'items' in portfolio_data and 'total' in portfolio_data:
                self.log_result("Get all public portfolio items", True, 
                               f"Found {len(portfolio_data['items'])} public items")
            else:
                self.log_result("Get all public portfolio items", False, "Invalid response structure")
        else:
            self.log_result("Get all public portfolio items", False, f"Status: {response.status_code}")
        
        # Test 8: Portfolio Category Filtering
        response = self.make_request("GET", "/portfolio/", params={'category': 'plumbing'})
        if response.status_code == 200:
            portfolio_data = response.json()
            items = portfolio_data.get('items', [])
            if all(item.get('category') == 'plumbing' for item in items):
                self.log_result("Portfolio category filtering", True, f"Found {len(items)} plumbing items")
            else:
                self.log_result("Portfolio category filtering", False, "Category filtering not working")
        else:
            self.log_result("Portfolio category filtering", False, f"Status: {response.status_code}")
        
        # Test 9: Image Serving Endpoint
        if 'portfolio_item' in self.test_data:
            image_filename = self.test_data['portfolio_item']['image_filename']
            response = self.make_request("GET", f"/portfolio/images/{image_filename}")
            if response.status_code == 200:
                if response.headers.get('content-type', '').startswith('image/'):
                    self.log_result("Portfolio image serving", True, "Image served correctly")
                else:
                    self.log_result("Portfolio image serving", False, "Wrong content type")
            else:
                self.log_result("Portfolio image serving", False, f"Status: {response.status_code}")
        
        # Test 10: Portfolio Item Deletion
        if 'portfolio_item' in self.test_data:
            item_id = self.test_data['portfolio_item']['id']
            
            # Test unauthorized deletion (homeowner trying to delete)
            if 'homeowner' in self.auth_tokens:
                response = self.make_request("DELETE", f"/portfolio/{item_id}", 
                                           auth_token=self.auth_tokens['homeowner'])
                if response.status_code == 403:
                    self.log_result("Unauthorized portfolio deletion prevention", True, 
                                   "Correctly denied homeowner access")
                else:
                    self.log_result("Unauthorized portfolio deletion prevention", False, 
                                   f"Expected 403, got {response.status_code}")
            
            # Test valid deletion
            response = self.make_request("DELETE", f"/portfolio/{item_id}", 
                                       auth_token=tradesperson_token)
            if response.status_code == 200:
                result = response.json()
                if "deleted successfully" in result.get('message', '').lower():
                    self.log_result("Portfolio item deletion", True, "Item deleted successfully")
                    
                    # Verify item is actually deleted
                    response = self.make_request("GET", "/portfolio/my-portfolio", 
                                               auth_token=tradesperson_token)
                    if response.status_code == 200:
                        portfolio_data = response.json()
                        remaining_items = [item for item in portfolio_data['items'] 
                                         if item['id'] == item_id]
                        if not remaining_items:
                            self.log_result("Portfolio deletion verification", True, 
                                           "Item successfully removed from database")
                        else:
                            self.log_result("Portfolio deletion verification", False, 
                                           "Item still exists in database")
                else:
                    self.log_result("Portfolio item deletion", False, "Unexpected response message")
            else:
                self.log_result("Portfolio item deletion", False, f"Status: {response.status_code}")
        
        # Test 11: Error Handling - Invalid Portfolio Item ID for Update
        response = self.make_request("PUT", "/portfolio/invalid-item-id", 
                                   params={'title': 'Test'}, auth_token=tradesperson_token)
        if response.status_code == 404:
            self.log_result("Invalid portfolio item ID handling", True, "Correctly returned 404")
        else:
            self.log_result("Invalid portfolio item ID handling", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 12: Error Handling - Missing Required Fields in Upload
        files = {'file': ('test.jpg', io.BytesIO(b'fake image'), 'image/jpeg')}
        data = {'title': ''}  # Empty title
        
        response = self.session.post(
            f"{self.base_url}/portfolio/upload",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {tradesperson_token}'}
        )
        
        if response.status_code in [400, 422]:
            self.log_result("Missing required fields handling", True, "Correctly rejected empty title")
        else:
            self.log_result("Missing required fields handling", False, 
                           f"Expected 400/422, got {response.status_code}")

    def test_communication_system(self):
        """Test comprehensive messaging system for job-based communication"""
        print("\n=== Testing Communication System ===")
        
        if 'homeowner' not in self.auth_tokens or 'tradesperson' not in self.auth_tokens:
            self.log_result("Communication system tests", False, "Missing authentication tokens")
            return
        
        if 'homeowner_job' not in self.test_data:
            self.log_result("Communication system tests", False, "No job available for testing")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['homeowner_job']['id']
        homeowner_id = self.test_data['homeowner_user']['id']
        tradesperson_id = self.test_data['tradesperson_user']['id']
        
        # Test 1: Send text message from homeowner to tradesperson
        message_data = {
            'job_id': job_id,
            'recipient_id': tradesperson_id,
            'content': 'Hello! I saw your quote for my bathroom plumbing project. I have a few questions about the timeline and materials you plan to use. When would be a good time to discuss the details?',
            'message_type': 'text'
        }
        
        response = self.session.post(
            f"{self.base_url}/messages/send",
            data=message_data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 200:
            sent_message = response.json()
            required_fields = ['id', 'job_id', 'sender_id', 'recipient_id', 'content', 
                             'message_type', 'status', 'created_at']
            missing_fields = [field for field in required_fields if field not in sent_message]
            
            if not missing_fields and sent_message['sender_id'] == homeowner_id:
                self.log_result("Send text message (homeowner to tradesperson)", True, 
                               f"Message ID: {sent_message['id']}")
                self.test_data['homeowner_message'] = sent_message
            else:
                self.log_result("Send text message (homeowner to tradesperson)", False, 
                               f"Missing fields: {missing_fields} or wrong sender")
        else:
            self.log_result("Send text message (homeowner to tradesperson)", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Send reply message from tradesperson to homeowner
        reply_data = {
            'job_id': job_id,
            'recipient_id': homeowner_id,
            'content': 'Thank you for your interest! I would be happy to discuss the project details. I am available for a call tomorrow afternoon or this weekend. For materials, I use high-quality fixtures and all work comes with a 2-year warranty.',
            'message_type': 'text'
        }
        
        response = self.session.post(
            f"{self.base_url}/messages/send",
            data=reply_data,
            headers={'Authorization': f'Bearer {tradesperson_token}'}
        )
        
        if response.status_code == 200:
            reply_message = response.json()
            if reply_message['sender_id'] == tradesperson_id and reply_message['recipient_id'] == homeowner_id:
                self.log_result("Send reply message (tradesperson to homeowner)", True, 
                               f"Message ID: {reply_message['id']}")
                self.test_data['tradesperson_message'] = reply_message
            else:
                self.log_result("Send reply message (tradesperson to homeowner)", False, 
                               "Wrong sender or recipient")
        else:
            self.log_result("Send reply message (tradesperson to homeowner)", False, 
                           f"Status: {response.status_code}")
        
        # Test 3: Send image message with file upload
        import io
        from PIL import Image
        
        # Create a test image
        test_image = Image.new('RGB', (200, 150), color='blue')
        img_buffer = io.BytesIO()
        test_image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        files = {'file': ('bathroom_plan.jpg', img_buffer, 'image/jpeg')}
        data = {
            'job_id': job_id,
            'recipient_id': tradesperson_id,
            'content': 'Here is the current bathroom layout. As you can see, we need to relocate the plumbing for the new shower installation.',
            'message_type': 'image'
        }
        
        response = self.session.post(
            f"{self.base_url}/messages/send",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 200:
            image_message = response.json()
            if (image_message['message_type'] == 'image' and 
                image_message['image_url'] and 
                image_message['image_filename']):
                self.log_result("Send image message", True, 
                               f"Image URL: {image_message['image_url']}")
                self.test_data['image_message'] = image_message
            else:
                self.log_result("Send image message", False, "Missing image data")
        else:
            self.log_result("Send image message", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 4: Test unauthorized messaging (user without quote trying to message)
        # Create another tradesperson who hasn't quoted
        other_tradesperson_data = {
            "name": "Chidi Okwu",
            "email": f"chidi.okwu.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "08198765432",
            "location": "Port Harcourt, Rivers State",
            "postcode": "500001",
            "trade_categories": ["Electrical"],
            "experience_years": 5,
            "company_name": "Okwu Electrical Services",
            "description": "Professional electrician with 5 years experience.",
            "certifications": ["Licensed Electrician"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=other_tradesperson_data)
        if response.status_code == 200:
            # Login the other tradesperson
            login_response = self.make_request("POST", "/auth/login", 
                                             json={"email": other_tradesperson_data["email"], 
                                                  "password": other_tradesperson_data["password"]})
            if login_response.status_code == 200:
                other_tradesperson_token = login_response.json()['access_token']
                
                # Try to send message without having quoted
                unauthorized_data = {
                    'job_id': job_id,
                    'recipient_id': homeowner_id,
                    'content': 'I would like to work on this project.',
                    'message_type': 'text'
                }
                
                response = self.session.post(
                    f"{self.base_url}/messages/send",
                    data=unauthorized_data,
                    headers={'Authorization': f'Bearer {other_tradesperson_token}'}
                )
                
                if response.status_code == 403:
                    self.log_result("Unauthorized messaging prevention", True, 
                                   "Correctly denied access to non-quoted tradesperson")
                else:
                    self.log_result("Unauthorized messaging prevention", False, 
                                   f"Expected 403, got {response.status_code}")
        
        # Test 5: Get job conversation messages
        response = self.make_request("GET", f"/messages/job/{job_id}", 
                                   auth_token=homeowner_token)
        if response.status_code == 200:
            conversation_data = response.json()
            required_fields = ['messages', 'conversation', 'pagination']
            missing_fields = [field for field in required_fields if field not in conversation_data]
            
            if not missing_fields:
                messages = conversation_data['messages']
                if len(messages) >= 2:  # Should have at least 2 messages we sent
                    self.log_result("Get job conversation messages", True, 
                                   f"Found {len(messages)} messages")
                    
                    # Verify message ordering (chronological)
                    if len(messages) > 1:
                        first_msg_time = messages[0]['created_at']
                        last_msg_time = messages[-1]['created_at']
                        if first_msg_time <= last_msg_time:
                            self.log_result("Message chronological ordering", True, 
                                           "Messages ordered correctly by time")
                        else:
                            self.log_result("Message chronological ordering", False, 
                                           "Messages not in chronological order")
                else:
                    self.log_result("Get job conversation messages", False, 
                                   f"Expected at least 2 messages, found {len(messages)}")
            else:
                self.log_result("Get job conversation messages", False, 
                               f"Missing fields: {missing_fields}")
        else:
            self.log_result("Get job conversation messages", False, 
                           f"Status: {response.status_code}")
        
        # Test 6: Test pagination for messages
        response = self.make_request("GET", f"/messages/job/{job_id}", 
                                   params={"page": 1, "limit": 1},
                                   auth_token=homeowner_token)
        if response.status_code == 200:
            paginated_data = response.json()
            pagination = paginated_data.get('pagination', {})
            if pagination.get('limit') == 1 and len(paginated_data['messages']) <= 1:
                self.log_result("Message pagination", True, "Pagination working correctly")
            else:
                self.log_result("Message pagination", False, "Pagination not working")
        else:
            self.log_result("Message pagination", False, f"Status: {response.status_code}")
        
        # Test 7: Test unauthorized access to job messages
        if 'other_tradesperson_token' in locals():
            response = self.make_request("GET", f"/messages/job/{job_id}", 
                                       auth_token=other_tradesperson_token)
            if response.status_code == 403:
                self.log_result("Unauthorized message access prevention", True, 
                               "Correctly denied access to non-authorized user")
            else:
                self.log_result("Unauthorized message access prevention", False, 
                               f"Expected 403, got {response.status_code}")
        
        # Test 8: Mark message as read
        if 'homeowner_message' in self.test_data:
            message_id = self.test_data['homeowner_message']['id']
            
            # Tradesperson marks homeowner's message as read
            response = self.make_request("PUT", f"/messages/{message_id}/read", 
                                       auth_token=tradesperson_token)
            if response.status_code == 200:
                result = response.json()
                if "marked as read" in result.get('message', '').lower():
                    self.log_result("Mark message as read", True, "Message marked as read successfully")
                else:
                    self.log_result("Mark message as read", False, "Unexpected response")
            else:
                self.log_result("Mark message as read", False, f"Status: {response.status_code}")
            
            # Test unauthorized read marking (homeowner trying to mark their own message as read)
            response = self.make_request("PUT", f"/messages/{message_id}/read", 
                                       auth_token=homeowner_token)
            if response.status_code == 403:
                self.log_result("Unauthorized read marking prevention", True, 
                               "Correctly prevented sender from marking own message as read")
            else:
                self.log_result("Unauthorized read marking prevention", False, 
                               f"Expected 403, got {response.status_code}")
        
        # Test 9: Get unread messages count
        response = self.make_request("GET", "/messages/unread-count", 
                                   auth_token=tradesperson_token)
        if response.status_code == 200:
            unread_data = response.json()
            if 'unread_count' in unread_data and isinstance(unread_data['unread_count'], int):
                self.log_result("Get unread messages count", True, 
                               f"Unread count: {unread_data['unread_count']}")
            else:
                self.log_result("Get unread messages count", False, "Invalid response format")
        else:
            self.log_result("Get unread messages count", False, f"Status: {response.status_code}")
        
        # Test 10: Get user conversations
        response = self.make_request("GET", "/messages/conversations", 
                                   auth_token=homeowner_token)
        if response.status_code == 200:
            conversations = response.json()
            if isinstance(conversations, list) and len(conversations) > 0:
                conversation = conversations[0]
                required_fields = ['job_id', 'job_title', 'other_user_id', 'other_user_name', 
                                 'other_user_role', 'unread_count']
                missing_fields = [field for field in required_fields if field not in conversation]
                
                if not missing_fields:
                    self.log_result("Get user conversations", True, 
                                   f"Found {len(conversations)} conversations")
                else:
                    self.log_result("Get user conversations", False, 
                                   f"Missing fields: {missing_fields}")
            else:
                self.log_result("Get user conversations", True, "No conversations found (expected for new account)")
        else:
            self.log_result("Get user conversations", False, f"Status: {response.status_code}")
        
        # Test 11: Image serving endpoint
        if 'image_message' in self.test_data:
            image_filename = self.test_data['image_message']['image_filename']
            response = self.make_request("GET", f"/messages/images/{image_filename}")
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if content_type.startswith('image/'):
                    self.log_result("Message image serving", True, "Image served correctly")
                else:
                    self.log_result("Message image serving", False, f"Wrong content type: {content_type}")
            else:
                self.log_result("Message image serving", False, f"Status: {response.status_code}")
        
        # Test 12: Invalid image upload (wrong format)
        text_buffer = io.BytesIO(b"This is not an image file")
        files = {'file': ('not_image.txt', text_buffer, 'text/plain')}
        data = {
            'job_id': job_id,
            'recipient_id': tradesperson_id,
            'content': 'Test invalid file',
            'message_type': 'image'
        }
        
        response = self.session.post(
            f"{self.base_url}/messages/send",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 400:
            self.log_result("Invalid image format rejection", True, "Correctly rejected non-image file")
        else:
            self.log_result("Invalid image format rejection", False, 
                           f"Expected 400, got {response.status_code}")
        
        # Test 13: Message with invalid job ID
        invalid_message_data = {
            'job_id': 'invalid-job-id',
            'recipient_id': tradesperson_id,
            'content': 'Test message',
            'message_type': 'text'
        }
        
        response = self.session.post(
            f"{self.base_url}/messages/send",
            data=invalid_message_data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 404:
            self.log_result("Invalid job ID handling", True, "Correctly rejected invalid job ID")
        else:
            self.log_result("Invalid job ID handling", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 14: Message with invalid recipient ID
        invalid_recipient_data = {
            'job_id': job_id,
            'recipient_id': 'invalid-user-id',
            'content': 'Test message',
            'message_type': 'text'
        }
        
        response = self.session.post(
            f"{self.base_url}/messages/send",
            data=invalid_recipient_data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 404:
            self.log_result("Invalid recipient ID handling", True, "Correctly rejected invalid recipient")
        else:
            self.log_result("Invalid recipient ID handling", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 15: Unauthenticated message sending
        response = self.session.post(
            f"{self.base_url}/messages/send",
            data=message_data
        )
        
        if response.status_code in [401, 403]:
            self.log_result("Unauthenticated messaging prevention", True, "Correctly requires authentication")
        else:
            self.log_result("Unauthenticated messaging prevention", False, 
                           f"Expected 401/403, got {response.status_code}")

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
    
    def run_portfolio_management_tests(self):
        """Run comprehensive portfolio management tests"""
        print("🚀 Starting ServiceHub Portfolio Management Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_authentication_system()
            self.test_portfolio_management_system()
            
        except Exception as e:
            print(f"\n❌ Critical test failure: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical failure: {str(e)}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("🏁 PORTFOLIO MANAGEMENT TEST SUMMARY")
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

    def run_communication_system_tests(self):
        """Run comprehensive communication system tests"""
        print("🚀 Starting ServiceHub Communication System Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_authentication_system()
            self.test_homeowner_job_management()
            self.test_quote_management_system()  # Need quotes for messaging authorization
            self.test_communication_system()
            
        except Exception as e:
            print(f"\n❌ Critical test failure: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical failure: {str(e)}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("🏁 COMMUNICATION SYSTEM TEST SUMMARY")
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

    def run_profile_management_tests(self):
        """Run comprehensive profile management tests"""
        print("🚀 Starting ServiceHub Profile Management Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_authentication_system()
            self.test_profile_management_system()
            
        except Exception as e:
            print(f"\n❌ Critical test failure: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical failure: {str(e)}")
        
        # Print summary
        print(f"\n{'='*60}")
        print("🏁 PROFILE MANAGEMENT TEST SUMMARY")
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
    
    # Run communication system tests as requested
    results = tester.run_communication_system_tests()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        print(f"\n⚠️  Communication system tests completed with {results['failed']} failures")
        exit(1)
    else:
        print(f"\n🎉 All communication system tests passed successfully!")
        exit(0)
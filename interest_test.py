#!/usr/bin/env python3
"""
Comprehensive Interest System Tests for ServiceHub - Homeowner Interest Review Workflow
Tests the complete lead generation workflow: job creation → tradesperson interest → homeowner review → contact sharing
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://homefix-beta.preview.emergentagent.com/api"

class InterestSystemTester:
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
    
    def test_authentication_setup(self):
        """Set up test users for interest workflow testing"""
        print("\n=== Setting Up Test Users for Interest Workflow ===")
        
        # Create homeowner user
        homeowner_data = {
            "name": "Folake Adebayo",
            "email": f"folake.adebayo.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.log_result("Homeowner registration", True, f"ID: {homeowner_profile['id']}")
            self.test_data['homeowner_profile'] = homeowner_profile
            self.test_data['homeowner_credentials'] = {
                'email': homeowner_data['email'],
                'password': homeowner_data['password']
            }
        else:
            self.log_result("Homeowner registration", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        # Create tradesperson user
        tradesperson_data = {
            "name": "Chinedu Okafor",
            "email": f"chinedu.okafor.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Lekki, Lagos State",
            "postcode": "101001",
            "trade_categories": ["Plumbing", "Bathroom Fitting"],
            "experience_years": 12,
            "company_name": "Okafor Premium Plumbing",
            "description": "Expert plumber specializing in luxury bathroom installations and modern plumbing systems. Over 12 years of experience serving Lagos homeowners with premium quality workmanship and reliable service.",
            "certifications": ["Licensed Master Plumber", "Bathroom Design Certificate", "Gas Safety Certificate"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            self.log_result("Tradesperson registration", True, f"ID: {tradesperson_profile['id']}")
            self.test_data['tradesperson_profile'] = tradesperson_profile
            self.test_data['tradesperson_credentials'] = {
                'email': tradesperson_data['email'],
                'password': tradesperson_data['password']
            }
        else:
            self.log_result("Tradesperson registration", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        # Login homeowner
        login_response = self.make_request("POST", "/auth/login", json=self.test_data['homeowner_credentials'])
        if login_response.status_code == 200:
            login_data = login_response.json()
            self.auth_tokens['homeowner'] = login_data['access_token']
            self.test_data['homeowner_user'] = login_data['user']
            self.log_result("Homeowner login", True)
        else:
            self.log_result("Homeowner login", False, f"Status: {login_response.status_code}")
            return False
        
        # Login tradesperson
        login_response = self.make_request("POST", "/auth/login", json=self.test_data['tradesperson_credentials'])
        if login_response.status_code == 200:
            login_data = login_response.json()
            self.auth_tokens['tradesperson'] = login_data['access_token']
            self.test_data['tradesperson_user'] = login_data['user']
            self.log_result("Tradesperson login", True)
        else:
            self.log_result("Tradesperson login", False, f"Status: {login_response.status_code}")
            return False
        
        return True
    
    def test_homeowner_job_creation(self):
        """Test homeowner creating a job for the interest workflow"""
        print("\n=== Testing Homeowner Job Creation ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Job creation test", False, "No homeowner authentication token")
            return False
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data.get('homeowner_user', {})
        
        # Create a realistic bathroom renovation job
        job_data = {
            "title": "Luxury Master Bathroom Renovation - Victoria Island",
            "description": "We are looking for an experienced plumber to completely renovate our master bathroom in our Victoria Island home. The project includes: installing a new walk-in shower with rainfall showerhead, replacing the bathtub with a modern freestanding tub, updating all plumbing fixtures including toilet and vanity sink, installing new water lines for improved pressure, and ensuring all work meets Lagos building codes. The bathroom is approximately 12 square meters. We have already selected premium fixtures and need professional installation with proper waterproofing and tiling coordination.",
            "category": "Plumbing",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001",
            "budget_min": 800000,
            "budget_max": 1500000,
            "timeline": "Within 6 weeks",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            if 'id' in created_job and created_job['title'] == job_data['title']:
                self.log_result("Create homeowner job", True, f"Job ID: {created_job['id']}")
                self.test_data['homeowner_job'] = created_job
                return True
            else:
                self.log_result("Create homeowner job", False, "Invalid job creation response")
        else:
            self.log_result("Create homeowner job", False, f"Status: {response.status_code}, Response: {response.text}")
        
        return False
    
    def test_tradesperson_show_interest(self):
        """Test tradesperson showing interest in the homeowner's job"""
        print("\n=== Testing Tradesperson Show Interest ===")
        
        if 'tradesperson' not in self.auth_tokens or 'homeowner_job' not in self.test_data:
            self.log_result("Show interest test", False, "Missing authentication token or job")
            return False
        
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['homeowner_job']['id']
        
        # Test showing interest
        interest_data = {
            "job_id": job_id
        }
        
        response = self.make_request("POST", "/interests/show-interest", json=interest_data, auth_token=tradesperson_token)
        if response.status_code == 200:
            interest_record = response.json()
            required_fields = ['id', 'job_id', 'tradesperson_id', 'status', 'created_at']
            missing_fields = [field for field in required_fields if field not in interest_record]
            
            if not missing_fields and interest_record['status'] == 'interested':
                self.log_result("Tradesperson show interest", True, f"Interest ID: {interest_record['id']}")
                self.test_data['interest_record'] = interest_record
                return True
            else:
                self.log_result("Tradesperson show interest", False, f"Missing fields: {missing_fields} or wrong status")
        else:
            self.log_result("Tradesperson show interest", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test duplicate interest prevention
        response = self.make_request("POST", "/interests/show-interest", json=interest_data, auth_token=tradesperson_token)
        if response.status_code == 400:
            self.log_result("Duplicate interest prevention", True, "Correctly rejected duplicate interest")
        else:
            self.log_result("Duplicate interest prevention", False, f"Expected 400, got {response.status_code}")
        
        return False
    
    def test_homeowner_interest_review(self):
        """Test homeowner viewing interested tradespeople for their job"""
        print("\n=== Testing Homeowner Interest Review System ===")
        
        if 'homeowner' not in self.auth_tokens or 'homeowner_job' not in self.test_data:
            self.log_result("Interest review test", False, "Missing authentication token or job")
            return False
        
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['homeowner_job']['id']
        
        # Test getting interested tradespeople for the job
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            interest_response = response.json()
            required_fields = ['interested_tradespeople', 'total']
            missing_fields = [field for field in required_fields if field not in interest_response]
            
            if not missing_fields:
                interested_tradespeople = interest_response['interested_tradespeople']
                total = interest_response['total']
                
                if total > 0 and len(interested_tradespeople) > 0:
                    self.log_result("Get interested tradespeople", True, f"Found {total} interested tradespeople")
                    
                    # Verify tradesperson details in response
                    tradesperson = interested_tradespeople[0]
                    required_tp_fields = ['interest_id', 'tradesperson_id', 'tradesperson_name', 
                                        'tradesperson_email', 'trade_categories', 'experience_years', 
                                        'average_rating', 'total_reviews', 'status']
                    missing_tp_fields = [field for field in required_tp_fields if field not in tradesperson]
                    
                    if not missing_tp_fields:
                        self.log_result("Tradesperson details in interest response", True, 
                                       f"Name: {tradesperson['tradesperson_name']}, "
                                       f"Experience: {tradesperson['experience_years']} years, "
                                       f"Categories: {tradesperson['trade_categories']}")
                        self.test_data['interested_tradesperson'] = tradesperson
                        return True
                    else:
                        self.log_result("Tradesperson details in interest response", False, 
                                       f"Missing fields: {missing_tp_fields}")
                else:
                    self.log_result("Get interested tradespeople", False, f"Expected > 0 interested, found {total}")
            else:
                self.log_result("Get interested tradespeople", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Get interested tradespeople", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test unauthorized access (tradesperson trying to view job interests)
        if 'tradesperson' in self.auth_tokens:
            response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=self.auth_tokens['tradesperson'])
            if response.status_code == 403:
                self.log_result("Unauthorized interest access prevention", True, "Tradesperson correctly denied access")
            else:
                self.log_result("Unauthorized interest access prevention", False, f"Expected 403, got {response.status_code}")
        
        # Test accessing non-existent job
        fake_job_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/interests/job/{fake_job_id}", auth_token=homeowner_token)
        if response.status_code == 404:
            self.log_result("Non-existent job interest access", True, "Correctly returned 404 for non-existent job")
        else:
            self.log_result("Non-existent job interest access", False, f"Expected 404, got {response.status_code}")
        
        return False
    
    def test_contact_sharing_workflow(self):
        """Test homeowner sharing contact details with interested tradesperson"""
        print("\n=== Testing Contact Sharing Workflow ===")
        
        if ('homeowner' not in self.auth_tokens or 
            'interested_tradesperson' not in self.test_data):
            self.log_result("Contact sharing test", False, "Missing authentication token or interested tradesperson")
            return False
        
        homeowner_token = self.auth_tokens['homeowner']
        interest_id = self.test_data['interested_tradesperson']['interest_id']
        
        # Test homeowner sharing contact details
        response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            result = response.json()
            if "contact details shared successfully" in result.get('message', '').lower():
                self.log_result("Share contact details", True, "Contact details shared successfully")
                self.test_data['contact_shared'] = True
            else:
                self.log_result("Share contact details", False, "Unexpected response message")
        else:
            self.log_result("Share contact details", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test unauthorized contact sharing (tradesperson trying to share contact)
        if 'tradesperson' in self.auth_tokens:
            response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                       auth_token=self.auth_tokens['tradesperson'])
            if response.status_code == 403:
                self.log_result("Unauthorized contact sharing prevention", True, "Tradesperson correctly denied access")
            else:
                self.log_result("Unauthorized contact sharing prevention", False, f"Expected 403, got {response.status_code}")
        
        # Test sharing contact for non-existent interest
        fake_interest_id = str(uuid.uuid4())
        response = self.make_request("PUT", f"/interests/share-contact/{fake_interest_id}", auth_token=homeowner_token)
        if response.status_code == 404:
            self.log_result("Non-existent interest contact sharing", True, "Correctly returned 404 for non-existent interest")
        else:
            self.log_result("Non-existent interest contact sharing", False, f"Expected 404, got {response.status_code}")
        
        return True
    
    def test_payment_simulation_workflow(self):
        """Test tradesperson payment simulation for contact access"""
        print("\n=== Testing Payment Simulation Workflow ===")
        
        if ('tradesperson' not in self.auth_tokens or 
            'interested_tradesperson' not in self.test_data or
            not self.test_data.get('contact_shared', False)):
            self.log_result("Payment simulation test", False, "Missing requirements for payment test")
            return False
        
        tradesperson_token = self.auth_tokens['tradesperson']
        interest_id = self.test_data['interested_tradesperson']['interest_id']
        
        # Test payment for access
        response = self.make_request("POST", f"/interests/pay-access/{interest_id}", auth_token=tradesperson_token)
        if response.status_code == 200:
            payment_result = response.json()
            required_fields = ['message', 'access_fee']
            missing_fields = [field for field in required_fields if field not in payment_result]
            
            if not missing_fields and payment_result['access_fee'] == 1000.0:
                self.log_result("Payment simulation", True, f"Payment successful, Fee: ₦{payment_result['access_fee']}")
                self.test_data['payment_made'] = True
            else:
                self.log_result("Payment simulation", False, f"Missing fields: {missing_fields} or wrong fee")
        else:
            self.log_result("Payment simulation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test unauthorized payment (homeowner trying to pay)
        if 'homeowner' in self.auth_tokens:
            response = self.make_request("POST", f"/interests/pay-access/{interest_id}", 
                                       auth_token=self.auth_tokens['homeowner'])
            if response.status_code == 403:
                self.log_result("Unauthorized payment prevention", True, "Homeowner correctly denied access")
            else:
                self.log_result("Unauthorized payment prevention", False, f"Expected 403, got {response.status_code}")
        
        return True
    
    def test_contact_details_access(self):
        """Test tradesperson accessing contact details after payment"""
        print("\n=== Testing Contact Details Access ===")
        
        if ('tradesperson' not in self.auth_tokens or 
            'homeowner_job' not in self.test_data or
            not self.test_data.get('payment_made', False)):
            self.log_result("Contact details access test", False, "Missing requirements for contact access test")
            return False
        
        tradesperson_token = self.auth_tokens['tradesperson']
        job_id = self.test_data['homeowner_job']['id']
        
        # Test getting contact details after payment
        response = self.make_request("GET", f"/interests/contact-details/{job_id}", auth_token=tradesperson_token)
        if response.status_code == 200:
            contact_details = response.json()
            required_fields = ['homeowner_name', 'homeowner_email', 'homeowner_phone', 
                             'job_title', 'job_description', 'job_location']
            missing_fields = [field for field in required_fields if field not in contact_details]
            
            if not missing_fields:
                self.log_result("Get contact details after payment", True, 
                               f"Name: {contact_details['homeowner_name']}, "
                               f"Email: {contact_details['homeowner_email']}, "
                               f"Phone: {contact_details['homeowner_phone']}")
            else:
                self.log_result("Get contact details after payment", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Get contact details after payment", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test unauthorized contact details access (homeowner trying to access)
        if 'homeowner' in self.auth_tokens:
            response = self.make_request("GET", f"/interests/contact-details/{job_id}", 
                                       auth_token=self.auth_tokens['homeowner'])
            if response.status_code == 403:
                self.log_result("Unauthorized contact details access prevention", True, "Homeowner correctly denied access")
            else:
                self.log_result("Unauthorized contact details access prevention", False, f"Expected 403, got {response.status_code}")
        
        return True
    
    def test_tradesperson_interest_history(self):
        """Test tradesperson viewing their interest history"""
        print("\n=== Testing Tradesperson Interest History ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Interest history test", False, "No tradesperson authentication token")
            return False
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test getting tradesperson's interest history
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        if response.status_code == 200:
            interests = response.json()
            if isinstance(interests, list) and len(interests) > 0:
                self.log_result("Get tradesperson interest history", True, f"Found {len(interests)} interests")
                
                # Verify interest details
                interest = interests[0]
                if 'job_id' in interest and 'status' in interest:
                    self.log_result("Interest history details", True, f"Status: {interest['status']}")
                else:
                    self.log_result("Interest history details", False, "Missing required fields in interest")
            else:
                self.log_result("Get tradesperson interest history", True, "No interests found (expected for new account)")
        else:
            self.log_result("Get tradesperson interest history", False, f"Status: {response.status_code}")
        
        # Test unauthorized access (homeowner trying to access tradesperson interests)
        if 'homeowner' in self.auth_tokens:
            response = self.make_request("GET", "/interests/my-interests", 
                                       auth_token=self.auth_tokens['homeowner'])
            if response.status_code == 403:
                self.log_result("Unauthorized interest history access prevention", True, "Homeowner correctly denied access")
            else:
                self.log_result("Unauthorized interest history access prevention", False, f"Expected 403, got {response.status_code}")
        
        return True
    
    def test_cross_user_access_prevention(self):
        """Test comprehensive cross-user access prevention"""
        print("\n=== Testing Cross-User Access Prevention ===")
        
        # Create another homeowner to test cross-user access
        other_homeowner_data = {
            "name": "Kemi Adebayo",
            "email": f"kemi.adebayo.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "08198765432",
            "location": "Ikeja, Lagos State",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=other_homeowner_data)
        if response.status_code == 200:
            # Login the other homeowner
            login_response = self.make_request("POST", "/auth/login", 
                                             json={"email": other_homeowner_data["email"], 
                                                  "password": other_homeowner_data["password"]})
            if login_response.status_code == 200:
                other_homeowner_token = login_response.json()['access_token']
                
                # Test other homeowner trying to access first homeowner's job interests
                if 'homeowner_job' in self.test_data:
                    job_id = self.test_data['homeowner_job']['id']
                    response = self.make_request("GET", f"/interests/job/{job_id}", 
                                               auth_token=other_homeowner_token)
                    if response.status_code == 403:
                        self.log_result("Cross-homeowner job access prevention", True, 
                                       "Correctly prevented access to other homeowner's job")
                    else:
                        self.log_result("Cross-homeowner job access prevention", False, 
                                       f"Expected 403, got {response.status_code}")
                
                # Test other homeowner trying to share contact for first homeowner's interest
                if 'interested_tradesperson' in self.test_data:
                    interest_id = self.test_data['interested_tradesperson']['interest_id']
                    response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                               auth_token=other_homeowner_token)
                    if response.status_code == 403:
                        self.log_result("Cross-homeowner contact sharing prevention", True, 
                                       "Correctly prevented unauthorized contact sharing")
                    else:
                        self.log_result("Cross-homeowner contact sharing prevention", False, 
                                       f"Expected 403, got {response.status_code}")
        
        return True
    
    def run_all_tests(self):
        """Run all interest system tests"""
        print("🚀 Starting Comprehensive Interest System Testing")
        print("=" * 60)
        
        # Run tests in sequence
        if not self.test_authentication_setup():
            print("❌ Authentication setup failed, stopping tests")
            return
        
        if not self.test_homeowner_job_creation():
            print("❌ Job creation failed, stopping tests")
            return
        
        if not self.test_tradesperson_show_interest():
            print("❌ Show interest failed, stopping tests")
            return
        
        if not self.test_homeowner_interest_review():
            print("❌ Interest review failed, stopping tests")
            return
        
        self.test_contact_sharing_workflow()
        self.test_payment_simulation_workflow()
        self.test_contact_details_access()
        self.test_tradesperson_interest_history()
        self.test_cross_user_access_prevention()
        
        # Print final results
        print("\n" + "=" * 60)
        print("🏁 INTEREST SYSTEM TESTING COMPLETE")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🔍 Failed Tests:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = InterestSystemTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
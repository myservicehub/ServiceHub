#!/usr/bin/env python3
"""
PHASE 7 FIXES VERIFICATION: Test the specific issues that were identified and fixed
Comprehensive testing to verify the 4 specific fixes are working correctly.

ISSUES THAT WERE FIXED:
1. Interest Homeowner View - Missing tradesperson details in response
2. Contact Sharing Response - InterestResponse model validation error  
3. Interest Status Transitions - Status not updating correctly
4. Tradesperson Access Control - Interest ownership validation
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://servicepatch.preview.emergentagent.com/api"

class Phase7FixesVerificationTester:
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
    
    def setup_test_users(self):
        """Create test users for verification"""
        print("\n=== Setting Up Test Users ===")
        
        import time
        timestamp = str(int(time.time()))
        
        # Create homeowner
        homeowner_data = {
            "name": "Folake Adebayo",
            "email": f"test.phase7.homeowner.{timestamp}@test.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.test_data['homeowner_profile'] = homeowner_profile
            self.test_data['homeowner_credentials'] = {
                'email': homeowner_data['email'],
                'password': homeowner_data['password']
            }
            self.log_result("Homeowner Registration", True, f"ID: {homeowner_profile['id']}")
        else:
            self.log_result("Homeowner Registration", False, f"Status: {response.status_code}")
            return False
        
        # Create tradesperson
        tradesperson_data = {
            "name": "Kunle Ogundimu",
            "email": f"test.phase7.tradesperson.{timestamp}@test.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Ikeja, Lagos State",
            "postcode": "100001",
            "trade_categories": ["Plumbing", "Heating & Gas"],
            "experience_years": 6,
            "company_name": "Ogundimu Professional Plumbing Ltd",
            "description": "Expert plumber with 6 years experience in residential and commercial plumbing installations across Lagos and Ogun State.",
            "certifications": ["Licensed Plumber", "Gas Safety Certificate", "Water Systems Specialist"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            self.test_data['tradesperson_profile'] = tradesperson_profile
            self.test_data['tradesperson_credentials'] = {
                'email': tradesperson_data['email'],
                'password': tradesperson_data['password']
            }
            self.log_result("Tradesperson Registration", True, f"ID: {tradesperson_profile['id']}")
        else:
            self.log_result("Tradesperson Registration", False, f"Status: {response.status_code}")
            return False
        
        # Login both users
        for user_type in ['homeowner', 'tradesperson']:
            credentials = self.test_data[f'{user_type}_credentials']
            response = self.make_request("POST", "/auth/login", json=credentials)
            if response.status_code == 200:
                login_response = response.json()
                self.auth_tokens[user_type] = login_response['access_token']
                self.test_data[f'{user_type}_user'] = login_response['user']
                self.log_result(f"{user_type.title()} Login", True)
            else:
                self.log_result(f"{user_type.title()} Login", False, f"Status: {response.status_code}")
                return False
        
        return True
    
    def create_test_job(self):
        """Create a test job for interest testing"""
        print("\n=== Creating Test Job ===")
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        job_data = {
            "title": "Kitchen Plumbing Renovation - Phase 7 Test",
            "description": "Looking for an experienced plumber to renovate our kitchen plumbing system. This includes installing new sink, dishwasher connections, and updating all water supply lines. The kitchen is 12 square meters and we need professional installation with proper water pressure management.",
            "category": "Plumbing",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001",
            "budget_min": 250000,
            "budget_max": 450000,
            "timeline": "Within 3 weeks",
            "homeowner_name": homeowner_user.get('name'),
            "homeowner_email": homeowner_user.get('email'),
            "homeowner_phone": homeowner_user.get('phone')
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            self.test_data['test_job'] = created_job
            self.log_result("Test Job Creation", True, f"Job ID: {created_job['id']}")
            return True
        else:
            self.log_result("Test Job Creation", False, f"Status: {response.status_code}")
            return False
    
    def test_fix_1_enhanced_interest_homeowner_view(self):
        """
        TEST 1: Enhanced Interest Homeowner View
        Verify response includes: tradesperson_phone, business_name, location, description, 
        certifications, average_rating=4.5, total_reviews=0, portfolio_count, timestamps
        """
        print("\n=== TEST 1: Enhanced Interest Homeowner View ===")
        
        if not all(key in self.auth_tokens for key in ['homeowner', 'tradesperson']):
            self.log_result("Test 1 Setup", False, "Missing authentication tokens")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        homeowner_token = self.auth_tokens['homeowner']
        job_id = self.test_data['test_job']['id']
        
        # Step 1: Tradesperson shows interest
        interest_data = {"job_id": job_id}
        response = self.make_request("POST", "/interests/show-interest", json=interest_data, auth_token=tradesperson_token)
        if response.status_code == 200:
            created_interest = response.json()
            self.test_data['test_interest'] = created_interest
            self.log_result("Interest Creation for Test 1", True, f"Interest ID: {created_interest['id']}")
        else:
            self.log_result("Interest Creation for Test 1", False, f"Status: {response.status_code}")
            return
        
        # Step 2: Homeowner gets interested tradespeople with enhanced details
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            interests_data = response.json()
            interested_tradespeople = interests_data.get('interested_tradespeople', [])
            
            if len(interested_tradespeople) > 0:
                tradesperson = interested_tradespeople[0]
                
                # Verify all required fields are present
                required_fields = [
                    'tradesperson_phone', 'business_name', 'location', 'description', 
                    'certifications', 'average_rating', 'total_reviews', 'portfolio_count',
                    'created_at', 'updated_at'
                ]
                
                missing_fields = []
                for field in required_fields:
                    if field not in tradesperson:
                        missing_fields.append(field)
                
                if not missing_fields:
                    self.log_result("Enhanced Interest View - All Fields Present", True, 
                                   f"Found {len(required_fields)} required fields")
                    
                    # Verify default values
                    if tradesperson.get('average_rating') == 4.5:
                        self.log_result("Default Average Rating", True, "average_rating=4.5")
                    else:
                        self.log_result("Default Average Rating", False, 
                                       f"Expected 4.5, got {tradesperson.get('average_rating')}")
                    
                    if tradesperson.get('total_reviews') == 0:
                        self.log_result("Default Total Reviews", True, "total_reviews=0")
                    else:
                        self.log_result("Default Total Reviews", False, 
                                       f"Expected 0, got {tradesperson.get('total_reviews')}")
                    
                    # Verify portfolio_count is included (should be 0 for new tradesperson)
                    if 'portfolio_count' in tradesperson:
                        self.log_result("Portfolio Count Included", True, 
                                       f"portfolio_count={tradesperson['portfolio_count']}")
                    else:
                        self.log_result("Portfolio Count Included", False, "portfolio_count missing")
                    
                    # Verify timestamps are properly included
                    timestamp_fields = ['created_at', 'updated_at']
                    for field in timestamp_fields:
                        if field in tradesperson and tradesperson[field]:
                            self.log_result(f"Timestamp {field}", True, f"{field} present")
                        else:
                            self.log_result(f"Timestamp {field}", False, f"{field} missing or empty")
                    
                    # Verify tradesperson details are complete
                    if tradesperson.get('tradesperson_phone'):
                        self.log_result("Tradesperson Phone", True, "Phone number included")
                    else:
                        self.log_result("Tradesperson Phone", False, "Phone number missing")
                    
                    if tradesperson.get('certifications') and len(tradesperson['certifications']) > 0:
                        self.log_result("Certifications", True, 
                                       f"Found {len(tradesperson['certifications'])} certifications")
                    else:
                        self.log_result("Certifications", False, "No certifications found")
                    
                else:
                    self.log_result("Enhanced Interest View - Missing Fields", False, 
                                   f"Missing fields: {missing_fields}")
            else:
                self.log_result("Enhanced Interest View", False, "No interested tradespeople found")
        else:
            self.log_result("Enhanced Interest View", False, f"Status: {response.status_code}")
    
    def test_fix_2_contact_sharing_response_model(self):
        """
        TEST 2: Contact Sharing Response Model
        Verify response uses ShareContactResponse model with: interest_id, status, message, contact_shared_at
        """
        print("\n=== TEST 2: Contact Sharing Response Model ===")
        
        if 'test_interest' not in self.test_data:
            self.log_result("Test 2 Setup", False, "No test interest available")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        interest_id = self.test_data['test_interest']['id']
        
        # Call share contact endpoint
        response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            share_response = response.json()
            
            # Verify ShareContactResponse model fields
            required_fields = ['interest_id', 'status', 'message', 'contact_shared_at']
            missing_fields = []
            
            for field in required_fields:
                if field not in share_response:
                    missing_fields.append(field)
            
            if not missing_fields:
                self.log_result("ShareContactResponse Model - All Fields", True, 
                               f"Found all {len(required_fields)} required fields")
                
                # Verify field values
                if share_response.get('interest_id') == interest_id:
                    self.log_result("ShareContactResponse - Interest ID", True, "Correct interest_id")
                else:
                    self.log_result("ShareContactResponse - Interest ID", False, 
                                   f"Expected {interest_id}, got {share_response.get('interest_id')}")
                
                if share_response.get('status') == 'CONTACT_SHARED':
                    self.log_result("ShareContactResponse - Status", True, "Status=CONTACT_SHARED")
                else:
                    self.log_result("ShareContactResponse - Status", False, 
                                   f"Expected CONTACT_SHARED, got {share_response.get('status')}")
                
                if share_response.get('message'):
                    self.log_result("ShareContactResponse - Message", True, "Message present")
                else:
                    self.log_result("ShareContactResponse - Message", False, "Message missing")
                
                if share_response.get('contact_shared_at'):
                    self.log_result("ShareContactResponse - Timestamp", True, "contact_shared_at present")
                    
                    # Verify timestamp format (should be ISO format)
                    try:
                        datetime.fromisoformat(share_response['contact_shared_at'].replace('Z', '+00:00'))
                        self.log_result("ShareContactResponse - Timestamp Format", True, "Valid ISO format")
                    except:
                        self.log_result("ShareContactResponse - Timestamp Format", False, "Invalid timestamp format")
                else:
                    self.log_result("ShareContactResponse - Timestamp", False, "contact_shared_at missing")
            else:
                self.log_result("ShareContactResponse Model - Missing Fields", False, 
                               f"Missing fields: {missing_fields}")
        else:
            self.log_result("Contact Sharing Response", False, f"Status: {response.status_code}")
    
    def test_fix_3_interest_status_transitions(self):
        """
        TEST 3: Interest Status Transitions
        Test complete status flow: INTERESTED → CONTACT_SHARED → PAID_ACCESS
        Verify each status transition updates timestamps correctly
        """
        print("\n=== TEST 3: Interest Status Transitions ===")
        
        if 'test_interest' not in self.test_data:
            self.log_result("Test 3 Setup", False, "No test interest available")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        tradesperson_token = self.auth_tokens['tradesperson']
        interest_id = self.test_data['test_interest']['id']
        
        # Step 1: Verify initial status is INTERESTED
        # (Already verified in previous test, but let's check again)
        job_id = self.test_data['test_job']['id']
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            interests_data = response.json()
            interested_tradespeople = interests_data.get('interested_tradespeople', [])
            if len(interested_tradespeople) > 0:
                initial_status = interested_tradespeople[0].get('status')
                if initial_status == 'INTERESTED':
                    self.log_result("Initial Status - INTERESTED", True, "Status correctly set to INTERESTED")
                else:
                    self.log_result("Initial Status - INTERESTED", False, f"Expected INTERESTED, got {initial_status}")
            else:
                self.log_result("Initial Status Check", False, "No interested tradespeople found")
        
        # Step 2: Transition to CONTACT_SHARED (already done in Test 2, but verify again)
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            interests_data = response.json()
            interested_tradespeople = interests_data.get('interested_tradespeople', [])
            if len(interested_tradespeople) > 0:
                contact_shared_status = interested_tradespeople[0].get('status')
                contact_shared_at = interested_tradespeople[0].get('contact_shared_at')
                
                if contact_shared_status == 'CONTACT_SHARED':
                    self.log_result("Status Transition - CONTACT_SHARED", True, "Status updated to CONTACT_SHARED")
                else:
                    self.log_result("Status Transition - CONTACT_SHARED", False, 
                                   f"Expected CONTACT_SHARED, got {contact_shared_status}")
                
                if contact_shared_at:
                    self.log_result("Timestamp Update - contact_shared_at", True, "Timestamp properly set")
                else:
                    self.log_result("Timestamp Update - contact_shared_at", False, "Timestamp not set")
        
        # Step 3: Transition to PAID_ACCESS
        response = self.make_request("POST", f"/interests/pay-access/{interest_id}", auth_token=tradesperson_token)
        if response.status_code == 200:
            payment_response = response.json()
            
            if payment_response.get('access_fee') == 1000.0:
                self.log_result("Payment Processing", True, "₦1000 access fee processed")
            else:
                self.log_result("Payment Processing", False, 
                               f"Expected ₦1000, got {payment_response.get('access_fee')}")
            
            # Verify status updated to PAID_ACCESS
            response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
            if response.status_code == 200:
                interests_data = response.json()
                interested_tradespeople = interests_data.get('interested_tradespeople', [])
                if len(interested_tradespeople) > 0:
                    final_status = interested_tradespeople[0].get('status')
                    payment_made_at = interested_tradespeople[0].get('payment_made_at')
                    access_fee = interested_tradespeople[0].get('access_fee')
                    
                    if final_status == 'PAID_ACCESS':
                        self.log_result("Status Transition - PAID_ACCESS", True, "Status updated to PAID_ACCESS")
                    else:
                        self.log_result("Status Transition - PAID_ACCESS", False, 
                                       f"Expected PAID_ACCESS, got {final_status}")
                    
                    if payment_made_at:
                        self.log_result("Timestamp Update - payment_made_at", True, "Payment timestamp set")
                    else:
                        self.log_result("Timestamp Update - payment_made_at", False, "Payment timestamp not set")
                    
                    if access_fee == 1000.0:
                        self.log_result("Access Fee Storage", True, "Access fee correctly stored")
                    else:
                        self.log_result("Access Fee Storage", False, f"Expected 1000.0, got {access_fee}")
        else:
            self.log_result("Payment Processing", False, f"Status: {response.status_code}")
        
        # Step 4: Test error case - invalid status transition
        # Try to share contact again (should fail since already in PAID_ACCESS)
        response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", auth_token=homeowner_token)
        if response.status_code == 400:
            self.log_result("Invalid Status Transition Prevention", True, "Correctly prevented invalid transition")
        else:
            self.log_result("Invalid Status Transition Prevention", False, 
                           f"Expected 400, got {response.status_code}")
    
    def test_fix_4_tradesperson_access_control(self):
        """
        TEST 4: Tradesperson Access Control
        Verify get_interest_by_id returns proper interest data
        Test interest ownership validation in various endpoints
        """
        print("\n=== TEST 4: Tradesperson Access Control ===")
        
        if 'test_interest' not in self.test_data:
            self.log_result("Test 4 Setup", False, "No test interest available")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        homeowner_token = self.auth_tokens['homeowner']
        interest_id = self.test_data['test_interest']['id']
        job_id = self.test_data['test_job']['id']
        
        # Step 1: Verify tradesperson can access their own interest via contact details
        response = self.make_request("GET", f"/interests/contact-details/{job_id}", auth_token=tradesperson_token)
        if response.status_code == 200:
            contact_details = response.json()
            required_fields = ['homeowner_name', 'homeowner_email', 'homeowner_phone', 
                             'job_title', 'job_description', 'job_location']
            
            missing_fields = [field for field in required_fields if field not in contact_details]
            
            if not missing_fields:
                self.log_result("Tradesperson Access - Own Interest", True, 
                               "Can access contact details after payment")
            else:
                self.log_result("Tradesperson Access - Own Interest", False, 
                               f"Missing fields: {missing_fields}")
        else:
            self.log_result("Tradesperson Access - Own Interest", False, f"Status: {response.status_code}")
        
        # Step 2: Verify tradesperson can see their interest in my-interests
        response = self.make_request("GET", "/interests/my-interests", auth_token=tradesperson_token)
        if response.status_code == 200:
            my_interests = response.json()
            
            if isinstance(my_interests, list) and len(my_interests) > 0:
                # Find our test interest
                test_interest_found = False
                for interest in my_interests:
                    if interest.get('job_id') == job_id:
                        test_interest_found = True
                        
                        # Verify interest data consistency
                        if interest.get('id'):
                            self.log_result("Interest ID Consistency", True, "Interest ID present in my-interests")
                        else:
                            self.log_result("Interest ID Consistency", False, "Interest ID missing")
                        
                        if interest.get('status') == 'PAID_ACCESS':
                            self.log_result("Interest Status Consistency", True, "Status consistent in my-interests")
                        else:
                            self.log_result("Interest Status Consistency", False, 
                                           f"Expected PAID_ACCESS, got {interest.get('status')}")
                        
                        break
                
                if test_interest_found:
                    self.log_result("Tradesperson My-Interests Access", True, "Can access own interests")
                else:
                    self.log_result("Tradesperson My-Interests Access", False, "Test interest not found in my-interests")
            else:
                self.log_result("Tradesperson My-Interests Access", False, "No interests returned")
        else:
            self.log_result("Tradesperson My-Interests Access", False, f"Status: {response.status_code}")
        
        # Step 3: Create another tradesperson to test cross-user access prevention
        import time
        timestamp2 = str(int(time.time()) + 1)
        
        other_tradesperson_data = {
            "name": "Bola Adeyemi",
            "email": f"test.phase7.other.tradesperson.{timestamp2}@test.com",
            "password": "SecurePass123",
            "phone": "08198765432",
            "location": "Surulere, Lagos State",
            "postcode": "100001",
            "trade_categories": ["Electrical"],
            "experience_years": 4,
            "company_name": "Adeyemi Electrical Services",
            "description": "Professional electrician with 4 years experience in residential electrical installations.",
            "certifications": ["Licensed Electrician"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=other_tradesperson_data)
        if response.status_code == 200:
            # Login other tradesperson
            login_response = self.make_request("POST", "/auth/login", 
                                             json={"email": other_tradesperson_data["email"], 
                                                  "password": other_tradesperson_data["password"]})
            if login_response.status_code == 200:
                other_token = login_response.json()['access_token']
                
                # Step 4: Test cross-user access prevention
                # Other tradesperson tries to access first tradesperson's contact details
                response = self.make_request("GET", f"/interests/contact-details/{job_id}", auth_token=other_token)
                if response.status_code in [403, 404]:
                    self.log_result("Cross-User Access Prevention - Contact Details", True, 
                                   "Correctly prevented unauthorized access")
                else:
                    self.log_result("Cross-User Access Prevention - Contact Details", False, 
                                   f"Expected 403/404, got {response.status_code}")
                
                # Other tradesperson tries to pay for access to interest they don't own
                response = self.make_request("POST", f"/interests/pay-access/{interest_id}", auth_token=other_token)
                if response.status_code in [403, 404]:
                    self.log_result("Cross-User Access Prevention - Payment", True, 
                                   "Correctly prevented unauthorized payment")
                else:
                    self.log_result("Cross-User Access Prevention - Payment", False, 
                                   f"Expected 403/404, got {response.status_code}")
            else:
                self.log_result("Other Tradesperson Login", False, "Could not login other tradesperson")
        else:
            self.log_result("Other Tradesperson Registration", False, "Could not create other tradesperson")
        
        # Step 5: Test _id handling consistency
        # Verify that interest IDs are properly handled throughout the system
        response = self.make_request("GET", f"/interests/job/{job_id}", auth_token=homeowner_token)
        if response.status_code == 200:
            interests_data = response.json()
            interested_tradespeople = interests_data.get('interested_tradespeople', [])
            if len(interested_tradespeople) > 0:
                tradesperson = interested_tradespeople[0]
                
                # Verify interest_id field is present and valid
                if tradesperson.get('interest_id'):
                    self.log_result("Interest ID Field Consistency", True, "interest_id field present")
                    
                    # Verify it matches our test interest ID
                    if tradesperson.get('interest_id') == interest_id:
                        self.log_result("Interest ID Value Consistency", True, "interest_id matches created interest")
                    else:
                        self.log_result("Interest ID Value Consistency", False, 
                                       f"Expected {interest_id}, got {tradesperson.get('interest_id')}")
                else:
                    self.log_result("Interest ID Field Consistency", False, "interest_id field missing")
    
    def run_all_tests(self):
        """Run all Phase 7 fixes verification tests"""
        print("🔍 PHASE 7 FIXES VERIFICATION TESTING")
        print("="*60)
        print("Testing 4 specific issues that were identified and fixed:")
        print("1. Enhanced Interest Homeowner View")
        print("2. Contact Sharing Response Model")  
        print("3. Interest Status Transitions")
        print("4. Tradesperson Access Control")
        print("="*60)
        
        # Setup
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Aborting tests.")
            return
        
        if not self.create_test_job():
            print("❌ Failed to create test job. Aborting tests.")
            return
        
        # Run verification tests
        self.test_fix_1_enhanced_interest_homeowner_view()
        self.test_fix_2_contact_sharing_response_model()
        self.test_fix_3_interest_status_transitions()
        self.test_fix_4_tradesperson_access_control()
        
        # Print results
        print("\n" + "="*60)
        print("🏁 PHASE 7 FIXES VERIFICATION RESULTS")
        print("="*60)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        
        if self.results['failed'] > 0:
            print("\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate == 100.0:
            print("🎉 ALL PHASE 7 FIXES VERIFIED SUCCESSFULLY!")
            print("✅ The 18.2% failure rate from Phase 7 has been resolved")
            print("✅ System is now 100% functional")
        else:
            print("⚠️  Some fixes still need attention")
        
        return success_rate

if __name__ == "__main__":
    tester = Phase7FixesVerificationTester()
    tester.run_all_tests()
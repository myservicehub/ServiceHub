#!/usr/bin/env python3
"""
Test Access Fee System Changes
Test the removal of minimum access fee restrictions and new flexible system
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://tradesman-connect.preview.emergentagent.com/api"

class AccessFeeSystemTester:
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
    
    def setup_test_users(self):
        """Setup test users for access fee testing"""
        print("\n=== Setting Up Test Users ===")
        
        # Create homeowner
        homeowner_data = {
            "name": "Test Homeowner",
            "email": f"homeowner.{uuid.uuid4().hex[:8]}@test.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.auth_tokens['homeowner'] = homeowner_profile['access_token']
            self.test_data['homeowner_user'] = homeowner_profile['user']
            self.log_result("Homeowner setup", True, f"ID: {homeowner_profile['user']['id']}")
        else:
            self.log_result("Homeowner setup", False, f"Status: {response.status_code}")
            return False
        
        # Create tradesperson
        tradesperson_data = {
            "name": "Test Tradesperson",
            "email": f"tradesperson.{uuid.uuid4().hex[:8]}@test.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing"],
            "experience_years": 5,
            "company_name": "Test Plumbing Co",
            "description": "Professional plumber with extensive experience in residential and commercial plumbing installations, repairs, and maintenance services across Lagos and surrounding areas.",
            "certifications": ["Licensed Plumber"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            # Login tradesperson
            login_response = self.make_request("POST", "/auth/login", 
                                             json={"email": tradesperson_data["email"], 
                                                  "password": tradesperson_data["password"]})
            if login_response.status_code == 200:
                self.auth_tokens['tradesperson'] = login_response.json()['access_token']
                self.test_data['tradesperson_user'] = login_response.json()['user']
                self.log_result("Tradesperson setup", True, f"ID: {tradesperson_profile['id']}")
            else:
                self.log_result("Tradesperson setup", False, "Login failed")
                return False
        else:
            self.log_result("Tradesperson setup", False, f"Status: {response.status_code}")
            return False
        
        return True
    
    def test_new_job_default_access_fee(self):
        """Test that new jobs are created with default ₦1000 (10 coins)"""
        print("\n=== Testing New Job Default Access Fee ===")
        
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data['homeowner_user']
        
        job_data = {
            "title": "Test Job for Access Fee Verification",
            "description": "Testing that new jobs have default ₦1000 access fee instead of ₦1500",
            "category": "Plumbing",
            "location": "Lagos",
            "postcode": "100001",
            "state": "Lagos",
            "lga": "Lagos Island",
            "town": "Victoria Island",
            "zip_code": "100001",
            "home_address": "123 Test Street, Victoria Island, Lagos State, Nigeria",
            "budget_min": 100000,
            "budget_max": 200000,
            "timeline": "Within 2 weeks",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            created_job = response.json()
            access_fee_naira = created_job.get('access_fee_naira', 0)
            access_fee_coins = created_job.get('access_fee_coins', 0)
            
            print(f"DEBUG: Created job response: {json.dumps(created_job, indent=2, default=str)}")
            
            if access_fee_naira == 1000 and access_fee_coins == 10:
                self.log_result("New Job Default Access Fee ₦1000 (10 coins)", True, 
                               f"Correct default: ₦{access_fee_naira} ({access_fee_coins} coins)")
                self.test_data['test_job'] = created_job
            else:
                self.log_result("New Job Default Access Fee ₦1000 (10 coins)", False, 
                               f"Expected ₦1000 (10 coins), got ₦{access_fee_naira} ({access_fee_coins} coins)")
                # Still store the job for other tests
                self.test_data['test_job'] = created_job
        else:
            self.log_result("New Job Default Access Fee ₦1000 (10 coins)", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_flexible_access_fees(self):
        """Test that admin can set access fees to various amounts"""
        print("\n=== Testing Admin Flexible Access Fee Updates ===")
        
        if 'test_job' not in self.test_data:
            self.log_result("Admin Flexible Access Fees", False, "No test job available")
            return
        
        job_id = self.test_data['test_job']['id']
        
        # Test various access fee amounts
        test_amounts = [500, 100, 2000, 750, 5000]
        
        for amount in test_amounts:
            response = self.make_request("PUT", f"/admin/jobs/{job_id}/access-fee", 
                                       data={"access_fee_naira": amount})
            if response.status_code == 200:
                result = response.json()
                if result.get('new_access_fee_naira') == amount:
                    self.log_result(f"Admin Set Access Fee ₦{amount}", True, 
                                   f"Successfully updated to ₦{amount} ({amount//100} coins)")
                else:
                    self.log_result(f"Admin Set Access Fee ₦{amount}", False, 
                                   f"Expected ₦{amount}, got ₦{result.get('new_access_fee_naira')}")
            else:
                self.log_result(f"Admin Set Access Fee ₦{amount}", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
        
        # Test that access fees below ₦1 are rejected
        response = self.make_request("PUT", f"/admin/jobs/{job_id}/access-fee", 
                                   data={"access_fee_naira": 0})
        if response.status_code == 400:
            self.log_result("Reject Access Fee ₦0", True, "Correctly rejected zero amount")
        else:
            self.log_result("Reject Access Fee ₦0", False, 
                           f"Expected 400, got {response.status_code}")
        
        # Test negative amount rejection
        response = self.make_request("PUT", f"/admin/jobs/{job_id}/access-fee", 
                                   data={"access_fee_naira": -100})
        if response.status_code == 400:
            self.log_result("Reject Negative Access Fee", True, "Correctly rejected negative amount")
        else:
            self.log_result("Reject Negative Access Fee", False, 
                           f"Expected 400, got {response.status_code}")
    
    def test_wallet_funding_lower_minimum(self):
        """Test that wallet funding now accepts smaller amounts (₦100 minimum)"""
        print("\n=== Testing Wallet Funding Lower Minimum ===")
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Create a small test image for payment proof
        import io
        from PIL import Image
        
        test_image = Image.new('RGB', (100, 100), color='blue')
        img_buffer = io.BytesIO()
        test_image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        # Test funding with ₦100 (should be accepted if minimum was lowered)
        files = {'proof_image': ('payment_proof.jpg', img_buffer, 'image/jpeg')}
        data = {'amount_naira': 100}
        
        response = self.session.post(
            f"{self.base_url}/wallet/fund",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {tradesperson_token}'}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('amount_naira') == 100:
                self.log_result("Wallet Funding ₦100 Minimum", True, 
                               "Successfully accepted ₦100 funding request")
            else:
                self.log_result("Wallet Funding ₦100 Minimum", False, 
                               f"Expected ₦100, got ₦{result.get('amount_naira')}")
        elif response.status_code == 400 and "minimum" in response.text.lower():
            self.log_result("Wallet Funding ₦100 Minimum", False, 
                           f"Still has minimum restriction: {response.text}")
        else:
            self.log_result("Wallet Funding ₦100 Minimum", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
    
    def test_withdrawal_eligibility_5_coins(self):
        """Test that withdrawal eligibility is now 5 coins instead of 15"""
        print("\n=== Testing Withdrawal Eligibility 5 Coins ===")
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Check withdrawal eligibility
        response = self.make_request("GET", "/referrals/withdrawal-eligibility", 
                                   auth_token=tradesperson_token)
        if response.status_code == 200:
            eligibility = response.json()
            minimum_required = eligibility.get('minimum_required', 0)
            
            if minimum_required == 5:
                self.log_result("Withdrawal Eligibility 5 Coins", True, 
                               f"Correct minimum: {minimum_required} coins")
                
                # Check the message content
                message = eligibility.get('message', '')
                if '5 coins' in message:
                    self.log_result("Withdrawal Message Updated", True, 
                                   "Message correctly mentions 5 coins")
                else:
                    self.log_result("Withdrawal Message Updated", False, 
                                   f"Message still mentions old requirement: {message}")
            else:
                self.log_result("Withdrawal Eligibility 5 Coins", False, 
                               f"Expected 5 coins, got {minimum_required} coins")
        else:
            self.log_result("Withdrawal Eligibility 5 Coins", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
    
    def run_access_fee_tests(self):
        """Run all access fee system tests"""
        print("🚀 Starting Access Fee System Testing")
        print("="*80)
        
        # Setup test users
        if not self.setup_test_users():
            print("❌ Failed to setup test users")
            return
        
        # Run tests
        self.test_new_job_default_access_fee()
        self.test_admin_flexible_access_fees()
        self.test_wallet_funding_lower_minimum()
        self.test_withdrawal_eligibility_5_coins()
        
        # Print results
        print("\n" + "="*80)
        print("🏁 ACCESS FEE SYSTEM TESTING COMPLETE")
        print("="*80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🔍 Failed Tests:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100 if (self.results['passed'] + self.results['failed']) > 0 else 0
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = AccessFeeSystemTester()
    tester.run_access_fee_tests()
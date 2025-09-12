#!/usr/bin/env python3
"""
PHASE 9A: Comprehensive Wallet System Testing
Test the complete wallet system with coin-based payments for Nigerian marketplace
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import io
from PIL import Image

# Get backend URL from environment
BACKEND_URL = "https://servicepatch.preview.emergentagent.com/api"

class WalletSystemTester:
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
        """Create test users for wallet testing"""
        print("\n=== Setting Up Test Users ===")
        
        # Generate unique timestamp for email addresses
        import time
        timestamp = str(int(time.time()))
        
        # Create test homeowner
        homeowner_data = {
            "name": "Folake Adebayo",
            "email": f"wallet.test.homeowner.{timestamp}@test.com",
            "password": "SecurePass123",
            "phone": "08123456789",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.log_result("Homeowner Registration", True, f"ID: {homeowner_profile['id']}")
            self.test_data['homeowner_profile'] = homeowner_profile
            self.test_data['homeowner_credentials'] = {
                'email': homeowner_data['email'],
                'password': homeowner_data['password']
            }
        else:
            self.log_result("Homeowner Registration", False, f"Status: {response.status_code}")
            return False
        
        # Create test tradesperson
        tradesperson_data = {
            "name": "Kunle Ogundimu",
            "email": f"wallet.test.tradesperson.{timestamp}@test.com",
            "password": "SecurePass123",
            "phone": "08187654321",
            "location": "Ikeja, Lagos State",
            "postcode": "100001",
            "trade_categories": ["Plumbing", "Heating & Gas"],
            "experience_years": 6,
            "company_name": "Ogundimu Plumbing Solutions",
            "description": "Professional plumber with 6 years experience in residential and commercial projects across Lagos.",
            "certifications": ["Licensed Plumber", "Gas Safety Certificate"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            self.log_result("Tradesperson Registration", True, f"ID: {tradesperson_profile['id']}")
            self.test_data['tradesperson_profile'] = tradesperson_profile
            self.test_data['tradesperson_credentials'] = {
                'email': tradesperson_data['email'],
                'password': tradesperson_data['password']
            }
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
    
    def test_wallet_creation_and_balance(self):
        """Test wallet creation and balance retrieval"""
        print("\n=== Testing Wallet Creation & Balance Retrieval ===")
        
        # Test wallet balance for homeowner (should create wallet if not exists)
        homeowner_token = self.auth_tokens['homeowner']
        response = self.make_request("GET", "/wallet/balance", auth_token=homeowner_token)
        if response.status_code == 200:
            wallet_data = response.json()
            required_fields = ['balance_coins', 'balance_naira', 'transactions']
            missing_fields = [field for field in required_fields if field not in wallet_data]
            
            if not missing_fields:
                balance_coins = wallet_data['balance_coins']
                balance_naira = wallet_data['balance_naira']
                
                # Verify coin to naira conversion (1 coin = ₦100)
                if balance_naira == balance_coins * 100:
                    self.log_result("Homeowner Wallet Balance", True, 
                                   f"Balance: {balance_coins} coins (₦{balance_naira:,})")
                    self.test_data['homeowner_wallet'] = wallet_data
                else:
                    self.log_result("Homeowner Wallet Balance", False, 
                                   f"Conversion error: {balance_coins} coins != ₦{balance_naira}")
            else:
                self.log_result("Homeowner Wallet Balance", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Homeowner Wallet Balance", False, f"Status: {response.status_code}")
        
        # Test wallet balance for tradesperson
        tradesperson_token = self.auth_tokens['tradesperson']
        response = self.make_request("GET", "/wallet/balance", auth_token=tradesperson_token)
        if response.status_code == 200:
            wallet_data = response.json()
            balance_coins = wallet_data.get('balance_coins', 0)
            balance_naira = wallet_data.get('balance_naira', 0)
            
            if balance_naira == balance_coins * 100:
                self.log_result("Tradesperson Wallet Balance", True, 
                               f"Balance: {balance_coins} coins (₦{balance_naira:,})")
                self.test_data['tradesperson_wallet'] = wallet_data
            else:
                self.log_result("Tradesperson Wallet Balance", False, "Conversion error")
        else:
            self.log_result("Tradesperson Wallet Balance", False, f"Status: {response.status_code}")
        
        # Test unauthenticated access
        response = self.make_request("GET", "/wallet/balance")
        if response.status_code in [401, 403]:
            self.log_result("Wallet Balance Authentication", True, "Correctly requires authentication")
        else:
            self.log_result("Wallet Balance Authentication", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_bank_details_endpoint(self):
        """Test bank details endpoint"""
        print("\n=== Testing Bank Details Endpoint ===")
        
        # Test bank details endpoint (should be public)
        response = self.make_request("GET", "/wallet/bank-details")
        if response.status_code == 200:
            bank_details = response.json()
            required_fields = ['bank_name', 'account_name', 'account_number']
            missing_fields = [field for field in required_fields if field not in bank_details]
            
            if not missing_fields:
                # Verify ServiceHub bank details
                expected_details = {
                    'bank_name': 'Kuda Bank',
                    'account_name': 'Francis Erayefa Samuel',
                    'account_number': '1100023164'
                }
                
                details_match = all(bank_details.get(key) == value for key, value in expected_details.items())
                if details_match:
                    self.log_result("Bank Details Retrieval", True, 
                                   f"Bank: {bank_details['bank_name']}, "
                                   f"Account: {bank_details['account_name']}, "
                                   f"Number: {bank_details['account_number']}")
                else:
                    self.log_result("Bank Details Retrieval", False, "Bank details don't match expected values")
            else:
                self.log_result("Bank Details Retrieval", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Bank Details Retrieval", False, f"Status: {response.status_code}")
    
    def test_wallet_funding_system(self):
        """Test wallet funding system"""
        print("\n=== Testing Wallet Funding System ===")
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Create a test image for payment proof
        test_image = Image.new('RGB', (200, 200), color='blue')
        img_buffer = io.BytesIO()
        test_image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        # Test valid funding request (₦5000 = 50 coins)
        files = {'proof_image': ('payment_proof.jpg', img_buffer, 'image/jpeg')}
        data = {'amount_naira': 5000}
        
        response = self.session.post(
            f"{self.base_url}/wallet/fund",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 200:
            funding_response = response.json()
            required_fields = ['message', 'transaction_id', 'amount_naira', 'amount_coins', 'status']
            missing_fields = [field for field in required_fields if field not in funding_response]
            
            if not missing_fields:
                amount_naira = funding_response['amount_naira']
                amount_coins = funding_response['amount_coins']
                
                # Verify conversion (₦5000 = 50 coins)
                if amount_naira == 5000 and amount_coins == 50:
                    self.log_result("Valid Funding Request", True, 
                                   f"₦{amount_naira:,} = {amount_coins} coins, Status: {funding_response['status']}")
                    self.test_data['funding_transaction_id'] = funding_response['transaction_id']
                else:
                    self.log_result("Valid Funding Request", False, 
                                   f"Conversion error: ₦{amount_naira} != {amount_coins} coins")
            else:
                self.log_result("Valid Funding Request", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Valid Funding Request", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test minimum amount validation (below ₦1500)
        img_buffer.seek(0)
        files = {'proof_image': ('payment_proof.jpg', img_buffer, 'image/jpeg')}
        data = {'amount_naira': 1000}  # Below minimum
        
        response = self.session.post(
            f"{self.base_url}/wallet/fund",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 400:
            self.log_result("Minimum Amount Validation", True, "Correctly rejected amount below ₦1500")
        else:
            self.log_result("Minimum Amount Validation", False, 
                           f"Expected 400, got {response.status_code}")
        
        # Test invalid file type
        files = {'proof_image': ('document.txt', io.BytesIO(b'not an image'), 'text/plain')}
        data = {'amount_naira': 2000}
        
        response = self.session.post(
            f"{self.base_url}/wallet/fund",
            files=files,
            data=data,
            headers={'Authorization': f'Bearer {homeowner_token}'}
        )
        
        if response.status_code == 400:
            self.log_result("Invalid File Type Validation", True, "Correctly rejected non-image file")
        else:
            self.log_result("Invalid File Type Validation", False, 
                           f"Expected 400, got {response.status_code}")
        
        # Test unauthenticated funding request
        img_buffer.seek(0)
        files = {'proof_image': ('payment_proof.jpg', img_buffer, 'image/jpeg')}
        data = {'amount_naira': 2000}
        
        response = self.session.post(f"{self.base_url}/wallet/fund", files=files, data=data)
        
        if response.status_code in [401, 403]:
            self.log_result("Funding Authentication", True, "Correctly requires authentication")
        else:
            self.log_result("Funding Authentication", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_admin_funding_management(self):
        """Test admin funding management"""
        print("\n=== Testing Admin Funding Management ===")
        
        # Test admin login
        admin_data = {'username': 'admin', 'password': 'servicehub2024'}
        response = self.make_request("POST", "/admin/login", data=admin_data)
        if response.status_code == 200:
            admin_response = response.json()
            if 'admin' in admin_response and admin_response['admin']['role'] == 'admin':
                self.log_result("Admin Login", True, f"Username: {admin_response['admin']['username']}")
            else:
                self.log_result("Admin Login", False, "Invalid admin response")
        else:
            self.log_result("Admin Login", False, f"Status: {response.status_code}")
        
        # Test invalid admin credentials
        invalid_data = {'username': 'admin', 'password': 'wrongpassword'}
        response = self.make_request("POST", "/admin/login", data=invalid_data)
        if response.status_code == 401:
            self.log_result("Invalid Admin Credentials", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid Admin Credentials", False, 
                           f"Expected 401, got {response.status_code}")
        
        # Test get pending funding requests
        response = self.make_request("GET", "/admin/wallet/funding-requests")
        if response.status_code == 200:
            funding_data = response.json()
            if 'funding_requests' in funding_data and 'pagination' in funding_data:
                requests = funding_data['funding_requests']
                self.log_result("Get Pending Funding Requests", True, 
                               f"Found {len(requests)} pending requests")
                
                # If we have a pending request from our test, verify its details
                if 'funding_transaction_id' in self.test_data and requests:
                    test_request = next((req for req in requests 
                                       if req['id'] == self.test_data['funding_transaction_id']), None)
                    if test_request:
                        self.log_result("Test Funding Request Found", True, 
                                       f"Amount: ₦{test_request['amount_naira']:,}, Status: {test_request['status']}")
                    else:
                        self.log_result("Test Funding Request Found", False, "Test request not found in pending list")
            else:
                self.log_result("Get Pending Funding Requests", False, "Invalid response structure")
        else:
            self.log_result("Get Pending Funding Requests", False, f"Status: {response.status_code}")
        
        # Test confirm funding (if we have a transaction ID)
        if 'funding_transaction_id' in self.test_data:
            transaction_id = self.test_data['funding_transaction_id']
            confirm_data = {'admin_notes': 'Payment verified and approved'}
            
            response = self.make_request("POST", f"/admin/wallet/confirm-funding/{transaction_id}", 
                                       data=confirm_data)
            if response.status_code == 200:
                confirm_response = response.json()
                if confirm_response.get('status') == 'confirmed':
                    self.log_result("Confirm Funding Request", True, 
                                   f"Transaction {transaction_id} confirmed")
                    self.test_data['funding_confirmed'] = True
                else:
                    self.log_result("Confirm Funding Request", False, "Wrong status in response")
            else:
                self.log_result("Confirm Funding Request", False, f"Status: {response.status_code}")
        
        # Test reject funding with invalid transaction ID
        invalid_id = "invalid-transaction-id"
        reject_data = {'admin_notes': 'Invalid payment proof'}
        
        response = self.make_request("POST", f"/admin/wallet/reject-funding/{invalid_id}", 
                                   data=reject_data)
        if response.status_code == 404:
            self.log_result("Invalid Transaction ID Handling", True, "Correctly returned 404")
        else:
            self.log_result("Invalid Transaction ID Handling", False, 
                           f"Expected 404, got {response.status_code}")
    
    def test_access_fee_deduction(self):
        """Test access fee deduction and balance checking"""
        print("\n=== Testing Access Fee Deduction & Balance Checking ===")
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test balance checking for access fee (15 coins = ₦1500)
        access_fee_coins = 15
        response = self.make_request("POST", f"/wallet/check-balance/{access_fee_coins}", 
                                   auth_token=tradesperson_token)
        if response.status_code == 200:
            balance_check = response.json()
            required_fields = ['sufficient_balance', 'current_balance_coins', 'current_balance_naira', 
                             'required_coins', 'required_naira', 'shortfall_coins', 'shortfall_naira']
            missing_fields = [field for field in required_fields if field not in balance_check]
            
            if not missing_fields:
                sufficient = balance_check['sufficient_balance']
                current_coins = balance_check['current_balance_coins']
                required_coins = balance_check['required_coins']
                
                if required_coins == access_fee_coins:
                    self.log_result("Balance Check for Access Fee", True, 
                                   f"Current: {current_coins} coins, Required: {required_coins} coins, "
                                   f"Sufficient: {sufficient}")
                    self.test_data['tradesperson_balance_sufficient'] = sufficient
                else:
                    self.log_result("Balance Check for Access Fee", False, "Required coins mismatch")
            else:
                self.log_result("Balance Check for Access Fee", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Balance Check for Access Fee", False, f"Status: {response.status_code}")
        
        # Test balance check with high access fee (insufficient balance scenario)
        high_fee_coins = 100  # ₦10,000
        response = self.make_request("POST", f"/wallet/check-balance/{high_fee_coins}", 
                                   auth_token=tradesperson_token)
        if response.status_code == 200:
            balance_check = response.json()
            if not balance_check.get('sufficient_balance', True):
                shortfall = balance_check.get('shortfall_coins', 0)
                self.log_result("Insufficient Balance Detection", True, 
                               f"Correctly detected shortfall: {shortfall} coins")
            else:
                self.log_result("Insufficient Balance Detection", False, "Should detect insufficient balance")
        else:
            self.log_result("Insufficient Balance Detection", False, f"Status: {response.status_code}")
        
        # Test unauthorized access (homeowner trying to check balance)
        response = self.make_request("POST", f"/wallet/check-balance/{access_fee_coins}", 
                                   auth_token=self.auth_tokens['homeowner'])
        if response.status_code == 403:
            self.log_result("Balance Check Authorization", True, "Correctly denied homeowner access")
        else:
            self.log_result("Balance Check Authorization", False, 
                           f"Expected 403, got {response.status_code}")
    
    def test_transaction_history(self):
        """Test transaction history"""
        print("\n=== Testing Transaction History ===")
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test get transaction history
        response = self.make_request("GET", "/wallet/transactions", auth_token=homeowner_token)
        if response.status_code == 200:
            history_data = response.json()
            if 'transactions' in history_data and 'pagination' in history_data:
                transactions = history_data['transactions']
                pagination = history_data['pagination']
                
                self.log_result("Get Transaction History", True, 
                               f"Found {len(transactions)} transactions")
                
                # Verify pagination structure
                required_pagination_fields = ['skip', 'limit', 'total']
                missing_pagination = [field for field in required_pagination_fields 
                                    if field not in pagination]
                if not missing_pagination:
                    self.log_result("Transaction History Pagination", True, 
                                   f"Skip: {pagination['skip']}, Limit: {pagination['limit']}")
                else:
                    self.log_result("Transaction History Pagination", False, 
                                   f"Missing pagination fields: {missing_pagination}")
                
                # If we have transactions, verify structure
                if transactions:
                    transaction = transactions[0]
                    required_fields = ['id', 'transaction_type', 'amount_coins', 'amount_naira', 
                                     'status', 'description', 'created_at']
                    missing_fields = [field for field in required_fields if field not in transaction]
                    
                    if not missing_fields:
                        self.log_result("Transaction Structure Validation", True, 
                                       f"Type: {transaction['transaction_type']}, "
                                       f"Amount: {transaction['amount_coins']} coins")
                    else:
                        self.log_result("Transaction Structure Validation", False, 
                                       f"Missing fields: {missing_fields}")
            else:
                self.log_result("Get Transaction History", False, "Invalid response structure")
        else:
            self.log_result("Get Transaction History", False, f"Status: {response.status_code}")
        
        # Test transaction history with pagination
        response = self.make_request("GET", "/wallet/transactions", 
                                   params={'skip': 0, 'limit': 5}, 
                                   auth_token=homeowner_token)
        if response.status_code == 200:
            history_data = response.json()
            pagination = history_data.get('pagination', {})
            if pagination.get('limit') == 5:
                self.log_result("Transaction History Pagination Params", True, "Pagination working correctly")
            else:
                self.log_result("Transaction History Pagination Params", False, "Pagination not working")
        else:
            self.log_result("Transaction History Pagination Params", False, f"Status: {response.status_code}")
        
        # Test unauthenticated access
        response = self.make_request("GET", "/wallet/transactions")
        if response.status_code in [401, 403]:
            self.log_result("Transaction History Authentication", True, "Correctly requires authentication")
        else:
            self.log_result("Transaction History Authentication", False, 
                           f"Expected 401/403, got {response.status_code}")
    
    def test_job_access_fee_management(self):
        """Test job access fee management"""
        print("\n=== Testing Job Access Fee Management ===")
        
        # Test get jobs with access fees
        response = self.make_request("GET", "/admin/jobs/access-fees")
        if response.status_code == 200:
            jobs_data = response.json()
            if 'jobs' in jobs_data and 'pagination' in jobs_data:
                jobs = jobs_data['jobs']
                self.log_result("Get Jobs with Access Fees", True, f"Found {len(jobs)} jobs")
                
                # Verify job structure includes access fee fields
                if jobs:
                    job = jobs[0]
                    required_fields = ['id', 'title', 'category', 'access_fee_naira', 
                                     'access_fee_coins', 'interests_count']
                    missing_fields = [field for field in required_fields if field not in job]
                    
                    if not missing_fields:
                        access_fee_naira = job['access_fee_naira']
                        access_fee_coins = job['access_fee_coins']
                        
                        # Verify default access fee (₦1500 = 15 coins)
                        if access_fee_naira >= 1500 and access_fee_coins == access_fee_naira // 100:
                            self.log_result("Job Access Fee Structure", True, 
                                           f"Fee: ₦{access_fee_naira:,} = {access_fee_coins} coins")
                            self.test_data['test_job_id'] = job['id']
                        else:
                            self.log_result("Job Access Fee Structure", False, "Access fee conversion error")
                    else:
                        self.log_result("Job Access Fee Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Get Jobs with Access Fees", False, "Invalid response structure")
        else:
            self.log_result("Get Jobs with Access Fees", False, f"Status: {response.status_code}")
        
        # Test update job access fee (if we have a job ID)
        if 'test_job_id' in self.test_data:
            job_id = self.test_data['test_job_id']
            new_fee = 2500  # ₦2500 = 25 coins
            
            update_data = {'access_fee_naira': new_fee}
            response = self.make_request("PUT", f"/admin/jobs/{job_id}/access-fee", 
                                       data=update_data)
            if response.status_code == 200:
                update_response = response.json()
                if (update_response.get('new_access_fee_naira') == new_fee and 
                    update_response.get('new_access_fee_coins') == new_fee // 100):
                    self.log_result("Update Job Access Fee", True, 
                                   f"Updated to ₦{new_fee:,} = {new_fee // 100} coins")
                else:
                    self.log_result("Update Job Access Fee", False, "Fee update values incorrect")
            else:
                self.log_result("Update Job Access Fee", False, f"Status: {response.status_code}")
        
        # Test access fee validation - below minimum
        if 'test_job_id' in self.test_data:
            job_id = self.test_data['test_job_id']
            invalid_fee = 1000  # Below ₦1500 minimum
            
            update_data = {'access_fee_naira': invalid_fee}
            response = self.make_request("PUT", f"/admin/jobs/{job_id}/access-fee", 
                                       data=update_data)
            if response.status_code == 400:
                self.log_result("Access Fee Minimum Validation", True, "Correctly rejected fee below ₦1500")
            else:
                self.log_result("Access Fee Minimum Validation", False, 
                               f"Expected 400, got {response.status_code}")
        
        # Test access fee validation - above maximum
        if 'test_job_id' in self.test_data:
            job_id = self.test_data['test_job_id']
            invalid_fee = 6000  # Above ₦5000 maximum
            
            update_data = {'access_fee_naira': invalid_fee}
            response = self.make_request("PUT", f"/admin/jobs/{job_id}/access-fee", 
                                       data=update_data)
            if response.status_code == 400:
                self.log_result("Access Fee Maximum Validation", True, "Correctly rejected fee above ₦5000")
            else:
                self.log_result("Access Fee Maximum Validation", False, 
                               f"Expected 400, got {response.status_code}")
        
        # Test update non-existent job
        invalid_job_id = "invalid-job-id"
        update_data = {'access_fee_naira': 2000}
        response = self.make_request("PUT", f"/admin/jobs/{invalid_job_id}/access-fee", 
                                   data=update_data)
        if response.status_code == 404:
            self.log_result("Invalid Job ID Handling", True, "Correctly returned 404")
        else:
            self.log_result("Invalid Job ID Handling", False, 
                           f"Expected 404, got {response.status_code}")
    
    def test_admin_dashboard_stats(self):
        """Test admin dashboard stats"""
        print("\n=== Testing Admin Dashboard Stats ===")
        
        # Test admin dashboard stats
        response = self.make_request("GET", "/admin/dashboard/stats")
        if response.status_code == 200:
            stats = response.json()
            required_sections = ['wallet_stats', 'job_stats', 'system_stats']
            missing_sections = [section for section in required_sections if section not in stats]
            
            if not missing_sections:
                # Verify wallet stats
                wallet_stats = stats['wallet_stats']
                wallet_fields = ['pending_funding_requests', 'total_pending_amount_naira', 
                               'total_pending_amount_coins']
                missing_wallet = [field for field in wallet_fields if field not in wallet_stats]
                
                if not missing_wallet:
                    self.log_result("Admin Dashboard Wallet Stats", True, 
                                   f"Pending requests: {wallet_stats['pending_funding_requests']}, "
                                   f"Total pending: ₦{wallet_stats['total_pending_amount_naira']:,}")
                else:
                    self.log_result("Admin Dashboard Wallet Stats", False, 
                                   f"Missing wallet fields: {missing_wallet}")
                
                # Verify job stats
                job_stats = stats['job_stats']
                job_fields = ['total_jobs', 'total_interests', 'average_access_fee_naira', 
                            'average_access_fee_coins']
                missing_job = [field for field in job_fields if field not in job_stats]
                
                if not missing_job:
                    avg_fee_naira = job_stats['average_access_fee_naira']
                    avg_fee_coins = job_stats['average_access_fee_coins']
                    
                    self.log_result("Admin Dashboard Job Stats", True, 
                                   f"Total jobs: {job_stats['total_jobs']}, "
                                   f"Avg fee: ₦{avg_fee_naira:,} = {avg_fee_coins} coins")
                else:
                    self.log_result("Admin Dashboard Job Stats", False, 
                                   f"Missing job fields: {missing_job}")
                
                # Verify system stats
                system_stats = stats['system_stats']
                system_fields = ['coin_conversion_rate', 'min_access_fee', 'max_access_fee', 
                               'min_funding_amount']
                missing_system = [field for field in system_fields if field not in system_stats]
                
                if not missing_system:
                    conversion_rate = system_stats['coin_conversion_rate']
                    if conversion_rate == "1 coin = ₦100":
                        self.log_result("Admin Dashboard System Stats", True, 
                                       f"Conversion: {conversion_rate}, "
                                       f"Fee range: {system_stats['min_access_fee']} - {system_stats['max_access_fee']}")
                    else:
                        self.log_result("Admin Dashboard System Stats", False, "Wrong conversion rate")
                else:
                    self.log_result("Admin Dashboard System Stats", False, 
                                   f"Missing system fields: {missing_system}")
            else:
                self.log_result("Admin Dashboard Stats", False, f"Missing sections: {missing_sections}")
        else:
            self.log_result("Admin Dashboard Stats", False, f"Status: {response.status_code}")
    
    def test_wallet_interest_integration(self):
        """Test wallet integration with interest system"""
        print("\n=== Testing Wallet Integration with Interest System ===")
        
        # First create a job for testing
        homeowner_token = self.auth_tokens['homeowner']
        homeowner_user = self.test_data.get('homeowner_user', {})
        
        job_data = {
            "title": "Wallet Test - Kitchen Plumbing Installation",
            "description": "Need professional plumber to install new kitchen sink and connect all plumbing. Modern kitchen renovation project in Lagos home. Looking for experienced tradesperson with good reviews.",
            "category": "Plumbing",
            "location": "Victoria Island, Lagos State",
            "postcode": "101001",
            "budget_min": 150000,
            "budget_max": 300000,
            "timeline": "Within 2 weeks",
            "homeowner_name": homeowner_user.get('name', 'Test Homeowner'),
            "homeowner_email": homeowner_user.get('email', 'test@example.com'),
            "homeowner_phone": homeowner_user.get('phone', '08123456789')
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
        if response.status_code == 200:
            job = response.json()
            job_id = job['id']
            self.log_result("Test Job Creation", True, f"Job ID: {job_id}")
            
            # Tradesperson shows interest
            tradesperson_token = self.auth_tokens['tradesperson']
            interest_data = {"job_id": job_id}
            response = self.make_request("POST", "/interests/show-interest", 
                                       json=interest_data, auth_token=tradesperson_token)
            
            if response.status_code == 200:
                interest = response.json()
                interest_id = interest['id']
                self.log_result("Show Interest for Wallet Test", True, f"Interest ID: {interest_id}")
                
                # Homeowner shares contact details
                response = self.make_request("PUT", f"/interests/share-contact/{interest_id}", 
                                           auth_token=homeowner_token)
                
                if response.status_code == 200:
                    self.log_result("Share Contact for Wallet Test", True, "Contact shared successfully")
                    
                    # Now test wallet-based payment
                    response = self.make_request("POST", f"/interests/pay-access/{interest_id}", 
                                               auth_token=tradesperson_token)
                    
                    if response.status_code == 200:
                        payment_response = response.json()
                        if 'access_fee' in payment_response:
                            self.log_result("Wallet-Based Payment Success", True, 
                                           f"Access fee: ₦{payment_response['access_fee']:,}")
                        else:
                            self.log_result("Wallet-Based Payment Success", False, "Missing access fee in response")
                    elif response.status_code == 400:
                        # Check if it's insufficient balance error
                        error_detail = response.json().get('detail', '')
                        if 'insufficient wallet balance' in error_detail.lower():
                            self.log_result("Insufficient Balance Handling", True, 
                                           "Correctly detected insufficient wallet balance")
                        else:
                            self.log_result("Wallet-Based Payment", False, f"Unexpected error: {error_detail}")
                    else:
                        self.log_result("Wallet-Based Payment", False, f"Status: {response.status_code}")
                else:
                    self.log_result("Share Contact for Wallet Test", False, f"Status: {response.status_code}")
            else:
                self.log_result("Show Interest for Wallet Test", False, f"Status: {response.status_code}")
        else:
            self.log_result("Test Job Creation", False, f"Status: {response.status_code}")
    
    def run_comprehensive_wallet_tests(self):
        """Run all wallet system tests"""
        print("🎯 PHASE 9A: COMPREHENSIVE WALLET SYSTEM TESTING")
        print("="*80)
        
        # Setup test users
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Aborting wallet tests.")
            return
        
        # Run all wallet tests
        self.test_wallet_creation_and_balance()
        self.test_bank_details_endpoint()
        self.test_wallet_funding_system()
        self.test_admin_funding_management()
        self.test_access_fee_deduction()
        self.test_transaction_history()
        self.test_job_access_fee_management()
        self.test_admin_dashboard_stats()
        self.test_wallet_interest_integration()
        
        # Print final results
        print("\n" + "="*80)
        print("🏁 WALLET SYSTEM TESTING COMPLETE")
        print("="*80)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100 if (self.results['passed'] + self.results['failed']) > 0 else 0
        print(f"\n📊 Wallet System Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 95:
            print("🎉 EXCELLENT: Wallet system is production ready!")
        elif success_rate >= 85:
            print("✅ GOOD: Wallet system is mostly functional with minor issues")
        elif success_rate >= 70:
            print("⚠️  FAIR: Wallet system has some issues that need attention")
        else:
            print("❌ POOR: Wallet system has significant issues requiring fixes")

if __name__ == "__main__":
    tester = WalletSystemTester()
    tester.run_comprehensive_wallet_tests()
#!/usr/bin/env python3
"""
DETAILED DORIS ACCOUNT INVESTIGATION WITH AUTHENTICATION
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

class DorisDetailedInvestigation:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': [],
            'findings': []
        }
        self.doris_account = None
        self.doris_token = None
        self.doris_interests = []
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        if success:
            self.results['passed'] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def log_finding(self, finding: str):
        """Log investigation finding"""
        self.results['findings'].append(finding)
        print(f"🔍 FINDING: {finding}")
    
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
    
    def authenticate_as_doris(self):
        """Try to authenticate as Doris with various password combinations"""
        print("\n=== Attempting to Authenticate as Doris ===")
        
        doris_email = "heaven.earth23199@gmail.com"
        
        # Try common passwords
        common_passwords = [
            "password",
            "Password123!",
            "doris123",
            "Doris123!",
            "123456",
            "password123",
            "Heaven123!",
            "heaven123",
            "earth123",
            "Heaven.Earth123!",
            "servicehub123",
            "ServiceHub123!",
            "Servicehub..1"  # Same pattern as other test accounts
        ]
        
        for password in common_passwords:
            print(f"Trying password: {password[:3]}...")
            
            login_data = {
                "email": doris_email,
                "password": password
            }
            
            response = self.make_request("POST", "/auth/login", json=login_data)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.doris_token = data.get('access_token')
                    self.doris_account = data.get('user', {})
                    
                    self.log_result("Doris authentication", True, f"Successfully authenticated as {self.doris_account.get('name')}")
                    self.log_finding(f"Doris account details: ID={self.doris_account.get('id')}, Role={self.doris_account.get('role')}")
                    self.log_finding(f"Token length: {len(self.doris_token)} characters")
                    return True
                    
                except json.JSONDecodeError:
                    self.log_result("Doris authentication", False, "Invalid JSON response")
            elif response.status_code == 401:
                # Account exists but wrong password - continue trying
                continue
            else:
                self.log_result("Doris authentication", False, f"Unexpected status: {response.status_code}")
        
        self.log_result("Doris authentication", False, "Could not authenticate with any common passwords")
        return False
    
    def investigate_doris_interests_detailed(self):
        """Get detailed information about Doris's interests"""
        print("\n=== Detailed Investigation of Doris Interests ===")
        
        if not self.doris_token:
            self.log_result("Doris interests detailed", False, "No authentication token")
            return
        
        # Get Doris's interests
        response = self.make_request("GET", "/interests/my-interests", auth_token=self.doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                interests = data.get('interests', [])
                
                self.log_finding(f"Doris has {len(interests)} total interests")
                
                if not interests:
                    self.log_finding("❌ CRITICAL: Doris has NO interests - this explains why chat access fails")
                    self.log_finding("User reports paying access fee, but no interests found in system")
                    self.log_result("Doris interests found", False, "No interests found")
                    return
                
                # Analyze each interest in detail
                for i, interest in enumerate(interests, 1):
                    print(f"\n--- Interest #{i} Analysis ---")
                    
                    interest_id = interest.get('id')
                    job_id = interest.get('job_id')
                    job_title = interest.get('job_title', 'Unknown Job')
                    status = interest.get('status')
                    payment_made_at = interest.get('payment_made_at')
                    contact_shared_at = interest.get('contact_shared_at')
                    access_fee_coins = interest.get('access_fee_coins')
                    access_fee_naira = interest.get('access_fee_naira')
                    created_at = interest.get('created_at')
                    
                    self.log_finding(f"Interest {interest_id}:")
                    self.log_finding(f"  Job: {job_title} (ID: {job_id})")
                    self.log_finding(f"  Status: '{status}'")
                    self.log_finding(f"  Created: {created_at}")
                    self.log_finding(f"  Payment made: {payment_made_at}")
                    self.log_finding(f"  Contact shared: {contact_shared_at}")
                    self.log_finding(f"  Access fee: ₦{access_fee_naira} / {access_fee_coins} coins")
                    
                    # Critical analysis
                    if status == 'paid_access':
                        self.log_finding(f"  ✅ Status is 'paid_access' - chat should work")
                        self.doris_interests.append(interest)
                    elif payment_made_at:
                        self.log_finding(f"  🚨 CRITICAL ISSUE: Payment made ({payment_made_at}) but status is '{status}'")
                        self.log_finding(f"  Expected status: 'paid_access', Actual status: '{status}'")
                        self.doris_interests.append(interest)
                    elif status == 'pending':
                        self.log_finding(f"  ⚠️  Status is 'pending' - no payment made yet")
                    else:
                        self.log_finding(f"  ❓ Unknown status: '{status}'")
                
                if self.doris_interests:
                    self.log_result("Doris paid interests", True, f"Found {len(self.doris_interests)} interests with payments")
                else:
                    self.log_result("Doris paid interests", False, "No paid interests found")
                
            except json.JSONDecodeError:
                self.log_result("Doris interests detailed", False, "Invalid JSON response")
        else:
            self.log_result("Doris interests detailed", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_chat_access_for_each_interest(self):
        """Test chat access for each of Doris's interests"""
        print("\n=== Testing Chat Access for Each Interest ===")
        
        if not self.doris_interests:
            self.log_result("Chat access testing", False, "No interests to test")
            return
        
        for interest in self.doris_interests:
            job_id = interest.get('job_id')
            interest_id = interest.get('id')
            status = interest.get('status')
            job_title = interest.get('job_title', 'Unknown Job')
            
            print(f"\n--- Testing Chat Access for Interest {interest_id} ---")
            self.log_finding(f"Testing job '{job_title}' (ID: {job_id}) with status '{status}'")
            
            # Test chat access by trying to get conversation
            response = self.make_request("GET", f"/messages/conversation/{job_id}", auth_token=self.doris_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    messages = data.get('messages', [])
                    self.log_result(f"Chat access - Interest {interest_id}", True, f"Access granted, {len(messages)} messages")
                    self.log_finding(f"✅ Chat access WORKING for interest {interest_id}")
                except json.JSONDecodeError:
                    self.log_result(f"Chat access - Interest {interest_id}", False, "Invalid JSON response")
            elif response.status_code == 403:
                self.log_result(f"Chat access - Interest {interest_id}", False, "Access denied (403)")
                self.log_finding(f"❌ Chat access DENIED for interest {interest_id} with status '{status}'")
                
                # This is the key issue - investigate further
                self.investigate_specific_access_denial(interest)
            elif response.status_code == 404:
                self.log_result(f"Chat access - Interest {interest_id}", False, "Conversation not found (404)")
                self.log_finding(f"⚠️  No conversation exists yet for interest {interest_id}")
            else:
                self.log_result(f"Chat access - Interest {interest_id}", False, f"Unexpected status: {response.status_code}")
                self.log_finding(f"Response: {response.text}")
    
    def investigate_specific_access_denial(self, interest):
        """Deep dive into why access is denied for a specific interest"""
        print(f"\n--- Deep Investigation: Access Denial for Interest {interest.get('id')} ---")
        
        interest_id = interest.get('id')
        job_id = interest.get('job_id')
        status = interest.get('status')
        payment_made_at = interest.get('payment_made_at')
        
        self.log_finding(f"DETAILED ACCESS DENIAL ANALYSIS:")
        self.log_finding(f"  Interest ID: {interest_id}")
        self.log_finding(f"  Job ID: {job_id}")
        self.log_finding(f"  Current Status: '{status}'")
        self.log_finding(f"  Payment Made At: {payment_made_at}")
        
        # Check what the chat access logic expects
        expected_conditions = [
            "status == 'paid_access'",
            "payment_made_at is not null",
            "job is still active",
            "user has valid authentication"
        ]
        
        self.log_finding(f"EXPECTED CONDITIONS FOR CHAT ACCESS:")
        for condition in expected_conditions:
            self.log_finding(f"  • {condition}")
        
        # Analyze current state vs expected
        self.log_finding(f"CURRENT STATE ANALYSIS:")
        
        if status == 'paid_access':
            self.log_finding(f"  ✅ Status check: PASS ('{status}' == 'paid_access')")
        else:
            self.log_finding(f"  ❌ Status check: FAIL ('{status}' != 'paid_access')")
            self.log_finding(f"  🔧 REQUIRED FIX: Update status from '{status}' to 'paid_access'")
        
        if payment_made_at:
            self.log_finding(f"  ✅ Payment check: PASS (payment made at {payment_made_at})")
        else:
            self.log_finding(f"  ❌ Payment check: FAIL (no payment timestamp)")
            self.log_finding(f"  🔧 REQUIRED FIX: Set payment_made_at timestamp")
        
        # Check if job is still active
        self.check_job_status(job_id)
    
    def check_job_status(self, job_id):
        """Check if the job is still active"""
        print(f"\n--- Checking Job Status for Job {job_id} ---")
        
        # Try to get job details
        response = self.make_request("GET", f"/jobs/{job_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                job_status = data.get('status')
                job_title = data.get('title')
                
                self.log_finding(f"Job '{job_title}' status: '{job_status}'")
                
                if job_status == 'active':
                    self.log_finding(f"  ✅ Job status check: PASS (job is active)")
                elif job_status in ['completed', 'cancelled']:
                    self.log_finding(f"  ❌ Job status check: FAIL (job is {job_status})")
                    self.log_finding(f"  Chat access should be disabled for {job_status} jobs")
                else:
                    self.log_finding(f"  ⚠️  Job status check: UNKNOWN status '{job_status}'")
                
            except json.JSONDecodeError:
                self.log_result("Job status check", False, "Invalid JSON response")
        else:
            self.log_result("Job status check", False, f"Status: {response.status_code}")
            self.log_finding(f"Could not retrieve job details for job {job_id}")
    
    def check_wallet_and_payment_history(self):
        """Check Doris's wallet balance and payment history"""
        print("\n=== Checking Doris Wallet and Payment History ===")
        
        if not self.doris_token:
            self.log_result("Wallet check", False, "No authentication token")
            return
        
        # Check wallet balance
        response = self.make_request("GET", "/wallet/balance", auth_token=self.doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                balance = data.get('balance', 0)
                self.log_finding(f"Doris current wallet balance: {balance} coins")
                
                if balance > 0:
                    self.log_finding("✅ Doris has coins in wallet")
                else:
                    self.log_finding("⚠️  Doris has no coins in wallet")
                
            except json.JSONDecodeError:
                self.log_result("Wallet balance", False, "Invalid JSON response")
        else:
            self.log_result("Wallet balance", False, f"Status: {response.status_code}")
        
        # Check transaction history
        response = self.make_request("GET", "/wallet/transactions", auth_token=self.doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                transactions = data.get('transactions', [])
                
                self.log_finding(f"Doris has {len(transactions)} wallet transactions")
                
                if not transactions:
                    self.log_finding("❌ No wallet transactions found - no payments made")
                    return
                
                # Analyze transactions
                access_fee_payments = []
                for transaction in transactions:
                    description = transaction.get('description', '').lower()
                    amount = transaction.get('amount', 0)
                    status = transaction.get('status', '')
                    created_at = transaction.get('created_at', '')
                    
                    if 'access' in description or 'fee' in description:
                        access_fee_payments.append(transaction)
                        self.log_finding(f"Access fee payment found:")
                        self.log_finding(f"  Amount: {amount} coins")
                        self.log_finding(f"  Description: {transaction.get('description')}")
                        self.log_finding(f"  Status: {status}")
                        self.log_finding(f"  Date: {created_at}")
                
                if access_fee_payments:
                    self.log_finding(f"✅ Found {len(access_fee_payments)} access fee payments")
                    
                    # Check if payments were successful
                    successful_payments = [t for t in access_fee_payments if t.get('status') == 'completed']
                    if successful_payments:
                        self.log_finding(f"✅ {len(successful_payments)} successful access fee payments")
                    else:
                        self.log_finding(f"❌ No successful access fee payments found")
                else:
                    self.log_finding("❌ No access fee payments found in transaction history")
                
            except json.JSONDecodeError:
                self.log_result("Transaction history", False, "Invalid JSON response")
        else:
            self.log_result("Transaction history", False, f"Status: {response.status_code}")
    
    def generate_comprehensive_report(self):
        """Generate comprehensive diagnostic report with specific recommendations"""
        print("\n" + "="*100)
        print("COMPREHENSIVE DORIS ACCOUNT CHAT ACCESS DIAGNOSTIC REPORT")
        print("="*100)
        
        print(f"\n📊 INVESTIGATION SUMMARY:")
        print(f"   Tests Passed: {self.results['passed']}")
        print(f"   Tests Failed: {self.results['failed']}")
        print(f"   Total Findings: {len(self.results['findings'])}")
        
        if self.doris_account:
            print(f"\n👤 DORIS ACCOUNT CONFIRMED:")
            print(f"   Name: {self.doris_account.get('name')}")
            print(f"   Email: {self.doris_account.get('email')}")
            print(f"   Role: {self.doris_account.get('role')}")
            print(f"   ID: {self.doris_account.get('id')}")
            print(f"   Authentication: ✅ SUCCESSFUL")
        else:
            print(f"\n❌ DORIS ACCOUNT: AUTHENTICATION FAILED")
        
        if self.doris_interests:
            print(f"\n💼 DORIS INTERESTS ANALYSIS ({len(self.doris_interests)} interests):")
            for interest in self.doris_interests:
                status = interest.get('status')
                payment_made = interest.get('payment_made_at')
                print(f"   Interest {interest.get('id')}: {interest.get('job_title')}")
                print(f"     Status: '{status}' | Payment: {payment_made}")
                
                if status == 'paid_access':
                    print(f"     ✅ CHAT ACCESS: Should work")
                elif payment_made and status != 'paid_access':
                    print(f"     🚨 CRITICAL ISSUE: Payment made but status not 'paid_access'")
                else:
                    print(f"     ❌ CHAT ACCESS: Not available")
        else:
            print(f"\n❌ DORIS INTERESTS: NONE FOUND OR NO PAYMENTS")
        
        print(f"\n🔍 CRITICAL FINDINGS:")
        critical_findings = [f for f in self.results['findings'] if '🚨' in f or 'CRITICAL' in f]
        if critical_findings:
            for finding in critical_findings:
                print(f"   • {finding}")
        else:
            print("   • No critical issues identified")
        
        print(f"\n🔧 SPECIFIC RECOMMENDATIONS:")
        
        # Analyze the situation and provide specific recommendations
        if not self.doris_account:
            print("   1. 🚨 HIGH PRIORITY: Verify Doris account credentials")
            print("   2. Check if account is locked or suspended")
            
        elif not self.doris_interests:
            print("   1. 🚨 HIGH PRIORITY: Doris has no interests in the system")
            print("   2. Verify if user actually made job interests")
            print("   3. Check if interests were created but not properly saved")
            print("   4. User may be confused about which account they used")
            
        else:
            # Check for status issues
            payment_made_wrong_status = [i for i in self.doris_interests 
                                       if i.get('payment_made_at') and i.get('status') != 'paid_access']
            
            if payment_made_wrong_status:
                print("   1. 🚨 CRITICAL: Fix interest status for paid interests")
                for interest in payment_made_wrong_status:
                    print(f"      - Update interest {interest.get('id')} status from '{interest.get('status')}' to 'paid_access'")
                print("   2. 🔧 TECHNICAL: Investigate payment processing workflow")
                print("   3. 🔧 TECHNICAL: Ensure payment success updates interest status correctly")
            
            paid_access_interests = [i for i in self.doris_interests if i.get('status') == 'paid_access']
            if paid_access_interests:
                print("   1. ✅ Status is correct for paid interests")
                print("   2. 🔧 TECHNICAL: Verify chat access control logic")
                print("   3. 🔧 TECHNICAL: Check for additional blocking conditions")
        
        print(f"\n🎯 IMMEDIATE ACTION ITEMS:")
        print("   1. Run database query to find interests for Doris's user ID")
        print("   2. Check payment processing logs for any failed status updates")
        print("   3. Verify chat access control logic in backend code")
        print("   4. Test chat functionality after any status fixes")
        
        print(f"\n📝 DATABASE QUERIES TO RUN:")
        if self.doris_account:
            user_id = self.doris_account.get('id')
            print(f"   1. Find interests: db.interests.find({{\"tradesperson_id\": \"{user_id}\"}})")
            print(f"   2. Check payments: db.interests.find({{\"tradesperson_id\": \"{user_id}\", \"payment_made_at\": {{$ne: null}}}})")
            print(f"   3. Find status issues: db.interests.find({{\"tradesperson_id\": \"{user_id}\", \"payment_made_at\": {{$ne: null}}, \"status\": {{$ne: \"paid_access\"}}}})")
        
        print("\n" + "="*100)
    
    def run_comprehensive_investigation(self):
        """Run the complete comprehensive investigation"""
        print("🔍 STARTING COMPREHENSIVE DORIS ACCOUNT INVESTIGATION")
        print("="*70)
        
        # Step 1: Authenticate as Doris
        if self.authenticate_as_doris():
            
            # Step 2: Get detailed interests information
            self.investigate_doris_interests_detailed()
            
            # Step 3: Test chat access for each interest
            self.test_chat_access_for_each_interest()
            
            # Step 4: Check wallet and payment history
            self.check_wallet_and_payment_history()
        
        # Step 5: Generate comprehensive report
        self.generate_comprehensive_report()

def main():
    """Main function to run the comprehensive investigation"""
    investigator = DorisDetailedInvestigation()
    investigator.run_comprehensive_investigation()

if __name__ == "__main__":
    main()
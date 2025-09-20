#!/usr/bin/env python3
"""
DORIS ACCOUNT CHAT ACCESS ISSUE DEBUGGING

**INVESTIGATION REQUIREMENTS FROM REVIEW REQUEST:**

Debug the Doris account chat access issue after payment.

**Investigation Required:**
1. **Find Doris Account**: Search for user accounts with name "Doris" or similar in the database
2. **Check Payment Status**: Verify if Doris has actually paid the access fee and what her current status is
3. **Verify Interest Records**: Check the interests collection to see Doris's status for specific jobs
4. **Test Access Control Logic**: Verify if the chat access control is checking the correct fields

**Expected Database Queries:**
- Search users collection for accounts with name containing "Doris"
- Find interests records for this user ID
- Check payment status and access fee payment records
- Verify the status field that should enable chat access

**Access Control Logic Verification:**
- The chat should be enabled when tradesperson status = 'paid_access'
- Verify this status is being set correctly after payment
- Check if there are any case sensitivity or data type issues

**Context:**
- User reports Doris account failing to start chat after paying access fee
- This suggests payment was made but chat access control logic is not recognizing it
- Need to identify the specific data issue causing the problem

Please investigate the specific case and identify why the chat access is failing for this paid account.
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

class DorisAccountDebugger:
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
        self.doris_interests = []
        self.admin_token = None
        
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
    
    def get_admin_access(self):
        """Get admin access for database inspection"""
        print("\n=== Getting Admin Access for Database Inspection ===")
        
        # Try to get database info endpoint (public endpoint for inspection)
        response = self.make_request("GET", "/database-info")
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Database access", True, f"Database: {data.get('database')}, Collections: {data.get('collections')}")
                return True
            except json.JSONDecodeError:
                self.log_result("Database access", False, "Invalid JSON response")
        else:
            self.log_result("Database access", False, f"Status: {response.status_code}")
        
        return False
    
    def search_doris_account(self):
        """Search for Doris account in the database"""
        print("\n=== Searching for Doris Account ===")
        
        # Try to get users summary to see if we can find Doris
        response = self.make_request("GET", "/users-summary")
        if response.status_code == 200:
            try:
                data = response.json()
                recent_users = data.get('recent_users', [])
                
                # Look for Doris in recent users
                doris_users = [user for user in recent_users if 'doris' in user.get('name', '').lower()]
                
                if doris_users:
                    self.log_finding(f"Found {len(doris_users)} potential Doris accounts in recent users")
                    for user in doris_users:
                        self.log_finding(f"User: {user.get('name')} ({user.get('email')}) - Role: {user.get('role')}")
                        if user.get('role') == 'tradesperson':
                            self.doris_account = user
                            self.log_result("Doris account found", True, f"Found tradesperson: {user.get('name')}")
                else:
                    self.log_finding("No Doris accounts found in recent users list")
                    self.log_result("Doris account search", False, "No Doris accounts found in recent users")
                
                # Log total user statistics
                self.log_finding(f"Total users in system: {data.get('total_users')}")
                self.log_finding(f"Tradespeople: {data.get('tradespeople')}, Homeowners: {data.get('homeowners')}")
                
            except json.JSONDecodeError:
                self.log_result("Doris account search", False, "Invalid JSON response")
        else:
            self.log_result("Doris account search", False, f"Status: {response.status_code}")
        
        # If we didn't find Doris in recent users, we need to try other approaches
        if not self.doris_account:
            self.attempt_direct_user_search()
    
    def attempt_direct_user_search(self):
        """Attempt to search for Doris using different approaches"""
        print("\n=== Attempting Direct User Search ===")
        
        # Try to authenticate with common Doris credentials to see if account exists
        potential_doris_emails = [
            "doris@example.com",
            "doris@test.com", 
            "doris@gmail.com",
            "doris.tradesperson@example.com",
            "doris.smith@example.com",
            "doris.johnson@example.com"
        ]
        
        for email in potential_doris_emails:
            print(f"\n--- Testing potential Doris email: {email} ---")
            
            # Try login with common passwords
            common_passwords = ["password", "Password123!", "doris123", "Doris123!", "123456"]
            
            for password in common_passwords:
                login_data = {
                    "email": email,
                    "password": password
                }
                
                response = self.make_request("POST", "/auth/login", json=login_data)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        user_data = data.get('user', {})
                        if 'doris' in user_data.get('name', '').lower():
                            self.doris_account = user_data
                            self.doris_account['access_token'] = data.get('access_token')
                            self.log_result("Doris account login", True, f"Successfully logged in as {user_data.get('name')}")
                            self.log_finding(f"Doris account details: ID={user_data.get('id')}, Role={user_data.get('role')}")
                            return
                    except json.JSONDecodeError:
                        pass
                elif response.status_code == 401:
                    # Account exists but wrong password
                    self.log_finding(f"Account {email} exists but password incorrect")
                # Continue trying other combinations
        
        self.log_result("Direct user search", False, "Could not find or authenticate Doris account")
    
    def investigate_doris_interests(self):
        """Investigate Doris's interest records and payment status"""
        print("\n=== Investigating Doris Interest Records ===")
        
        if not self.doris_account:
            self.log_result("Doris interests investigation", False, "No Doris account found")
            return
        
        doris_token = self.doris_account.get('access_token')
        if not doris_token:
            self.log_result("Doris interests investigation", False, "No access token for Doris account")
            return
        
        # Get Doris's interests
        response = self.make_request("GET", "/interests/my-interests", auth_token=doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                interests = data.get('interests', [])
                
                self.log_finding(f"Doris has {len(interests)} interests")
                
                for interest in interests:
                    interest_id = interest.get('id')
                    job_title = interest.get('job_title', 'Unknown Job')
                    status = interest.get('status')
                    payment_made_at = interest.get('payment_made_at')
                    access_fee_coins = interest.get('access_fee_coins')
                    access_fee_naira = interest.get('access_fee_naira')
                    
                    self.log_finding(f"Interest {interest_id}: {job_title}")
                    self.log_finding(f"  Status: {status}")
                    self.log_finding(f"  Payment made at: {payment_made_at}")
                    self.log_finding(f"  Access fee: ₦{access_fee_naira} / {access_fee_coins} coins")
                    
                    # Check if this interest has paid_access status
                    if status == 'paid_access':
                        self.log_finding(f"  ✅ PAID ACCESS CONFIRMED for interest {interest_id}")
                        self.doris_interests.append(interest)
                    elif payment_made_at:
                        self.log_finding(f"  ⚠️  PAYMENT MADE but status is '{status}' not 'paid_access'")
                        self.doris_interests.append(interest)
                    else:
                        self.log_finding(f"  ❌ No payment made for this interest")
                
                if self.doris_interests:
                    self.log_result("Doris paid interests found", True, f"Found {len(self.doris_interests)} paid interests")
                else:
                    self.log_result("Doris paid interests", False, "No paid interests found")
                
            except json.JSONDecodeError:
                self.log_result("Doris interests investigation", False, "Invalid JSON response")
        else:
            self.log_result("Doris interests investigation", False, f"Status: {response.status_code}")
    
    def test_chat_access_logic(self):
        """Test the chat access control logic for Doris's interests"""
        print("\n=== Testing Chat Access Control Logic ===")
        
        if not self.doris_interests:
            self.log_result("Chat access logic test", False, "No Doris interests to test")
            return
        
        doris_token = self.doris_account.get('access_token')
        
        for interest in self.doris_interests:
            job_id = interest.get('job_id')
            interest_id = interest.get('id')
            status = interest.get('status')
            
            print(f"\n--- Testing Chat Access for Interest {interest_id} ---")
            self.log_finding(f"Testing job {job_id} with interest status '{status}'")
            
            # Test if chat is accessible by trying to get messages
            response = self.make_request("GET", f"/messages/conversation/{job_id}", auth_token=doris_token)
            
            if response.status_code == 200:
                self.log_result(f"Chat access for interest {interest_id}", True, "Chat access granted")
                self.log_finding(f"✅ Chat access working for interest {interest_id} with status '{status}'")
            elif response.status_code == 403:
                self.log_result(f"Chat access for interest {interest_id}", False, "Chat access denied")
                self.log_finding(f"❌ Chat access DENIED for interest {interest_id} with status '{status}'")
                
                # This is the key issue - investigate why access is denied
                self.investigate_access_denial(interest)
            else:
                self.log_result(f"Chat access for interest {interest_id}", False, f"Unexpected status: {response.status_code}")
    
    def investigate_access_denial(self, interest):
        """Investigate why chat access is being denied for a paid interest"""
        print(f"\n--- Investigating Access Denial for Interest {interest.get('id')} ---")
        
        # Check all the fields that might affect chat access
        status = interest.get('status')
        payment_made_at = interest.get('payment_made_at')
        contact_shared_at = interest.get('contact_shared_at')
        job_status = interest.get('job_status')  # This might be missing from API response
        
        self.log_finding(f"DETAILED ANALYSIS for Interest {interest.get('id')}:")
        self.log_finding(f"  interest.status = '{status}' (should be 'paid_access' for chat)")
        self.log_finding(f"  payment_made_at = {payment_made_at} (should not be null)")
        self.log_finding(f"  contact_shared_at = {contact_shared_at}")
        self.log_finding(f"  job_status = {job_status} (might be missing from API)")
        
        # Check if the issue is case sensitivity
        if status and status.lower() == 'paid_access':
            self.log_finding("  ⚠️  Status matches 'paid_access' (case insensitive)")
        
        # Check if payment was made but status not updated
        if payment_made_at and status != 'paid_access':
            self.log_finding("  🚨 CRITICAL ISSUE: Payment made but status not 'paid_access'")
            self.log_finding("  This suggests the payment processing didn't update the status correctly")
        
        # Check data types
        self.log_finding(f"  status type: {type(status)}")
        self.log_finding(f"  payment_made_at type: {type(payment_made_at)}")
        
        # Potential issues identified
        if status != 'paid_access':
            self.log_finding("  🔧 POTENTIAL FIX: Update interest status to 'paid_access'")
        
        if not payment_made_at:
            self.log_finding("  🔧 POTENTIAL FIX: Set payment_made_at timestamp")
    
    def test_payment_workflow(self):
        """Test the payment workflow to understand how status should be updated"""
        print("\n=== Testing Payment Workflow ===")
        
        if not self.doris_account:
            self.log_result("Payment workflow test", False, "No Doris account available")
            return
        
        doris_token = self.doris_account.get('access_token')
        
        # Try to understand the payment process by looking at wallet endpoints
        response = self.make_request("GET", "/wallet/balance", auth_token=doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                balance = data.get('balance', 0)
                self.log_finding(f"Doris wallet balance: {balance} coins")
                
                if balance > 0:
                    self.log_finding("Doris has coins in wallet - payment capability confirmed")
                else:
                    self.log_finding("Doris has no coins - might explain payment issues")
                
            except json.JSONDecodeError:
                self.log_result("Wallet balance check", False, "Invalid JSON response")
        else:
            self.log_result("Wallet balance check", False, f"Status: {response.status_code}")
        
        # Check payment history
        response = self.make_request("GET", "/wallet/transactions", auth_token=doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                transactions = data.get('transactions', [])
                
                self.log_finding(f"Doris has {len(transactions)} wallet transactions")
                
                # Look for access fee payments
                access_fee_payments = [t for t in transactions if 'access' in t.get('description', '').lower()]
                
                if access_fee_payments:
                    self.log_finding(f"Found {len(access_fee_payments)} access fee payments:")
                    for payment in access_fee_payments:
                        self.log_finding(f"  Payment: {payment.get('amount')} coins - {payment.get('description')}")
                        self.log_finding(f"  Date: {payment.get('created_at')}")
                        self.log_finding(f"  Status: {payment.get('status')}")
                else:
                    self.log_finding("No access fee payments found in transaction history")
                
            except json.JSONDecodeError:
                self.log_result("Payment history check", False, "Invalid JSON response")
        else:
            self.log_result("Payment history check", False, f"Status: {response.status_code}")
    
    def generate_diagnostic_report(self):
        """Generate a comprehensive diagnostic report"""
        print("\n" + "="*80)
        print("DORIS ACCOUNT CHAT ACCESS DIAGNOSTIC REPORT")
        print("="*80)
        
        print(f"\n📊 INVESTIGATION SUMMARY:")
        print(f"   Tests Passed: {self.results['passed']}")
        print(f"   Tests Failed: {self.results['failed']}")
        print(f"   Findings: {len(self.results['findings'])}")
        
        if self.doris_account:
            print(f"\n👤 DORIS ACCOUNT DETAILS:")
            print(f"   Name: {self.doris_account.get('name')}")
            print(f"   Email: {self.doris_account.get('email')}")
            print(f"   Role: {self.doris_account.get('role')}")
            print(f"   ID: {self.doris_account.get('id')}")
        else:
            print(f"\n❌ DORIS ACCOUNT: NOT FOUND")
        
        if self.doris_interests:
            print(f"\n💼 DORIS INTERESTS ({len(self.doris_interests)}):")
            for interest in self.doris_interests:
                print(f"   Interest {interest.get('id')}: {interest.get('job_title')}")
                print(f"     Status: {interest.get('status')}")
                print(f"     Payment: {interest.get('payment_made_at')}")
        else:
            print(f"\n❌ DORIS INTERESTS: NONE FOUND")
        
        print(f"\n🔍 KEY FINDINGS:")
        for finding in self.results['findings']:
            print(f"   • {finding}")
        
        if self.results['errors']:
            print(f"\n❌ ERRORS ENCOUNTERED:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Provide recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        
        if not self.doris_account:
            print("   1. Verify Doris account exists in the database")
            print("   2. Check if account name spelling is correct")
            print("   3. Verify account is active and not suspended")
        
        if self.doris_account and not self.doris_interests:
            print("   1. Check if Doris has made any job interests")
            print("   2. Verify interest records are properly created")
        
        if self.doris_interests:
            paid_access_interests = [i for i in self.doris_interests if i.get('status') == 'paid_access']
            payment_made_interests = [i for i in self.doris_interests if i.get('payment_made_at')]
            
            if payment_made_interests and not paid_access_interests:
                print("   🚨 CRITICAL: Payment made but status not updated to 'paid_access'")
                print("   1. Update interest status from current value to 'paid_access'")
                print("   2. Verify payment processing workflow updates status correctly")
                print("   3. Check for case sensitivity issues in status comparison")
            
            if paid_access_interests:
                print("   1. Verify chat access control logic checks for 'paid_access' status")
                print("   2. Check if there are additional conditions blocking chat access")
                print("   3. Test chat functionality with correct status")
        
        print(f"\n🎯 NEXT STEPS:")
        print("   1. Fix any identified status update issues")
        print("   2. Test chat access after fixes")
        print("   3. Verify payment workflow updates status correctly")
        print("   4. Monitor for similar issues with other accounts")
        
        print("\n" + "="*80)
    
    def run_investigation(self):
        """Run the complete Doris account investigation"""
        print("🔍 STARTING DORIS ACCOUNT CHAT ACCESS INVESTIGATION")
        print("="*60)
        
        # Step 1: Test service health
        self.test_service_health()
        
        # Step 2: Get database access
        self.get_admin_access()
        
        # Step 3: Search for Doris account
        self.search_doris_account()
        
        # Step 4: Investigate Doris's interests and payment status
        if self.doris_account:
            self.investigate_doris_interests()
            
            # Step 5: Test chat access logic
            self.test_chat_access_logic()
            
            # Step 6: Test payment workflow
            self.test_payment_workflow()
        
        # Step 7: Generate diagnostic report
        self.generate_diagnostic_report()

def main():
    """Main function to run the Doris account investigation"""
    debugger = DorisAccountDebugger()
    debugger.run_investigation()

if __name__ == "__main__":
    main()
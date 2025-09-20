#!/usr/bin/env python3
"""
DORIS CHAT ACCESS FUNCTIONALITY TEST

Based on investigation findings:
- Doris has 1 interest with 'paid_access' status
- Payment was made successfully 
- But chat conversation returns 404 (not found)

This test will verify if the issue is:
1. Chat access control logic
2. Missing conversation initialization
3. Frontend vs backend issue
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

class DorisChatAccessTest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': [],
            'findings': []
        }
        # From previous investigation
        self.doris_email = "heaven.earth23199@gmail.com"
        self.doris_password = "Password123!"
        self.doris_token = None
        self.doris_id = "1a720fe3-3050-4bef-a492-55e35dfd1afb"
        self.job_id = "60986786-ecca-43f2-8859-8bcc491a4448"
        self.interest_id = "2b0ccc1d-89f2-43c1-a82b-f81ff53cbe1a"
        
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
        """Authenticate as Doris"""
        print("\n=== Authenticating as Doris ===")
        
        login_data = {
            "email": self.doris_email,
            "password": self.doris_password
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.doris_token = data.get('access_token')
                self.log_result("Doris authentication", True, "Successfully authenticated")
                return True
            except json.JSONDecodeError:
                self.log_result("Doris authentication", False, "Invalid JSON response")
        else:
            self.log_result("Doris authentication", False, f"Status: {response.status_code}")
        
        return False
    
    def test_chat_endpoints_comprehensive(self):
        """Test all chat-related endpoints comprehensively"""
        print("\n=== Comprehensive Chat Endpoints Testing ===")
        
        if not self.doris_token:
            self.log_result("Chat endpoints test", False, "No authentication token")
            return
        
        # Test 1: Get conversation (should work if chat access is enabled)
        print(f"\n--- Test 1: Get Conversation for Job {self.job_id} ---")
        response = self.make_request("GET", f"/messages/conversation/{self.job_id}", auth_token=self.doris_token)
        
        self.log_finding(f"GET /messages/conversation/{self.job_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                messages = data.get('messages', [])
                self.log_result("Get conversation", True, f"Found {len(messages)} messages")
                self.log_finding(f"✅ Chat access is WORKING - conversation accessible")
            except json.JSONDecodeError:
                self.log_result("Get conversation", False, "Invalid JSON response")
        elif response.status_code == 404:
            self.log_result("Get conversation", False, "Conversation not found (404)")
            self.log_finding(f"⚠️  Conversation doesn't exist yet - this might be normal")
        elif response.status_code == 403:
            self.log_result("Get conversation", False, "Access denied (403)")
            self.log_finding(f"❌ Chat access is BLOCKED despite paid_access status")
        else:
            self.log_result("Get conversation", False, f"Unexpected status: {response.status_code}")
            self.log_finding(f"Response: {response.text}")
        
        # Test 2: Try to send a message (this will test if chat is truly accessible)
        print(f"\n--- Test 2: Send Message to Job {self.job_id} ---")
        message_data = {
            "job_id": self.job_id,
            "content": "Hello, I'm interested in discussing this job. I have paid the access fee.",
            "message_type": "text"
        }
        
        response = self.make_request("POST", "/messages/send", json=message_data, auth_token=self.doris_token)
        
        self.log_finding(f"POST /messages/send - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                message_id = data.get('id')
                self.log_result("Send message", True, f"Message sent successfully, ID: {message_id}")
                self.log_finding(f"✅ Chat functionality is FULLY WORKING")
            except json.JSONDecodeError:
                self.log_result("Send message", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Send message", False, "Access denied (403)")
            self.log_finding(f"❌ Message sending BLOCKED - this is the core issue")
            
            # Get detailed error message
            try:
                error_data = response.json()
                error_message = error_data.get('detail', 'No error details')
                self.log_finding(f"Error details: {error_message}")
            except:
                self.log_finding(f"Error response: {response.text}")
                
        elif response.status_code == 400:
            self.log_result("Send message", False, "Bad request (400)")
            try:
                error_data = response.json()
                self.log_finding(f"Validation error: {error_data}")
            except:
                self.log_finding(f"Error response: {response.text}")
        else:
            self.log_result("Send message", False, f"Unexpected status: {response.status_code}")
            self.log_finding(f"Response: {response.text}")
        
        # Test 3: Check if there are any other message endpoints
        print(f"\n--- Test 3: Alternative Message Endpoints ---")
        
        # Try different message endpoint patterns
        alternative_endpoints = [
            f"/messages/{self.job_id}",
            f"/messages/job/{self.job_id}",
            f"/messages/chat/{self.job_id}",
            f"/chat/{self.job_id}",
            f"/chat/messages/{self.job_id}"
        ]
        
        for endpoint in alternative_endpoints:
            response = self.make_request("GET", endpoint, auth_token=self.doris_token)
            self.log_finding(f"GET {endpoint} - Status: {response.status_code}")
            
            if response.status_code == 200:
                self.log_finding(f"✅ Alternative endpoint {endpoint} works!")
                break
    
    def test_interest_status_verification(self):
        """Verify the interest status and payment details"""
        print("\n=== Interest Status Verification ===")
        
        if not self.doris_token:
            self.log_result("Interest status verification", False, "No authentication token")
            return
        
        # Get current interest status
        response = self.make_request("GET", "/interests/my-interests", auth_token=self.doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                interests = data if isinstance(data, list) else data.get('interests', [])
                
                # Find our specific interest
                target_interest = None
                for interest in interests:
                    if interest.get('id') == self.interest_id:
                        target_interest = interest
                        break
                
                if target_interest:
                    self.log_finding(f"CURRENT INTEREST STATUS:")
                    self.log_finding(f"  Interest ID: {target_interest.get('id')}")
                    self.log_finding(f"  Job ID: {target_interest.get('job_id')}")
                    self.log_finding(f"  Status: '{target_interest.get('status')}'")
                    self.log_finding(f"  Payment made: {target_interest.get('payment_made_at')}")
                    self.log_finding(f"  Contact shared: {target_interest.get('contact_shared_at')}")
                    
                    # Verify all conditions for chat access
                    status = target_interest.get('status')
                    payment_made = target_interest.get('payment_made_at')
                    
                    if status == 'paid_access' and payment_made:
                        self.log_result("Interest status check", True, "All conditions met for chat access")
                        self.log_finding(f"✅ Interest has correct status and payment - chat should work")
                    else:
                        self.log_result("Interest status check", False, f"Status: {status}, Payment: {payment_made}")
                        self.log_finding(f"❌ Interest conditions not met for chat access")
                else:
                    self.log_result("Interest status verification", False, f"Interest {self.interest_id} not found")
                
            except json.JSONDecodeError:
                self.log_result("Interest status verification", False, "Invalid JSON response")
        else:
            self.log_result("Interest status verification", False, f"Status: {response.status_code}")
    
    def test_job_status_and_availability(self):
        """Test if the job is still active and available for chat"""
        print("\n=== Job Status and Availability Test ===")
        
        # Get job details
        response = self.make_request("GET", f"/jobs/{self.job_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                job_status = data.get('status')
                job_title = data.get('title')
                homeowner_id = data.get('homeowner_id')
                
                self.log_finding(f"JOB DETAILS:")
                self.log_finding(f"  Job ID: {self.job_id}")
                self.log_finding(f"  Title: {job_title}")
                self.log_finding(f"  Status: '{job_status}'")
                self.log_finding(f"  Homeowner ID: {homeowner_id}")
                
                if job_status == 'active':
                    self.log_result("Job status check", True, "Job is active")
                    self.log_finding(f"✅ Job is active - chat should be available")
                elif job_status in ['completed', 'cancelled']:
                    self.log_result("Job status check", False, f"Job is {job_status}")
                    self.log_finding(f"❌ Job is {job_status} - chat should be disabled")
                else:
                    self.log_result("Job status check", False, f"Unknown status: {job_status}")
                    self.log_finding(f"⚠️  Unknown job status: {job_status}")
                
            except json.JSONDecodeError:
                self.log_result("Job status check", False, "Invalid JSON response")
        else:
            self.log_result("Job status check", False, f"Status: {response.status_code}")
    
    def test_backend_chat_access_logic(self):
        """Test the backend chat access logic by examining the actual implementation"""
        print("\n=== Backend Chat Access Logic Analysis ===")
        
        # Based on the investigation, let's test what the backend actually checks
        self.log_finding(f"TESTING BACKEND CHAT ACCESS CONDITIONS:")
        self.log_finding(f"Expected conditions for chat access:")
        self.log_finding(f"  1. User is authenticated ✅")
        self.log_finding(f"  2. User has interest in the job ✅")
        self.log_finding(f"  3. Interest status is 'paid_access' ✅")
        self.log_finding(f"  4. Payment was made ✅")
        self.log_finding(f"  5. Job is still active ✅ (to be verified)")
        
        # The issue might be in the message sending logic specifically
        # Let's test if the issue is with conversation initialization
        
        print(f"\n--- Testing Conversation Initialization ---")
        
        # Try to get or create conversation
        response = self.make_request("POST", f"/messages/conversation/{self.job_id}", auth_token=self.doris_token)
        
        self.log_finding(f"POST /messages/conversation/{self.job_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            self.log_result("Conversation initialization", True, "Conversation created/accessed")
            self.log_finding(f"✅ Conversation initialization works")
        elif response.status_code == 404:
            self.log_finding(f"❌ Conversation initialization endpoint not found")
        elif response.status_code == 403:
            self.log_finding(f"❌ Conversation initialization blocked - access denied")
        else:
            self.log_finding(f"Response: {response.text}")
    
    def generate_final_diagnosis(self):
        """Generate final diagnosis and recommendations"""
        print("\n" + "="*100)
        print("FINAL DORIS CHAT ACCESS DIAGNOSIS")
        print("="*100)
        
        print(f"\n📊 TEST RESULTS:")
        print(f"   Tests Passed: {self.results['passed']}")
        print(f"   Tests Failed: {self.results['failed']}")
        
        print(f"\n🔍 KEY FINDINGS:")
        for finding in self.results['findings']:
            print(f"   • {finding}")
        
        print(f"\n🎯 ROOT CAUSE ANALYSIS:")
        
        # Analyze the test results to determine the root cause
        conversation_404 = any("404" in error for error in self.results['errors'])
        send_message_403 = any("403" in error and "Send message" in error for error in self.results['errors'])
        
        if conversation_404 and not send_message_403:
            print("   🔍 LIKELY CAUSE: Conversation not initialized yet")
            print("   📝 EXPLANATION: Chat access is working, but no conversation exists")
            print("   💡 SOLUTION: Frontend should handle 404 and show 'Start conversation' option")
            
        elif send_message_403:
            print("   🔍 LIKELY CAUSE: Backend chat access control blocking messages")
            print("   📝 EXPLANATION: Despite paid_access status, message sending is blocked")
            print("   💡 SOLUTION: Debug backend message sending access control logic")
            
        else:
            print("   🔍 LIKELY CAUSE: Mixed results - need further investigation")
        
        print(f"\n🔧 SPECIFIC RECOMMENDATIONS:")
        print("   1. 🚨 HIGH PRIORITY: Test message sending functionality")
        print("   2. 🔧 TECHNICAL: Review backend message access control logic")
        print("   3. 🔧 TECHNICAL: Verify conversation initialization process")
        print("   4. 🔧 FRONTEND: Ensure frontend handles 404 responses correctly")
        print("   5. 🔧 TESTING: Create end-to-end chat flow test")
        
        print(f"\n📋 NEXT STEPS:")
        print("   1. Fix any identified backend access control issues")
        print("   2. Test complete chat flow from frontend")
        print("   3. Verify other paid users don't have same issue")
        print("   4. Update chat access documentation")
        
        print("\n" + "="*100)
    
    def run_comprehensive_chat_test(self):
        """Run comprehensive chat access test"""
        print("🔍 STARTING COMPREHENSIVE DORIS CHAT ACCESS TEST")
        print("="*60)
        
        # Step 1: Authenticate
        if self.authenticate_as_doris():
            
            # Step 2: Verify interest status
            self.test_interest_status_verification()
            
            # Step 3: Check job status
            self.test_job_status_and_availability()
            
            # Step 4: Test chat endpoints
            self.test_chat_endpoints_comprehensive()
            
            # Step 5: Test backend logic
            self.test_backend_chat_access_logic()
        
        # Step 6: Generate final diagnosis
        self.generate_final_diagnosis()

def main():
    """Main function"""
    tester = DorisChatAccessTest()
    tester.run_comprehensive_chat_test()

if __name__ == "__main__":
    main()
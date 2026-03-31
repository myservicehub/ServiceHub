#!/usr/bin/env python3
"""
FINAL DORIS CHAT ACCESS TEST - USING CORRECT ENDPOINTS

Based on backend code analysis, the correct endpoints are:
- GET /api/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}
- POST /api/messages/conversations (to create conversation)
- GET /api/messages/conversations/{conversation_id}/messages
- POST /api/messages/conversations/{conversation_id}/messages
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid

# Get backend URL from environment
BACKEND_URL = "https://api.myservicehub.co/api"

class DorisFinalChatTest:
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
        self.homeowner_id = None
        self.conversation_id = None
        
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
    
    def get_job_homeowner_id(self):
        """Get the homeowner ID for the job"""
        print("\n=== Getting Job Homeowner ID ===")
        
        response = self.make_request("GET", f"/jobs/{self.job_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                # Try different possible structures for homeowner ID
                homeowner_id = None
                
                if isinstance(data.get('homeowner'), dict):
                    homeowner_id = data['homeowner'].get('id')
                elif data.get('homeowner_id'):
                    homeowner_id = data.get('homeowner_id')
                elif data.get('homeowner'):
                    homeowner_id = data.get('homeowner')
                
                if homeowner_id:
                    self.homeowner_id = homeowner_id
                    self.log_result("Get homeowner ID", True, f"Homeowner ID: {homeowner_id}")
                    return True
                else:
                    self.log_result("Get homeowner ID", False, "Homeowner ID not found in job data")
                    self.log_finding(f"Job data structure: {list(data.keys())}")
                    
            except json.JSONDecodeError:
                self.log_result("Get homeowner ID", False, "Invalid JSON response")
        else:
            self.log_result("Get homeowner ID", False, f"Status: {response.status_code}")
        
        return False
    
    def test_get_or_create_conversation(self):
        """Test the get or create conversation endpoint"""
        print("\n=== Testing Get/Create Conversation ===")
        
        if not self.homeowner_id:
            self.log_result("Get/Create conversation", False, "No homeowner ID available")
            return
        
        # Test the correct endpoint from the backend code
        response = self.make_request(
            "GET", 
            f"/messages/conversations/job/{self.job_id}?tradesperson_id={self.doris_id}",
            auth_token=self.doris_token
        )
        
        self.log_finding(f"GET /messages/conversations/job/{self.job_id}?tradesperson_id={self.doris_id} - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.conversation_id = data.get('conversation_id')
                exists = data.get('exists', False)
                
                if exists:
                    self.log_result("Get existing conversation", True, f"Conversation ID: {self.conversation_id}")
                    self.log_finding(f"✅ Conversation already exists")
                else:
                    self.log_result("Create new conversation", True, f"Conversation ID: {self.conversation_id}")
                    self.log_finding(f"✅ New conversation created successfully")
                
                return True
                
            except json.JSONDecodeError:
                self.log_result("Get/Create conversation", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Get/Create conversation", False, "Access denied (403)")
            try:
                error_data = response.json()
                error_message = error_data.get('detail', 'No error details')
                self.log_finding(f"❌ Access denied: {error_message}")
                
                # This is the key issue we're investigating
                if "paid_access" in error_message.lower():
                    self.log_finding(f"🚨 CRITICAL: Backend is not recognizing paid_access status")
                elif "pay for access" in error_message.lower():
                    self.log_finding(f"🚨 CRITICAL: Backend thinks Doris hasn't paid for access")
                    
            except:
                self.log_finding(f"Error response: {response.text}")
        else:
            self.log_result("Get/Create conversation", False, f"Unexpected status: {response.status_code}")
            self.log_finding(f"Response: {response.text}")
        
        return False
    
    def test_conversation_messages(self):
        """Test getting messages from the conversation"""
        print("\n=== Testing Conversation Messages ===")
        
        if not self.conversation_id:
            self.log_result("Get conversation messages", False, "No conversation ID available")
            return
        
        response = self.make_request(
            "GET",
            f"/messages/conversations/{self.conversation_id}/messages",
            auth_token=self.doris_token
        )
        
        self.log_finding(f"GET /messages/conversations/{self.conversation_id}/messages - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                messages = data.get('messages', [])
                total = data.get('total', 0)
                
                self.log_result("Get conversation messages", True, f"Found {total} messages")
                self.log_finding(f"✅ Can access conversation messages")
                
                if messages:
                    self.log_finding(f"Latest message: {messages[0].get('content', 'No content')[:50]}...")
                
            except json.JSONDecodeError:
                self.log_result("Get conversation messages", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Get conversation messages", False, "Access denied (403)")
            self.log_finding(f"❌ Cannot access conversation messages")
        else:
            self.log_result("Get conversation messages", False, f"Status: {response.status_code}")
    
    def test_send_message(self):
        """Test sending a message in the conversation"""
        print("\n=== Testing Send Message ===")
        
        if not self.conversation_id:
            self.log_result("Send message", False, "No conversation ID available")
            return
        
        message_data = {
            "message_type": "text",
            "content": "Hello! I'm Doris and I have paid the access fee. I'm interested in discussing this job with you.",
            "attachment_url": None
        }
        
        response = self.make_request(
            "POST",
            f"/messages/conversations/{self.conversation_id}/messages",
            json=message_data,
            auth_token=self.doris_token
        )
        
        self.log_finding(f"POST /messages/conversations/{self.conversation_id}/messages - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                message_id = data.get('id')
                content = data.get('content')
                
                self.log_result("Send message", True, f"Message sent successfully, ID: {message_id}")
                self.log_finding(f"✅ Chat functionality is FULLY WORKING")
                self.log_finding(f"Message content: {content}")
                
            except json.JSONDecodeError:
                self.log_result("Send message", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Send message", False, "Access denied (403)")
            try:
                error_data = response.json()
                error_message = error_data.get('detail', 'No error details')
                self.log_finding(f"❌ Message sending blocked: {error_message}")
            except:
                self.log_finding(f"Error response: {response.text}")
        else:
            self.log_result("Send message", False, f"Status: {response.status_code}")
            self.log_finding(f"Response: {response.text}")
    
    def test_get_all_conversations(self):
        """Test getting all conversations for Doris"""
        print("\n=== Testing Get All Conversations ===")
        
        response = self.make_request(
            "GET",
            "/messages/conversations",
            auth_token=self.doris_token
        )
        
        self.log_finding(f"GET /messages/conversations - Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                conversations = data.get('conversations', [])
                total = data.get('total', 0)
                
                self.log_result("Get all conversations", True, f"Found {total} conversations")
                
                for conv in conversations:
                    self.log_finding(f"Conversation: {conv.get('job_title')} with {conv.get('homeowner_name')}")
                
            except json.JSONDecodeError:
                self.log_result("Get all conversations", False, "Invalid JSON response")
        else:
            self.log_result("Get all conversations", False, f"Status: {response.status_code}")
    
    def debug_interest_status_in_backend(self):
        """Debug what the backend sees for Doris's interest status"""
        print("\n=== Debugging Backend Interest Status Check ===")
        
        # The backend checks: interest.get("status") != "paid_access"
        # Let's verify what the backend actually sees
        
        response = self.make_request("GET", "/interests/my-interests", auth_token=self.doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                interests = data if isinstance(data, list) else data.get('interests', [])
                
                target_interest = None
                for interest in interests:
                    if interest.get('job_id') == self.job_id:
                        target_interest = interest
                        break
                
                if target_interest:
                    status = target_interest.get('status')
                    self.log_finding(f"BACKEND SEES:")
                    self.log_finding(f"  interest.get('status') = '{status}'")
                    self.log_finding(f"  Type: {type(status)}")
                    self.log_finding(f"  Length: {len(status) if status else 'None'}")
                    self.log_finding(f"  Repr: {repr(status)}")
                    
                    # Check exact comparison
                    if status == "paid_access":
                        self.log_finding(f"  ✅ status == 'paid_access': TRUE")
                    else:
                        self.log_finding(f"  ❌ status == 'paid_access': FALSE")
                        self.log_finding(f"  🔧 This is why chat access is failing!")
                    
                    # Check for whitespace or encoding issues
                    if status and status.strip() == "paid_access":
                        self.log_finding(f"  ⚠️  status.strip() == 'paid_access': TRUE (whitespace issue)")
                    
                    # Check case sensitivity
                    if status and status.lower() == "paid_access":
                        self.log_finding(f"  ⚠️  status.lower() == 'paid_access': TRUE (case issue)")
                
            except json.JSONDecodeError:
                self.log_result("Debug interest status", False, "Invalid JSON response")
        else:
            self.log_result("Debug interest status", False, f"Status: {response.status_code}")
    
    def generate_final_report(self):
        """Generate the final comprehensive report"""
        print("\n" + "="*100)
        print("FINAL DORIS CHAT ACCESS INVESTIGATION REPORT")
        print("="*100)
        
        print(f"\n📊 FINAL TEST RESULTS:")
        print(f"   Tests Passed: {self.results['passed']}")
        print(f"   Tests Failed: {self.results['failed']}")
        
        print(f"\n🔍 CRITICAL FINDINGS:")
        for finding in self.results['findings']:
            if '🚨' in finding or 'CRITICAL' in finding or '❌' in finding:
                print(f"   • {finding}")
        
        print(f"\n✅ SUCCESSFUL OPERATIONS:")
        for finding in self.results['findings']:
            if '✅' in finding:
                print(f"   • {finding}")
        
        print(f"\n🎯 ROOT CAUSE ANALYSIS:")
        
        # Analyze the specific failure patterns
        access_denied_403 = any("403" in error for error in self.results['errors'])
        conversation_created = self.conversation_id is not None
        
        if access_denied_403 and not conversation_created:
            print("   🚨 ROOT CAUSE: Backend access control is blocking conversation creation")
            print("   📝 EXPLANATION: Despite 'paid_access' status, backend rejects conversation creation")
            print("   🔧 SOLUTION: Debug backend interest status checking logic")
            
        elif conversation_created:
            print("   ✅ ROOT CAUSE: Chat access is actually working correctly")
            print("   📝 EXPLANATION: Doris can create conversations and send messages")
            print("   🔧 SOLUTION: Issue may be in frontend implementation or user confusion")
            
        else:
            print("   ❓ ROOT CAUSE: Inconclusive - need more investigation")
        
        print(f"\n🔧 SPECIFIC TECHNICAL RECOMMENDATIONS:")
        
        if access_denied_403:
            print("   1. 🚨 HIGH PRIORITY: Fix backend interest status checking")
            print("   2. 🔧 Check database.get_interest_by_job_and_tradesperson() function")
            print("   3. 🔧 Verify interest status field is exactly 'paid_access' (no whitespace/case issues)")
            print("   4. 🔧 Add logging to backend to see what status is actually retrieved")
            
        if conversation_created:
            print("   1. ✅ Backend chat access is working correctly")
            print("   2. 🔧 Focus on frontend chat interface implementation")
            print("   3. 🔧 Verify frontend handles conversation creation properly")
            print("   4. 🔧 Check if issue is user experience related")
        
        print(f"\n📋 IMMEDIATE ACTION ITEMS:")
        print("   1. Run database query to verify Doris's exact interest status")
        print("   2. Add backend logging to interest status checking")
        print("   3. Test chat functionality from frontend interface")
        print("   4. Verify other paid users don't have same issue")
        
        print(f"\n📝 DATABASE VERIFICATION QUERIES:")
        print(f"   1. Check interest status:")
        print(f"      db.interests.findOne({{\"tradesperson_id\": \"{self.doris_id}\", \"job_id\": \"{self.job_id}\"}})")
        print(f"   2. Check for whitespace issues:")
        print(f"      db.interests.find({{\"status\": /paid_access/}})")
        print(f"   3. Check exact status values:")
        print(f"      db.interests.distinct(\"status\")")
        
        print(f"\n🎯 CONCLUSION:")
        if self.results['passed'] > self.results['failed']:
            print("   ✅ LIKELY RESOLUTION: Chat access is working, issue may be elsewhere")
        else:
            print("   ❌ CONFIRMED ISSUE: Backend access control is blocking legitimate paid access")
        
        print("\n" + "="*100)
    
    def run_final_comprehensive_test(self):
        """Run the final comprehensive chat test"""
        print("🔍 STARTING FINAL COMPREHENSIVE DORIS CHAT ACCESS TEST")
        print("="*70)
        
        # Step 1: Authenticate
        if self.authenticate_as_doris():
            
            # Step 2: Get homeowner ID
            self.get_job_homeowner_id()
            
            # Step 3: Debug interest status
            self.debug_interest_status_in_backend()
            
            # Step 4: Test conversation creation/access
            if self.test_get_or_create_conversation():
                
                # Step 5: Test message functionality
                self.test_conversation_messages()
                self.test_send_message()
            
            # Step 6: Test general conversation access
            self.test_get_all_conversations()
        
        # Step 7: Generate final report
        self.generate_final_report()

def main():
    """Main function"""
    tester = DorisFinalChatTest()
    tester.run_final_comprehensive_test()

if __name__ == "__main__":
    main()
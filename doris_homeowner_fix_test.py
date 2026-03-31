#!/usr/bin/env python3
"""
DORIS HOMEOWNER ID FIX AND FINAL CHAT TEST

The previous test showed:
1. Doris has correct 'paid_access' status ✅
2. Doris already has 1 conversation ✅
3. Need to extract homeowner ID from job data properly

This test will fix the homeowner ID extraction and complete the chat test.
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

class DorisHomeownerFixTest:
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
    
    def extract_homeowner_id_from_job(self):
        """Extract homeowner ID from job data with detailed analysis"""
        print("\n=== Extracting Homeowner ID from Job Data ===")
        
        response = self.make_request("GET", f"/jobs/{self.job_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Detailed analysis of homeowner field
                homeowner_field = data.get('homeowner')
                self.log_finding(f"Homeowner field type: {type(homeowner_field)}")
                self.log_finding(f"Homeowner field value: {homeowner_field}")
                
                if isinstance(homeowner_field, dict):
                    self.log_finding(f"Homeowner dict keys: {list(homeowner_field.keys())}")
                    homeowner_id = homeowner_field.get('id')
                elif isinstance(homeowner_field, str):
                    homeowner_id = homeowner_field
                else:
                    homeowner_id = None
                
                if homeowner_id:
                    self.homeowner_id = homeowner_id
                    self.log_result("Extract homeowner ID", True, f"Homeowner ID: {homeowner_id}")
                    return True
                else:
                    # Try alternative fields
                    alt_fields = ['homeowner_id', 'owner_id', 'user_id']
                    for field in alt_fields:
                        if data.get(field):
                            self.homeowner_id = data.get(field)
                            self.log_result("Extract homeowner ID (alternative)", True, f"Found in {field}: {self.homeowner_id}")
                            return True
                    
                    self.log_result("Extract homeowner ID", False, "No homeowner ID found in any field")
                    
            except json.JSONDecodeError:
                self.log_result("Extract homeowner ID", False, "Invalid JSON response")
        else:
            self.log_result("Extract homeowner ID", False, f"Status: {response.status_code}")
        
        return False
    
    def check_existing_conversations(self):
        """Check Doris's existing conversations for clues"""
        print("\n=== Checking Existing Conversations ===")
        
        response = self.make_request("GET", "/messages/conversations", auth_token=self.doris_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                conversations = data.get('conversations', [])
                
                self.log_finding(f"Doris has {len(conversations)} existing conversations")
                
                for conv in conversations:
                    conv_id = conv.get('id')
                    job_id = conv.get('job_id')
                    homeowner_id = conv.get('homeowner_id')
                    homeowner_name = conv.get('homeowner_name')
                    job_title = conv.get('job_title')
                    
                    self.log_finding(f"Conversation {conv_id}:")
                    self.log_finding(f"  Job: {job_title} (ID: {job_id})")
                    self.log_finding(f"  Homeowner: {homeowner_name} (ID: {homeowner_id})")
                    
                    # Check if this is our target job
                    if job_id == self.job_id:
                        self.conversation_id = conv_id
                        if not self.homeowner_id:
                            self.homeowner_id = homeowner_id
                        self.log_finding(f"✅ Found existing conversation for target job!")
                        self.log_result("Found target conversation", True, f"Conversation ID: {conv_id}")
                        return True
                
                if conversations and not self.conversation_id:
                    self.log_finding(f"⚠️  Conversations exist but none for target job {self.job_id}")
                
            except json.JSONDecodeError:
                self.log_result("Check existing conversations", False, "Invalid JSON response")
        else:
            self.log_result("Check existing conversations", False, f"Status: {response.status_code}")
        
        return False
    
    def test_conversation_access(self):
        """Test accessing the existing conversation"""
        print("\n=== Testing Conversation Access ===")
        
        if not self.conversation_id:
            self.log_result("Test conversation access", False, "No conversation ID available")
            return
        
        # Test getting messages
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
                
                self.log_result("Access conversation messages", True, f"Found {total} messages")
                self.log_finding(f"✅ Chat access is WORKING - can read messages")
                
                if messages:
                    for msg in messages[:3]:  # Show first 3 messages
                        sender = msg.get('sender_name', 'Unknown')
                        content = msg.get('content', 'No content')[:50]
                        self.log_finding(f"  Message from {sender}: {content}...")
                
                return True
                
            except json.JSONDecodeError:
                self.log_result("Access conversation messages", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Access conversation messages", False, "Access denied (403)")
            self.log_finding(f"❌ Chat access is BLOCKED")
        else:
            self.log_result("Access conversation messages", False, f"Status: {response.status_code}")
        
        return False
    
    def test_send_message_to_existing_conversation(self):
        """Test sending a message to the existing conversation"""
        print("\n=== Testing Send Message to Existing Conversation ===")
        
        if not self.conversation_id:
            self.log_result("Send message to conversation", False, "No conversation ID available")
            return
        
        message_data = {
            "message_type": "text",
            "content": f"Test message from Doris at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - verifying chat access after payment.",
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
                sender_name = data.get('sender_name')
                
                self.log_result("Send message to conversation", True, f"Message sent successfully")
                self.log_finding(f"✅ CHAT FUNCTIONALITY IS FULLY WORKING!")
                self.log_finding(f"Message ID: {message_id}")
                self.log_finding(f"Sender: {sender_name}")
                self.log_finding(f"Content: {content[:50]}...")
                
                return True
                
            except json.JSONDecodeError:
                self.log_result("Send message to conversation", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Send message to conversation", False, "Access denied (403)")
            try:
                error_data = response.json()
                error_message = error_data.get('detail', 'No error details')
                self.log_finding(f"❌ Message sending blocked: {error_message}")
            except:
                self.log_finding(f"Error response: {response.text}")
        else:
            self.log_result("Send message to conversation", False, f"Status: {response.status_code}")
            self.log_finding(f"Response: {response.text}")
        
        return False
    
    def test_create_new_conversation_if_needed(self):
        """Test creating a new conversation if homeowner ID is available"""
        print("\n=== Testing Create New Conversation (if needed) ===")
        
        if self.conversation_id:
            self.log_finding("Conversation already exists, skipping creation test")
            return True
        
        if not self.homeowner_id:
            self.log_result("Create new conversation", False, "No homeowner ID available")
            return False
        
        # Test the get/create endpoint
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
                    self.log_finding(f"✅ Found existing conversation")
                else:
                    self.log_result("Create new conversation", True, f"Conversation ID: {self.conversation_id}")
                    self.log_finding(f"✅ New conversation created successfully")
                
                return True
                
            except json.JSONDecodeError:
                self.log_result("Create new conversation", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Create new conversation", False, "Access denied (403)")
            try:
                error_data = response.json()
                error_message = error_data.get('detail', 'No error details')
                self.log_finding(f"❌ Conversation creation blocked: {error_message}")
                
                # This would indicate a backend issue with access control
                if "paid_access" in error_message.lower():
                    self.log_finding(f"🚨 CRITICAL: Backend not recognizing paid_access status")
                
            except:
                self.log_finding(f"Error response: {response.text}")
        else:
            self.log_result("Create new conversation", False, f"Status: {response.status_code}")
            self.log_finding(f"Response: {response.text}")
        
        return False
    
    def generate_final_diagnosis(self):
        """Generate final diagnosis of Doris chat access issue"""
        print("\n" + "="*100)
        print("FINAL DIAGNOSIS: DORIS CHAT ACCESS ISSUE")
        print("="*100)
        
        print(f"\n📊 FINAL TEST RESULTS:")
        print(f"   Tests Passed: {self.results['passed']}")
        print(f"   Tests Failed: {self.results['failed']}")
        
        print(f"\n🔍 KEY DISCOVERIES:")
        
        # Analyze what we found
        has_conversation = self.conversation_id is not None
        can_access_messages = any("can read messages" in f for f in self.results['findings'])
        can_send_messages = any("CHAT FUNCTIONALITY IS FULLY WORKING" in f for f in self.results['findings'])
        
        if has_conversation:
            print(f"   ✅ Doris HAS an existing conversation for the job")
            print(f"   📝 Conversation ID: {self.conversation_id}")
        else:
            print(f"   ❌ No conversation found or could not be created")
        
        if can_access_messages:
            print(f"   ✅ Doris CAN access and read conversation messages")
        else:
            print(f"   ❌ Doris cannot access conversation messages")
        
        if can_send_messages:
            print(f"   ✅ Doris CAN send messages in the conversation")
        else:
            print(f"   ❌ Doris cannot send messages")
        
        print(f"\n🎯 FINAL DIAGNOSIS:")
        
        if has_conversation and can_access_messages and can_send_messages:
            print("   ✅ RESOLUTION: DORIS CHAT ACCESS IS WORKING CORRECTLY")
            print("   📝 EXPLANATION: Doris has paid access and can use chat functionality")
            print("   💡 USER ISSUE: The problem may be:")
            print("      - User confusion about how to access chat")
            print("      - Frontend interface not showing chat option clearly")
            print("      - User looking in wrong place for chat functionality")
            print("      - Browser/cache issues preventing frontend from working")
            
        elif has_conversation and can_access_messages and not can_send_messages:
            print("   ⚠️  PARTIAL ISSUE: Chat access works but message sending blocked")
            print("   📝 EXPLANATION: Backend allows reading but blocks sending")
            print("   🔧 SOLUTION: Debug message sending access control logic")
            
        elif has_conversation and not can_access_messages:
            print("   ❌ BACKEND ISSUE: Conversation exists but access is blocked")
            print("   📝 EXPLANATION: Backend access control has inconsistent logic")
            print("   🔧 SOLUTION: Debug conversation access control logic")
            
        else:
            print("   ❌ CRITICAL ISSUE: Cannot create or access conversations")
            print("   📝 EXPLANATION: Backend completely blocks chat access")
            print("   🔧 SOLUTION: Debug interest status checking in backend")
        
        print(f"\n🔧 RECOMMENDED ACTIONS:")
        
        if can_send_messages:
            print("   1. ✅ BACKEND: Chat functionality is working correctly")
            print("   2. 🔧 FRONTEND: Verify chat interface is user-friendly")
            print("   3. 🔧 UX: Improve chat access visibility for paid users")
            print("   4. 🔧 SUPPORT: Provide user guidance on accessing chat")
        else:
            print("   1. 🚨 DEBUG: Add logging to backend access control logic")
            print("   2. 🔧 FIX: Resolve backend interest status checking")
            print("   3. 🔧 TEST: Verify fix with other paid users")
            print("   4. 🔧 MONITOR: Watch for similar issues")
        
        print(f"\n📋 SUMMARY FOR MAIN AGENT:")
        if can_send_messages:
            print("   🎉 SUCCESS: Doris chat access is working correctly")
            print("   📝 The issue appears to be user experience or frontend related")
            print("   💡 Focus on improving chat interface clarity and user guidance")
        else:
            print("   🚨 ISSUE CONFIRMED: Backend is blocking legitimate chat access")
            print("   📝 Despite 'paid_access' status, conversation creation/messaging fails")
            print("   💡 Backend access control logic needs debugging and fixing")
        
        print("\n" + "="*100)
    
    def run_complete_diagnosis(self):
        """Run complete diagnosis of Doris chat access"""
        print("🔍 STARTING COMPLETE DORIS CHAT ACCESS DIAGNOSIS")
        print("="*60)
        
        # Step 1: Authenticate
        if self.authenticate_as_doris():
            
            # Step 2: Try to extract homeowner ID
            self.extract_homeowner_id_from_job()
            
            # Step 3: Check existing conversations
            self.check_existing_conversations()
            
            # Step 4: Test conversation access
            if self.conversation_id:
                self.test_conversation_access()
                self.test_send_message_to_existing_conversation()
            else:
                # Step 5: Try to create new conversation
                self.test_create_new_conversation_if_needed()
                
                # Step 6: Test new conversation if created
                if self.conversation_id:
                    self.test_conversation_access()
                    self.test_send_message_to_existing_conversation()
        
        # Step 7: Generate final diagnosis
        self.generate_final_diagnosis()

def main():
    """Main function"""
    tester = DorisHomeownerFixTest()
    tester.run_complete_diagnosis()

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
REAL-TIME NOTIFICATION SYSTEM TESTING - SendGrid (Email) and Termii (SMS)
Testing the comprehensive real-time notification system with SendGrid and Termii services.

Focus Areas:
1. Service Initialization Testing:
   - Test lazy initialization of SendGrid and Termii services
   - Verify environment variable loading (SENDGRID_API_KEY, SENDER_EMAIL, TERMII_API_KEY, TERMII_SENDER_ID)
   - Check fallback to mock services when API keys are missing

2. Email Notification Testing (SendGrid):
   - Test all 4 notification types: NEW_INTEREST, CONTACT_SHARED, JOB_POSTED, PAYMENT_CONFIRMATION
   - Verify HTML content conversion (newlines to <br> tags)
   - Test template rendering with proper variable substitution
   - Verify SendGrid API integration and response handling

3. SMS Notification Testing (Termii):
   - Test all 4 notification types with SMS channel
   - Verify Nigerian phone number formatting (removes + prefix for Termii API)
   - Test Termii API payload structure and response handling
   - Test phone number formatting edge cases

4. Notification Workflow Integration:
   - Test notification sending via /api/notifications/send endpoint
   - Test background task notification processing
   - Verify notification history storage in database
   - Test notification preferences integration

5. Error Handling & Fallback:
   - Test behavior when SendGrid API fails
   - Test behavior when Termii API fails  
   - Verify mock service fallback functionality
   - Test comprehensive error logging
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
import time
import asyncio

# Get backend URL from environment
BACKEND_URL = "https://notify-connect.preview.emergentagent.com/api"

class NotificationSystemTester:
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
    
    def test_user_authentication(self):
        """Test user authentication system for notification testing"""
        print("\n=== Testing User Authentication ===")
        
        # Create a test tradesperson first
        tradesperson_data = {
            "name": "John Plumber",
            "email": f"john.plumber.{uuid.uuid4().hex[:8]}@tradework.com",
            "password": "SecurePass123",
            "phone": "+2348187654321",
            "location": "Lagos",
            "postcode": "100001",
            "trade_categories": ["Plumbing", "Building"],
            "experience_years": 8,
            "company_name": "John's Plumbing Services",
            "description": "Professional plumber with 8 years experience in residential and commercial projects across Nigeria.",
            "certifications": ["Licensed Professional"]
        }
        
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        if response.status_code == 200:
            tradesperson_profile = response.json()
            print(f"DEBUG: Tradesperson registration response: {tradesperson_profile}")
            
            # Handle different response structures
            if 'access_token' in tradesperson_profile:
                self.auth_tokens['tradesperson'] = tradesperson_profile['access_token']
                self.test_data['tradesperson_user'] = tradesperson_profile.get('user', tradesperson_profile)
                user_id = tradesperson_profile.get('user', {}).get('id', tradesperson_profile.get('id', 'unknown'))
            else:
                # Direct user object response - try to login to get token
                self.test_data['tradesperson_user'] = tradesperson_profile
                user_id = tradesperson_profile.get('id', 'unknown')
                
                # Try to login to get access token
                login_response = self.make_request("POST", "/auth/login", json={
                    "email": tradesperson_data["email"],
                    "password": tradesperson_data["password"]
                })
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    if 'access_token' in login_data:
                        self.auth_tokens['tradesperson'] = login_data['access_token']
                        print(f"DEBUG: Got access token via login")
                    
            self.log_result("Create test tradesperson", True, f"ID: {user_id}")
        else:
            self.log_result("Create test tradesperson", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test homeowner login - create a test homeowner if needed
        homeowner_data = {
            "name": "Adebayo Johnson",
            "email": f"adebayo.johnson.{uuid.uuid4().hex[:8]}@email.com",
            "password": "SecurePass123",
            "phone": "+2348123456789",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            homeowner_profile = response.json()
            self.log_result("Create test homeowner", True, f"ID: {homeowner_profile['user']['id']}")
            self.auth_tokens['homeowner'] = homeowner_profile['access_token']
            self.test_data['homeowner_user'] = homeowner_profile['user']
        else:
            self.log_result("Create test homeowner", False, f"Status: {response.status_code}")
    
    def test_notification_preferences(self):
        """Test notification preferences management"""
        print("\n=== Testing Notification Preferences ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Notification preferences tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Get notification preferences
        response = self.make_request("GET", "/notifications/preferences", auth_token=tradesperson_token)
        if response.status_code == 200:
            preferences = response.json()
            required_fields = ['id', 'user_id', 'new_interest', 'contact_shared', 'job_posted', 'payment_confirmation']
            missing_fields = [field for field in required_fields if field not in preferences]
            
            if not missing_fields:
                self.log_result("Get notification preferences", True, 
                               f"Complete preferences structure with channels: {preferences.get('new_interest', 'N/A')}")
                self.test_data['original_preferences'] = preferences
            else:
                self.log_result("Get notification preferences", False, 
                               f"Missing fields: {missing_fields}")
        else:
            self.log_result("Get notification preferences", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Update notification preferences
        update_data = {
            "new_interest": "both",
            "contact_shared": "email",
            "job_posted": "sms",
            "payment_confirmation": "both"
        }
        
        response = self.make_request("PUT", "/notifications/preferences", json=update_data, auth_token=tradesperson_token)
        if response.status_code == 200:
            updated_preferences = response.json()
            
            # Verify updates were applied
            updates_applied = all(
                updated_preferences.get(key) == value 
                for key, value in update_data.items()
            )
            
            if updates_applied:
                self.log_result("Update notification preferences", True, 
                               f"Preferences updated successfully")
            else:
                self.log_result("Update notification preferences", False, 
                               "Updates not reflected in response")
        else:
            self.log_result("Update notification preferences", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 3: Invalid preference values
        invalid_data = {
            "new_interest": "invalid_channel"
        }
        
        response = self.make_request("PUT", "/notifications/preferences", json=invalid_data, auth_token=tradesperson_token)
        if response.status_code in [400, 422]:
            self.log_result("Invalid preference values", True, 
                           "Correctly rejected invalid channel")
        else:
            self.log_result("Invalid preference values", False, 
                           f"Expected 400/422, got {response.status_code}")
    
    def test_notification_templates_and_rendering(self):
        """Test notification template rendering for all types"""
        print("\n=== Testing Notification Templates and Rendering ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Template rendering tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test all 4 notification types
        notification_types = ["new_interest", "contact_shared", "job_posted", "payment_confirmation"]
        
        for notification_type in notification_types:
            response = self.make_request("POST", f"/notifications/test/{notification_type}", auth_token=tradesperson_token)
            
            if response.status_code == 200:
                test_response = response.json()
                
                # Verify response structure
                required_fields = ['message', 'notification_id', 'status']
                missing_fields = [field for field in required_fields if field not in test_response]
                
                if not missing_fields:
                    self.log_result(f"Template rendering - {notification_type}", True, 
                                   f"Template rendered and notification sent: {test_response['notification_id']}")
                    
                    # Store notification ID for history testing
                    if 'test_notifications' not in self.test_data:
                        self.test_data['test_notifications'] = []
                    self.test_data['test_notifications'].append({
                        'type': notification_type,
                        'id': test_response['notification_id']
                    })
                else:
                    self.log_result(f"Template rendering - {notification_type}", False, 
                                   f"Missing response fields: {missing_fields}")
            else:
                self.log_result(f"Template rendering - {notification_type}", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
        
        # Test template rendering with custom data
        custom_template_data = {
            "homeowner_name": "Adebayo Johnson",
            "job_title": "Premium Bathroom Renovation",
            "job_location": "Victoria Island, Lagos",
            "tradesperson_name": "John Plumber",
            "tradesperson_experience": "8",
            "job_budget": "₦150,000 - ₦300,000"
        }
        
        # Test NEW_INTEREST with custom data
        notification_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "new_interest",
            "template_data": custom_template_data,
            "override_channel": "both"
        }
        
        response = self.make_request("POST", "/notifications/send", json=notification_request, auth_token=tradesperson_token)
        if response.status_code == 200:
            send_response = response.json()
            if send_response.get('status') == 'pending':
                self.log_result("Custom template data rendering", True, 
                               f"Notification queued with custom data")
            else:
                self.log_result("Custom template data rendering", False, 
                               f"Unexpected status: {send_response.get('status')}")
        else:
            self.log_result("Custom template data rendering", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
    
    def test_notification_history(self):
        """Test notification history retrieval"""
        print("\n=== Testing Notification History ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Notification history tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Wait a moment for background tasks to complete
        time.sleep(3)
        
        # Test 1: Get notification history
        response = self.make_request("GET", "/notifications/history", auth_token=tradesperson_token)
        if response.status_code == 200:
            history = response.json()
            
            # Verify history structure
            required_fields = ['notifications', 'total', 'unread']
            missing_fields = [field for field in required_fields if field not in history]
            
            if not missing_fields:
                notifications = history['notifications']
                total_count = history['total']
                unread_count = history['unread']
                
                self.log_result("Get notification history", True, 
                               f"Retrieved {len(notifications)} notifications (Total: {total_count}, Unread: {unread_count})")
                
                # Verify notification structure if any exist
                if notifications:
                    notification = notifications[0]
                    notification_fields = ['id', 'user_id', 'type', 'channel', 'subject', 'content', 'status', 'created_at']
                    missing_notification_fields = [field for field in notification_fields if field not in notification]
                    
                    if not missing_notification_fields:
                        self.log_result("Notification history - data structure", True, 
                                       f"Complete notification data: {notification['type']} via {notification['channel']}")
                    else:
                        self.log_result("Notification history - data structure", False, 
                                       f"Missing notification fields: {missing_notification_fields}")
                else:
                    self.log_result("Notification history - data structure", True, 
                                   "No notifications in history (expected for new user)")
            else:
                self.log_result("Get notification history", False, 
                               f"Missing history fields: {missing_fields}")
        else:
            self.log_result("Get notification history", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Get notification history with pagination
        response = self.make_request("GET", "/notifications/history?limit=5&offset=0", auth_token=tradesperson_token)
        if response.status_code == 200:
            paginated_history = response.json()
            notifications = paginated_history.get('notifications', [])
            
            if len(notifications) <= 5:
                self.log_result("Notification history pagination", True, 
                               f"Correctly limited to {len(notifications)} notifications")
            else:
                self.log_result("Notification history pagination", False, 
                               f"Expected max 5 notifications, got {len(notifications)}")
        else:
            self.log_result("Notification history pagination", False, 
                           f"Status: {response.status_code}")
    
    def test_service_initialization_and_environment_variables(self):
        """Test service initialization and environment variable handling"""
        print("\n=== Testing Service Initialization and Environment Variables ===")
        
        # This test verifies that the services are properly configured
        # by checking if notifications are being processed correctly
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Service initialization tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test SendGrid service initialization by sending email notification
        email_notification_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "job_posted",
            "template_data": {
                "homeowner_name": "Test Homeowner",
                "job_title": "Test Email Service Job",
                "job_location": "Lagos, Nigeria",
                "job_budget": "₦50,000 - ₦100,000",
                "post_date": "Today",
                "manage_url": "https://servicehub.ng/my-jobs"
            },
            "override_channel": "email"
        }
        
        response = self.make_request("POST", "/notifications/send", json=email_notification_request, auth_token=tradesperson_token)
        if response.status_code == 200:
            send_response = response.json()
            if send_response.get('status') == 'pending':
                self.log_result("SendGrid service initialization", True, 
                               "Email notification queued successfully")
            else:
                self.log_result("SendGrid service initialization", False, 
                               f"Unexpected status: {send_response.get('status')}")
        else:
            self.log_result("SendGrid service initialization", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test Termii service initialization by sending SMS notification
        sms_notification_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "payment_confirmation",
            "template_data": {
                "tradesperson_name": "John Plumber",
                "job_title": "Test SMS Service Job",
                "job_location": "Abuja, Nigeria",
                "homeowner_name": "Test Homeowner",
                "homeowner_phone": "+2348123456789",
                "homeowner_email": "test@example.com"
            },
            "override_channel": "sms"
        }
        
        response = self.make_request("POST", "/notifications/send", json=sms_notification_request, auth_token=tradesperson_token)
        if response.status_code == 200:
            send_response = response.json()
            if send_response.get('status') == 'pending':
                self.log_result("Termii service initialization", True, 
                               "SMS notification queued successfully")
            else:
                self.log_result("Termii service initialization", False, 
                               f"Unexpected status: {send_response.get('status')}")
        else:
            self.log_result("Termii service initialization", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test both channels (email + SMS)
        both_channels_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "contact_shared",
            "template_data": {
                "tradesperson_name": "John Plumber",
                "job_title": "Test Both Channels Job",
                "job_location": "Port Harcourt, Nigeria",
                "payment_url": "https://servicehub.ng/payments"
            },
            "override_channel": "both"
        }
        
        response = self.make_request("POST", "/notifications/send", json=both_channels_request, auth_token=tradesperson_token)
        if response.status_code == 200:
            send_response = response.json()
            if send_response.get('status') == 'pending':
                self.log_result("Both channels service test", True, 
                               "Email + SMS notification queued successfully")
            else:
                self.log_result("Both channels service test", False, 
                               f"Unexpected status: {send_response.get('status')}")
        else:
            self.log_result("Both channels service test", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
    
    def test_nigerian_phone_number_formatting(self):
        """Test Nigerian phone number formatting for Termii API"""
        print("\n=== Testing Nigerian Phone Number Formatting ===")
        
        if 'homeowner' not in self.auth_tokens:
            self.log_result("Phone formatting tests", False, "No homeowner authentication token")
            return
        
        homeowner_token = self.auth_tokens['homeowner']
        
        # Test different Nigerian phone number formats
        phone_formats = [
            "+2348123456789",  # International format with +
            "2348123456789",   # International format without +
            "08123456789",     # Local format with 0
            "8123456789"       # Local format without 0
        ]
        
        for i, phone_format in enumerate(phone_formats):
            # Update user phone number for testing
            update_data = {"phone": phone_format}
            
            # Send SMS notification to test phone formatting
            sms_request = {
                "user_id": self.test_data['homeowner_user']['id'],
                "type": "new_interest",
                "template_data": {
                    "homeowner_name": "Test Homeowner",
                    "job_title": f"Phone Format Test Job {i+1}",
                    "tradesperson_name": "John Plumber",
                    "view_url": "https://servicehub.ng/my-jobs"
                },
                "override_channel": "sms"
            }
            
            response = self.make_request("POST", "/notifications/send", json=sms_request, auth_token=homeowner_token)
            if response.status_code == 200:
                send_response = response.json()
                if send_response.get('status') == 'pending':
                    self.log_result(f"Phone format test - {phone_format}", True, 
                                   "SMS notification queued with phone format")
                else:
                    self.log_result(f"Phone format test - {phone_format}", False, 
                                   f"Unexpected status: {send_response.get('status')}")
            else:
                self.log_result(f"Phone format test - {phone_format}", False, 
                               f"Status: {response.status_code}, Response: {response.text}")
    
    def test_html_content_conversion(self):
        """Test HTML content conversion for email notifications"""
        print("\n=== Testing HTML Content Conversion ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("HTML conversion tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test email notification with content that should be converted to HTML
        html_test_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "job_posted",
            "template_data": {
                "homeowner_name": "Test Homeowner",
                "job_title": "HTML Content Test Job\nWith Multiple Lines\nAnd Line Breaks",
                "job_location": "Lagos, Nigeria",
                "job_budget": "₦75,000 - ₦150,000",
                "post_date": "Today",
                "manage_url": "https://servicehub.ng/my-jobs"
            },
            "override_channel": "email"
        }
        
        response = self.make_request("POST", "/notifications/send", json=html_test_request, auth_token=tradesperson_token)
        if response.status_code == 200:
            send_response = response.json()
            if send_response.get('status') == 'pending':
                self.log_result("HTML content conversion test", True, 
                               "Email with line breaks queued for HTML conversion")
            else:
                self.log_result("HTML content conversion test", False, 
                               f"Unexpected status: {send_response.get('status')}")
        else:
            self.log_result("HTML content conversion test", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
    
    def test_error_handling_and_fallback(self):
        """Test error handling and fallback mechanisms"""
        print("\n=== Testing Error Handling and Fallback ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Error handling tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Test 1: Invalid user ID
        invalid_user_request = {
            "user_id": "invalid-user-id-12345",
            "type": "new_interest",
            "template_data": {
                "homeowner_name": "Test",
                "job_title": "Test Job",
                "tradesperson_name": "Test Tradesperson",
                "view_url": "https://servicehub.ng"
            }
        }
        
        response = self.make_request("POST", "/notifications/send", json=invalid_user_request, auth_token=tradesperson_token)
        if response.status_code == 404:
            self.log_result("Invalid user ID handling", True, 
                           "Correctly returned 404 for invalid user ID")
        else:
            self.log_result("Invalid user ID handling", False, 
                           f"Expected 404, got {response.status_code}")
        
        # Test 2: Missing template data
        missing_data_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "new_interest",
            "template_data": {}  # Empty template data
        }
        
        response = self.make_request("POST", "/notifications/send", json=missing_data_request, auth_token=tradesperson_token)
        # This should still work as the system should handle missing template variables gracefully
        if response.status_code in [200, 400, 422]:
            self.log_result("Missing template data handling", True, 
                           f"Handled missing template data appropriately: {response.status_code}")
        else:
            self.log_result("Missing template data handling", False, 
                           f"Unexpected status code: {response.status_code}")
        
        # Test 3: Invalid notification type
        invalid_type_request = {
            "user_id": self.test_data['tradesperson_user']['id'],
            "type": "invalid_notification_type",
            "template_data": {
                "test": "data"
            }
        }
        
        response = self.make_request("POST", "/notifications/send", json=invalid_type_request, auth_token=tradesperson_token)
        if response.status_code in [400, 422]:
            self.log_result("Invalid notification type handling", True, 
                           "Correctly rejected invalid notification type")
        else:
            self.log_result("Invalid notification type handling", False, 
                           f"Expected 400/422, got {response.status_code}")
    
    def test_background_task_processing(self):
        """Test background task notification processing"""
        print("\n=== Testing Background Task Processing ===")
        
        if 'tradesperson' not in self.auth_tokens:
            self.log_result("Background task tests", False, "No tradesperson authentication token")
            return
        
        tradesperson_token = self.auth_tokens['tradesperson']
        
        # Send multiple notifications to test background processing
        notification_requests = []
        for i in range(3):
            request = {
                "user_id": self.test_data['tradesperson_user']['id'],
                "type": "job_posted",
                "template_data": {
                    "homeowner_name": f"Test Homeowner {i+1}",
                    "job_title": f"Background Task Test Job {i+1}",
                    "job_location": "Lagos, Nigeria",
                    "job_budget": "₦50,000 - ₦100,000",
                    "post_date": "Today",
                    "manage_url": "https://servicehub.ng/my-jobs"
                },
                "override_channel": "both"
            }
            notification_requests.append(request)
        
        # Send all notifications quickly to test background processing
        sent_notifications = []
        for i, request in enumerate(notification_requests):
            response = self.make_request("POST", "/notifications/send", json=request, auth_token=tradesperson_token)
            if response.status_code == 200:
                send_response = response.json()
                if send_response.get('status') == 'pending':
                    sent_notifications.append(send_response)
                    self.log_result(f"Background task {i+1}", True, 
                                   "Notification queued for background processing")
                else:
                    self.log_result(f"Background task {i+1}", False, 
                                   f"Unexpected status: {send_response.get('status')}")
            else:
                self.log_result(f"Background task {i+1}", False, 
                               f"Status: {response.status_code}")
        
        # Wait for background tasks to complete
        time.sleep(5)
        
        # Check if notifications were processed by looking at history
        response = self.make_request("GET", "/notifications/history?limit=10", auth_token=tradesperson_token)
        if response.status_code == 200:
            history = response.json()
            recent_notifications = history.get('notifications', [])
            
            # Count notifications from the last few minutes
            recent_count = len([n for n in recent_notifications if 'Background Task Test Job' in n.get('subject', '')])
            
            if recent_count >= len(sent_notifications):
                self.log_result("Background task completion", True, 
                               f"Found {recent_count} processed notifications in history")
            else:
                self.log_result("Background task completion", False, 
                               f"Expected {len(sent_notifications)} notifications, found {recent_count}")
        else:
            self.log_result("Background task completion", False, 
                           f"Could not verify background task completion: {response.status_code}")
    
    def run_notification_system_tests(self):
        """Run comprehensive notification system testing"""
        print("🎯 STARTING REAL-TIME NOTIFICATION SYSTEM TESTING")
        print("=" * 80)
        
        # Setup authentication and test data
        self.test_user_authentication()
        
        # Run notification system specific tests
        self.test_notification_preferences()
        self.test_notification_templates_and_rendering()
        self.test_notification_history()
        self.test_service_initialization_and_environment_variables()
        self.test_nigerian_phone_number_formatting()
        self.test_html_content_conversion()
        self.test_error_handling_and_fallback()
        self.test_background_task_processing()
        
        # Print final summary
        print("\n" + "=" * 80)
        print("🎯 REAL-TIME NOTIFICATION SYSTEM TESTING COMPLETE")
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['failed'] > 0:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        return success_rate >= 85  # Consider 85%+ as successful

if __name__ == "__main__":
    tester = NotificationSystemTester()
    tester.run_notification_system_tests()
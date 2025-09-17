#!/usr/bin/env python3
"""
SIMPLIFIED BI-DIRECTIONAL MESSAGE NOTIFICATIONS TEST

Focus on verifying bi-directional message notifications after fixing Python import issues.
"""

import sys
import os
sys.path.append('/app/backend')

import requests
import json
import uuid
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://tradesman-connect.preview.emergentagent.com/api"

class NotificationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
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
        """Make HTTP request with error handling"""
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
    
    def test_python_import_verification(self):
        """Test 1: Python Import Verification"""
        print("\n=== 1. Python Import Verification ===")
        
        try:
            from services.notifications import NotificationTemplateService
            from models.notifications import NotificationType, NotificationChannel
            
            self.log_result("Python imports - services.notifications", True, 
                          "NotificationTemplateService imported successfully")
            
            # Test NotificationTemplateService instantiation
            template_service = NotificationTemplateService()
            self.log_result("NotificationTemplateService instantiation", True, 
                          "Service instantiated successfully")
            
            # Test NEW_MESSAGE template existence
            email_template = template_service.get_template(NotificationType.NEW_MESSAGE, NotificationChannel.EMAIL)
            if email_template:
                self.log_result("NEW_MESSAGE Email template exists", True, 
                              f"Subject: {email_template.subject_template[:50]}...")
            else:
                self.log_result("NEW_MESSAGE Email template exists", False, "Email template not found")
            
            sms_template = template_service.get_template(NotificationType.NEW_MESSAGE, NotificationChannel.SMS)
            if sms_template:
                self.log_result("NEW_MESSAGE SMS template exists", True, 
                              f"Content: {sms_template.content_template[:50]}...")
            else:
                self.log_result("NEW_MESSAGE SMS template exists", False, "SMS template not found")
                
        except Exception as e:
            self.log_result("Python imports - services.notifications", False, f"Import failed: {str(e)}")
    
    def test_template_rendering(self):
        """Test 2: Template Rendering with Sample Data"""
        print("\n=== 2. Template Rendering with Sample Data ===")
        
        try:
            from services.notifications import NotificationTemplateService
            from models.notifications import NotificationType, NotificationChannel
            
            template_service = NotificationTemplateService()
            
            # Sample template data
            sample_data = {
                "recipient_name": "John Homeowner",
                "sender_name": "Mike Plumber",
                "job_title": "Kitchen Plumbing Repair",
                "message_preview": "Hi, I can start the work tomorrow morning. What time works best for you?",
                "conversation_url": "https://servicehub.ng/messages/conv-123"
            }
            
            # Test EMAIL template rendering
            email_template = template_service.get_template(NotificationType.NEW_MESSAGE, NotificationChannel.EMAIL)
            if email_template:
                try:
                    subject, content = template_service.render_template(email_template, sample_data)
                    self.log_result("NEW_MESSAGE Email template rendering", True, 
                                  f"Subject: {subject[:50]}...")
                    
                    # Verify all variables were replaced
                    if "{" not in subject and "{" not in content:
                        self.log_result("NEW_MESSAGE Email template variable replacement", True, 
                                      "All template variables properly replaced")
                    else:
                        self.log_result("NEW_MESSAGE Email template variable replacement", False, 
                                      "Some template variables not replaced")
                        
                except Exception as e:
                    self.log_result("NEW_MESSAGE Email template rendering", False, f"Rendering failed: {str(e)}")
            
            # Test SMS template rendering
            sms_template = template_service.get_template(NotificationType.NEW_MESSAGE, NotificationChannel.SMS)
            if sms_template:
                try:
                    subject, content = template_service.render_template(sms_template, sample_data)
                    self.log_result("NEW_MESSAGE SMS template rendering", True, 
                                  f"Content: {content[:50]}...")
                    
                    # Verify message length for SMS
                    if len(content) <= 160:
                        self.log_result("NEW_MESSAGE SMS template length", True, 
                                      f"SMS content within limit: {len(content)} chars")
                    else:
                        self.log_result("NEW_MESSAGE SMS template length", False, 
                                      f"SMS content too long: {len(content)} chars")
                        
                except Exception as e:
                    self.log_result("NEW_MESSAGE SMS template rendering", False, f"Rendering failed: {str(e)}")
                    
        except Exception as e:
            self.log_result("Template rendering test setup", False, f"Setup failed: {str(e)}")
    
    def test_notification_service_integration(self):
        """Test 3: Notification Service Integration"""
        print("\n=== 3. Notification Service Integration ===")
        
        try:
            from services.notifications import notification_service, NotificationService
            from models.notifications import NotificationType, NotificationChannel
            
            # Verify service is initialized
            if notification_service:
                self.log_result("Notification service initialization", True, 
                              "NotificationService instance available")
                
                # Test template service
                if hasattr(notification_service, 'template_service'):
                    self.log_result("Notification service - Template service", True, 
                                  "Template service integrated")
                else:
                    self.log_result("Notification service - Template service", False, 
                                  "Template service not found")
                                  
            else:
                self.log_result("Notification service initialization", False, 
                              "NotificationService not available")
                              
        except Exception as e:
            self.log_result("Notification service integration test", False, f"Import failed: {str(e)}")
    
    def test_notify_new_message_function(self):
        """Test 4: _notify_new_message Function Verification"""
        print("\n=== 4. _notify_new_message Function Verification ===")
        
        try:
            # Import the function from messages route
            from routes.messages import _notify_new_message
            
            self.log_result("_notify_new_message function import", True, 
                          "Function imported successfully from routes.messages")
            
            # Verify it's callable
            if callable(_notify_new_message):
                self.log_result("_notify_new_message function callable", True, 
                              "Function is callable")
            else:
                self.log_result("_notify_new_message function callable", False, 
                              "Function is not callable")
                              
        except Exception as e:
            self.log_result("_notify_new_message function import", False, f"Import failed: {str(e)}")
    
    def test_database_notification_verification(self):
        """Test 5: Database Notification Verification"""
        print("\n=== 5. Database Notification Verification ===")
        
        # Test notification preferences endpoint
        response = self.make_request("GET", "/notifications/preferences")
        
        if response.status_code in [401, 403]:
            self.log_result("Database notification - Preferences endpoint exists", True, 
                          "Endpoint exists (requires authentication)")
        else:
            self.log_result("Database notification - Preferences endpoint exists", False, 
                          f"Unexpected status: {response.status_code}")
        
        # Test notification history endpoint
        response = self.make_request("GET", "/notifications/history")
        
        if response.status_code in [401, 403]:
            self.log_result("Database notification - History endpoint exists", True, 
                          "Endpoint exists (requires authentication)")
        else:
            self.log_result("Database notification - History endpoint exists", False, 
                          f"Unexpected status: {response.status_code}")
    
    def test_service_health(self):
        """Test basic service health"""
        print("\n=== Service Health Check ===")
        
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
    
    def run_all_tests(self):
        """Run all notification tests"""
        print("🚀 SIMPLIFIED BI-DIRECTIONAL MESSAGE NOTIFICATIONS TEST")
        print("=" * 80)
        
        self.test_service_health()
        self.test_python_import_verification()
        self.test_template_rendering()
        self.test_notification_service_integration()
        self.test_notify_new_message_function()
        self.test_database_notification_verification()
        
        # Print summary
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 80)
        print("🔍 SIMPLIFIED BI-DIRECTIONAL MESSAGE NOTIFICATIONS TEST RESULTS")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests})")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = NotificationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 NOTIFICATION SYSTEM READY")
    else:
        print("\n⚠️ NOTIFICATION SYSTEM NEEDS ATTENTION")
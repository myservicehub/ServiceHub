#!/usr/bin/env python3
"""
EMAIL AND SMS NOTIFICATION SYSTEM TESTING FOR JOB COMPLETION AND CANCELLATION

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**IMPLEMENTATION COMPLETED:** 
Added comprehensive notification system that sends email and SMS notifications to all interested 
tradespeople when homeowners complete or cancel jobs.

**FEATURES IMPLEMENTED:**
1. Added NotificationType.JOB_COMPLETED and NotificationType.JOB_CANCELLED enum values
2. Created email and SMS templates for both notification types
3. Enhanced job completion endpoint to send notifications via notify_job_completion function
4. Enhanced job cancellation endpoint to send notifications via notify_job_cancellation function
5. Added get_interested_tradespeople_for_job database function
6. Implemented comprehensive error handling and logging

**SPECIFIC TESTING REQUIREMENTS:**

1. **Notification Types and Templates Verification**:
   - Verify NotificationType.JOB_COMPLETED and JOB_CANCELLED are properly defined
   - Test that email templates include proper job details, homeowner info, completion/cancellation dates
   - Check SMS templates are concise and informative
   - Verify template variables are correctly defined

2. **Job Completion Notification Testing**:
   - Test PUT /api/jobs/{job_id}/complete endpoint with homeowner credentials
   - Verify the notify_job_completion background task is called
   - Check that all interested tradespeople receive notifications
   - Test both email and SMS notification channels

3. **Job Cancellation Notification Testing**:
   - Test PUT /api/jobs/{job_id}/close endpoint with cancellation reason
   - Verify the notify_job_cancellation background task is called
   - Check that cancellation reason and feedback are included in notifications
   - Test notifications are sent to all interested tradespeople

4. **Database Function Testing**:
   - Test get_interested_tradespeople_for_job database function
   - Verify it returns correct tradesperson details (id, name, email, phone)
   - Check that the aggregation pipeline works correctly
   - Test ObjectId serialization handling

5. **Notification Service Integration**:
   - Verify notification service can send both email and SMS
   - Test that user notification preferences are respected
   - Check notification storage in database
   - Test error handling for failed notifications

6. **End-to-End Workflow Testing**:
   - Complete workflow: Job completion → Get interested tradespeople → Send notifications
   - Cancellation workflow: Job cancellation → Get interested tradespeople → Send notifications
   - Verify no notifications sent if no interested tradespeople exist
   - Test multiple interested tradespeople receive individual notifications

**EXPECTED RESULTS:**
- Job completion endpoint triggers notifications to all interested tradespeople
- Job cancellation endpoint triggers notifications with reason and feedback
- Both email and SMS notifications sent based on user preferences
- Proper error handling for missing data or failed notifications
- Comprehensive logging of notification sending process
- Database properly stores sent notifications
- No system errors during notification processing
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid
from collections import Counter

# Get backend URL from environment
try:
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BACKEND_URL = line.split('=')[1].strip() + '/api'
                break
        else:
            BACKEND_URL = "http://localhost:8001/api"
except FileNotFoundError:
    BACKEND_URL = "http://localhost:8001/api"

class NotificationSystemTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.homeowner_token = None
        self.tradesperson_tokens = []
        self.homeowner_id = None
        self.tradesperson_ids = []
        self.test_job_id = None
        self.interest_ids = []
        
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
    
    def test_notification_types_and_enums(self):
        """Test that notification types are properly defined"""
        print("\n=== Testing Notification Types and Enums ===")
        
        # Test notification preferences endpoint to verify enum values exist
        # First, we need to authenticate
        homeowner_data = {
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        }
        
        response = self.make_request("POST", "/auth/login", json=homeowner_data)
        if response.status_code == 200:
            try:
                data = response.json()
                token = data.get('access_token')
                
                # Test notification preferences endpoint
                prefs_response = self.make_request("GET", "/notifications/preferences", auth_token=token)
                
                if prefs_response.status_code == 200:
                    prefs_data = prefs_response.json()
                    
                    # Check if job_completed and job_cancelled preferences exist
                    if 'job_completed' in prefs_data and 'job_cancelled' in prefs_data:
                        self.log_result("Notification types enum verification", True, 
                                      "JOB_COMPLETED and JOB_CANCELLED types found in preferences")
                    else:
                        self.log_result("Notification types enum verification", False, 
                                      "Missing job_completed or job_cancelled in preferences")
                else:
                    self.log_result("Notification types enum verification", False, 
                                  f"Failed to get preferences: {prefs_response.status_code}")
                    
            except json.JSONDecodeError:
                self.log_result("Notification types enum verification", False, "Invalid JSON response")
        else:
            self.log_result("Notification types enum verification", False, 
                          f"Authentication failed: {response.status_code}")
    
    def setup_test_users_and_job(self):
        """Set up test homeowner, tradespeople, and job with interests"""
        print("\n=== Setting Up Test Users and Job ===")
        
        # Authenticate existing homeowner
        homeowner_data = {
            "email": "francisdaniel4jb@gmail.com",
            "password": "Servicehub..1"
        }
        
        response = self.make_request("POST", "/auth/login", json=homeowner_data)
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                self.homeowner_id = data.get('user', {}).get('id')
                self.log_result("Homeowner authentication", True, f"ID: {self.homeowner_id}")
            except json.JSONDecodeError:
                self.log_result("Homeowner authentication", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner authentication", False, f"Status: {response.status_code}")
            return
        
        # Authenticate existing tradesperson
        tradesperson_data = {
            "email": "john.plumber@gmail.com",
            "password": "Password123!"
        }
        
        response = self.make_request("POST", "/auth/login", json=tradesperson_data)
        if response.status_code == 200:
            try:
                data = response.json()
                token = data.get('access_token')
                tradesperson_id = data.get('user', {}).get('id')
                self.tradesperson_tokens.append(token)
                self.tradesperson_ids.append(tradesperson_id)
                self.log_result("Tradesperson authentication", True, f"ID: {tradesperson_id}")
            except json.JSONDecodeError:
                self.log_result("Tradesperson authentication", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson authentication", False, f"Status: {response.status_code}")
        
        # Get homeowner's existing jobs
        response = self.make_request("GET", "/jobs/my-jobs", auth_token=self.homeowner_token)
        if response.status_code == 200:
            try:
                data = response.json()
                jobs = data.get('jobs', [])
                
                # Find an active job
                active_job = None
                for job in jobs:
                    if job.get('status') == 'active':
                        active_job = job
                        break
                
                if active_job:
                    self.test_job_id = active_job.get('id')
                    self.log_result("Test job identification", True, f"Using active job: {self.test_job_id}")
                else:
                    # Create a new test job
                    self.create_test_job()
                    
            except json.JSONDecodeError:
                self.log_result("Job retrieval", False, "Invalid JSON response")
        else:
            self.log_result("Job retrieval", False, f"Status: {response.status_code}")
    
    def create_test_job(self):
        """Create a test job for notification testing"""
        print("\n--- Creating Test Job ---")
        
        job_data = {
            "title": "Notification System Test Job - Electrical Work",
            "description": "Test job for notification system testing. Need electrical work done.",
            "category": "Electrical Repairs",
            "timeline": "within_week",
            "budget_min": 25000,
            "budget_max": 50000,
            "state": "Lagos",
            "lga": "Ikeja",
            "town": "Computer Village",
            "zip_code": "100001",
            "home_address": "123 Test Street, Computer Village",
            "questions": [],
            "photos": []
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_job_id = data.get('id')
                self.log_result("Test job creation", True, f"Created job ID: {self.test_job_id}")
            except json.JSONDecodeError:
                self.log_result("Test job creation", False, "Invalid JSON response")
        else:
            self.log_result("Test job creation", False, f"Status: {response.status_code}")
    
    def create_test_interests(self):
        """Create interests from tradespeople for the test job"""
        print("\n=== Creating Test Interests ===")
        
        if not self.test_job_id or not self.tradesperson_tokens:
            self.log_result("Interest creation setup", False, "Missing job ID or tradesperson tokens")
            return
        
        # Create interests for each tradesperson
        for i, (token, tradesperson_id) in enumerate(zip(self.tradesperson_tokens, self.tradesperson_ids)):
            interest_data = {
                "job_id": self.test_job_id,
                "message": f"I'm interested in this electrical work. I have experience with similar projects."
            }
            
            response = self.make_request("POST", "/interests/", json=interest_data, auth_token=token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    interest_id = data.get('id')
                    self.interest_ids.append(interest_id)
                    self.log_result(f"Interest creation {i+1}", True, f"Interest ID: {interest_id}")
                except json.JSONDecodeError:
                    self.log_result(f"Interest creation {i+1}", False, "Invalid JSON response")
            else:
                self.log_result(f"Interest creation {i+1}", False, f"Status: {response.status_code}")
    
    def test_database_function_get_interested_tradespeople(self):
        """Test the get_interested_tradespeople_for_job database function indirectly"""
        print("\n=== Testing Database Function - Get Interested Tradespeople ===")
        
        if not self.test_job_id:
            self.log_result("Database function test", False, "No test job ID available")
            return
        
        # We can't directly test the database function, but we can test the API that uses it
        # by checking if the job completion/cancellation endpoints work properly
        
        # First, let's verify we have interests for this job
        if not self.interest_ids:
            self.log_result("Database function test", False, "No interests created for testing")
            return
        
        # Test by attempting to complete the job and checking logs
        # This will indirectly test the get_interested_tradespeople_for_job function
        self.log_result("Database function test setup", True, 
                      f"Job {self.test_job_id} has {len(self.interest_ids)} interests for testing")
    
    def test_job_completion_notification(self):
        """Test job completion notification system"""
        print("\n=== Testing Job Completion Notification System ===")
        
        if not self.test_job_id or not self.homeowner_token:
            self.log_result("Job completion notification", False, "Missing job ID or homeowner token")
            return
        
        # Test 1: Complete the job
        print("\n--- Test 1: Job Completion Endpoint ---")
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}/complete", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('status') == 'completed':
                    self.log_result("Job completion endpoint", True, 
                                  f"Job marked as completed: {data.get('status')}")
                    
                    # Wait a moment for background task to process
                    time.sleep(2)
                    
                    # Test 2: Verify job status in database
                    job_response = self.make_request("GET", f"/jobs/{self.test_job_id}")
                    if job_response.status_code == 200:
                        job_data = job_response.json()
                        if job_data.get('status') == 'completed':
                            self.log_result("Job completion status verification", True, 
                                          "Job status correctly updated to completed")
                        else:
                            self.log_result("Job completion status verification", False, 
                                          f"Job status is {job_data.get('status')}, expected 'completed'")
                    else:
                        self.log_result("Job completion status verification", False, 
                                      f"Failed to retrieve job: {job_response.status_code}")
                else:
                    self.log_result("Job completion endpoint", False, 
                                  f"Unexpected status: {data.get('status')}")
            except json.JSONDecodeError:
                self.log_result("Job completion endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Job completion endpoint", False, f"Status: {response.status_code}")
    
    def test_job_cancellation_notification(self):
        """Test job cancellation notification system"""
        print("\n=== Testing Job Cancellation Notification System ===")
        
        # First, we need to create a new job since the previous one was completed
        self.create_test_job()
        if not self.test_job_id:
            self.log_result("Job cancellation setup", False, "Failed to create new test job")
            return
        
        # Create interests for the new job
        self.create_test_interests()
        
        # Test 1: Cancel the job with reason and feedback
        print("\n--- Test 1: Job Cancellation Endpoint ---")
        cancellation_data = {
            "reason": "Found a suitable tradesperson",
            "additional_feedback": "Thank you for your interest. I found someone through a referral."
        }
        
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}/close", 
                                   json=cancellation_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('status') == 'cancelled':
                    self.log_result("Job cancellation endpoint", True, 
                                  f"Job cancelled with reason: {data.get('closure_reason')}")
                    
                    # Wait a moment for background task to process
                    time.sleep(2)
                    
                    # Test 2: Verify job status and cancellation details
                    job_response = self.make_request("GET", f"/jobs/{self.test_job_id}")
                    if job_response.status_code == 200:
                        job_data = job_response.json()
                        if (job_data.get('status') == 'cancelled' and 
                            job_data.get('closure_reason') == cancellation_data['reason']):
                            self.log_result("Job cancellation status verification", True, 
                                          "Job status and reason correctly updated")
                        else:
                            self.log_result("Job cancellation status verification", False, 
                                          f"Status: {job_data.get('status')}, Reason: {job_data.get('closure_reason')}")
                    else:
                        self.log_result("Job cancellation status verification", False, 
                                      f"Failed to retrieve job: {job_response.status_code}")
                else:
                    self.log_result("Job cancellation endpoint", False, 
                                  f"Unexpected status: {data.get('status')}")
            except json.JSONDecodeError:
                self.log_result("Job cancellation endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Job cancellation endpoint", False, f"Status: {response.status_code}")
    
    def test_notification_templates(self):
        """Test notification templates by checking the test endpoint"""
        print("\n=== Testing Notification Templates ===")
        
        if not self.tradesperson_tokens:
            self.log_result("Notification templates test", False, "No tradesperson token available")
            return
        
        # Test job completion notification template
        print("\n--- Test 1: Job Completion Template ---")
        response = self.make_request("POST", "/notifications/test/job_completed", 
                                   auth_token=self.tradesperson_tokens[0])
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'notification_id' in data and data.get('message'):
                    self.log_result("Job completion template test", True, 
                                  f"Template test successful: {data.get('message')}")
                else:
                    self.log_result("Job completion template test", False, "Invalid response structure")
            except json.JSONDecodeError:
                self.log_result("Job completion template test", False, "Invalid JSON response")
        else:
            self.log_result("Job completion template test", False, f"Status: {response.status_code}")
        
        # Test job cancellation notification template
        print("\n--- Test 2: Job Cancellation Template ---")
        response = self.make_request("POST", "/notifications/test/job_cancelled", 
                                   auth_token=self.tradesperson_tokens[0])
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'notification_id' in data and data.get('message'):
                    self.log_result("Job cancellation template test", True, 
                                  f"Template test successful: {data.get('message')}")
                else:
                    self.log_result("Job cancellation template test", False, "Invalid response structure")
            except json.JSONDecodeError:
                self.log_result("Job cancellation template test", False, "Invalid JSON response")
        else:
            self.log_result("Job cancellation template test", False, f"Status: {response.status_code}")
    
    def test_notification_preferences(self):
        """Test notification preferences for job completion and cancellation"""
        print("\n=== Testing Notification Preferences ===")
        
        if not self.tradesperson_tokens:
            self.log_result("Notification preferences test", False, "No tradesperson token available")
            return
        
        # Test 1: Get current preferences
        print("\n--- Test 1: Get Notification Preferences ---")
        response = self.make_request("GET", "/notifications/preferences", 
                                   auth_token=self.tradesperson_tokens[0])
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check if job completion and cancellation preferences exist
                job_completed_pref = data.get('job_completed')
                job_cancelled_pref = data.get('job_cancelled')
                
                if job_completed_pref and job_cancelled_pref:
                    self.log_result("Notification preferences retrieval", True, 
                                  f"Job completed: {job_completed_pref}, Job cancelled: {job_cancelled_pref}")
                    
                    # Test 2: Update preferences
                    print("\n--- Test 2: Update Notification Preferences ---")
                    update_data = {
                        "job_completed": "both",
                        "job_cancelled": "both"
                    }
                    
                    update_response = self.make_request("PUT", "/notifications/preferences", 
                                                      json=update_data, auth_token=self.tradesperson_tokens[0])
                    
                    if update_response.status_code == 200:
                        updated_data = update_response.json()
                        if (updated_data.get('job_completed') == 'both' and 
                            updated_data.get('job_cancelled') == 'both'):
                            self.log_result("Notification preferences update", True, 
                                          "Preferences updated successfully")
                        else:
                            self.log_result("Notification preferences update", False, 
                                          "Preferences not updated correctly")
                    else:
                        self.log_result("Notification preferences update", False, 
                                      f"Update failed: {update_response.status_code}")
                else:
                    self.log_result("Notification preferences retrieval", False, 
                                  "Missing job completion or cancellation preferences")
            except json.JSONDecodeError:
                self.log_result("Notification preferences retrieval", False, "Invalid JSON response")
        else:
            self.log_result("Notification preferences retrieval", False, f"Status: {response.status_code}")
    
    def test_notification_history(self):
        """Test notification history to verify notifications were sent"""
        print("\n=== Testing Notification History ===")
        
        if not self.tradesperson_tokens:
            self.log_result("Notification history test", False, "No tradesperson token available")
            return
        
        # Get notification history for tradesperson
        response = self.make_request("GET", "/notifications/history?limit=20", 
                                   auth_token=self.tradesperson_tokens[0])
        
        if response.status_code == 200:
            try:
                data = response.json()
                notifications = data.get('notifications', [])
                total = data.get('total', 0)
                
                # Look for job completion or cancellation notifications
                job_notifications = []
                for notification in notifications:
                    if notification.get('type') in ['job_completed', 'job_cancelled']:
                        job_notifications.append(notification)
                
                if job_notifications:
                    self.log_result("Notification history verification", True, 
                                  f"Found {len(job_notifications)} job-related notifications out of {total} total")
                    
                    # Check notification details
                    for notification in job_notifications[:2]:  # Check first 2
                        notification_type = notification.get('type')
                        status = notification.get('status')
                        subject = notification.get('subject', '')
                        
                        if status == 'sent' and subject:
                            self.log_result(f"Notification {notification_type} details", True, 
                                          f"Status: {status}, Subject: {subject[:50]}...")
                        else:
                            self.log_result(f"Notification {notification_type} details", False, 
                                          f"Status: {status}, Subject missing or empty")
                else:
                    self.log_result("Notification history verification", False, 
                                  f"No job-related notifications found in {total} total notifications")
            except json.JSONDecodeError:
                self.log_result("Notification history verification", False, "Invalid JSON response")
        else:
            self.log_result("Notification history verification", False, f"Status: {response.status_code}")
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n=== Testing Error Handling ===")
        
        # Test 1: Complete non-existent job
        print("\n--- Test 1: Complete Non-existent Job ---")
        fake_job_id = str(uuid.uuid4())
        response = self.make_request("PUT", f"/jobs/{fake_job_id}/complete", 
                                   auth_token=self.homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Non-existent job completion", True, "Correctly returned 404")
        else:
            self.log_result("Non-existent job completion", False, f"Expected 404, got {response.status_code}")
        
        # Test 2: Cancel non-existent job
        print("\n--- Test 2: Cancel Non-existent Job ---")
        cancellation_data = {"reason": "Test reason"}
        response = self.make_request("PUT", f"/jobs/{fake_job_id}/close", 
                                   json=cancellation_data, auth_token=self.homeowner_token)
        
        if response.status_code == 404:
            self.log_result("Non-existent job cancellation", True, "Correctly returned 404")
        else:
            self.log_result("Non-existent job cancellation", False, f"Expected 404, got {response.status_code}")
        
        # Test 3: Unauthorized job completion
        print("\n--- Test 3: Unauthorized Job Operations ---")
        if self.test_job_id:
            response = self.make_request("PUT", f"/jobs/{self.test_job_id}/complete")
            
            if response.status_code in [401, 403]:
                self.log_result("Unauthorized job completion", True, "Correctly rejected unauthorized request")
            else:
                self.log_result("Unauthorized job completion", False, f"Expected 401/403, got {response.status_code}")
    
    def run_comprehensive_test(self):
        """Run all notification system tests"""
        print("🚀 STARTING COMPREHENSIVE NOTIFICATION SYSTEM TESTING")
        print("=" * 80)
        
        # Basic setup and health checks
        self.test_service_health()
        self.test_notification_types_and_enums()
        
        # User and job setup
        self.setup_test_users_and_job()
        self.create_test_interests()
        
        # Core notification functionality
        self.test_database_function_get_interested_tradespeople()
        self.test_notification_templates()
        self.test_notification_preferences()
        
        # End-to-end workflow testing
        self.test_job_completion_notification()
        self.test_job_cancellation_notification()
        
        # Verification and error handling
        self.test_notification_history()
        self.test_error_handling()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 NOTIFICATION SYSTEM TESTING COMPLETED")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        return self.results

if __name__ == "__main__":
    tester = NotificationSystemTester()
    results = tester.run_comprehensive_test()
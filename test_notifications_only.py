#!/usr/bin/env python3
"""
Quick Notification System Test for Phase 4
"""

import requests
import json
import uuid

BACKEND_URL = "https://api.myservicehub.co/api"

def test_notifications():
    print("🚀 Testing Phase 4: Mock Notifications System")
    
    # Register and login a homeowner
    homeowner_data = {
        "name": "Test Homeowner",
        "email": f"homeowner.{uuid.uuid4().hex[:8]}@test.com",
        "password": "TestPass123",
        "phone": "08123456789",
        "location": "Lagos, Lagos State",
        "postcode": "100001"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/register/homeowner", json=homeowner_data)
    if response.status_code != 200:
        print(f"❌ Homeowner registration failed: {response.status_code}")
        return
    
    # Login homeowner
    login_response = requests.post(f"{BACKEND_URL}/auth/login", 
                                 json={"email": homeowner_data["email"], "password": homeowner_data["password"]})
    if login_response.status_code != 200:
        print(f"❌ Homeowner login failed: {login_response.status_code}")
        return
    
    homeowner_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {homeowner_token}"}
    
    print("✅ Homeowner authenticated")
    
    # Test 1: Get notification preferences
    response = requests.get(f"{BACKEND_URL}/notifications/preferences", headers=headers)
    if response.status_code == 200:
        print("✅ Get notification preferences: PASSED")
        preferences = response.json()
        print(f"   Default preferences: {preferences['new_interest']}, {preferences['job_posted']}")
    else:
        print(f"❌ Get notification preferences: FAILED - {response.status_code}")
        return
    
    # Test 2: Update notification preferences
    updates = {"new_interest": "email", "job_posted": "both"}
    response = requests.put(f"{BACKEND_URL}/notifications/preferences", json=updates, headers=headers)
    if response.status_code == 200:
        print("✅ Update notification preferences: PASSED")
    else:
        print(f"❌ Update notification preferences: FAILED - {response.status_code}")
    
    # Test 3: Test notification delivery
    response = requests.post(f"{BACKEND_URL}/notifications/test/job_posted", headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Test JOB_POSTED notification: PASSED - ID: {result['notification_id']}")
    else:
        print(f"❌ Test JOB_POSTED notification: FAILED - {response.status_code}")
    
    # Test 4: Get notification history
    response = requests.get(f"{BACKEND_URL}/notifications/history?limit=5", headers=headers)
    if response.status_code == 200:
        history = response.json()
        print(f"✅ Get notification history: PASSED - Found {len(history['notifications'])} notifications")
        if len(history['notifications']) > 0:
            notification = history['notifications'][0]
            print(f"   Latest notification: {notification['type']} via {notification['channel']}")
    else:
        print(f"❌ Get notification history: FAILED - {response.status_code}")
    
    # Test 5: Create a job (should trigger JOB_POSTED notification)
    job_data = {
        "title": "Test Plumbing Job for Notifications",
        "description": "This is a test job to verify that job posting triggers notifications correctly. We need a plumber to fix a leaking pipe in our bathroom.",
        "category": "Plumbing",
        "location": "Lagos, Nigeria",
        "postcode": "100001",
        "budget_min": 50000,
        "budget_max": 100000,
        "timeline": "Within 1 week",
        "homeowner_name": homeowner_data["name"],
        "homeowner_email": homeowner_data["email"],
        "homeowner_phone": homeowner_data["phone"]
    }
    
    response = requests.post(f"{BACKEND_URL}/jobs/", json=job_data, headers=headers)
    if response.status_code == 200:
        job = response.json()
        print(f"✅ Job creation: PASSED - Job ID: {job['id']} (should trigger notification)")
        
        # Wait a moment for background task
        import time
        time.sleep(2)
        
        # Check if notification was created
        response = requests.get(f"{BACKEND_URL}/notifications/history?limit=10", headers=headers)
        if response.status_code == 200:
            history = response.json()
            job_posted_notifications = [n for n in history['notifications'] if n['type'] == 'job_posted']
            if len(job_posted_notifications) >= 2:  # Should have at least 2 now (test + workflow)
                print("✅ Workflow integration: PASSED - Job posting triggered notification")
            else:
                print(f"⚠️  Workflow integration: Partial - Found {len(job_posted_notifications)} job_posted notifications")
    else:
        print(f"❌ Job creation: FAILED - {response.status_code}")
    
    print("\n🎉 Phase 4 Notification System Test Complete!")

if __name__ == "__main__":
    test_notifications()
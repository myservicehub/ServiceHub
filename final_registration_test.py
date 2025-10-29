#!/usr/bin/env python3
"""
FINAL TRADESPERSON REGISTRATION TEST

Test the exact frontend data format with a unique email to confirm registration works.
"""

import requests
import json
import uuid

# Get backend URL from environment
import os
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8001/api")

def test_frontend_registration():
    """Test registration with exact frontend data format but unique email"""
    
    # Exact data format from the review request with unique email
    frontend_data = {
        "name": "John FinalTestUser",
        "email": f"john.finaltest.{uuid.uuid4().hex[:8]}@example.com",  # Unique email
        "password": "TestPass123!",
        "phone": "+2348012345678",
        "location": "Lagos",
        "postcode": "000000",
        "trade_categories": ["Plumbing"],
        "experience_years": 4,
        "company_name": "Final Auth Test Services",
        "description": "Professional tradesperson providing excellent services to customers. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services.",
        "certifications": []
    }
    
    print("🔍 TESTING FRONTEND DATA FORMAT WITH UNIQUE EMAIL")
    print("=" * 60)
    print(f"Data being sent:")
    print(json.dumps(frontend_data, indent=2))
    
    # Make the request
    url = f"{BACKEND_URL}/auth/register/tradesperson"
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, json=frontend_data, headers=headers)
        
        print(f"\nResponse Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Body:")
            print(json.dumps(response_data, indent=2))
        except json.JSONDecodeError:
            print(f"Response Body (Raw Text): {response.text}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS: Registration completed successfully!")
            print(f"✅ User ID: {response_data.get('user', {}).get('id')}")
            print(f"✅ JWT Token: {response_data.get('access_token')[:50]}...")
            print(f"✅ User Role: {response_data.get('user', {}).get('role')}")
            return True
        elif response.status_code == 400:
            print(f"\n❌ 400 Bad Request Error:")
            print(f"❌ Error: {response.text}")
            return False
        else:
            print(f"\n❌ Unexpected Status Code: {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Request Failed: {e}")
        return False

if __name__ == "__main__":
    success = test_frontend_registration()
    
    print("\n" + "=" * 60)
    print("🎯 FINAL TEST RESULT")
    print("=" * 60)
    
    if success:
        print("✅ CONCLUSION: The tradesperson registration endpoint is working correctly!")
        print("✅ The frontend data format is valid and accepted by the backend.")
        print("✅ The 400 Bad Request error was caused by using an already registered email.")
        print("✅ SOLUTION: Use unique email addresses for each registration attempt.")
    else:
        print("❌ CONCLUSION: There are still issues with the registration endpoint.")
        print("❌ Further investigation needed.")
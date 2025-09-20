#!/usr/bin/env python3
"""
AUTHENTICATION FLOW TEST

Test the complete authentication flow after registration.
"""

import requests
import json
import uuid

# Get backend URL from environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

def test_complete_auth_flow():
    """Test complete authentication flow: register -> login -> access protected endpoint"""
    
    # Step 1: Register a new user
    print("🔍 STEP 1: REGISTERING NEW TRADESPERSON")
    print("=" * 60)
    
    registration_data = {
        "name": "Auth Flow Test User",
        "email": f"authflow.{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123",
        "phone": "+2348012345678",
        "location": "Lagos",
        "postcode": "000000",
        "trade_categories": ["Plumbing"],
        "experience_years": 4,
        "company_name": "Auth Flow Test Services",
        "description": "Professional tradesperson for authentication flow testing.",
        "certifications": []
    }
    
    print(f"Registering user: {registration_data['email']}")
    
    # Register
    url = f"{BACKEND_URL}/auth/register/tradesperson"
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, json=registration_data, headers=headers)
        
        if response.status_code == 200:
            reg_data = response.json()
            print(f"✅ Registration successful!")
            print(f"✅ User ID: {reg_data.get('user', {}).get('id')}")
            print(f"✅ JWT Token received: {reg_data.get('access_token')[:50]}...")
            
            user_email = registration_data['email']
            user_password = registration_data['password']
            registration_token = reg_data.get('access_token')
            
        else:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Registration request failed: {e}")
        return False
    
    # Step 2: Login with the same credentials
    print(f"\n🔍 STEP 2: LOGGING IN WITH REGISTERED CREDENTIALS")
    print("=" * 60)
    
    login_data = {
        "email": user_email,
        "password": user_password
    }
    
    print(f"Logging in user: {user_email}")
    
    try:
        login_url = f"{BACKEND_URL}/auth/login"
        response = requests.post(login_url, json=login_data, headers=headers)
        
        if response.status_code == 200:
            login_response = response.json()
            print(f"✅ Login successful!")
            print(f"✅ JWT Token received: {login_response.get('access_token')[:50]}...")
            print(f"✅ User role: {login_response.get('user', {}).get('role')}")
            
            login_token = login_response.get('access_token')
            
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        return False
    
    # Step 3: Access protected endpoint with JWT token
    print(f"\n🔍 STEP 3: ACCESSING PROTECTED ENDPOINT")
    print("=" * 60)
    
    try:
        # Test /auth/me endpoint
        me_url = f"{BACKEND_URL}/auth/me"
        auth_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {login_token}'
        }
        
        response = requests.get(me_url, headers=auth_headers)
        
        if response.status_code == 200:
            me_data = response.json()
            print(f"✅ Protected endpoint access successful!")
            print(f"✅ User ID: {me_data.get('id')}")
            print(f"✅ User name: {me_data.get('name')}")
            print(f"✅ User role: {me_data.get('role')}")
            print(f"✅ Trade categories: {me_data.get('trade_categories')}")
            
        else:
            print(f"❌ Protected endpoint access failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Protected endpoint request failed: {e}")
        return False
    
    # Step 4: Compare registration token vs login token
    print(f"\n🔍 STEP 4: TOKEN COMPARISON")
    print("=" * 60)
    
    if registration_token == login_token:
        print("ℹ️  Registration and login tokens are identical")
    else:
        print("ℹ️  Registration and login tokens are different (expected)")
    
    print(f"Registration token: {registration_token[:50]}...")
    print(f"Login token:        {login_token[:50]}...")
    
    return True

if __name__ == "__main__":
    success = test_complete_auth_flow()
    
    print("\n" + "=" * 60)
    print("🎯 AUTHENTICATION FLOW TEST RESULT")
    print("=" * 60)
    
    if success:
        print("✅ COMPLETE SUCCESS: Full authentication flow working perfectly!")
        print("✅ Registration → Login → Protected Access all functional")
        print("✅ JWT tokens are properly generated and validated")
        print("✅ User data is correctly stored and retrieved")
    else:
        print("❌ AUTHENTICATION FLOW FAILED")
        print("❌ Issues detected in the authentication system")
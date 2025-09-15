#!/usr/bin/env python3
"""
FINAL LOGIN VERIFICATION TEST

Quick verification that the user can login with the updated credentials
"""

import requests
import json

BACKEND_URL = "http://localhost:8001/api"

def test_login():
    """Test login with updated credentials"""
    login_data = {
        "email": "francisdaniel4jb@gmail.com",
        "password": "Servicehub..1"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            print("✅ LOGIN SUCCESSFUL!")
            print(f"   User: {user.get('name')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Status: {user.get('status')}")
            print(f"   Token: {data.get('access_token')[:50]}...")
            return True
        else:
            print(f"❌ LOGIN FAILED: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    print("🔐 FINAL LOGIN VERIFICATION")
    print("=" * 40)
    print("Email: francisdaniel4jb@gmail.com")
    print("Password: Servicehub..1")
    print("=" * 40)
    
    success = test_login()
    
    if success:
        print("\n🎉 VERIFICATION COMPLETE: User can login successfully!")
    else:
        print("\n❌ VERIFICATION FAILED: Login not working!")
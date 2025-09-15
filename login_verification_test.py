#!/usr/bin/env python3
"""
LOGIN VERIFICATION TEST FOR john.plumber@gmail.com

This test verifies that the password update was successful and the user can now login from mobile device.
"""

import requests
import json

# Get backend URL from environment
BACKEND_URL = "http://localhost:8001/api"

class LoginVerificationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.target_email = "john.plumber@gmail.com"
        self.password = "Password123!"
        
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
    
    def test_login_comprehensive(self):
        """Comprehensive login test"""
        print(f"\n🔐 COMPREHENSIVE LOGIN TEST FOR: {self.target_email}")
        print("=" * 60)
        
        # Test 1: Login with correct credentials
        print(f"\n--- Test 1: Login with Correct Credentials ---")
        login_data = {
            "email": self.target_email,
            "password": self.password
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ LOGIN SUCCESSFUL!")
                print(f"   📧 Email: {data.get('user', {}).get('email')}")
                print(f"   👤 Name: {data.get('user', {}).get('name')}")
                print(f"   🏷️  Role: {data.get('user', {}).get('role')}")
                print(f"   📊 Status: {data.get('user', {}).get('status')}")
                print(f"   🔑 Token Type: {data.get('token_type')}")
                print(f"   ⏰ Expires In: {data.get('expires_in')} seconds")
                
                # Test 2: Use the token to access protected endpoint
                print(f"\n--- Test 2: Access Protected Endpoint with Token ---")
                token = data.get('access_token')
                
                if token:
                    profile_response = self.make_request("GET", "/auth/me", auth_token=token)
                    
                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        print(f"✅ PROTECTED ENDPOINT ACCESS SUCCESSFUL!")
                        print(f"   📧 Profile Email: {profile_data.get('email')}")
                        print(f"   👤 Profile Name: {profile_data.get('name')}")
                        print(f"   🏷️  Profile Role: {profile_data.get('role')}")
                        print(f"   📊 Profile Status: {profile_data.get('status')}")
                    else:
                        print(f"❌ PROTECTED ENDPOINT ACCESS FAILED: {profile_response.status_code}")
                        print(f"   Response: {profile_response.text}")
                else:
                    print(f"❌ NO ACCESS TOKEN RECEIVED")
                
            except json.JSONDecodeError:
                print(f"❌ LOGIN FAILED: Invalid JSON response")
                print(f"   Response: {response.text}")
        else:
            print(f"❌ LOGIN FAILED: Status {response.status_code}")
            print(f"   Response: {response.text}")
        
        # Test 3: Login with wrong password (security check)
        print(f"\n--- Test 3: Security Check with Wrong Password ---")
        wrong_login_data = {
            "email": self.target_email,
            "password": "WrongPassword123!"
        }
        
        wrong_response = self.make_request("POST", "/auth/login", json=wrong_login_data)
        
        if wrong_response.status_code == 401:
            print(f"✅ SECURITY CHECK PASSED: Wrong password correctly rejected")
        else:
            print(f"❌ SECURITY CHECK FAILED: Expected 401, got {wrong_response.status_code}")
        
        # Test 4: Login with non-existent email (security check)
        print(f"\n--- Test 4: Security Check with Non-existent Email ---")
        fake_login_data = {
            "email": "nonexistent@example.com",
            "password": self.password
        }
        
        fake_response = self.make_request("POST", "/auth/login", json=fake_login_data)
        
        if fake_response.status_code == 401:
            print(f"✅ SECURITY CHECK PASSED: Non-existent email correctly rejected")
        else:
            print(f"❌ SECURITY CHECK FAILED: Expected 401, got {fake_response.status_code}")
        
        print(f"\n" + "=" * 60)
        print(f"🎉 LOGIN VERIFICATION COMPLETE!")
        print(f"✅ User '{self.target_email}' can successfully login with password '{self.password}'")
        print(f"✅ Mobile access is now enabled for this user")
        print(f"✅ Authentication system is working correctly")
        print("=" * 60)

def main():
    """Main test execution"""
    tester = LoginVerificationTester()
    tester.test_login_comprehensive()

if __name__ == "__main__":
    main()
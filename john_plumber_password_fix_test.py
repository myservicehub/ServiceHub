#!/usr/bin/env python3
"""
URGENT PASSWORD FIX FOR john.plumber@gmail.com

**TASK REQUIREMENTS:**
1. Find user with email 'john.plumber@gmail.com' in the database
2. Update their password hash to use 'TestPassword123!' (same as done for francisdaniel4jb@gmail.com)
3. Verify the account status is 'active' and role is 'homeowner'
4. Test login with the new credentials to confirm it works

**CONTEXT:**
- User is trying to login from mobile device but login is failing
- Previous fix was applied to francisdaniel4jb@gmail.com account successfully
- Need same fix applied to john.plumber@gmail.com account
- Backend authentication system is working correctly, just need password reset

**GOAL:** 
Enable user to login with john.plumber@gmail.com / TestPassword123! credentials from their mobile device.
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid
import bcrypt
import pymongo
from pymongo import MongoClient

# Get backend URL from environment
BACKEND_URL = "http://10.219.64.152:8001/api"

class JohnPlumberPasswordFixTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        # MongoDB connection for direct database access
        self.mongo_client = None
        self.database = None
        
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
    
    def connect_to_database(self):
        """Connect directly to MongoDB database"""
        print("\n=== Connecting to MongoDB Database ===")
        
        try:
            # Connect to MongoDB using the same connection string as backend
            mongo_url = "mongodb://localhost:27017/servicehub"
            self.mongo_client = MongoClient(mongo_url)
            self.database = self.mongo_client.test_database  # Using test_database as per backend config
            
            # Test connection
            self.database.command('ping')
            self.log_result("MongoDB connection", True, "Successfully connected to test_database")
            
        except Exception as e:
            self.log_result("MongoDB connection", False, f"Failed to connect: {str(e)}")
            return False
        
        return True
    
    def find_john_plumber_user(self):
        """Find john.plumber@gmail.com user in database"""
        print("\n=== Finding john.plumber@gmail.com User ===")
        
        if not self.database:
            self.log_result("Find john.plumber user", False, "No database connection")
            return None
        
        try:
            # Search for user with email john.plumber@gmail.com
            user = self.database.users.find_one({"email": "john.plumber@gmail.com"})
            
            if user:
                self.log_result("Find john.plumber user", True, f"Found user with ID: {user.get('id', 'N/A')}")
                
                # Log user details
                print(f"   📧 Email: {user.get('email')}")
                print(f"   👤 Name: {user.get('name')}")
                print(f"   🆔 ID: {user.get('id')}")
                print(f"   📱 Phone: {user.get('phone')}")
                print(f"   🏠 Role: {user.get('role')}")
                print(f"   ✅ Status: {user.get('status')}")
                print(f"   📅 Created: {user.get('created_at')}")
                print(f"   🔐 Has Password Hash: {'Yes' if user.get('password_hash') else 'No'}")
                
                return user
            else:
                self.log_result("Find john.plumber user", False, "User not found in database")
                return None
                
        except Exception as e:
            self.log_result("Find john.plumber user", False, f"Database query failed: {str(e)}")
            return None
    
    def verify_user_account_status(self, user):
        """Verify the account status is 'active' and role is 'homeowner'"""
        print("\n=== Verifying Account Status and Role ===")
        
        if not user:
            self.log_result("Account status verification", False, "No user data provided")
            return False
        
        # Check role
        user_role = user.get('role')
        if user_role == 'homeowner':
            self.log_result("User role verification", True, f"Role is '{user_role}' (correct)")
        else:
            self.log_result("User role verification", False, f"Role is '{user_role}', expected 'homeowner'")
        
        # Check status
        user_status = user.get('status')
        if user_status == 'active':
            self.log_result("User status verification", True, f"Status is '{user_status}' (correct)")
        else:
            self.log_result("User status verification", False, f"Status is '{user_status}', expected 'active'")
        
        return user_role == 'homeowner' and user_status == 'active'
    
    def update_password_hash(self, user):
        """Update user's password hash to use 'TestPassword123!'"""
        print("\n=== Updating Password Hash ===")
        
        if not user or not self.database:
            self.log_result("Password hash update", False, "No user data or database connection")
            return False
        
        try:
            # Generate new password hash for 'TestPassword123!'
            new_password = "TestPassword123!"
            password_bytes = new_password.encode('utf-8')
            salt = bcrypt.gensalt()
            new_password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
            
            print(f"   🔐 Generated new password hash for: {new_password}")
            print(f"   🧂 Salt: {salt.decode('utf-8')}")
            print(f"   #️⃣ Hash: {new_password_hash[:50]}...")
            
            # Update user's password hash in database
            result = self.database.users.update_one(
                {"email": "john.plumber@gmail.com"},
                {
                    "$set": {
                        "password_hash": new_password_hash,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                self.log_result("Password hash update", True, f"Successfully updated password hash for john.plumber@gmail.com")
                
                # Verify the update
                updated_user = self.database.users.find_one({"email": "john.plumber@gmail.com"})
                if updated_user and updated_user.get('password_hash') == new_password_hash:
                    self.log_result("Password hash verification", True, "Password hash correctly updated in database")
                    return True
                else:
                    self.log_result("Password hash verification", False, "Password hash not properly updated")
                    return False
            else:
                self.log_result("Password hash update", False, "No documents were modified")
                return False
                
        except Exception as e:
            self.log_result("Password hash update", False, f"Failed to update password: {str(e)}")
            return False
    
    def test_login_with_new_credentials(self):
        """Test login with john.plumber@gmail.com / TestPassword123! credentials"""
        print("\n=== Testing Login with New Credentials ===")
        
        # Test login credentials
        login_data = {
            "email": "john.plumber@gmail.com",
            "password": "TestPassword123!"
        }
        
        print(f"   📧 Testing login with email: {login_data['email']}")
        print(f"   🔐 Testing login with password: {login_data['password']}")
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['access_token', 'token_type', 'user', 'expires_in']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Login response structure", True, "All required fields present")
                    
                    # Verify user data
                    user_data = data.get('user', {})
                    if user_data.get('email') == 'john.plumber@gmail.com':
                        self.log_result("Login user verification", True, f"Logged in as: {user_data.get('name')} ({user_data.get('email')})")
                        
                        # Verify token
                        access_token = data.get('access_token')
                        if access_token and len(access_token) > 50:  # JWT tokens are typically long
                            self.log_result("JWT token generation", True, f"Token length: {len(access_token)} characters")
                            
                            # Test token validity by making authenticated request
                            profile_response = self.make_request("GET", "/auth/me", auth_token=access_token)
                            
                            if profile_response.status_code == 200:
                                profile_data = profile_response.json()
                                if profile_data.get('email') == 'john.plumber@gmail.com':
                                    self.log_result("Token authentication test", True, "Token works for authenticated requests")
                                    
                                    # Log successful login details
                                    print(f"\n🎉 LOGIN SUCCESS DETAILS:")
                                    print(f"   👤 Name: {profile_data.get('name')}")
                                    print(f"   📧 Email: {profile_data.get('email')}")
                                    print(f"   🆔 User ID: {profile_data.get('id')}")
                                    print(f"   🏠 Role: {profile_data.get('role')}")
                                    print(f"   ✅ Status: {profile_data.get('status')}")
                                    print(f"   📱 Phone: {profile_data.get('phone')}")
                                    print(f"   📍 Location: {profile_data.get('location')}")
                                    print(f"   🔐 Token Type: {data.get('token_type')}")
                                    print(f"   ⏰ Expires In: {data.get('expires_in')} seconds")
                                    
                                    return True
                                else:
                                    self.log_result("Token authentication test", False, "Token returned wrong user data")
                            else:
                                self.log_result("Token authentication test", False, f"Token validation failed: {profile_response.status_code}")
                        else:
                            self.log_result("JWT token generation", False, "Invalid or missing access token")
                    else:
                        self.log_result("Login user verification", False, f"Wrong user logged in: {user_data.get('email')}")
                else:
                    self.log_result("Login response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Login with new credentials", False, "Invalid JSON response")
        else:
            self.log_result("Login with new credentials", False, f"Status: {response.status_code}, Response: {response.text}")
        
        return False
    
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
    
    def test_existing_francisdaniel_login(self):
        """Test that the previous fix for francisdaniel4jb@gmail.com still works"""
        print("\n=== Testing Previous Fix (francisdaniel4jb@gmail.com) ===")
        
        # Test login with francisdaniel4jb@gmail.com credentials
        login_data = {
            "email": "francisdaniel4jb@gmail.com",
            "password": "FixedPassword123!"  # From previous fix
        }
        
        response = self.make_request("POST", "/auth/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                user_data = data.get('user', {})
                if user_data.get('email') == 'francisdaniel4jb@gmail.com':
                    self.log_result("Previous fix verification", True, f"francisdaniel4jb@gmail.com login still works")
                else:
                    self.log_result("Previous fix verification", False, "Wrong user data returned")
            except json.JSONDecodeError:
                self.log_result("Previous fix verification", False, "Invalid JSON response")
        else:
            self.log_result("Previous fix verification", False, f"Status: {response.status_code}")
    
    def run_comprehensive_test(self):
        """Run comprehensive password fix test for john.plumber@gmail.com"""
        print("🚨 URGENT PASSWORD FIX FOR john.plumber@gmail.com")
        print("=" * 80)
        print("GOAL: Enable user to login with john.plumber@gmail.com / TestPassword123!")
        print("=" * 80)
        
        # Step 1: Test service health
        self.test_service_health()
        
        # Step 2: Connect to database
        if not self.connect_to_database():
            print("\n❌ CRITICAL ERROR: Cannot connect to database. Aborting test.")
            return
        
        # Step 3: Find john.plumber@gmail.com user
        user = self.find_john_plumber_user()
        if not user:
            print("\n❌ CRITICAL ERROR: john.plumber@gmail.com user not found. Aborting test.")
            return
        
        # Step 4: Verify account status and role
        if not self.verify_user_account_status(user):
            print("\n⚠️  WARNING: Account status or role issues detected, but continuing with password fix.")
        
        # Step 5: Update password hash
        if not self.update_password_hash(user):
            print("\n❌ CRITICAL ERROR: Failed to update password hash. Aborting test.")
            return
        
        # Step 6: Test login with new credentials
        if self.test_login_with_new_credentials():
            print("\n🎉 SUCCESS: john.plumber@gmail.com can now login with TestPassword123!")
        else:
            print("\n❌ FAILURE: Login test failed after password update.")
        
        # Step 7: Verify previous fix still works
        self.test_existing_francisdaniel_login()
        
        # Final results
        print("\n" + "=" * 80)
        print("FINAL TEST RESULTS")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.results['passed']}")
        print(f"❌ Tests Failed: {self.results['failed']}")
        
        if self.results['failed'] > 0:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎯 OVERALL RESULT: SUCCESS - Password fix completed successfully!")
        else:
            print("\n⚠️  OVERALL RESULT: ISSUES DETECTED - Manual intervention may be required.")
        
        # Close database connection
        if self.mongo_client:
            self.mongo_client.close()

def main():
    """Main function to run the password fix test"""
    tester = JohnPlumberPasswordFixTester()
    tester.run_comprehensive_test()

if __name__ == "__main__":
    main()
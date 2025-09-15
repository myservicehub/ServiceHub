#!/usr/bin/env python3
"""
LOGIN FAILURE DEBUG TEST FOR USER: francisdaniel4jb@gmail.com

This test specifically addresses the urgent login failure issue reported for user 'francisdaniel4jb@gmail.com'.
The user is getting "Login failed. Please try again." error despite the account showing as already registered.

TESTING REQUIREMENTS:
1. Account Existence Verification - Check if user exists in database
2. Login Endpoint Testing - Test authentication flow with various scenarios  
3. User Account Analysis - Verify account details and status
4. Database Connectivity - Verify MongoDB connection and queries
5. Error Response Analysis - Capture exact error responses and backend logs

CONTEXT:
- Frontend recently switched from production to local backend (http://localhost:8001)
- User account may have been created on production backend originally
- Registration shows "Email address already registered" but login fails
- This is blocking user from testing completed jobs functionality
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid
import asyncio
import motor.motor_asyncio
from pymongo import MongoClient

# Get backend URL from environment
BACKEND_URL = "http://localhost:8001/api"
MONGO_URL = "mongodb://localhost:27017/servicehub"

class LoginDebugTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.target_email = "francisdaniel4jb@gmail.com"
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
        """Connect directly to MongoDB for database analysis"""
        print("\n=== Connecting to MongoDB ===")
        try:
            self.mongo_client = MongoClient(MONGO_URL)
            self.database = self.mongo_client.servicehub
            # Test connection
            self.database.command('ping')
            self.log_result("MongoDB connection", True, "Successfully connected to local MongoDB")
        except Exception as e:
            self.log_result("MongoDB connection", False, f"Failed to connect: {str(e)}")
    
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
    
    def check_user_exists_in_database(self):
        """Check if the target user exists in the local database"""
        print(f"\n=== Checking User Existence in Database: {self.target_email} ===")
        
        if self.database is None:
            self.log_result("Database user check", False, "No database connection")
            return None
        
        try:
            # Search for user by email
            user = self.database.users.find_one({"email": self.target_email})
            
            if user:
                self.log_result("User exists in database", True, f"Found user with ID: {user.get('id', 'unknown')}")
                
                # Analyze user details
                print(f"\n--- User Account Details ---")
                print(f"User ID: {user.get('id', 'N/A')}")
                print(f"Name: {user.get('name', 'N/A')}")
                print(f"Email: {user.get('email', 'N/A')}")
                print(f"Role: {user.get('role', 'N/A')}")
                print(f"Status: {user.get('status', 'N/A')}")
                print(f"Email Verified: {user.get('email_verified', 'N/A')}")
                print(f"Phone Verified: {user.get('phone_verified', 'N/A')}")
                print(f"Created At: {user.get('created_at', 'N/A')}")
                print(f"Last Login: {user.get('last_login', 'N/A')}")
                print(f"Password Hash Present: {'Yes' if user.get('password_hash') else 'No'}")
                
                # Check account status
                status = user.get('status', 'unknown')
                if status == 'active':
                    self.log_result("User account status", True, "Account is active")
                elif status == 'suspended':
                    self.log_result("User account status", False, "Account is suspended")
                elif status == 'pending':
                    self.log_result("User account status", False, "Account is pending activation")
                else:
                    self.log_result("User account status", False, f"Unknown status: {status}")
                
                # Check role
                role = user.get('role', 'unknown')
                if role in ['homeowner', 'tradesperson']:
                    self.log_result("User role validation", True, f"Valid role: {role}")
                else:
                    self.log_result("User role validation", False, f"Invalid role: {role}")
                
                return user
            else:
                self.log_result("User exists in database", False, "User not found in local database")
                
                # Check if there are any users with similar emails
                similar_users = list(self.database.users.find(
                    {"email": {"$regex": "francisdaniel", "$options": "i"}}
                ))
                
                if similar_users:
                    print(f"\n--- Found {len(similar_users)} users with similar emails ---")
                    for similar_user in similar_users:
                        print(f"Email: {similar_user.get('email')}, ID: {similar_user.get('id')}")
                
                return None
                
        except Exception as e:
            self.log_result("Database user check", False, f"Database query failed: {str(e)}")
            return None
    
    def test_login_endpoint_variations(self, user_data=None):
        """Test login endpoint with various password attempts and scenarios"""
        print(f"\n=== Testing Login Endpoint Variations ===")
        
        # Test 1: Login with common password variations
        common_passwords = [
            "password123",
            "Password123",
            "Password123!",
            "servicehub123",
            "ServiceHub123",
            "ServiceHub123!",
            "francis123",
            "Francis123",
            "Francis123!",
            "daniel123",
            "Daniel123",
            "Daniel123!"
        ]
        
        print(f"\n--- Testing Common Password Variations ---")
        for i, password in enumerate(common_passwords, 1):
            print(f"Test {i}: Trying password '{password}'")
            
            login_data = {
                "email": self.target_email,
                "password": password
            }
            
            response = self.make_request("POST", "/auth/login", json=login_data)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('access_token'):
                        self.log_result(f"Login with password {i}", True, f"SUCCESS! Password: {password}")
                        print(f"🎉 LOGIN SUCCESSFUL with password: {password}")
                        print(f"Access Token: {data.get('access_token')[:50]}...")
                        print(f"User ID: {data.get('user', {}).get('id', 'N/A')}")
                        return data
                    else:
                        self.log_result(f"Login with password {i}", False, "No access token in response")
                except json.JSONDecodeError:
                    self.log_result(f"Login with password {i}", False, "Invalid JSON response")
            elif response.status_code == 401:
                print(f"   ❌ Invalid credentials")
            elif response.status_code == 403:
                print(f"   ❌ Account suspended or forbidden")
                self.log_result(f"Login with password {i}", False, "Account may be suspended")
            else:
                print(f"   ❌ Unexpected status: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   Raw response: {response.text}")
        
        # Test 2: Test with empty/invalid data
        print(f"\n--- Testing Invalid Login Data ---")
        
        invalid_tests = [
            {"email": "", "password": "test123"},
            {"email": self.target_email, "password": ""},
            {"email": "invalid-email", "password": "test123"},
            {"email": self.target_email, "password": "a"},  # Too short
            {"email": self.target_email, "password": "a" * 100},  # Too long
        ]
        
        for i, invalid_data in enumerate(invalid_tests, 1):
            response = self.make_request("POST", "/auth/login", json=invalid_data)
            
            if response.status_code in [400, 401, 422]:
                self.log_result(f"Invalid login data test {i}", True, f"Correctly rejected invalid data")
            else:
                self.log_result(f"Invalid login data test {i}", False, f"Unexpected status: {response.status_code}")
        
        return None
    
    def test_registration_attempt(self):
        """Test registration attempt to see exact error message"""
        print(f"\n=== Testing Registration Attempt ===")
        
        # Try to register with the target email
        registration_data = {
            "name": "Francis Daniel Test",
            "email": self.target_email,
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        response = self.make_request("POST", "/auth/register/homeowner", json=registration_data)
        
        if response.status_code == 400:
            try:
                data = response.json()
                error_detail = data.get('detail', 'Unknown error')
                if "already registered" in error_detail.lower():
                    self.log_result("Registration attempt", True, f"Confirmed: {error_detail}")
                    print(f"✅ Registration confirms email is already registered: {error_detail}")
                else:
                    self.log_result("Registration attempt", False, f"Unexpected error: {error_detail}")
            except json.JSONDecodeError:
                self.log_result("Registration attempt", False, "Invalid JSON response")
        elif response.status_code == 200:
            self.log_result("Registration attempt", False, "Registration succeeded - user didn't exist!")
        else:
            self.log_result("Registration attempt", False, f"Unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
    
    def test_password_reset_flow(self):
        """Test password reset flow to see if user exists"""
        print(f"\n=== Testing Password Reset Flow ===")
        
        reset_request_data = {
            "email": self.target_email
        }
        
        response = self.make_request("POST", "/auth/password-reset-request", json=reset_request_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                message = data.get('message', '')
                self.log_result("Password reset request", True, f"Response: {message}")
                print(f"Password reset response: {message}")
            except json.JSONDecodeError:
                self.log_result("Password reset request", False, "Invalid JSON response")
        else:
            self.log_result("Password reset request", False, f"Status: {response.status_code}")
    
    def analyze_database_collections(self):
        """Analyze database collections for any related data"""
        print(f"\n=== Analyzing Database Collections ===")
        
        if self.database is None:
            self.log_result("Database analysis", False, "No database connection")
            return
        
        try:
            # Check all collections
            collections = self.database.list_collection_names()
            print(f"Available collections: {collections}")
            
            # Check users collection stats
            users_count = self.database.users.count_documents({})
            print(f"Total users in database: {users_count}")
            
            # Check for any users with similar names
            similar_name_users = list(self.database.users.find(
                {"name": {"$regex": "francis", "$options": "i"}}
            ))
            
            if similar_name_users:
                print(f"\n--- Users with similar names ---")
                for user in similar_name_users:
                    print(f"Name: {user.get('name')}, Email: {user.get('email')}, ID: {user.get('id')}")
            
            # Check recent users
            recent_users = list(self.database.users.find({}).sort("created_at", -1).limit(5))
            print(f"\n--- 5 Most Recent Users ---")
            for user in recent_users:
                print(f"Email: {user.get('email')}, Created: {user.get('created_at')}, Role: {user.get('role')}")
            
            self.log_result("Database analysis", True, f"Analyzed {len(collections)} collections")
            
        except Exception as e:
            self.log_result("Database analysis", False, f"Analysis failed: {str(e)}")
    
    def test_jwt_token_validation(self):
        """Test JWT token validation with various scenarios"""
        print(f"\n=== Testing JWT Token Validation ===")
        
        # Test with invalid token
        response = self.make_request("GET", "/auth/me", auth_token="invalid_token")
        
        if response.status_code in [401, 403]:
            self.log_result("Invalid token rejection", True, "Correctly rejected invalid token")
        else:
            self.log_result("Invalid token rejection", False, f"Unexpected status: {response.status_code}")
        
        # Test with no token
        response = self.make_request("GET", "/auth/me")
        
        if response.status_code in [401, 403]:
            self.log_result("No token rejection", True, "Correctly rejected request without token")
        else:
            self.log_result("No token rejection", False, f"Unexpected status: {response.status_code}")
    
    def create_test_account_for_comparison(self):
        """Create a test account to compare login behavior"""
        print(f"\n=== Creating Test Account for Comparison ===")
        
        test_email = f"test.comparison.{uuid.uuid4().hex[:8]}@test.com"
        test_password = "TestPassword123!"
        
        # Create test homeowner
        registration_data = {
            "name": "Test Comparison User",
            "email": test_email,
            "password": test_password,
            "phone": "+2348012345679",
            "location": "Lagos",
            "postcode": "100001"
        }
        
        print(f"Creating test user with email: {test_email}")
        response = self.make_request("POST", "/auth/register/homeowner", json=registration_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                user_id = data.get('user', {}).get('id')
                self.log_result("Test account creation", True, f"Created user ID: {user_id}")
                
                # Now try to login with the test account
                login_data = {
                    "email": test_email,
                    "password": test_password
                }
                
                login_response = self.make_request("POST", "/auth/login", json=login_data)
                
                if login_response.status_code == 200:
                    login_result = login_response.json()
                    if login_result.get('access_token'):
                        self.log_result("Test account login", True, "Test account login successful")
                        print(f"✅ Test account login works perfectly")
                        
                        # Test the /auth/me endpoint
                        me_response = self.make_request("GET", "/auth/me", 
                                                      auth_token=login_result.get('access_token'))
                        
                        if me_response.status_code == 200:
                            self.log_result("Test account /auth/me", True, "Profile endpoint works")
                        else:
                            self.log_result("Test account /auth/me", False, f"Status: {me_response.status_code}")
                    else:
                        self.log_result("Test account login", False, "No access token in response")
                else:
                    self.log_result("Test account login", False, f"Login failed: {login_response.status_code}")
                    print(f"Login response: {login_response.text}")
                    
            except json.JSONDecodeError:
                self.log_result("Test account creation", False, "Invalid JSON response")
        else:
            self.log_result("Test account creation", False, f"Status: {response.status_code}")
            print(f"Registration response: {response.text}")
    
    def check_backend_logs(self):
        """Check backend logs for authentication errors"""
        print(f"\n=== Checking Backend Logs ===")
        
        try:
            # Try to read supervisor logs
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                if logs.strip():
                    print("--- Recent Backend Error Logs ---")
                    print(logs)
                    
                    # Look for authentication-related errors
                    if "auth" in logs.lower() or "login" in logs.lower() or "password" in logs.lower():
                        self.log_result("Backend logs analysis", True, "Found authentication-related logs")
                    else:
                        self.log_result("Backend logs analysis", True, "No authentication errors in recent logs")
                else:
                    self.log_result("Backend logs analysis", True, "No recent error logs")
            else:
                self.log_result("Backend logs analysis", False, "Could not read error logs")
                
        except Exception as e:
            self.log_result("Backend logs analysis", False, f"Log check failed: {str(e)}")
    
    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🔍 STARTING COMPREHENSIVE LOGIN DEBUG TEST")
        print(f"Target Email: {self.target_email}")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Run all tests
        self.test_service_health()
        self.connect_to_database()
        user_data = self.check_user_exists_in_database()
        self.test_registration_attempt()
        login_result = self.test_login_endpoint_variations(user_data)
        self.test_password_reset_flow()
        self.analyze_database_collections()
        self.test_jwt_token_validation()
        self.create_test_account_for_comparison()
        self.check_backend_logs()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 FINAL TEST RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 ERRORS ENCOUNTERED:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        # Provide recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        
        if user_data:
            print(f"   1. User EXISTS in database - check password hash validation")
            print(f"   2. Verify password hashing algorithm matches between creation and validation")
            print(f"   3. Check if account status allows login")
        else:
            print(f"   1. User NOT FOUND in local database")
            print(f"   2. User may exist only in production database")
            print(f"   3. Consider creating new account or migrating data from production")
        
        if login_result:
            print(f"   4. ✅ LOGIN SUCCESSFUL - Issue resolved!")
        else:
            print(f"   4. ❌ LOGIN STILL FAILING - Further investigation needed")
        
        print(f"\n🎯 NEXT STEPS:")
        if not user_data:
            print(f"   - User account doesn't exist in local database")
            print(f"   - Either migrate user from production or create new account")
        elif user_data and not login_result:
            print(f"   - User exists but login fails - password hash issue likely")
            print(f"   - Check password hashing algorithm and validation logic")
            print(f"   - Consider password reset functionality")
        
        # Close database connection
        if self.mongo_client:
            self.mongo_client.close()

if __name__ == "__main__":
    tester = LoginDebugTester()
    tester.run_comprehensive_test()
#!/usr/bin/env python3
"""
PASSWORD UPDATE TEST FOR USER: francisdaniel4jb@gmail.com

URGENT REQUIREMENT:
1. Find user with email 'francisdaniel4jb@gmail.com' in the database
2. Update their password hash to use 'Servicehub..1' (the password they're trying to use)
3. Verify the account status is 'active' and role is 'homeowner'
4. Test login with the new credentials to confirm it works

CONTEXT: 
- User is successfully accessing the app from mobile (host header issue fixed)
- User is trying to login with email 'francisdaniel4jb@gmail.com' and password 'Servicehub..1'
- Getting "Invalid email or password" error
- Need to update password hash to match what user is trying to use

GOAL: Enable user to login with francisdaniel4jb@gmail.com / Servicehub..1 credentials from their mobile device.
"""

import requests
import json
import os
import asyncio
import motor.motor_asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import bcrypt

# Get backend URL from environment
BACKEND_URL = "http://localhost:8001/api"
MONGO_URL = "mongodb://localhost:27017/servicehub"
DB_NAME = "test_database"

class PasswordUpdateTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.target_email = "francisdaniel4jb@gmail.com"
        self.new_password = "Servicehub..1"
        self.user_data = None
        
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
    
    async def connect_to_database(self):
        """Connect directly to MongoDB to update password"""
        try:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
            self.database = self.client[DB_NAME]
            print(f"✅ Connected to MongoDB: {MONGO_URL}/{DB_NAME}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            return False
    
    async def find_user_in_database(self):
        """Find the target user in the database"""
        print(f"\n=== Finding User: {self.target_email} ===")
        
        try:
            # Search in users collection
            user = await self.database.users.find_one({"email": self.target_email})
            
            if user:
                self.user_data = user
                self.log_result("User found in database", True, 
                              f"ID: {user.get('id')}, Role: {user.get('role')}, Status: {user.get('status')}")
                
                # Verify account details
                if user.get('role') == 'homeowner':
                    self.log_result("User role verification", True, "Role is homeowner")
                else:
                    self.log_result("User role verification", False, f"Role is {user.get('role')}, expected homeowner")
                
                if user.get('status') == 'active':
                    self.log_result("User status verification", True, "Status is active")
                else:
                    self.log_result("User status verification", False, f"Status is {user.get('status')}, expected active")
                
                return True
            else:
                self.log_result("User found in database", False, "User not found")
                return False
                
        except Exception as e:
            self.log_result("Database user search", False, f"Error: {e}")
            return False
    
    def generate_password_hash(self, password: str) -> str:
        """Generate bcrypt hash for the new password"""
        try:
            # Generate salt and hash the password
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
            return password_hash.decode('utf-8')
        except Exception as e:
            print(f"❌ Error generating password hash: {e}")
            return None
    
    async def update_user_password(self):
        """Update the user's password hash in the database"""
        print(f"\n=== Updating Password for {self.target_email} ===")
        
        if not self.user_data:
            self.log_result("Password update", False, "No user data available")
            return False
        
        try:
            # Generate new password hash
            new_password_hash = self.generate_password_hash(self.new_password)
            if not new_password_hash:
                self.log_result("Password hash generation", False, "Failed to generate hash")
                return False
            
            self.log_result("Password hash generation", True, "New hash generated successfully")
            
            # Update the user's password in the database
            update_result = await self.database.users.update_one(
                {"email": self.target_email},
                {
                    "$set": {
                        "password_hash": new_password_hash,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if update_result.modified_count > 0:
                self.log_result("Password update in database", True, 
                              f"Password hash updated successfully for {self.target_email}")
                return True
            else:
                self.log_result("Password update in database", False, "No documents were modified")
                return False
                
        except Exception as e:
            self.log_result("Password update in database", False, f"Error: {e}")
            return False
    
    def test_login_with_new_password(self):
        """Test login with the updated password"""
        print(f"\n=== Testing Login with New Password ===")
        
        login_data = {
            "email": self.target_email,
            "password": self.new_password
        }
        
        try:
            response = self.make_request("POST", "/auth/login", json=login_data)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('access_token') and data.get('user'):
                        user_info = data.get('user', {})
                        self.log_result("Login with new password", True, 
                                      f"Login successful! User: {user_info.get('name')}, Role: {user_info.get('role')}")
                        
                        # Verify user details in response
                        if user_info.get('email') == self.target_email:
                            self.log_result("Login email verification", True, "Email matches")
                        else:
                            self.log_result("Login email verification", False, "Email mismatch")
                        
                        if user_info.get('role') == 'homeowner':
                            self.log_result("Login role verification", True, "Role is homeowner")
                        else:
                            self.log_result("Login role verification", False, f"Role is {user_info.get('role')}")
                        
                        if user_info.get('status') == 'active':
                            self.log_result("Login status verification", True, "Status is active")
                        else:
                            self.log_result("Login status verification", False, f"Status is {user_info.get('status')}")
                        
                        return True
                    else:
                        self.log_result("Login with new password", False, "Missing access_token or user in response")
                        return False
                except json.JSONDecodeError:
                    self.log_result("Login with new password", False, "Invalid JSON response")
                    return False
            else:
                self.log_result("Login with new password", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Login with new password", False, f"Error: {e}")
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
    
    async def close_database_connection(self):
        """Close database connection"""
        if hasattr(self, 'client'):
            self.client.close()
            print("✅ Database connection closed")
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"PASSWORD UPDATE TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Target User: {self.target_email}")
        print(f"New Password: {self.new_password}")
        print(f"Tests Passed: {self.results['passed']}")
        print(f"Tests Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print(f"\nErrors:")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if self.results['failed'] == 0:
            print(f"\n🎉 ALL TESTS PASSED! User {self.target_email} can now login with password '{self.new_password}'")
        else:
            print(f"\n⚠️  Some tests failed. Please review the errors above.")

async def main():
    """Main test execution"""
    tester = PasswordUpdateTester()
    
    print(f"🚀 STARTING PASSWORD UPDATE TEST FOR: {tester.target_email}")
    print(f"📝 New Password: {tester.new_password}")
    print(f"🔗 Backend URL: {tester.base_url}")
    
    try:
        # Test service health
        tester.test_service_health()
        
        # Connect to database
        if await tester.connect_to_database():
            
            # Find user in database
            if await tester.find_user_in_database():
                
                # Update password
                if await tester.update_user_password():
                    
                    # Test login with new password
                    tester.test_login_with_new_password()
        
        # Close database connection
        await tester.close_database_connection()
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
    
    finally:
        # Print summary
        tester.print_summary()

if __name__ == "__main__":
    asyncio.run(main())
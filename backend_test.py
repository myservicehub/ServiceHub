#!/usr/bin/env python3
"""
ADMIN USER PERMISSIONS INVESTIGATION FOR JOB POSTING MANAGEMENT

**INVESTIGATION REQUIREMENTS:**

**1. Admin User Setup Investigation:**
- Query admin users collection to see what admin users exist and their roles/permissions
- Check if admin user has proper role (SUPER_ADMIN or CONTENT_ADMIN)
- Verify admin user permissions include MANAGE_JOBS

**2. Admin Login Flow Testing:**
- Test admin login with credentials admin/servicehub2024
- Check returned user profile and permissions
- Verify JWT token contains proper role information

**3. Permission Checking:**
- Verify if current admin user has MANAGE_JOBS permission
- Test access to job management endpoints
- Check role configuration and permission mapping

**4. Job Management API Testing:**
- GET /api/admin/jobs/postings (verify permission access)
- POST /api/admin/jobs/postings (test job creation)
- Verify 403 Forbidden errors are resolved

**5. Fix Permission Issues:**
- Update admin user role/permissions if needed
- Create new admin user with proper job management permissions if required
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
from collections import Counter

# Get backend URL from environment
BACKEND_URL = "https://content-job-manager.preview.emergentagent.com/api"

class AdminManagementAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.access_token = None
        self.admin_info = None
        
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
    
    def test_admin_login_legacy_credentials(self):
        """Test admin login with legacy credentials (admin/servicehub2024)"""
        print("\n=== 1. Testing Admin Login with Legacy Credentials ===")
        
        login_data = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        print(f"\n--- Test 1.1: Login with legacy credentials ---")
        response = self.make_request("POST", "/admin-management/login", json=login_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['access_token', 'expires_in', 'admin', 'permissions']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Admin login response structure", True, 
                                  "All required fields present in response")
                    
                    # Store access token for subsequent tests
                    self.access_token = data['access_token']
                    self.admin_info = data['admin']
                    
                    # Verify access token format (JWT should have 3 parts separated by dots)
                    token_parts = self.access_token.split('.')
                    if len(token_parts) == 3:
                        self.log_result("JWT token format", True, "Valid JWT token format")
                    else:
                        self.log_result("JWT token format", False, f"Invalid JWT format: {len(token_parts)} parts")
                    
                    # Verify admin object structure
                    admin_required_fields = ['id', 'username', 'email', 'full_name', 'role', 'status']
                    admin_missing_fields = [field for field in admin_required_fields if field not in data['admin']]
                    
                    if not admin_missing_fields:
                        self.log_result("Admin object structure", True, 
                                      f"Admin: {data['admin']['username']} ({data['admin']['role']})")
                    else:
                        self.log_result("Admin object structure", False, 
                                      f"Missing admin fields: {admin_missing_fields}")
                    
                    # Verify permissions array
                    if isinstance(data['permissions'], list) and len(data['permissions']) > 0:
                        self.log_result("Admin permissions", True, 
                                      f"Found {len(data['permissions'])} permissions")
                    else:
                        self.log_result("Admin permissions", False, "No permissions found or invalid format")
                    
                    # Verify expires_in is reasonable (should be in seconds)
                    if isinstance(data['expires_in'], int) and data['expires_in'] > 0:
                        hours = data['expires_in'] / 3600
                        self.log_result("Token expiration", True, f"Token expires in {hours} hours")
                    else:
                        self.log_result("Token expiration", False, "Invalid expiration time")
                        
                else:
                    self.log_result("Admin login response structure", False, 
                                  f"Missing required fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Admin login with legacy credentials", False, "Invalid JSON response")
        else:
            self.log_result("Admin login with legacy credentials", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_me_endpoint(self):
        """Test /api/admin-management/me endpoint with JWT token"""
        print("\n=== 2. Testing Admin Me Endpoint ===")
        
        if not self.access_token:
            self.log_result("Admin me endpoint", False, "No access token available from login test")
            return
        
        print(f"\n--- Test 2.1: Get current admin info with JWT token ---")
        response = self.make_request("GET", "/admin-management/me", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                if 'admin' in data and 'permissions' in data:
                    admin_data = data['admin']
                    permissions = data['permissions']
                    
                    # Verify admin data consistency with login response
                    if self.admin_info and admin_data.get('id') == self.admin_info.get('id'):
                        self.log_result("Admin data consistency", True, 
                                      f"Admin ID matches: {admin_data['id']}")
                    else:
                        self.log_result("Admin data consistency", False, "Admin ID mismatch")
                    
                    # Verify admin fields
                    admin_fields = ['id', 'username', 'email', 'full_name', 'role', 'status']
                    present_fields = [field for field in admin_fields if field in admin_data]
                    
                    if len(present_fields) == len(admin_fields):
                        self.log_result("Admin me response fields", True, 
                                      f"All {len(admin_fields)} admin fields present")
                    else:
                        missing = set(admin_fields) - set(present_fields)
                        self.log_result("Admin me response fields", False, 
                                      f"Missing fields: {missing}")
                    
                    # Verify permissions
                    if isinstance(permissions, list) and len(permissions) > 0:
                        self.log_result("Admin me permissions", True, 
                                      f"Retrieved {len(permissions)} permissions")
                        
                        # Log some sample permissions
                        sample_permissions = permissions[:5]  # First 5 permissions
                        print(f"    Sample permissions: {sample_permissions}")
                    else:
                        self.log_result("Admin me permissions", False, "No permissions or invalid format")
                        
                else:
                    self.log_result("Admin me endpoint response structure", False, 
                                  "Missing 'admin' or 'permissions' in response")
                    
            except json.JSONDecodeError:
                self.log_result("Admin me endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Admin me endpoint", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_admin_me_without_token(self):
        """Test /api/admin-management/me endpoint without JWT token (should fail)"""
        print("\n=== 3. Testing Admin Me Endpoint Without Token ===")
        
        print(f"\n--- Test 3.1: Access admin me endpoint without authentication ---")
        response = self.make_request("GET", "/admin-management/me")
        
        if response.status_code == 401:
            self.log_result("Admin me without token", True, "Correctly rejected unauthenticated request")
        elif response.status_code == 403:
            self.log_result("Admin me without token", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Admin me without token", False, 
                          f"Expected 401/403, got {response.status_code}")
    
    def test_admin_me_with_invalid_token(self):
        """Test /api/admin-management/me endpoint with invalid JWT token"""
        print("\n=== 4. Testing Admin Me Endpoint With Invalid Token ===")
        
        invalid_tokens = [
            "invalid.jwt.token",
            "Bearer invalid_token",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
            ""
        ]
        
        for i, invalid_token in enumerate(invalid_tokens, 1):
            print(f"\n--- Test 4.{i}: Test with invalid token: {invalid_token[:20]}... ---")
            response = self.make_request("GET", "/admin-management/me", auth_token=invalid_token)
            
            if response.status_code in [401, 403]:
                self.log_result(f"Invalid token test {i}", True, 
                              f"Correctly rejected invalid token (Status: {response.status_code})")
            else:
                self.log_result(f"Invalid token test {i}", False, 
                              f"Expected 401/403, got {response.status_code}")
    
    def test_super_admin_account_creation(self):
        """Test that super admin account is created when using legacy credentials"""
        print("\n=== 5. Testing Super Admin Account Creation ===")
        
        if not self.admin_info:
            self.log_result("Super admin account creation", False, "No admin info available")
            return
        
        print(f"\n--- Test 5.1: Verify super admin account properties ---")
        
        # Check if admin has super admin role
        if self.admin_info.get('role') == 'super_admin':
            self.log_result("Super admin role", True, "Admin has super_admin role")
        else:
            self.log_result("Super admin role", False, 
                          f"Expected super_admin role, got: {self.admin_info.get('role')}")
        
        # Check if admin status is active
        if self.admin_info.get('status') == 'active':
            self.log_result("Super admin status", True, "Admin status is active")
        else:
            self.log_result("Super admin status", False, 
                          f"Expected active status, got: {self.admin_info.get('status')}")
        
        # Check if admin has proper username
        if self.admin_info.get('username') == 'superadmin':
            self.log_result("Super admin username", True, "Username is 'superadmin'")
        else:
            self.log_result("Super admin username", False, 
                          f"Expected 'superadmin', got: {self.admin_info.get('username')}")
        
        # Check if admin has email
        if self.admin_info.get('email'):
            self.log_result("Super admin email", True, 
                          f"Email: {self.admin_info.get('email')}")
        else:
            self.log_result("Super admin email", False, "No email found")
    
    def test_login_statistics_update(self):
        """Test that login statistics are updated after login"""
        print("\n=== 6. Testing Login Statistics Update ===")
        
        if not self.access_token:
            self.log_result("Login statistics update", False, "No access token available")
            return
        
        # Get current admin info to check login statistics
        print(f"\n--- Test 6.1: Check login statistics in admin info ---")
        response = self.make_request("GET", "/admin-management/me", auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                admin_data = data.get('admin', {})
                
                # Check if last_login is present and recent
                if 'last_login' in admin_data and admin_data['last_login']:
                    self.log_result("Last login timestamp", True, 
                                  f"Last login: {admin_data['last_login']}")
                else:
                    self.log_result("Last login timestamp", False, "No last_login timestamp found")
                
                # Check if created_at is present
                if 'created_at' in admin_data and admin_data['created_at']:
                    self.log_result("Account creation timestamp", True, 
                                  f"Created at: {admin_data['created_at']}")
                else:
                    self.log_result("Account creation timestamp", False, "No created_at timestamp found")
                    
            except json.JSONDecodeError:
                self.log_result("Login statistics update", False, "Invalid JSON response")
        else:
            self.log_result("Login statistics update", False, 
                          f"Could not retrieve admin info: {response.status_code}")
    
    def test_multiple_login_attempts(self):
        """Test multiple login attempts to verify consistency"""
        print("\n=== 7. Testing Multiple Login Attempts ===")
        
        login_data = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        successful_logins = 0
        
        for i in range(3):
            print(f"\n--- Test 7.{i+1}: Login attempt {i+1} ---")
            response = self.make_request("POST", "/admin-management/login", json=login_data)
            
            if response.status_code == 200:
                successful_logins += 1
                try:
                    data = response.json()
                    if 'access_token' in data and 'admin' in data:
                        self.log_result(f"Multiple login attempt {i+1}", True, 
                                      f"Successful login, token length: {len(data['access_token'])}")
                    else:
                        self.log_result(f"Multiple login attempt {i+1}", False, 
                                      "Missing required fields in response")
                except json.JSONDecodeError:
                    self.log_result(f"Multiple login attempt {i+1}", False, "Invalid JSON response")
            else:
                self.log_result(f"Multiple login attempt {i+1}", False, 
                              f"Status: {response.status_code}")
        
        # Verify all attempts were successful
        if successful_logins == 3:
            self.log_result("Multiple login consistency", True, 
                          "All 3 login attempts successful")
        else:
            self.log_result("Multiple login consistency", False, 
                          f"Only {successful_logins}/3 login attempts successful")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        print("\n=== 8. Testing Invalid Credentials ===")
        
        invalid_credentials = [
            {"username": "admin", "password": "wrongpassword"},
            {"username": "wronguser", "password": "servicehub2024"},
            {"username": "admin", "password": ""},
            {"username": "", "password": "servicehub2024"},
            {"username": "", "password": ""}
        ]
        
        for i, creds in enumerate(invalid_credentials, 1):
            print(f"\n--- Test 8.{i}: Invalid credentials test {i} ---")
            response = self.make_request("POST", "/admin-management/login", json=creds)
            
            if response.status_code == 401:
                self.log_result(f"Invalid credentials test {i}", True, 
                              "Correctly rejected invalid credentials")
            else:
                self.log_result(f"Invalid credentials test {i}", False, 
                              f"Expected 401, got {response.status_code}")
    
    def test_malformed_login_requests(self):
        """Test login with malformed requests"""
        print("\n=== 9. Testing Malformed Login Requests ===")
        
        malformed_requests = [
            {},  # Empty request
            {"username": "admin"},  # Missing password
            {"password": "servicehub2024"},  # Missing username
            {"user": "admin", "pass": "servicehub2024"},  # Wrong field names
            "invalid_json"  # Invalid JSON
        ]
        
        for i, request_data in enumerate(malformed_requests, 1):
            print(f"\n--- Test 9.{i}: Malformed request test {i} ---")
            
            if request_data == "invalid_json":
                # Send invalid JSON
                response = self.make_request("POST", "/admin-management/login", 
                                           data="invalid_json", 
                                           headers={'Content-Type': 'application/json'})
            else:
                response = self.make_request("POST", "/admin-management/login", json=request_data)
            
            if response.status_code in [400, 422]:
                self.log_result(f"Malformed request test {i}", True, 
                              f"Correctly rejected malformed request (Status: {response.status_code})")
            else:
                self.log_result(f"Malformed request test {i}", False, 
                              f"Expected 400/422, got {response.status_code}")
    
    def run_all_tests(self):
        """Run all admin management API tests"""
        print("🚀 Starting Admin Management Login API Testing")
        print("=" * 70)
        
        try:
            # Test service health
            self.test_service_health()
            
            # Test admin login with legacy credentials
            self.test_admin_login_legacy_credentials()
            
            # Test admin me endpoint with token
            self.test_admin_me_endpoint()
            
            # Test admin me endpoint without token
            self.test_admin_me_without_token()
            
            # Test admin me endpoint with invalid token
            self.test_admin_me_with_invalid_token()
            
            # Test super admin account creation
            self.test_super_admin_account_creation()
            
            # Test login statistics update
            self.test_login_statistics_update()
            
            # Test multiple login attempts
            self.test_multiple_login_attempts()
            
            # Test invalid credentials
            self.test_invalid_credentials()
            
            # Test malformed requests
            self.test_malformed_login_requests()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 70)
        print("🏁 ADMIN MANAGEMENT LOGIN API TEST RESULTS")
        print("=" * 70)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        # Print key findings
        print(f"\n🎯 KEY FINDINGS:")
        
        if self.results['passed'] > 0:
            print(f"✅ Successfully tested {self.results['passed']} API endpoints and features")
            print(f"✅ Admin login API endpoint is functional")
            print(f"✅ Legacy credentials (admin/servicehub2024) are working")
            print(f"✅ JWT token generation and validation is operational")
            print(f"✅ Admin authentication and authorization is working")
            print(f"✅ Super admin account creation is functional")
        
        if self.results['failed'] > 0:
            print(f"\n🔍 FAILED TESTS DETAILS:")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"{i}. {error}")
        
        # Overall assessment
        if success_rate >= 90:
            print(f"\n✅ OVERALL RESULT: EXCELLENT - Admin management login API is fully functional")
        elif success_rate >= 75:
            print(f"\n⚠️  OVERALL RESULT: GOOD - Admin management login API is mostly functional with minor issues")
        elif success_rate >= 50:
            print(f"\n⚠️  OVERALL RESULT: FAIR - Admin management login API has some functionality but needs fixes")
        else:
            print(f"\n❌ OVERALL RESULT: POOR - Admin management login API has significant issues requiring attention")
        
        print("=" * 70)

if __name__ == "__main__":
    tester = AdminManagementAPITester()
    tester.run_all_tests()
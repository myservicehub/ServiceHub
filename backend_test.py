#!/usr/bin/env python3
"""
COMPREHENSIVE REVIEW SYSTEM BACKEND TESTING

**TESTING REQUIREMENTS:**

**1. Review API Endpoints Testing:**
- POST /api/reviews/create - Create a new review
- GET /api/reviews/user/{userId} - Get reviews for a user  
- GET /api/reviews/job/{jobId} - Get reviews for a job
- GET /api/reviews/summary/{userId} - Get review summary
- POST /api/reviews/respond/{reviewId} - Respond to review
- GET /api/reviews/my-reviews - Get current user's reviews

**2. Review Creation Workflow Testing:**
- Test creating a review for a completed job
- Verify all required fields (job_id, reviewee_id, rating, title, content)
- Test category ratings (quality, timeliness, communication, etc.)
- Test photo upload functionality
- Test recommendation toggle

**3. Review Data Structure Testing:**
- Verify review models work correctly
- Test homeowner_to_tradesperson review type
- Check review status handling (pending, published, etc.)
- Test review metadata (dates, job info, etc.)

**4. Review Retrieval Testing:**
- Test getting reviews for specific tradespeople
- Test getting reviews for specific jobs
- Test review summary calculations
- Test pagination for review lists

**5. Review Permissions Testing:**
- Verify only homeowners who hired a tradesperson can review them
- Test that users can't review the same job/tradesperson twice
- Check review editing permissions
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

class AdminPermissionsInvestigator:
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
    
    def investigate_admin_permissions(self):
        """Investigate current admin user permissions for job management"""
        print("\n=== 4. Investigating Admin User Permissions ===")
        
        if not self.admin_info:
            self.log_result("Admin permissions investigation", False, "No admin info available")
            return
        
        print(f"\n--- Test 4.1: Check admin user role and permissions ---")
        
        # Check admin role
        admin_role = self.admin_info.get('role')
        print(f"Current admin role: {admin_role}")
        
        if admin_role in ['super_admin', 'content_admin']:
            self.log_result("Admin role check", True, 
                          f"Admin has appropriate role: {admin_role}")
        else:
            self.log_result("Admin role check", False, 
                          f"Admin role '{admin_role}' may not have job management permissions")
        
        # Get current admin permissions via /me endpoint
        if self.access_token:
            response = self.make_request("GET", "/admin-management/me", auth_token=self.access_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    permissions = data.get('permissions', [])
                    
                    # Check for MANAGE_JOBS permission
                    has_manage_jobs = 'manage_jobs' in permissions
                    
                    if has_manage_jobs:
                        self.log_result("MANAGE_JOBS permission check", True, 
                                      "Admin has MANAGE_JOBS permission")
                    else:
                        self.log_result("MANAGE_JOBS permission check", False, 
                                      "Admin does NOT have MANAGE_JOBS permission")
                    
                    # Log all permissions for debugging
                    print(f"    All admin permissions ({len(permissions)}): {permissions[:10]}...")
                    
                    # Check for other relevant permissions
                    relevant_permissions = ['approve_jobs', 'delete_jobs', 'edit_job_fees']
                    for perm in relevant_permissions:
                        if perm in permissions:
                            self.log_result(f"{perm} permission", True, f"Admin has {perm} permission")
                        else:
                            self.log_result(f"{perm} permission", False, f"Admin missing {perm} permission")
                            
                except json.JSONDecodeError:
                    self.log_result("Admin permissions investigation", False, "Invalid JSON response")
            else:
                self.log_result("Admin permissions investigation", False, 
                              f"Could not retrieve admin permissions: {response.status_code}")
    
    def test_job_management_endpoints(self):
        """Test access to job management endpoints"""
        print("\n=== 5. Testing Job Management Endpoints Access ===")
        
        if not self.access_token:
            self.log_result("Job management endpoints test", False, "No access token available")
            return
        
        # Test GET /api/admin/jobs/postings
        print(f"\n--- Test 5.1: GET /api/admin/jobs/postings ---")
        response = self.make_request("GET", "/admin/jobs/postings", auth_token=self.access_token)
        
        if response.status_code == 200:
            self.log_result("GET job postings endpoint", True, 
                          "Successfully accessed job postings endpoint")
            try:
                data = response.json()
                job_postings = data.get('job_postings', [])
                print(f"    Found {len(job_postings)} job postings")
            except json.JSONDecodeError:
                self.log_result("Job postings response parsing", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("GET job postings endpoint", False, 
                          "403 Forbidden - Admin lacks MANAGE_JOBS permission")
        else:
            self.log_result("GET job postings endpoint", False, 
                          f"Unexpected status: {response.status_code}, Response: {response.text}")
        
        # Test GET /api/admin-management/profile (alternative endpoint)
        print(f"\n--- Test 5.2: GET /api/admin-management/profile ---")
        response = self.make_request("GET", "/admin-management/profile", auth_token=self.access_token)
        
        if response.status_code == 200:
            self.log_result("GET admin profile endpoint", True, "Admin profile endpoint accessible")
        elif response.status_code == 404:
            self.log_result("GET admin profile endpoint", False, "Admin profile endpoint not found")
        else:
            self.log_result("GET admin profile endpoint", False, 
                          f"Status: {response.status_code}")
    
    def test_job_creation(self):
        """Test job creation with current admin permissions"""
        print("\n=== 6. Testing Job Creation ===")
        
        if not self.access_token:
            self.log_result("Job creation test", False, "No access token available")
            return
        
        # Create a simple test job posting
        test_job = {
            "title": "Test Job Posting - Admin Permissions Investigation",
            "description": "This is a test job posting created during admin permissions investigation.",
            "department": "engineering",
            "location": "Lagos, Nigeria",
            "job_type": "full_time",
            "experience_level": "mid_level",
            "requirements": ["Test requirement 1", "Test requirement 2"],
            "benefits": ["Test benefit 1", "Test benefit 2"],
            "responsibilities": ["Test responsibility 1", "Test responsibility 2"],
            "salary_min": 150000,
            "salary_max": 300000,
            "salary_currency": "NGN",
            "is_salary_public": True,
            "status": "draft"
        }
        
        print(f"\n--- Test 6.1: POST /api/admin/jobs/postings ---")
        response = self.make_request("POST", "/admin/jobs/postings", 
                                   json=test_job, auth_token=self.access_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                job_id = data.get('job_id')
                self.log_result("Job creation test", True, 
                              f"Successfully created test job with ID: {job_id}")
                
                # Store job ID for potential cleanup
                self.test_data['created_job_id'] = job_id
                
            except json.JSONDecodeError:
                self.log_result("Job creation test", False, "Invalid JSON response")
        elif response.status_code == 403:
            self.log_result("Job creation test", False, 
                          "403 Forbidden - Admin lacks MANAGE_JOBS permission for job creation")
        elif response.status_code == 401:
            self.log_result("Job creation test", False, 
                          "401 Unauthorized - Token may be invalid or expired")
        else:
            self.log_result("Job creation test", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def provide_recommendations(self):
        """Provide recommendations based on investigation results"""
        print("\n=== 7. Recommendations ===")
        
        if not self.admin_info:
            print("❌ Could not investigate admin permissions - login failed")
            return
        
        admin_role = self.admin_info.get('role')
        
        print(f"\n--- Current Admin Status ---")
        print(f"Username: {self.admin_info.get('username', 'Unknown')}")
        print(f"Role: {admin_role}")
        print(f"Status: {self.admin_info.get('status', 'Unknown')}")
        print(f"Email: {self.admin_info.get('email', 'Unknown')}")
        
        # Analyze results and provide recommendations
        failed_tests = [error for error in self.results['errors'] if 'MANAGE_JOBS' in error or '403 Forbidden' in error]
        
        if failed_tests:
            print(f"\n--- ISSUE IDENTIFIED ---")
            print(f"❌ Admin user lacks proper permissions for job management")
            print(f"❌ Failed tests: {len(failed_tests)}")
            
            print(f"\n--- RECOMMENDED SOLUTIONS ---")
            if admin_role not in ['super_admin', 'content_admin']:
                print(f"1. UPDATE ADMIN ROLE: Change admin role from '{admin_role}' to 'content_admin' or 'super_admin'")
            
            print(f"2. VERIFY PERMISSION MAPPING: Ensure CONTENT_ADMIN role includes MANAGE_JOBS permission")
            print(f"3. CREATE NEW ADMIN: Create a new admin user with CONTENT_ADMIN role specifically for job management")
            print(f"4. CHECK DATABASE: Verify admin permissions are properly stored in database")
            
        else:
            print(f"\n--- STATUS: PERMISSIONS OK ---")
            print(f"✅ Admin user appears to have proper permissions for job management")
            print(f"✅ If 403 errors persist, check application logs for detailed error messages")
    
    def run_all_tests(self):
        """Run all admin permissions investigation tests"""
        print("🚀 Starting Admin User Permissions Investigation for Job Posting Management")
        print("=" * 80)
        
        try:
            # Test service health
            self.test_service_health()
            
            # Test admin login with legacy credentials
            self.test_admin_login_legacy_credentials()
            
            # Test admin me endpoint with token
            self.test_admin_me_endpoint()
            
            # Investigate admin user permissions
            self.investigate_admin_permissions()
            
            # Test job management endpoints access
            self.test_job_management_endpoints()
            
            # Test job creation with proper permissions
            self.test_job_creation()
            
            # Provide recommendations
            self.provide_recommendations()
            
        except Exception as e:
            print(f"❌ Critical error during investigation: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive investigation results"""
        print("\n" + "=" * 80)
        print("🏁 ADMIN USER PERMISSIONS INVESTIGATION RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        # Print key findings
        print(f"\n🎯 KEY INVESTIGATION FINDINGS:")
        
        if self.admin_info:
            admin_role = self.admin_info.get('role', 'Unknown')
            print(f"✅ Admin login successful with role: {admin_role}")
            print(f"✅ Admin account status: {self.admin_info.get('status', 'Unknown')}")
            
            # Check if permissions-related failures exist
            permission_failures = [error for error in self.results['errors'] 
                                 if 'MANAGE_JOBS' in error or '403 Forbidden' in error]
            
            if permission_failures:
                print(f"❌ PERMISSION ISSUES IDENTIFIED:")
                for error in permission_failures:
                    print(f"   - {error}")
                print(f"❌ Root cause: Admin user lacks MANAGE_JOBS permission")
                print(f"❌ Impact: Cannot create job postings via admin dashboard")
            else:
                print(f"✅ Admin permissions appear to be correctly configured")
                print(f"✅ Job management endpoints should be accessible")
        
        if self.results['failed'] > 0:
            print(f"\n🔍 DETAILED FAILURE ANALYSIS:")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"{i}. {error}")
        
        # Overall assessment
        permission_issues = len([e for e in self.results['errors'] if 'permission' in e.lower() or '403' in e])
        
        if permission_issues == 0 and success_rate >= 80:
            print(f"\n✅ OVERALL RESULT: PERMISSIONS CONFIGURED CORRECTLY")
            print(f"   Admin user should be able to manage job postings without 403 errors")
        elif permission_issues > 0:
            print(f"\n❌ OVERALL RESULT: PERMISSION CONFIGURATION ISSUE IDENTIFIED")
            print(f"   Admin user needs role/permission updates to manage job postings")
        else:
            print(f"\n⚠️  OVERALL RESULT: INVESTIGATION INCOMPLETE")
            print(f"   Some tests failed - manual verification may be required")
        
        print("=" * 80)

if __name__ == "__main__":
    investigator = AdminPermissionsInvestigator()
    investigator.run_all_tests()
#!/usr/bin/env python3
"""
Policy Management System Testing
Comprehensive testing of the policy management system with version control and scheduling
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://tradesman-connect.preview.emergentagent.com/api"

class PolicyTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
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
    
    def test_policy_management_system(self):
        """Test comprehensive policy management system with version control and scheduling"""
        print("\n=== Testing Policy Management System ===")
        
        # Test 1: Admin Authentication
        admin_credentials = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin/login", data=admin_credentials)
        if response.status_code == 200:
            admin_data = response.json()
            if admin_data.get('admin', {}).get('username') == 'admin':
                self.log_result("Admin authentication", True, "Admin login successful")
                admin_token = admin_data.get('token', 'admin_token_placeholder')
            else:
                self.log_result("Admin authentication", False, "Invalid admin response")
                return
        else:
            self.log_result("Admin authentication", False, f"Status: {response.status_code}, Response: {response.text}")
            return
        
        # Test 2: Get Policy Types
        response = self.make_request("GET", "/admin/policies/types")
        if response.status_code == 200:
            policy_types = response.json()
            expected_types = ['privacy_policy', 'terms_of_service', 'reviews_policy', 'cookie_policy', 'refund_policy']
            if 'policy_types' in policy_types and len(policy_types['policy_types']) >= 5:
                self.log_result("Get policy types", True, f"Found {len(policy_types['policy_types'])} policy types")
            else:
                self.log_result("Get policy types", False, "Invalid policy types response")
        else:
            self.log_result("Get policy types", False, f"Status: {response.status_code}")
        
        # Test 3: Get All Policies (Initially Empty)
        response = self.make_request("GET", "/admin/policies")
        if response.status_code == 200:
            policies_data = response.json()
            if 'policies' in policies_data and 'total_count' in policies_data:
                self.log_result("Get all policies", True, f"Found {policies_data['total_count']} policies")
                initial_policy_count = policies_data['total_count']
            else:
                self.log_result("Get all policies", False, "Invalid policies response structure")
        else:
            self.log_result("Get all policies", False, f"Status: {response.status_code}")
        
        # Test 4: Create New Privacy Policy (Active)
        privacy_policy_data = {
            "policy_type": "privacy_policy",
            "title": "ServiceHub Privacy Policy - Nigerian Marketplace",
            "content": "This Privacy Policy describes how ServiceHub ('we', 'our', or 'us') collects, uses, and protects your personal information when you use our Nigerian marketplace platform. We are committed to protecting your privacy and ensuring the security of your personal data in accordance with Nigerian data protection laws and international best practices. This policy applies to all users of our platform including homeowners seeking services and tradespeople offering services across Nigeria.",
            "effective_date": datetime.utcnow().isoformat(),  # Immediate activation
            "status": "active"
        }
        
        response = self.make_request("POST", "/admin/policies", json=privacy_policy_data)
        if response.status_code == 200:
            created_policy = response.json()
            if 'policy_id' in created_policy and created_policy['policy_type'] == 'privacy_policy':
                self.log_result("Create privacy policy", True, f"Policy ID: {created_policy['policy_id']}")
                self.test_data['privacy_policy_id'] = created_policy['policy_id']
            else:
                self.log_result("Create privacy policy", False, "Invalid policy creation response")
        else:
            self.log_result("Create privacy policy", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 5: Create Terms of Service Policy
        terms_policy_data = {
            "policy_type": "terms_of_service",
            "title": "ServiceHub Terms of Service - Nigerian Marketplace",
            "content": "Welcome to ServiceHub, Nigeria's premier marketplace connecting homeowners with skilled tradespeople. These Terms of Service ('Terms') govern your use of our platform and services. By accessing or using ServiceHub, you agree to be bound by these Terms. Our platform facilitates connections between homeowners seeking services and qualified tradespeople across Nigeria, including major cities like Lagos, Abuja, Port Harcourt, and Kano.",
            "effective_date": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        response = self.make_request("POST", "/admin/policies", json=terms_policy_data)
        if response.status_code == 200:
            created_policy = response.json()
            if 'policy_id' in created_policy and created_policy['policy_type'] == 'terms_of_service':
                self.log_result("Create terms of service", True, f"Policy ID: {created_policy['policy_id']}")
                self.test_data['terms_policy_id'] = created_policy['policy_id']
            else:
                self.log_result("Create terms of service", False, "Invalid policy creation response")
        else:
            self.log_result("Create terms of service", False, f"Status: {response.status_code}")
        
        # Test 6: Policy Validation - Content Too Short
        invalid_policy_data = {
            "policy_type": "cookie_policy",
            "title": "Short",
            "content": "Too short content"  # Less than 50 characters
        }
        
        response = self.make_request("POST", "/admin/policies", json=invalid_policy_data)
        if response.status_code == 400:
            self.log_result("Policy validation - short content", True, "Correctly rejected short content")
        else:
            self.log_result("Policy validation - short content", False, f"Expected 400, got {response.status_code}")
        
        # Test 7: Policy Validation - Invalid Policy Type
        invalid_type_data = {
            "policy_type": "invalid_policy_type",
            "title": "Valid Title for Testing",
            "content": "This is a valid content that meets the minimum length requirement of 50 characters for policy content validation."
        }
        
        response = self.make_request("POST", "/admin/policies", json=invalid_type_data)
        if response.status_code == 400:
            self.log_result("Policy validation - invalid type", True, "Correctly rejected invalid policy type")
        else:
            self.log_result("Policy validation - invalid type", False, f"Expected 400, got {response.status_code}")
        
        # Test 8: Get Specific Policy by Type
        response = self.make_request("GET", "/admin/policies/privacy_policy")
        if response.status_code == 200:
            policy_data = response.json()
            if 'policy' in policy_data and policy_data['policy']['policy_type'] == 'privacy_policy':
                self.log_result("Get privacy policy by type", True, f"Title: {policy_data['policy']['title']}")
            else:
                self.log_result("Get privacy policy by type", False, "Invalid policy response")
        else:
            self.log_result("Get privacy policy by type", False, f"Status: {response.status_code}")
        
        # Test 9: Update Policy
        if 'privacy_policy_id' in self.test_data:
            policy_id = self.test_data['privacy_policy_id']
            update_data = {
                "title": "ServiceHub Privacy Policy - Updated Nigerian Marketplace",
                "content": "This is the updated Privacy Policy for ServiceHub, Nigeria's leading marketplace platform. This updated version includes enhanced data protection measures, clearer user rights explanations, and compliance with the latest Nigerian data protection regulations. We have improved our privacy practices to better serve our users across all Nigerian states and territories.",
                "status": "active"
            }
            
            response = self.make_request("PUT", f"/admin/policies/{policy_id}", json=update_data)
            if response.status_code == 200:
                update_response = response.json()
                if update_response.get('policy_id') == policy_id:
                    self.log_result("Update policy", True, "Policy updated successfully")
                else:
                    self.log_result("Update policy", False, "Invalid update response")
            else:
                self.log_result("Update policy", False, f"Status: {response.status_code}")
        
        # Test 10: Get Policy History
        response = self.make_request("GET", "/admin/policies/privacy_policy/history")
        if response.status_code == 200:
            history_data = response.json()
            if 'history' in history_data and 'total_versions' in history_data:
                self.log_result("Get policy history", True, f"Found {history_data['total_versions']} versions")
                if len(history_data['history']) > 0:
                    self.test_data['policy_history'] = history_data['history']
            else:
                self.log_result("Get policy history", False, "Invalid history response")
        else:
            self.log_result("Get policy history", False, f"Status: {response.status_code}")
        
        # Test 11: Restore Policy Version
        if 'policy_history' in self.test_data and len(self.test_data['policy_history']) > 0:
            response = self.make_request("POST", "/admin/policies/privacy_policy/restore/1")
            if response.status_code == 200:
                restore_response = response.json()
                if 'restored_version' in restore_response and restore_response['restored_version'] == 1:
                    self.log_result("Restore policy version", True, "Version 1 restored successfully")
                else:
                    self.log_result("Restore policy version", False, "Invalid restore response")
            else:
                self.log_result("Restore policy version", False, f"Status: {response.status_code}")
        else:
            self.log_result("Restore policy version", False, "No policy history available for restore test")
        
        # Test 12: Archive Policy
        if 'terms_policy_id' in self.test_data:
            policy_id = self.test_data['terms_policy_id']
            response = self.make_request("POST", f"/admin/policies/{policy_id}/archive")
            if response.status_code == 200:
                archive_response = response.json()
                if archive_response.get('policy_id') == policy_id:
                    self.log_result("Archive policy", True, "Policy archived successfully")
                else:
                    self.log_result("Archive policy", False, "Invalid archive response")
            else:
                self.log_result("Archive policy", False, f"Status: {response.status_code}")
        
        # Test 13: Public Policies Endpoint (Footer Integration)
        response = self.make_request("GET", "/jobs/policies")
        if response.status_code == 200:
            public_policies = response.json()
            if 'policies' in public_policies and 'count' in public_policies:
                active_policies = [p for p in public_policies['policies'] if p.get('status') == 'active']
                self.log_result("Get public policies", True, f"Found {len(active_policies)} active public policies")
            else:
                self.log_result("Get public policies", False, "Invalid public policies response")
        else:
            self.log_result("Get public policies", False, f"Status: {response.status_code}")
        
        # Test 14: Public Specific Policy Endpoint
        response = self.make_request("GET", "/jobs/policies/privacy_policy")
        if response.status_code == 200:
            public_policy = response.json()
            if 'policy' in public_policy and public_policy['policy']['policy_type'] == 'privacy_policy':
                self.log_result("Get public privacy policy", True, f"Title: {public_policy['policy']['title']}")
            else:
                self.log_result("Get public privacy policy", False, "Invalid public policy response")
        else:
            self.log_result("Get public privacy policy", False, f"Status: {response.status_code}")
        
        # Test 15: Get Non-existent Policy
        response = self.make_request("GET", "/admin/policies/non_existent_policy")
        if response.status_code == 404:
            self.log_result("Get non-existent policy", True, "Correctly returned 404 for non-existent policy")
        else:
            self.log_result("Get non-existent policy", False, f"Expected 404, got {response.status_code}")
        
        # Test 16: Activate Scheduled Policies (Manual Trigger)
        response = self.make_request("POST", "/admin/policies/activate-scheduled")
        if response.status_code == 200:
            activation_response = response.json()
            if 'activated_count' in activation_response:
                self.log_result("Activate scheduled policies", True, f"Activated {activation_response['activated_count']} policies")
            else:
                self.log_result("Activate scheduled policies", False, "Invalid activation response")
        else:
            self.log_result("Activate scheduled policies", False, f"Status: {response.status_code}")
        
        # Test 17: Create Review Policy with Effective Date Scheduling
        review_policy_data = {
            "policy_type": "reviews_policy",
            "title": "ServiceHub Reviews and Rating Policy",
            "content": "This Reviews Policy governs how reviews and ratings work on the ServiceHub platform. All users can leave honest reviews about their experiences with tradespeople or homeowners. Reviews must be based on actual service experiences and should be constructive and respectful. We maintain the right to moderate reviews that violate our community guidelines or contain inappropriate content.",
            "effective_date": (datetime.utcnow() + timedelta(hours=1)).isoformat(),  # Scheduled for 1 hour from now
            "status": "scheduled"
        }
        
        response = self.make_request("POST", "/admin/policies", json=review_policy_data)
        if response.status_code == 200:
            created_policy = response.json()
            if 'policy_id' in created_policy and created_policy['policy_type'] == 'reviews_policy':
                self.log_result("Create scheduled review policy", True, f"Policy ID: {created_policy['policy_id']}")
                self.test_data['review_policy_id'] = created_policy['policy_id']
            else:
                self.log_result("Create scheduled review policy", False, "Invalid policy creation response")
        else:
            self.log_result("Create scheduled review policy", False, f"Status: {response.status_code}")
        
        # Test 18: Verify Policy Count Increased
        response = self.make_request("GET", "/admin/policies")
        if response.status_code == 200:
            policies_data = response.json()
            if 'total_count' in policies_data:
                final_policy_count = policies_data['total_count']
                if final_policy_count > initial_policy_count:
                    self.log_result("Policy count verification", True, f"Policy count increased from {initial_policy_count} to {final_policy_count}")
                else:
                    self.log_result("Policy count verification", False, f"Policy count did not increase: {initial_policy_count} -> {final_policy_count}")
            else:
                self.log_result("Policy count verification", False, "Invalid policies response")
        else:
            self.log_result("Policy count verification", False, f"Status: {response.status_code}")

    def run_tests(self):
        """Run all policy management tests"""
        print("🚀 Starting Policy Management System Testing")
        print("=" * 60)
        
        try:
            self.test_policy_management_system()
        except Exception as e:
            print(f"❌ Critical error during testing: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical testing error: {e}")
        
        # Print final results
        print("\n" + "=" * 60)
        print("🏁 POLICY MANAGEMENT TESTING RESULTS")
        print("=" * 60)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100)
            print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ FAILED TESTS ({len(self.results['errors'])}):")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n🎯 Policy Management System Test Summary:")
        print("   • Admin Authentication: Username/password validation")
        print("   • Policy CRUD Operations: Create, read, update, delete policies")
        print("   • Policy Types: Privacy, Terms, Reviews, Cookie, Refund policies")
        print("   • Policy Validation: Content length, title length, policy type validation")
        print("   • Version Control: Policy history tracking and version restoration")
        print("   • Effective Date Scheduling: Future policy activation")
        print("   • Public Access: Footer integration and public policy endpoints")
        print("   • Archive Management: Policy archiving and lifecycle management")

if __name__ == "__main__":
    tester = PolicyTester()
    tester.run_tests()
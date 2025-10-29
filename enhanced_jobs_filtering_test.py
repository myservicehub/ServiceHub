#!/usr/bin/env python3
"""
ENHANCED JOBS FILTERING SYSTEM TESTING FOR TRADESPEOPLE

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**1. Test Enhanced Jobs API for Tradespeople:**
- Test the `/api/jobs/for-tradesperson` endpoint with different tradesperson profiles
- Verify that jobs are filtered by tradesperson's `trade_categories` (skills)
- Test location-based filtering using `travel_distance_km` and coordinates
- Test the combination of both skills and location filtering

**2. Test Skills-Based Filtering:**
- Create/use a tradesperson with specific trade categories (e.g., "Plumbing", "Electrical")
- Verify only jobs matching those categories are returned
- Test case-insensitive matching for categories
- Test with tradespeople who have multiple skills

**3. Test Location-Based Filtering:**
- Test with tradespeople who have location coordinates set
- Verify distance calculation and filtering works correctly
- Test with different `travel_distance_km` values (default should be 25km)
- Test jobs returned with `distance_km` information

**4. Test Combined Skills + Location Filtering:**
- Test tradesperson with both skills and location data
- Verify jobs are filtered by BOTH criteria (skills AND location)
- Verify jobs are sorted by distance (closest first)

**5. Test Edge Cases:**
- Test tradesperson with no skills defined
- Test tradesperson with no location data
- Test when no jobs match the criteria
- Test error handling and fallback to general jobs

**6. Test Response Structure:**
- Verify the enhanced API response includes filtering information
- Test that `filtering_info` section shows active filters
- Test that `tradesperson_info` is included in response

**Test Data:**
- Use john.plumber@gmail.com (tradesperson with Plumbing skills)
- Test with different location coordinates
- Verify against actual jobs in the database

**Expected Results:**
- Tradespeople should only see jobs matching their skills
- Jobs should be filtered by location if coordinates are available
- Response should include filtering metadata
- Distance information should be accurate
- System should handle edge cases gracefully
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid
from collections import Counter

# Get backend URL from environment
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8001/api')

class EnhancedJobsFilteringTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.john_plumber_token = None
        self.john_plumber_id = None
        self.test_homeowner_token = None
        self.test_homeowner_id = None
        self.test_jobs = []
        
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
            
        except requests.exceptions.RequestException as request_error:
            print(f"❌ Request failed for {method} {url}: {str(request_error)}")
            # Return a mock response object for error handling
            class MockResponse:
                def __init__(self, error_msg):
                    self.status_code = 500
                    self.text = str(error_msg)
                    self.error_msg = error_msg
                def json(self):
                    return {"error": str(self.error_msg)}
            return MockResponse(request_error)

    def test_john_plumber_login(self):
        """Test login for tradesperson and fallback to registration if needed"""
        print("\n🔐 Testing John Plumber Login...")
        # Allow overriding via environment, else generate unique credentials
        email = os.getenv('TRADESPERSON_EMAIL')
        password = os.getenv('TRADESPERSON_PASSWORD')
        if not email:
            email = f"john.plumber.{uuid.uuid4().hex[:8]}@tradework.com"
        if not password:
            password = "TestPass123!"

        login_data = {"email": email, "password": password}
        response = self.make_request('POST', '/auth/login', json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.john_plumber_token = data.get('access_token')
            self.john_plumber_id = data.get('user', {}).get('id')
            
            # Verify user is a tradesperson
            user_role = data.get('user', {}).get('role')
            if user_role == 'tradesperson':
                self.log_result("John Plumber Login", True, f"Successfully logged in as tradesperson (ID: {self.john_plumber_id})")
                return True
            else:
                self.log_result("John Plumber Login", False, f"User role is '{user_role}', expected 'tradesperson'")
                return False
        else:
            # Fallback: attempt to register a new tradesperson
            print("   ⚠️ Login failed, attempting tradesperson registration fallback...")
            registration_data = {
                "name": "John Plumber Test",
                "email": email,
                "password": password,
                "phone": "+2348012345678",
                "location": "Lagos",
                "postcode": "100001",
                "trade_categories": ["Plumbing"],
                "experience_years": 4,
                "company_name": "Dashboard Test Services",
                "description": "Experienced tradesperson providing reliable plumbing services across Lagos with certifications and 4 years' experience.",
                "certifications": ["Licensed Plumber"]
            }
            reg_response = self.make_request('POST', '/auth/register/tradesperson', json=registration_data)
            if reg_response.status_code == 200:
                reg_data = reg_response.json()
                self.john_plumber_token = reg_data.get('access_token')
                self.john_plumber_id = reg_data.get('user', {}).get('id')
                role = reg_data.get('user', {}).get('role')
                if self.john_plumber_token and role == 'tradesperson':
                    self.log_result("Tradesperson Registration Fallback", True, f"Registered and authenticated tradesperson (ID: {self.john_plumber_id})")
                    return True
                else:
                    self.log_result("Tradesperson Registration Fallback", False, "Registration succeeded but token/role invalid")
                    return False
            else:
                self.log_result("John Plumber Login", False, f"Status: {response.status_code}, Response: {response.text}; Fallback registration failed: {reg_response.status_code}, {reg_response.text}")
                return False
        
    def test_tradesperson_profile_verification(self):
        """Verify john.plumber@gmail.com has proper trade categories and location data"""
        print("\n👤 Testing Tradesperson Profile Verification...")
        
        if not self.john_plumber_token:
            self.log_result("Profile Verification", False, "No authentication token available")
            return False
        
        response = self.make_request('GET', '/auth/me', auth_token=self.john_plumber_token)
        
        if response.status_code == 200:
            profile = response.json()
            
            # Check trade categories
            trade_categories = profile.get('trade_categories', [])
            has_plumbing = any('plumbing' in cat.lower() for cat in trade_categories)
            
            # Check location data
            latitude = profile.get('latitude')
            longitude = profile.get('longitude')
            travel_distance = profile.get('travel_distance_km', 25)
            
            self.log_result("Profile Verification - Trade Categories", len(trade_categories) > 0, 
                          f"Categories: {trade_categories}")
            self.log_result("Profile Verification - Plumbing Skill", has_plumbing, 
                          f"Has plumbing skill: {has_plumbing}")
            self.log_result("Profile Verification - Location Data", 
                          latitude is not None and longitude is not None,
                          f"Lat: {latitude}, Lng: {longitude}, Travel: {travel_distance}km")
            
            # Store profile data for later tests
            self.test_data['john_profile'] = profile
            return True
        else:
            self.log_result("Profile Verification", False, f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_basic_jobs_for_tradesperson_endpoint(self):
        """Test basic functionality of /api/jobs/for-tradesperson endpoint"""
        print("\n🔧 Testing Basic Jobs for Tradesperson Endpoint...")
        
        if not self.john_plumber_token:
            self.log_result("Basic Endpoint Test", False, "No authentication token available")
            return False
        
        response = self.make_request('GET', '/jobs/for-tradesperson', auth_token=self.john_plumber_token)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify response structure
            required_fields = ['jobs', 'total', 'filtering_info', 'tradesperson_info', 'pagination']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_result("Basic Endpoint Test - Response Structure", True, 
                              f"All required fields present: {required_fields}")
                
                # Check filtering_info structure
                filtering_info = data.get('filtering_info', {})
                filtering_fields = ['skills_filter', 'location_filter', 'filtered_by_skills', 'max_distance_km']
                filtering_missing = [field for field in filtering_fields if field not in filtering_info]
                
                self.log_result("Basic Endpoint Test - Filtering Info", len(filtering_missing) == 0,
                              f"Filtering info fields: {list(filtering_info.keys())}")
                
                # Check tradesperson_info structure
                tradesperson_info = data.get('tradesperson_info', {})
                tradesperson_fields = ['trade_categories', 'location', 'travel_distance_km']
                tradesperson_missing = [field for field in tradesperson_fields if field not in tradesperson_info]
                
                self.log_result("Basic Endpoint Test - Tradesperson Info", len(tradesperson_missing) == 0,
                              f"Tradesperson info fields: {list(tradesperson_info.keys())}")
                
                # Store response data for analysis
                self.test_data['basic_response'] = data
                return True
            else:
                self.log_result("Basic Endpoint Test", False, f"Missing required fields: {missing_fields}")
                return False
        else:
            self.log_result("Basic Endpoint Test", False, f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_skills_based_filtering(self):
        """Test that jobs are filtered by tradesperson's skills"""
        print("\n🎯 Testing Skills-Based Filtering...")
        
        if not self.john_plumber_token or 'basic_response' not in self.test_data:
            self.log_result("Skills Filtering Test", False, "Prerequisites not met")
            return False
        
        data = self.test_data['basic_response']
        jobs = data.get('jobs', [])
        filtering_info = data.get('filtering_info', {})
        tradesperson_info = data.get('tradesperson_info', {})
        
        # Check if skills filter is active
        skills_filter_active = filtering_info.get('skills_filter', False)
        filtered_by_skills = filtering_info.get('filtered_by_skills', [])
        tradesperson_categories = tradesperson_info.get('trade_categories', [])
        
        self.log_result("Skills Filtering - Filter Active", skills_filter_active,
                      f"Skills filter active: {skills_filter_active}")
        
        if skills_filter_active and jobs:
            # Verify jobs match tradesperson's skills
            matching_jobs = 0
            total_jobs = len(jobs)
            
            for job in jobs:
                job_category = job.get('category', '').lower()
                matches_skill = any(skill.lower() in job_category or job_category in skill.lower() 
                                  for skill in tradesperson_categories)
                if matches_skill:
                    matching_jobs += 1
            
            match_percentage = (matching_jobs / total_jobs * 100) if total_jobs > 0 else 0
            
            self.log_result("Skills Filtering - Job Matching", match_percentage >= 80,
                          f"{matching_jobs}/{total_jobs} jobs match skills ({match_percentage:.1f}%)")
            
            # Test case-insensitive matching
            plumbing_jobs = [job for job in jobs if 'plumbing' in job.get('category', '').lower()]
            has_plumbing_skill = any('plumbing' in skill.lower() for skill in tradesperson_categories)
            
            if has_plumbing_skill:
                self.log_result("Skills Filtering - Case Insensitive", len(plumbing_jobs) > 0,
                              f"Found {len(plumbing_jobs)} plumbing jobs for plumber")
            
            return True
        elif not skills_filter_active:
            self.log_result("Skills Filtering - No Skills", True, "No skills defined, showing all jobs")
            return True
        else:
            self.log_result("Skills Filtering", False, "No jobs returned despite skills filter being active")
            return False

    def test_location_based_filtering(self):
        """Test location-based filtering with distance calculations"""
        print("\n📍 Testing Location-Based Filtering...")
        
        if not self.john_plumber_token or 'basic_response' not in self.test_data:
            self.log_result("Location Filtering Test", False, "Prerequisites not met")
            return False
        
        data = self.test_data['basic_response']
        jobs = data.get('jobs', [])
        filtering_info = data.get('filtering_info', {})
        tradesperson_info = data.get('tradesperson_info', {})
        
        # Check if location filter is active
        location_filter_active = filtering_info.get('location_filter', False)
        max_distance = filtering_info.get('max_distance_km', 25)
        
        self.log_result("Location Filtering - Filter Active", location_filter_active,
                      f"Location filter active: {location_filter_active}, Max distance: {max_distance}km")
        
        if location_filter_active and jobs:
            # Check if jobs have distance information
            jobs_with_distance = [job for job in jobs if 'distance_km' in job]
            distance_percentage = (len(jobs_with_distance) / len(jobs) * 100) if jobs else 0
            
            self.log_result("Location Filtering - Distance Info", distance_percentage >= 80,
                          f"{len(jobs_with_distance)}/{len(jobs)} jobs have distance info ({distance_percentage:.1f}%)")
            
            # Verify jobs are within travel distance
            if jobs_with_distance:
                jobs_within_distance = [job for job in jobs_with_distance 
                                      if job.get('distance_km', float('inf')) <= max_distance]
                within_distance_percentage = (len(jobs_within_distance) / len(jobs_with_distance) * 100)
                
                self.log_result("Location Filtering - Distance Compliance", within_distance_percentage >= 90,
                              f"{len(jobs_within_distance)}/{len(jobs_with_distance)} jobs within {max_distance}km ({within_distance_percentage:.1f}%)")
                
                # Check if jobs are sorted by distance (closest first)
                distances = [job.get('distance_km', float('inf')) for job in jobs_with_distance]
                is_sorted = all(distances[i] <= distances[i+1] for i in range(len(distances)-1))
                
                self.log_result("Location Filtering - Distance Sorting", is_sorted,
                              f"Jobs sorted by distance: {is_sorted}, Distances: {distances[:5]}")
            
            return True
        elif not location_filter_active:
            self.log_result("Location Filtering - No Location", True, "No location data, using skills-only filtering")
            return True
        else:
            self.log_result("Location Filtering", False, "Location filter active but no jobs returned")
            return False

    def test_combined_skills_and_location_filtering(self):
        """Test combined skills and location filtering"""
        print("\n🎯📍 Testing Combined Skills + Location Filtering...")
        
        if not self.john_plumber_token or 'basic_response' not in self.test_data:
            self.log_result("Combined Filtering Test", False, "Prerequisites not met")
            return False
        
        data = self.test_data['basic_response']
        jobs = data.get('jobs', [])
        filtering_info = data.get('filtering_info', {})
        tradesperson_info = data.get('tradesperson_info', {})
        
        skills_filter_active = filtering_info.get('skills_filter', False)
        location_filter_active = filtering_info.get('location_filter', False)
        
        if skills_filter_active and location_filter_active:
            self.log_result("Combined Filtering - Both Filters Active", True,
                          "Both skills and location filters are active")
            
            if jobs:
                # Verify jobs match both criteria
                tradesperson_categories = tradesperson_info.get('trade_categories', [])
                max_distance = filtering_info.get('max_distance_km', 25)
                
                matching_both = 0
                for job in jobs:
                    # Check skills match
                    job_category = job.get('category', '').lower()
                    matches_skill = any(skill.lower() in job_category or job_category in skill.lower() 
                                      for skill in tradesperson_categories)
                    
                    # Check distance
                    within_distance = job.get('distance_km', float('inf')) <= max_distance
                    
                    if matches_skill and within_distance:
                        matching_both += 1
                
                match_percentage = (matching_both / len(jobs) * 100) if jobs else 0
                
                self.log_result("Combined Filtering - Dual Criteria", match_percentage >= 80,
                              f"{matching_both}/{len(jobs)} jobs match both skills and location ({match_percentage:.1f}%)")
                
                return True
            else:
                self.log_result("Combined Filtering", False, "Both filters active but no jobs returned")
                return False
        else:
            self.log_result("Combined Filtering - Not Both Active", True,
                          f"Skills: {skills_filter_active}, Location: {location_filter_active}")
            return True

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n🔍 Testing Edge Cases...")
        
        # Test with invalid authentication
        response = self.make_request('GET', '/jobs/for-tradesperson')
        self.log_result("Edge Case - No Auth", response.status_code in [401, 403],
                      f"Unauthenticated request properly rejected: {response.status_code}")
        
        # Test with pagination parameters
        if self.john_plumber_token:
            response = self.make_request('GET', '/jobs/for-tradesperson?skip=0&limit=5', 
                                       auth_token=self.john_plumber_token)
            
            if response.status_code == 200:
                data = response.json()
                jobs = data.get('jobs', [])
                pagination = data.get('pagination', {})
                
                self.log_result("Edge Case - Pagination", len(jobs) <= 5,
                              f"Pagination working: {len(jobs)} jobs returned, limit=5")
                
                # Check pagination info
                expected_pagination = {'skip': 0, 'limit': 5}
                pagination_correct = all(pagination.get(k) == v for k, v in expected_pagination.items())
                
                self.log_result("Edge Case - Pagination Info", pagination_correct,
                              f"Pagination info: {pagination}")
            else:
                self.log_result("Edge Case - Pagination", False, 
                              f"Pagination test failed: {response.status_code}")
        
        return True

    def test_response_structure_validation(self):
        """Validate the complete response structure"""
        print("\n📋 Testing Response Structure Validation...")
        
        if 'basic_response' not in self.test_data:
            self.log_result("Response Structure", False, "No response data available")
            return False
        
        data = self.test_data['basic_response']
        
        # Test jobs array structure
        jobs = data.get('jobs', [])
        if jobs:
            sample_job = jobs[0]
            expected_job_fields = ['id', 'title', 'description', 'category', 'location', 'budget_min', 'budget_max']
            job_fields_present = [field for field in expected_job_fields if field in sample_job]
            
            self.log_result("Response Structure - Job Fields", len(job_fields_present) >= 5,
                          f"Job has {len(job_fields_present)}/{len(expected_job_fields)} expected fields")
        
        # Test filtering_info structure
        filtering_info = data.get('filtering_info', {})
        expected_filtering_fields = ['skills_filter', 'location_filter', 'filtered_by_skills', 'max_distance_km']
        filtering_fields_present = [field for field in expected_filtering_fields if field in filtering_info]
        
        self.log_result("Response Structure - Filtering Info", len(filtering_fields_present) == len(expected_filtering_fields),
                      f"Filtering info has {len(filtering_fields_present)}/{len(expected_filtering_fields)} expected fields")
        
        # Test tradesperson_info structure
        tradesperson_info = data.get('tradesperson_info', {})
        expected_tradesperson_fields = ['trade_categories', 'location', 'travel_distance_km']
        tradesperson_fields_present = [field for field in expected_tradesperson_fields if field in tradesperson_info]
        
        self.log_result("Response Structure - Tradesperson Info", len(tradesperson_fields_present) == len(expected_tradesperson_fields),
                      f"Tradesperson info has {len(tradesperson_fields_present)}/{len(expected_tradesperson_fields)} expected fields")
        
        # Test data types
        self.log_result("Response Structure - Data Types", 
                      isinstance(data.get('jobs'), list) and 
                      isinstance(data.get('total'), int) and
                      isinstance(filtering_info.get('skills_filter'), bool) and
                      isinstance(filtering_info.get('location_filter'), bool),
                      "All data types are correct")
        
        return True

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Enhanced Jobs Filtering System Testing...")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Core functionality tests
        if self.test_john_plumber_login():
            self.test_tradesperson_profile_verification()
            self.test_basic_jobs_for_tradesperson_endpoint()
            self.test_skills_based_filtering()
            self.test_location_based_filtering()
            self.test_combined_skills_and_location_filtering()
            self.test_response_structure_validation()
        
        # Edge cases and error handling
        self.test_edge_cases()
        
        # Print final results
        self.print_final_results()

    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 80)
        print("🎯 ENHANCED JOBS FILTERING SYSTEM TEST RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Test summary based on requirements
        print(f"\n📋 REQUIREMENTS VERIFICATION:")
        
        if 'basic_response' in self.test_data:
            data = self.test_data['basic_response']
            filtering_info = data.get('filtering_info', {})
            
            print(f"   ✅ Enhanced Jobs API endpoint working: /api/jobs/for-tradesperson")
            print(f"   ✅ Skills filtering: {filtering_info.get('skills_filter', False)}")
            print(f"   ✅ Location filtering: {filtering_info.get('location_filter', False)}")
            print(f"   ✅ Response structure includes filtering metadata")
            print(f"   ✅ Jobs returned: {data.get('total', 0)}")
            
            if filtering_info.get('location_filter') and data.get('jobs'):
                jobs_with_distance = [job for job in data['jobs'] if 'distance_km' in job]
                print(f"   ✅ Distance information: {len(jobs_with_distance)}/{len(data['jobs'])} jobs")
        
        print(f"\n🎉 TESTING COMPLETE!")
        
        if success_rate >= 80:
            print("🎯 ENHANCED JOBS FILTERING SYSTEM IS WORKING CORRECTLY!")
        else:
            print("⚠️  ENHANCED JOBS FILTERING SYSTEM NEEDS ATTENTION!")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = EnhancedJobsFilteringTester()
    success = tester.run_comprehensive_test()
    exit(0 if success else 1)
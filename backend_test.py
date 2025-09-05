#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for MyBuilder Clone
Tests all API endpoints with realistic data and error scenarios
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://builder-marketplace.preview.emergentagent.com/api"

class BackendTester:
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
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            # Set proper headers for JSON requests
            if 'json' in kwargs:
                if 'headers' not in kwargs:
                    kwargs['headers'] = {}
                kwargs['headers']['Content-Type'] = 'application/json'
            
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_endpoints(self):
        """Test basic health and connectivity"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        response = self.make_request("GET", "/")
        if response.status_code == 200:
            data = response.json()
            if "MyBuilder API" in data.get("message", ""):
                self.log_result("Root endpoint", True, f"Status: {data.get('status')}")
            else:
                self.log_result("Root endpoint", False, f"Unexpected response: {data}")
        else:
            self.log_result("Root endpoint", False, f"Status: {response.status_code}")
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                self.log_result("Health endpoint", True)
            else:
                self.log_result("Health endpoint", False, f"Status not healthy: {data}")
        else:
            self.log_result("Health endpoint", False, f"Status: {response.status_code}")
    
    def test_stats_endpoints(self):
        """Test statistics endpoints"""
        print("\n=== Testing Statistics Endpoints ===")
        
        # Test platform stats
        response = self.make_request("GET", "/stats/")
        if response.status_code == 200:
            data = response.json()
            required_fields = ['total_tradespeople', 'total_categories', 'total_reviews', 
                             'average_rating', 'total_jobs', 'active_jobs']
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                self.log_result("Platform stats", True, 
                               f"Tradespeople: {data['total_tradespeople']}, "
                               f"Reviews: {data['total_reviews']}, "
                               f"Avg Rating: {data['average_rating']}")
                self.test_data['stats'] = data
            else:
                self.log_result("Platform stats", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Platform stats", False, f"Status: {response.status_code}")
        
        # Test categories with counts
        response = self.make_request("GET", "/stats/categories")
        if response.status_code == 200:
            data = response.json()
            if 'categories' in data and isinstance(data['categories'], list):
                categories = data['categories']
                if len(categories) > 0:
                    # Check category structure
                    first_cat = categories[0]
                    required_cat_fields = ['title', 'tradesperson_count', 'description', 'icon']
                    missing_cat_fields = [field for field in required_cat_fields if field not in first_cat]
                    
                    if not missing_cat_fields:
                        self.log_result("Categories stats", True, 
                                       f"Found {len(categories)} categories")
                        self.test_data['categories'] = categories
                    else:
                        self.log_result("Categories stats", False, 
                                       f"Missing category fields: {missing_cat_fields}")
                else:
                    self.log_result("Categories stats", False, "No categories found")
            else:
                self.log_result("Categories stats", False, "Invalid response structure")
        else:
            self.log_result("Categories stats", False, f"Status: {response.status_code}")
    
    def test_jobs_endpoints(self):
        """Test jobs CRUD operations"""
        print("\n=== Testing Jobs Endpoints ===")
        
        # Test get jobs (should have seeded data)
        response = self.make_request("GET", "/jobs/", params={"page": 1, "limit": 5})
        if response.status_code == 200:
            data = response.json()
            if 'jobs' in data and 'pagination' in data:
                jobs = data['jobs']
                pagination = data['pagination']
                
                if len(jobs) > 0:
                    self.log_result("Get jobs", True, 
                                   f"Found {len(jobs)} jobs, Total: {pagination.get('total', 0)}")
                    self.test_data['sample_job'] = jobs[0]
                else:
                    self.log_result("Get jobs", False, "No jobs found in seeded data")
            else:
                self.log_result("Get jobs", False, "Invalid response structure")
        else:
            self.log_result("Get jobs", False, f"Status: {response.status_code}")
        
        # Test job creation
        job_data = {
            "title": "Kitchen Renovation - Modern Design Needed",
            "description": "Looking for an experienced kitchen fitter to completely renovate our kitchen. We want a modern design with new cabinets, countertops, and appliances. The space is approximately 12 square meters. We have already purchased the materials and need someone to handle the installation professionally.",
            "category": "Carpentry & Joinery",
            "location": "Manchester, Greater Manchester",
            "postcode": "M1 4BT",
            "budget_min": 3000,
            "budget_max": 5000,
            "timeline": "Within 2 months",
            "homeowner_name": "Sarah Johnson",
            "homeowner_email": "sarah.johnson@email.com",
            "homeowner_phone": "07123456789"
        }
        
        response = self.make_request("POST", "/jobs/", json=job_data)
        print(f"DEBUG: Job creation request - Status: {response.status_code}")
        print(f"DEBUG: Request data: {job_data}")
        print(f"DEBUG: Response: {response.text[:500]}")
        if response.status_code == 200:
            created_job = response.json()
            if 'id' in created_job and created_job['title'] == job_data['title']:
                self.log_result("Create job", True, f"Job ID: {created_job['id']}")
                self.test_data['created_job'] = created_job
            else:
                self.log_result("Create job", False, "Invalid job creation response")
        else:
            self.log_result("Create job", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test get specific job
        if 'created_job' in self.test_data:
            job_id = self.test_data['created_job']['id']
            response = self.make_request("GET", f"/jobs/{job_id}")
            if response.status_code == 200:
                job = response.json()
                if job['id'] == job_id:
                    self.log_result("Get specific job", True)
                else:
                    self.log_result("Get specific job", False, "Job ID mismatch")
            else:
                self.log_result("Get specific job", False, f"Status: {response.status_code}")
        
        # Test job search
        response = self.make_request("GET", "/jobs/search", 
                                   params={"q": "kitchen", "page": 1, "limit": 5})
        if response.status_code == 200:
            data = response.json()
            if 'jobs' in data:
                self.log_result("Job search", True, f"Found {len(data['jobs'])} jobs for 'kitchen'")
            else:
                self.log_result("Job search", False, "Invalid search response")
        else:
            self.log_result("Job search", False, f"Status: {response.status_code}")
        
        # Test job filtering by category
        if 'categories' in self.test_data and len(self.test_data['categories']) > 0:
            category = self.test_data['categories'][0]['title']
            response = self.make_request("GET", "/jobs/", 
                                       params={"category": category, "page": 1, "limit": 5})
            if response.status_code == 200:
                data = response.json()
                self.log_result("Job category filter", True, 
                               f"Found {len(data.get('jobs', []))} jobs for {category}")
            else:
                self.log_result("Job category filter", False, f"Status: {response.status_code}")
    
    def test_tradespeople_endpoints(self):
        """Test tradespeople CRUD operations"""
        print("\n=== Testing Tradespeople Endpoints ===")
        
        # Test get tradespeople (should have seeded data)
        response = self.make_request("GET", "/tradespeople/", params={"page": 1, "limit": 5})
        if response.status_code == 200:
            data = response.json()
            if 'tradespeople' in data and 'total' in data:
                tradespeople = data['tradespeople']
                if len(tradespeople) > 0:
                    self.log_result("Get tradespeople", True, 
                                   f"Found {len(tradespeople)} tradespeople, Total: {data['total']}")
                    self.test_data['sample_tradesperson'] = tradespeople[0]
                else:
                    self.log_result("Get tradespeople", False, "No tradespeople found")
            else:
                self.log_result("Get tradespeople", False, "Invalid response structure")
        else:
            self.log_result("Get tradespeople", False, f"Status: {response.status_code}")
        
        # Test tradesperson creation
        tradesperson_data = {
            "name": "Michael Thompson",
            "email": "michael.thompson@tradework.com",
            "phone": "07987654321",
            "trade_categories": ["Plumbing", "Heating & Gas"],
            "location": "Birmingham, West Midlands",
            "postcode": "B1 2AA",
            "experience_years": 8,
            "company_name": "Thompson Plumbing Services",
            "description": "Experienced plumber specializing in residential and commercial plumbing installations, repairs, and maintenance. Fully qualified gas safe engineer with 8 years of experience. I provide reliable, professional service with competitive pricing and guarantee all work completed.",
            "certifications": ["Gas Safe Registered", "City & Guilds Level 3"]
        }
        
        response = self.make_request("POST", "/tradespeople/", json=tradesperson_data)
        print(f"DEBUG: Tradesperson creation request - Status: {response.status_code}")
        print(f"DEBUG: Request data: {tradesperson_data}")
        print(f"DEBUG: Response: {response.text[:500]}")
        if response.status_code == 200:
            created_tradesperson = response.json()
            if 'id' in created_tradesperson and created_tradesperson['name'] == tradesperson_data['name']:
                self.log_result("Create tradesperson", True, f"ID: {created_tradesperson['id']}")
                self.test_data['created_tradesperson'] = created_tradesperson
            else:
                self.log_result("Create tradesperson", False, "Invalid creation response")
        else:
            self.log_result("Create tradesperson", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test get specific tradesperson
        if 'created_tradesperson' in self.test_data:
            tp_id = self.test_data['created_tradesperson']['id']
            response = self.make_request("GET", f"/tradespeople/{tp_id}")
            if response.status_code == 200:
                tradesperson = response.json()
                if tradesperson['id'] == tp_id:
                    self.log_result("Get specific tradesperson", True)
                else:
                    self.log_result("Get specific tradesperson", False, "ID mismatch")
            else:
                self.log_result("Get specific tradesperson", False, f"Status: {response.status_code}")
        
        # Test tradesperson filtering
        response = self.make_request("GET", "/tradespeople/", 
                                   params={"category": "Plumbing", "min_rating": 4.0})
        if response.status_code == 200:
            data = response.json()
            self.log_result("Tradesperson filtering", True, 
                           f"Found {len(data.get('tradespeople', []))} plumbers with 4+ rating")
        else:
            self.log_result("Tradesperson filtering", False, f"Status: {response.status_code}")
        
        # Test tradesperson reviews endpoint
        if 'sample_tradesperson' in self.test_data:
            tp_id = self.test_data['sample_tradesperson']['id']
            response = self.make_request("GET", f"/tradespeople/{tp_id}/reviews")
            if response.status_code == 200:
                data = response.json()
                if 'reviews' in data and 'tradesperson' in data:
                    self.log_result("Tradesperson reviews", True, 
                                   f"Found {len(data['reviews'])} reviews")
                else:
                    self.log_result("Tradesperson reviews", False, "Invalid response structure")
            else:
                self.log_result("Tradesperson reviews", False, f"Status: {response.status_code}")
    
    def test_quotes_endpoints(self):
        """Test quotes functionality"""
        print("\n=== Testing Quotes Endpoints ===")
        
        # Need both job and tradesperson for quote testing
        if 'created_job' not in self.test_data or 'created_tradesperson' not in self.test_data:
            self.log_result("Quote tests", False, "Missing required job or tradesperson data")
            return
        
        job_id = self.test_data['created_job']['id']
        tradesperson_id = self.test_data['created_tradesperson']['id']
        
        # Test quote creation
        quote_data = {
            "job_id": job_id,
            "tradesperson_id": tradesperson_id,
            "price": 4200,
            "message": "I can complete your kitchen renovation within your budget and timeline. I have 8 years of experience with similar projects and can provide references. The work includes full installation of cabinets, countertops, and appliance connections. I guarantee all work and provide a 2-year warranty.",
            "estimated_duration": "3-4 weeks",
            "start_date": (datetime.utcnow() + timedelta(days=14)).isoformat()
        }
        
        response = self.make_request("POST", "/quotes/", json=quote_data)
        if response.status_code == 200:
            created_quote = response.json()
            if 'id' in created_quote and created_quote['job_id'] == job_id:
                self.log_result("Create quote", True, f"Quote ID: {created_quote['id']}")
                self.test_data['created_quote'] = created_quote
            else:
                self.log_result("Create quote", False, "Invalid quote creation response")
        else:
            self.log_result("Create quote", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test get quotes for job
        response = self.make_request("GET", f"/quotes/job/{job_id}")
        if response.status_code == 200:
            data = response.json()
            if 'quotes' in data and 'job' in data:
                quotes = data['quotes']
                if len(quotes) > 0:
                    self.log_result("Get job quotes", True, f"Found {len(quotes)} quotes")
                else:
                    self.log_result("Get job quotes", False, "No quotes found")
            else:
                self.log_result("Get job quotes", False, "Invalid response structure")
        else:
            self.log_result("Get job quotes", False, f"Status: {response.status_code}")
        
        # Test duplicate quote prevention
        response = self.make_request("POST", "/quotes/", json=quote_data)
        if response.status_code == 400:
            self.log_result("Duplicate quote prevention", True, "Correctly rejected duplicate quote")
        else:
            self.log_result("Duplicate quote prevention", False, 
                           f"Should have rejected duplicate, got: {response.status_code}")
    
    def test_reviews_endpoints(self):
        """Test reviews functionality"""
        print("\n=== Testing Reviews Endpoints ===")
        
        # Test get reviews (should have seeded data)
        response = self.make_request("GET", "/reviews/", params={"page": 1, "limit": 5})
        if response.status_code == 200:
            data = response.json()
            if 'reviews' in data and 'pagination' in data:
                reviews = data['reviews']
                if len(reviews) > 0:
                    self.log_result("Get reviews", True, 
                                   f"Found {len(reviews)} reviews, Total: {data['pagination']['total']}")
                    self.test_data['sample_review'] = reviews[0]
                else:
                    self.log_result("Get reviews", False, "No reviews found")
            else:
                self.log_result("Get reviews", False, "Invalid response structure")
        else:
            self.log_result("Get reviews", False, f"Status: {response.status_code}")
        
        # Test featured reviews
        response = self.make_request("GET", "/reviews/featured", params={"limit": 4})
        if response.status_code == 200:
            reviews = response.json()
            if isinstance(reviews, list):
                self.log_result("Featured reviews", True, f"Found {len(reviews)} featured reviews")
            else:
                self.log_result("Featured reviews", False, "Invalid response format")
        else:
            self.log_result("Featured reviews", False, f"Status: {response.status_code}")
        
        # Test review creation (need job and tradesperson)
        if 'created_job' in self.test_data and 'created_tradesperson' in self.test_data:
            review_data = {
                "job_id": self.test_data['created_job']['id'],
                "tradesperson_id": self.test_data['created_tradesperson']['id'],
                "rating": 5,
                "title": "Excellent Kitchen Renovation Work",
                "comment": "Michael did an outstanding job on our kitchen renovation. Professional, punctual, and the quality of work exceeded our expectations. Highly recommended!",
                "homeowner_name": "Sarah Johnson"
            }
            
            response = self.make_request("POST", "/reviews/", json=review_data)
            if response.status_code == 200:
                created_review = response.json()
                if 'id' in created_review and created_review['rating'] == 5:
                    self.log_result("Create review", True, f"Review ID: {created_review['id']}")
                else:
                    self.log_result("Create review", False, "Invalid review creation response")
            else:
                self.log_result("Create review", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test review filtering
        response = self.make_request("GET", "/reviews/", 
                                   params={"min_rating": 4, "page": 1, "limit": 10})
        if response.status_code == 200:
            data = response.json()
            if 'reviews' in data:
                high_rated = data['reviews']
                self.log_result("Review filtering", True, 
                               f"Found {len(high_rated)} reviews with 4+ rating")
            else:
                self.log_result("Review filtering", False, "Invalid response structure")
        else:
            self.log_result("Review filtering", False, f"Status: {response.status_code}")
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n=== Testing Error Handling ===")
        
        # Test invalid job ID
        response = self.make_request("GET", "/jobs/invalid-job-id")
        if response.status_code == 404:
            self.log_result("Invalid job ID handling", True)
        else:
            self.log_result("Invalid job ID handling", False, f"Expected 404, got {response.status_code}")
        
        # Test invalid tradesperson ID
        response = self.make_request("GET", "/tradespeople/invalid-tp-id")
        if response.status_code == 404:
            self.log_result("Invalid tradesperson ID handling", True)
        else:
            self.log_result("Invalid tradesperson ID handling", False, f"Expected 404, got {response.status_code}")
        
        # Test invalid job creation (missing required fields)
        invalid_job = {"title": "Too short"}
        response = self.make_request("POST", "/jobs/", json=invalid_job)
        if response.status_code in [400, 422]:
            self.log_result("Invalid job creation handling", True)
        else:
            self.log_result("Invalid job creation handling", False, f"Expected 400/422, got {response.status_code}")
        
        # Test duplicate email registration
        if 'created_tradesperson' in self.test_data:
            duplicate_data = {
                "name": "Another Person",
                "email": self.test_data['created_tradesperson']['email'],  # Same email
                "phone": "07111111111",
                "trade_categories": ["Plumbing"],
                "location": "London",
                "postcode": "SW1A 1AA",
                "experience_years": 5,
                "description": "Another plumber with same email for testing duplicate prevention."
            }
            
            response = self.make_request("POST", "/tradespeople/", json=duplicate_data)
            if response.status_code == 400:
                self.log_result("Duplicate email handling", True)
            else:
                self.log_result("Duplicate email handling", False, f"Expected 400, got {response.status_code}")
    
    def test_pagination(self):
        """Test pagination functionality"""
        print("\n=== Testing Pagination ===")
        
        # Test jobs pagination
        response = self.make_request("GET", "/jobs/", params={"page": 1, "limit": 2})
        if response.status_code == 200:
            data = response.json()
            if 'pagination' in data:
                pagination = data['pagination']
                required_fields = ['page', 'limit', 'total', 'pages']
                if all(field in pagination for field in required_fields):
                    self.log_result("Jobs pagination", True, 
                                   f"Page {pagination['page']}/{pagination['pages']}")
                else:
                    self.log_result("Jobs pagination", False, "Missing pagination fields")
            else:
                self.log_result("Jobs pagination", False, "No pagination info")
        else:
            self.log_result("Jobs pagination", False, f"Status: {response.status_code}")
        
        # Test reviews pagination
        response = self.make_request("GET", "/reviews/", params={"page": 1, "limit": 3})
        if response.status_code == 200:
            data = response.json()
            if 'pagination' in data:
                self.log_result("Reviews pagination", True)
            else:
                self.log_result("Reviews pagination", False, "No pagination info")
        else:
            self.log_result("Reviews pagination", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting MyBuilder Backend API Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_stats_endpoints()
            self.test_jobs_endpoints()
            self.test_tradespeople_endpoints()
            self.test_quotes_endpoints()
            self.test_reviews_endpoints()
            self.test_error_handling()
            self.test_pagination()
            
        except Exception as e:
            print(f"\n❌ Critical test failure: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical failure: {str(e)}")
        
        # Print summary
        print(f"\n{'='*50}")
        print("🏁 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed']/(self.results['passed']+self.results['failed'])*100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        exit(1)
    else:
        print(f"\n🎉 All tests passed successfully!")
        exit(0)
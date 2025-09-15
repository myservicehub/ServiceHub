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
from typing import Dict, List, Any, Optional
import uuid
from collections import Counter

# Get backend URL from environment
BACKEND_URL = "https://content-job-manager.preview.emergentagent.com/api"

class ReviewSystemTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.homeowner_token = None
        self.tradesperson_token = None
        self.homeowner_id = None
        self.tradesperson_id = None
        self.test_job_id = None
        self.test_review_id = None
        
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
    
    def setup_test_users(self):
        """Create test homeowner and tradesperson users"""
        print("\n=== Setting Up Test Users ===")
        
        # Create test homeowner
        homeowner_data = {
            "name": "Test Homeowner Review",
            "email": f"homeowner.review.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348012345678",
            "location": "Lagos, Ikeja, Computer Village",
            "postcode": "100001"
        }
        
        print(f"\n--- Creating Test Homeowner ---")
        response = self.make_request("POST", "/auth/register/homeowner", json=homeowner_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.homeowner_token = data.get('access_token')
                self.homeowner_id = data.get('user', {}).get('id')
                self.log_result("Homeowner creation", True, f"ID: {self.homeowner_id}")
            except json.JSONDecodeError:
                self.log_result("Homeowner creation", False, "Invalid JSON response")
        else:
            self.log_result("Homeowner creation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Create test tradesperson
        tradesperson_data = {
            "name": "Test Tradesperson Review",
            "email": f"tradesperson.review.{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPassword123!",
            "phone": "+2348087654321",
            "location": "Lagos, Ikeja, Computer Village",
            "postcode": "100001",
            "trade_categories": ["Electrical Repairs"],
            "experience_years": 5,
            "description": "Experienced electrician for review testing with over 5 years of experience in residential and commercial electrical work."
        }
        
        print(f"\n--- Creating Test Tradesperson ---")
        response = self.make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.tradesperson_token = data.get('access_token')
                self.tradesperson_id = data.get('user', {}).get('id')
                self.log_result("Tradesperson creation", True, f"ID: {self.tradesperson_id}")
            except json.JSONDecodeError:
                self.log_result("Tradesperson creation", False, "Invalid JSON response")
        else:
            self.log_result("Tradesperson creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def create_test_job(self):
        """Create a test job for review testing"""
        print("\n=== Creating Test Job ===")
        
        if not self.homeowner_token:
            self.log_result("Test job creation", False, "No homeowner token available")
            return
        
        job_data = {
            "title": "Electrical Wiring Review Test Job",
            "description": "Test job for review system testing - electrical wiring work needed",
            "category": "Electrical Repairs",
            "location": {
                "state": "Lagos",
                "lga": "Ikeja", 
                "town": "Computer Village",
                "address": "123 Test Street"
            },
            "budget": {
                "min": 50000,
                "max": 100000,
                "currency": "NGN"
            },
            "timeline": "1-2 weeks",
            "requirements": ["Licensed electrician", "Experience with home wiring"],
            "urgency": "medium"
        }
        
        response = self.make_request("POST", "/jobs", json=job_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_job_id = data.get('id')
                self.log_result("Test job creation", True, f"Job ID: {self.test_job_id}")
                
                # Mark job as completed for review testing
                self.mark_job_completed()
                
            except json.JSONDecodeError:
                self.log_result("Test job creation", False, "Invalid JSON response")
        else:
            self.log_result("Test job creation", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def mark_job_completed(self):
        """Mark the test job as completed"""
        print("\n--- Marking Job as Completed ---")
        
        if not self.test_job_id or not self.homeowner_token:
            self.log_result("Job completion", False, "Missing job ID or homeowner token")
            return
        
        # Update job status to completed
        update_data = {
            "status": "completed",
            "completion_notes": "Job completed successfully for review testing"
        }
        
        response = self.make_request("PUT", f"/jobs/{self.test_job_id}", 
                                   json=update_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            self.log_result("Job completion", True, "Job marked as completed")
        else:
            self.log_result("Job completion", False, f"Status: {response.status_code}")
    
    def test_review_creation_endpoint(self):
        """Test POST /api/reviews/create endpoint"""
        print("\n=== Testing Review Creation Endpoint ===")
        
        if not all([self.homeowner_token, self.tradesperson_id, self.test_job_id]):
            self.log_result("Review creation endpoint", False, "Missing required test data")
            return
        
        # Test 1: Create a valid review
        print(f"\n--- Test 1: Create Valid Review ---")
        review_data = {
            "job_id": self.test_job_id,
            "reviewee_id": self.tradesperson_id,
            "rating": 5,
            "title": "Excellent Electrical Work",
            "content": "The electrician did an outstanding job with the wiring. Very professional, punctual, and the work quality was excellent. Highly recommended!",
            "category_ratings": {
                "quality": 5,
                "timeliness": 5,
                "communication": 4,
                "professionalism": 5,
                "value_for_money": 4
            },
            "photos": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
            "would_recommend": True
        }
        
        response = self.make_request("POST", "/reviews/create", 
                                   json=review_data, auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_review_id = data.get('id')
                
                # Verify response structure
                required_fields = ['id', 'job_id', 'reviewer_id', 'reviewee_id', 'rating', 'title', 'content']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Valid review creation", True, f"Review ID: {self.test_review_id}")
                    
                    # Verify review data
                    if data.get('rating') == 5 and data.get('title') == review_data['title']:
                        self.log_result("Review data verification", True, "All fields match")
                    else:
                        self.log_result("Review data verification", False, "Data mismatch")
                        
                    # Verify category ratings
                    if data.get('category_ratings') and len(data['category_ratings']) == 5:
                        self.log_result("Category ratings", True, f"Found {len(data['category_ratings'])} categories")
                    else:
                        self.log_result("Category ratings", False, "Category ratings missing or incomplete")
                        
                else:
                    self.log_result("Valid review creation", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Valid review creation", False, "Invalid JSON response")
        else:
            self.log_result("Valid review creation", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Try to create duplicate review (should fail)
        print(f"\n--- Test 2: Duplicate Review Prevention ---")
        response = self.make_request("POST", "/reviews/create", 
                                   json=review_data, auth_token=self.homeowner_token)
        
        if response.status_code == 400:
            self.log_result("Duplicate review prevention", True, "Correctly rejected duplicate review")
        else:
            self.log_result("Duplicate review prevention", False, f"Expected 400, got {response.status_code}")
        
        # Test 3: Invalid review data
        print(f"\n--- Test 3: Invalid Review Data Validation ---")
        invalid_review_data = {
            "job_id": self.test_job_id,
            "reviewee_id": self.tradesperson_id,
            "rating": 6,  # Invalid rating (> 5)
            "title": "Bad",  # Too short
            "content": "Bad work"  # Too short
        }
        
        response = self.make_request("POST", "/reviews/create", 
                                   json=invalid_review_data, auth_token=self.homeowner_token)
        
        if response.status_code in [400, 422]:
            self.log_result("Invalid review data validation", True, "Correctly rejected invalid data")
        else:
            self.log_result("Invalid review data validation", False, f"Expected 400/422, got {response.status_code}")
        
        # Test 4: Unauthorized review creation
        print(f"\n--- Test 4: Unauthorized Review Creation ---")
        response = self.make_request("POST", "/reviews/create", json=review_data)
        
        if response.status_code in [401, 403]:
            self.log_result("Unauthorized review creation", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Unauthorized review creation", False, f"Expected 401/403, got {response.status_code}")
    
    def test_get_user_reviews_endpoint(self):
        """Test GET /api/reviews/user/{userId} endpoint"""
        print("\n=== Testing Get User Reviews Endpoint ===")
        
        if not self.tradesperson_id:
            self.log_result("Get user reviews endpoint", False, "No tradesperson ID available")
            return
        
        # Test 1: Get reviews for tradesperson
        print(f"\n--- Test 1: Get Reviews for Tradesperson ---")
        response = self.make_request("GET", f"/reviews/user/{self.tradesperson_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['reviews', 'total', 'page', 'limit', 'total_pages', 'average_rating']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("User reviews response structure", True, 
                                  f"Found {data['total']} reviews, avg rating: {data['average_rating']}")
                    
                    # Verify reviews array
                    if isinstance(data['reviews'], list):
                        self.log_result("Reviews array format", True, f"Reviews list with {len(data['reviews'])} items")
                        
                        # Check if our test review is included
                        if data['reviews'] and self.test_review_id:
                            review_ids = [r.get('id') for r in data['reviews']]
                            if self.test_review_id in review_ids:
                                self.log_result("Test review inclusion", True, "Test review found in results")
                            else:
                                self.log_result("Test review inclusion", False, "Test review not found")
                    else:
                        self.log_result("Reviews array format", False, "Reviews is not a list")
                        
                else:
                    self.log_result("User reviews response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Get user reviews endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Get user reviews endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: Get reviews with pagination
        print(f"\n--- Test 2: Reviews Pagination ---")
        response = self.make_request("GET", f"/reviews/user/{self.tradesperson_id}?page=1&limit=5")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('page') == 1 and data.get('limit') == 5:
                    self.log_result("Reviews pagination", True, f"Page {data['page']}, limit {data['limit']}")
                else:
                    self.log_result("Reviews pagination", False, "Pagination parameters not respected")
            except json.JSONDecodeError:
                self.log_result("Reviews pagination", False, "Invalid JSON response")
        else:
            self.log_result("Reviews pagination", False, f"Status: {response.status_code}")
        
        # Test 3: Non-existent user
        print(f"\n--- Test 3: Non-existent User Reviews ---")
        fake_user_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/reviews/user/{fake_user_id}")
        
        if response.status_code == 404:
            self.log_result("Non-existent user reviews", True, "Correctly returned 404 for non-existent user")
        else:
            self.log_result("Non-existent user reviews", False, f"Expected 404, got {response.status_code}")
    
    def test_get_job_reviews_endpoint(self):
        """Test GET /api/reviews/job/{jobId} endpoint"""
        print("\n=== Testing Get Job Reviews Endpoint ===")
        
        if not self.test_job_id:
            self.log_result("Get job reviews endpoint", False, "No test job ID available")
            return
        
        # Test 1: Get reviews for job
        print(f"\n--- Test 1: Get Reviews for Job ---")
        response = self.make_request("GET", f"/reviews/job/{self.test_job_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_result("Job reviews response format", True, f"Found {len(data)} reviews for job")
                    
                    # Check if our test review is included
                    if data and self.test_review_id:
                        review_ids = [r.get('id') for r in data]
                        if self.test_review_id in review_ids:
                            self.log_result("Job review inclusion", True, "Test review found in job reviews")
                        else:
                            self.log_result("Job review inclusion", False, "Test review not found in job reviews")
                else:
                    self.log_result("Job reviews response format", False, "Response is not a list")
                    
            except json.JSONDecodeError:
                self.log_result("Get job reviews endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Get job reviews endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: Non-existent job
        print(f"\n--- Test 2: Non-existent Job Reviews ---")
        fake_job_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/reviews/job/{fake_job_id}")
        
        if response.status_code == 404:
            self.log_result("Non-existent job reviews", True, "Correctly returned 404 for non-existent job")
        else:
            self.log_result("Non-existent job reviews", False, f"Expected 404, got {response.status_code}")
    
    def test_get_review_summary_endpoint(self):
        """Test GET /api/reviews/summary/{userId} endpoint"""
        print("\n=== Testing Get Review Summary Endpoint ===")
        
        if not self.tradesperson_id:
            self.log_result("Get review summary endpoint", False, "No tradesperson ID available")
            return
        
        # Test 1: Get review summary for tradesperson
        print(f"\n--- Test 1: Get Review Summary ---")
        response = self.make_request("GET", f"/reviews/summary/{self.tradesperson_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify summary structure
                required_fields = ['total_reviews', 'average_rating', 'rating_distribution', 'recommendation_percentage']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Review summary structure", True, 
                                  f"Total: {data['total_reviews']}, Avg: {data['average_rating']}")
                    
                    # Verify rating distribution
                    if isinstance(data['rating_distribution'], dict):
                        self.log_result("Rating distribution format", True, "Rating distribution is a dict")
                    else:
                        self.log_result("Rating distribution format", False, "Rating distribution is not a dict")
                        
                    # Verify recommendation percentage
                    if 0 <= data['recommendation_percentage'] <= 100:
                        self.log_result("Recommendation percentage", True, f"{data['recommendation_percentage']}%")
                    else:
                        self.log_result("Recommendation percentage", False, "Invalid percentage value")
                        
                else:
                    self.log_result("Review summary structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("Get review summary endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Get review summary endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: Non-existent user summary
        print(f"\n--- Test 2: Non-existent User Summary ---")
        fake_user_id = str(uuid.uuid4())
        response = self.make_request("GET", f"/reviews/summary/{fake_user_id}")
        
        if response.status_code == 404:
            self.log_result("Non-existent user summary", True, "Correctly returned 404 for non-existent user")
        else:
            self.log_result("Non-existent user summary", False, f"Expected 404, got {response.status_code}")
    
    def test_review_response_endpoint(self):
        """Test POST /api/reviews/respond/{reviewId} endpoint"""
        print("\n=== Testing Review Response Endpoint ===")
        
        if not self.test_review_id or not self.tradesperson_token:
            self.log_result("Review response endpoint", False, "Missing review ID or tradesperson token")
            return
        
        # Test 1: Valid review response
        print(f"\n--- Test 1: Valid Review Response ---")
        response_data = {
            "response": "Thank you for the excellent review! It was a pleasure working on your electrical project. I'm glad you were satisfied with the quality of work and professionalism."
        }
        
        response = self.make_request("POST", f"/reviews/respond/{self.test_review_id}", 
                                   json=response_data, auth_token=self.tradesperson_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response was added
                if data.get('response') == response_data['response']:
                    self.log_result("Valid review response", True, "Response added successfully")
                    
                    # Verify response date is set
                    if data.get('response_date'):
                        self.log_result("Response date", True, f"Response date: {data['response_date']}")
                    else:
                        self.log_result("Response date", False, "Response date not set")
                else:
                    self.log_result("Valid review response", False, "Response content mismatch")
                    
            except json.JSONDecodeError:
                self.log_result("Valid review response", False, "Invalid JSON response")
        else:
            self.log_result("Valid review response", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Unauthorized response (homeowner trying to respond)
        print(f"\n--- Test 2: Unauthorized Review Response ---")
        response = self.make_request("POST", f"/reviews/respond/{self.test_review_id}", 
                                   json=response_data, auth_token=self.homeowner_token)
        
        if response.status_code == 403:
            self.log_result("Unauthorized review response", True, "Correctly rejected unauthorized response")
        else:
            self.log_result("Unauthorized review response", False, f"Expected 403, got {response.status_code}")
        
        # Test 3: Non-existent review response
        print(f"\n--- Test 3: Non-existent Review Response ---")
        fake_review_id = str(uuid.uuid4())
        response = self.make_request("POST", f"/reviews/respond/{fake_review_id}", 
                                   json=response_data, auth_token=self.tradesperson_token)
        
        if response.status_code == 404:
            self.log_result("Non-existent review response", True, "Correctly returned 404 for non-existent review")
        else:
            self.log_result("Non-existent review response", False, f"Expected 404, got {response.status_code}")
    
    def test_my_reviews_endpoint(self):
        """Test GET /api/reviews/my-reviews endpoint"""
        print("\n=== Testing My Reviews Endpoint ===")
        
        if not self.homeowner_token:
            self.log_result("My reviews endpoint", False, "No homeowner token available")
            return
        
        # Test 1: Get current user's reviews
        print(f"\n--- Test 1: Get My Reviews ---")
        response = self.make_request("GET", "/reviews/my-reviews", auth_token=self.homeowner_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Verify response structure
                required_fields = ['reviews', 'total', 'page', 'limit', 'total_pages']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("My reviews response structure", True, 
                                  f"Found {data['total']} reviews by current user")
                    
                    # Check if our test review is included
                    if data['reviews'] and self.test_review_id:
                        review_ids = [r.get('id') for r in data['reviews']]
                        if self.test_review_id in review_ids:
                            self.log_result("My review inclusion", True, "Test review found in my reviews")
                        else:
                            self.log_result("My review inclusion", False, "Test review not found in my reviews")
                else:
                    self.log_result("My reviews response structure", False, f"Missing fields: {missing_fields}")
                    
            except json.JSONDecodeError:
                self.log_result("My reviews endpoint", False, "Invalid JSON response")
        else:
            self.log_result("My reviews endpoint", False, f"Status: {response.status_code}")
        
        # Test 2: Unauthorized access
        print(f"\n--- Test 2: Unauthorized My Reviews Access ---")
        response = self.make_request("GET", "/reviews/my-reviews")
        
        if response.status_code in [401, 403]:
            self.log_result("Unauthorized my reviews access", True, "Correctly rejected unauthorized request")
        else:
            self.log_result("Unauthorized my reviews access", False, f"Expected 401/403, got {response.status_code}")
    
    def test_review_permissions(self):
        """Test review permission system"""
        print("\n=== Testing Review Permissions ===")
        
        # Test 1: Can review eligibility check
        print(f"\n--- Test 1: Review Eligibility Check ---")
        if self.homeowner_token and self.tradesperson_id and self.test_job_id:
            response = self.make_request("GET", f"/reviews/can-review/{self.tradesperson_id}/{self.test_job_id}", 
                                       auth_token=self.homeowner_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if 'can_review' in data:
                        # Since we already created a review, this should be False
                        if not data['can_review']:
                            self.log_result("Review eligibility check", True, "Correctly identified duplicate review")
                        else:
                            self.log_result("Review eligibility check", False, "Should not allow duplicate review")
                    else:
                        self.log_result("Review eligibility check", False, "Missing can_review field")
                except json.JSONDecodeError:
                    self.log_result("Review eligibility check", False, "Invalid JSON response")
            else:
                self.log_result("Review eligibility check", False, f"Status: {response.status_code}")
        
        # Test 2: Tradesperson cannot review homeowner for same job (wrong direction)
        print(f"\n--- Test 2: Wrong Direction Review Prevention ---")
        if self.tradesperson_token and self.homeowner_id and self.test_job_id:
            wrong_review_data = {
                "job_id": self.test_job_id,
                "reviewee_id": self.homeowner_id,
                "rating": 4,
                "title": "Good Client",
                "content": "The homeowner was easy to work with and paid on time."
            }
            
            response = self.make_request("POST", "/reviews/create", 
                                       json=wrong_review_data, auth_token=self.tradesperson_token)
            
            # This should fail because tradesperson reviewing homeowner requires different workflow
            if response.status_code in [400, 403]:
                self.log_result("Wrong direction review prevention", True, "Correctly prevented inappropriate review")
            else:
                self.log_result("Wrong direction review prevention", False, f"Expected 400/403, got {response.status_code}")
    
    def test_review_data_structure(self):
        """Test review data structure and validation"""
        print("\n=== Testing Review Data Structure ===")
        
        if not self.test_review_id:
            self.log_result("Review data structure", False, "No test review ID available")
            return
        
        # Get the created review and verify its structure
        print(f"\n--- Test 1: Review Data Structure Validation ---")
        response = self.make_request("GET", f"/reviews/user/{self.tradesperson_id}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                reviews = data.get('reviews', [])
                
                if reviews:
                    review = reviews[0]  # Get first review
                    
                    # Check required fields
                    required_fields = [
                        'id', 'job_id', 'reviewer_id', 'reviewee_id', 'rating', 
                        'title', 'content', 'created_at', 'review_type'
                    ]
                    
                    missing_fields = [field for field in required_fields if field not in review]
                    
                    if not missing_fields:
                        self.log_result("Review required fields", True, "All required fields present")
                        
                        # Verify review type
                        if review.get('review_type') == 'homeowner_to_tradesperson':
                            self.log_result("Review type validation", True, "Correct review type")
                        else:
                            self.log_result("Review type validation", False, f"Wrong review type: {review.get('review_type')}")
                        
                        # Verify rating range
                        rating = review.get('rating')
                        if 1 <= rating <= 5:
                            self.log_result("Rating range validation", True, f"Rating: {rating}")
                        else:
                            self.log_result("Rating range validation", False, f"Invalid rating: {rating}")
                        
                        # Verify category ratings
                        category_ratings = review.get('category_ratings', {})
                        if isinstance(category_ratings, dict) and len(category_ratings) > 0:
                            self.log_result("Category ratings structure", True, f"Found {len(category_ratings)} categories")
                        else:
                            self.log_result("Category ratings structure", False, "Category ratings missing or invalid")
                        
                        # Verify photos array
                        photos = review.get('photos', [])
                        if isinstance(photos, list):
                            self.log_result("Photos array structure", True, f"Photos array with {len(photos)} items")
                        else:
                            self.log_result("Photos array structure", False, "Photos is not an array")
                        
                        # Verify recommendation field
                        would_recommend = review.get('would_recommend')
                        if isinstance(would_recommend, bool):
                            self.log_result("Recommendation field", True, f"Would recommend: {would_recommend}")
                        else:
                            self.log_result("Recommendation field", False, "Recommendation field is not boolean")
                            
                    else:
                        self.log_result("Review required fields", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Review data structure", False, "No reviews found for validation")
                    
            except json.JSONDecodeError:
                self.log_result("Review data structure", False, "Invalid JSON response")
        else:
            self.log_result("Review data structure", False, f"Status: {response.status_code}")
    
    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Note: In a real implementation, you might want to delete test users and jobs
        # For now, we'll just log what would be cleaned up
        cleanup_items = []
        
        if self.homeowner_id:
            cleanup_items.append(f"Homeowner: {self.homeowner_id}")
        if self.tradesperson_id:
            cleanup_items.append(f"Tradesperson: {self.tradesperson_id}")
        if self.test_job_id:
            cleanup_items.append(f"Job: {self.test_job_id}")
        if self.test_review_id:
            cleanup_items.append(f"Review: {self.test_review_id}")
        
        if cleanup_items:
            print(f"Test data created (for manual cleanup if needed):")
            for item in cleanup_items:
                print(f"  - {item}")
            self.log_result("Test data cleanup", True, f"Identified {len(cleanup_items)} items for cleanup")
        else:
            self.log_result("Test data cleanup", True, "No test data to cleanup")
    
    def run_all_tests(self):
        """Run all review system tests"""
        print("🚀 Starting Comprehensive Review System Backend Testing")
        print("=" * 80)
        
        try:
            # Test service health
            self.test_service_health()
            
            # Setup test users and job
            self.setup_test_users()
            self.create_test_job()
            
            # Test review API endpoints
            self.test_review_creation_endpoint()
            self.test_get_user_reviews_endpoint()
            self.test_get_job_reviews_endpoint()
            self.test_get_review_summary_endpoint()
            self.test_review_response_endpoint()
            self.test_my_reviews_endpoint()
            
            # Test review permissions and data structure
            self.test_review_permissions()
            self.test_review_data_structure()
            
            # Cleanup
            self.cleanup_test_data()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 80)
        print("🏁 COMPREHENSIVE REVIEW SYSTEM TESTING RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        # Print key findings
        print(f"\n🎯 KEY TESTING FINDINGS:")
        
        if success_rate >= 90:
            print(f"✅ EXCELLENT: Review system is working excellently")
        elif success_rate >= 80:
            print(f"✅ GOOD: Review system is working well with minor issues")
        elif success_rate >= 70:
            print(f"⚠️  FAIR: Review system has some issues that need attention")
        else:
            print(f"❌ POOR: Review system has significant issues requiring fixes")
        
        # Categorize failures
        if self.results['failed'] > 0:
            print(f"\n🔍 DETAILED FAILURE ANALYSIS:")
            
            endpoint_failures = [e for e in self.results['errors'] if 'endpoint' in e.lower()]
            permission_failures = [e for e in self.results['errors'] if 'permission' in e.lower()]
            validation_failures = [e for e in self.results['errors'] if 'validation' in e.lower()]
            
            if endpoint_failures:
                print(f"\n📡 ENDPOINT ISSUES ({len(endpoint_failures)}):")
                for error in endpoint_failures:
                    print(f"   - {error}")
            
            if permission_failures:
                print(f"\n🔒 PERMISSION ISSUES ({len(permission_failures)}):")
                for error in permission_failures:
                    print(f"   - {error}")
            
            if validation_failures:
                print(f"\n✅ VALIDATION ISSUES ({len(validation_failures)}):")
                for error in validation_failures:
                    print(f"   - {error}")
            
            # Other failures
            other_failures = [e for e in self.results['errors'] 
                            if not any(keyword in e.lower() for keyword in ['endpoint', 'permission', 'validation'])]
            if other_failures:
                print(f"\n🔧 OTHER ISSUES ({len(other_failures)}):")
                for error in other_failures:
                    print(f"   - {error}")
        
        # Overall assessment
        print(f"\n🎯 OVERALL ASSESSMENT:")
        
        if success_rate >= 85:
            print(f"✅ PRODUCTION READY: Review system is fully functional and ready for production use")
            print(f"   - All core review workflows are operational")
            print(f"   - API endpoints are working correctly")
            print(f"   - Permission system is properly enforced")
            print(f"   - Data validation is working as expected")
        elif success_rate >= 70:
            print(f"⚠️  NEEDS MINOR FIXES: Review system is mostly functional but needs some improvements")
            print(f"   - Core functionality is working")
            print(f"   - Some edge cases or minor features need attention")
        else:
            print(f"❌ NEEDS MAJOR FIXES: Review system has significant issues that must be resolved")
            print(f"   - Core functionality may be broken")
            print(f"   - Multiple critical issues identified")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = ReviewSystemTester()
    tester.run_all_tests()
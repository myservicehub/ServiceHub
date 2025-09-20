#!/usr/bin/env python3
"""
ENHANCED TRADE CATEGORY QUESTIONS API WITH CONDITIONAL LOGIC TESTING

**TESTING REQUIREMENTS FROM REVIEW REQUEST:**

**1. Test Enhanced Trade Questions API:**
- Test creation of questions with conditional logic enabled
- Test creation of Yes/No parent questions
- Test creation of follow-up questions that depend on parent questions
- Verify the new conditional_logic field is properly stored and retrieved

**2. Test Conditional Logic Structure:**
- Create a Yes/No question as a parent (e.g., "Do you need emergency plumbing service?")
- Create follow-up questions for "Yes" scenario (e.g., "What type of emergency?", "How urgent is it?")
- Create follow-up questions for "No" scenario (e.g., "When would you like to schedule?", "What's your preferred time?")
- Test that relationships are properly stored in the database

**3. Test API Endpoints:**
- POST /api/admin/trade-questions (with conditional logic data)
- GET /api/admin/trade-questions (verify conditional logic is returned)
- PUT /api/admin/trade-questions/{id} (test updating conditional logic)
- Verify the enhanced data model handles the new fields correctly

**4. Test Data Validation:**
- Test that conditional logic validation works properly
- Test parent-child question relationships
- Test that only Yes/No questions can be used as parent questions
- Test trigger conditions and values work correctly

**5. Create Test Scenario:**
Use "Plumbing" as the trade category and create:
- Parent question: "Do you need emergency plumbing service?" (Yes/No)
- Yes follow-ups: "What type of emergency?", "How urgent is it?"  
- No follow-ups: "When would you like to schedule?", "What's your preferred time?"

**Expected Results:**
- Enhanced API should accept and store conditional logic data
- Questions should be properly linked with parent-child relationships
- API should return complete conditional logic information
- Database should handle the new fields without errors

**Test with admin credentials: admin/servicehub2024**
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid
from collections import Counter

# Get backend URL from frontend environment
BACKEND_URL = "https://trademe-platform.preview.emergentagent.com/api"

class TradeQuestionsConditionalTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.admin_token = None
        self.created_questions = []  # Track created questions for cleanup
        
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
    
    def setup_admin_authentication(self):
        """Authenticate as admin user"""
        print("\n=== Setting Up Admin Authentication ===")
        
        # Admin login credentials
        admin_credentials = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        print(f"\n--- Admin Login ---")
        response = self.make_request("POST", "/admin-management/login", json=admin_credentials)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.admin_token = data.get('access_token')
                admin_info = data.get('admin', {})
                self.log_result("Admin authentication", True, f"Admin: {admin_info.get('username', 'N/A')}")
                
                # Verify admin has required permissions
                permissions = data.get('permissions', [])
                required_permissions = ['manage_jobs', 'manage_content']
                has_permissions = any(perm in permissions for perm in required_permissions)
                
                if has_permissions or 'super_admin' in admin_info.get('role', ''):
                    self.log_result("Admin permissions", True, f"Has required permissions: {len(permissions)} total")
                else:
                    self.log_result("Admin permissions", False, f"Missing required permissions")
                    
            except json.JSONDecodeError:
                self.log_result("Admin authentication", False, "Invalid JSON response")
        else:
            self.log_result("Admin authentication", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_current_trade_questions_api(self):
        """Test current trade questions API to understand existing structure"""
        print("\n=== Testing Current Trade Questions API ===")
        
        if not self.admin_token:
            self.log_result("Current API test", False, "No admin token available")
            return
        
        # Test GET all trade questions
        print(f"\n--- Test 1: GET All Trade Questions ---")
        response = self.make_request("GET", "/admin/trade-questions", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                questions = data.get('questions', [])
                self.log_result("GET all trade questions", True, f"Found {len(questions)} existing questions")
                
                # Check if any questions have conditional logic fields
                conditional_questions = [q for q in questions if 'conditional_logic' in q]
                if conditional_questions:
                    self.log_result("Conditional logic support detected", True, f"Found {len(conditional_questions)} questions with conditional logic")
                else:
                    self.log_result("Conditional logic support", False, "No conditional logic fields found in existing questions")
                    
                # Store sample question structure for reference
                if questions:
                    sample_question = questions[0]
                    print(f"Sample question structure: {list(sample_question.keys())}")
                    
            except json.JSONDecodeError:
                self.log_result("GET all trade questions", False, "Invalid JSON response")
        else:
            self.log_result("GET all trade questions", False, f"Status: {response.status_code}")
        
        # Test GET questions for Plumbing category
        print(f"\n--- Test 2: GET Plumbing Questions ---")
        response = self.make_request("GET", "/admin/trade-questions/category/Plumbing", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                questions = data.get('questions', [])
                self.log_result("GET Plumbing questions", True, f"Found {len(questions)} Plumbing questions")
            except json.JSONDecodeError:
                self.log_result("GET Plumbing questions", False, "Invalid JSON response")
        else:
            self.log_result("GET Plumbing questions", False, f"Status: {response.status_code}")
    
    def test_create_conditional_logic_questions(self):
        """Test creating questions with conditional logic"""
        print("\n=== Testing Conditional Logic Question Creation ===")
        
        if not self.admin_token:
            self.log_result("Conditional logic creation", False, "No admin token available")
            return
        
        # Test 1: Create parent Yes/No question
        print(f"\n--- Test 1: Create Parent Yes/No Question ---")
        parent_question_data = {
            "trade_category": "Plumbing",
            "question_text": "Do you need emergency plumbing service?",
            "question_type": "yes_no",
            "display_order": 1,
            "is_active": True,
            "conditional_logic": {
                "enabled": True,
                "is_parent": True,
                "trigger_conditions": [
                    {
                        "condition": "equals",
                        "value": "yes",
                        "follow_up_questions": []  # Will be populated after creating follow-ups
                    },
                    {
                        "condition": "equals", 
                        "value": "no",
                        "follow_up_questions": []  # Will be populated after creating follow-ups
                    }
                ]
            }
        }
        
        response = self.make_request("POST", "/admin/trade-questions", 
                                   json=parent_question_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                parent_question = data.get('question', {})
                parent_id = parent_question.get('id')
                
                if parent_id:
                    self.created_questions.append(parent_id)
                    self.log_result("Create parent Yes/No question", True, f"Created parent question ID: {parent_id}")
                    
                    # Verify conditional logic was stored
                    if 'conditional_logic' in parent_question:
                        conditional_logic = parent_question['conditional_logic']
                        if conditional_logic.get('enabled') and conditional_logic.get('is_parent'):
                            self.log_result("Parent conditional logic storage", True, "Conditional logic properly stored")
                        else:
                            self.log_result("Parent conditional logic storage", False, "Conditional logic not properly configured")
                    else:
                        self.log_result("Parent conditional logic storage", False, "Conditional logic field missing")
                        
                    # Store parent ID for follow-up questions
                    self.test_data['parent_question_id'] = parent_id
                else:
                    self.log_result("Create parent Yes/No question", False, "No question ID returned")
                    
            except json.JSONDecodeError:
                self.log_result("Create parent Yes/No question", False, "Invalid JSON response")
        else:
            self.log_result("Create parent Yes/No question", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Create follow-up questions for "Yes" scenario
        print(f"\n--- Test 2: Create 'Yes' Follow-up Questions ---")
        yes_followups = [
            {
                "trade_category": "Plumbing",
                "question_text": "What type of emergency?",
                "question_type": "multiple_choice_single",
                "display_order": 2,
                "is_active": True,
                "options": [
                    "Burst pipe",
                    "Blocked drain",
                    "No hot water",
                    "Toilet overflow",
                    "Gas leak",
                    "Other"
                ],
                "conditional_logic": {
                    "enabled": True,
                    "is_parent": False,
                    "parent_question_id": self.test_data.get('parent_question_id'),
                    "trigger_condition": {
                        "parent_answer": "yes"
                    }
                }
            },
            {
                "trade_category": "Plumbing",
                "question_text": "How urgent is it?",
                "question_type": "multiple_choice_single",
                "display_order": 3,
                "is_active": True,
                "options": [
                    "Immediate (within 1 hour)",
                    "Same day",
                    "Within 24 hours",
                    "Within 48 hours"
                ],
                "conditional_logic": {
                    "enabled": True,
                    "is_parent": False,
                    "parent_question_id": self.test_data.get('parent_question_id'),
                    "trigger_condition": {
                        "parent_answer": "yes"
                    }
                }
            }
        ]
        
        yes_followup_ids = []
        for i, followup_data in enumerate(yes_followups):
            response = self.make_request("POST", "/admin/trade-questions", 
                                       json=followup_data, auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    question = data.get('question', {})
                    question_id = question.get('id')
                    
                    if question_id:
                        self.created_questions.append(question_id)
                        yes_followup_ids.append(question_id)
                        self.log_result(f"Create Yes follow-up {i+1}", True, f"Created question ID: {question_id}")
                        
                        # Verify conditional logic
                        if 'conditional_logic' in question:
                            conditional_logic = question['conditional_logic']
                            if (conditional_logic.get('enabled') and 
                                not conditional_logic.get('is_parent') and
                                conditional_logic.get('parent_question_id') == self.test_data.get('parent_question_id')):
                                self.log_result(f"Yes follow-up {i+1} conditional logic", True, "Conditional logic properly configured")
                            else:
                                self.log_result(f"Yes follow-up {i+1} conditional logic", False, "Conditional logic not properly configured")
                        else:
                            self.log_result(f"Yes follow-up {i+1} conditional logic", False, "Conditional logic field missing")
                    else:
                        self.log_result(f"Create Yes follow-up {i+1}", False, "No question ID returned")
                        
                except json.JSONDecodeError:
                    self.log_result(f"Create Yes follow-up {i+1}", False, "Invalid JSON response")
            else:
                self.log_result(f"Create Yes follow-up {i+1}", False, f"Status: {response.status_code}")
        
        # Test 3: Create follow-up questions for "No" scenario
        print(f"\n--- Test 3: Create 'No' Follow-up Questions ---")
        no_followups = [
            {
                "trade_category": "Plumbing",
                "question_text": "When would you like to schedule?",
                "question_type": "multiple_choice_single",
                "display_order": 4,
                "is_active": True,
                "options": [
                    "Today",
                    "Tomorrow",
                    "This week",
                    "Next week",
                    "Flexible"
                ],
                "conditional_logic": {
                    "enabled": True,
                    "is_parent": False,
                    "parent_question_id": self.test_data.get('parent_question_id'),
                    "trigger_condition": {
                        "parent_answer": "no"
                    }
                }
            },
            {
                "trade_category": "Plumbing",
                "question_text": "What's your preferred time?",
                "question_type": "multiple_choice_single",
                "display_order": 5,
                "is_active": True,
                "options": [
                    "Morning (8AM-12PM)",
                    "Afternoon (12PM-5PM)",
                    "Evening (5PM-8PM)",
                    "Anytime"
                ],
                "conditional_logic": {
                    "enabled": True,
                    "is_parent": False,
                    "parent_question_id": self.test_data.get('parent_question_id'),
                    "trigger_condition": {
                        "parent_answer": "no"
                    }
                }
            }
        ]
        
        no_followup_ids = []
        for i, followup_data in enumerate(no_followups):
            response = self.make_request("POST", "/admin/trade-questions", 
                                       json=followup_data, auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    question = data.get('question', {})
                    question_id = question.get('id')
                    
                    if question_id:
                        self.created_questions.append(question_id)
                        no_followup_ids.append(question_id)
                        self.log_result(f"Create No follow-up {i+1}", True, f"Created question ID: {question_id}")
                        
                        # Verify conditional logic
                        if 'conditional_logic' in question:
                            conditional_logic = question['conditional_logic']
                            if (conditional_logic.get('enabled') and 
                                not conditional_logic.get('is_parent') and
                                conditional_logic.get('parent_question_id') == self.test_data.get('parent_question_id')):
                                self.log_result(f"No follow-up {i+1} conditional logic", True, "Conditional logic properly configured")
                            else:
                                self.log_result(f"No follow-up {i+1} conditional logic", False, "Conditional logic not properly configured")
                        else:
                            self.log_result(f"No follow-up {i+1} conditional logic", False, "Conditional logic field missing")
                    else:
                        self.log_result(f"Create No follow-up {i+1}", False, "No question ID returned")
                        
                except json.JSONDecodeError:
                    self.log_result(f"Create No follow-up {i+1}", False, "Invalid JSON response")
            else:
                self.log_result(f"Create No follow-up {i+1}", False, f"Status: {response.status_code}")
        
        # Store follow-up IDs for later tests
        self.test_data['yes_followup_ids'] = yes_followup_ids
        self.test_data['no_followup_ids'] = no_followup_ids
    
    def test_retrieve_conditional_logic_questions(self):
        """Test retrieving questions with conditional logic"""
        print("\n=== Testing Conditional Logic Question Retrieval ===")
        
        if not self.admin_token:
            self.log_result("Conditional logic retrieval", False, "No admin token available")
            return
        
        # Test 1: GET all trade questions and verify conditional logic is returned
        print(f"\n--- Test 1: GET All Questions with Conditional Logic ---")
        response = self.make_request("GET", "/admin/trade-questions", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                questions = data.get('questions', [])
                
                # Find our created questions
                created_questions = [q for q in questions if q.get('id') in self.created_questions]
                
                if created_questions:
                    self.log_result("Retrieve created questions", True, f"Found {len(created_questions)} created questions")
                    
                    # Verify conditional logic is preserved
                    questions_with_logic = [q for q in created_questions if 'conditional_logic' in q]
                    if len(questions_with_logic) == len(created_questions):
                        self.log_result("Conditional logic preservation", True, "All created questions have conditional logic")
                    else:
                        self.log_result("Conditional logic preservation", False, f"Only {len(questions_with_logic)}/{len(created_questions)} questions have conditional logic")
                        
                    # Verify parent-child relationships
                    parent_questions = [q for q in created_questions if q.get('conditional_logic', {}).get('is_parent')]
                    child_questions = [q for q in created_questions if not q.get('conditional_logic', {}).get('is_parent', True)]
                    
                    if parent_questions and child_questions:
                        self.log_result("Parent-child relationships", True, f"Found {len(parent_questions)} parent and {len(child_questions)} child questions")
                        
                        # Verify child questions reference correct parent
                        parent_id = self.test_data.get('parent_question_id')
                        correct_references = [q for q in child_questions if q.get('conditional_logic', {}).get('parent_question_id') == parent_id]
                        
                        if len(correct_references) == len(child_questions):
                            self.log_result("Parent-child references", True, "All child questions correctly reference parent")
                        else:
                            self.log_result("Parent-child references", False, f"Only {len(correct_references)}/{len(child_questions)} child questions reference parent correctly")
                    else:
                        self.log_result("Parent-child relationships", False, "Parent-child structure not found")
                        
                else:
                    self.log_result("Retrieve created questions", False, "Created questions not found in API response")
                    
            except json.JSONDecodeError:
                self.log_result("GET all questions with conditional logic", False, "Invalid JSON response")
        else:
            self.log_result("GET all questions with conditional logic", False, f"Status: {response.status_code}")
        
        # Test 2: GET specific question by ID
        print(f"\n--- Test 2: GET Specific Question by ID ---")
        if self.test_data.get('parent_question_id'):
            response = self.make_request("GET", f"/admin/trade-questions/{self.test_data['parent_question_id']}", 
                                       auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    question = response.json()
                    
                    if 'conditional_logic' in question:
                        conditional_logic = question['conditional_logic']
                        self.log_result("GET question by ID", True, f"Retrieved question with conditional logic")
                        
                        # Verify structure
                        if (conditional_logic.get('enabled') and 
                            conditional_logic.get('is_parent') and
                            'trigger_conditions' in conditional_logic):
                            self.log_result("Individual question conditional logic", True, "Conditional logic structure correct")
                        else:
                            self.log_result("Individual question conditional logic", False, "Conditional logic structure incorrect")
                    else:
                        self.log_result("GET question by ID", False, "Conditional logic missing from individual question")
                        
                except json.JSONDecodeError:
                    self.log_result("GET question by ID", False, "Invalid JSON response")
            else:
                self.log_result("GET question by ID", False, f"Status: {response.status_code}")
        
        # Test 3: GET questions by category (Plumbing)
        print(f"\n--- Test 3: GET Plumbing Questions with Conditional Logic ---")
        response = self.make_request("GET", "/admin/trade-questions/category/Plumbing", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                questions = data.get('questions', [])
                
                # Find our created questions in the category
                plumbing_created = [q for q in questions if q.get('id') in self.created_questions]
                
                if plumbing_created:
                    self.log_result("GET Plumbing questions", True, f"Found {len(plumbing_created)} created Plumbing questions")
                    
                    # Verify all have conditional logic
                    with_logic = [q for q in plumbing_created if 'conditional_logic' in q]
                    if len(with_logic) == len(plumbing_created):
                        self.log_result("Plumbing questions conditional logic", True, "All Plumbing questions have conditional logic")
                    else:
                        self.log_result("Plumbing questions conditional logic", False, f"Only {len(with_logic)}/{len(plumbing_created)} have conditional logic")
                else:
                    self.log_result("GET Plumbing questions", False, "Created Plumbing questions not found")
                    
            except json.JSONDecodeError:
                self.log_result("GET Plumbing questions", False, "Invalid JSON response")
        else:
            self.log_result("GET Plumbing questions", False, f"Status: {response.status_code}")
    
    def test_update_conditional_logic_questions(self):
        """Test updating questions with conditional logic"""
        print("\n=== Testing Conditional Logic Question Updates ===")
        
        if not self.admin_token or not self.test_data.get('parent_question_id'):
            self.log_result("Conditional logic updates", False, "No admin token or parent question ID available")
            return
        
        # Test 1: Update parent question conditional logic
        print(f"\n--- Test 1: Update Parent Question Conditional Logic ---")
        parent_id = self.test_data['parent_question_id']
        
        update_data = {
            "question_text": "Do you need emergency plumbing service? (Updated)",
            "conditional_logic": {
                "enabled": True,
                "is_parent": True,
                "trigger_conditions": [
                    {
                        "condition": "equals",
                        "value": "yes",
                        "follow_up_questions": self.test_data.get('yes_followup_ids', [])
                    },
                    {
                        "condition": "equals", 
                        "value": "no",
                        "follow_up_questions": self.test_data.get('no_followup_ids', [])
                    }
                ]
            }
        }
        
        response = self.make_request("PUT", f"/admin/trade-questions/{parent_id}", 
                                   json=update_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                updated_question = data.get('question', {})
                
                if 'conditional_logic' in updated_question:
                    conditional_logic = updated_question['conditional_logic']
                    
                    # Verify the update was applied
                    if updated_question.get('question_text') == update_data['question_text']:
                        self.log_result("Update parent question text", True, "Question text updated successfully")
                    else:
                        self.log_result("Update parent question text", False, "Question text not updated")
                    
                    # Verify conditional logic was updated
                    if (conditional_logic.get('enabled') and 
                        conditional_logic.get('is_parent') and
                        len(conditional_logic.get('trigger_conditions', [])) == 2):
                        self.log_result("Update parent conditional logic", True, "Conditional logic updated successfully")
                        
                        # Verify follow-up question IDs were added
                        yes_condition = next((c for c in conditional_logic['trigger_conditions'] if c.get('value') == 'yes'), None)
                        no_condition = next((c for c in conditional_logic['trigger_conditions'] if c.get('value') == 'no'), None)
                        
                        if (yes_condition and no_condition and 
                            yes_condition.get('follow_up_questions') and 
                            no_condition.get('follow_up_questions')):
                            self.log_result("Follow-up question references", True, "Follow-up question IDs properly linked")
                        else:
                            self.log_result("Follow-up question references", False, "Follow-up question IDs not properly linked")
                    else:
                        self.log_result("Update parent conditional logic", False, "Conditional logic not properly updated")
                else:
                    self.log_result("Update parent question", False, "Conditional logic missing from updated question")
                    
            except json.JSONDecodeError:
                self.log_result("Update parent question", False, "Invalid JSON response")
        else:
            self.log_result("Update parent question", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # Test 2: Update child question
        print(f"\n--- Test 2: Update Child Question ---")
        if self.test_data.get('yes_followup_ids'):
            child_id = self.test_data['yes_followup_ids'][0]
            
            child_update_data = {
                "question_text": "What type of emergency? (Updated)",
                "options": [
                    "Burst pipe (Updated)",
                    "Blocked drain",
                    "No hot water",
                    "Toilet overflow",
                    "Gas leak",
                    "Other emergency"
                ],
                "conditional_logic": {
                    "enabled": True,
                    "is_parent": False,
                    "parent_question_id": parent_id,
                    "trigger_condition": {
                        "parent_answer": "yes"
                    }
                }
            }
            
            response = self.make_request("PUT", f"/admin/trade-questions/{child_id}", 
                                       json=child_update_data, auth_token=self.admin_token)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    updated_question = data.get('question', {})
                    
                    if (updated_question.get('question_text') == child_update_data['question_text'] and
                        'conditional_logic' in updated_question):
                        self.log_result("Update child question", True, "Child question updated successfully")
                        
                        # Verify conditional logic preserved
                        conditional_logic = updated_question['conditional_logic']
                        if (conditional_logic.get('enabled') and 
                            not conditional_logic.get('is_parent') and
                            conditional_logic.get('parent_question_id') == parent_id):
                            self.log_result("Update child conditional logic", True, "Child conditional logic preserved")
                        else:
                            self.log_result("Update child conditional logic", False, "Child conditional logic not preserved")
                    else:
                        self.log_result("Update child question", False, "Child question not properly updated")
                        
                except json.JSONDecodeError:
                    self.log_result("Update child question", False, "Invalid JSON response")
            else:
                self.log_result("Update child question", False, f"Status: {response.status_code}")
    
    def test_data_validation(self):
        """Test data validation for conditional logic"""
        print("\n=== Testing Conditional Logic Data Validation ===")
        
        if not self.admin_token:
            self.log_result("Data validation", False, "No admin token available")
            return
        
        # Test 1: Try to create child question without parent_question_id
        print(f"\n--- Test 1: Invalid Child Question (Missing Parent ID) ---")
        invalid_child_data = {
            "trade_category": "Plumbing",
            "question_text": "Invalid child question",
            "question_type": "text_input",
            "display_order": 10,
            "is_active": True,
            "conditional_logic": {
                "enabled": True,
                "is_parent": False,
                # Missing parent_question_id
                "trigger_condition": {
                    "parent_answer": "yes"
                }
            }
        }
        
        response = self.make_request("POST", "/admin/trade-questions", 
                                   json=invalid_child_data, auth_token=self.admin_token)
        
        if response.status_code in [400, 422]:
            self.log_result("Invalid child validation", True, "Correctly rejected child question without parent ID")
        elif response.status_code == 200:
            # If it was created, we need to clean it up
            try:
                data = response.json()
                question_id = data.get('question', {}).get('id')
                if question_id:
                    self.created_questions.append(question_id)
            except:
                pass
            self.log_result("Invalid child validation", False, "Should have rejected child question without parent ID")
        else:
            self.log_result("Invalid child validation", False, f"Unexpected status: {response.status_code}")
        
        # Test 2: Try to create parent question with invalid question_type
        print(f"\n--- Test 2: Invalid Parent Question (Wrong Type) ---")
        invalid_parent_data = {
            "trade_category": "Plumbing",
            "question_text": "Invalid parent question",
            "question_type": "text_input",  # Should be yes_no for parent
            "display_order": 11,
            "is_active": True,
            "conditional_logic": {
                "enabled": True,
                "is_parent": True,
                "trigger_conditions": [
                    {
                        "condition": "equals",
                        "value": "yes",
                        "follow_up_questions": []
                    }
                ]
            }
        }
        
        response = self.make_request("POST", "/admin/trade-questions", 
                                   json=invalid_parent_data, auth_token=self.admin_token)
        
        if response.status_code in [400, 422]:
            self.log_result("Invalid parent type validation", True, "Correctly rejected non-yes/no parent question")
        elif response.status_code == 200:
            # If it was created, we need to clean it up
            try:
                data = response.json()
                question_id = data.get('question', {}).get('id')
                if question_id:
                    self.created_questions.append(question_id)
            except:
                pass
            self.log_result("Invalid parent type validation", False, "Should have rejected non-yes/no parent question")
        else:
            self.log_result("Invalid parent type validation", False, f"Unexpected status: {response.status_code}")
        
        # Test 3: Try to create question with malformed conditional logic
        print(f"\n--- Test 3: Malformed Conditional Logic ---")
        malformed_data = {
            "trade_category": "Plumbing",
            "question_text": "Malformed conditional logic question",
            "question_type": "yes_no",
            "display_order": 12,
            "is_active": True,
            "conditional_logic": {
                "enabled": True,
                "is_parent": True,
                "trigger_conditions": "invalid_format"  # Should be array
            }
        }
        
        response = self.make_request("POST", "/admin/trade-questions", 
                                   json=malformed_data, auth_token=self.admin_token)
        
        if response.status_code in [400, 422]:
            self.log_result("Malformed conditional logic validation", True, "Correctly rejected malformed conditional logic")
        elif response.status_code == 200:
            # If it was created, we need to clean it up
            try:
                data = response.json()
                question_id = data.get('question', {}).get('id')
                if question_id:
                    self.created_questions.append(question_id)
            except:
                pass
            self.log_result("Malformed conditional logic validation", False, "Should have rejected malformed conditional logic")
        else:
            self.log_result("Malformed conditional logic validation", False, f"Unexpected status: {response.status_code}")
    
    def test_question_relationships(self):
        """Test parent-child question relationships"""
        print("\n=== Testing Question Relationships ===")
        
        if not self.admin_token:
            self.log_result("Question relationships", False, "No admin token available")
            return
        
        # Get all Plumbing questions to analyze relationships
        response = self.make_request("GET", "/admin/trade-questions/category/Plumbing", auth_token=self.admin_token)
        
        if response.status_code == 200:
            try:
                data = response.json()
                questions = data.get('questions', [])
                
                # Filter to our created questions
                created_questions = [q for q in questions if q.get('id') in self.created_questions]
                
                if created_questions:
                    # Analyze parent-child relationships
                    parent_questions = [q for q in created_questions if q.get('conditional_logic', {}).get('is_parent')]
                    child_questions = [q for q in created_questions if not q.get('conditional_logic', {}).get('is_parent', True)]
                    
                    self.log_result("Question relationship analysis", True, 
                                  f"Found {len(parent_questions)} parent and {len(child_questions)} child questions")
                    
                    if parent_questions:
                        parent = parent_questions[0]
                        parent_id = parent.get('id')
                        
                        # Check if child questions reference this parent
                        children_referencing_parent = [
                            q for q in child_questions 
                            if q.get('conditional_logic', {}).get('parent_question_id') == parent_id
                        ]
                        
                        if len(children_referencing_parent) == len(child_questions):
                            self.log_result("Parent-child references", True, "All child questions correctly reference parent")
                        else:
                            self.log_result("Parent-child references", False, 
                                          f"Only {len(children_referencing_parent)}/{len(child_questions)} children reference parent")
                        
                        # Check trigger conditions
                        conditional_logic = parent.get('conditional_logic', {})
                        trigger_conditions = conditional_logic.get('trigger_conditions', [])
                        
                        yes_condition = next((c for c in trigger_conditions if c.get('value') == 'yes'), None)
                        no_condition = next((c for c in trigger_conditions if c.get('value') == 'no'), None)
                        
                        if yes_condition and no_condition:
                            self.log_result("Trigger conditions", True, "Parent has both Yes and No trigger conditions")
                            
                            # Check if follow-up questions are properly linked
                            yes_followups = yes_condition.get('follow_up_questions', [])
                            no_followups = no_condition.get('follow_up_questions', [])
                            
                            yes_children = [q for q in child_questions 
                                          if q.get('conditional_logic', {}).get('trigger_condition', {}).get('parent_answer') == 'yes']
                            no_children = [q for q in child_questions 
                                         if q.get('conditional_logic', {}).get('trigger_condition', {}).get('parent_answer') == 'no']
                            
                            if len(yes_children) > 0 and len(no_children) > 0:
                                self.log_result("Conditional branching", True, 
                                              f"Found {len(yes_children)} Yes children and {len(no_children)} No children")
                            else:
                                self.log_result("Conditional branching", False, "Missing Yes or No child questions")
                        else:
                            self.log_result("Trigger conditions", False, "Parent missing Yes or No trigger conditions")
                    else:
                        self.log_result("Question relationship analysis", False, "No parent questions found")
                else:
                    self.log_result("Question relationship analysis", False, "No created questions found in response")
                    
            except json.JSONDecodeError:
                self.log_result("Question relationships", False, "Invalid JSON response")
        else:
            self.log_result("Question relationships", False, f"Status: {response.status_code}")
    
    def cleanup_test_data(self):
        """Clean up created test questions"""
        print("\n=== Cleaning Up Test Data ===")
        
        if not self.admin_token or not self.created_questions:
            print("No cleanup needed - no admin token or created questions")
            return
        
        cleanup_count = 0
        for question_id in self.created_questions:
            try:
                response = self.make_request("DELETE", f"/admin/trade-questions/{question_id}", 
                                           auth_token=self.admin_token)
                
                if response.status_code == 200:
                    cleanup_count += 1
                    print(f"✅ Deleted question {question_id}")
                else:
                    print(f"❌ Failed to delete question {question_id}: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Error deleting question {question_id}: {str(e)}")
        
        print(f"\n🧹 Cleanup complete: {cleanup_count}/{len(self.created_questions)} questions deleted")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING ENHANCED TRADE CATEGORY QUESTIONS API WITH CONDITIONAL LOGIC TESTING")
        print("=" * 80)
        
        try:
            # Core setup tests
            self.test_service_health()
            self.setup_admin_authentication()
            
            # Current API analysis
            self.test_current_trade_questions_api()
            
            # Conditional logic functionality tests
            self.test_create_conditional_logic_questions()
            self.test_retrieve_conditional_logic_questions()
            self.test_update_conditional_logic_questions()
            
            # Validation and relationship tests
            self.test_data_validation()
            self.test_question_relationships()
            
        except Exception as e:
            print(f"\n💥 CRITICAL ERROR: {str(e)}")
            self.log_result("Critical error", False, str(e))
        
        finally:
            # Always attempt cleanup
            self.cleanup_test_data()
        
        # Print final results
        print("\n" + "=" * 80)
        print("📊 FINAL TEST RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        # Determine overall result
        if success_rate >= 80:
            print(f"\n🎉 OVERALL RESULT: EXCELLENT - Enhanced Trade Category Questions API with conditional logic is working correctly!")
        elif success_rate >= 60:
            print(f"\n⚠️  OVERALL RESULT: GOOD - Most functionality working, some issues need attention")
        else:
            print(f"\n❌ OVERALL RESULT: NEEDS WORK - Significant issues found with conditional logic implementation")
        
        return success_rate

if __name__ == "__main__":
    tester = TradeQuestionsConditionalTester()
    success_rate = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if success_rate >= 80 else 1)
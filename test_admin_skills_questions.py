#!/usr/bin/env python3
"""
Admin Skills Questions Management System Testing
Test the admin skills questions management system as requested in the review
"""

import requests
import json
import os
from datetime import datetime
from typing import Dict, List, Any
import uuid

# Get backend URL from environment
BACKEND_URL = "https://tradesman-connect.preview.emergentagent.com/api"

class AdminSkillsQuestionsTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.auth_tokens = {}
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
    
    def test_admin_skills_questions_management(self):
        """
        Test the admin skills questions management system as requested in the review
        """
        print("\n" + "="*80)
        print("🎯 ADMIN SKILLS QUESTIONS MANAGEMENT TESTING")
        print("="*80)
        
        # Step 1: Admin login
        self._test_admin_login()
        
        # Step 2: Test GET /api/admin/skills-questions endpoint
        self._test_get_all_skills_questions()
        
        # Step 3: Test GET /api/admin/trades endpoint
        self._test_get_all_trades()
        
        # Step 4: Compare trade categories with questions
        self._compare_trades_and_questions()
        
        # Step 5: Test adding a question for "Plumbing" trade
        self._test_add_plumbing_question()
        
        # Step 6: Verify the system works end-to-end
        self._verify_skills_questions_system()
        
        print("\n" + "="*80)
        print("🏁 ADMIN SKILLS QUESTIONS MANAGEMENT TESTING COMPLETE")
        print("="*80)
    
    def _test_admin_login(self):
        """Test admin login with credentials username: admin, password: servicehub2024"""
        print("\n=== Step 1: Admin Authentication ===")
        
        # Test admin login
        admin_credentials = {
            "username": "admin",
            "password": "servicehub2024"
        }
        
        response = self.make_request("POST", "/admin/login", data=admin_credentials)
        if response.status_code == 200:
            admin_response = response.json()
            if 'token' in admin_response and admin_response.get('admin', {}).get('role') == 'admin':
                self.log_result("Admin Login", True, f"Username: {admin_response['admin']['username']}")
                self.auth_tokens['admin'] = admin_response['token']
            else:
                self.log_result("Admin Login", False, "Invalid admin login response")
        else:
            self.log_result("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def _test_get_all_skills_questions(self):
        """Test GET /api/admin/skills-questions endpoint"""
        print("\n=== Step 2: Get All Skills Questions ===")
        
        response = self.make_request("GET", "/admin/skills-questions")
        if response.status_code == 200:
            questions_data = response.json()
            
            # Check response structure
            required_fields = ['questions', 'stats', 'total_questions']
            missing_fields = [field for field in required_fields if field not in questions_data]
            
            if not missing_fields:
                questions = questions_data['questions']
                total_questions = questions_data['total_questions']
                
                self.log_result("Get Skills Questions API", True, 
                               f"Total questions: {total_questions}, Trade categories with questions: {len(questions)}")
                
                # Store for comparison
                self.test_data['skills_questions'] = questions
                self.test_data['skills_questions_stats'] = questions_data['stats']
                
                # Log which trade categories have questions
                if questions:
                    print(f"   📋 Trade categories with questions:")
                    for trade_category, trade_questions in questions.items():
                        print(f"      • {trade_category}: {len(trade_questions)} questions")
                else:
                    print("   📋 No skills questions found in database")
                    
            else:
                self.log_result("Get Skills Questions API", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Get Skills Questions API", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def _test_get_all_trades(self):
        """Test GET /api/admin/trades endpoint"""
        print("\n=== Step 3: Get All Trade Categories ===")
        
        response = self.make_request("GET", "/admin/trades")
        if response.status_code == 200:
            trades_data = response.json()
            
            # Check response structure
            required_fields = ['trades', 'groups']
            missing_fields = [field for field in required_fields if field not in trades_data]
            
            if not missing_fields:
                trades = trades_data['trades']
                groups = trades_data['groups']
                
                self.log_result("Get Trade Categories API", True, 
                               f"Total trades: {len(trades)}, Groups: {len(groups)}")
                
                # Store for comparison
                self.test_data['all_trades'] = trades
                self.test_data['trade_groups'] = groups
                
                # Log available trade categories
                print(f"   🔨 Available trade categories:")
                for i, trade in enumerate(trades[:10]):  # Show first 10
                    print(f"      • {trade}")
                if len(trades) > 10:
                    print(f"      ... and {len(trades) - 10} more")
                    
            else:
                self.log_result("Get Trade Categories API", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Get Trade Categories API", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def _compare_trades_and_questions(self):
        """Compare trade categories that have questions vs available trade categories"""
        print("\n=== Step 4: Compare Trades and Questions ===")
        
        if 'skills_questions' not in self.test_data or 'all_trades' not in self.test_data:
            self.log_result("Trade/Questions Comparison", False, "Missing data for comparison")
            return
        
        skills_questions = self.test_data['skills_questions']
        all_trades = self.test_data['all_trades']
        
        # Find trades with questions
        trades_with_questions = set(skills_questions.keys())
        all_trade_categories = set(all_trades)
        
        # Find trades without questions
        trades_without_questions = all_trade_categories - trades_with_questions
        
        # Find questions for non-existent trades
        questions_for_missing_trades = trades_with_questions - all_trade_categories
        
        self.log_result("Trade Categories Analysis", True, 
                       f"Total trades: {len(all_trade_categories)}, "
                       f"With questions: {len(trades_with_questions)}, "
                       f"Without questions: {len(trades_without_questions)}")
        
        # Log detailed analysis
        print(f"   📊 Analysis Results:")
        print(f"      • Trade categories with questions: {len(trades_with_questions)}")
        if trades_with_questions:
            for trade in sorted(trades_with_questions):
                question_count = len(skills_questions[trade])
                print(f"        - {trade}: {question_count} questions")
        
        print(f"      • Trade categories without questions: {len(trades_without_questions)}")
        if trades_without_questions:
            for trade in sorted(list(trades_without_questions)[:5]):  # Show first 5
                print(f"        - {trade}")
            if len(trades_without_questions) > 5:
                print(f"        ... and {len(trades_without_questions) - 5} more")
        
        if questions_for_missing_trades:
            self.log_result("Orphaned Questions Check", False, 
                           f"Found questions for non-existent trades: {questions_for_missing_trades}")
        else:
            self.log_result("Orphaned Questions Check", True, "No questions for non-existent trades")
        
        # Store analysis results
        self.test_data['trades_with_questions'] = trades_with_questions
        self.test_data['trades_without_questions'] = trades_without_questions
        
        # Check if Plumbing has questions
        if 'Plumbing' in trades_with_questions:
            plumbing_questions = skills_questions['Plumbing']
            self.log_result("Plumbing Questions Check", True, 
                           f"Plumbing has {len(plumbing_questions)} existing questions")
        else:
            self.log_result("Plumbing Questions Check", True, 
                           "Plumbing has no questions (will test adding one)")
    
    def _test_add_plumbing_question(self):
        """Test adding a test question for Plumbing trade"""
        print("\n=== Step 5: Add Test Question for Plumbing ===")
        
        # Test question data for Plumbing
        test_question = {
            "question": "What is the standard pipe size for a residential toilet connection in Nigeria?",
            "options": [
                "2 inches (50mm)",
                "3 inches (75mm)", 
                "4 inches (100mm)",
                "6 inches (150mm)"
            ],
            "correct_answer": 2,  # 4 inches is correct
            "difficulty": "intermediate",
            "explanation": "Standard toilet waste pipe size in Nigeria is 4 inches (100mm) for proper drainage flow."
        }
        
        response = self.make_request("POST", "/admin/skills-questions/Plumbing", json=test_question)
        if response.status_code == 200:
            add_response = response.json()
            if 'question_id' in add_response and add_response.get('trade_category') == 'Plumbing':
                self.log_result("Add Plumbing Question", True, 
                               f"Question ID: {add_response['question_id']}")
                self.test_data['added_question_id'] = add_response['question_id']
            else:
                self.log_result("Add Plumbing Question", False, "Invalid response structure")
        else:
            self.log_result("Add Plumbing Question", False, 
                           f"Status: {response.status_code}, Response: {response.text}")
        
        # Test getting questions for Plumbing specifically
        response = self.make_request("GET", "/admin/skills-questions/Plumbing")
        if response.status_code == 200:
            plumbing_data = response.json()
            if 'questions' in plumbing_data and 'count' in plumbing_data:
                question_count = plumbing_data['count']
                self.log_result("Get Plumbing Questions", True, 
                               f"Plumbing now has {question_count} questions")
                
                # Verify our question is in the list
                questions = plumbing_data['questions']
                if questions and any(q.get('question', '').startswith('What is the standard pipe size') for q in questions):
                    self.log_result("Question Verification", True, "Added question found in Plumbing questions")
                else:
                    self.log_result("Question Verification", False, "Added question not found")
            else:
                self.log_result("Get Plumbing Questions", False, "Invalid response structure")
        else:
            self.log_result("Get Plumbing Questions", False, f"Status: {response.status_code}")
    
    def _verify_skills_questions_system(self):
        """Verify the complete skills questions system works end-to-end"""
        print("\n=== Step 6: System Verification ===")
        
        # Test question update if we added one
        if 'added_question_id' in self.test_data:
            question_id = self.test_data['added_question_id']
            
            updated_question = {
                "question": "What is the standard pipe size for a residential toilet connection in Nigeria? (Updated)",
                "options": [
                    "2 inches (50mm)",
                    "3 inches (75mm)", 
                    "4 inches (100mm)",
                    "6 inches (150mm)"
                ],
                "correct_answer": 2,
                "difficulty": "intermediate",
                "explanation": "Standard toilet waste pipe size in Nigeria is 4 inches (100mm) for proper drainage flow. Updated explanation."
            }
            
            response = self.make_request("PUT", f"/admin/skills-questions/{question_id}", json=updated_question)
            if response.status_code == 200:
                self.log_result("Update Question", True, "Question updated successfully")
            else:
                self.log_result("Update Question", False, f"Status: {response.status_code}")
        
        # Test error handling - invalid trade category
        response = self.make_request("GET", "/admin/skills-questions/NonExistentTrade")
        if response.status_code == 200:
            data = response.json()
            if data.get('count', 0) == 0:
                self.log_result("Invalid Trade Handling", True, "Correctly returns empty for non-existent trade")
            else:
                self.log_result("Invalid Trade Handling", False, "Should return empty for non-existent trade")
        else:
            self.log_result("Invalid Trade Handling", True, f"Correctly handles invalid trade (Status: {response.status_code})")
        
        # Test validation - invalid question data
        invalid_question = {
            "question": "",  # Empty question
            "options": ["A"],  # Too few options
            "correct_answer": 5  # Invalid index
        }
        
        response = self.make_request("POST", "/admin/skills-questions/Plumbing", json=invalid_question)
        if response.status_code in [400, 422]:
            self.log_result("Question Validation", True, "Correctly rejects invalid question data")
        else:
            self.log_result("Question Validation", False, f"Should reject invalid data (Status: {response.status_code})")
        
        # Final verification - get all questions again to see changes
        response = self.make_request("GET", "/admin/skills-questions")
        if response.status_code == 200:
            final_data = response.json()
            final_total = final_data.get('total_questions', 0)
            
            # Compare with initial state
            initial_total = self.test_data.get('skills_questions_stats', {}).get('total_questions', 0)
            if 'skills_questions' in self.test_data:
                initial_total = sum(len(q) for q in self.test_data['skills_questions'].values())
            
            if final_total >= initial_total:
                self.log_result("System State Verification", True, 
                               f"Questions increased from {initial_total} to {final_total}")
            else:
                self.log_result("System State Verification", False, 
                               f"Questions decreased from {initial_total} to {final_total}")
        else:
            self.log_result("System State Verification", False, f"Status: {response.status_code}")

    def run_test(self):
        """Run the admin skills questions management test"""
        print("🚀 Starting Admin Skills Questions Management Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        try:
            self.test_admin_skills_questions_management()
        except Exception as e:
            print(f"\n❌ Critical test failure: {e}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical failure: {str(e)}")
        
        # Print final results
        print("\n" + "=" * 80)
        print("🏁 ADMIN SKILLS QUESTIONS MANAGEMENT TEST RESULTS")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        
        total_tests = self.results['passed'] + self.results['failed']
        if total_tests > 0:
            success_rate = (self.results['passed'] / total_tests) * 100
            print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ FAILED TESTS ({len(self.results['errors'])}):")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = AdminSkillsQuestionsTester()
    success = tester.run_test()
    exit(0 if success else 1)
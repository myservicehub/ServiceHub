#!/usr/bin/env python3

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedConditionalLogicTester:
    def __init__(self):
        # Get backend URL from environment
        self.base_url = "http://localhost:8001"
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
        except Exception:
            pass
        
        self.api_url = f"{self.base_url}/api"
        self.admin_token = None
        self.session = None
        self.test_results = []
        self.created_questions = []  # Track created questions for cleanup
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status}: {test_name}")
        if details:
            logger.info(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def admin_login(self):
        """Login as admin to get authentication token"""
        try:
            login_data = {
                "username": "admin",
                "password": "servicehub2024"
            }
            
            async with self.session.post(
                f"{self.api_url}/admin-management/login",
                json=login_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.admin_token = data.get("access_token")
                    self.log_test_result("Admin Login", True, f"Token obtained: {self.admin_token[:20]}...")
                    return True
                else:
                    error_text = await response.text()
                    self.log_test_result("Admin Login", False, f"Status: {response.status}, Error: {error_text}")
                    return False
        except Exception as e:
            self.log_test_result("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def get_auth_headers(self):
        """Get authentication headers"""
        return {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
    
    async def test_enhanced_data_models(self):
        """Test 1: Enhanced Data Model Testing"""
        logger.info("\n=== Testing Enhanced Data Models ===")
        
        # Test ConditionalLogicRule model structure
        rule_data = {
            "id": str(uuid.uuid4()),
            "parent_question_id": "parent_q_1",
            "trigger_condition": "equals",
            "trigger_value": "Emergency",
            "trigger_values": ["Emergency", "Urgent"],
            "follow_up_questions": ["follow_up_q_1", "follow_up_q_2"]
        }
        
        # Test ConditionalLogic model with multiple rules
        conditional_logic_data = {
            "enabled": True,
            "logic_operator": "AND",
            "rules": [
                rule_data,
                {
                    "id": str(uuid.uuid4()),
                    "parent_question_id": "parent_q_2", 
                    "trigger_condition": "greater_than",
                    "trigger_value": "100000",
                    "follow_up_questions": ["follow_up_q_3"]
                }
            ]
        }
        
        # Test question with enhanced conditional logic
        question_data = {
            "trade_category": "Plumbing",
            "question_text": "What type of service do you need?",
            "question_type": "multiple_choice_single",
            "options": [
                {"id": str(uuid.uuid4()), "text": "Emergency", "value": "emergency", "display_order": 1},
                {"id": str(uuid.uuid4()), "text": "Regular", "value": "regular", "display_order": 2}
            ],
            "is_required": True,
            "conditional_logic": conditional_logic_data
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    question_id = data.get("question", {}).get("id")
                    if question_id:
                        self.created_questions.append(question_id)
                    
                    # Verify the structure was saved correctly
                    saved_logic = data.get("question", {}).get("conditional_logic", {})
                    
                    success = (
                        saved_logic.get("enabled") == True and
                        saved_logic.get("logic_operator") == "AND" and
                        len(saved_logic.get("rules", [])) == 2
                    )
                    
                    self.log_test_result(
                        "Enhanced Data Model - Multiple Rules Creation",
                        success,
                        f"Created question with {len(saved_logic.get('rules', []))} conditional rules"
                    )
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result(
                        "Enhanced Data Model - Multiple Rules Creation",
                        False,
                        f"Status: {response.status}, Error: {error_text}"
                    )
                    return False
        except Exception as e:
            self.log_test_result(
                "Enhanced Data Model - Multiple Rules Creation",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_multiple_rules_creation(self):
        """Test 2: Multiple Rules Creation Testing"""
        logger.info("\n=== Testing Multiple Rules Creation ===")
        
        # Create a question with 3 different conditional rules
        question_data = {
            "trade_category": "Plumbing",
            "question_text": "What is your budget and urgency level?",
            "question_type": "multiple_choice_single",
            "options": [
                {"id": str(uuid.uuid4()), "text": "Low Budget", "value": "low", "display_order": 1},
                {"id": str(uuid.uuid4()), "text": "High Budget", "value": "high", "display_order": 2}
            ],
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "OR",
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "budget_q",
                        "trigger_condition": "equals",
                        "trigger_value": "high",
                        "follow_up_questions": ["premium_service_q"]
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "urgency_q",
                        "trigger_condition": "equals", 
                        "trigger_value": "emergency",
                        "follow_up_questions": ["emergency_contact_q"]
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "service_type_q",
                        "trigger_condition": "contains",
                        "trigger_value": "premium",
                        "follow_up_questions": ["premium_options_q"]
                    }
                ]
            }
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    question_id = data.get("question", {}).get("id")
                    if question_id:
                        self.created_questions.append(question_id)
                    
                    saved_logic = data.get("question", {}).get("conditional_logic", {})
                    rules = saved_logic.get("rules", [])
                    
                    # Verify different parent questions and trigger conditions
                    parent_questions = set(rule.get("parent_question_id") for rule in rules)
                    trigger_conditions = set(rule.get("trigger_condition") for rule in rules)
                    
                    success = (
                        len(rules) == 3 and
                        len(parent_questions) == 3 and  # Different parent questions
                        len(trigger_conditions) >= 2 and  # Different trigger conditions
                        saved_logic.get("logic_operator") == "OR"
                    )
                    
                    self.log_test_result(
                        "Multiple Rules Creation - Different Combinations",
                        success,
                        f"Created {len(rules)} rules with {len(parent_questions)} parent questions and {len(trigger_conditions)} trigger types"
                    )
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result(
                        "Multiple Rules Creation - Different Combinations",
                        False,
                        f"Status: {response.status}, Error: {error_text}"
                    )
                    return False
        except Exception as e:
            self.log_test_result(
                "Multiple Rules Creation - Different Combinations",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_complex_conditional_scenarios(self):
        """Test 3: Complex Conditional Logic Scenarios"""
        logger.info("\n=== Testing Complex Conditional Logic Scenarios ===")
        
        # Scenario 1: AND Logic (All rules must match)
        and_question_data = {
            "trade_category": "Plumbing",
            "question_text": "Emergency Service Qualification",
            "question_type": "yes_no",
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "AND",
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "service_type_q",
                        "trigger_condition": "equals",
                        "trigger_value": "Emergency",
                        "follow_up_questions": ["emergency_contact_q"]
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "urgency_level_q",
                        "trigger_condition": "equals",
                        "trigger_value": "High",
                        "follow_up_questions": ["emergency_contact_q"]
                    }
                ]
            }
        }
        
        # Scenario 2: OR Logic (Any rule can match)
        or_question_data = {
            "trade_category": "Plumbing",
            "question_text": "Premium Service Options",
            "question_type": "multiple_choice_multiple",
            "options": [
                {"id": str(uuid.uuid4()), "text": "Standard", "value": "standard", "display_order": 1},
                {"id": str(uuid.uuid4()), "text": "Premium", "value": "premium", "display_order": 2}
            ],
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "OR",
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "budget_q",
                        "trigger_condition": "greater_than",
                        "trigger_value": "100000",
                        "follow_up_questions": ["premium_service_q"]
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "service_type_q",
                        "trigger_condition": "equals",
                        "trigger_value": "Premium",
                        "follow_up_questions": ["premium_service_q"]
                    }
                ]
            }
        }
        
        and_success = await self._test_scenario(and_question_data, "AND Logic Scenario")
        or_success = await self._test_scenario(or_question_data, "OR Logic Scenario")
        
        return and_success and or_success
    
    async def _test_scenario(self, question_data: dict, scenario_name: str):
        """Helper method to test a specific scenario"""
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    question_id = data.get("question", {}).get("id")
                    if question_id:
                        self.created_questions.append(question_id)
                    
                    saved_logic = data.get("question", {}).get("conditional_logic", {})
                    expected_operator = question_data["conditional_logic"]["logic_operator"]
                    
                    success = (
                        saved_logic.get("enabled") == True and
                        saved_logic.get("logic_operator") == expected_operator and
                        len(saved_logic.get("rules", [])) >= 2
                    )
                    
                    self.log_test_result(
                        f"Complex Scenario - {scenario_name}",
                        success,
                        f"Logic operator: {saved_logic.get('logic_operator')}, Rules: {len(saved_logic.get('rules', []))}"
                    )
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result(
                        f"Complex Scenario - {scenario_name}",
                        False,
                        f"Status: {response.status}, Error: {error_text}"
                    )
                    return False
        except Exception as e:
            self.log_test_result(
                f"Complex Scenario - {scenario_name}",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_api_endpoints(self):
        """Test 4: API Endpoint Testing"""
        logger.info("\n=== Testing API Endpoints ===")
        
        # Test POST endpoint with multiple conditional logic rules
        post_success = await self.test_post_endpoint()
        
        # Test GET endpoint returns complete rule structure
        get_success = await self.test_get_endpoint()
        
        # Test PUT endpoint for updating multiple rules
        put_success = await self.test_put_endpoint()
        
        return post_success and get_success and put_success
    
    async def test_post_endpoint(self):
        """Test POST /api/admin/trade-questions with multiple conditional logic rules"""
        question_data = {
            "trade_category": "Plumbing",
            "question_text": "API Test Question with Multiple Rules",
            "question_type": "text_input",
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "AND",
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "test_parent_1",
                        "trigger_condition": "equals",
                        "trigger_value": "test_value_1",
                        "follow_up_questions": ["follow_up_1"]
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "test_parent_2",
                        "trigger_condition": "not_equals",
                        "trigger_value": "test_value_2",
                        "follow_up_questions": ["follow_up_2"]
                    }
                ]
            }
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    question_id = data.get("question", {}).get("id")
                    if question_id:
                        self.created_questions.append(question_id)
                    
                    success = data.get("question", {}).get("conditional_logic", {}).get("enabled") == True
                    self.log_test_result("API POST Endpoint", success, "Question created with multiple rules")
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result("API POST Endpoint", False, f"Status: {response.status}, Error: {error_text}")
                    return False
        except Exception as e:
            self.log_test_result("API POST Endpoint", False, f"Exception: {str(e)}")
            return False
    
    async def test_get_endpoint(self):
        """Test GET /api/admin/trade-questions returns complete rule structure"""
        try:
            async with self.session.get(
                f"{self.api_url}/admin/trade-questions?trade_category=Plumbing",
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    questions = data.get("questions", [])
                    
                    # Find questions with conditional logic
                    questions_with_logic = [
                        q for q in questions 
                        if q.get("conditional_logic", {}).get("enabled") == True
                    ]
                    
                    success = len(questions_with_logic) > 0
                    self.log_test_result(
                        "API GET Endpoint",
                        success,
                        f"Found {len(questions_with_logic)} questions with conditional logic out of {len(questions)} total"
                    )
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result("API GET Endpoint", False, f"Status: {response.status}, Error: {error_text}")
                    return False
        except Exception as e:
            self.log_test_result("API GET Endpoint", False, f"Exception: {str(e)}")
            return False
    
    async def test_put_endpoint(self):
        """Test PUT /api/admin/trade-questions/{id} for updating multiple rules"""
        if not self.created_questions:
            self.log_test_result("API PUT Endpoint", False, "No questions available for update test")
            return False
        
        question_id = self.created_questions[0]
        update_data = {
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "OR",  # Changed from AND to OR
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "updated_parent_1",
                        "trigger_condition": "contains",
                        "trigger_value": "updated_value",
                        "follow_up_questions": ["updated_follow_up"]
                    }
                ]
            }
        }
        
        try:
            async with self.session.put(
                f"{self.api_url}/admin/trade-questions/{question_id}",
                json=update_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    updated_logic = data.get("question", {}).get("conditional_logic", {})
                    
                    success = updated_logic.get("logic_operator") == "OR"
                    self.log_test_result(
                        "API PUT Endpoint",
                        success,
                        f"Updated logic operator to: {updated_logic.get('logic_operator')}"
                    )
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result("API PUT Endpoint", False, f"Status: {response.status}, Error: {error_text}")
                    return False
        except Exception as e:
            self.log_test_result("API PUT Endpoint", False, f"Exception: {str(e)}")
            return False
    
    async def test_edge_cases_and_validation(self):
        """Test 5: Edge Cases and Validation"""
        logger.info("\n=== Testing Edge Cases and Validation ===")
        
        # Test empty rules array
        empty_rules_success = await self.test_empty_rules()
        
        # Test invalid logic operator
        invalid_operator_success = await self.test_invalid_logic_operator()
        
        # Test rule validation
        rule_validation_success = await self.test_rule_validation()
        
        return empty_rules_success and invalid_operator_success and rule_validation_success
    
    async def test_empty_rules(self):
        """Test empty rules array with conditional logic enabled"""
        question_data = {
            "trade_category": "Plumbing",
            "question_text": "Empty Rules Test",
            "question_type": "yes_no",
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "AND",
                "rules": []  # Empty rules array
            }
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                # Should either accept with empty rules or reject with validation error
                success = response.status in [200, 400]  # Both are acceptable responses
                
                if response.status == 200:
                    data = await response.json()
                    question_id = data.get("question", {}).get("id")
                    if question_id:
                        self.created_questions.append(question_id)
                
                self.log_test_result(
                    "Edge Case - Empty Rules Array",
                    success,
                    f"Status: {response.status} (200=accepted, 400=validation error)"
                )
                return success
        except Exception as e:
            self.log_test_result("Edge Case - Empty Rules Array", False, f"Exception: {str(e)}")
            return False
    
    async def test_invalid_logic_operator(self):
        """Test invalid logic_operator values"""
        question_data = {
            "trade_category": "Plumbing",
            "question_text": "Invalid Operator Test",
            "question_type": "yes_no",
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "INVALID",  # Invalid operator
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        "parent_question_id": "test_parent",
                        "trigger_condition": "equals",
                        "trigger_value": "test_value",
                        "follow_up_questions": ["follow_up"]
                    }
                ]
            }
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                # Should reject invalid operator with 400 or 422
                success = response.status in [400, 422]
                
                self.log_test_result(
                    "Edge Case - Invalid Logic Operator",
                    success,
                    f"Status: {response.status} (should reject invalid operator)"
                )
                return success
        except Exception as e:
            self.log_test_result("Edge Case - Invalid Logic Operator", False, f"Exception: {str(e)}")
            return False
    
    async def test_rule_validation(self):
        """Test rule validation (required fields, valid parent question IDs)"""
        question_data = {
            "trade_category": "Plumbing",
            "question_text": "Rule Validation Test",
            "question_type": "yes_no",
            "conditional_logic": {
                "enabled": True,
                "logic_operator": "AND",
                "rules": [
                    {
                        "id": str(uuid.uuid4()),
                        # Missing parent_question_id (required field)
                        "trigger_condition": "equals",
                        "trigger_value": "test_value",
                        "follow_up_questions": ["follow_up"]
                    }
                ]
            }
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=question_data,
                headers=self.get_auth_headers()
            ) as response:
                # Should reject due to missing required field
                success = response.status in [400, 422]
                
                self.log_test_result(
                    "Edge Case - Rule Validation",
                    success,
                    f"Status: {response.status} (should reject missing required fields)"
                )
                return success
        except Exception as e:
            self.log_test_result("Edge Case - Rule Validation", False, f"Exception: {str(e)}")
            return False
    
    async def test_backward_compatibility(self):
        """Test 6: Backward Compatibility"""
        logger.info("\n=== Testing Backward Compatibility ===")
        
        # Test that existing questions without conditional logic still work
        simple_question_data = {
            "trade_category": "Plumbing",
            "question_text": "Simple question without conditional logic",
            "question_type": "text_input",
            "is_required": True
            # No conditional_logic field
        }
        
        try:
            async with self.session.post(
                f"{self.api_url}/admin/trade-questions",
                json=simple_question_data,
                headers=self.get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    question_id = data.get("question", {}).get("id")
                    if question_id:
                        self.created_questions.append(question_id)
                    
                    # Verify question was created without conditional logic
                    conditional_logic = data.get("question", {}).get("conditional_logic")
                    success = conditional_logic is None or conditional_logic.get("enabled") == False
                    
                    self.log_test_result(
                        "Backward Compatibility - Simple Question",
                        success,
                        "Question created without conditional logic"
                    )
                    return success
                else:
                    error_text = await response.text()
                    self.log_test_result(
                        "Backward Compatibility - Simple Question",
                        False,
                        f"Status: {response.status}, Error: {error_text}"
                    )
                    return False
        except Exception as e:
            self.log_test_result("Backward Compatibility - Simple Question", False, f"Exception: {str(e)}")
            return False
    
    async def cleanup_test_data(self):
        """Clean up created test questions"""
        logger.info("\n=== Cleaning Up Test Data ===")
        
        cleanup_count = 0
        for question_id in self.created_questions:
            try:
                async with self.session.delete(
                    f"{self.api_url}/admin/trade-questions/{question_id}",
                    headers=self.get_auth_headers()
                ) as response:
                    if response.status == 200:
                        cleanup_count += 1
            except Exception as e:
                logger.warning(f"Failed to cleanup question {question_id}: {str(e)}")
        
        self.log_test_result(
            "Test Data Cleanup",
            cleanup_count == len(self.created_questions),
            f"Cleaned up {cleanup_count}/{len(self.created_questions)} test questions"
        )
    
    async def run_all_tests(self):
        """Run all tests for enhanced multiple conditional logic system"""
        logger.info("🚀 Starting Enhanced Multiple Conditional Logic System Testing")
        logger.info(f"Backend URL: {self.base_url}")
        
        # Login as admin
        if not await self.admin_login():
            logger.error("❌ Admin login failed. Cannot proceed with tests.")
            return False
        
        try:
            # Run all test categories
            test_results = []
            
            test_results.append(await self.test_enhanced_data_models())
            test_results.append(await self.test_multiple_rules_creation())
            test_results.append(await self.test_complex_conditional_scenarios())
            test_results.append(await self.test_api_endpoints())
            test_results.append(await self.test_edge_cases_and_validation())
            test_results.append(await self.test_backward_compatibility())
            
            # Cleanup test data
            await self.cleanup_test_data()
            
            # Calculate overall success rate
            passed_tests = sum(1 for result in self.test_results if result["success"])
            total_tests = len(self.test_results)
            success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
            
            logger.info(f"\n📊 TEST SUMMARY:")
            logger.info(f"Total Tests: {total_tests}")
            logger.info(f"Passed: {passed_tests}")
            logger.info(f"Failed: {total_tests - passed_tests}")
            logger.info(f"Success Rate: {success_rate:.1f}%")
            
            # Log failed tests
            failed_tests = [result for result in self.test_results if not result["success"]]
            if failed_tests:
                logger.info(f"\n❌ FAILED TESTS:")
                for test in failed_tests:
                    logger.info(f"  - {test['test']}: {test['details']}")
            
            return success_rate >= 80  # Consider 80%+ success rate as overall success
            
        except Exception as e:
            logger.error(f"❌ Test execution failed: {str(e)}")
            return False

async def main():
    """Main test execution function"""
    async with EnhancedConditionalLogicTester() as tester:
        success = await tester.run_all_tests()
        
        if success:
            print("\n🎉 ENHANCED MULTIPLE CONDITIONAL LOGIC SYSTEM TESTING COMPLETED SUCCESSFULLY")
        else:
            print("\n⚠️ ENHANCED MULTIPLE CONDITIONAL LOGIC SYSTEM TESTING COMPLETED WITH ISSUES")
        
        return success

if __name__ == "__main__":
    asyncio.run(main())
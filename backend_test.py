#!/usr/bin/env python3
"""
TRADESPEOPLE API DUPLICATION INVESTIGATION

**CRITICAL TESTING REQUIREMENTS:**

1. **GET /api/tradespeople/ - Tradespeople API Endpoint Testing:**
   - Test the actual API response data to identify duplicate entries
   - Verify if duplicates are coming from the backend query
   - Check if the query is properly filtering users with role="tradesperson"
   - Examine the database query logic and results
   - Test pagination and limit parameters

2. **Database Investigation:**
   - Check how many users have role="tradesperson" in the database
   - Verify if there are duplicate records in the users collection
   - Check if the database query is properly deduplicating results
   - Examine the filters and sorting logic
   - Investigate data quality issues

3. **API Response Analysis:**
   - Verify the data transformation logic in the API
   - Check if the same user ID is appearing multiple times
   - Examine the pagination and limit logic
   - Verify the total count vs actual returned records
   - Analyze response structure and field mapping

4. **Data Quality Checks:**
   - Check if users have proper unique IDs
   - Verify if there are any data inconsistencies
   - Check if the profession/trade fields are properly populated
   - Examine user creation patterns
   - Look for duplicate names like "Emeka Okafor"

**EXPECTED BEHAVIOR:**
- API should return diverse tradespeople, not the same person repeated
- Each user should appear only once in the results
- Total count should match the actual number of unique tradespeople
- Results should be properly paginated and sorted

**KEY QUESTIONS TO ANSWER:**
- Why is "Emeka Okafor" appearing multiple times?
- Are there actually 276+ users with role="tradesperson"?
- Is the database query returning duplicates?
- Is the API transformation creating duplicates?

**PRIORITY FOCUS:**
Investigate the root cause of tradespeople duplication issue where "Emeka Okafor" appears multiple times instead of showing diverse tradespeople from the 276+ registered users.
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
BACKEND_URL = "https://admin-dashboard-202.preview.emergentagent.com/api"

class TradespeopleAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.duplicate_analysis = {
            'duplicate_names': {},
            'duplicate_ids': {},
            'emeka_okafor_count': 0,
            'total_unique_users': 0,
            'total_returned_records': 0,
            'all_tradespeople_data': []
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
    
    def test_tradespeople_api_basic(self):
        """Test basic tradespeople API functionality"""
        print("\n=== 1. Testing Tradespeople API Basic Functionality ===")
        
        # Test 1.1: Basic GET request
        print("\n--- Test 1.1: Basic GET /api/tradespeople/ ---")
        response = self.make_request("GET", "/tradespeople/")
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Tradespeople API - Basic GET", True, 
                              f"Status: {response.status_code}, Response received")
                
                # Store response for analysis
                self.test_data['basic_response'] = data
                
                # Check response structure
                self.verify_response_structure(data)
                
            except json.JSONDecodeError:
                self.log_result("Tradespeople API - Basic GET", False, "Invalid JSON response")
        else:
            self.log_result("Tradespeople API - Basic GET", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def verify_response_structure(self, data: dict):
        """Verify the structure of tradespeople API response"""
        print("\n--- Verifying Response Structure ---")
        
        # Check for expected top-level fields
        expected_fields = ['tradespeople', 'data', 'total', 'total_pages', 'current_page', 'limit']
        missing_fields = [field for field in expected_fields if field not in data]
        
        if not missing_fields:
            self.log_result("Response structure - Top level fields", True, 
                          "✅ All expected top-level fields present")
        else:
            self.log_result("Response structure - Top level fields", False, 
                          f"❌ Missing fields: {missing_fields}")
        
        # Check tradespeople array
        if 'tradespeople' in data and isinstance(data['tradespeople'], list):
            tradespeople_count = len(data['tradespeople'])
            self.log_result("Response structure - Tradespeople array", True, 
                          f"✅ Tradespeople array with {tradespeople_count} items")
            
            # Store count for analysis
            self.duplicate_analysis['total_returned_records'] = tradespeople_count
            
        else:
            self.log_result("Response structure - Tradespeople array", False, 
                          "❌ Tradespeople field missing or not an array")
        
        # Check total count
        if 'total' in data:
            total_count = data['total']
            self.log_result("Response structure - Total count", True, 
                          f"✅ Total count: {total_count}")
            print(f"🔍 API reports {total_count} total tradespeople in database")
        else:
            self.log_result("Response structure - Total count", False, 
                          "❌ Total count field missing")
    
    def test_duplicate_detection(self):
        """Test for duplicate entries in tradespeople response"""
        print("\n=== 2. Testing Duplicate Detection ===")
        
        if 'basic_response' not in self.test_data:
            self.log_result("Duplicate detection", False, "No basic response data available")
            return
        
        data = self.test_data['basic_response']
        tradespeople = data.get('tradespeople', [])
        
        if not tradespeople:
            self.log_result("Duplicate detection", False, "No tradespeople data to analyze")
            return
        
        # Store all tradespeople data for analysis
        self.duplicate_analysis['all_tradespeople_data'] = tradespeople
        
        print(f"\n--- Analyzing {len(tradespeople)} tradespeople records ---")
        
        # Check for duplicate IDs
        ids = [tp.get('id', '') for tp in tradespeople]
        id_counts = Counter(ids)
        duplicate_ids = {id_val: count for id_val, count in id_counts.items() if count > 1}
        
        if duplicate_ids:
            self.log_result("Duplicate detection - IDs", False, 
                          f"❌ Found duplicate IDs: {duplicate_ids}")
            self.duplicate_analysis['duplicate_ids'] = duplicate_ids
        else:
            self.log_result("Duplicate detection - IDs", True, 
                          f"✅ All {len(ids)} IDs are unique")
            self.duplicate_analysis['total_unique_users'] = len(set(ids))
        
        # Check for duplicate names
        names = [tp.get('name', '').strip() for tp in tradespeople]
        name_counts = Counter(names)
        duplicate_names = {name: count for name, count in name_counts.items() if count > 1}
        
        if duplicate_names:
            self.log_result("Duplicate detection - Names", False, 
                          f"❌ Found duplicate names: {duplicate_names}")
            self.duplicate_analysis['duplicate_names'] = duplicate_names
            
            # Check specifically for "Emeka Okafor"
            emeka_count = name_counts.get('Emeka Okafor', 0)
            if emeka_count > 0:
                self.duplicate_analysis['emeka_okafor_count'] = emeka_count
                print(f"🔍 CRITICAL FINDING: 'Emeka Okafor' appears {emeka_count} times")
                
                # Find all Emeka Okafor entries
                emeka_entries = [tp for tp in tradespeople if tp.get('name', '').strip() == 'Emeka Okafor']
                print(f"🔍 Emeka Okafor entries details:")
                for i, entry in enumerate(emeka_entries, 1):
                    print(f"   {i}. ID: {entry.get('id', 'N/A')}, Email: {entry.get('email', 'N/A')}, "
                          f"Trade: {entry.get('main_trade', 'N/A')}, Location: {entry.get('location', 'N/A')}")
        else:
            self.log_result("Duplicate detection - Names", True, 
                          f"✅ All {len(names)} names are unique")
        
        # Check for duplicate emails
        emails = [tp.get('email', '').strip().lower() for tp in tradespeople if tp.get('email')]
        email_counts = Counter(emails)
        duplicate_emails = {email: count for email, count in email_counts.items() if count > 1}
        
        if duplicate_emails:
            self.log_result("Duplicate detection - Emails", False, 
                          f"❌ Found duplicate emails: {duplicate_emails}")
        else:
            self.log_result("Duplicate detection - Emails", True, 
                          f"✅ All {len(emails)} emails are unique")
    
    def test_pagination_and_limits(self):
        """Test pagination and limit parameters"""
        print("\n=== 3. Testing Pagination and Limits ===")
        
        # Test 3.1: Different page sizes
        print("\n--- Test 3.1: Different page sizes ---")
        page_sizes = [5, 10, 20, 50]
        
        for limit in page_sizes:
            response = self.make_request("GET", f"/tradespeople/?limit={limit}")
            
            if response.status_code == 200:
                data = response.json()
                returned_count = len(data.get('tradespeople', []))
                
                if returned_count <= limit:
                    self.log_result(f"Pagination - Limit {limit}", True, 
                                  f"✅ Returned {returned_count} records (≤ {limit})")
                else:
                    self.log_result(f"Pagination - Limit {limit}", False, 
                                  f"❌ Returned {returned_count} records (> {limit})")
            else:
                self.log_result(f"Pagination - Limit {limit}", False, 
                              f"❌ Status: {response.status_code}")
        
        # Test 3.2: Multiple pages
        print("\n--- Test 3.2: Multiple pages ---")
        pages_to_test = [1, 2, 3]
        page_data = {}
        
        for page in pages_to_test:
            response = self.make_request("GET", f"/tradespeople/?page={page}&limit=10")
            
            if response.status_code == 200:
                data = response.json()
                tradespeople = data.get('tradespeople', [])
                page_data[page] = tradespeople
                
                self.log_result(f"Pagination - Page {page}", True, 
                              f"✅ Page {page} returned {len(tradespeople)} records")
            else:
                self.log_result(f"Pagination - Page {page}", False, 
                              f"❌ Status: {response.status_code}")
        
        # Check for overlapping data between pages
        if len(page_data) >= 2:
            page1_ids = set(tp.get('id', '') for tp in page_data.get(1, []))
            page2_ids = set(tp.get('id', '') for tp in page_data.get(2, []))
            
            overlap = page1_ids.intersection(page2_ids)
            if overlap:
                self.log_result("Pagination - Page overlap", False, 
                              f"❌ Found overlapping IDs between pages: {overlap}")
            else:
                self.log_result("Pagination - Page overlap", True, 
                              "✅ No overlapping records between pages")
    
    def test_comprehensive_data_analysis(self):
        """Perform comprehensive analysis of all available tradespeople data"""
        print("\n=== 4. Comprehensive Data Analysis ===")
        
        # Collect data from multiple pages to get a comprehensive view
        print("\n--- Collecting comprehensive dataset ---")
        all_tradespeople = []
        page = 1
        max_pages = 10  # Limit to prevent infinite loop
        
        while page <= max_pages:
            response = self.make_request("GET", f"/tradespeople/?page={page}&limit=50")
            
            if response.status_code == 200:
                data = response.json()
                tradespeople = data.get('tradespeople', [])
                
                if not tradespeople:  # No more data
                    break
                
                all_tradespeople.extend(tradespeople)
                print(f"   Page {page}: {len(tradespeople)} records")
                page += 1
            else:
                print(f"   Page {page}: Failed with status {response.status_code}")
                break
        
        print(f"🔍 Collected {len(all_tradespeople)} total records from {page-1} pages")
        
        # Analyze the comprehensive dataset
        self.analyze_comprehensive_dataset(all_tradespeople)
    
    def analyze_comprehensive_dataset(self, all_tradespeople: List[dict]):
        """Analyze the comprehensive tradespeople dataset"""
        print("\n--- Comprehensive Dataset Analysis ---")
        
        if not all_tradespeople:
            self.log_result("Comprehensive analysis", False, "No data to analyze")
            return
        
        # Update duplicate analysis with comprehensive data
        self.duplicate_analysis['all_tradespeople_data'] = all_tradespeople
        self.duplicate_analysis['total_returned_records'] = len(all_tradespeople)
        
        # Analyze unique IDs
        ids = [tp.get('id', '') for tp in all_tradespeople]
        unique_ids = set(ids)
        self.duplicate_analysis['total_unique_users'] = len(unique_ids)
        
        print(f"📊 COMPREHENSIVE ANALYSIS RESULTS:")
        print(f"   Total records collected: {len(all_tradespeople)}")
        print(f"   Unique user IDs: {len(unique_ids)}")
        print(f"   Duplicate records: {len(all_tradespeople) - len(unique_ids)}")
        
        # Check for ID duplicates
        id_counts = Counter(ids)
        duplicate_ids = {id_val: count for id_val, count in id_counts.items() if count > 1}
        
        if duplicate_ids:
            self.log_result("Comprehensive analysis - ID duplicates", False, 
                          f"❌ Found {len(duplicate_ids)} duplicate IDs affecting {sum(duplicate_ids.values()) - len(duplicate_ids)} extra records")
            
            print(f"🔍 DUPLICATE ID DETAILS:")
            for duplicate_id, count in list(duplicate_ids.items())[:5]:  # Show first 5
                print(f"   ID '{duplicate_id}' appears {count} times")
                
                # Show details of duplicated entries
                duplicated_entries = [tp for tp in all_tradespeople if tp.get('id') == duplicate_id]
                for i, entry in enumerate(duplicated_entries, 1):
                    print(f"      {i}. Name: {entry.get('name', 'N/A')}, Email: {entry.get('email', 'N/A')}")
        else:
            self.log_result("Comprehensive analysis - ID duplicates", True, 
                          "✅ No duplicate IDs found in comprehensive dataset")
        
        # Analyze names
        names = [tp.get('name', '').strip() for tp in all_tradespeople]
        name_counts = Counter(names)
        duplicate_names = {name: count for name, count in name_counts.items() if count > 1}
        
        if duplicate_names:
            self.log_result("Comprehensive analysis - Name duplicates", False, 
                          f"❌ Found {len(duplicate_names)} duplicate names")
            
            print(f"🔍 DUPLICATE NAME DETAILS:")
            for name, count in list(duplicate_names.items())[:10]:  # Show first 10
                print(f"   '{name}' appears {count} times")
                
                # Special focus on Emeka Okafor
                if name == 'Emeka Okafor':
                    self.duplicate_analysis['emeka_okafor_count'] = count
                    print(f"   🚨 CRITICAL: 'Emeka Okafor' appears {count} times!")
                    
                    # Show all Emeka Okafor entries
                    emeka_entries = [tp for tp in all_tradespeople if tp.get('name', '').strip() == 'Emeka Okafor']
                    for i, entry in enumerate(emeka_entries, 1):
                        print(f"      {i}. ID: {entry.get('id', 'N/A')}, Email: {entry.get('email', 'N/A')}, "
                              f"Trade: {entry.get('main_trade', 'N/A')}, Location: {entry.get('location', 'N/A')}")
        else:
            self.log_result("Comprehensive analysis - Name duplicates", True, 
                          "✅ No duplicate names found in comprehensive dataset")
        
        # Analyze data quality
        self.analyze_data_quality(all_tradespeople)
    
    def analyze_data_quality(self, all_tradespeople: List[dict]):
        """Analyze data quality issues"""
        print("\n--- Data Quality Analysis ---")
        
        # Check for missing required fields
        required_fields = ['id', 'name', 'email']
        missing_data_count = 0
        
        for field in required_fields:
            missing_count = sum(1 for tp in all_tradespeople if not tp.get(field))
            if missing_count > 0:
                print(f"   ⚠️  {missing_count} records missing '{field}' field")
                missing_data_count += missing_count
        
        if missing_data_count == 0:
            self.log_result("Data quality - Required fields", True, 
                          "✅ All records have required fields")
        else:
            self.log_result("Data quality - Required fields", False, 
                          f"❌ {missing_data_count} field values missing")
        
        # Check for empty or placeholder data
        placeholder_patterns = ['test', 'example', 'dummy', 'placeholder', 'sample']
        placeholder_count = 0
        
        for tp in all_tradespeople:
            name = tp.get('name', '').lower()
            email = tp.get('email', '').lower()
            
            if any(pattern in name or pattern in email for pattern in placeholder_patterns):
                placeholder_count += 1
        
        if placeholder_count > 0:
            print(f"   ⚠️  {placeholder_count} records appear to be test/placeholder data")
        
        # Check profession/trade data
        profession_data = [tp.get('main_trade', '') for tp in all_tradespeople]
        empty_professions = sum(1 for prof in profession_data if not prof)
        
        if empty_professions > 0:
            print(f"   ⚠️  {empty_professions} records missing profession/trade information")
        
        # Summary
        total_quality_issues = missing_data_count + placeholder_count + empty_professions
        if total_quality_issues == 0:
            self.log_result("Data quality - Overall", True, 
                          "✅ No significant data quality issues found")
        else:
            self.log_result("Data quality - Overall", False, 
                          f"❌ Found {total_quality_issues} data quality issues")
    
    def test_database_query_investigation(self):
        """Investigate potential database query issues"""
        print("\n=== 5. Database Query Investigation ===")
        
        # Test different sorting options
        print("\n--- Testing different sort options ---")
        sort_options = ['rating', 'reviews', 'experience', 'recent']
        
        for sort_by in sort_options:
            response = self.make_request("GET", f"/tradespeople/?sort_by={sort_by}&limit=10")
            
            if response.status_code == 200:
                data = response.json()
                tradespeople = data.get('tradespeople', [])
                
                self.log_result(f"Sort option - {sort_by}", True, 
                              f"✅ Sort by {sort_by} returned {len(tradespeople)} records")
                
                # Check if sorting is actually working
                if sort_by == 'rating' and len(tradespeople) > 1:
                    ratings = [tp.get('average_rating', 0) for tp in tradespeople]
                    is_sorted = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
                    if is_sorted:
                        print(f"      ✅ Records properly sorted by rating (descending)")
                    else:
                        print(f"      ⚠️  Records may not be properly sorted by rating")
                        
            else:
                self.log_result(f"Sort option - {sort_by}", False, 
                              f"❌ Status: {response.status_code}")
        
        # Test filtering options
        print("\n--- Testing filter options ---")
        
        # Test trade filter
        response = self.make_request("GET", "/tradespeople/?trade=plumbing&limit=10")
        if response.status_code == 200:
            data = response.json()
            tradespeople = data.get('tradespeople', [])
            self.log_result("Filter - Trade", True, 
                          f"✅ Trade filter returned {len(tradespeople)} records")
        else:
            self.log_result("Filter - Trade", False, f"❌ Status: {response.status_code}")
        
        # Test location filter
        response = self.make_request("GET", "/tradespeople/?location=lagos&limit=10")
        if response.status_code == 200:
            data = response.json()
            tradespeople = data.get('tradespeople', [])
            self.log_result("Filter - Location", True, 
                          f"✅ Location filter returned {len(tradespeople)} records")
        else:
            self.log_result("Filter - Location", False, f"❌ Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all tradespeople API tests"""
        print("🚀 Starting Tradespeople API Duplication Investigation")
        print("=" * 70)
        
        try:
            # Test service health
            self.test_service_health()
            
            # Test basic API functionality
            self.test_tradespeople_api_basic()
            
            # Test for duplicates
            self.test_duplicate_detection()
            
            # Test pagination
            self.test_pagination_and_limits()
            
            # Comprehensive data analysis
            self.test_comprehensive_data_analysis()
            
            # Database query investigation
            self.test_database_query_investigation()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive test results and analysis"""
        print("\n" + "=" * 70)
        print("🏁 TRADESPEOPLE API DUPLICATION INVESTIGATION RESULTS")
        print("=" * 70)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        # Print duplicate analysis results
        print(f"\n🔍 DUPLICATE ANALYSIS SUMMARY:")
        analysis = self.duplicate_analysis
        print(f"• Total records analyzed: {analysis['total_returned_records']}")
        print(f"• Unique user IDs: {analysis['total_unique_users']}")
        print(f"• Emeka Okafor appearances: {analysis['emeka_okafor_count']}")
        print(f"• Duplicate names found: {len(analysis['duplicate_names'])}")
        print(f"• Duplicate IDs found: {len(analysis['duplicate_ids'])}")
        
        # Key findings
        print(f"\n🎯 KEY FINDINGS:")
        
        if analysis['emeka_okafor_count'] > 1:
            print(f"🚨 CRITICAL: 'Emeka Okafor' appears {analysis['emeka_okafor_count']} times - DUPLICATION CONFIRMED")
        elif analysis['emeka_okafor_count'] == 1:
            print(f"✅ 'Emeka Okafor' appears only once - no duplication for this name")
        else:
            print(f"ℹ️  'Emeka Okafor' not found in current dataset")
        
        if analysis['duplicate_ids']:
            print(f"🚨 CRITICAL: Found duplicate user IDs - database integrity issue")
            for dup_id, count in list(analysis['duplicate_ids'].items())[:3]:
                print(f"   • ID '{dup_id}' appears {count} times")
        
        if analysis['duplicate_names'] and not analysis['duplicate_ids']:
            print(f"⚠️  Found duplicate names but unique IDs - possible legitimate users with same names")
        
        # Root cause analysis
        print(f"\n🔬 ROOT CAUSE ANALYSIS:")
        
        if analysis['duplicate_ids']:
            print(f"❌ PRIMARY ISSUE: Database query returning duplicate records with same IDs")
            print(f"   • This indicates a problem with the database query logic")
            print(f"   • The API transformation is not deduplicating results")
            print(f"   • Recommendation: Add DISTINCT clause or deduplication logic")
        elif analysis['duplicate_names'] and not analysis['duplicate_ids']:
            print(f"⚠️  SECONDARY ISSUE: Multiple users with same names but different IDs")
            print(f"   • This could be legitimate (common names) or data quality issue")
            print(f"   • Recommendation: Investigate user registration process")
        else:
            print(f"✅ NO DUPLICATION ISSUES: API appears to be working correctly")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        
        if analysis['duplicate_ids']:
            print(f"1. 🔧 IMMEDIATE: Fix database query to prevent duplicate IDs")
            print(f"2. 🔧 IMMEDIATE: Add deduplication logic in API response transformation")
            print(f"3. 🔍 INVESTIGATE: Check MongoDB aggregation pipeline for issues")
            print(f"4. 🔍 INVESTIGATE: Verify database indexes and query performance")
        
        if analysis['emeka_okafor_count'] > 1:
            print(f"5. 🔍 INVESTIGATE: Specific case of 'Emeka Okafor' duplication")
            print(f"6. 🧹 CLEANUP: Remove or merge duplicate 'Emeka Okafor' entries")
        
        if self.results['failed'] > 0:
            print(f"\n🔍 FAILED TESTS DETAILS:")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"{i}. {error}")
        
        # Overall assessment
        if analysis['duplicate_ids'] or analysis['emeka_okafor_count'] > 1:
            print(f"\n❌ OVERALL RESULT: DUPLICATION ISSUE CONFIRMED - Immediate action required")
        elif analysis['duplicate_names']:
            print(f"\n⚠️  OVERALL RESULT: POTENTIAL ISSUES FOUND - Investigation recommended")
        else:
            print(f"\n✅ OVERALL RESULT: NO DUPLICATION ISSUES DETECTED - API working correctly")
        
        print("=" * 70)

if __name__ == "__main__":
    tester = TradespeopleAPITester()
    tester.run_all_tests()
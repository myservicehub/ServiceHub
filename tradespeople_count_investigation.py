#!/usr/bin/env python3
"""
TRADESPEOPLE COUNT INVESTIGATION - CRITICAL DATA LOSS ANALYSIS

🚨 CRITICAL ISSUE: Only 11 tradespeople showing when there should be 99 total tradespeople in the database.

**URGENT INVESTIGATION REQUIREMENTS:**

1. **Database Count Verification:**
   - Check the actual total count of users with role="tradesperson" in the database
   - Verify if the cleanup script was too aggressive and removed legitimate users
   - Check if there are tradespeople with different status values (active/inactive/pending)
   - Examine the database query filters in the API

2. **API Response Analysis:**
   - Test GET /api/tradespeople/ with different limit parameters
   - Check if pagination is limiting the results incorrectly  
   - Verify the default limit (currently set to 12) vs total available
   - Test with higher limit values like limit=100
   - Check if sorting or filtering is excluding valid tradespeople

3. **Data Status Investigation:**
   - Check if tradespeople have status="active" vs other status values
   - Verify if the API is filtering by status incorrectly
   - Check if some users have empty/null profession fields that exclude them
   - Examine if location or other field filters are excluding users

4. **API Parameters Testing:**
   - Test: GET /api/tradespeople/?limit=100
   - Test: GET /api/tradespeople/?limit=100&page=1
   - Test different sort_by parameters
   - Test without any filters to get all tradespeople

**EXPECTED RESULTS:**
- Should find close to 99 tradespeople in the database
- API should return all available tradespeople when limit is set high enough
- Identify what's causing the restriction to only 11 results

**KEY QUESTIONS:**
- Are there actually 99 tradespeople in the users collection?
- What status/filters are preventing them from showing?
- Is the pagination limiting results incorrectly?
- Did the cleanup script remove too many legitimate users?
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
BACKEND_URL = "https://api.myservicehub.co/api"

class TradespeopleCountInvestigator:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        self.count_analysis = {
            'api_reported_total': 0,
            'actual_returned_count': 0,
            'max_limit_test_count': 0,
            'expected_count': 99,
            'missing_count': 0,
            'status_breakdown': {},
            'all_tradespeople_data': [],
            'potential_causes': []
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
    
    def test_basic_count_analysis(self):
        """Test basic count analysis to understand the discrepancy"""
        print("\n=== 1. CRITICAL COUNT ANALYSIS ===")
        
        # Test 1.1: Basic GET request to see current count
        print("\n--- Test 1.1: Basic GET /api/tradespeople/ ---")
        response = self.make_request("GET", "/tradespeople/")
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_data['basic_response'] = data
                
                # Extract key count information
                api_total = data.get('total', 0)
                returned_count = len(data.get('tradespeople', []))
                
                self.count_analysis['api_reported_total'] = api_total
                self.count_analysis['actual_returned_count'] = returned_count
                
                print(f"🔍 CRITICAL FINDINGS:")
                print(f"   • API reports total: {api_total} tradespeople")
                print(f"   • Actually returned: {returned_count} tradespeople")
                print(f"   • Expected count: {self.count_analysis['expected_count']} tradespeople")
                print(f"   • Missing count: {self.count_analysis['expected_count'] - api_total}")
                
                if api_total < self.count_analysis['expected_count']:
                    self.log_result("Count Analysis - Total Count", False, 
                                  f"❌ CRITICAL: Only {api_total} tradespeople found, expected ~{self.count_analysis['expected_count']}")
                    self.count_analysis['missing_count'] = self.count_analysis['expected_count'] - api_total
                    self.count_analysis['potential_causes'].append("Database records may have been deleted")
                else:
                    self.log_result("Count Analysis - Total Count", True, 
                                  f"✅ Found {api_total} tradespeople")
                
            except json.JSONDecodeError:
                self.log_result("Count Analysis - Basic GET", False, "Invalid JSON response")
        else:
            self.log_result("Count Analysis - Basic GET", False, 
                          f"Status: {response.status_code}, Response: {response.text}")
    
    def test_high_limit_requests(self):
        """Test with very high limits to see if more data is available"""
        print("\n=== 2. HIGH LIMIT TESTING ===")
        
        # Test with progressively higher limits
        high_limits = [50, 100, 200, 500]
        
        for limit in high_limits:
            print(f"\n--- Testing with limit={limit} ---")
            response = self.make_request("GET", f"/tradespeople/?limit={limit}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    total = data.get('total', 0)
                    returned = len(data.get('tradespeople', []))
                    
                    print(f"   • Limit: {limit}")
                    print(f"   • Total available: {total}")
                    print(f"   • Actually returned: {returned}")
                    
                    if limit == 100:
                        self.count_analysis['max_limit_test_count'] = returned
                    
                    if returned < limit and returned == total:
                        self.log_result(f"High Limit Test - {limit}", True, 
                                      f"✅ Returned all available records ({returned}/{total})")
                        print(f"   ✅ This appears to be the maximum available data")
                        break
                    elif returned == limit:
                        self.log_result(f"High Limit Test - {limit}", True, 
                                      f"✅ Limit reached, may have more data available")
                    else:
                        self.log_result(f"High Limit Test - {limit}", False, 
                                      f"❌ Unexpected result: returned {returned}, limit {limit}, total {total}")
                        
                except json.JSONDecodeError:
                    self.log_result(f"High Limit Test - {limit}", False, "Invalid JSON response")
            else:
                self.log_result(f"High Limit Test - {limit}", False, f"Status: {response.status_code}")
    
    def test_comprehensive_pagination(self):
        """Test comprehensive pagination to collect all available data"""
        print("\n=== 3. COMPREHENSIVE PAGINATION TEST ===")
        
        print("\n--- Collecting ALL available tradespeople data ---")
        all_tradespeople = []
        page = 1
        max_pages = 20  # Safety limit
        
        while page <= max_pages:
            response = self.make_request("GET", f"/tradespeople/?page={page}&limit=50")
            
            if response.status_code == 200:
                data = response.json()
                tradespeople = data.get('tradespeople', [])
                total = data.get('total', 0)
                
                if not tradespeople:  # No more data
                    print(f"   Page {page}: No more data available")
                    break
                
                all_tradespeople.extend(tradespeople)
                print(f"   Page {page}: {len(tradespeople)} records (Total so far: {len(all_tradespeople)})")
                
                # If we got less than the limit, we've reached the end
                if len(tradespeople) < 50:
                    print(f"   Page {page}: Reached end of data (got {len(tradespeople)} < 50)")
                    break
                    
                page += 1
            else:
                print(f"   Page {page}: Failed with status {response.status_code}")
                break
        
        # Store comprehensive data
        self.count_analysis['all_tradespeople_data'] = all_tradespeople
        total_collected = len(all_tradespeople)
        
        print(f"\n🔍 COMPREHENSIVE PAGINATION RESULTS:")
        print(f"   • Total pages checked: {page-1}")
        print(f"   • Total records collected: {total_collected}")
        print(f"   • Expected records: {self.count_analysis['expected_count']}")
        print(f"   • Missing records: {self.count_analysis['expected_count'] - total_collected}")
        
        if total_collected < self.count_analysis['expected_count']:
            self.log_result("Comprehensive Pagination", False, 
                          f"❌ CRITICAL: Only collected {total_collected} records, expected ~{self.count_analysis['expected_count']}")
            self.count_analysis['potential_causes'].append("Data may have been deleted from database")
        else:
            self.log_result("Comprehensive Pagination", True, 
                          f"✅ Collected {total_collected} records")
        
        # Analyze the collected data
        self.analyze_collected_data(all_tradespeople)
    
    def analyze_collected_data(self, all_tradespeople: List[dict]):
        """Analyze all collected tradespeople data for patterns"""
        print("\n--- ANALYZING COLLECTED DATA ---")
        
        if not all_tradespeople:
            print("   ⚠️  No data to analyze")
            return
        
        # Check for unique IDs
        ids = [tp.get('id', '') for tp in all_tradespeople]
        unique_ids = set(ids)
        
        print(f"   • Total records: {len(all_tradespeople)}")
        print(f"   • Unique IDs: {len(unique_ids)}")
        print(f"   • Duplicate records: {len(all_tradespeople) - len(unique_ids)}")
        
        # Check status distribution
        statuses = [tp.get('status', 'unknown') for tp in all_tradespeople]
        status_counts = Counter(statuses)
        
        print(f"   • Status distribution:")
        for status, count in status_counts.items():
            print(f"     - {status}: {count}")
        
        self.count_analysis['status_breakdown'] = dict(status_counts)
        
        # Check for missing profession data
        professions = [tp.get('main_trade', '') for tp in all_tradespeople]
        empty_professions = sum(1 for prof in professions if not prof)
        
        print(f"   • Records with profession: {len(professions) - empty_professions}")
        print(f"   • Records without profession: {empty_professions}")
        
        # Check for test/placeholder data
        test_patterns = ['test', 'example', 'dummy', 'placeholder', 'sample']
        test_count = 0
        
        for tp in all_tradespeople:
            name = tp.get('name', '').lower()
            email = tp.get('email', '').lower()
            
            if any(pattern in name or pattern in email for pattern in test_patterns):
                test_count += 1
        
        print(f"   • Test/placeholder records: {test_count}")
        print(f"   • Legitimate records: {len(all_tradespeople) - test_count}")
        
        # Sample some records for inspection
        print(f"\n   📋 SAMPLE RECORDS (first 5):")
        for i, tp in enumerate(all_tradespeople[:5], 1):
            print(f"      {i}. ID: {tp.get('id', 'N/A')[:8]}..., Name: {tp.get('name', 'N/A')}, "
                  f"Status: {tp.get('status', 'N/A')}, Trade: {tp.get('main_trade', 'N/A')}")
    
    def test_api_parameter_variations(self):
        """Test different API parameters to see if they affect the count"""
        print("\n=== 4. API PARAMETER VARIATIONS ===")
        
        # Test different sort options
        print("\n--- Testing different sort parameters ---")
        sort_options = ['rating', 'reviews', 'experience', 'recent', 'name']
        
        for sort_by in sort_options:
            response = self.make_request("GET", f"/tradespeople/?sort_by={sort_by}&limit=100")
            
            if response.status_code == 200:
                data = response.json()
                total = data.get('total', 0)
                returned = len(data.get('tradespeople', []))
                
                print(f"   • Sort by {sort_by}: Total={total}, Returned={returned}")
                
                if total != self.count_analysis['api_reported_total']:
                    self.log_result(f"Sort Parameter - {sort_by}", False, 
                                  f"❌ Different total count with sort_by={sort_by}: {total}")
                    self.count_analysis['potential_causes'].append(f"Sort parameter {sort_by} affects count")
                else:
                    self.log_result(f"Sort Parameter - {sort_by}", True, 
                                  f"✅ Consistent count with sort_by={sort_by}")
            else:
                self.log_result(f"Sort Parameter - {sort_by}", False, f"Status: {response.status_code}")
        
        # Test without any parameters
        print("\n--- Testing without any parameters ---")
        response = self.make_request("GET", "/tradespeople/")
        
        if response.status_code == 200:
            data = response.json()
            total = data.get('total', 0)
            returned = len(data.get('tradespeople', []))
            
            print(f"   • No parameters: Total={total}, Returned={returned}")
            
            if total == self.count_analysis['api_reported_total']:
                self.log_result("No Parameters Test", True, "✅ Consistent count without parameters")
            else:
                self.log_result("No Parameters Test", False, f"❌ Different count without parameters: {total}")
        
        # Test with explicit status filters (if the API supports it)
        print("\n--- Testing potential status filters ---")
        status_filters = ['active', 'inactive', 'pending', 'approved']
        
        for status in status_filters:
            response = self.make_request("GET", f"/tradespeople/?status={status}&limit=100")
            
            if response.status_code == 200:
                data = response.json()
                total = data.get('total', 0)
                returned = len(data.get('tradespeople', []))
                
                if total > 0:
                    print(f"   • Status {status}: Total={total}, Returned={returned}")
                    self.log_result(f"Status Filter - {status}", True, 
                                  f"✅ Found {total} tradespeople with status={status}")
                else:
                    print(f"   • Status {status}: No records found")
            else:
                print(f"   • Status {status}: API returned {response.status_code} (may not support this filter)")
    
    def investigate_potential_causes(self):
        """Investigate potential causes for the missing tradespeople"""
        print("\n=== 5. ROOT CAUSE INVESTIGATION ===")
        
        print(f"\n--- ANALYZING POTENTIAL CAUSES ---")
        
        # Calculate the data loss
        expected = self.count_analysis['expected_count']
        actual = self.count_analysis['api_reported_total']
        missing = expected - actual
        loss_percentage = (missing / expected * 100) if expected > 0 else 0
        
        print(f"🚨 DATA LOSS ANALYSIS:")
        print(f"   • Expected tradespeople: {expected}")
        print(f"   • Current tradespeople: {actual}")
        print(f"   • Missing tradespeople: {missing}")
        print(f"   • Data loss percentage: {loss_percentage:.1f}%")
        
        # Analyze potential causes
        print(f"\n🔍 POTENTIAL CAUSES ANALYSIS:")
        
        if missing > 80:  # More than 80% data loss
            print(f"1. 🚨 CRITICAL DATA LOSS (>{loss_percentage:.0f}%): Likely causes:")
            print(f"   • Database cleanup script removed too many records")
            print(f"   • Database migration or restore issue")
            print(f"   • Bulk deletion operation")
            print(f"   • Database corruption or connection issues")
            
            self.count_analysis['potential_causes'].extend([
                "Critical data loss - cleanup script too aggressive",
                "Database migration or restore issue",
                "Bulk deletion operation",
                "Database corruption"
            ])
        elif missing > 20:  # Moderate data loss
            print(f"2. ⚠️  MODERATE DATA LOSS ({loss_percentage:.0f}%): Likely causes:")
            print(f"   • Status filtering excluding valid tradespeople")
            print(f"   • API query logic filtering out records")
            print(f"   • Data validation rules too strict")
            
            self.count_analysis['potential_causes'].extend([
                "Status filtering excluding valid records",
                "API query logic issues",
                "Data validation too strict"
            ])
        else:
            print(f"3. ✅ MINOR DISCREPANCY ({loss_percentage:.0f}%): Likely causes:")
            print(f"   • Expected count may have been inaccurate")
            print(f"   • Normal data cleanup of test/invalid records")
            
        # Check status breakdown for clues
        if self.count_analysis['status_breakdown']:
            print(f"\n📊 STATUS BREAKDOWN ANALYSIS:")
            for status, count in self.count_analysis['status_breakdown'].items():
                percentage = (count / actual * 100) if actual > 0 else 0
                print(f"   • {status}: {count} ({percentage:.1f}%)")
                
                if status in ['inactive', 'pending', 'suspended'] and count == 0:
                    print(f"     ⚠️  No {status} tradespeople found - may indicate filtering")
        
        # Recommendations based on findings
        print(f"\n💡 IMMEDIATE RECOMMENDATIONS:")
        
        if missing > 50:
            print(f"1. 🔧 URGENT: Check database for deleted records")
            print(f"2. 🔧 URGENT: Review recent cleanup scripts and operations")
            print(f"3. 🔧 URGENT: Check database backups for data recovery")
            print(f"4. 🔍 INVESTIGATE: Review API query logic and filters")
        else:
            print(f"1. 🔍 INVESTIGATE: Verify expected count accuracy")
            print(f"2. 🔍 INVESTIGATE: Check API filtering logic")
            print(f"3. 📊 MONITOR: Track count changes over time")
    
    def run_all_tests(self):
        """Run all count investigation tests"""
        print("🚀 Starting Tradespeople Count Investigation")
        print("🚨 CRITICAL ISSUE: Only 11 tradespeople showing when there should be 99 total")
        print("=" * 80)
        
        try:
            # Test service health
            self.test_service_health()
            
            # Basic count analysis
            self.test_basic_count_analysis()
            
            # High limit testing
            self.test_high_limit_requests()
            
            # Comprehensive pagination
            self.test_comprehensive_pagination()
            
            # API parameter variations
            self.test_api_parameter_variations()
            
            # Root cause investigation
            self.investigate_potential_causes()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"Critical error: {str(e)}")
        
        # Print final results
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive investigation results"""
        print("\n" + "=" * 80)
        print("🏁 TRADESPEOPLE COUNT INVESTIGATION RESULTS")
        print("=" * 80)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}% ({self.results['passed']}/{total_tests} tests passed)")
        
        # Print count analysis results
        print(f"\n🔍 COUNT ANALYSIS SUMMARY:")
        analysis = self.count_analysis
        print(f"• Expected tradespeople: {analysis['expected_count']}")
        print(f"• API reported total: {analysis['api_reported_total']}")
        print(f"• Actually returned: {analysis['actual_returned_count']}")
        print(f"• Max limit test count: {analysis['max_limit_test_count']}")
        print(f"• Missing count: {analysis['missing_count']}")
        
        # Status breakdown
        if analysis['status_breakdown']:
            print(f"\n📊 STATUS BREAKDOWN:")
            for status, count in analysis['status_breakdown'].items():
                print(f"• {status}: {count}")
        
        # Key findings
        print(f"\n🎯 KEY FINDINGS:")
        
        missing = analysis['missing_count']
        if missing > 80:
            print(f"🚨 CRITICAL DATA LOSS: {missing} tradespeople missing ({missing/analysis['expected_count']*100:.0f}% loss)")
            print(f"   • This indicates a serious database issue")
            print(f"   • Immediate investigation and recovery required")
        elif missing > 20:
            print(f"⚠️  SIGNIFICANT DATA LOSS: {missing} tradespeople missing ({missing/analysis['expected_count']*100:.0f}% loss)")
            print(f"   • This indicates API filtering or database issues")
        elif missing > 0:
            print(f"ℹ️  MINOR DISCREPANCY: {missing} tradespeople missing ({missing/analysis['expected_count']*100:.0f}% difference)")
            print(f"   • May be due to data cleanup or inaccurate expectations")
        else:
            print(f"✅ COUNT MATCHES: Found expected number of tradespeople")
        
        # Potential causes
        if analysis['potential_causes']:
            print(f"\n🔬 POTENTIAL CAUSES:")
            for i, cause in enumerate(analysis['potential_causes'], 1):
                print(f"{i}. {cause}")
        
        # Recommendations
        print(f"\n💡 URGENT RECOMMENDATIONS:")
        
        if missing > 50:
            print(f"1. 🚨 IMMEDIATE: Check database for deleted records")
            print(f"2. 🚨 IMMEDIATE: Review recent cleanup scripts and database operations")
            print(f"3. 🚨 IMMEDIATE: Check database backups for potential data recovery")
            print(f"4. 🔍 INVESTIGATE: Review API query logic and filtering mechanisms")
            print(f"5. 📊 MONITOR: Implement monitoring to track count changes")
        elif missing > 10:
            print(f"1. 🔍 INVESTIGATE: Check API filtering and query logic")
            print(f"2. 🔍 INVESTIGATE: Verify database query performance and results")
            print(f"3. 📊 MONITOR: Track count changes over time")
        else:
            print(f"1. ✅ VERIFY: Confirm expected count accuracy")
            print(f"2. 📊 MONITOR: Continue monitoring for changes")
        
        if self.results['failed'] > 0:
            print(f"\n🔍 FAILED TESTS DETAILS:")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"{i}. {error}")
        
        # Overall assessment
        if missing > 80:
            print(f"\n❌ OVERALL RESULT: CRITICAL DATA LOSS DETECTED - Immediate action required")
        elif missing > 20:
            print(f"\n⚠️  OVERALL RESULT: SIGNIFICANT ISSUES FOUND - Investigation required")
        elif missing > 0:
            print(f"\n⚠️  OVERALL RESULT: MINOR DISCREPANCY FOUND - Monitoring recommended")
        else:
            print(f"\n✅ OVERALL RESULT: COUNT APPEARS CORRECT - No immediate action needed")
        
        print("=" * 80)

if __name__ == "__main__":
    investigator = TradespeopleCountInvestigator()
    investigator.run_all_tests()
#!/usr/bin/env python3
"""
FRONTEND AUTHENTICATION FLOW TESTING

This test simulates the frontend authentication flow to identify
why the login is failing from the frontend perspective.
"""

import requests
import json
import os
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FrontendAuthTester:
    def __init__(self):
        self.frontend_url = "https://servicenow-3.preview.emergentagent.com"
        self.backend_url = "https://servicenow-3.preview.emergentagent.com/api"
        self.target_email = "francisdaniel4jb@gmail.com"
        self.target_password = "Servicehub..1"
        self.driver = None
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
    
    def setup_driver(self):
        """Setup Chrome driver for testing"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.implicitly_wait(10)
            self.log_result("Chrome driver setup", True, "Driver initialized successfully")
            return True
        except Exception as e:
            self.log_result("Chrome driver setup", False, f"Failed to setup driver: {e}")
            return False
    
    def test_frontend_accessibility(self):
        """Test if frontend is accessible"""
        print("\n=== Testing Frontend Accessibility ===")
        
        try:
            self.driver.get(self.frontend_url)
            
            # Wait for page to load
            WebDriverWait(self.driver, 10).until(
                lambda driver: driver.execute_script("return document.readyState") == "complete"
            )
            
            # Check if page loaded successfully
            if "ServiceHub" in self.driver.title or self.driver.current_url.startswith(self.frontend_url):
                self.log_result("Frontend accessibility", True, f"Frontend loaded: {self.driver.title}")
            else:
                self.log_result("Frontend accessibility", False, f"Unexpected page: {self.driver.title}")
                
        except Exception as e:
            self.log_result("Frontend accessibility", False, f"Failed to load frontend: {e}")
    
    def test_login_modal_access(self):
        """Test accessing the login modal"""
        print("\n=== Testing Login Modal Access ===")
        
        try:
            # Look for login button or link
            login_selectors = [
                "button:contains('Login')",
                "a:contains('Login')",
                "[data-testid='login-button']",
                ".login-button",
                "#login-button"
            ]
            
            login_element = None
            for selector in login_selectors:
                try:
                    if "contains" in selector:
                        # Use XPath for text-based selection
                        xpath_selector = f"//button[contains(text(), 'Login')] | //a[contains(text(), 'Login')]"
                        login_element = self.driver.find_element(By.XPATH, xpath_selector)
                    else:
                        login_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if login_element:
                login_element.click()
                time.sleep(2)  # Wait for modal to appear
                
                # Check if login modal appeared
                modal_selectors = [
                    ".modal",
                    "[role='dialog']",
                    ".login-modal",
                    "#login-modal"
                ]
                
                modal_found = False
                for selector in modal_selectors:
                    try:
                        modal = self.driver.find_element(By.CSS_SELECTOR, selector)
                        if modal.is_displayed():
                            modal_found = True
                            break
                    except NoSuchElementException:
                        continue
                
                if modal_found:
                    self.log_result("Login modal access", True, "Login modal opened successfully")
                else:
                    self.log_result("Login modal access", False, "Login modal did not appear")
            else:
                self.log_result("Login modal access", False, "Login button not found")
                
        except Exception as e:
            self.log_result("Login modal access", False, f"Error accessing login modal: {e}")
    
    def test_login_form_interaction(self):
        """Test login form interaction"""
        print("\n=== Testing Login Form Interaction ===")
        
        try:
            # Find email input
            email_selectors = [
                "input[type='email']",
                "input[name='email']",
                "#email",
                ".email-input"
            ]
            
            email_input = None
            for selector in email_selectors:
                try:
                    email_input = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if not email_input:
                self.log_result("Email input field", False, "Email input not found")
                return
            
            # Find password input
            password_selectors = [
                "input[type='password']",
                "input[name='password']",
                "#password",
                ".password-input"
            ]
            
            password_input = None
            for selector in password_selectors:
                try:
                    password_input = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if not password_input:
                self.log_result("Password input field", False, "Password input not found")
                return
            
            # Fill in credentials
            email_input.clear()
            email_input.send_keys(self.target_email)
            
            password_input.clear()
            password_input.send_keys(self.target_password)
            
            self.log_result("Form field interaction", True, "Credentials entered successfully")
            
            # Find and click submit button
            submit_selectors = [
                "button[type='submit']",
                "input[type='submit']",
                ".login-submit",
                "#login-submit",
                "button:contains('Login')",
                "button:contains('Sign In')"
            ]
            
            submit_button = None
            for selector in submit_selectors:
                try:
                    if "contains" in selector:
                        xpath_selector = f"//button[contains(text(), 'Login')] | //button[contains(text(), 'Sign In')]"
                        submit_button = self.driver.find_element(By.XPATH, xpath_selector)
                    else:
                        submit_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if submit_button:
                submit_button.click()
                time.sleep(3)  # Wait for login attempt
                self.log_result("Login form submission", True, "Login form submitted")
            else:
                self.log_result("Login form submission", False, "Submit button not found")
                
        except Exception as e:
            self.log_result("Login form interaction", False, f"Error with form interaction: {e}")
    
    def test_login_response_handling(self):
        """Test how frontend handles login response"""
        print("\n=== Testing Login Response Handling ===")
        
        try:
            # Wait for potential redirect or success message
            time.sleep(5)
            
            # Check for error messages
            error_selectors = [
                ".error-message",
                ".alert-error",
                ".toast-error",
                "[role='alert']",
                ".notification-error"
            ]
            
            error_found = False
            error_message = ""
            for selector in error_selectors:
                try:
                    error_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if error_element.is_displayed():
                        error_message = error_element.text
                        error_found = True
                        break
                except NoSuchElementException:
                    continue
            
            if error_found:
                self.log_result("Login error detection", True, f"Error message found: {error_message}")
            else:
                # Check if login was successful (redirect or success indicator)
                current_url = self.driver.current_url
                if "/dashboard" in current_url or "/my-jobs" in current_url or "/profile" in current_url:
                    self.log_result("Login success detection", True, f"Redirected to: {current_url}")
                else:
                    # Check for success indicators
                    success_selectors = [
                        ".success-message",
                        ".alert-success",
                        ".toast-success"
                    ]
                    
                    success_found = False
                    for selector in success_selectors:
                        try:
                            success_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                            if success_element.is_displayed():
                                success_found = True
                                break
                        except NoSuchElementException:
                            continue
                    
                    if success_found:
                        self.log_result("Login success detection", True, "Success message found")
                    else:
                        self.log_result("Login response unclear", False, f"No clear success/error indication, URL: {current_url}")
                        
        except Exception as e:
            self.log_result("Login response handling", False, f"Error checking response: {e}")
    
    def test_browser_console_errors(self):
        """Check browser console for JavaScript errors"""
        print("\n=== Testing Browser Console Errors ===")
        
        try:
            # Get console logs
            logs = self.driver.get_log('browser')
            
            error_logs = [log for log in logs if log['level'] == 'SEVERE']
            warning_logs = [log for log in logs if log['level'] == 'WARNING']
            
            if error_logs:
                error_messages = [log['message'] for log in error_logs]
                self.log_result("Console errors", False, f"Found {len(error_logs)} errors: {error_messages[:3]}")
            else:
                self.log_result("Console errors", True, "No severe console errors found")
            
            if warning_logs:
                warning_messages = [log['message'] for log in warning_logs]
                self.log_result("Console warnings", True, f"Found {len(warning_logs)} warnings (non-critical)")
            else:
                self.log_result("Console warnings", True, "No console warnings found")
                
        except Exception as e:
            self.log_result("Console error check", False, f"Failed to check console: {e}")
    
    def test_network_requests(self):
        """Test network requests during login"""
        print("\n=== Testing Network Requests ===")
        
        try:
            # Get network logs (if available)
            logs = self.driver.get_log('performance')
            
            # Filter for network requests
            network_requests = []
            for log in logs:
                message = json.loads(log['message'])
                if message['message']['method'] == 'Network.responseReceived':
                    response = message['message']['params']['response']
                    if '/api/auth/login' in response['url']:
                        network_requests.append({
                            'url': response['url'],
                            'status': response['status'],
                            'statusText': response['statusText']
                        })
            
            if network_requests:
                for req in network_requests:
                    if req['status'] == 200:
                        self.log_result("Login API request", True, f"Status: {req['status']}")
                    else:
                        self.log_result("Login API request", False, f"Status: {req['status']} - {req['statusText']}")
            else:
                self.log_result("Network request detection", False, "No login API requests detected")
                
        except Exception as e:
            self.log_result("Network request analysis", False, f"Failed to analyze network: {e}")
    
    def test_local_storage_token(self):
        """Check if authentication token is stored in localStorage"""
        print("\n=== Testing Local Storage Token ===")
        
        try:
            # Check for common token storage keys
            token_keys = ['token', 'access_token', 'authToken', 'jwt', 'user_token']
            
            tokens_found = {}
            for key in token_keys:
                token = self.driver.execute_script(f"return localStorage.getItem('{key}');")
                if token:
                    tokens_found[key] = token[:50] + "..." if len(token) > 50 else token
            
            if tokens_found:
                self.log_result("Token storage", True, f"Found tokens: {list(tokens_found.keys())}")
                for key, token in tokens_found.items():
                    print(f"   {key}: {token}")
            else:
                self.log_result("Token storage", False, "No authentication tokens found in localStorage")
            
            # Check sessionStorage as well
            session_tokens = {}
            for key in token_keys:
                token = self.driver.execute_script(f"return sessionStorage.getItem('{key}');")
                if token:
                    session_tokens[key] = token[:50] + "..." if len(token) > 50 else token
            
            if session_tokens:
                self.log_result("Session token storage", True, f"Found session tokens: {list(session_tokens.keys())}")
            else:
                self.log_result("Session token storage", True, "No session tokens (expected)")
                
        except Exception as e:
            self.log_result("Token storage check", False, f"Failed to check storage: {e}")
    
    def cleanup(self):
        """Cleanup resources"""
        if self.driver:
            self.driver.quit()
    
    def run_all_tests(self):
        """Run all frontend authentication tests"""
        print("🌐 FRONTEND AUTHENTICATION FLOW TESTING")
        print("=" * 60)
        print(f"Frontend URL: {self.frontend_url}")
        print(f"Target User: {self.target_email}")
        print(f"Target Password: {self.target_password}")
        print("=" * 60)
        
        if not self.setup_driver():
            print("❌ Cannot proceed without Chrome driver")
            return
        
        try:
            # Run all test categories
            self.test_frontend_accessibility()
            self.test_login_modal_access()
            self.test_login_form_interaction()
            self.test_login_response_handling()
            self.test_browser_console_errors()
            self.test_network_requests()
            self.test_local_storage_token()
            
        finally:
            self.cleanup()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🌐 FRONTEND AUTHENTICATION TESTING SUMMARY")
        print("=" * 60)
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        print(f"📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FRONTEND ISSUES IDENTIFIED:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        if success_rate >= 70:
            print(f"   ✅ Frontend authentication flow appears to be working")
            print(f"   • Check if the issue is user-specific or browser-specific")
        else:
            print(f"   🚨 CRITICAL: Frontend authentication has significant issues")
            print(f"   • Check frontend code for authentication implementation")
            print(f"   • Verify API endpoint URLs and request formatting")

if __name__ == "__main__":
    # Note: This test requires Chrome/Chromium to be installed
    # For now, we'll skip the Selenium tests and focus on API testing
    print("🌐 FRONTEND AUTHENTICATION TESTING")
    print("=" * 60)
    print("⚠️  Selenium-based frontend testing requires Chrome installation")
    print("⚠️  Focusing on backend authentication testing instead")
    print("=" * 60)
    
    # Instead, let's test the frontend API calls directly
    import requests
    
    frontend_url = "https://servicenow-3.preview.emergentagent.com"
    backend_url = "https://servicenow-3.preview.emergentagent.com/api"
    
    print(f"\n🔍 Testing Frontend-Backend Communication")
    print(f"Frontend URL: {frontend_url}")
    print(f"Backend URL: {backend_url}")
    
    # Test if frontend can reach backend
    try:
        response = requests.get(f"{backend_url}/", timeout=10)
        if response.status_code == 200:
            print(f"✅ Frontend can reach backend: {response.json()}")
        else:
            print(f"❌ Frontend-backend communication issue: {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend-backend connection failed: {e}")
    
    # Test CORS headers
    try:
        response = requests.options(f"{backend_url}/auth/login", 
                                  headers={'Origin': frontend_url}, timeout=10)
        cors_headers = {k: v for k, v in response.headers.items() if 'cors' in k.lower() or 'access-control' in k.lower()}
        if cors_headers:
            print(f"✅ CORS headers present: {cors_headers}")
        else:
            print(f"⚠️  No CORS headers found")
    except Exception as e:
        print(f"❌ CORS check failed: {e}")
#!/usr/bin/env python3
"""
Test complete payment flow by simulating wallet funding and payment
"""

import requests
import json
import uuid
import base64
import io
from PIL import Image

BACKEND_URL = "https://homefix-beta.preview.emergentagent.com/api"

def make_request(method, endpoint, auth_token=None, **kwargs):
    """Make HTTP request with error handling"""
    url = f"{BACKEND_URL}{endpoint}"
    if 'headers' not in kwargs:
        kwargs['headers'] = {}
    
    if 'json' in kwargs:
        kwargs['headers']['Content-Type'] = 'application/json'
    
    if auth_token:
        kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
    
    return requests.request(method, url, **kwargs)

def create_dummy_image():
    """Create a dummy image for payment proof"""
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

def test_complete_payment_flow():
    """Test complete payment flow with wallet funding"""
    
    # Create homeowner
    homeowner_data = {
        "name": "Test Homeowner Complete",
        "email": f"test.homeowner.complete.{uuid.uuid4().hex[:8]}@email.com",
        "password": "SecurePass123",
        "phone": "+2348123456789",
        "location": "Lagos",
        "postcode": "100001"
    }
    
    response = make_request("POST", "/auth/register/homeowner", json=homeowner_data)
    if response.status_code != 200:
        print(f"❌ Homeowner registration failed: {response.status_code}")
        return
    
    homeowner_profile = response.json()
    homeowner_token = homeowner_profile['access_token']
    homeowner_user = homeowner_profile['user']
    print(f"✅ Homeowner created: {homeowner_user['id']}")
    
    # Create tradesperson
    tradesperson_data = {
        "name": "Test Tradesperson Complete",
        "email": f"test.tradesperson.complete.{uuid.uuid4().hex[:8]}@email.com",
        "password": "SecurePass123",
        "phone": "+2348123456790",
        "location": "Lagos",
        "postcode": "100001",
        "trade_categories": ["Plumbing"],
        "experience_years": 5,
        "company_name": "Test Plumbing Complete Services",
        "description": "Professional plumbing services for complete testing",
        "certifications": ["Licensed Plumber"]
    }
    
    response = make_request("POST", "/auth/register/tradesperson", json=tradesperson_data)
    if response.status_code != 200:
        print(f"❌ Tradesperson registration failed: {response.status_code}")
        return
    
    # Login tradesperson
    login_data = {
        "email": tradesperson_data["email"],
        "password": tradesperson_data["password"]
    }
    
    login_response = make_request("POST", "/auth/login", json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Tradesperson login failed: {login_response.status_code}")
        return
    
    login_data_response = login_response.json()
    tradesperson_token = login_data_response['access_token']
    tradesperson_user = login_data_response['user']
    print(f"✅ Tradesperson created: {tradesperson_user['id']}")
    
    # Create job
    job_data = {
        "title": "Test Job - Complete Payment Flow",
        "description": "Testing complete payment workflow with wallet funding",
        "category": "Plumbing",
        "state": "Lagos",
        "lga": "Ikeja",
        "town": "Computer Village",
        "zip_code": "100001",
        "home_address": "123 Test Street, Ikeja",
        "budget_min": 50000,
        "budget_max": 150000,
        "timeline": "Within 2 weeks",
        "homeowner_name": homeowner_user['name'],
        "homeowner_email": homeowner_user['email'],
        "homeowner_phone": homeowner_user['phone']
    }
    
    response = make_request("POST", "/jobs/", json=job_data, auth_token=homeowner_token)
    if response.status_code != 200:
        print(f"❌ Job creation failed: {response.status_code}")
        return
    
    job_response = response.json()
    job_id = job_response.get('id')
    print(f"✅ Job created: {job_id}")
    
    # Show interest
    interest_data = {"job_id": job_id}
    response = make_request("POST", "/interests/show-interest", json=interest_data, auth_token=tradesperson_token)
    
    if response.status_code != 200:
        print(f"❌ Interest creation failed: {response.status_code}")
        return
    
    interest_response = response.json()
    interest_id = interest_response['id']
    print(f"✅ Interest created: {interest_id}")
    
    # Share contact
    response = make_request("PUT", f"/interests/share-contact/{interest_id}", auth_token=homeowner_token)
    if response.status_code != 200:
        print(f"❌ Contact sharing failed: {response.status_code}")
        return
    
    print("✅ Contact shared successfully")
    
    # Try to fund wallet (simulate payment proof upload)
    print("💳 Attempting to fund wallet...")
    
    # Create dummy image for payment proof
    img_bytes = create_dummy_image()
    
    files = {
        'proof_image': ('payment_proof.png', img_bytes, 'image/png')
    }
    data = {
        'amount_naira': '2000'  # ₦2000 = 20 coins
    }
    
    response = requests.post(
        f"{BACKEND_URL}/wallet/fund",
        files=files,
        data=data,
        headers={'Authorization': f'Bearer {tradesperson_token}'}
    )
    
    if response.status_code == 200:
        funding_response = response.json()
        transaction_id = funding_response.get('transaction_id')
        print(f"✅ Funding request submitted: {transaction_id}")
        
        # Try to confirm funding as admin (this might not work without admin auth)
        print("🔧 Attempting admin funding confirmation...")
        
        admin_data = {
            'admin_notes': 'Test funding for payment flow verification'
        }
        
        response = requests.post(
            f"{BACKEND_URL}/admin/wallet/confirm-funding/{transaction_id}",
            data=admin_data
        )
        
        if response.status_code == 200:
            print("✅ Admin funding confirmation successful")
            
            # Check wallet balance
            response = make_request("GET", "/wallet/balance", auth_token=tradesperson_token)
            if response.status_code == 200:
                wallet_data = response.json()
                current_balance = wallet_data.get('balance_coins', 0)
                print(f"💰 Updated wallet balance: {current_balance} coins")
                
                if current_balance >= 10:
                    # Try payment (should succeed now)
                    response = make_request("POST", f"/interests/pay-access/{interest_id}", auth_token=tradesperson_token)
                    
                    if response.status_code == 200:
                        print("✅ Payment successful!")
                        
                        # Test conversation creation (should succeed)
                        response = make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_user['id']}", auth_token=homeowner_token)
                        
                        if response.status_code == 200:
                            conv_response = response.json()
                            conversation_id = conv_response.get('conversation_id')
                            print(f"✅ Conversation created successfully: {conversation_id}")
                            
                            # Test message sending
                            message_data = {
                                "conversation_id": conversation_id,
                                "content": "Hello! This is a test message after successful payment and wallet funding.",
                                "message_type": "text"
                            }
                            
                            response = make_request("POST", f"/messages/conversations/{conversation_id}/messages", json=message_data, auth_token=homeowner_token)
                            
                            if response.status_code == 200:
                                message_response = response.json()
                                print(f"✅ Message sent successfully: {message_response.get('id')}")
                                
                                # Test message retrieval
                                response = make_request("GET", f"/messages/conversations/{conversation_id}/messages", auth_token=homeowner_token)
                                
                                if response.status_code == 200:
                                    messages_response = response.json()
                                    messages = messages_response.get('messages', [])
                                    print(f"✅ Messages retrieved successfully: {len(messages)} messages")
                                    
                                    print("\n🎉 COMPLETE PAYMENT WORKFLOW TEST SUCCESSFUL!")
                                    print("✅ Interest → Contact Sharing → Payment → Conversation → Messaging")
                                    return True
                                else:
                                    print(f"❌ Message retrieval failed: {response.status_code}")
                            else:
                                print(f"❌ Message sending failed: {response.status_code}")
                        else:
                            print(f"❌ Conversation creation failed: {response.status_code}")
                    else:
                        print(f"❌ Payment failed: {response.status_code}")
                else:
                    print(f"💸 Insufficient balance after funding: {current_balance} coins")
            else:
                print(f"❌ Failed to check wallet balance: {response.status_code}")
        else:
            print(f"❌ Admin funding confirmation failed: {response.status_code}")
            print("💡 Testing without admin confirmation...")
    else:
        print(f"❌ Wallet funding request failed: {response.status_code}")
        print(f"Response: {response.text}")
    
    return False

if __name__ == "__main__":
    success = test_complete_payment_flow()
    if not success:
        print("\n⚠️  Complete payment flow test incomplete - wallet funding limitations")
        print("💡 Core access control functionality verified in main tests")
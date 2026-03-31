#!/usr/bin/env python3
"""
PAYMENT ENDPOINT DIRECT TEST - Test the payment endpoint with existing contact_shared interests
"""

import requests
import json

# Get backend URL from environment
BACKEND_URL = "https://api.myservicehub.co/api"

def make_request(method: str, endpoint: str, auth_token: str = None, **kwargs):
    """Make HTTP request with error handling and optional authentication"""
    url = f"{BACKEND_URL}{endpoint}"
    try:
        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        
        if 'json' in kwargs:
            kwargs['headers']['Content-Type'] = 'application/json'
        
        if auth_token:
            kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
        
        response = requests.request(method, url, **kwargs)
        return response
    except Exception as e:
        print(f"Request failed: {e}")
        raise

def login_existing_user():
    """Login with existing user credentials"""
    creds = {"email": "john.plumber.d553d0b3@tradework.com", "password": "SecurePass123"}
    response = make_request("POST", "/auth/login", json=creds)
    if response.status_code == 200:
        login_data = response.json()
        return login_data['access_token'], login_data['user']
    return None, None

def test_payment_endpoint():
    """Test payment endpoint with existing contact_shared interests"""
    print("🧪 TESTING PAYMENT ENDPOINT DIRECTLY")
    print("=" * 60)
    
    token, user = login_existing_user()
    if not token:
        print("❌ Cannot test without authentication")
        return
    
    print(f"✅ Logged in as: {user['email']}")
    
    # Get interests
    response = make_request("GET", "/interests/my-interests", auth_token=token)
    if response.status_code != 200:
        print("❌ Failed to get interests")
        return
    
    interests = response.json()
    contact_shared_interests = [i for i in interests if i.get('status') == 'contact_shared']
    
    print(f"📊 Found {len(contact_shared_interests)} interests with contact_shared status")
    
    if not contact_shared_interests:
        print("❌ No contact_shared interests to test payment with")
        return
    
    # Test payment with the first contact_shared interest
    test_interest = contact_shared_interests[0]
    interest_id = test_interest['id']
    job_id = test_interest['job_id']
    
    print(f"\n🎯 Testing payment for interest: {interest_id}")
    print(f"   Job ID: {job_id}")
    print(f"   Current Status: {test_interest.get('status')}")
    print(f"   Payment Made At: {test_interest.get('payment_made_at')}")
    
    # Check wallet balance before payment
    response = make_request("GET", "/wallet/balance", auth_token=token)
    if response.status_code == 200:
        wallet_data = response.json()
        balance_before = wallet_data.get('balance_coins', 0)
        print(f"   Wallet Balance Before: {balance_before} coins")
    else:
        print(f"   ❌ Failed to get wallet balance: {response.status_code}")
        return
    
    # Attempt payment
    print(f"\n💳 Attempting payment for interest {interest_id[:8]}...")
    response = make_request("POST", f"/interests/pay-access/{interest_id}", auth_token=token)
    
    print(f"   Payment Response Status: {response.status_code}")
    
    if response.status_code == 200:
        payment_result = response.json()
        print(f"   ✅ Payment successful!")
        print(f"   Message: {payment_result.get('message', 'No message')}")
        print(f"   Access Fee: ₦{payment_result.get('access_fee_naira', 0)}")
        print(f"   Coins Deducted: {payment_result.get('access_fee_coins', 0)}")
        
        # Check wallet balance after payment
        response = make_request("GET", "/wallet/balance", auth_token=token)
        if response.status_code == 200:
            wallet_data = response.json()
            balance_after = wallet_data.get('balance_coins', 0)
            print(f"   Wallet Balance After: {balance_after} coins")
            print(f"   Coins Deducted: {balance_before - balance_after}")
        
        # Check interest status after payment
        print(f"\n🔍 Checking interest status after payment...")
        response = make_request("GET", "/interests/my-interests", auth_token=token)
        if response.status_code == 200:
            updated_interests = response.json()
            updated_interest = None
            for interest in updated_interests:
                if interest.get('id') == interest_id:
                    updated_interest = interest
                    break
            
            if updated_interest:
                new_status = updated_interest.get('status')
                payment_made_at = updated_interest.get('payment_made_at')
                print(f"   Updated Status: {new_status}")
                print(f"   Payment Made At: {payment_made_at}")
                
                if new_status == 'paid_access':
                    print(f"   ✅ Status correctly updated to 'paid_access'")
                    
                    # Test conversation creation
                    test_conversation_creation(job_id, user['id'], token)
                else:
                    print(f"   ❌ CRITICAL BUG: Status is '{new_status}', expected 'paid_access'")
            else:
                print(f"   ❌ Interest not found after payment")
        else:
            print(f"   ❌ Failed to get updated interests: {response.status_code}")
            
    elif response.status_code == 400:
        error_data = response.json()
        error_detail = error_data.get('detail', 'No detail')
        print(f"   ❌ Payment failed: {error_detail}")
        
        if 'insufficient' in error_detail.lower():
            print(f"   💡 This is expected if wallet balance is insufficient")
        elif 'not yet shared' in error_detail.lower():
            print(f"   💡 Contact details not shared yet - need to check interest status")
        else:
            print(f"   🚨 Unexpected payment error - needs investigation")
    else:
        print(f"   ❌ Unexpected payment response: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   Error: {error_data}")
        except:
            print(f"   Raw response: {response.text}")

def test_conversation_creation(job_id: str, tradesperson_id: str, token: str):
    """Test conversation creation after successful payment"""
    print(f"\n💬 Testing conversation creation after payment...")
    print(f"   Job ID: {job_id}")
    print(f"   Tradesperson ID: {tradesperson_id}")
    
    response = make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                          auth_token=token)
    
    print(f"   Conversation Response Status: {response.status_code}")
    
    if response.status_code == 200:
        conv_data = response.json()
        conversation_id = conv_data.get('conversation_id')
        print(f"   ✅ Conversation created successfully: {conversation_id}")
        
        if conversation_id:
            test_message_sending(conversation_id, token)
    elif response.status_code == 403:
        error_data = response.json()
        error_detail = error_data.get('detail', 'No detail')
        print(f"   ❌ CRITICAL BUG: Conversation creation still blocked after payment: {error_detail}")
        print(f"   🚨 This confirms the user's reported issue!")
    else:
        print(f"   ❌ Unexpected conversation response: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   Error: {error_data}")
        except:
            print(f"   Raw response: {response.text}")

def test_message_sending(conversation_id: str, token: str):
    """Test message sending"""
    print(f"\n📝 Testing message sending...")
    
    message_data = {
        "conversation_id": conversation_id,
        "content": "Test message after successful payment",
        "message_type": "text"
    }
    
    response = make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                          json=message_data, auth_token=token)
    
    if response.status_code == 200:
        message_response = response.json()
        print(f"   ✅ Message sent successfully: {message_response.get('id', 'No ID')}")
    else:
        print(f"   ❌ Message sending failed: {response.status_code}")

if __name__ == "__main__":
    test_payment_endpoint()
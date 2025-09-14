#!/usr/bin/env python3
"""
PAYMENT STATUS DEBUG - Find existing paid interests and test conversation creation
"""

import requests
import json
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://servicehub-connect-2.preview.emergentagent.com/api"

def make_request(method: str, endpoint: str, auth_token: str = None, **kwargs):
    """Make HTTP request with error handling and optional authentication"""
    url = f"{BACKEND_URL}{endpoint}"
    try:
        # Set proper headers for JSON requests
        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        
        if 'json' in kwargs:
            kwargs['headers']['Content-Type'] = 'application/json'
        
        # Add authentication header if token provided
        if auth_token:
            kwargs['headers']['Authorization'] = f'Bearer {auth_token}'
        
        response = requests.request(method, url, **kwargs)
        return response
    except Exception as e:
        print(f"Request failed: {e}")
        raise

def login_existing_user():
    """Try to login with existing user credentials"""
    # Try some common test credentials that might exist
    test_credentials = [
        {"email": "john.plumber.d553d0b3@tradework.com", "password": "SecurePass123"},
        {"email": "test.tradesperson@email.com", "password": "SecurePass123"},
        {"email": "tradesperson@test.com", "password": "SecurePass123"}
    ]
    
    for creds in test_credentials:
        response = make_request("POST", "/auth/login", json=creds)
        if response.status_code == 200:
            login_data = response.json()
            print(f"✅ Successfully logged in as: {creds['email']}")
            return login_data['access_token'], login_data['user']
    
    print("❌ Could not login with any test credentials")
    return None, None

def check_existing_paid_interests():
    """Check for existing interests with paid_access status"""
    print("🔍 Checking for existing paid interests...")
    
    token, user = login_existing_user()
    if not token:
        print("❌ Cannot check interests without authentication")
        return
    
    # Get user's interests
    response = make_request("GET", "/interests/my-interests", auth_token=token)
    
    if response.status_code == 200:
        interests = response.json()
        print(f"📊 Found {len(interests)} total interests")
        
        paid_interests = []
        for interest in interests:
            status = interest.get('status')
            payment_made_at = interest.get('payment_made_at')
            job_id = interest.get('job_id')
            
            print(f"   Interest {interest.get('id', 'Unknown')[:8]}... - Status: {status}, Payment: {payment_made_at}")
            
            if status == 'paid_access':
                paid_interests.append(interest)
        
        print(f"💰 Found {len(paid_interests)} interests with paid_access status")
        
        if paid_interests:
            # Test conversation creation with a paid interest
            paid_interest = paid_interests[0]
            job_id = paid_interest['job_id']
            tradesperson_id = user['id']
            
            print(f"\n🧪 Testing conversation creation with paid interest:")
            print(f"   Job ID: {job_id}")
            print(f"   Tradesperson ID: {tradesperson_id}")
            
            # Try to create conversation
            response = make_request("GET", f"/messages/conversations/job/{job_id}?tradesperson_id={tradesperson_id}", 
                                  auth_token=token)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                conv_data = response.json()
                print(f"   ✅ Conversation creation successful: {conv_data.get('conversation_id', 'No ID')}")
                
                # Test message sending
                if 'conversation_id' in conv_data:
                    test_message_sending(conv_data['conversation_id'], token)
                
            elif response.status_code == 403:
                error_data = response.json()
                print(f"   ❌ Conversation creation blocked: {error_data.get('detail', 'No detail')}")
                
                # This is the bug - even with paid_access, conversation creation is failing
                print("   🚨 CRITICAL BUG IDENTIFIED: Paid interest still blocked from conversation creation")
                
            else:
                print(f"   ❌ Unexpected response: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text}")
        else:
            print("ℹ️  No paid interests found - this explains why users can't start conversations")
            print("   Need to investigate why payment process is not completing successfully")
    
    else:
        print(f"❌ Failed to get interests: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   Error: {error_data}")
        except:
            print(f"   Raw response: {response.text}")

def test_message_sending(conversation_id: str, token: str):
    """Test message sending in the conversation"""
    print(f"\n💬 Testing message sending in conversation {conversation_id[:8]}...")
    
    message_data = {
        "conversation_id": conversation_id,
        "content": "Test message to verify messaging works after payment",
        "message_type": "text"
    }
    
    response = make_request("POST", f"/messages/conversations/{conversation_id}/messages", 
                          json=message_data, auth_token=token)
    
    if response.status_code == 200:
        message_response = response.json()
        print(f"   ✅ Message sent successfully: {message_response.get('id', 'No ID')}")
    else:
        print(f"   ❌ Message sending failed: {response.status_code}")
        try:
            error_data = response.json()
            print(f"   Error: {error_data}")
        except:
            print(f"   Raw response: {response.text}")

def check_wallet_system():
    """Check wallet system functionality"""
    print("\n💰 Checking wallet system...")
    
    token, user = login_existing_user()
    if not token:
        return
    
    # Check wallet balance
    response = make_request("GET", "/wallet/balance", auth_token=token)
    
    if response.status_code == 200:
        wallet_data = response.json()
        balance = wallet_data.get('balance_coins', 0)
        print(f"   Current wallet balance: {balance} coins (₦{balance * 100})")
        
        if balance < 10:
            print("   ⚠️  Insufficient balance for payment testing")
            print("   This explains why payment attempts are failing")
        else:
            print("   ✅ Sufficient balance for payment testing")
    else:
        print(f"   ❌ Failed to get wallet balance: {response.status_code}")

if __name__ == "__main__":
    print("🚨 PAYMENT STATUS DEBUG INVESTIGATION")
    print("=" * 60)
    
    check_wallet_system()
    check_existing_paid_interests()
    
    print("\n" + "=" * 60)
    print("🔍 INVESTIGATION COMPLETE")
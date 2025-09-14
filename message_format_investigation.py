#!/usr/bin/env python3
"""
URGENT MESSAGE API RESPONSE FORMAT INVESTIGATION
Focus on existing conversation: c0237ce4-316d-4be9-83e1-92c80b5cef38
"""

import requests
import json
from datetime import datetime

# Backend URL
BACKEND_URL = "https://servicehub-connect-2.preview.emergentagent.com/api"

def investigate_existing_conversation():
    """Investigate the existing conversation to capture API response formats"""
    
    print("🔍 INVESTIGATING EXISTING CONVERSATION: c0237ce4-316d-4be9-83e1-92c80b5cef38")
    print("=" * 80)
    
    conversation_id = "c0237ce4-316d-4be9-83e1-92c80b5cef38"
    
    # We need to authenticate first - let's try to create a test user
    session = requests.Session()
    
    # Create test user for investigation
    homeowner_data = {
        "name": "API Investigation User",
        "email": f"api.investigation.{datetime.now().strftime('%H%M%S')}@email.com",
        "password": "SecurePass123",
        "phone": "+2348123456799",
        "location": "Lagos",
        "postcode": "100001"
    }
    
    try:
        response = session.post(f"{BACKEND_URL}/auth/register/homeowner", json=homeowner_data)
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get('access_token')
            
            if token:
                print(f"✅ Authentication successful")
                
                # Test 1: Try to get messages from existing conversation (might fail due to access control)
                print(f"\n--- Test 1: Message Loading API Response Format ---")
                headers = {'Authorization': f'Bearer {token}'}
                
                response = session.get(f"{BACKEND_URL}/messages/conversations/{conversation_id}/messages", 
                                     headers=headers)
                
                print(f"MESSAGE LOADING API RESPONSE (Status: {response.status_code}):")
                print("=" * 60)
                try:
                    if response.status_code == 200:
                        messages_data = response.json()
                        print(json.dumps(messages_data, indent=2, default=str))
                        
                        # Analyze message structure if we have messages
                        if 'messages' in messages_data and messages_data['messages']:
                            print(f"\n🔍 SAMPLE MESSAGE STRUCTURE:")
                            print("=" * 40)
                            sample_message = messages_data['messages'][0]
                            print(json.dumps(sample_message, indent=2, default=str))
                            print("=" * 40)
                            
                            # Analyze fields
                            fields = list(sample_message.keys())
                            print(f"📋 MESSAGE FIELDS: {fields}")
                            
                            # Check datetime fields
                            datetime_fields = []
                            for field, value in sample_message.items():
                                if 'at' in field.lower() or 'time' in field.lower():
                                    datetime_fields.append(f"{field}: {type(value).__name__} = {value}")
                            
                            if datetime_fields:
                                print(f"📅 DATETIME FIELDS:")
                                for dt_field in datetime_fields:
                                    print(f"   {dt_field}")
                    else:
                        error_data = response.json()
                        print(json.dumps(error_data, indent=2, default=str))
                        print(f"\n❌ Access denied (expected): {error_data.get('detail', 'No detail')}")
                        
                except json.JSONDecodeError:
                    print(f"Non-JSON Response: {response.text}")
                print("=" * 60)
                
                # Test 2: Try to send a message (will likely fail due to access control)
                print(f"\n--- Test 2: Message Sending API Response Format ---")
                
                message_data = {
                    "conversation_id": conversation_id,
                    "content": f"API Investigation Test Message - {datetime.now().strftime('%H:%M:%S')}",
                    "message_type": "text"
                }
                
                response = session.post(f"{BACKEND_URL}/messages/conversations/{conversation_id}/messages", 
                                      json=message_data, headers=headers)
                
                print(f"MESSAGE SENDING API RESPONSE (Status: {response.status_code}):")
                print("=" * 60)
                try:
                    response_data = response.json()
                    print(json.dumps(response_data, indent=2, default=str))
                    
                    if response.status_code == 200:
                        print(f"\n✅ MESSAGE SENT SUCCESSFULLY!")
                        print(f"📋 RESPONSE FIELDS: {list(response_data.keys())}")
                        
                        # Check datetime fields in response
                        datetime_fields = []
                        for field, value in response_data.items():
                            if 'at' in field.lower() or 'time' in field.lower():
                                datetime_fields.append(f"{field}: {type(value).__name__} = {value}")
                        
                        if datetime_fields:
                            print(f"📅 DATETIME FIELDS IN RESPONSE:")
                            for dt_field in datetime_fields:
                                print(f"   {dt_field}")
                    else:
                        print(f"\n❌ Message sending failed: {response_data.get('detail', 'No detail')}")
                        
                except json.JSONDecodeError:
                    print(f"Non-JSON Response: {response.text}")
                print("=" * 60)
                
            else:
                print("❌ No access token received")
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Investigation failed: {e}")
    
    # Test 3: Check the message models to understand expected structure
    print(f"\n--- Test 3: Expected Message Structure Analysis ---")
    print("Based on backend models, expected message structure should include:")
    expected_fields = [
        "id (str)",
        "conversation_id (str)", 
        "sender_id (str)",
        "sender_name (str)",
        "sender_type (str)",
        "message_type (str)",
        "content (str)",
        "attachment_url (Optional[str])",
        "status (str)",
        "created_at (datetime)",
        "updated_at (datetime)"
    ]
    
    for field in expected_fields:
        print(f"   • {field}")
    
    print(f"\n🎯 KEY INVESTIGATION POINTS:")
    print("1. Are datetime fields serialized as ISO strings or timestamps?")
    print("2. Are all expected fields present in API responses?")
    print("3. Is the response structure consistent between send and load operations?")
    print("4. Are there any field name mismatches between backend and frontend expectations?")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    investigate_existing_conversation()
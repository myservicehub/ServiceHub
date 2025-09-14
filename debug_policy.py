#!/usr/bin/env python3
"""
Debug Policy Issue
"""

import requests
import json

BACKEND_URL = "https://admin-dashboard-202.preview.emergentagent.com/api"

def test_policy_endpoints():
    print("=== Debugging Policy Endpoints ===")
    
    # Test admin policies endpoint
    print("\n1. Testing admin policies endpoint:")
    response = requests.get(f"{BACKEND_URL}/admin/policies")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['total_count']} policies")
        for policy in data['policies']:
            print(f"  - {policy['policy_type']}: {policy['status']} (version {policy['version']})")
    
    # Test admin get privacy policy by type
    print("\n2. Testing admin get privacy policy by type:")
    response = requests.get(f"{BACKEND_URL}/admin/policies/privacy_policy")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        policy = data['policy']
        print(f"Found policy: {policy['title']} (status: {policy['status']})")
    else:
        print(f"Error: {response.text}")
    
    # Test public policies endpoint
    print("\n3. Testing public policies endpoint:")
    response = requests.get(f"{BACKEND_URL}/jobs/policies")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['count']} public policies")
        for policy in data['policies']:
            print(f"  - {policy['policy_type']}: {policy['title']}")
    else:
        print(f"Error: {response.text}")
    
    # Test public get privacy policy by type
    print("\n4. Testing public get privacy policy by type:")
    response = requests.get(f"{BACKEND_URL}/jobs/policies/privacy_policy")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        policy = data['policy']
        print(f"Found policy: {policy['title']}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_policy_endpoints()
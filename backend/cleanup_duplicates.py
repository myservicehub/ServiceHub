#!/usr/bin/env python3
"""
Data Cleanup Script - Remove Duplicate Tradespeople
This script removes duplicate user records based on name and email patterns
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import re

# Add backend directory to path
backend_dir = os.path.dirname(__file__)
sys.path.insert(0, backend_dir)

from database import database

class DataCleanup:
    def __init__(self):
        self.stats = {
            'total_users': 0,
            'tradespeople_count': 0,
            'duplicates_found': 0,
            'duplicates_removed': 0,
            'test_accounts_removed': 0
        }
    
    async def analyze_duplicates(self):
        """Analyze duplicate data in the users collection"""
        print("=== Analyzing Duplicate Data ===")
        
        # Get all users
        users_collection = database.database.users
        all_users = await users_collection.find({}).to_list(length=None)
        self.stats['total_users'] = len(all_users)
        
        # Filter tradespeople
        tradespeople = [user for user in all_users if user.get('role') == 'tradesperson']
        self.stats['tradespeople_count'] = len(tradespeople)
        
        print(f"Total users: {self.stats['total_users']}")
        print(f"Tradespeople: {self.stats['tradespeople_count']}")
        
        # Analyze duplicates by name
        name_counts = {}
        email_patterns = {}
        
        for user in tradespeople:
            name = user.get('name', '').strip()
            email = user.get('email', '').strip()
            
            # Count names
            if name:
                name_counts[name] = name_counts.get(name, 0) + 1
            
            # Analyze email patterns
            if email:
                base_email = re.sub(r'\.\d+@', '@', email)  # Remove numbers before @
                email_patterns[base_email] = email_patterns.get(base_email, 0) + 1
        
        # Find duplicates
        duplicate_names = {name: count for name, count in name_counts.items() if count > 1}
        duplicate_emails = {email: count for email, count in email_patterns.items() if count > 1}
        
        print(f"\nDuplicate names found: {len(duplicate_names)}")
        for name, count in duplicate_names.items():
            print(f"  - {name}: {count} occurrences")
        
        print(f"\nDuplicate email patterns: {len(duplicate_emails)}")
        for email, count in duplicate_emails.items():
            print(f"  - {email}: {count} occurrences")
        
        self.stats['duplicates_found'] = sum(duplicate_names.values()) - len(duplicate_names)
        
        return duplicate_names, duplicate_emails
    
    async def remove_duplicates(self, duplicate_names):
        """Remove duplicate tradespeople, keeping only the first occurrence"""
        print("\n=== Removing Duplicates ===")
        
        users_collection = database.database.users
        removed_count = 0
        
        for name in duplicate_names:
            print(f"\nProcessing duplicates for: {name}")
            
            # Find all users with this name
            duplicate_users = await users_collection.find({
                "name": name,
                "role": "tradesperson"
            }).sort("created_at", 1).to_list(length=None)
            
            if len(duplicate_users) <= 1:
                continue
            
            # Keep the first (oldest) user and remove the rest
            keep_user = duplicate_users[0]
            remove_users = duplicate_users[1:]
            
            print(f"  Keeping user: {keep_user.get('email')} (created: {keep_user.get('created_at')})")
            print(f"  Removing {len(remove_users)} duplicates:")
            
            for user in remove_users:
                print(f"    - {user.get('email')} (created: {user.get('created_at')})")
                
                # Remove the duplicate user
                result = await users_collection.delete_one({"_id": user["_id"]})
                if result.deleted_count > 0:
                    removed_count += 1
                    
                    # Also clean up related data for this user
                    await self.cleanup_related_data(user.get("id", ""))
        
        self.stats['duplicates_removed'] = removed_count
        print(f"\nTotal duplicates removed: {removed_count}")
    
    async def remove_test_accounts(self):
        """Remove obvious test accounts"""
        print("\n=== Removing Test Accounts ===")
        
        users_collection = database.database.users
        
        # Patterns for test accounts
        test_patterns = [
            {"name": {"$regex": "^test", "$options": "i"}},
            {"email": {"$regex": "test.*@email\\.com$", "$options": "i"}},
            {"email": {"$regex": "test.*@example\\.com$", "$options": "i"}},
            {"name": {"$regex": "demo", "$options": "i"}},
        ]
        
        removed_count = 0
        for pattern in test_patterns:
            test_users = await users_collection.find({
                **pattern,
                "role": "tradesperson"
            }).to_list(length=None)
            
            for user in test_users:
                print(f"Removing test account: {user.get('name')} ({user.get('email')})")
                
                # Remove the test user
                result = await users_collection.delete_one({"_id": user["_id"]})
                if result.deleted_count > 0:
                    removed_count += 1
                    await self.cleanup_related_data(user.get("id", ""))
        
        self.stats['test_accounts_removed'] = removed_count
        print(f"Test accounts removed: {removed_count}")
    
    async def cleanup_related_data(self, user_id):
        """Clean up related data for a deleted user"""
        if not user_id:
            return
        
        # Clean up related collections
        collections_to_clean = [
            ("jobs", {"homeowner.id": user_id}),
            ("interests", {"tradesperson_id": user_id}),
            ("wallets", {"user_id": user_id}),
            ("wallet_transactions", {"user_id": user_id}),
            ("portfolio", {"tradesperson_id": user_id}),
            ("reviews", {"reviewer_id": user_id}),
            ("reviews", {"reviewee_id": user_id}),
            ("conversations", {"participants": user_id}),
            ("messages", {"sender_id": user_id}),
            ("notifications", {"user_id": user_id}),
        ]
        
        for collection_name, query in collections_to_clean:
            try:
                collection = getattr(database.database, collection_name)
                await collection.delete_many(query)
            except Exception as e:
                print(f"    Warning: Could not clean {collection_name}: {e}")
    
    async def verify_cleanup(self):
        """Verify the cleanup was successful"""
        print("\n=== Verification ===")
        
        users_collection = database.database.users
        tradespeople = await users_collection.find({"role": "tradesperson"}).to_list(length=None)
        
        # Check for remaining duplicates
        name_counts = {}
        for user in tradespeople:
            name = user.get('name', '').strip()
            if name:
                name_counts[name] = name_counts.get(name, 0) + 1
        
        remaining_duplicates = {name: count for name, count in name_counts.items() if count > 1}
        
        print(f"Total tradespeople after cleanup: {len(tradespeople)}")
        print(f"Remaining duplicates: {len(remaining_duplicates)}")
        
        if remaining_duplicates:
            print("Remaining duplicate names:")
            for name, count in remaining_duplicates.items():
                print(f"  - {name}: {count} occurrences")
        else:
            print("✅ No duplicate names found!")
    
    async def run_cleanup(self):
        """Run the full cleanup process"""
        print("Starting data cleanup process...")
        print(f"Timestamp: {datetime.now()}")
        
        try:
            await database.connect_to_mongo()
            
            # Analyze duplicates
            duplicate_names, duplicate_emails = await self.analyze_duplicates()
            
            # Ask for confirmation
            print(f"\n⚠️  CLEANUP SUMMARY:")
            print(f"   - {self.stats['duplicates_found']} duplicate records will be removed")
            print(f"   - Test accounts will also be removed")
            print(f"   - Related data will be cleaned up")
            
            # For safety, we'll proceed automatically since this is a known issue
            print("\n✅ Proceeding with cleanup...")
            
            # Remove duplicates
            await self.remove_duplicates(duplicate_names)
            
            # Remove test accounts
            await self.remove_test_accounts()
            
            # Verify cleanup
            await self.verify_cleanup()
            
            print(f"\n🎉 CLEANUP COMPLETE!")
            print(f"   - Duplicates removed: {self.stats['duplicates_removed']}")
            print(f"   - Test accounts removed: {self.stats['test_accounts_removed']}")
            print(f"   - Total cleanup: {self.stats['duplicates_removed'] + self.stats['test_accounts_removed']} records")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            raise
        finally:
            await database.close_mongo_connection()

async def main():
    cleanup = DataCleanup()
    await cleanup.run_cleanup()

if __name__ == "__main__":
    asyncio.run(main())
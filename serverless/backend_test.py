#!/usr/bin/env python3
"""
SubscriptionSavvy Backend API Test Suite
Tests all backend endpoints with comprehensive scenarios
"""

import requests
import json
import time
import uuid
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://savvy-tracker-1.preview.emergentagent.com/api"
TIMEOUT = 60

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def log_pass(self, test_name):
        print(f"✅ PASS: {test_name}")
        self.passed += 1
    
    def log_fail(self, test_name, error):
        print(f"❌ FAIL: {test_name} - {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} passed")
        if self.errors:
            print(f"\nFAILURES:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")

def make_request(method, endpoint, headers=None, json_data=None, timeout=TIMEOUT):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=json_data,
            timeout=timeout
        )
        return response
    except requests.exceptions.Timeout:
        print(f"Request timeout for {method} {endpoint}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed for {method} {endpoint}: {e}")
        return None

def test_auth_endpoints(results):
    """Test authentication endpoints"""
    print("\n🔐 Testing Authentication Endpoints...")
    
    # Generate unique email for this test run
    timestamp = int(time.time())
    test_email = f"test_{timestamp}@example.com"
    test_password = "password123"
    
    # Test 1: Register with valid data
    try:
        response = make_request("POST", "/auth/register", json_data={
            "email": test_email,
            "password": test_password
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data and data["token_type"] == "bearer":
                results.log_pass("Register with valid data")
                access_token = data["access_token"]
                user_id = data["user"]["id"]
            else:
                results.log_fail("Register with valid data", f"Invalid response structure: {data}")
                return None, None
        else:
            results.log_fail("Register with valid data", f"Status: {response.status_code if response else 'No response'}")
            return None, None
    except Exception as e:
        results.log_fail("Register with valid data", str(e))
        return None, None
    
    # Test 2: Register with duplicate email
    try:
        response = make_request("POST", "/auth/register", json_data={
            "email": test_email,
            "password": test_password
        })
        
        if response and response.status_code == 400:
            results.log_pass("Register duplicate email returns 400")
        else:
            results.log_fail("Register duplicate email returns 400", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Register duplicate email returns 400", str(e))
    
    # Test 3: Register with missing fields
    try:
        response = make_request("POST", "/auth/register", json_data={
            "email": test_email
        })
        
        if response and response.status_code == 400:
            results.log_pass("Register missing fields returns 400")
        else:
            results.log_fail("Register missing fields returns 400", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Register missing fields returns 400", str(e))
    
    # Test 4: Register with short password
    try:
        response = make_request("POST", "/auth/register", json_data={
            "email": f"short_{timestamp}@example.com",
            "password": "123"
        })
        
        if response and response.status_code == 400:
            results.log_pass("Register short password returns 400")
        else:
            results.log_fail("Register short password returns 400", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Register short password returns 400", str(e))
    
    # Test 5: Login with valid credentials
    try:
        response = make_request("POST", "/auth/login", json_data={
            "email": test_email,
            "password": test_password
        })
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                results.log_pass("Login with valid credentials")
            else:
                results.log_fail("Login with valid credentials", f"No access_token in response: {data}")
        else:
            results.log_fail("Login with valid credentials", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Login with valid credentials", str(e))
    
    # Test 6: Login with invalid credentials
    try:
        response = make_request("POST", "/auth/login", json_data={
            "email": test_email,
            "password": "wrongpassword"
        })
        
        if response and response.status_code == 401:
            results.log_pass("Login invalid credentials returns 401")
        else:
            results.log_fail("Login invalid credentials returns 401", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Login invalid credentials returns 401", str(e))
    
    # Test 7: GET /auth/me with valid token
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = make_request("GET", "/auth/me", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "email" in data:
                results.log_pass("GET /auth/me with valid token")
            else:
                results.log_fail("GET /auth/me with valid token", f"Invalid response structure: {data}")
        else:
            results.log_fail("GET /auth/me with valid token", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("GET /auth/me with valid token", str(e))
    
    # Test 8: GET /auth/me without token
    try:
        response = make_request("GET", "/auth/me")
        
        if response and response.status_code == 401:
            results.log_pass("GET /auth/me without token returns 401")
        else:
            results.log_fail("GET /auth/me without token returns 401", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("GET /auth/me without token returns 401", str(e))
    
    # Test 9: GET /auth/me with bad token
    try:
        headers = {"Authorization": "Bearer invalid_token"}
        response = make_request("GET", "/auth/me", headers=headers)
        
        if response and response.status_code == 401:
            results.log_pass("GET /auth/me with bad token returns 401")
        else:
            results.log_fail("GET /auth/me with bad token returns 401", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("GET /auth/me with bad token returns 401", str(e))
    
    return access_token, user_id

def test_subscriptions_crud(results, access_token, user_id):
    """Test subscription CRUD operations"""
    print("\n📋 Testing Subscription CRUD...")
    
    if not access_token:
        results.log_fail("Subscriptions CRUD", "No access token available")
        return []
    
    headers = {"Authorization": f"Bearer {access_token}"}
    created_subscriptions = []
    
    # Test 1: Create subscription
    try:
        subscription_data = {
            "name": "Netflix Premium",
            "cost": 649.0,
            "category": "Entertainment",
            "billing_cycle": "monthly",
            "next_payment": "2024-02-15",
            "notes": "Family plan"
        }
        
        response = make_request("POST", "/subscriptions", headers=headers, json_data=subscription_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "_id" not in data:  # Ensure UUID id, not MongoDB _id
                results.log_pass("Create subscription with UUID id")
                created_subscriptions.append(data["id"])
                subscription_id = data["id"]
            else:
                results.log_fail("Create subscription with UUID id", f"Invalid response structure: {data}")
                return []
        else:
            results.log_fail("Create subscription", f"Status: {response.status_code if response else 'No response'}")
            return []
    except Exception as e:
        results.log_fail("Create subscription", str(e))
        return []
    
    # Test 2: Create second subscription for testing
    try:
        subscription_data2 = {
            "name": "Spotify Premium",
            "cost": 1200.0,
            "category": "Entertainment", 
            "billing_cycle": "yearly",
            "next_payment": "2024-01-10",
            "notes": "Music streaming"
        }
        
        response = make_request("POST", "/subscriptions", headers=headers, json_data=subscription_data2)
        
        if response and response.status_code == 200:
            data = response.json()
            created_subscriptions.append(data["id"])
            results.log_pass("Create second subscription")
        else:
            results.log_fail("Create second subscription", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Create second subscription", str(e))
    
    # Test 3: GET subscriptions (should be sorted by next_payment)
    try:
        response = make_request("GET", "/subscriptions", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 2:
                # Check if sorted by next_payment ascending
                dates = [sub["next_payment"] for sub in data]
                if dates == sorted(dates):
                    results.log_pass("GET subscriptions sorted by next_payment")
                else:
                    results.log_fail("GET subscriptions sorted by next_payment", f"Not sorted correctly: {dates}")
            else:
                results.log_fail("GET subscriptions", f"Expected array with 2+ items, got: {data}")
        else:
            results.log_fail("GET subscriptions", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("GET subscriptions", str(e))
    
    # Test 4: Update subscription (partial update)
    try:
        update_data = {
            "cost": 699.0,
            "next_payment": "2024-03-15"
        }
        
        response = make_request("PUT", f"/subscriptions/{subscription_id}", headers=headers, json_data=update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("cost") == 699.0 and data.get("next_payment") == "2024-03-15":
                results.log_pass("Update subscription partial")
            else:
                results.log_fail("Update subscription partial", f"Update not reflected: {data}")
        else:
            results.log_fail("Update subscription partial", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Update subscription partial", str(e))
    
    # Test 5: Update non-existent subscription
    try:
        fake_id = str(uuid.uuid4())
        response = make_request("PUT", f"/subscriptions/{fake_id}", headers=headers, json_data={"cost": 100})
        
        if response and response.status_code == 404:
            results.log_pass("Update non-existent subscription returns 404")
        else:
            results.log_fail("Update non-existent subscription returns 404", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Update non-existent subscription returns 404", str(e))
    
    # Test 6: Delete subscription
    try:
        response = make_request("DELETE", f"/subscriptions/{subscription_id}", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("ok") is True:
                results.log_pass("Delete subscription")
                created_subscriptions.remove(subscription_id)
            else:
                results.log_fail("Delete subscription", f"Expected ok:true, got: {data}")
        else:
            results.log_fail("Delete subscription", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Delete subscription", str(e))
    
    # Test 7: Delete non-existent subscription
    try:
        fake_id = str(uuid.uuid4())
        response = make_request("DELETE", f"/subscriptions/{fake_id}", headers=headers)
        
        if response and response.status_code == 404:
            results.log_pass("Delete non-existent subscription returns 404")
        else:
            results.log_fail("Delete non-existent subscription returns 404", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Delete non-existent subscription returns 404", str(e))
    
    return created_subscriptions

def test_user_scoping(results):
    """Test that users can only see their own subscriptions"""
    print("\n👥 Testing User Scoping...")
    
    # Create two different users
    timestamp = int(time.time())
    user1_email = f"user1_{timestamp}@example.com"
    user2_email = f"user2_{timestamp}@example.com"
    password = "password123"
    
    # Register user 1
    try:
        response = make_request("POST", "/auth/register", json_data={
            "email": user1_email,
            "password": password
        })
        
        if response and response.status_code == 200:
            user1_token = response.json()["access_token"]
        else:
            results.log_fail("User scoping setup - register user1", f"Status: {response.status_code if response else 'No response'}")
            return
    except Exception as e:
        results.log_fail("User scoping setup - register user1", str(e))
        return
    
    # Register user 2
    try:
        response = make_request("POST", "/auth/register", json_data={
            "email": user2_email,
            "password": password
        })
        
        if response and response.status_code == 200:
            user2_token = response.json()["access_token"]
        else:
            results.log_fail("User scoping setup - register user2", f"Status: {response.status_code if response else 'No response'}")
            return
    except Exception as e:
        results.log_fail("User scoping setup - register user2", str(e))
        return
    
    # User 1 creates a subscription
    try:
        headers1 = {"Authorization": f"Bearer {user1_token}"}
        subscription_data = {
            "name": "User1 Subscription",
            "cost": 500.0,
            "category": "Test",
            "billing_cycle": "monthly",
            "next_payment": "2024-02-15",
            "notes": "User 1 only"
        }
        
        response = make_request("POST", "/subscriptions", headers=headers1, json_data=subscription_data)
        
        if response and response.status_code == 200:
            results.log_pass("User1 creates subscription")
        else:
            results.log_fail("User1 creates subscription", f"Status: {response.status_code if response else 'No response'}")
            return
    except Exception as e:
        results.log_fail("User1 creates subscription", str(e))
        return
    
    # User 2 should not see User 1's subscription
    try:
        headers2 = {"Authorization": f"Bearer {user2_token}"}
        response = make_request("GET", "/subscriptions", headers=headers2)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 0:
                results.log_pass("User scoping - User2 cannot see User1 subscriptions")
            else:
                results.log_fail("User scoping - User2 cannot see User1 subscriptions", f"User2 saw {len(data)} subscriptions")
        else:
            results.log_fail("User scoping - User2 GET subscriptions", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("User scoping - User2 GET subscriptions", str(e))

def test_mark_as_paid(results, access_token):
    """Test mark as paid functionality"""
    print("\n💳 Testing Mark as Paid...")
    
    if not access_token:
        results.log_fail("Mark as paid", "No access token available")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Create a subscription for testing
    try:
        subscription_data = {
            "name": "Test Payment Sub",
            "cost": 800.0,
            "category": "Test",
            "billing_cycle": "monthly",
            "next_payment": "2024-02-15",
            "notes": "For payment testing"
        }
        
        response = make_request("POST", "/subscriptions", headers=headers, json_data=subscription_data)
        
        if response and response.status_code == 200:
            subscription_id = response.json()["id"]
            original_next_payment = "2024-02-15"
        else:
            results.log_fail("Mark as paid setup", f"Status: {response.status_code if response else 'No response'}")
            return
    except Exception as e:
        results.log_fail("Mark as paid setup", str(e))
        return
    
    # Test mark as paid
    try:
        response = make_request("POST", f"/subscriptions/{subscription_id}/pay", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("ok") is True and "next_payment" in data:
                new_next_payment = data["next_payment"]
                # For monthly, should advance by 1 month
                expected_date = "2024-03-15"  # 2024-02-15 + 1 month
                if new_next_payment == expected_date:
                    results.log_pass("Mark as paid advances next_payment correctly")
                else:
                    results.log_fail("Mark as paid advances next_payment correctly", f"Expected {expected_date}, got {new_next_payment}")
            else:
                results.log_fail("Mark as paid response format", f"Invalid response: {data}")
        else:
            results.log_fail("Mark as paid", f"Status: {response.status_code if response else 'No response'}")
            return
    except Exception as e:
        results.log_fail("Mark as paid", str(e))
        return
    
    # Verify the change persisted
    try:
        response = make_request("GET", "/subscriptions", headers=headers)
        
        if response and response.status_code == 200:
            subscriptions = response.json()
            test_sub = next((s for s in subscriptions if s["id"] == subscription_id), None)
            if test_sub and test_sub["next_payment"] == "2024-03-15":
                results.log_pass("Mark as paid persisted in database")
            else:
                results.log_fail("Mark as paid persisted in database", f"Next payment not updated: {test_sub}")
        else:
            results.log_fail("Mark as paid verification", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Mark as paid verification", str(e))

def test_analytics(results, access_token):
    """Test analytics endpoints"""
    print("\n📊 Testing Analytics...")
    
    if not access_token:
        results.log_fail("Analytics", "No access token available")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Clear existing subscriptions and create known test data
    try:
        # Get existing subscriptions
        response = make_request("GET", "/subscriptions", headers=headers)
        if response and response.status_code == 200:
            existing_subs = response.json()
            # Delete existing subscriptions
            for sub in existing_subs:
                make_request("DELETE", f"/subscriptions/{sub['id']}", headers=headers)
    except Exception as e:
        print(f"Warning: Could not clear existing subscriptions: {e}")
    
    # Create known test subscriptions
    test_subscriptions = [
        {
            "name": "Monthly Service",
            "cost": 600.0,
            "category": "Entertainment",
            "billing_cycle": "monthly",
            "next_payment": "2024-02-15",
            "notes": "Monthly test"
        },
        {
            "name": "Yearly Service", 
            "cost": 1200.0,
            "category": "Productivity",
            "billing_cycle": "yearly",
            "next_payment": "2024-03-15",
            "notes": "Yearly test"
        }
    ]
    
    created_ids = []
    for sub_data in test_subscriptions:
        try:
            response = make_request("POST", "/subscriptions", headers=headers, json_data=sub_data)
            if response and response.status_code == 200:
                created_ids.append(response.json()["id"])
        except Exception as e:
            results.log_fail("Analytics setup", str(e))
            return
    
    # Test analytics summary
    try:
        response = make_request("GET", "/analytics/summary", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_monthly = 600 + (1200/12)  # 600 + 100 = 700
            expected_annual = expected_monthly * 12  # 8400
            expected_active = 2
            
            if (abs(data.get("monthly_total", 0) - expected_monthly) < 0.01 and
                abs(data.get("annual_total", 0) - expected_annual) < 0.01 and
                data.get("active_subscriptions") == expected_active):
                results.log_pass("Analytics summary calculations")
            else:
                results.log_fail("Analytics summary calculations", 
                    f"Expected monthly:{expected_monthly}, annual:{expected_annual}, active:{expected_active}. "
                    f"Got monthly:{data.get('monthly_total')}, annual:{data.get('annual_total')}, active:{data.get('active_subscriptions')}")
        else:
            results.log_fail("Analytics summary", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Analytics summary", str(e))
    
    # Test category breakdown
    try:
        response = make_request("GET", "/analytics/category-breakdown", headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) == 2:
                # Should be sorted by monthly_amount descending
                if data[0]["monthly_amount"] >= data[1]["monthly_amount"]:
                    # Check if sum equals monthly total
                    total_monthly = sum(item["monthly_amount"] for item in data)
                    expected_total = 700.0
                    if abs(total_monthly - expected_total) < 0.01:
                        results.log_pass("Analytics category breakdown")
                    else:
                        results.log_fail("Analytics category breakdown", f"Sum {total_monthly} != expected {expected_total}")
                else:
                    results.log_fail("Analytics category breakdown", "Not sorted by monthly_amount descending")
            else:
                results.log_fail("Analytics category breakdown", f"Expected 2 categories, got: {data}")
        else:
            results.log_fail("Analytics category breakdown", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("Analytics category breakdown", str(e))

def test_export_endpoints(results, access_token):
    """Test export endpoints"""
    print("\n📤 Testing Export Endpoints...")
    
    if not access_token:
        results.log_fail("Export", "No access token available")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Test CSV export
    try:
        response = make_request("GET", "/export/csv", headers=headers)
        
        if response and response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if "text/csv" in content_type:
                csv_content = response.text
                # Check for header row
                if "name,category,cost,billing_cycle,next_payment,notes" in csv_content:
                    # Check for data rows (should have at least header + some data)
                    lines = csv_content.strip().split('\n')
                    if len(lines) >= 2:  # header + at least 1 data row
                        results.log_pass("CSV export format and content")
                    else:
                        results.log_fail("CSV export content", f"Expected header + data, got {len(lines)} lines")
                else:
                    results.log_fail("CSV export header", "Missing expected CSV header")
            else:
                results.log_fail("CSV export content-type", f"Expected text/csv, got {content_type}")
        else:
            results.log_fail("CSV export", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("CSV export", str(e))
    
    # Test PDF export
    try:
        response = make_request("GET", "/export/pdf", headers=headers)
        
        if response and response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if "application/pdf" in content_type:
                pdf_content = response.content
                # Check for PDF signature
                if pdf_content.startswith(b'%PDF-'):
                    results.log_pass("PDF export format and signature")
                else:
                    results.log_fail("PDF export signature", "PDF does not start with %PDF-")
            else:
                results.log_fail("PDF export content-type", f"Expected application/pdf, got {content_type}")
        else:
            results.log_fail("PDF export", f"Status: {response.status_code if response else 'No response'}")
    except Exception as e:
        results.log_fail("PDF export", str(e))

def main():
    """Run all backend tests"""
    print("🚀 Starting SubscriptionSavvy Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("="*60)
    
    results = TestResults()
    
    # Test authentication and get token
    access_token, user_id = test_auth_endpoints(results)
    
    # Test subscription CRUD
    created_subs = test_subscriptions_crud(results, access_token, user_id)
    
    # Test user scoping
    test_user_scoping(results)
    
    # Test mark as paid
    test_mark_as_paid(results, access_token)
    
    # Test analytics
    test_analytics(results, access_token)
    
    # Test exports
    test_export_endpoints(results, access_token)
    
    # Print summary
    results.summary()
    
    return results.failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
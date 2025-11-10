#!/usr/bin/env python3
"""
Backend API Testing Suite for Sagent AI
Tests all backend endpoints to ensure proper functionality
"""

import requests
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List

# Configuration
BACKEND_URL = "https://smart-agent-hub-37.preview.emergentagent.com/api"
DEV_USER_ID = "demo-user-123"
DEV_MOCK_TOKEN = "dev-mock-token-123"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_test(test_name: str, passed: bool, message: str = "", details: Any = None):
    """Log test result"""
    result = {
        "test": test_name,
        "message": message,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    
    if passed:
        test_results["passed"].append(result)
        print(f"✅ PASS: {test_name}")
        if message:
            print(f"   {message}")
    else:
        test_results["failed"].append(result)
        print(f"❌ FAIL: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {details}")

def log_warning(test_name: str, message: str):
    """Log warning"""
    test_results["warnings"].append({
        "test": test_name,
        "message": message,
        "timestamp": datetime.now().isoformat()
    })
    print(f"⚠️  WARNING: {test_name}")
    print(f"   {message}")

# ===== TEST FUNCTIONS =====

def test_mongodb_connection():
    """Test 1: MongoDB Connection - Verify agents are initialized"""
    print("\n" + "="*80)
    print("TEST 1: MongoDB Connection and Database Setup")
    print("="*80)
    
    try:
        response = requests.get(f"{BACKEND_URL}/agents/public", timeout=10)
        
        if response.status_code == 200:
            agents = response.json()
            if len(agents) == 15:
                log_test(
                    "MongoDB Connection",
                    True,
                    f"Successfully retrieved {len(agents)} default agents from database"
                )
                return True
            else:
                log_test(
                    "MongoDB Connection",
                    False,
                    f"Expected 15 agents, got {len(agents)}",
                    {"agent_count": len(agents)}
                )
                return False
        else:
            log_test(
                "MongoDB Connection",
                False,
                f"Failed to retrieve agents. Status: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("MongoDB Connection", False, f"Exception occurred: {str(e)}")
        return False

def test_agents_public_endpoint():
    """Test 2: GET /api/agents/public - Public agent listing"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/agents/public - Public Agent Listing")
    print("="*80)
    
    try:
        response = requests.get(f"{BACKEND_URL}/agents/public", timeout=10)
        
        if response.status_code == 200:
            agents = response.json()
            
            # Verify structure
            if not isinstance(agents, list):
                log_test(
                    "GET /api/agents/public",
                    False,
                    "Response is not a list",
                    {"response_type": type(agents).__name__}
                )
                return False
            
            # Check agent structure
            required_fields = ["id", "name", "categories", "cost_per_query", "description"]
            if agents:
                first_agent = agents[0]
                missing_fields = [field for field in required_fields if field not in first_agent]
                
                if missing_fields:
                    log_test(
                        "GET /api/agents/public",
                        False,
                        f"Agent missing required fields: {missing_fields}",
                        {"first_agent": first_agent}
                    )
                    return False
            
            log_test(
                "GET /api/agents/public",
                True,
                f"Successfully retrieved {len(agents)} agents with correct structure"
            )
            
            # Print sample agents
            print(f"\n   Sample agents:")
            for agent in agents[:3]:
                print(f"   - {agent['name']} ({agent['id']}): {agent['description'][:60]}...")
            
            return True
        else:
            log_test(
                "GET /api/agents/public",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("GET /api/agents/public", False, f"Exception: {str(e)}")
        return False

def test_agents_endpoint():
    """Test 3: GET /api/agents - All agents (may require auth)"""
    print("\n" + "="*80)
    print("TEST 3: GET /api/agents - All Agents Endpoint")
    print("="*80)
    
    try:
        # Try without auth first
        response = requests.get(f"{BACKEND_URL}/agents", timeout=10)
        
        if response.status_code == 200:
            agents = response.json()
            log_test(
                "GET /api/agents",
                True,
                f"Successfully retrieved {len(agents)} agents without authentication"
            )
            return True
        else:
            log_test(
                "GET /api/agents",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("GET /api/agents", False, f"Exception: {str(e)}")
        return False

def test_chat_history_endpoint():
    """Test 4: GET /api/chat/history - Chat history retrieval"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/chat/history - Chat History Retrieval")
    print("="*80)
    
    try:
        # Test without auth (should work with demo user in DEV_MODE)
        response = requests.get(f"{BACKEND_URL}/chat/history", timeout=10)
        
        if response.status_code == 200:
            history = response.json()
            
            if not isinstance(history, list):
                log_test(
                    "GET /api/chat/history",
                    False,
                    "Response is not a list",
                    {"response_type": type(history).__name__}
                )
                return False
            
            log_test(
                "GET /api/chat/history",
                True,
                f"Successfully retrieved chat history with {len(history)} messages"
            )
            
            if history:
                print(f"\n   Sample message:")
                msg = history[0]
                print(f"   - Query: {msg.get('query', 'N/A')[:60]}...")
                print(f"   - Thread ID: {msg.get('thread_id', 'N/A')}")
            
            return True
        else:
            log_test(
                "GET /api/chat/history",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("GET /api/chat/history", False, f"Exception: {str(e)}")
        return False

def test_waitlist_endpoints():
    """Test 5: Waitlist API Endpoints"""
    print("\n" + "="*80)
    print("TEST 5: Waitlist API Endpoints")
    print("="*80)
    
    # Generate unique email for testing
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_name = "Test User"
    
    try:
        # Test POST /api/waitlist
        print("\n   Testing POST /api/waitlist...")
        payload = {
            "email": test_email,
            "name": test_name
        }
        response = requests.post(f"{BACKEND_URL}/waitlist", json=payload, timeout=10)
        
        if response.status_code == 200:
            entry = response.json()
            entry_id = entry.get("id")
            
            log_test(
                "POST /api/waitlist",
                True,
                f"Successfully created waitlist entry for {test_email}"
            )
            
            # Test duplicate email
            print("\n   Testing duplicate email handling...")
            response2 = requests.post(f"{BACKEND_URL}/waitlist", json=payload, timeout=10)
            if response2.status_code == 400:
                log_test(
                    "POST /api/waitlist - Duplicate Check",
                    True,
                    "Correctly rejected duplicate email"
                )
            else:
                log_warning(
                    "POST /api/waitlist - Duplicate Check",
                    f"Expected 400 for duplicate, got {response2.status_code}"
                )
            
            # Test GET /api/admin/waitlist
            print("\n   Testing GET /api/admin/waitlist...")
            response3 = requests.get(f"{BACKEND_URL}/admin/waitlist", timeout=10)
            if response3.status_code == 200:
                entries = response3.json()
                log_test(
                    "GET /api/admin/waitlist",
                    True,
                    f"Successfully retrieved {len(entries)} waitlist entries"
                )
            else:
                log_test(
                    "GET /api/admin/waitlist",
                    False,
                    f"Status code: {response3.status_code}",
                    {"response": response3.text}
                )
            
            # Test POST /api/admin/waitlist/{id}/approve
            if entry_id:
                print("\n   Testing POST /api/admin/waitlist/{id}/approve...")
                response4 = requests.post(f"{BACKEND_URL}/admin/waitlist/{entry_id}/approve", timeout=10)
                if response4.status_code == 200:
                    log_test(
                        "POST /api/admin/waitlist/{id}/approve",
                        True,
                        f"Successfully approved waitlist entry {entry_id}"
                    )
                else:
                    log_test(
                        "POST /api/admin/waitlist/{id}/approve",
                        False,
                        f"Status code: {response4.status_code}",
                        {"response": response4.text}
                    )
            
            return True
        else:
            log_test(
                "POST /api/waitlist",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("Waitlist Endpoints", False, f"Exception: {str(e)}")
        return False

def test_auth_endpoints():
    """Test 6: Authentication Endpoints"""
    print("\n" + "="*80)
    print("TEST 6: Authentication Endpoints (DEV_MODE)")
    print("="*80)
    
    try:
        # Test GET /api/auth/me without token
        print("\n   Testing GET /api/auth/me without token...")
        response = requests.get(f"{BACKEND_URL}/auth/me", timeout=10)
        
        if response.status_code == 401:
            log_test(
                "GET /api/auth/me - No Auth",
                True,
                "Correctly returned 401 for unauthenticated request"
            )
        else:
            log_warning(
                "GET /api/auth/me - No Auth",
                f"Expected 401, got {response.status_code}"
            )
        
        # Note: POST /api/auth/session-data requires external OAuth service
        # We'll skip this in testing as it requires real OAuth flow
        log_warning(
            "POST /api/auth/session-data",
            "Skipped - requires external Emergent OAuth service"
        )
        
        return True
    except Exception as e:
        log_test("Auth Endpoints", False, f"Exception: {str(e)}")
        return False

def test_chat_preview_endpoint():
    """Test 7: POST /api/chat/preview - Agent chain preview"""
    print("\n" + "="*80)
    print("TEST 7: POST /api/chat/preview - Agent Chain Preview")
    print("="*80)
    
    try:
        payload = {
            "query": "What is artificial intelligence?",
            "fetch_ui": False,
            "personalized": False
        }
        response = requests.post(f"{BACKEND_URL}/chat/preview", json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            
            if "agent_chain" in result:
                log_test(
                    "POST /api/chat/preview",
                    True,
                    f"Successfully retrieved agent chain preview"
                )
                print(f"\n   Agent chain: {result['agent_chain']}")
                return True
            else:
                log_test(
                    "POST /api/chat/preview",
                    False,
                    "Response missing 'agent_chain' field",
                    {"response": result}
                )
                return False
        else:
            log_test(
                "POST /api/chat/preview",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("POST /api/chat/preview", False, f"Exception: {str(e)}")
        return False

def test_chat_execute_endpoint():
    """Test 8: POST /api/chat/execute - Execute chat query via DeepAgents"""
    print("\n" + "="*80)
    print("TEST 8: POST /api/chat/execute - Execute Chat Query")
    print("="*80)
    
    try:
        thread_id = str(uuid.uuid4())
        payload = {
            "user_query": "What is the capital of France?",
            "agent_name": "smart_router",
            "thread_id": thread_id,
            "fetch_ui": False,
            "personalized": False
        }
        
        print(f"\n   Executing query with thread_id: {thread_id}")
        print(f"   Query: {payload['user_query']}")
        print(f"   This may take a while as it calls external DeepAgents service...")
        
        response = requests.post(f"{BACKEND_URL}/chat/execute", json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            
            required_fields = ["thread_id", "agent_name"]
            missing_fields = [field for field in required_fields if field not in result]
            
            if missing_fields:
                log_test(
                    "POST /api/chat/execute",
                    False,
                    f"Response missing required fields: {missing_fields}",
                    {"response": result}
                )
                return False
            
            log_test(
                "POST /api/chat/execute",
                True,
                f"Successfully executed chat query via DeepAgents"
            )
            
            print(f"\n   Response summary:")
            print(f"   - Thread ID: {result.get('thread_id')}")
            print(f"   - Agent: {result.get('agent_name')}")
            if result.get('result'):
                print(f"   - Result: {str(result.get('result'))[:100]}...")
            
            return True
        elif response.status_code == 502:
            log_test(
                "POST /api/chat/execute",
                False,
                "DeepAgents service unavailable (502 Bad Gateway)",
                {"response": response.text}
            )
            return False
        else:
            log_test(
                "POST /api/chat/execute",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except requests.Timeout:
        log_test(
            "POST /api/chat/execute",
            False,
            "Request timed out - DeepAgents service may be slow or unavailable"
        )
        return False
    except Exception as e:
        log_test("POST /api/chat/execute", False, f"Exception: {str(e)}")
        return False

def test_analytics_endpoint():
    """Test 9: GET /api/analytics - Analytics data"""
    print("\n" + "="*80)
    print("TEST 9: GET /api/analytics - Analytics Data")
    print("="*80)
    
    try:
        response = requests.get(f"{BACKEND_URL}/analytics", timeout=10)
        
        if response.status_code == 200:
            analytics = response.json()
            
            required_fields = ["total_queries", "total_cost", "agent_usage"]
            missing_fields = [field for field in required_fields if field not in analytics]
            
            if missing_fields:
                log_test(
                    "GET /api/analytics",
                    False,
                    f"Response missing required fields: {missing_fields}",
                    {"response": analytics}
                )
                return False
            
            log_test(
                "GET /api/analytics",
                True,
                f"Successfully retrieved analytics data"
            )
            
            print(f"\n   Analytics summary:")
            print(f"   - Total queries: {analytics.get('total_queries', 0)}")
            print(f"   - Total cost: ${analytics.get('total_cost', 0):.4f}")
            print(f"   - Agent usage: {len(analytics.get('agent_usage', {}))} agents")
            
            return True
        else:
            log_test(
                "GET /api/analytics",
                False,
                f"Status code: {response.status_code}",
                {"response": response.text}
            )
            return False
    except Exception as e:
        log_test("GET /api/analytics", False, f"Exception: {str(e)}")
        return False

def test_agent_subscription_endpoints():
    """Test 10: Agent subscription/unsubscription (requires auth)"""
    print("\n" + "="*80)
    print("TEST 10: Agent Subscription Endpoints")
    print("="*80)
    
    try:
        # Get first agent ID
        response = requests.get(f"{BACKEND_URL}/agents/public", timeout=10)
        if response.status_code != 200:
            log_test(
                "Agent Subscription Setup",
                False,
                "Could not retrieve agents for subscription test"
            )
            return False
        
        agents = response.json()
        if not agents:
            log_test(
                "Agent Subscription Setup",
                False,
                "No agents available for subscription test"
            )
            return False
        
        test_agent_id = agents[0]["id"]
        
        # Test without auth - should fail with 401
        print(f"\n   Testing subscription without auth...")
        response = requests.post(f"{BACKEND_URL}/agents/{test_agent_id}/subscribe", timeout=10)
        
        if response.status_code == 401:
            log_test(
                "POST /api/agents/{id}/subscribe - No Auth",
                True,
                "Correctly returned 401 for unauthenticated subscription request"
            )
        else:
            log_warning(
                "POST /api/agents/{id}/subscribe - No Auth",
                f"Expected 401, got {response.status_code}"
            )
        
        # Test GET /api/agents/subscribed without auth
        print(f"\n   Testing GET /api/agents/subscribed without auth...")
        response = requests.get(f"{BACKEND_URL}/agents/subscribed", timeout=10)
        
        if response.status_code == 401:
            log_test(
                "GET /api/agents/subscribed - No Auth",
                True,
                "Correctly returned 401 for unauthenticated request"
            )
        else:
            log_warning(
                "GET /api/agents/subscribed - No Auth",
                f"Expected 401, got {response.status_code}"
            )
        
        return True
    except Exception as e:
        log_test("Agent Subscription Endpoints", False, f"Exception: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total_tests = len(test_results["passed"]) + len(test_results["failed"])
    passed_count = len(test_results["passed"])
    failed_count = len(test_results["failed"])
    warning_count = len(test_results["warnings"])
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"✅ Passed: {passed_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"⚠️  Warnings: {warning_count}")
    
    if test_results["failed"]:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for result in test_results["failed"]:
            print(f"\n❌ {result['test']}")
            print(f"   Message: {result['message']}")
            if result.get('details'):
                print(f"   Details: {result['details']}")
    
    if test_results["warnings"]:
        print("\n" + "="*80)
        print("WARNINGS:")
        print("="*80)
        for warning in test_results["warnings"]:
            print(f"\n⚠️  {warning['test']}")
            print(f"   {warning['message']}")
    
    print("\n" + "="*80)
    if failed_count == 0:
        print("✅ ALL CRITICAL TESTS PASSED!")
    else:
        print(f"❌ {failed_count} TEST(S) FAILED - REVIEW REQUIRED")
    print("="*80)

def main():
    """Run all backend tests"""
    print("="*80)
    print("SAGENT AI - BACKEND API TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("="*80)
    
    # Run all tests
    test_mongodb_connection()
    test_agents_public_endpoint()
    test_agents_endpoint()
    test_chat_history_endpoint()
    test_waitlist_endpoints()
    test_auth_endpoints()
    test_chat_preview_endpoint()
    test_chat_execute_endpoint()
    test_analytics_endpoint()
    test_agent_subscription_endpoints()
    
    # Print summary
    print_summary()
    
    # Save results to file
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(test_results, f, indent=2)
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")

if __name__ == "__main__":
    main()

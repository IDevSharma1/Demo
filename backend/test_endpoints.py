#!/usr/bin/env python3
"""
Backend API endpoint testing for DisasterDash
"""
import asyncio
import aiohttp
import json
import sys
from datetime import datetime
import uuid

BASE_URL = "https://crisishub.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.session = None
        self.admin_token = None
        self.test_results = []
        
    async def setup(self):
        """Setup test session"""
        self.session = aiohttp.ClientSession()
        print("🔧 Setting up API test session...")
        
    async def cleanup(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
        print("🧹 Cleaned up test session")
        
    async def test_endpoint(self, method, endpoint, data=None, headers=None, description=""):
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url, headers=headers) as response:
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status": response.status,
                        "description": description,
                        "success": 200 <= response.status < 300,
                        "response": await response.text()
                    }
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers=headers) as response:
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status": response.status,
                        "description": description,
                        "success": 200 <= response.status < 300,
                        "response": await response.text()
                    }
            elif method.upper() == "PUT":
                async with self.session.put(url, json=data, headers=headers) as response:
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status": response.status,
                        "description": description,
                        "success": 200 <= response.status < 300,
                        "response": await response.text()
                    }
            else:
                result = {
                    "endpoint": endpoint,
                    "method": method,
                    "status": 0,
                    "description": description,
                    "success": False,
                    "response": f"Unsupported method: {method}"
                }
                
        except Exception as e:
            result = {
                "endpoint": endpoint,
                "method": method,
                "status": 0,
                "description": description,
                "success": False,
                "response": f"Error: {str(e)}"
            }
            
        self.test_results.append(result)
        
        # Print result
        status_emoji = "✅" if result["success"] else "❌"
        print(f"{status_emoji} {method.upper()} {endpoint} - {result['status']} - {description}")
        
        return result
        
    async def run_tests(self):
        """Run all endpoint tests"""
        print("🚀 Starting DisasterDash Backend API Tests\n")
        
        # Test 1: Basic health check
        await self.test_endpoint("GET", "/", description="Root endpoint health check")
        await self.test_endpoint("GET", "/health", description="Health check endpoint")
        
        # Test 2: Dashboard data (no auth required)
        await self.test_endpoint("GET", "/dashboard/data", description="Dashboard data retrieval")
        
        # Test 3: Public reports access
        await self.test_endpoint("GET", "/reports", description="Get all reports (public)")
        
        # Test 4: Public shelters access  
        await self.test_endpoint("GET", "/shelters", description="Get all shelters (public)")
        
        # Test 5: AI updates access
        await self.test_endpoint("GET", "/ai/updates", description="Get AI analysis updates")
        
        # Test 6: Try to create report without auth (should fail)
        report_data = {
            "title": "Test Report",
            "description": "Test emergency report",
            "location": {"lat": 40.7128, "lng": -74.0060},
            "city": "New York",
            "country": "USA",
            "severity": "moderate"
        }
        await self.test_endpoint("POST", "/reports", data=report_data, 
                                description="Create report without auth (should fail with 401)")
        
        # Test 7: Try to access protected admin endpoints without auth
        await self.test_endpoint("GET", "/users", description="Get users without auth (should fail with 401)")
        await self.test_endpoint("POST", "/ai/analyze", 
                                description="Trigger AI analysis without auth (should fail with 401)")
        
        # Test 8: Session processing with mock data (will fail but shows endpoint exists)
        session_data = {"session_id": "test-session-id"}
        await self.test_endpoint("POST", "/auth/session", data=session_data,
                                description="Process auth session (will fail with invalid session)")
        
        print(f"\n📊 Test Summary:")
        print(f"Total tests: {len(self.test_results)}")
        
        successful_tests = [t for t in self.test_results if t["success"]]
        failed_tests = [t for t in self.test_results if not t["success"]]
        
        print(f"✅ Successful: {len(successful_tests)}")
        print(f"❌ Failed: {len(failed_tests)}")
        
        # Print detailed failures
        if failed_tests:
            print(f"\n🔍 Failed Test Details:")
            for test in failed_tests:
                print(f"  • {test['method']} {test['endpoint']} - Status: {test['status']}")
                if test['status'] == 401:
                    print(f"    → Expected auth failure ✓")
                elif test['status'] == 500:
                    print(f"    → Server error - needs investigation ⚠️") 
                else:
                    print(f"    → Response: {test['response'][:100]}...")
        
        # Print successes
        if successful_tests:
            print(f"\n✅ Successful Endpoints:")
            for test in successful_tests:
                print(f"  • {test['method']} {test['endpoint']} - {test['description']}")
                
        return len(successful_tests), len(failed_tests)

async def main():
    """Main test function"""
    tester = APITester()
    
    try:
        await tester.setup()
        success_count, failure_count = await tester.run_tests()
        
        print(f"\n🎯 Overall Result:")
        if failure_count == 0:
            print("🎉 All tests passed!")
            return 0
        else:
            expected_auth_failures = sum(1 for t in tester.test_results 
                                       if not t["success"] and t["status"] == 401)
            unexpected_failures = failure_count - expected_auth_failures
            
            if unexpected_failures == 0:
                print("🎉 All tests passed! (Auth failures are expected)")
                return 0
            else:  
                print(f"⚠️ {unexpected_failures} unexpected failures need attention")
                return 1
                
    except Exception as e:
        print(f"💥 Test suite failed: {e}")
        return 1
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
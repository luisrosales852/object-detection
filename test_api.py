#!/usr/bin/env python3
"""
Simple test script for the Object Detection API
"""
import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_available_classes():
    """Test the available classes endpoint"""
    print("\nTesting /available_classes endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/available_classes")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Total classes: {data.get('total_classes', 0)}")
        print("Sample classes:", data.get('classes', [])[:10])
        print("Sample categories:", list(data.get('categories', {}).keys())[:5])
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_detect_endpoint():
    """Test the detect endpoint with a sample request"""
    print("\nTesting /detect endpoint...")
    print("Note: This requires an actual image file to test properly.")
    
    # Example of how to test with an actual image:
    # with open("test_image.jpg", "rb") as f:
    #     files = {"file": f}
    #     data = {
    #         "objects": "car,person",
    #         "confidence": 0.5,
    #         "include_similar": True,
    #         "fallback_to_all": True
    #     }
    #     response = requests.post(f"{BASE_URL}/detect", files=files, data=data)
    #     print(f"Status: {response.status_code}")
    #     print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    print("To test this endpoint, run:")
    print('curl -X POST "http://localhost:8000/detect" \\')
    print('  -H "accept: application/json" \\')
    print('  -H "Content-Type: multipart/form-data" \\')
    print('  -F "file=@your_image.jpg" \\')
    print('  -F "objects=car,person" \\')
    print('  -F "confidence=0.5"')

def main():
    """Run all tests"""
    print("=== Object Detection API Test ===")
    print(f"Testing API at {BASE_URL}")
    print("Make sure the server is running with: python main.py\n")
    
    # Test endpoints
    health_ok = test_health()
    classes_ok = test_available_classes()
    test_detect_endpoint()
    
    print("\n=== Test Summary ===")
    print(f"Health endpoint: {'✓' if health_ok else '✗'}")
    print(f"Available classes endpoint: {'✓' if classes_ok else '✗'}")
    print("Detect endpoint: Manual test required")
    
    if health_ok and classes_ok:
        print("\n🎉 API is working! You can now integrate it with your frontend.")
    else:
        print("\n❌ Some tests failed. Check if the server is running and properly initialized.")

if __name__ == "__main__":
    main() 
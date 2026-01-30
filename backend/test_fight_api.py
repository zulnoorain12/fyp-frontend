"""
Test script for fight detection API endpoints.
This script demonstrates how to use the fight detection API.
"""

import requests
import json


def test_fight_api():
    """Test the fight detection API endpoints."""
    base_url = "http://localhost:8000"  # Adjust if your server runs on a different port
    
    # Test 1: Get available models
    print("Testing /models endpoint...")
    try:
        response = requests.get(f"{base_url}/models")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Switch to fight model
    print("\nTesting /models/switch endpoint...")
    try:
        response = requests.post(f"{base_url}/models/switch", data={"model_name": "fight"})
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Reset fight buffer
    print("\nTesting /fight/reset endpoint...")
    try:
        response = requests.post(f"{base_url}/fight/reset")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_fight_api()
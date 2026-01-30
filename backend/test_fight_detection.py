"""
Test script for fight detection service.
This script tests the basic functionality of the fight detection system.
"""

import cv2
import numpy as np
from services.fight_detection_service import FightDetectionService


def test_fight_detection():
    """Test the fight detection service with a sample frame."""
    # Initialize the fight detection service
    fight_service = FightDetectionService()
    
    # Load the model
    print("Loading fight detection model...")
    if fight_service.load_model():
        print("Model loaded successfully!")
    else:
        print("Failed to load model!")
        return
    
    # Create a sample frame (black image)
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Add some random shapes to simulate people
    # Person 1
    cv2.rectangle(frame, (100, 100), (200, 300), (255, 255, 255), -1)
    # Person 2
    cv2.rectangle(frame, (300, 150), (400, 350), (255, 255, 255), -1)
    
    print("Testing fight detection on sample frame...")
    
    # Test fight detection
    result = fight_service.detect_fight(frame)
    
    print(f"Detection result: {result}")
    
    # Clean up
    fight_service.cleanup()
    print("Test completed!")


if __name__ == "__main__":
    test_fight_detection()
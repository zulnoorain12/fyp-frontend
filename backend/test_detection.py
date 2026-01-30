import cv2
import numpy as np
from ultralytics import YOLO
import os

# Load models
print("Loading models...")
weapon_model = YOLO('models/weapon.pt')
fire_smoke_model = YOLO('models/fire_smoke.pt')
print("Models loaded successfully")

# Create a test image
print("Creating test image...")
img = np.zeros((480, 640, 3), dtype=np.uint8)
# Add some shapes to make it more interesting
cv2.rectangle(img, (100, 100), (200, 200), (255, 255, 255), -1)  # White rectangle
cv2.circle(img, (300, 300), 50, (128, 128, 128), -1)  # Gray circle

# Test weapon detection
print("Testing weapon detection...")
try:
    results = weapon_model(img)
    print(f"Weapon detection completed. Found {len(results)} result sets")
    for r in results:
        boxes = r.boxes
        print(f"Found {len(boxes)} boxes in result set")
        for box in boxes:
            conf = float(box.conf)
            cls = int(box.cls)
            class_name = weapon_model.names[cls]
            print(f"  Detected {class_name} with confidence {conf}")
except Exception as e:
    print(f"Weapon detection failed: {e}")

# Test fire/smoke detection
print("Testing fire/smoke detection...")
try:
    results = fire_smoke_model(img)
    print(f"Fire/Smoke detection completed. Found {len(results)} result sets")
    for r in results:
        boxes = r.boxes
        print(f"Found {len(boxes)} boxes in result set")
        for box in boxes:
            conf = float(box.conf)
            cls = int(box.cls)
            class_name = fire_smoke_model.names[cls]
            print(f"  Detected {class_name} with confidence {conf}")
except Exception as e:
    print(f"Fire/Smoke detection failed: {e}")

print("Test completed")
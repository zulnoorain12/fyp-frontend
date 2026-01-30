import cv2
import numpy as np
import requests

# Create a simple test image
img = np.zeros((480, 640, 3), dtype=np.uint8)
cv2.rectangle(img, (100, 100), (200, 200), (255, 255, 255), -1)  # White rectangle

# Save the image
cv2.imwrite('test_image.jpg', img)

# Send to detection API
with open('test_image.jpg', 'rb') as f:
    files = {'file': ('test_image.jpg', f, 'image/jpeg')}
    response = requests.post('http://localhost:8000/detect', files=files)
    print("Response:", response.json())
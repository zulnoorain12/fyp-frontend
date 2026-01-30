import sys
print("Python version:", sys.version)

try:
    import numpy
    print("NumPy version:", numpy.__version__)
except ImportError as e:
    print("Failed to import NumPy:", e)

try:
    import tensorflow as tf
    print("TensorFlow version:", tf.__version__)
except ImportError as e:
    print("Failed to import TensorFlow:", e)

try:
    import mediapipe as mp
    print("MediaPipe imported successfully")
except ImportError as e:
    print("Failed to import MediaPipe:", e)

try:
    from pose_estimation import PoseEstimation
    print("PoseEstimation imported successfully")
except ImportError as e:
    print("Failed to import PoseEstimation:", e)

try:
    from feature_extraction import FeatureExtraction
    print("FeatureExtraction imported successfully")
except ImportError as e:
    print("Failed to import FeatureExtraction:", e)

try:
    from services.fight_detection_service import FightDetectionService
    print("FightDetectionService imported successfully")
except ImportError as e:
    print("Failed to import FightDetectionService:", e)

print("Test completed.")
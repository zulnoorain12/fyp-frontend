import cv2
import numpy as np
import os
import logging
from typing import Dict, Any, Optional, List
import tensorflow as tf
from pose_estimation import PoseEstimation
from feature_extraction import FeatureExtraction


class FightDetectionService:
    """Handles fight detection using BlazePose + LSTM model."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.pose_estimator = PoseEstimation()
        self.feature_extractor = FeatureExtraction()
        self.model = None
        self.scaler_path = "models/scaler.pkl"
        self.model_path = "models/fight_detection_model.h5"
        self.is_loaded = False
    
    def load_model(self) -> bool:
        """
        Load the fight detection model.
        
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            if os.path.exists(self.model_path):
                self.model = tf.keras.models.load_model(self.model_path)
                self.logger.info(f"Fight detection model loaded from {self.model_path}")
                self.is_loaded = True
                return True
            else:
                self.logger.warning(f"Fight detection model not found at {self.model_path}")
                return False
        except Exception as e:
            self.logger.error(f"Error loading fight detection model: {e}")
            return False
    
    def detect_fight(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Detect fight in a video frame using BlazePose + LSTM.
        
        Args:
            frame: Input video frame as numpy array (BGR)
            
        Returns:
            Dictionary containing fight detection results
        """
        if not self.is_loaded or self.model is None:
            return {
                "success": False,
                "error": "Model not loaded"
            }
        
        try:
            # Extract pose keypoints
            keypoints = self.pose_estimator.extract_pose(frame)
            
            # If no pose detected, return no fight
            if keypoints is None:
                return {
                    "success": True,
                    "is_fight": False,
                    "fight_probability": 0.0,
                    "no_fight_probability": 1.0,
                    "confidence": 1.0,
                    "message": "No pose detected in frame"
                }
            
            # Add keypoints to feature extractor buffer
            self.feature_extractor.add_frame(keypoints)
            
            # Check if we have enough frames for prediction
            if self.feature_extractor.is_ready():
                # Get sequence
                sequence = self.feature_extractor.get_sequence()
                
                # Normalize sequence
                normalized_sequence = self.feature_extractor.normalize_sequence(
                    sequence, self.scaler_path
                )
                
                # Make prediction
                prediction = self.model.predict(normalized_sequence, verbose=0)
                
                # Handle different prediction shapes
                if len(prediction.shape) == 2 and prediction.shape[1] >= 2:
                    # Get confidence (probability of fight)
                    no_fight_probability = float(prediction[0][0])  # Assuming index 0 is no fight class
                    fight_probability = float(prediction[0][1])  # Assuming index 1 is fight class
                elif len(prediction.shape) == 2 and prediction.shape[1] == 1:
                    # Binary classification with single output
                    fight_probability = float(prediction[0][0])
                    no_fight_probability = 1.0 - fight_probability
                else:
                    # Unexpected prediction shape
                    self.logger.warning(f"Unexpected prediction shape: {prediction.shape}")
                    fight_probability = 0.0
                    no_fight_probability = 1.0
                
                # Reset buffer for next sequence
                self.feature_extractor.reset()
                
                return {
                    "success": True,
                    "is_fight": fight_probability > 0.5,
                    "fight_probability": fight_probability,
                    "no_fight_probability": no_fight_probability,
                    "confidence": max(fight_probability, no_fight_probability)
                }
            else:
                # Not enough frames yet
                return {
                    "success": True,
                    "is_fight": False,
                    "fight_probability": 0.0,
                    "no_fight_probability": 1.0,
                    "confidence": 1.0,
                    "message": "Not enough frames for prediction yet"
                }
                
        except Exception as e:
            self.logger.error(f"Error in fight detection: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_video_stream(self, video_source: str = 0) -> None:
        """
        Process a video stream for real-time fight detection.
        
        Args:
            video_source: Video source (camera index or video file path)
        """
        cap = cv2.VideoCapture(video_source)
        
        if not cap.isOpened():
            self.logger.error("Error opening video source")
            return
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Detect fight in frame
            result = self.detect_fight(frame)
            
            # Draw results on frame
            if result["success"]:
                if result.get("is_fight", False):
                    label = f"FIGHT DETECTED: {result['fight_probability']:.2f}"
                    color = (0, 0, 255)  # Red
                else:
                    label = f"No Fight: {result['no_fight_probability']:.2f}"
                    color = (0, 255, 0)  # Green
                
                cv2.putText(frame, label, (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            
            # Display frame
            cv2.imshow('Fight Detection', frame)
            
            # Break on 'q' key press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
    
    def reset_buffer(self):
        """Reset the feature extraction buffer."""
        self.feature_extractor.reset()
    
    def cleanup(self):
        """Clean up resources."""
        try:
            if self.pose_estimator:
                self.pose_estimator.release()
        except Exception as e:
            self.logger.error(f"Error cleaning up pose estimator: {e}")
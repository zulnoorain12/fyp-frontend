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
    
    def _get_pose_bounding_box(self, keypoints: np.ndarray, frame_h: int, frame_w: int) -> Dict[str, int]:
        """
        Derive a bounding box from the 132-dimensional pose keypoints.
        Each landmark has 4 values: x, y, z, visibility.
        x and y are normalized [0, 1] relative to frame dimensions.
        """
        xs = []
        ys = []
        for i in range(33):  # 33 landmarks
            x = keypoints[i * 4]       # normalized x
            y = keypoints[i * 4 + 1]   # normalized y
            vis = keypoints[i * 4 + 3] # visibility
            if vis > 0.3:  # only use visible landmarks
                xs.append(x)
                ys.append(y)
        
        if not xs or not ys:
            return {"x1": 0, "y1": 0, "x2": frame_w, "y2": frame_h}
        
        # Convert normalized coords to pixel coords with padding
        pad_x = 0.05  # 5% padding
        pad_y = 0.05
        x1 = int(max(0, (min(xs) - pad_x)) * frame_w)
        y1 = int(max(0, (min(ys) - pad_y)) * frame_h)
        x2 = int(min(1, (max(xs) + pad_x)) * frame_w)
        y2 = int(min(1, (max(ys) + pad_y)) * frame_h)
        
        return {"x1": x1, "y1": y1, "x2": x2, "y2": y2}

    def _draw_fight_annotations(self, frame: np.ndarray, box: Dict[str, int], 
                                 fight_probability: float, is_fight: bool) -> np.ndarray:
        """
        Draw bounding box, label, and pose skeleton on the frame.
        """
        annotated = frame.copy()
        
        # Draw pose skeleton
        annotated = self.pose_estimator.draw_pose(annotated)
        
        if is_fight:
            # Red box and label for fight
            color = (0, 0, 255)
            label = f"FIGHT DETECTED {fight_probability*100:.1f}%"
        else:
            # Green box and label for no fight
            color = (0, 255, 0)
            label = f"No Fight {(1-fight_probability)*100:.1f}%"
        
        # Draw bounding box
        cv2.rectangle(annotated, (box["x1"], box["y1"]), (box["x2"], box["y2"]), color, 3)
        
        # Draw label background
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.8
        thickness = 2
        (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)
        label_y = max(box["y1"] - 10, text_h + 10)
        cv2.rectangle(annotated, 
                      (box["x1"], label_y - text_h - 10), 
                      (box["x1"] + text_w + 10, label_y + baseline), 
                      color, -1)
        cv2.putText(annotated, label, (box["x1"] + 5, label_y - 5), 
                    font, font_scale, (255, 255, 255), thickness)
        
        return annotated

    def detect_fight(self, frame: np.ndarray, force_predict: bool = False) -> Dict[str, Any]:
        """
        Detect fight in a video frame using BlazePose + LSTM.
        
        Args:
            frame: Input video frame as numpy array (BGR)
            force_predict: If True, pad the buffer to make a prediction even with fewer than 30 frames.
                           Useful for single-image uploads or when immediate results are needed.
            
        Returns:
            Dictionary containing fight detection results, annotated frame, and bounding box
        """
        if not self.is_loaded or self.model is None:
            return {
                "success": False,
                "error": "Model not loaded"
            }
        
        try:
            h, w = frame.shape[:2]
            
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
                    "message": "No pose detected in frame",
                    "annotated_frame": None,
                    "box": None
                }
            
            # Derive bounding box from pose keypoints
            box = self._get_pose_bounding_box(keypoints, h, w)
            
            # Add keypoints to feature extractor buffer
            self.feature_extractor.add_frame(keypoints)
            
            # Check if we have enough frames for prediction OR if force_predict is enabled
            buffer_ready = self.feature_extractor.is_ready()
            buffer_len = len(self.feature_extractor.frame_buffer)
            
            if buffer_ready or (force_predict and buffer_len > 0):
                # Get sequence
                sequence = self.feature_extractor.get_sequence()
                
                # If we don't have 30 frames yet, pad the sequence by repeating existing frames
                if not buffer_ready and force_predict:
                    seq_len = self.feature_extractor.sequence_length
                    current_len = sequence.shape[0]
                    if current_len < seq_len:
                        # Repeat the existing frames to fill the sequence
                        repeats = int(np.ceil(seq_len / current_len))
                        padded = np.tile(sequence, (repeats, 1))[:seq_len]
                        sequence = padded
                        self.logger.info(f"Padded sequence from {current_len} to {seq_len} frames for prediction")
                
                # Normalize sequence
                normalized_sequence = self.feature_extractor.normalize_sequence(
                    sequence, self.scaler_path
                )
                
                # Reshape for LSTM input: (1, sequence_length, features)
                if len(normalized_sequence.shape) == 2:
                    normalized_sequence = normalized_sequence.reshape(1, normalized_sequence.shape[0], normalized_sequence.shape[1])
                
                # Make prediction
                prediction = self.model.predict(normalized_sequence, verbose=0)
                
                # Handle different prediction shapes
                if len(prediction.shape) == 2 and prediction.shape[1] >= 2:
                    no_fight_probability = float(prediction[0][0])
                    fight_probability = float(prediction[0][1])
                elif len(prediction.shape) == 2 and prediction.shape[1] == 1:
                    fight_probability = float(prediction[0][0])
                    no_fight_probability = 1.0 - fight_probability
                else:
                    self.logger.warning(f"Unexpected prediction shape: {prediction.shape}")
                    fight_probability = 0.0
                    no_fight_probability = 1.0
                
                is_fight = fight_probability > 0.5
                
                # Draw annotations on frame
                annotated_frame = self._draw_fight_annotations(frame, box, fight_probability, is_fight)
                
                # Use sliding window: don't fully reset, just remove oldest frames
                if buffer_ready:
                    half = self.feature_extractor.sequence_length // 2
                    remaining = list(self.feature_extractor.frame_buffer)
                    self.feature_extractor.reset()
                    for f in remaining[half:]:
                        self.feature_extractor.add_frame(f)
                else:
                    pass
                
                return {
                    "success": True,
                    "is_fight": is_fight,
                    "fight_probability": fight_probability,
                    "no_fight_probability": no_fight_probability,
                    "confidence": max(fight_probability, no_fight_probability),
                    "annotated_frame": annotated_frame,
                    "box": box
                }
            else:
                # Not enough frames yet — still draw pose skeleton and box
                annotated_frame = self._draw_fight_annotations(frame, box, 0.0, False)
                
                return {
                    "success": True,
                    "is_fight": False,
                    "fight_probability": 0.0,
                    "no_fight_probability": 1.0,
                    "confidence": 1.0,
                    "message": f"Buffering frames for prediction ({buffer_len}/{self.feature_extractor.sequence_length})",
                    "annotated_frame": annotated_frame,
                    "box": box
                }
                
        except Exception as e:
            self.logger.error(f"Error in fight detection: {e}", exc_info=True)
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
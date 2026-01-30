import cv2
import numpy as np
import os
from ultralytics import YOLO
from typing import List, Dict, Any, Optional, Tuple
import base64
import logging

class DetectionService:
    """Handles object detection using YOLO models."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
        # Add max detections to prevent overload
        self.max_detections = int(os.getenv("MAX_DETECTIONS", "10"))
    
    def detect_objects(self, model: YOLO, image: np.ndarray) -> Dict[str, Any]:
        """
        Run object detection on an image.
        
        Args:
            model: YOLO model to use for detection
            image: Input image as numpy array
            
        Returns:
            Dictionary containing detections and processed image
        """
        try:
            self.logger.info(f"Running detection with model: {type(model)}")
            
            # Check if image is valid
            if image is None:
                self.logger.error("Input image is None")
                return {
                    "detections": [],
                    "success": False,
                    "error": "Input image is None"
                }
            
            # Check if image has valid dimensions
            if len(image.shape) != 3 or image.shape[2] != 3:
                self.logger.error(f"Invalid image dimensions: {image.shape}")
                return {
                    "detections": [],
                    "success": False,
                    "error": f"Invalid image dimensions: {image.shape}. Expected 3-channel image."
                }
            
            self.logger.info(f"Image shape: {image.shape}")
            
            # Run object detection with optimized settings
            results = model(image, verbose=False)  # Disable verbose output
            
            self.logger.info(f"Detection completed, processing results")
            
            # Process results
            detections = []
            detection_count = 0
            
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    # Limit number of detections
                    if detection_count >= self.max_detections:
                        self.logger.info(f"Reached max detections limit: {self.max_detections}")
                        break
                        
                    confidence = float(box.conf)
                    if confidence < self.confidence_threshold:
                        continue
                        
                    b = box.xyxy[0].tolist()  # get box coordinates
                    c = box.cls
                    class_name = model.names[int(c)]
                    
                    self.logger.info(f"Detected {class_name} with confidence {confidence}")
                    
                    detections.append({
                        "class": class_name,
                        "confidence": confidence,
                        "box": {
                            "x1": int(b[0]),
                            "y1": int(b[1]),
                            "x2": int(b[2]),
                            "y2": int(b[3])
                        }
                    })
                    
                    detection_count += 1
            
            self.logger.info(f"Total detections found: {len(detections)}")
            return {
                "detections": detections,
                "success": True
            }
        except Exception as e:
            self.logger.error(f"Error in object detection: {e}", exc_info=True)
            return {
                "detections": [],
                "success": False,
                "error": str(e)
            }
    
    def draw_detections(self, image: np.ndarray, detections: List[Dict], color: Tuple[int, int, int] = (0, 255, 0)) -> np.ndarray:
        """
        Draw bounding boxes on image.
        
        Args:
            image: Input image
            detections: List of detection results
            color: BGR color tuple for bounding boxes
            
        Returns:
            Image with drawn bounding boxes
        """
        try:
            # Check if image is valid
            if image is None:
                self.logger.error("Input image is None in draw_detections")
                return image
                
            image_copy = image.copy()
            
            for detection in detections:
                box = detection["box"]
                class_name = detection["class"]
                confidence = detection["confidence"]
                
                # Draw bounding box
                cv2.rectangle(
                    image_copy, 
                    (box["x1"], box["y1"]), 
                    (box["x2"], box["y2"]), 
                    color, 
                    2
                )
                
                # Draw label with smaller font for better performance
                label = f"{class_name} {confidence:.2f}"
                cv2.putText(
                    image_copy, 
                    label, 
                    (box["x1"], box["y1"] - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    0.6,  # Smaller font
                    color, 
                    1     # Thinner line
                )
            
            return image_copy
        except Exception as e:
            self.logger.error(f"Error drawing detections: {e}")
            return image
    
    def process_frame_with_dual_models(self, weapon_model: YOLO, fire_smoke_model: YOLO, image: np.ndarray) -> Dict[str, Any]:
        """
        Process frame with both models.
        
        Args:
            weapon_model: Weapon detection model
            fire_smoke_model: Fire/smoke detection model
            image: Input image
            
        Returns:
            Dictionary containing detections from both models
        """
        try:
            self.logger.info("Starting dual model detection")
            
            # Check if image is valid
            if image is None:
                self.logger.error("Input image is None in dual model detection")
                return {
                    "weapon_detections": [],
                    "fire_smoke_detections": [],
                    "success": False,
                    "error": "Input image is None"
                }
            
            # Check if image has valid dimensions
            if len(image.shape) != 3 or image.shape[2] != 3:
                self.logger.error(f"Invalid image dimensions in dual model detection: {image.shape}")
                return {
                    "weapon_detections": [],
                    "fire_smoke_detections": [],
                    "success": False,
                    "error": f"Invalid image dimensions: {image.shape}. Expected 3-channel image."
                }
            
            # Run detection with both models
            self.logger.info("Running weapon detection")
            weapon_results = self.detect_objects(weapon_model, image)
            
            self.logger.info("Running fire/smoke detection")
            fire_smoke_results = self.detect_objects(fire_smoke_model, image)
            
            self.logger.info(f"Weapon results: {weapon_results['success']}, Fire/Smoke results: {fire_smoke_results['success']}")
            
            return {
                "weapon_detections": weapon_results["detections"],
                "fire_smoke_detections": fire_smoke_results["detections"],
                "success": True
            }
        except Exception as e:
            self.logger.error(f"Error in dual model detection: {e}", exc_info=True)
            return {
                "weapon_detections": [],
                "fire_smoke_detections": [],
                "success": False,
                "error": str(e)
            }
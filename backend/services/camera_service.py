import cv2
import asyncio
import threading
import time
from typing import Optional, Callable, Dict, Any
import logging
import os
import base64
from datetime import datetime
from .detection_service import DetectionService
from .model_manager import ModelManager
from ultralytics import YOLO
import numpy as np

class CameraService:
    """Handles camera feed and real-time object detection."""
    
    def __init__(self, model_manager: ModelManager, detection_service: DetectionService):
        self.model_manager = model_manager
        self.detection_service = detection_service
        self.camera: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.camera_index = int(os.getenv("CAMERA_INDEX", "0"))
        self.frame_skip = int(os.getenv("FRAME_SKIP", "3"))  # Process every Nth frame
        self.clients = set()
        self.logger = logging.getLogger(__name__)
        self.fps = 0.0
        self.frame_count = 0
        self.start_time = time.time()
    
    def start_camera(self, model_name: str = "weapon") -> Dict[str, Any]:
        """
        Start the camera feed.
        
        Args:
            model_name: Model to use for detection ("weapon", "fire_smoke", or "both")
            
        Returns:
            Dictionary with status information
        """
        try:
            if self.is_running:
                return {"success": False, "message": "Camera already running"}
            
            # Set model
            if model_name in ["weapon", "fire_smoke", "both"]:
                self.model_manager.current_model = model_name
            else:
                return {"success": False, "message": "Invalid model name"}
            
            # Initialize camera
            self.camera = cv2.VideoCapture(self.camera_index)
            if not self.camera.isOpened():
                return {"success": False, "message": "Could not open camera"}
            
            self.is_running = True
            self.frame_count = 0
            self.start_time = time.time()
            
            # Start camera loop in a separate thread
            self.camera_thread = threading.Thread(target=self._camera_loop, daemon=True)
            self.camera_thread.start()
            
            return {"success": True, "message": f"Camera started with {model_name} model"}
        except Exception as e:
            self.logger.error(f"Error starting camera: {e}")
            return {"success": False, "message": str(e)}
    
    def stop_camera(self) -> Dict[str, Any]:
        """Stop the camera feed."""
        try:
            if not self.is_running:
                return {"success": False, "message": "Camera not running"}
            
            self.is_running = False
            
            # Release camera
            if self.camera:
                self.camera.release()
                self.camera = None
            
            return {"success": True, "message": "Camera stopped"}
        except Exception as e:
            self.logger.error(f"Error stopping camera: {e}")
            return {"success": False, "message": str(e)}
    
    def _camera_loop(self):
        """Main camera loop running in separate thread."""
        frame_counter = 0
        
        while self.is_running:
            try:
                if not self.camera:
                    break
                
                ret, frame = self.camera.read()
                if not ret:
                    self.logger.warning("Could not read frame from camera")
                    continue
                
                frame_counter += 1
                
                # Skip frames for performance
                if frame_counter % self.frame_skip != 0:
                    continue
                
                # Update FPS
                self._update_fps()
                
                # Process frame if needed
                processed_frame = frame.copy()
                detection_data = {}
                
                # Run detection based on current model
                current_model = self.model_manager.current_model
                
                if current_model == "both":
                    # Use both models
                    if self.model_manager.weapon_model and self.model_manager.fire_smoke_model:
                        results = self.detection_service.process_frame_with_dual_models(
                            self.model_manager.weapon_model,
                            self.model_manager.fire_smoke_model,
                            frame
                        )
                        
                        if results["success"]:
                            # Draw weapon detections (red)
                            processed_frame = self.detection_service.draw_detections(
                                processed_frame, 
                                results["weapon_detections"], 
                                (0, 0, 255)  # Red
                            )
                            # Draw fire/smoke detections (blue)
                            processed_frame = self.detection_service.draw_detections(
                                processed_frame, 
                                results["fire_smoke_detections"], 
                                (255, 0, 0)  # Blue
                            )
                            
                            detection_data = {
                                "weapon_detections": results["weapon_detections"],
                                "fire_smoke_detections": results["fire_smoke_detections"]
                            }
                else:
                    # Use single model
                    model = self.model_manager.get_current_model()
                    if model:
                        results = self.detection_service.detect_objects(model, frame)
                        if results["success"]:
                            # Draw detections (green for single model)
                            processed_frame = self.detection_service.draw_detections(
                                processed_frame, 
                                results["detections"], 
                                (0, 255, 0)  # Green
                            )
                            
                            detection_data = {
                                "detections": results["detections"]
                            }
                
                # Encode frame to JPEG
                _, buffer = cv2.imencode('.jpg', processed_frame)
                frame_base64 = buffer.tobytes()
                
                # Send to all connected clients
                # Note: This is running in a thread, so we can't directly await
                # In a real implementation, you'd want to use a queue or similar
                pass
                
                # Small delay to prevent excessive CPU usage
                time.sleep(0.01)
                
            except Exception as e:
                self.logger.error(f"Error in camera loop: {e}")
                time.sleep(0.1)  # Prevent rapid error loops
    
    def _update_fps(self):
        """Update FPS counter."""
        self.frame_count += 1
        elapsed = time.time() - self.start_time
        if elapsed >= 1.0:  # Update every second
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.start_time = time.time()
    
    def _send_frame_to_clients(self, frame_data: bytes, detection_data: Dict):
        """
        Send frame data to all connected clients.
        This is a placeholder - actual implementation would depend on WebSocket setup.
        """
        # In a real implementation, you would send the frame data to connected WebSocket clients
        # For now, we'll just log that a frame was processed
        self.logger.debug(f"Processed frame with {len(detection_data)} detections")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current camera status."""
        return {
            "running": self.is_running,
            "model": self.model_manager.current_model,
            "fps": round(self.fps, 2),
            "camera_index": self.camera_index
        }
    
    def add_client(self, client_id: str):
        """Add a client to the broadcast list."""
        self.clients.add(client_id)
    
    def remove_client(self, client_id: str):
        """Remove a client from the broadcast list."""
        self.clients.discard(client_id)
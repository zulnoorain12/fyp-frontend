import json
import os
from typing import Dict, Any, List
from datetime import datetime
import logging


class LoggingService:
    """Handles detection logging to file."""
    
    def __init__(self, log_file: str = "detection_logs.json", camera_id: str = "CAM_001"):
        self.log_file = log_file
        self.logger = logging.getLogger(__name__)
    
    def log_detection(self, model_used: str, detections: List[Dict], timestamp: str | None = None) -> bool:
        """
        Log detection results to file.
        
        Args:
            model_used: Name of the model used
            detections: List of detection results
            timestamp: Optional timestamp (defaults to current time)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if timestamp is None:
                timestamp = datetime.now().isoformat()
            
            log_entry = {
                "timestamp": timestamp,
                "model": model_used,
                "detections": detections
            }
            
            # Save to JSON file
            logs = []
            if os.path.exists(self.log_file):
                try:
                    with open(self.log_file, "r") as f:
                        logs = json.load(f)
                except (json.JSONDecodeError, IOError) as e:
                    self.logger.warning(f"Could not read existing log file: {e}")
            
            logs.append(log_entry)
            
            with open(self.log_file, "w") as f:
                json.dump(logs, f, indent=2)
                
            return True
        except Exception as e:
            self.logger.error(f"Error logging detection: {e}")
            return False
    
    def get_recent_detections(self, limit: int = 50) -> List[Dict]:
        """
        Get recent detection logs.
        
        Args:
            limit: Maximum number of entries to return
            
        Returns:
            List of recent detection logs
        """
        try:
            if os.path.exists(self.log_file):
                with open(self.log_file, "r") as f:
                    logs = json.load(f)
                return logs[-limit:] if len(logs) > limit else logs
            return []
        except Exception as e:
            self.logger.error(f"Error reading detection logs: {e}")
            return []


# ============================================================
# USAGE EXAMPLE
# ============================================================

if __name__ == "__main__":
    # Initialize logging service
    logging_service = LoggingService(
        log_file="detection_logs.json",
        camera_id="CAM_001"
    )
    
    # Example 1: Log weapon detection
    weapon_detections = [
        {
            "class": "weapon",
            "confidence": 0.87,
            "box": {"x1": 100, "y1": 150, "x2": 200, "y2": 300}
        }
    ]
    logging_service.log_detection("weapon", weapon_detections)
    
    # Example 2: Log fire detection
    fire_detections = [
        {
            "class": "fire",
            "confidence": 0.92,
            "box": {"x1": 300, "y1": 200, "x2": 450, "y2": 400}
        },
        {
            "class": "smoke",
            "confidence": 0.65,
            "box": {"x1": 250, "y1": 100, "x2": 350, "y2": 250}
        }
    ]
    logging_service.log_detection("fire_smoke", fire_detections)
    
    print("\n✅ Test complete!")
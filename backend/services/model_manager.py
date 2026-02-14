import os
from ultralytics import YOLO
from typing import Optional, Dict, Any
import logging
import tensorflow as tf

class ModelManager:
    """Manages YOLO and TensorFlow model loading and switching."""
    
    def __init__(self):
        self.weapon_model: Optional[YOLO] = None
        self.fire_smoke_model: Optional[YOLO] = None
        self.fight_model: Optional[tf.keras.Model] = None
        self.current_model: str = "weapon"
        self.logger = logging.getLogger(__name__)
    
    def load_models(self) -> Dict[str, Any]:
        """Load all configured models from disk."""
        try:
            weapon_model_path = os.getenv("MODEL_WEAPON_PATH", "models/weapon.pt")
            fire_smoke_model_path = os.getenv("MODEL_FIRE_SMOKE_PATH", "models/fire_smoke.pt")
            fight_model_path = os.getenv("MODEL_FIGHT_PATH", "models/fight_detection_model.h5")
            
            # Debug information
            self.logger.info(f"Current working directory: {os.getcwd()}")
            self.logger.info(f"Looking for weapon model at: {weapon_model_path}")
            self.logger.info(f"Looking for fire/smoke model at: {fire_smoke_model_path}")
            self.logger.info(f"Looking for fight model at: {fight_model_path}")
            self.logger.info(f"Full path for weapon model: {os.path.abspath(weapon_model_path)}")
            self.logger.info(f"Full path for fire/smoke model: {os.path.abspath(fire_smoke_model_path)}")
            self.logger.info(f"Full path for fight model: {os.path.abspath(fight_model_path)}")
            self.logger.info(f"Weapon model exists: {os.path.exists(weapon_model_path)}")
            self.logger.info(f"Fire/smoke model exists: {os.path.exists(fire_smoke_model_path)}")
            self.logger.info(f"Fight model exists: {os.path.exists(fight_model_path)}")
            
            # Load weapon model
            if os.path.exists(weapon_model_path):
                try:
                    self.weapon_model = YOLO(weapon_model_path)
                    self.logger.info(f"Weapon model loaded successfully from {weapon_model_path}")
                    self.logger.info(f"Weapon model class names: {self.weapon_model.names}")
                except Exception as e:
                    self.logger.error(f"Failed to load weapon model from {weapon_model_path}: {e}")
                    self.weapon_model = None
            else:
                self.logger.warning(f"Weapon model not found at {weapon_model_path}")
                
            # Load fire/smoke model
            if os.path.exists(fire_smoke_model_path):
                try:
                    self.fire_smoke_model = YOLO(fire_smoke_model_path)
                    self.logger.info(f"Fire/Smoke model loaded successfully from {fire_smoke_model_path}")
                    self.logger.info(f"Fire/Smoke model class names: {self.fire_smoke_model.names}")
                except Exception as e:
                    self.logger.error(f"Failed to load fire/smoke model from {fire_smoke_model_path}: {e}")
                    self.fire_smoke_model = None
            else:
                self.logger.warning(f"Fire/Smoke model not found at {fire_smoke_model_path}")
                
            # Load fight detection model
            if os.path.exists(fight_model_path):
                try:
                    self.fight_model = tf.keras.models.load_model(fight_model_path)
                    self.logger.info(f"Fight detection model loaded successfully from {fight_model_path}")
                except Exception as e:
                    self.logger.error(f"Failed to load fight detection model from {fight_model_path}: {e}")
                    self.fight_model = None
            else:
                self.logger.warning(f"Fight detection model not found at {fight_model_path}")
                
            result = {
                "weapon_loaded": self.weapon_model is not None,
                "fire_smoke_loaded": self.fire_smoke_model is not None,
                "fight_loaded": self.fight_model is not None
            }
            
            self.logger.info(f"Model loading result: {result}")
            return result
        except Exception as e:
            self.logger.error(f"Error loading models: {e}")
            return {
                "weapon_loaded": False,
                "fire_smoke_loaded": False,
                "fight_loaded": False,
                "error": str(e)
            }
    
    def get_current_model(self) -> Optional[object]:
        """Get the currently selected model."""
        if self.current_model == "weapon" and self.weapon_model:
            return self.weapon_model
        elif self.current_model == "fire_smoke" and self.fire_smoke_model:
            return self.fire_smoke_model
        elif self.current_model == "fight" and self.fight_model:
            return self.fight_model
        # For "both" mode, we don't return a single model
        # The camera service handles this case separately
        return None
    
    def get_model(self, model_name: str) -> Optional[object]:
        """Get a specific model by name."""
        if model_name == "weapon":
            return self.weapon_model
        elif model_name == "fire_smoke":
            return self.fire_smoke_model
        elif model_name == "fight":
            return self.fight_model
        return None
    
    def models_loaded(self) -> bool:
        """Check if any models are loaded."""
        return (self.weapon_model is not None or 
                self.fire_smoke_model is not None or 
                self.fight_model is not None)
    
    def switch_model(self, model_name: str) -> bool:
        """Switch to a different model."""
        if model_name in ["weapon", "fire_smoke", "fight", "both"]:
            self.current_model = model_name
            self.logger.info(f"Switched to model: {model_name}")
            return True
        self.logger.warning(f"Invalid model name: {model_name}")
        return False
    
    def get_available_models(self) -> list:
        """Get list of available models."""
        models = []
        if self.weapon_model:
            models.append("weapon")
        if self.fire_smoke_model:
            models.append("fire_smoke")
        if self.fight_model:
            models.append("fight")
        # Add "both" option if both weapon and fire_smoke models are available
        if self.weapon_model and self.fire_smoke_model:
            models.append("both")
        self.logger.info(f"Available models: {models}")
        return models
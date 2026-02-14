import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import os
from dotenv import load_dotenv
import json
from datetime import datetime
import base64
import logging

# Import our services
from services.model_manager import ModelManager
from services.detection_service import DetectionService
from services.database_manager import DatabaseManager
from services.fight_detection_service import FightDetectionService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(title="YOLO Object Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
model_manager = ModelManager()
detection_service = DetectionService()
database_manager = DatabaseManager()
fight_detection_service = FightDetectionService()

# Global variable for current model
current_model = "weapon"

# Load models on startup
@app.on_event("startup")
async def load_models():
    # Load ML models
    result = model_manager.load_models()
    if not result.get("weapon_loaded") and not result.get("fire_smoke_loaded"):
        logger.error("No models loaded successfully")
    else:
        logger.info("Models loaded successfully")
        global current_model
        current_model = model_manager.current_model
    
    # Load fight detection model
    if fight_detection_service.load_model():
        logger.info("Fight detection model loaded successfully")
    else:
        logger.warning("Failed to load fight detection model")
    
    # Connect to database
    if database_manager.connect():
        logger.info("Database connected successfully")
    else:
        logger.error("Failed to connect to database")

@app.on_event("shutdown")
async def shutdown_event():
    # Clean up fight detection service
    fight_detection_service.cleanup()
    
    # Disconnect from database
    database_manager.disconnect()

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "YOLO Object Detection API is running"
    }

# Get available models
@app.get("/models")
async def get_models():
    return {
        "models": model_manager.get_available_models(),
        "current_model": model_manager.current_model
    }

# Switch between models
@app.post("/models/switch")
async def switch_model(model_name: str = Form(...)):
    if model_manager.switch_model(model_name):
        return {"message": f"Switched to {model_name} model", "current_model": model_name}
    else:
        return {"error": "Invalid model name. Use 'weapon', 'fire_smoke', 'fight', or 'both'"}

# Reset fight detection buffer
@app.post("/fight/reset")
async def reset_fight_buffer():
    fight_detection_service.reset_buffer()
    return {"message": "Fight detection buffer reset successfully"}

# Detect fight in video
@app.post("/detect/fight")
async def detect_fight(file: UploadFile = File(...)):
    try:
        # Read video file with size limit
        contents = await file.read()
        
        # Limit file size to prevent overload (10MB max)
        if len(contents) > 10 * 1024 * 1024:
            return {"error": "File too large. Maximum size is 10MB."}
        
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Check if frame was decoded successfully
        if frame is None:
            return {"error": "Invalid video frame. Please upload a valid image file (JPEG, PNG, etc.)."}
        
        # Run fight detection
        fight_result = fight_detection_service.detect_fight(frame)
        
        if not fight_result["success"]:
            return {"error": "Fight detection failed", "details": fight_result.get("error")}
        
        # Save fight detection to database
        if fight_result.get("is_fight", False):
            detection_id = database_manager.save_detection(
                detection_type="fight",
                confidence=fight_result["fight_probability"]
            )
            
            # Save alert if detection_id was successfully created
            if detection_id:
                # Determine severity based on confidence
                confidence = fight_result["fight_probability"]
                if confidence >= 0.8:
                    severity = "high"
                elif confidence >= 0.6:
                    severity = "medium"
                else:
                    severity = "low"
                
                database_manager.save_alert(
                    detection_id=detection_id,
                    severity=severity
                )
        
        return fight_result
    except Exception as e:
        logger.error(f"Error in fight detection: {e}")
        return {"error": "Fight detection failed", "details": str(e)}

# Detect fight in video stream (sequence of frames)
@app.post("/detect/fight/stream")
async def detect_fight_stream(file: UploadFile = File(...)):
    # For streaming detection, we'll process each frame individually
    # In a real implementation, you might want to handle this differently
    # This is a simplified version that processes a single frame
    
    # Read video file
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Check if frame was decoded successfully
    if frame is None:
        return {"error": "Invalid video frame. Please upload a valid image file (JPEG, PNG, etc.)."}
    
    # Run fight detection
    fight_result = fight_detection_service.detect_fight(frame)
    
    # For streaming, we might want to keep the buffer alive between calls
    # But for this API endpoint, we'll return the result directly
    
    if not fight_result["success"]:
        return {"error": "Fight detection failed", "details": fight_result.get("error")}
    
    # Save fight detection to database (only if fight detected)
    if fight_result.get("is_fight", False):
        detection_id = database_manager.save_detection(
            detection_type="fight",
            confidence=fight_result["fight_probability"]
        )
        
        # Save alert if detection_id was successfully created
        if detection_id:
            # Determine severity based on confidence
            confidence = fight_result["fight_probability"]
            if confidence >= 0.8:
                severity = "high"
            elif confidence >= 0.6:
                severity = "medium"
            else:
                severity = "low"
            
            database_manager.save_alert(
                detection_id=detection_id,
                severity=severity
            )
    
    return fight_result

# Detect objects in an image
@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    camera_id: str = Form("default")  # NEW: Optional camera ID
):
    global current_model
    
    logger.info(f"Detecting objects with current model: {model_manager.current_model}")
    
    # Select model based on current selection
    model = model_manager.get_current_model()
    if model is None:
        # Handle "both" case - this endpoint is not meant for dual model processing
        if model_manager.current_model == "both":
            logger.warning("Attempted to use single model endpoint for 'both' mode")
            return {"error": "Use /detect/both endpoint for dual model detection"}
        logger.error("No model loaded for detection")
        return {"error": "Model not loaded"}
    
    try:
        # Read image file with size limit
        contents = await file.read()
        logger.info(f"Received file of size: {len(contents)} bytes")
        
        # Limit file size to prevent overload (10MB max)
        if len(contents) > 10 * 1024 * 1024:
            logger.warning("File too large")
            return {"error": "File too large. Maximum size is 10MB."}
        
        # Check if contents are valid
        if not contents:
            logger.error("Empty file received")
            return {"error": "Empty file received"}
        
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Check if image was decoded successfully
        if img is None:
            logger.error("Failed to decode image")
            return {"error": "Invalid image file. Please upload a valid image file (JPEG, PNG, etc.)."}
        
        logger.info(f"Decoded image shape: {img.shape}")
        
        # Run object detection using detection service with optimized settings
        detection_result = detection_service.detect_objects(model, img)
        
        if not detection_result["success"]:
            logger.error(f"Detection failed: {detection_result.get('error')}")
            return {"error": "Detection failed", "details": detection_result.get("error")}
        
        detections = detection_result["detections"]
        logger.info(f"Found {len(detections)} detections")
        
        # Draw bounding boxes using detection service
        processed_img = detection_service.draw_detections(img, detections)
        logger.info(f"Processed image shape: {processed_img.shape}")
        
        # Save detections to database
        for detection in detections:
            # Determine severity based on confidence
            confidence = detection["confidence"]
            if confidence >= 0.8:
                severity = "high"
            elif confidence >= 0.6:
                severity = "medium"
            else:
                severity = "low"
            
            # Save detection to database
            detection_id = database_manager.save_detection(
                detection_type=detection["class"],
                confidence=confidence
            )
            
            # Save alert if detection_id was successfully created
            if detection_id:
                database_manager.save_alert(
                    detection_id=detection_id,
                    severity=severity
                )
        
        # Convert image back to bytes with compression
        _, buffer = cv2.imencode('.jpg', processed_img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        img_bytes = buffer.tobytes()
        
        logger.info(f"Encoded image size: {len(img_bytes)} bytes")
        
        return {
            "detections": detections,
            "image": base64.b64encode(img_bytes).decode('utf-8'),
            "model_used": model_manager.current_model
        }
    except Exception as e:
        logger.error(f"Error in object detection: {e}", exc_info=True)
        return {"error": "Detection failed", "details": str(e)}

# Detect with both models
@app.post("/detect/both")
async def detect_both_models(
    file: UploadFile = File(...),
    camera_id: str = Form("default")  # NEW: Optional camera ID
):
    logger.info("Detecting with both models")
    
    if not model_manager.models_loaded():
        logger.error("No models loaded")
        return {"error": "One or both models not loaded"}
    
    # Check specifically for both models
    weapon_model = model_manager.get_model("weapon")
    fire_smoke_model = model_manager.get_model("fire_smoke")
    
    if weapon_model is None or fire_smoke_model is None:
        logger.error(f"Weapon model loaded: {weapon_model is not None}, Fire/Smoke model loaded: {fire_smoke_model is not None}")
        return {"error": "Both weapon and fire/smoke models must be loaded for dual detection"}
    
    try:
        # Read image file with size limit
        contents = await file.read()
        logger.info(f"Received file of size: {len(contents)} bytes")
        
        # Limit file size to prevent overload (10MB max)
        if len(contents) > 10 * 1024 * 1024:
            logger.warning("File too large for dual model detection")
            return {"error": "File too large. Maximum size is 10MB."}
        
        # Check if contents are valid
        if not contents:
            logger.error("Empty file received for dual model detection")
            return {"error": "Empty file received"}
        
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Check if image was decoded successfully
        if img is None:
            logger.error("Failed to decode image for dual model detection")
            return {"error": "Invalid image file. Please upload a valid image file (JPEG, PNG, etc.)."}
        
        logger.info(f"Decoded image shape: {img.shape}")
        
        # Use the detection service to process with both models
        results = detection_service.process_frame_with_dual_models(
            weapon_model, 
            fire_smoke_model, 
            img
        )
        
        if not results["success"]:
            logger.error(f"Dual model detection failed: {results.get('error')}")
            return {"error": "Detection failed", "details": results.get("error")}
        
        weapon_detections = results["weapon_detections"]
        fire_smoke_detections = results["fire_smoke_detections"]
        
        # Filter detections to only include relevant classes per model
        # This prevents cross-contamination (e.g., weapon model detecting "fire")
        WEAPON_CLASSES = {'weapon', 'gun', 'knife', 'pistol', 'rifle', 'handgun', 'sword', 'bomb', 'grenade', 'firearm'}
        FIRE_SMOKE_CLASSES = {'fire', 'smoke', 'flame', 'blaze'}
        
        # Filter weapon detections: keep only weapon-related classes
        filtered_weapon = [d for d in weapon_detections if d["class"].lower() in WEAPON_CLASSES]
        # Filter fire/smoke detections: keep only fire/smoke-related classes
        filtered_fire_smoke = [d for d in fire_smoke_detections if d["class"].lower() in FIRE_SMOKE_CLASSES]
        
        # If a model has classes not in either known set, keep them under their original model
        # (in case models have custom class names we didn't list)
        unknown_weapon = [d for d in weapon_detections if d["class"].lower() not in WEAPON_CLASSES and d["class"].lower() not in FIRE_SMOKE_CLASSES]
        unknown_fire_smoke = [d for d in fire_smoke_detections if d["class"].lower() not in FIRE_SMOKE_CLASSES and d["class"].lower() not in WEAPON_CLASSES]
        
        # Also move any fire/smoke detections from weapon model to fire_smoke list
        misplaced_fire = [d for d in weapon_detections if d["class"].lower() in FIRE_SMOKE_CLASSES]
        # And any weapon detections from fire_smoke model to weapon list
        misplaced_weapon = [d for d in fire_smoke_detections if d["class"].lower() in WEAPON_CLASSES]
        
        weapon_detections = filtered_weapon + unknown_weapon + misplaced_weapon
        fire_smoke_detections = filtered_fire_smoke + unknown_fire_smoke + misplaced_fire
        
        logger.info(f"Filtered - Weapon detections: {len(weapon_detections)}, Fire/Smoke detections: {len(fire_smoke_detections)}")
        
        # Draw weapon detections (red)
        img_weapon = detection_service.draw_detections(
            img, 
            weapon_detections, 
            (0, 0, 255)  # Red
        )
        
        # Draw fire/smoke detections (blue)
        img_fire_smoke = detection_service.draw_detections(
            img, 
            fire_smoke_detections, 
            (255, 0, 0)  # Blue
        )
        
        # Save detections to database
        all_detections = weapon_detections + fire_smoke_detections
        for detection in all_detections:
            # Determine severity based on confidence
            confidence = detection["confidence"]
            if confidence >= 0.8:
                severity = "high"
            elif confidence >= 0.6:
                severity = "medium"
            else:
                severity = "low"
            
            # Save detection to database
            detection_id = database_manager.save_detection(
                detection_type=detection["class"],
                confidence=confidence
            )
            
            # Save alert if detection_id was successfully created
            if detection_id:
                database_manager.save_alert(
                    detection_id=detection_id,
                    severity=severity
                )
        
        # Convert images back to bytes with compression
        _, buffer_weapon = cv2.imencode('.jpg', img_weapon, [cv2.IMWRITE_JPEG_QUALITY, 80])
        img_bytes_weapon = buffer_weapon.tobytes()
        
        _, buffer_fire_smoke = cv2.imencode('.jpg', img_fire_smoke, [cv2.IMWRITE_JPEG_QUALITY, 80])
        img_bytes_fire_smoke = buffer_fire_smoke.tobytes()
        
        logger.info(f"Encoded weapon image size: {len(img_bytes_weapon)} bytes")
        logger.info(f"Encoded fire/smoke image size: {len(img_bytes_fire_smoke)} bytes")
        
        return {
            "weapon_detections": weapon_detections,
            "fire_smoke_detections": fire_smoke_detections,
            "weapon_image": base64.b64encode(img_bytes_weapon).decode('utf-8'),
            "fire_smoke_image": base64.b64encode(img_bytes_fire_smoke).decode('utf-8')
        }
    except Exception as e:
        logger.error(f"Error in dual model detection: {e}", exc_info=True)
        return {"error": "Detection failed", "details": str(e)}

# Get recent detections
@app.get("/detections")
async def get_recent_detections(limit: int = 50):
    detections = database_manager.get_recent_detections(limit)
    return {"detections": detections}

# Get detection by ID
@app.get("/detections/{detection_id}")
async def get_detection(detection_id: int):
    detection = database_manager.get_detection_by_id(detection_id)
    if detection:
        alerts = database_manager.get_alerts_for_detection(detection_id)
        return {"detection": detection, "alerts": alerts}
    else:
        return {"error": "Detection not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.getenv("HOST", "localhost"), port=int(os.getenv("PORT", 8000)))
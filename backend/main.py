import cv2
import numpy as np
import asyncio
from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from ultralytics import YOLO
import os
from dotenv import load_dotenv
import json
from datetime import datetime
import base64
import logging
import socketio
from pydantic import BaseModel, EmailStr
from typing import Optional

# Import our services
from services.model_manager import ModelManager
from services.detection_service import DetectionService
from services.database_manager import DatabaseManager
from services.fight_detection_service import FightDetectionService
from services.auth_service import AuthService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# ── CORS allowed origins ─────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ── Socket.IO server ──────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

app = FastAPI(title="YOLO Object Detection API")

# Add CORS middleware to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wrap FastAPI with Socket.IO ASGI app
_socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


# ── Top-level ASGI CORS wrapper ──────────────────────────────
# Socket.IO's ASGIApp can swallow OPTIONS preflight requests before
# FastAPI's CORSMiddleware ever sees them.  This thin wrapper ensures
# every response carries the correct CORS headers.
async def socket_app(scope, receive, send):
    if scope["type"] == "http":
        headers = dict(scope.get("headers", []))
        origin = headers.get(b"origin", b"").decode()

        # Handle preflight OPTIONS requests at the top level
        if scope["method"] == "OPTIONS" and origin in ALLOWED_ORIGINS:
            response_headers = [
                (b"access-control-allow-origin", origin.encode()),
                (b"access-control-allow-methods", b"GET, POST, PUT, PATCH, DELETE, OPTIONS"),
                (b"access-control-allow-headers", b"*"),
                (b"access-control-allow-credentials", b"true"),
                (b"access-control-max-age", b"600"),
                (b"content-length", b"0"),
            ]
            await send({"type": "http.response.start", "status": 200, "headers": response_headers})
            await send({"type": "http.response.body", "body": b""})
            return

    await _socket_app(scope, receive, send)

# Initialize services
model_manager = ModelManager()
detection_service = DetectionService()
database_manager = DatabaseManager()
fight_detection_service = FightDetectionService()
auth_service = AuthService()

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Global variable for current model
current_model = "weapon"


# ── Pydantic models for auth ─────────────────────────────────
class SignUpRequest(BaseModel):
    fullName: str
    email: str
    password: str
    confirmPassword: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str


# ── Auth dependency ──────────────────────────────────────────
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Extract and verify the JWT token from the Authorization header.
    Returns the user dict if valid, raises 401 otherwise.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ")[1]
    payload = auth_service.verify_token(token, token_type="access")

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Fetch full user from DB to ensure they still exist / are active
    user = database_manager.get_user_by_id(payload.get("user_id"))
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user

# ── Socket.IO event handlers ─────────────────────────────────
@sio.event
async def connect(sid, environ):
    logger.info(f"[Socket.IO] Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"[Socket.IO] Client disconnected: {sid}")


async def emit_alert(detection_type: str, confidence: float, severity: str, detection_id=None):
    """Broadcast a new_alert event to every connected client."""
    type_labels = {
        "weapon": "Weapon Detected", "fire": "Fire Detected",
        "smoke": "Smoke Detected", "fight": "Fight Detected",
        "gun": "Weapon Detected", "knife": "Weapon Detected",
    }
    severity_label = "Critical" if severity == "high" else "Warning" if severity == "medium" else "Info"
    alert_payload = {
        "id": detection_id or int(datetime.now().timestamp() * 1000),
        "type": type_labels.get(detection_type.lower(),
                                f"{detection_type.capitalize()} Detected"),
        "severity": severity_label,
        "description": f"Detected {detection_type} with {confidence * 100:.1f}% confidence",
        "location": "Detection Page",
        "time": "Just now",
        "status": "Active",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "confidence": confidence,
        "detection_type": detection_type,
    }
    await sio.emit("new_alert", alert_payload)
    logger.info(f"[Socket.IO] Emitted new_alert: {detection_type} ({confidence:.1%})")


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
        # Load and apply persisted settings
        try:
            saved = database_manager.get_settings()
            thresholds = saved.get("thresholds", {})
            if thresholds:
                _apply_threshold_to_service(thresholds)
                logger.info(f"Loaded persisted thresholds on startup")
        except Exception as e:
            logger.warning(f"Could not load persisted settings: {e}")
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
    model_info = {}
    # Weapon model info
    if model_manager.weapon_model is not None:
        model_info["weapon"] = {
            "loaded": True,
            "architecture": "YOLOv11",
            "classes": list(model_manager.weapon_model.names.values()) if hasattr(model_manager.weapon_model, 'names') else [],
            "file": "weapon.pt",
        }
    else:
        model_info["weapon"] = {"loaded": False}

    # Fire/smoke model info
    if model_manager.fire_smoke_model is not None:
        model_info["fire_smoke"] = {
            "loaded": True,
            "architecture": "YOLOv11",
            "classes": list(model_manager.fire_smoke_model.names.values()) if hasattr(model_manager.fire_smoke_model, 'names') else [],
            "file": "fire_smoke.pt",
        }
    else:
        model_info["fire_smoke"] = {"loaded": False}

    # Fight model info
    if model_manager.fight_model is not None:
        model_info["fight"] = {
            "loaded": True,
            "architecture": "BlazePose + LSTM",
            "classes": ["fight", "no_fight"],
            "file": "fight_detection_model.h5",
        }
    else:
        model_info["fight"] = {"loaded": False}

    return {
        "models": model_manager.get_available_models(),
        "current_model": model_manager.current_model,
        "model_info": model_info
    }

# Switch between models
@app.post("/models/switch")
async def switch_model(model_name: str = Form(...)):
    if model_manager.switch_model(model_name):
        return {"message": f"Switched to {model_name} model", "current_model": model_name}
    else:
        return {"error": "Invalid model name. Use 'weapon', 'fire_smoke', 'fight', 'both', or 'all'"}

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
        
        # Run fight detection with force_predict for single image uploads
        fight_result = fight_detection_service.detect_fight(frame, force_predict=True)
        
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
                # Emit real-time alert via Socket.IO
                await emit_alert("fight", confidence, severity, detection_id)
        
        # Encode annotated frame as base64 image
        annotated_frame = fight_result.pop("annotated_frame", None)
        if annotated_frame is not None:
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            fight_result["image"] = base64.b64encode(buffer.tobytes()).decode('utf-8')
        
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
            # Emit real-time alert via Socket.IO
            await emit_alert("fight", confidence, severity, detection_id)
    
    return fight_result

# Detect objects in an image
@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    camera_id: str = Form("default")  # NEW: Optional camera ID
):
    global current_model
    
    logger.info(f"Detecting objects with current model: {model_manager.current_model}")
    
    # Handle fight model separately - it uses pose estimation, not YOLO
    if model_manager.current_model == "fight":
        logger.info("Redirecting to fight detection for fight model")
        try:
            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                return {"error": "File too large. Maximum size is 10MB."}
            nparr = np.frombuffer(contents, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return {"error": "Invalid image file."}
            fight_result = fight_detection_service.detect_fight(frame, force_predict=True)
            if not fight_result["success"]:
                return {"error": "Fight detection failed", "details": fight_result.get("error")}
            # Convert fight result to standard detection format for consistency
            detections = []
            box = fight_result.get("box") or {"x1": 0, "y1": 0, "x2": frame.shape[1], "y2": frame.shape[0]}
            if fight_result.get("is_fight", False):
                detections.append({
                    "class": "fight",
                    "confidence": fight_result["fight_probability"],
                    "box": box
                })
            # Encode annotated image (with pose + bounding box drawn)
            annotated_frame = fight_result.get("annotated_frame")
            img_to_encode = annotated_frame if annotated_frame is not None else frame
            _, buffer = cv2.imencode('.jpg', img_to_encode, [cv2.IMWRITE_JPEG_QUALITY, 80])
            img_bytes = buffer.tobytes()
            return {
                "detections": detections,
                "image": base64.b64encode(img_bytes).decode('utf-8'),
                "model_used": "fight",
                "fight_probability": fight_result.get("fight_probability", 0.0),
                "no_fight_probability": fight_result.get("no_fight_probability", 1.0),
                "is_fight": fight_result.get("is_fight", False),
                "message": fight_result.get("message", "")
            }
        except Exception as e:
            logger.error(f"Error in fight detection via /detect: {e}", exc_info=True)
            return {"error": "Fight detection failed", "details": str(e)}
    
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
                # Emit real-time alert via Socket.IO
                await emit_alert(detection["class"], confidence, severity, detection_id)
        
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
                # Emit real-time alert via Socket.IO
                await emit_alert(detection["class"], confidence, severity, detection_id)
        
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

# Detect with ALL models (weapon + fire/smoke + fight)
@app.post("/detect/all")
async def detect_all_models(
    file: UploadFile = File(...),
    camera_id: str = Form("default")
):
    logger.info("Detecting with ALL models")

    if not model_manager.models_loaded():
        logger.error("No models loaded")
        return {"error": "No models loaded"}

    # ── Quality thresholds for All-Models mode ──────────────
    ALL_MODE_CONFIDENCE = 0.6        # Minimum confidence for YOLO detections
    FIGHT_CONFIDENCE_MIN = 0.7       # Higher bar for fight (prone to false positives)

    # Strict known-class whitelists — anything outside these is discarded
    WEAPON_CLASSES = {'weapon', 'gun', 'knife', 'pistol', 'rifle', 'handgun',
                      'sword', 'bomb', 'grenade', 'firearm'}
    FIRE_SMOKE_CLASSES = {'fire', 'smoke', 'flame', 'blaze'}

    try:
        # Read image file with size limit
        contents = await file.read()
        logger.info(f"[ALL] Received file of size: {len(contents)} bytes")

        if len(contents) > 10 * 1024 * 1024:
            return {"error": "File too large. Maximum size is 10MB."}
        if not contents:
            return {"error": "Empty file received"}

        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"error": "Invalid image file. Please upload a valid image file (JPEG, PNG, etc.)."}

        logger.info(f"[ALL] Decoded image shape: {img.shape}")

        # ── Helper: IoU for duplicate suppression ───────────────
        def _iou(a, b):
            """Compute Intersection-over-Union between two boxes (dict with x1,y1,x2,y2)."""
            xa = max(a.get("x1", 0), b.get("x1", 0))
            ya = max(a.get("y1", 0), b.get("y1", 0))
            xb = min(a.get("x2", 0), b.get("x2", 0))
            yb = min(a.get("y2", 0), b.get("y2", 0))
            inter = max(0, xb - xa) * max(0, yb - ya)
            area_a = max(0, a.get("x2", 0) - a.get("x1", 0)) * max(0, a.get("y2", 0) - a.get("y1", 0))
            area_b = max(0, b.get("x2", 0) - b.get("x1", 0)) * max(0, b.get("y2", 0) - b.get("y1", 0))
            union = area_a + area_b - inter
            return inter / union if union > 0 else 0.0

        # ── Collect raw detections from every loaded model ──────
        raw_weapon = []
        raw_fire_smoke = []
        fight_detections = []

        # Weapon model
        weapon_model = model_manager.get_model("weapon")
        if weapon_model is not None:
            logger.info("[ALL] Running weapon detection")
            weapon_result = detection_service.detect_objects(weapon_model, img)
            if weapon_result["success"]:
                raw_weapon = weapon_result["detections"]

        # Fire/Smoke model
        fire_smoke_model = model_manager.get_model("fire_smoke")
        if fire_smoke_model is not None:
            logger.info("[ALL] Running fire/smoke detection")
            fire_result = detection_service.detect_objects(fire_smoke_model, img)
            if fire_result["success"]:
                raw_fire_smoke = fire_result["detections"]

        # Fight model (with higher confidence bar)
        if fight_detection_service and fight_detection_service.is_loaded:
            logger.info("[ALL] Running fight detection")
            try:
                fight_result = fight_detection_service.detect_fight(img.copy(), force_predict=True)
                if (fight_result.get("success")
                        and fight_result.get("is_fight")
                        and fight_result.get("fight_probability", 0) >= FIGHT_CONFIDENCE_MIN):
                    box = fight_result.get("box") or {
                        "x1": 0, "y1": 0,
                        "x2": img.shape[1], "y2": img.shape[0]
                    }
                    fight_detections = [{
                        "class": "fight",
                        "confidence": fight_result["fight_probability"],
                        "box": box,
                        "model_source": "fight"
                    }]
                elif fight_result.get("is_fight"):
                    logger.info(f"[ALL] Fight suppressed — confidence "
                                f"{fight_result.get('fight_probability', 0):.2f} < {FIGHT_CONFIDENCE_MIN}")
            except Exception as e:
                logger.error(f"[ALL] Fight detection error: {e}")

        logger.info(f"[ALL] Raw weapon classes: {[d['class'] for d in raw_weapon]}")
        logger.info(f"[ALL] Raw fire_smoke classes: {[d['class'] for d in raw_fire_smoke]}")

        # ── 1. Confidence gate — discard low-confidence detections ─
        raw_weapon = [d for d in raw_weapon if d["confidence"] >= ALL_MODE_CONFIDENCE]
        raw_fire_smoke = [d for d in raw_fire_smoke if d["confidence"] >= ALL_MODE_CONFIDENCE]

        # ── 2. Cross-contamination filter ─────────────────────────
        # Trust each model's own detections by default.
        # Only MOVE detections that clearly belong to the OTHER model's domain.
        # Keep unknown/custom class names with their originating model.

        # Detections from weapon model that are clearly fire/smoke → move
        misplaced_fire = [d for d in raw_weapon if d["class"].lower() in FIRE_SMOKE_CLASSES]
        # Everything else from weapon model stays as weapon detection
        weapon_detections = [d for d in raw_weapon if d["class"].lower() not in FIRE_SMOKE_CLASSES]

        # Detections from fire/smoke model that are clearly weapon → move
        misplaced_weapon = [d for d in raw_fire_smoke if d["class"].lower() in WEAPON_CLASSES]
        # Everything else from fire/smoke model stays as fire/smoke detection
        fire_smoke_detections = [d for d in raw_fire_smoke if d["class"].lower() not in WEAPON_CLASSES]

        # Add misplaced detections to the correct category
        weapon_detections += misplaced_weapon
        fire_smoke_detections += misplaced_fire

        if misplaced_fire or misplaced_weapon:
            logger.info(f"[ALL] Reclassified — "
                         f"fire from weapon model: {[d['class'] for d in misplaced_fire]}, "
                         f"weapon from fire model: {[d['class'] for d in misplaced_weapon]}")

        # Tag model_source on every detection
        for d in weapon_detections:
            d["model_source"] = "weapon"
        for d in fire_smoke_detections:
            d["model_source"] = "fire_smoke"

        # ── 3. IoU-based duplicate suppression ────────────────────
        # If both models detect essentially the same bounding-box region,
        # keep only the higher-confidence detection.
        combined = weapon_detections + fire_smoke_detections
        keep_flags = [True] * len(combined)
        for i in range(len(combined)):
            if not keep_flags[i]:
                continue
            for j in range(i + 1, len(combined)):
                if not keep_flags[j]:
                    continue
                box_i = combined[i].get("box", {})
                box_j = combined[j].get("box", {})
                if box_i and box_j and _iou(box_i, box_j) > 0.5:
                    # Same region — keep the one with higher confidence
                    if combined[i]["confidence"] >= combined[j]["confidence"]:
                        keep_flags[j] = False
                        logger.info(f"[ALL] Suppressed duplicate: {combined[j]['class']} "
                                     f"({combined[j]['confidence']:.2f}) overlaps with "
                                     f"{combined[i]['class']} ({combined[i]['confidence']:.2f})")
                    else:
                        keep_flags[i] = False
                        logger.info(f"[ALL] Suppressed duplicate: {combined[i]['class']} "
                                     f"({combined[i]['confidence']:.2f}) overlaps with "
                                     f"{combined[j]['class']} ({combined[j]['confidence']:.2f})")
                        break

        deduped = [d for d, keep in zip(combined, keep_flags) if keep]
        weapon_detections = [d for d in deduped if d.get("model_source") == "weapon"]
        fire_smoke_detections = [d for d in deduped if d.get("model_source") == "fire_smoke"]

        logger.info(f"[ALL] After quality filtering — Weapon: {len(weapon_detections)}, "
                     f"Fire/Smoke: {len(fire_smoke_detections)}, Fight: {len(fight_detections)}")

        # ── Aggregate ───────────────────────────────────────────
        all_detections = weapon_detections + fire_smoke_detections + fight_detections
        logger.info(f"[ALL] Final detections: {len(all_detections)}")

        # ── Draw combined annotations on a single image ─────────
        combined_img = img.copy()
        MODEL_COLORS = {
            "weapon": (0, 0, 255),      # Red
            "fire_smoke": (255, 140, 0), # Orange-blue (BGR)
            "fight": (0, 200, 255),      # Yellow (BGR)
        }
        for det in all_detections:
            color = MODEL_COLORS.get(det.get("model_source"), (0, 255, 0))
            box = det.get("box", {})
            if box:
                cv2.rectangle(
                    combined_img,
                    (int(box.get("x1", 0)), int(box.get("y1", 0))),
                    (int(box.get("x2", 0)), int(box.get("y2", 0))),
                    color, 2
                )
                label = f"{det['class']} {det['confidence']:.2f}"
                cv2.putText(
                    combined_img, label,
                    (int(box.get("x1", 0)), int(box.get("y1", 0)) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1
                )

        # ── Encode combined image ───────────────────────────────
        _, buffer = cv2.imencode('.jpg', combined_img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        combined_image_b64 = base64.b64encode(buffer.tobytes()).decode('utf-8')

        # ── Save to DB & emit alerts (only for valid detections) ─
        for detection in all_detections:
            confidence = detection["confidence"]
            severity = "high" if confidence >= 0.8 else "medium" if confidence >= 0.6 else "low"
            detection_id = database_manager.save_detection(
                detection_type=detection["class"],
                confidence=confidence
            )
            if detection_id:
                database_manager.save_alert(detection_id=detection_id, severity=severity)
                await emit_alert(detection["class"], confidence, severity, detection_id)

        return {
            "detections": all_detections,
            "weapon_detections": weapon_detections,
            "fire_smoke_detections": fire_smoke_detections,
            "fight_detections": fight_detections,
            "image": combined_image_b64,
            "models_used": [
                m for m in ["weapon", "fire_smoke", "fight"]
                if model_manager.get_model(m) is not None
                or (m == "fight" and fight_detection_service and fight_detection_service.is_loaded)
            ],
            "message": f"Detected {len(all_detections)} object(s) across all models"
                       if all_detections else "No detections found across any model"
        }
    except Exception as e:
        logger.error(f"Error in all-model detection: {e}", exc_info=True)
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

# Mark a single detection as read
@app.patch("/detections/{detection_id}/read")
async def mark_detection_read(detection_id: int):
    success = database_manager.mark_detection_read(detection_id)
    if success:
        return {"message": f"Detection {detection_id} marked as read"}
    else:
        return {"error": "Failed to mark detection as read"}

# Mark all detections as read
@app.patch("/detections/read-all")
async def mark_all_detections_read():
    success = database_manager.mark_all_detections_read()
    if success:
        return {"message": "All detections marked as read"}
    else:
        return {"error": "Failed to mark all detections as read"}

# ── Default settings (used when no DB value exists) ──────────
DEFAULT_SETTINGS = {
    "notifications": {
        "emailAlerts": True,
        "pushNotifications": True,
        "smsAlerts": False,
        "alertSound": True,
    },
    "detection": {
        "motionDetection": True,
        "objectDetection": True,
        "poseEstimation": True,
        "behaviorAnalysis": True,
        "fireDetection": True,
        "weaponDetection": True,
    },
    "thresholds": {
        "detectionConfidence": 75,
        "behaviorConfidence": 80,
        "alertCooldown": 30,
    },
    "system": {
        "recordingEnabled": True,
        "autoArchive": True,
        "retentionDays": 30,
        "storageLimit": 100,
    },
}


def _apply_threshold_to_service(thresholds: dict):
    """Apply the detection confidence threshold to the live detection service."""
    conf = thresholds.get("detectionConfidence", 75)
    # Convert percentage (0-100) to a 0-1 float
    detection_service.confidence_threshold = max(0.05, min(1.0, conf / 100.0))
    logger.info(f"[Settings] Detection confidence threshold set to {detection_service.confidence_threshold:.2f}")


# ── Settings endpoints ───────────────────────────────────────

@app.get("/api/settings")
async def get_settings():
    """Return all persisted settings, merged with defaults."""
    saved = database_manager.get_settings()

    # Merge saved values over defaults
    merged = {}
    for section, defaults in DEFAULT_SETTINGS.items():
        saved_section = saved.get(section, {})
        if isinstance(defaults, dict) and isinstance(saved_section, dict):
            merged[section] = {**defaults, **saved_section}
        else:
            merged[section] = saved_section if section in saved else defaults

    return {"settings": merged}


@app.put("/api/settings")
async def update_settings(payload: dict):
    """
    Save settings and apply relevant values to the running system.
    Expects: { "notifications": {...}, "detection": {...}, "thresholds": {...}, "system": {...} }
    """
    success = database_manager.save_settings(payload)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save settings")

    # Apply threshold changes immediately
    thresholds = payload.get("thresholds")
    if thresholds:
        _apply_threshold_to_service(thresholds)

    return {"message": "Settings saved successfully", "settings": payload}


@app.post("/api/settings/clear-data")
async def clear_all_data():
    """Clear all detection and alert data."""
    success = database_manager.clear_all_data()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear data")
    return {"message": "All detection and alert data has been cleared"}


@app.post("/api/settings/reset-defaults")
async def reset_to_defaults():
    """Reset all settings to factory defaults."""
    success = database_manager.save_settings(DEFAULT_SETTINGS)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset settings")

    # Apply default thresholds
    _apply_threshold_to_service(DEFAULT_SETTINGS["thresholds"])

    return {"message": "Settings reset to defaults", "settings": DEFAULT_SETTINGS}


# ── Auth endpoints ───────────────────────────────────────────

@app.post("/api/auth/signup")
async def signup(req: SignUpRequest):
    """
    Register a new user account.
    """
    try:
        logger.info(f"Signup attempt for: {req.email}")

        # Validate passwords match
        if req.password != req.confirmPassword:
            raise HTTPException(status_code=400, detail="Passwords do not match")

        # Validate password length
        if len(req.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        # Validate name
        if not req.fullName.strip():
            raise HTTPException(status_code=400, detail="Full name is required")

        # Check if user already exists
        existing = database_manager.get_user_by_email(req.email.lower().strip())
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        # Hash the password
        logger.info("Hashing password...")
        password_hash = auth_service.hash_password(req.password)
        logger.info("Password hashed successfully")

        # Create user in DB
        logger.info("Creating user in database...")
        user = database_manager.create_user(
            full_name=req.fullName.strip(),
            email=req.email.lower().strip(),
            password_hash=password_hash,
        )

        if not user:
            raise HTTPException(status_code=500, detail="Failed to create user. Please try again.")

        logger.info(f"User created: {user['email']}")

        # Generate tokens
        tokens = auth_service.create_tokens(
            user_id=user["user_id"],
            email=user["email"],
            name=user["full_name"],
            role=user["role"],
        )

        logger.info(f"New user registered: {user['email']}")

        return {
            "message": "Account created successfully",
            "user": {
                "user_id": user["user_id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user["role"],
            },
            **tokens,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """
    Authenticate user and return JWT tokens.
    """
    # Look up user by email
    user = database_manager.get_user_by_email(req.email.lower().strip())

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if user is active
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Verify password
    if not auth_service.verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate tokens
    tokens = auth_service.create_tokens(
        user_id=user["user_id"],
        email=user["email"],
        name=user["full_name"],
        role=user["role"],
    )

    logger.info(f"User logged in: {user['email']}")

    return {
        "message": "Login successful",
        "user": {
            "user_id": user["user_id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
        },
        **tokens,
    }


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.
    """
    return {
        "user": current_user,
    }


@app.post("/api/auth/refresh")
async def refresh_token(req: RefreshRequest):
    """
    Issue a new access token using a valid refresh token.
    """
    payload = auth_service.verify_token(req.refresh_token, token_type="refresh")

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Ensure user still exists
    user = database_manager.get_user_by_id(payload.get("user_id"))
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Generate new tokens
    tokens = auth_service.create_tokens(
        user_id=user["user_id"],
        email=user["email"],
        name=user["full_name"],
        role=user["role"],
    )

    return {
        "message": "Token refreshed",
        **tokens,
    }


@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Send a password-reset email to the user.
    Always returns success to avoid leaking whether an email exists.
    """
    email = req.email.lower().strip()
    logger.info(f"Password reset requested for: {email}")

    # Look up user – but always respond with 200 to prevent enumeration
    user = database_manager.get_user_by_email(email)

    if user and user.get("is_active"):
        try:
            reset_token = auth_service.create_reset_token(email)
            sent = auth_service.send_reset_email(email, reset_token)
            if not sent:
                logger.error(f"Failed to send reset email to {email}")
        except Exception as e:
            logger.error(f"Error creating/sending reset token: {e}")
    else:
        logger.info(f"No active account for {email} – silently ignoring")

    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Reset user password using a valid reset token.
    """
    # Validate new password
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Verify the reset token
    email = auth_service.verify_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")

    # Hash new password and update in DB
    new_hash = auth_service.hash_password(req.new_password)
    updated = database_manager.update_user_password(email, new_hash)

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update password. Please try again.")

    logger.info(f"Password reset successful for: {email}")

    return {
        "message": "Your password has been reset successfully. You can now sign in with your new password."
    }


if __name__ == "__main__":
    import uvicorn
    # Use socket_app instead of app so Socket.IO is served alongside FastAPI
    uvicorn.run(socket_app, host=os.getenv("HOST", "localhost"), port=int(os.getenv("PORT", 8000)))
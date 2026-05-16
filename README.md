AI SURVELLIENCE SYSTEM
This is a full-stack web application that integrates two trained YOLO object detection models for real-time detection of weapons, fire, and smoke from live video feed or uploaded footage.

Features
Real-time object detection using webcam
Video file upload for detection
Two specialized models: Weapon detection and Fire/Smoke detection
Switch between models dynamically
Visual alerts when objects are detected
Responsive UI with dark/light mode toggle
Project Structure
├── backend/
│   ├── models/
│   │   ├── weapon.pt
│   │   └── fire_smoke.pt
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
└── testing/
    ├── api_endpoints/
    ├── model_testing/
    └── ...
Setup Instructions
Backend Setup
Navigate to the backend directory:

cd backend
Create a virtual environment (optional but recommended):

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install the required Python packages:

pip install -r requirements.txt
Ensure your YOLO model files are in the backend/models directory:

weapon.pt
fire_smoke.pt
Start the backend server:

On Windows, you can double-click the start_server.bat file or run:

python main.py
The backend will start on http://localhost:8000

Frontend Setup
Navigate to the frontend directory:

cd frontend
Install the required Node packages:

npm install
Start the development server:

On Windows, you can double-click the start_dev.bat file or run:

npm run dev
The frontend will start on http://localhost:3000 (or the next available port if 3000 is in use)

API Endpoints
GET / - Health check
GET /models - Get available models
POST /models/switch - Switch between models
POST /detect - Detect objects in an image
POST /detect/both - Detect objects using both models
Testing
The project includes a comprehensive testing framework located in the testing/ directory:

Test Structure
testing/api_endpoints/ - Tests for all REST API endpoints
testing/model_testing/ - Tests for model functionality and integration
Running Tests
Run All Tests
python testing/run_all_tests.py
Run Specific Test Suites
# Run API endpoint tests
python -m unittest testing.api_endpoints.test_health_check
python -m unittest testing.api_endpoints.test_models_endpoints
python -m unittest testing.api_endpoints.test_detection_endpoints
python -m unittest testing.api_endpoints.test_integration

# Run model tests
python testing/model_testing/test_fire_detection.py
python testing/model_testing/test_weapon_detection.py
python testing/model_testing/test_model_switching.py
Usage
Open your browser and go to http://localhost:3000
Select the detection model (Weapon or Fire/Smoke)
Start the camera or upload a video/image
View detection results in real-time
Environment Variables
Create a .env file in the backend directory with the following variables:

MODEL_WEAPON_PATH=models/weapon.pt
MODEL_FIRE_SMOKE_PATH=models/fire_smoke.pt
HOST=localhost
PORT=8000
Dependencies
Backend
FastAPI
Ultralytics (YOLOv11)
OpenCV
PyTorch
NumPy
Frontend
React
Tailwind CSS
Axios
Troubleshooting
If you encounter CUDA errors, make sure you have the appropriate PyTorch version for your system
If the camera doesn't work, check browser permissions
Ensure both model files are present in the backend/models directory

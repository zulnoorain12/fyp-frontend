# CyberisAI — Real-Time Threat Detection System

CyberisAI is an AI-powered real-time surveillance and threat detection web application built as a Final Year Project (FYP). The system uses deep learning models to detect **weapons**, **fire/smoke**, and **fights** from live camera feeds or uploaded images, and immediately alerts users through a web dashboard with real-time notifications.

## Key Features

- **Weapon Detection** — Detects guns, knives, and other weapons using a YOLOv11 model (`weapon.pt`).
- **Fire & Smoke Detection** — Identifies fire and smoke hazards using a YOLOv11 model (`fire_smoke.pt`).
- **Fight Detection** — Recognizes violent behavior using MediaPipe BlazePose + LSTM model (`fight_detection_model.h5`).
- **All-Models Mode** — Runs all three detection models simultaneously with cross-model filtering and duplicate suppression.
- **Real-Time Alerts** — Broadcasts alerts instantly to all connected clients via Socket.IO.
- **Live Camera Feed** — Stream and analyze video from connected cameras in real time.
- **Dashboard & Analytics** — Visual overview of detection history, alert statistics, and trends.
- **User Authentication** — Secure signup, login, JWT-based sessions, and password reset via email.
- **Configurable Settings** — Adjust confidence thresholds, notification preferences, and model selection from the UI.

## Tech Stack

| Layer      | Technology                                                       |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | React 19, Vite 7, Axios, Socket.IO Client, TailwindCSS          |
| Backend    | Python, FastAPI, Uvicorn, Socket.IO (ASGI)                       |
| AI/ML      | Ultralytics YOLOv11, TensorFlow/Keras (LSTM), MediaPipe, OpenCV  |
| Database   | PostgreSQL (via psycopg2)                                        |
| Auth       | JWT (python-jose), Passlib + Bcrypt                              |
| Email      | SMTP (Gmail) for password reset                                  |

## Project Structure

```
fyp-frontend/
│
├── backend/                          # Python FastAPI backend
│   ├── main.py                       # Main API server — all endpoints, Socket.IO, CORS
│   ├── init_db.py                    # Database initialization script (creates tables)
│   ├── init_db.bat                   # Windows batch script to run init_db.py
│   ├── start_server.bat              # Windows batch script to start the backend server
│   ├── requirements.txt              # Python dependencies
│   ├── .env                          # Environment variables (DB, JWT, SMTP, model paths)
│   ├── detection_logs.json           # Detection log file
│   │
│   ├── models/                       # Pre-trained AI model weights
│   │   ├── weapon.pt                 # YOLOv11 weapon detection model
│   │   ├── fire_smoke.pt             # YOLOv11 fire & smoke detection model
│   │   ├── fight_detection_model.h5  # LSTM fight detection model
│   │   └── scaler.pkl                # Feature scaler for fight detection
│   │
│   ├── services/                     # Backend service modules
│   │   ├── auth_service.py           # JWT authentication & password reset
│   │   ├── camera_service.py         # Camera feed management
│   │   ├── database_manager.py       # PostgreSQL database operations
│   │   ├── detection_service.py      # YOLO object detection logic
│   │   ├── fight_detection_service.py# Fight detection pipeline (pose → LSTM)
│   │   ├── feature_extraction.py     # Pose feature extraction for fight model
│   │   ├── logging_service.py        # Logging utilities
│   │   ├── model_manager.py          # Model loading & switching
│   │   └── pose_estimation.py        # MediaPipe pose estimation
│   │
│   └── venv/                         # Python virtual environment (not committed)
│
├── frontend/                         # React + Vite frontend
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Node.js dependencies & scripts
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # TailwindCSS configuration
│   ├── postcss.config.js             # PostCSS configuration
│   ├── eslint.config.js              # ESLint configuration
│   │
│   └── src/
│       ├── main.jsx                  # React app entry point
│       ├── App.jsx                   # Root component — routing & auth state
│       ├── App.css                   # Global app styles
│       ├── index.css                 # Base styles
│       │
│       ├── components/               # Page-level React components
│       │   ├── Login.jsx             # Login & Signup page
│       │   ├── dashboard.jsx         # Dashboard overview page
│       │   ├── Detection.jsx         # Real-time threat detection page
│       │   ├── LiveFeed.jsx          # Live camera feed page
│       │   ├── Alerts.jsx            # Alerts management page
│       │   ├── Analytics.jsx         # Analytics & charts page
│       │   ├── Settings.jsx          # System settings page
│       │   └── Sidebar.jsx           # Navigation sidebar component
│       │
│       ├── styles/                   # Component-specific CSS files
│       │   ├── Login.css
│       │   ├── dashboard.css
│       │   ├── Detection.css
│       │   ├── LiveFeed.css
│       │   ├── Alerts.css
│       │   ├── Analytics.css
│       │   └── Settings.css
│       │
│       ├── services/                 # API & Socket.IO client services
│       │   ├── api.js                # Axios HTTP client for backend API
│       │   └── socket.js             # Socket.IO client connection
│       │
│       ├── hooks/                    # Custom React hooks
│       │   └── useApi.js             # API utility hook
│       │
│       └── utils/                    # Utility functions
│           └── audioAlert.js         # Audio alert playback utility
│
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

## Prerequisites

Before running the project, make sure you have:

- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **Python** (v3.10 or higher) — [Download](https://www.python.org/)
- **PostgreSQL** (v14 or higher) — [Download](https://www.postgresql.org/)
- **Git** — [Download](https://git-scm.com/)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/fyp-frontend.git
cd fyp-frontend
```

### 2. Set Up the Database

1. Make sure PostgreSQL is running.
2. Create a database named `cyberisai`:

```sql
CREATE DATABASE cyberisai;
```

3. Update the database credentials in `backend/.env` if needed:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cyberisai
DB_USER=postgres
DB_PASSWORD=cyberisai
```

4. Initialize the database tables:

```bash
cd backend
python init_db.py
```

---

### 3. Run the Backend

```bash
cd backend
```

**Create and activate a virtual environment:**

```bash
# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Activate it (macOS/Linux)
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Start the server:**

```bash
uvicorn main:socket_app --host localhost --port 8000 --reload
```

The backend API will be running at **http://localhost:8000**

> **Note:** The AI models (`weapon.pt`, `fire_smoke.pt`, `fight_detection_model.h5`) must be placed in the `backend/models/` directory before starting the server.

---

### 4. Run the Frontend

Open a **new terminal** and run:

```bash
cd frontend
```

**Install dependencies:**

```bash
npm install
```

**Start the development server:**

```bash
npm run dev
```

The frontend will be running at **http://localhost:5173**

---

## API Endpoints

| Method | Endpoint             | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| GET    | `/`                  | Health check                                 |
| GET    | `/models`            | Get available models and their status         |
| POST   | `/models/switch`     | Switch the active detection model            |
| POST   | `/detect`            | Detect objects using the currently active model |
| POST   | `/detect/both`       | Run weapon + fire/smoke models together       |
| POST   | `/detect/all`        | Run all three models simultaneously           |
| POST   | `/detect/fight`      | Run fight detection on an image               |
| POST   | `/api/auth/signup`   | Register a new user                          |
| POST   | `/api/auth/login`    | Login and receive JWT tokens                 |
| POST   | `/api/auth/refresh`  | Refresh an expired access token              |
| GET    | `/api/auth/me`       | Get current authenticated user               |

## Environment Variables

The backend is configured via `backend/.env`. Key variables:

| Variable                     | Description                         | Default             |
| ---------------------------- | ----------------------------------- | ------------------- |
| `MODEL_WEAPON_PATH`          | Path to weapon YOLO model           | `models/weapon.pt`  |
| `MODEL_FIRE_SMOKE_PATH`      | Path to fire/smoke YOLO model       | `models/fire_smoke.pt` |
| `DB_HOST` / `DB_PORT`        | PostgreSQL host and port            | `localhost` / `5432` |
| `DB_NAME`                    | Database name                       | `cyberisai`          |
| `DB_USER` / `DB_PASSWORD`    | Database credentials                | `postgres` / `cyberisai` |
| `JWT_SECRET_KEY`             | Secret key for JWT signing          | *(change in prod)*   |
| `CONFIDENCE_THRESHOLD`       | Default detection confidence        | `0.25`               |
| `SMTP_HOST` / `EMAIL_USER`   | Email config for password reset     | Gmail SMTP           |
| `FRONTEND_URL`               | Frontend URL for email reset links  | `http://localhost:5173` |

## License

This project was built as a Final Year Project (FYP) for academic purposes.

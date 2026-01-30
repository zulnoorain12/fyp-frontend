# Frontend-Backend Integration Guide

## Overview
This document explains how the React frontend connects to the Python FastAPI backend for the CyberisAI surveillance system.

## Architecture

### Frontend (React + Vite)
- Located in `/src/`
- Components: Dashboard, LiveFeed, Detection, Alerts, Analytics, Settings
- Styling: TailwindCSS
- HTTP Client: Axios

### Backend (FastAPI + Python)
- Located in `/backend/`
- Services: Model Manager, Detection Service, Database Manager, Fight Detection
- Models: YOLOv11 (weapon/fire/smoke), BlazePose (pose estimation)
- Database: SQLite

## API Connection

### Base Configuration
- **Base URL**: `http://localhost:8000`
- **CORS**: Enabled for all origins during development

### API Service (`src/services/api.js`)
Centralizes all API calls with:
- Request/response interceptors
- Error handling
- Authentication token management

### Available Endpoints

#### Health & Models
- `GET /` - Health check
- `GET /models` - Get available models
- `POST /models/switch` - Switch active model

#### Detection
- `POST /detect` - Single model detection
- `POST /detect/both` - Dual model detection
- `POST /detect/fight` - Fight detection
- `POST /detect/fight/stream` - Stream fight detection

#### Data Management
- `GET /detections` - Get recent detections
- `GET /detections/{id}` - Get detection by ID
- `POST /fight/reset` - Reset fight detection buffer

## Component Integrations

### 1. Dashboard (`src/components/dashboard.jsx`)
- **Purpose**: System overview and statistics
- **Backend Calls**:
  - `GET /detections` - Fetch recent detections
  - Calculates: Active alerts, people detected, system health
- **Features**:
  - Real-time stats cards
  - Camera status monitoring
  - Recent alerts display

### 2. Alerts (`src/components/Alerts.jsx`)
- **Purpose**: View and manage security alerts
- **Backend Calls**:
  - `GET /detections` - Fetch all detections
  - Maps detections to alert format
- **Features**:
  - Filter by severity (Critical/Warning/Info)
  - Real timestamps
  - Alert acknowledgment

### 3. Analytics (`src/components/Analytics.jsx`)
- **Purpose**: System performance metrics
- **Backend Calls**:
  - `GET /detections` - Fetch detection data
  - Processes data for charts
- **Features**:
  - Detection activity timeline
  - Alert distribution pie chart
  - Behavior analysis
  - Camera performance metrics

### 4. Detection (`src/components/Detection.jsx`)
- **Purpose**: Manual image/video analysis
- **Backend Calls**:
  - `POST /detect` - Single model detection
  - `POST /detect/both` - Dual model detection
- **Features**:
  - File upload (images/videos)
  - Preview before processing
  - Visual detection results
  - Bounding box visualization

### 5. Settings (`src/components/Settings.jsx`)
- **Purpose**: System configuration
- **Backend Calls**:
  - `GET /models` - Fetch available models
  - `POST /models/switch` - Change active model
- **Features**:
  - Model switching interface
  - Detection thresholds
  - Notification preferences
  - System configuration

## Custom Hooks

### `useApi` Hook (`src/hooks/useApi.js`)
Reusable hook for API calls with:
- Loading states
- Error handling
- Data management
- Call abstraction

Usage:
```javascript
const { data, loading, error, callApi } = useApi();

const handleClick = async () => {
  try {
    const result = await callApi(apiEndpoints.detectObjects, formData);
    console.log(result);
  } catch (err) {
    console.error(err);
  }
};
```

## Data Flow

1. **User Action** → Component event handler
2. **Component** → API service call
3. **API Service** → Backend endpoint
4. **Backend** → Process request + Database
5. **Backend** → Return response
6. **Frontend** → Update component state
7. **Component** → Re-render UI

## Error Handling

### Frontend Strategy
- Try/catch blocks around API calls
- User-friendly error messages
- Fallback to mock data when backend unavailable
- Loading states during requests

### Backend Strategy
- Structured error responses
- Logging with context
- Graceful degradation

## Development Workflow

### Starting the System

1. **Start Backend**:
```bash
cd backend
python main.py
# Server runs on http://localhost:8000
```

2. **Start Frontend**:
```bash
npm run dev
# App runs on http://localhost:5173
```

### Testing Integration

1. Navigate to Detection page
2. Upload an image
3. Select detection mode (Single/Both)
4. Click "Run Detection"
5. View results with bounding boxes

## Security Considerations

- **CORS**: Restricted to localhost in production
- **File Upload**: Size limits (10MB max)
- **Input Validation**: Backend validates all inputs
- **Error Messages**: Generic messages to prevent information leakage

## Performance Optimization

- **Lazy Loading**: Components load on demand
- **Memoization**: React.memo for expensive components
- **Batching**: Multiple detections in single requests
- **Caching**: Browser cache for static assets

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured
   - Check frontend proxy settings

2. **Connection Refused**
   - Verify backend server is running
   - Check port configuration

3. **Slow Responses**
   - Monitor backend logs
   - Check model loading status
   - Validate database connectivity

### Debugging Tips

- Use browser DevTools Network tab
- Check backend console logs
- Enable debug logging in services
- Test endpoints with Postman/curl

## Future Enhancements

- WebSocket integration for real-time updates
- Authentication system
- Role-based access control
- Mobile-responsive design improvements
- Offline capability with service workers
- Progressive Web App features

---

**Last Updated**: January 2026
**Version**: 1.0

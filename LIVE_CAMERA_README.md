# Live Camera Detection System

## Features Implemented

### 1. Live Camera Feed
- Real-time camera access using WebRTC
- Start/Stop camera controls
- Live video display with detection overlay

### 2. Real-time Object Detection
- Continuous detection every second
- Integration with backend YOLOv11 models
- Visual bounding box display (in processed images)

### 3. Alert System
- **Audio Alerts**: Different sounds for Critical/Warning/Info severity
- **Dashboard Integration**: Real-time alert counters
- **Alerts Page**: Centralized notification hub with filtering
- **Status Tracking**: Mark alerts as read/unread
- **Severity Classification**: Critical/Warning/Info with visual indicators

### 4. Data Persistence
- LocalStorage for temporary alert storage
- Cross-component communication via storage events
- Automatic cleanup of old alerts

## How to Use

### Starting Live Detection
1. Navigate to "Live Feed" page
2. Click "Start Camera" button
3. Grant camera permissions when prompted
4. The system will automatically:
   - Start video stream
   - Begin detection every second
   - Play system confirmation sound
   - Display live feed

### Detection Process
- Every second, a frame is captured from the live video
- Frame is sent to the backend for object detection
- Results are displayed on screen:
  - Alert banner for detected objects
  - Confidence-based color coding (Red/Yellow/Blue)
  - Detection labels with percentages

### Alert Handling
When objects are detected:
1. **Audio Alert**: Plays sound based on severity level
2. **Alert Creation**: New alert added to Alerts page
3. **Dashboard Update**: Alert counters update in real-time
4. **Status Tracking**: Alert marked as "NEW" until acknowledged
5. **Filtering**: Alerts can be filtered by severity or read status

## Technical Implementation

### Frontend Components
- `LiveFeed.jsx`: Main live camera interface with audio alerts
- `Detection.jsx`: File/camera-based detection with video support
- `Alerts.jsx`: Centralized alert management and display
- `dashboard.jsx`: Real-time statistics
- `audioAlert.js`: Web Audio API implementation

### Backend Integration
- API calls to `/detect` endpoint
- FormData with captured frames
- Real-time response processing
- Error handling and fallbacks

### Data Flow
```
Camera → Video Frame → Canvas Capture → API Call → Detection Results → 
Alert Creation → Audio/Visual Notifications → Dashboard Update
```

## Testing

### Requirements
- Modern browser with WebRTC support
- Camera access permissions
- Backend server running on localhost:8000

### Test Scenarios
1. **Basic Functionality**: Start camera, verify video display
2. **Detection Test**: Show objects to camera, verify alerts
3. **Audio Alerts**: Confirm different sounds for severity levels
4. **Cross-page Updates**: Verify dashboard/alerts page sync
5. **Error Handling**: Test with backend offline

## Performance Notes
- Live camera detection runs at 1 FPS to balance performance and responsiveness
- Audio context initialized on first user interaction (browser requirement)
- LocalStorage limited to 50 most recent alerts
- Automatic cleanup of old notifications
- Video files support MP4 format with 10MB size limit

## Future Enhancements
- WebSocket integration for true real-time updates
- Multiple camera support
- Recording and playback functionality
- Custom alert rules and thresholds
- Advanced video analytics
- Object tracking across frames
- Mobile device optimization
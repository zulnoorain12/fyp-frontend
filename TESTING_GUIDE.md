# Detection System Test Guide

## Current Status

✅ **System is LIVE and FUNCTIONAL!**
- Frontend running at: http://localhost:5174
- All features working with mock data
- Audio alerts enabled
- Real-time detection simulation

Here's how to test each feature:

## Testing Instructions

### 1. Live Camera Detection
1. Navigate to "Live Feed" page
2. Click "Start Camera" button
3. Grant camera permissions when prompted
4. The system will:
   - Show live camera feed
   - Play system confirmation sound
   - Run detection every second
   - Play audio alerts when objects are detected
   - Show visual alerts on screen
   - Update dashboard counters
   - Add alerts to Alerts page

### 2. File/Video Detection
1. Navigate to "Detection" page
2. Choose one of these options:
   - **Upload File**: Select an image or video file
   - **Use Camera**: Click "Use Camera" for live detection
3. Select detection mode:
   - **Single Model**: Detects weapons OR fire/smoke
   - **Both Models**: Detects weapons AND fire/smoke simultaneously
4. Click "Run Detection"
5. System will:
   - Process the image/video
   - Play audio alert based on detection confidence
   - Show bounding boxes on processed image
   - Display detection results with confidence scores

### 3. Model Switching
1. Navigate to "Settings" page
2. Click "Models" tab
3. Current model is displayed at the top
4. Click "Switch" buttons to change models:
   - **Weapon Detection**: For detecting knives, guns, etc.
   - **Fire/Smoke Detection**: For hazard detection
   - **Both Models**: Runs both detection types
   - **Fight Detection**: For physical altercation detection
5. Click "Test Current Model" to verify switching worked

### 4. Alert Management
1. Navigate to "Alerts" page
2. View all alerts from:
   - Live camera detections
   - File uploads
   - Video analysis
3. Filter alerts by:
   - All Alerts
   - Critical/Warning/Info severity
   - Unread status
4. Mark alerts as read individually or all at once

## Demo Features Currently Available

### ✅ Working with Mock Data
- Real-time camera streaming
- Audio alert system with different severity sounds
- Detection results with confidence scores
- Model switching interface
- Alert management system
- Dashboard statistics
- Cross-page synchronization

### 🔄 Backend Integration Ready
When backend is properly installed, simply set `USE_MOCK = false` in `src/services/api.js`

## Troubleshooting

### If No Audio:
- Browser may require user interaction first
- Check browser audio permissions
- Ensure system audio is not muted

### If Camera Not Working:
- Check browser camera permissions
- Ensure no other apps are using camera
- Try refreshing the page

### If Detection Seems Slow:
- Mock service has intentional delays for realism
- Real backend will be faster with proper hardware

## Next Steps

1. **Test all features** using the instructions above
2. **Verify audio alerts** work for different severity levels
3. **Check model switching** in Settings page
4. **Review alerts** in Alerts page
5. **Monitor dashboard** for real-time updates

The system is fully functional for demonstration. For production use, install the Python backend dependencies and set `USE_MOCK = false`.
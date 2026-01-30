import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/LiveFeed.css';
import { apiEndpoints } from '../services/api';
import audioAlert from '../utils/audioAlert';

const LiveFeed = ({ onLogout, onNavigate, currentPage }) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  const [cameras, setCameras] = useState([
    { id: 1, name: 'Entrance', location: 'Building A - Floor 1', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 2, name: 'Parking Lot', location: 'Building A - Outdoor', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 3, name: 'Reception', location: 'Building A - Floor 1', status: 'Active', fps: 25, resolution: '1280x720' },
    { id: 4, name: 'Server Room', location: 'Building B - Floor 2', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 5, name: 'Hallway East', location: 'Building A - Floor 2', status: 'Active', fps: 25, resolution: '1280x720' },
    { id: 6, name: 'Hallway West', location: 'Building A - Floor 2', status: 'Active', fps: 30, resolution: '1920x1080' },
  ]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initialize audio on component mount
  useEffect(() => {
    audioAlert.init();
  }, []);
  
  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        
        // Play system alert for successful camera start
        await audioAlert.playSystemAlert();
        
        // Start detection interval
        startDetectionLoop();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };
  
  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      
      // Clear detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
  };
  
  // Start detection loop
  const startDetectionLoop = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(async () => {
      if (isStreaming && videoRef.current) {
        await detectFromFrame();
      }
    }, 1000); // Run detection every second
  };
  
  // Detect objects from current frame
  const detectFromFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    
    setIsDetecting(true);
    
    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob for API call
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        formData.append('camera_id', 'live_feed');
        
        try {
          const response = await apiEndpoints.detectObjects(formData);
          
          if (response.data.detections && response.data.detections.length > 0) {
            setDetectedObjects(response.data.detections);
            setLastDetectionTime(new Date());
            
            // Create alert for detected objects
            createAlertFromDetection(response.data.detections);
          } else {
            setDetectedObjects([]);
          }
        } catch (err) {
          console.error('Detection error:', err);
        } finally {
          setIsDetecting(false);
        }
      }, 'image/jpeg', 0.8);
    } catch (err) {
      console.error('Frame capture error:', err);
      setIsDetecting(false);
    }
  };
  
  // Create alert from detection
  const createAlertFromDetection = (detections) => {
    detections.forEach(async detection => {
      const severity = detection.confidence > 0.8 ? 'Critical' : detection.confidence > 0.6 ? 'Warning' : 'Info';
      
      const alert = {
        id: Date.now() + Math.random(),
        type: `${detection.class.charAt(0).toUpperCase() + detection.class.slice(1)} Detected`,
        severity: severity,
        description: `Detected ${detection.class} with ${(detection.confidence * 100).toFixed(1)}% confidence`,
        location: 'Live Camera Feed',
        time: 'Just now',
        status: 'Active',
        timestamp: new Date().toISOString()
      };
      
      // Store alert in localStorage for other components to access
      const existingAlerts = JSON.parse(localStorage.getItem('liveAlerts') || '[]');
      existingAlerts.unshift(alert);
      localStorage.setItem('liveAlerts', JSON.stringify(existingAlerts.slice(0, 50))); // Keep last 50 alerts
      
      // Play audio alert based on severity
      await audioAlert.playAlert(severity);
    });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (isStreaming) {
        stopCamera();
      }
    };
  }, []);

  return (
    <div className="livefeed-container">
      <Sidebar 
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onClose={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="livefeed-main">
        {/* Header */}
        <div className="livefeed-header">
          <div className="livefeed-header-content">
            <h1 className="livefeed-title">Live Camera Feeds</h1>
            <p className="livefeed-subtitle">Real-time monitoring from all cameras</p>
          </div>
          <div className="livefeed-view-toggle">
            <div className="view-toggle-buttons">
              <button 
                className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'list' ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="livefeed-status-banner">
          <div className="status-indicator"></div>
          <span className="status-text">
            {isStreaming ? 'Live Camera Active / Detection Running' : 'System Online / All Cameras Operational'}
          </span>
          <span className="status-count">
            {isStreaming ? (isDetecting ? 'Detecting...' : 'Live') : `${cameras.length} cameras active`}
          </span>
        </div>

        {/* Live Camera Controls */}
        <div className="p-4 bg-gray-800/50 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Live Camera Feed</h3>
              <p className="text-sm text-gray-400">Real-time detection from your device camera</p>
            </div>
            <div className="flex gap-3">
              {!isStreaming ? (
                <button 
                  onClick={startCamera}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <polygon points="23 7 7 7 7 17 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Start Camera
                </button>
              ) : (
                <button 
                  onClick={stopCamera}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Stop Camera
                </button>
              )}
              {isDetecting && (
                <div className="px-3 py-2 bg-yellow-600 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Detecting...</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Live Camera Display */}
          <div className="mt-4 relative bg-black rounded-lg overflow-hidden">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
              style={{ display: isStreaming ? 'block' : 'none' }}
            />
            {!isStreaming && (
              <div className="w-full h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none">
                    <polygon points="23 7 7 7 7 17 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <p>Click "Start Camera" to begin live feed</p>
                </div>
              </div>
            )}
            
            {/* Detection Overlay */}
            {isStreaming && detectedObjects.length > 0 && (
              <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                ALERT: {detectedObjects.length} object{detectedObjects.length > 1 ? 's' : ''} detected!
              </div>
            )}
          </div>
          
          {/* Detection Results */}
          {detectedObjects.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Recent Detections:</h4>
              <div className="flex flex-wrap gap-2">
                {detectedObjects.map((obj, index) => (
                  <div 
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      obj.confidence > 0.8 ? 'bg-red-600 text-white' :
                      obj.confidence > 0.6 ? 'bg-yellow-600 text-white' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {obj.class} ({(obj.confidence * 100).toFixed(1)}%)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Camera Grid */}
        <div className="text-lg font-semibold mb-4">Predefined Camera Feeds</div>
        <div className={`camera-grid ${viewMode === 'grid' ? 'camera-grid-view' : 'camera-list-view'}`}>
          {cameras.map((camera, index) => (
            <div 
              key={camera.id} 
              className="camera-card"
              style={{animationDelay: `${0.1 + index * 0.05}s`}}
              onClick={() => setSelectedCamera(camera)}
            >
              <div className="camera-card-header">
                <div className="camera-status">
                  <div className="camera-status-dot"></div>
                  <span>{camera.status}</span>
                </div>
                <button className="camera-menu-btn">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="5" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <div className="camera-video-container">
                <div className="camera-video-placeholder">
                  <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="camera-video-overlay">
                  <div className="camera-play-button-container">
                    <button className="camera-play-button">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="camera-card-info">
                <h3 className="camera-name">{camera.name}</h3>
                <p className="camera-location">{camera.location}</p>
                <div className="camera-specs">
                  <span className="camera-spec">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {camera.fps} FPS
                  </span>
                  <span className="camera-spec">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {camera.resolution}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {selectedCamera && (
          <div className="camera-modal-overlay" onClick={() => setSelectedCamera(null)}>
            <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
              <div className="camera-modal-header">
                <div>
                  <h2 className="camera-modal-title">{selectedCamera.name}</h2>
                  <p className="camera-modal-location">{selectedCamera.location}</p>
                </div>
                <button 
                  className="camera-modal-close"
                  onClick={() => setSelectedCamera(null)}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              <div className="camera-modal-body">
                <div className="camera-modal-video">
                  <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <div className="camera-modal-footer">
                <div className="camera-modal-stats">
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">Resolution:</span>
                    <span className="modal-stat-value">{selectedCamera.resolution}</span>
                  </div>
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">FPS:</span>
                    <span className="modal-stat-value">{selectedCamera.fps}</span>
                  </div>
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">Status:</span>
                    <span className="modal-stat-value-active">{selectedCamera.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFeed;
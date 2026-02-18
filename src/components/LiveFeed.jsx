import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/LiveFeed.css';
import { apiEndpoints } from '../services/api';
import audioAlert from '../utils/audioAlert';

const LiveFeed = ({ onLogout, onNavigate, currentPage }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentModel, setCurrentModel] = useState('weapon');
  const [availableModels, setAvailableModels] = useState([]);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  const [cameras] = useState([
    { id: 1, name: 'Entrance',      location: 'Building A - Floor 1', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 2, name: 'Parking Lot',   location: 'Building A - Outdoor', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 3, name: 'Reception',     location: 'Building A - Floor 1', status: 'Active', fps: 25, resolution: '1280x720'  },
    { id: 4, name: 'Server Room',   location: 'Building B - Floor 2', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 5, name: 'Hallway East',  location: 'Building A - Floor 2', status: 'Active', fps: 25, resolution: '1280x720'  },
    { id: 6, name: 'Hallway West',  location: 'Building A - Floor 2', status: 'Active', fps: 30, resolution: '1920x1080' },
  ]);

  useEffect(() => {
    audioAlert.init();
    const fetchModels = async () => {
      try {
        const response = await apiEndpoints.getModels();
        setCurrentModel(response.data.current_model);
        setAvailableModels(response.data.models || []);
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };
    fetchModels();
  }, []);

  const handleModelSwitch = async (newModel) => {
    setIsSwitchingModel(true);
    try {
      await apiEndpoints.switchModel(newModel);
      setCurrentModel(newModel);
    } catch (err) {
      console.error('Failed to switch model:', err);
    } finally {
      setIsSwitchingModel(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        audioAlert.playSystemAlert();
        startDetectionLoop();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
  };

  const startDetectionLoop = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = setInterval(async () => {
      if (isStreaming && videoRef.current) await detectFromFrame();
    }, 1000);
  };

  const detectFromFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    setIsDetecting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        formData.append('camera_id', 'live_feed');
        try {
          let response, allDetections = [];
          if (currentModel === 'fight') {
            response = await apiEndpoints.detectFight(formData);
            if (response.data.is_fight) {
              allDetections = [{ class: 'fight', confidence: response.data.fight_probability || response.data.confidence || 0.8 }];
            }
          } else if (currentModel === 'both') {
            response = await apiEndpoints.detectBoth(formData);
            allDetections = [...(response.data.weapon_detections || []), ...(response.data.fire_smoke_detections || [])];
          } else {
            response = await apiEndpoints.detectObjects(formData);
            allDetections = response.data.detections || [];
          }
          if (allDetections.length > 0) {
            setDetectedObjects(allDetections);
            setLastDetectionTime(new Date());
            createAlertFromDetection(allDetections);
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

  const createAlertFromDetection = (detections) => {
    detections.forEach(detection => {
      const severity = detection.confidence > 0.8 ? 'Critical' : detection.confidence > 0.6 ? 'Warning' : 'Info';
      const alert = {
        id: Date.now() + Math.random(),
        type: `${detection.class.charAt(0).toUpperCase() + detection.class.slice(1)} Detected`,
        severity,
        description: `Detected ${detection.class} with ${(detection.confidence * 100).toFixed(1)}% confidence`,
        location: 'Live Camera Feed',
        time: 'Just now',
        status: 'Active',
        timestamp: new Date().toISOString()
      };
      const existing = JSON.parse(localStorage.getItem('liveAlerts') || '[]');
      existing.unshift(alert);
      localStorage.setItem('liveAlerts', JSON.stringify(existing.slice(0, 50)));
      audioAlert.playAlert(severity);
    });
  };

  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (isStreaming) stopCamera();
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

      <div className="livefeed-main">

        {/* ── Header ─────────────────────────────────────────
            Mobile  : hamburger + toggle on top row, title below
            Desktop : title left, toggle right — single row
        ──────────────────────────────────────────────────── */}
        <div className="livefeed-header">

          {/* Mobile-only top bar */}
          <div className="livefeed-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="livefeed-menu-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Toggle buttons also shown on mobile top bar */}
            <div className="view-toggle-buttons">
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                  <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile title (below the bar) */}
          <div className="livefeed-title-mobile">
            <h1 className="livefeed-title">Live Camera Feeds</h1>
            <p className="livefeed-subtitle">Real-time monitoring from all cameras</p>
          </div>

          {/* Desktop: title left, toggle right */}
          <div className="livefeed-desktop-row">
            <div className="livefeed-header-content">
              <h1 className="livefeed-title">Live Camera Feeds</h1>
              <p className="livefeed-subtitle">Real-time monitoring from all cameras</p>
            </div>
            <div className="view-toggle-buttons">
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>

        </div>

        {/* ── Status Banner ─── */}
        <div className="livefeed-status-banner">
          <div className="status-indicator"></div>
          <span className="status-text">
            {isStreaming ? 'Live Camera Active / Detection Running' : 'System Online / All Cameras Operational'}
          </span>
          <span className="status-count">
            {isStreaming ? (isDetecting ? 'Detecting...' : 'Live') : `${cameras.length} cameras active`}
          </span>
        </div>

        {/* ── Live Camera Controls ─── */}
        <div className="livefeed-controls-card">

          {/* Title + Start/Stop row */}
          <div className="livefeed-controls-header">
            <div className="min-w-0">
              <h3 className="livefeed-controls-title">Live Camera Feed</h3>
              <p className="livefeed-controls-subtitle">Real-time detection from your device camera</p>
            </div>
            <div className="livefeed-controls-actions">
              {!isStreaming ? (
                <button onClick={startCamera} className="livefeed-btn-start">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <polygon points="23 7 7 7 7 17 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Start Camera</span>
                </button>
              ) : (
                <button onClick={stopCamera} className="livefeed-btn-stop">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Stop Camera</span>
                </button>
              )}
              {isDetecting && (
                <div className="livefeed-detecting-badge">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0"></div>
                  <span>Detecting…</span>
                </div>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div className="livefeed-model-row">
            <label className="livefeed-model-label">Detection Model:</label>
            <div className="livefeed-model-select-wrap">
              <select
                value={currentModel}
                onChange={(e) => handleModelSwitch(e.target.value)}
                disabled={isSwitchingModel}
                className="livefeed-model-select"
              >
                {availableModels.filter(m => m !== 'both').map((model) => (
                  <option key={model} value={model}>
                    {model === 'weapon'     ? '🔫 Weapon Detection'      :
                     model === 'fire_smoke' ? '🔥 Fire/Smoke Detection'  :
                     model === 'fight'      ? '👊 Fight Detection'        : model}
                  </option>
                ))}
                <option value="both">🔄 All Models (Weapon + Fire/Smoke)</option>
              </select>
              {isSwitchingModel && <span className="livefeed-switching-label">Switching…</span>}
            </div>
          </div>

          {/* Video display */}
          <div className="livefeed-video-wrap">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="livefeed-video"
              style={{ display: isStreaming ? 'block' : 'none' }}
            />
            {!isStreaming && (
              <div className="livefeed-video-placeholder">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none">
                  <polygon points="23 7 7 7 7 17 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
                <p className="text-sm sm:text-base">Click "Start Camera" to begin live feed</p>
              </div>
            )}
            {isStreaming && detectedObjects.length > 0 && (
              <div className="livefeed-alert-overlay">
                ALERT: {detectedObjects.length} object{detectedObjects.length > 1 ? 's' : ''} detected!
              </div>
            )}
          </div>

          {/* Detection results */}
          {detectedObjects.length > 0 && (
            <div className="livefeed-detections">
              <h4 className="livefeed-detections-title">Recent Detections:</h4>
              <div className="livefeed-detections-list">
                {detectedObjects.map((obj, index) => (
                  <div
                    key={index}
                    className={`livefeed-detection-tag ${
                      obj.confidence > 0.8 ? 'bg-red-600' :
                      obj.confidence > 0.6 ? 'bg-yellow-600' : 'bg-blue-600'
                    } text-white`}
                  >
                    {obj.class} ({(obj.confidence * 100).toFixed(1)}%)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Camera Grid ─── */}
        <div className="livefeed-section-title">Predefined Camera Feeds</div>
        <div className={`camera-grid ${viewMode === 'grid' ? 'camera-grid-view' : 'camera-list-view'}`}>
          {cameras.map((camera, index) => (
            <div
              key={camera.id}
              className="camera-card"
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              onClick={() => setSelectedCamera(camera)}
            >
              <div className="camera-card-header">
                <div className="camera-status">
                  <div className="camera-status-dot"></div>
                  <span>{camera.status}</span>
                </div>
                <button className="camera-menu-btn" onClick={(e) => e.stopPropagation()}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="5"  r="1" fill="currentColor" />
                    <circle cx="12" cy="19" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>

              <div className="camera-video-container">
                <div className="camera-video-placeholder">
                  <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <div className="camera-video-overlay">
                  <div className="camera-play-button-container">
                    <button className="camera-play-button">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
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
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {camera.fps} FPS
                  </span>
                  <span className="camera-spec">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {camera.resolution}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Modal ─── */}
        {selectedCamera && (
          <div className="camera-modal-overlay" onClick={() => setSelectedCamera(null)}>
            <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
              <div className="camera-modal-header">
                <div className="min-w-0">
                  <h2 className="camera-modal-title">{selectedCamera.name}</h2>
                  <p className="camera-modal-location">{selectedCamera.location}</p>
                </div>
                <button className="camera-modal-close" onClick={() => setSelectedCamera(null)}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6"  x2="6"  y2="18" stroke="currentColor" strokeWidth="2" />
                    <line x1="6"  y1="6"  x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </div>
              <div className="camera-modal-body">
                <div className="camera-modal-video">
                  <svg className="w-16 h-16 sm:w-24 sm:h-24" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="camera-modal-footer">
                <div className="camera-modal-stats">
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">Resolution</span>
                    <span className="modal-stat-value">{selectedCamera.resolution}</span>
                  </div>
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">FPS</span>
                    <span className="modal-stat-value">{selectedCamera.fps}</span>
                  </div>
                  <div className="modal-stat-item">
                    <span className="modal-stat-label">Status</span>
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

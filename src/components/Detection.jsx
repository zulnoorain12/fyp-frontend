import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/LiveFeed.css';
import '../styles/Detection.css';
import { apiEndpoints } from '../services/api';
import audioAlert from '../utils/audioAlert';

const Detection = ({ onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelType, setModelType] = useState('single');
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [currentModel, setCurrentModel] = useState('weapon');
  const [availableModels, setAvailableModels] = useState([]);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);

  useEffect(() => {
    audioAlert.init();
    const fetchCurrentModel = async () => {
      try {
        const response = await apiEndpoints.getModels();
        setCurrentModel(response.data.current_model);
        setAvailableModels(response.data.models || []);
      } catch (err) {
        console.error('Failed to fetch current model:', err);
      }
    };
    fetchCurrentModel();
    const modelCheckInterval = setInterval(fetchCurrentModel, 5000);
    return () => {
      clearInterval(modelCheckInterval);
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    const isVideo = file.type.startsWith('video/');
    setIsVideoMode(isVideo);
    if (isVideo) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      streamRef.current = stream;
      setIsCameraActive(true);
      setIsVideoMode(true);
      setSelectedFile(new File([], 'live_camera', { type: 'video/webm' }));
      audioAlert.playSystemAlert();
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      startDetectionLoop();
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isCameraActive]);

  const startDetectionLoop = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = setInterval(() => detectFromCamera(), 1500);
  };

  const detectFromCamera = async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;
    setIsDetecting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      formData.append('camera_id', 'live_detection');
      let response, allDetections = [];
      if (currentModel === 'fight') {
        response = await apiEndpoints.detectFight(formData);
        if (response.data.is_fight) allDetections = [{ class: 'fight', confidence: response.data.fight_probability || 0.8, box: response.data.box || {} }];
      } else if (modelType === 'both') {
        response = await apiEndpoints.detectBoth(formData);
        setDetectionResult(response.data);
        allDetections = [...(response.data.weapon_detections || []), ...(response.data.fire_smoke_detections || [])];
      } else {
        formData.append('model_type', currentModel);
        response = await apiEndpoints.detectObjects(formData);
        allDetections = response.data.detections || [];
      }
      if (modelType !== 'both') {
        if (currentModel === 'fight') {
          setDetectionResult({
            detections: allDetections,
            image: response.data.image,
            model_used: 'fight',
            fight_probability: response.data.fight_probability,
            is_fight: response.data.is_fight,
            message: response.data.message
          });
        } else {
          setDetectionResult(response.data);
        }
      }
      if (allDetections.length > 0) {
        const max = Math.max(...allDetections.map(d => d.confidence));
        audioAlert.playAlert(max > 0.8 ? 'Critical' : max > 0.6 ? 'Warning' : 'Info');
      }
    } catch (err) {
      console.error('Camera detection error:', err);
    } finally {
      isDetectingRef.current = false;
      setIsDetecting(false);
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) { clearInterval(detectionIntervalRef.current); detectionIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setIsCameraActive(false);
    setIsDetecting(false);
    setIsVideoMode(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) { setError('Please select a file or start camera first'); return; }
    setIsLoading(true);
    setError(null);
    setDetectionResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('camera_id', isVideoMode ? 'live_video' : 'web_upload');
      let response;
      let allDetections = [];

      if (currentModel === 'fight' && modelType === 'single') {
        // Fight detection uses a different API endpoint (pose estimation + LSTM)
        response = await apiEndpoints.detectFight(formData);
        if (response.data.is_fight) {
          allDetections = [{ class: 'fight', confidence: response.data.fight_probability || 0.8, box: response.data.box || {} }];
        }
        // Format fight result to match standard detection result structure
        setDetectionResult({
          detections: allDetections,
          image: response.data.image, // annotated image with pose skeleton + bounding box
          model_used: 'fight',
          fight_probability: response.data.fight_probability,
          no_fight_probability: response.data.no_fight_probability,
          is_fight: response.data.is_fight,
          message: response.data.message || (response.data.is_fight ? 'Fight detected!' : 'No fight detected')
        });
      } else if (modelType === 'both') {
        response = await apiEndpoints.detectBoth(formData);
        setDetectionResult(response.data);
        allDetections = [
          ...(response.data.weapon_detections || []),
          ...(response.data.fire_smoke_detections || []),
        ];
      } else {
        formData.append('model_type', currentModel);
        response = await apiEndpoints.detectObjects(formData);
        setDetectionResult(response.data);
        allDetections = response.data.detections || [];
      }

      if (allDetections.length > 0) {
        const max = Math.max(...allDetections.map(d => d.confidence));
        audioAlert.playAlert(max > 0.8 ? 'Critical' : max > 0.6 ? 'Warning' : 'Info');
      }
    } catch (err) {
      console.error('Detection error:', err);
      setError(err.response?.data?.error || err.message || 'Detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDetectionResult(null);
    setError(null);
    setIsVideoMode(false);
    const fi = document.getElementById('fileInput');
    if (fi) fi.value = '';
    if (streamRef.current) stopCamera();
  };

  /* Live overlay label */
  const liveOverlayText = () => {
    if (!detectionResult) return null;
    const count =
      (detectionResult.detections || []).length +
      (detectionResult.weapon_detections || []).length +
      (detectionResult.fire_smoke_detections || []).length;
    return count > 0 ? `⚠️ ${count} object${count > 1 ? 's' : ''} detected!` : '✅ No threats';
  };

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

        {/* ── Header ─────────────────────────────────────── */}
        <div className="detection-header">

          {/* Mobile: hamburger */}
          <div className="detection-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="detection-menu-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile title */}
          <div className="detection-title-mobile">
            <h1 className="livefeed-title">Object Detection</h1>
            <p className="livefeed-subtitle">Upload images or videos for AI-powered detection</p>
          </div>

          {/* Desktop title */}
          <div className="detection-desktop-row">
            <h1 className="livefeed-title">Object Detection</h1>
            <p className="livefeed-subtitle">Upload images or videos for AI-powered detection</p>
          </div>

        </div>

        {/* ── Status Banner ─── */}
        <div className="livefeed-status-banner">
          <div className="status-indicator"></div>
          <span className="status-text">Ready for detection</span>
        </div>

        {/* ── Two-panel body ─── */}
        <div className="detection-body">

          {/* ── Upload Panel ─── */}
          <div className="detection-panel">
            <h2 className="detection-panel-title">Upload Media</h2>

            <form onSubmit={handleSubmit}>

              {/* Detection Mode */}
              <div className="detection-mode-group">
                <label className="detection-mode-label">Detection Mode</label>
                <div className="detection-mode-options">
                  <label className="detection-radio-label">
                    <input type="radio" name="modelType" value="single"
                      checked={modelType === 'single'} onChange={(e) => setModelType(e.target.value)} />
                    Single Model
                  </label>
                  <label className="detection-radio-label">
                    <input type="radio" name="modelType" value="both"
                      checked={modelType === 'both'} onChange={(e) => setModelType(e.target.value)} />
                    Both Models
                  </label>
                </div>
              </div>

              {/* Model Selector */}
              {modelType === 'single' && (
                <div className="detection-model-group">
                  <label className="detection-mode-label">Active Model</label>
                  <select
                    value={currentModel}
                    onChange={(e) => handleModelSwitch(e.target.value)}
                    disabled={isSwitchingModel}
                    className="detection-select"
                  >
                    {availableModels.filter(m => m !== 'both').map((model) => (
                      <option key={model} value={model}>
                        {model === 'weapon' ? '🔫 Weapon Detection' :
                          model === 'fire_smoke' ? '🔥 Fire/Smoke Detection' :
                            model === 'fight' ? '👊 Fight Detection' : model}
                      </option>
                    ))}
                  </select>
                  {isSwitchingModel
                    ? <p className="detection-switching-hint">Switching model…</p>
                    : <p className="detection-model-hint">Select the model that matches your image content</p>
                  }
                </div>
              )}

              {/* File Input + Camera buttons */}
              <div className="detection-file-group">
                <label className="detection-mode-label">Select Image/Video or Use Camera</label>
                <div className="detection-file-row">
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="detection-file-input"
                  />
                  {!isVideoMode ? (
                    <button type="button" onClick={startCamera} className="detection-btn-camera">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <polygon points="23 7 7 7 7 17 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span>Use Camera</span>
                    </button>
                  ) : (
                    <button type="button" onClick={stopCamera} className="detection-btn-stop">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span>Stop Camera</span>
                    </button>
                  )}
                </div>
                <p className="detection-file-hint">Supports JPG, PNG, MP4 files (max 10MB) or live camera feed</p>
              </div>

              {/* Live Camera Feed */}
              {isCameraActive && (
                <div className="detection-live-section">
                  <div className="detection-live-header">
                    <label className="detection-live-label">Live Camera Feed</label>
                    {isDetecting && (
                      <div className="detection-detecting-badge">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shrink-0"></div>
                        Detecting…
                      </div>
                    )}
                  </div>
                  <div className="detection-live-wrap">
                    <video ref={videoRef} autoPlay playsInline muted className="detection-video" />
                    {detectionResult && isCameraActive && (
                      <div className="detection-live-overlay">{liveOverlayText()}</div>
                    )}
                  </div>
                  <p className="detection-live-hint">Real-time detection running every 1.5 seconds</p>
                </div>
              )}

              {/* File Preview */}
              {previewUrl && !isCameraActive && (
                <div className="detection-preview-section">
                  <label className="detection-preview-label">Preview</label>
                  <div className="detection-preview-wrap">
                    {selectedFile?.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Preview" className="detection-preview-img" />
                    ) : (
                      <video src={previewUrl} controls className="detection-preview-video" />
                    )}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="detection-form-actions">
                {!isCameraActive ? (
                  <button type="submit" disabled={isLoading || !selectedFile} className="detection-btn-run">
                    {isLoading ? 'Processing…' : 'Run Detection'}
                  </button>
                ) : (
                  <div className="detection-btn-auto">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></div>
                    Auto-detecting in real-time
                  </div>
                )}
                <button type="button" onClick={handleReset} className="detection-btn-reset">
                  Reset
                </button>
              </div>

            </form>

            {error && <div className="detection-error">Error: {error}</div>}
          </div>

          {/* ── Results Panel ─── */}
          <div className="detection-panel">
            <h2 className="detection-panel-title">Detection Results</h2>

            {!detectionResult && !isLoading && (
              <div className="detection-empty">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
                <p className="text-sm">Results will appear here after detection</p>
              </div>
            )}

            {isLoading && (
              <div className="detection-loading">
                <div className="detection-spinner"></div>
                <p className="text-gray-400 text-sm">Analyzing image…</p>
              </div>
            )}

            {detectionResult && (
              <div>
                {/* Standard detections */}
                {(detectionResult.detections || []).length > 0 && (
                  <div className="detection-results-group">
                    <h3 className="detection-results-heading">Detections Found:</h3>
                    <div className="detection-results-list">
                      {detectionResult.detections.map((d, i) => (
                        <div key={i} className="detection-result-item">
                          <div className="detection-result-row">
                            <span className="detection-result-class">{d.class}</span>
                            <span className="detection-result-confidence">{(d.confidence * 100).toFixed(1)}%</span>
                          </div>
                          {d.box && (
                            <div className="detection-result-box">
                              Box: [{Object.values(d.box).map(n => typeof n === 'number' ? n.toFixed(0) : n).join(', ')}]
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weapon detections */}
                {(detectionResult.weapon_detections || []).length > 0 && (
                  <div className="detection-results-group">
                    <h4 className="detection-sub-heading-weapon">Weapon Detections:</h4>
                    <div className="detection-results-list">
                      {detectionResult.weapon_detections.map((d, i) => (
                        <div key={`w-${i}`} className="detection-result-item-weapon">
                          <div className="detection-result-row">
                            <span className="detection-result-class">{d.class}</span>
                            <span className="detection-confidence-weapon">{(d.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fire/smoke detections */}
                {(detectionResult.fire_smoke_detections || []).length > 0 && (
                  <div className="detection-results-group">
                    <h4 className="detection-sub-heading-fire">Fire/Smoke Detections:</h4>
                    <div className="detection-results-list">
                      {detectionResult.fire_smoke_detections.map((d, i) => (
                        <div key={`f-${i}`} className="detection-result-item-fire">
                          <div className="detection-result-row">
                            <span className="detection-result-class">{d.class}</span>
                            <span className="detection-confidence-fire">{(d.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processed images */}
                {detectionResult.image && (
                  <div className="detection-image-section">
                    <h3 className="detection-image-heading">Processed Image:</h3>
                    <div className="detection-image-wrap">
                      <img src={`data:image/jpeg;base64,${detectionResult.image}`} alt="Detection result" className="detection-result-img" />
                    </div>
                  </div>
                )}

                {detectionResult.weapon_image && (
                  <div className="detection-image-section">
                    <h3 className="detection-image-heading-weapon">Weapon Detection Result:</h3>
                    <div className="detection-image-wrap-weapon">
                      <img src={`data:image/jpeg;base64,${detectionResult.weapon_image}`} alt="Weapon result" className="detection-result-img" />
                    </div>
                  </div>
                )}

                {detectionResult.fire_smoke_image && (
                  <div className="detection-image-section">
                    <h3 className="detection-image-heading-fire">Fire/Smoke Detection Result:</h3>
                    <div className="detection-image-wrap-fire">
                      <img src={`data:image/jpeg;base64,${detectionResult.fire_smoke_image}`} alt="Fire/Smoke result" className="detection-result-img" />
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Detection;

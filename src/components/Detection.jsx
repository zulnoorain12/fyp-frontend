import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/LiveFeed.css';
import { apiEndpoints } from '../services/api';
import audioAlert from '../utils/audioAlert';

const Detection = ({ onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelType, setModelType] = useState('single'); // 'single' or 'both'
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [currentModel, setCurrentModel] = useState('weapon'); // Track current model
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Initialize audio on component mount
  useEffect(() => {
    audioAlert.init();
    
    // Fetch current model on component mount
    const fetchCurrentModel = async () => {
      try {
        const response = await apiEndpoints.getModels();
        setCurrentModel(response.data.current_model);
      } catch (err) {
        console.error('Failed to fetch current model:', err);
      }
    };
    
    fetchCurrentModel();
    
    // Set up interval to periodically check for model changes
    const modelCheckInterval = setInterval(fetchCurrentModel, 5000); // Check every 5 seconds
    
    // Cleanup function
    return () => {
      clearInterval(modelCheckInterval);
      // Cleanup video stream on unmount
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      // Check if it's a video file
      const isVideo = file.type.startsWith('video/');
      setIsVideoMode(isVideo);
      
      if (isVideo) {
        // For video files, create object URL
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        // For image files, use FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  
  // Start camera for live video detection
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoMode(true);
        setSelectedFile(new File([stream], 'live_camera', { type: 'video/webm' }));
        
        // Play system alert
        await audioAlert.playSystemAlert();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoMode(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file or start camera first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDetectionResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('camera_id', isVideoMode ? 'live_video' : 'web_upload');
      
      let response;
      if (modelType === 'both') {
        response = await apiEndpoints.detectBoth(formData);
      } else {
        // Add model_type to form data for single model detection
        formData.append('model_type', currentModel);
        response = await apiEndpoints.detectObjects(formData);
      }

      setDetectionResult(response.data);
      
      // Play audio alert if detections found
      if (response.data.detections && response.data.detections.length > 0) {
        const maxConfidence = Math.max(...response.data.detections.map(d => d.confidence));
        const severity = maxConfidence > 0.8 ? 'Critical' : maxConfidence > 0.6 ? 'Warning' : 'Info';
        await audioAlert.playAlert(severity);
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
    document.getElementById('fileInput').value = '';
    
    // Stop camera if active
    if (streamRef.current) {
      stopCamera();
    }
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
        {/* Header */}
        <div className="livefeed-header">
          <div className="livefeed-header-content">
            <h1 className="livefeed-title">Object Detection</h1>
            <p className="livefeed-subtitle">Upload images or videos for AI-powered detection</p>
          </div>
        </div>

        <div className="livefeed-status-banner">
          <div className="status-indicator"></div>
          <span className="status-text">Ready for detection</span>
        </div>

        <div className="flex gap-6 p-6">
          {/* Upload Panel */}
          <div className="w-1/2 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Media</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Detection Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="modelType"
                      value="single"
                      checked={modelType === 'single'}
                      onChange={(e) => setModelType(e.target.value)}
                      className="mr-2"
                    />
                    Single Model
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="modelType"
                      value="both"
                      checked={modelType === 'both'}
                      onChange={(e) => setModelType(e.target.value)}
                      className="mr-2"
                    />
                    Both Models
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select Image/Video or Use Camera
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded"
                  />
                  {!isVideoMode ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <polygon points="23 7 7 7 7 17 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      Use Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      Stop Camera
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Supports JPG, PNG, MP4 files (max 10MB) or live camera feed
                </p>
              </div>

              {previewUrl && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {isVideoMode ? 'Live Camera Feed' : 'Preview'}
                  </label>
                  <div className="border border-gray-600 rounded p-2 bg-black">
                    {isVideoMode ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="max-w-full max-h-64 mx-auto"
                      />
                    ) : selectedFile.type.startsWith('image/') ? (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-64 mx-auto"
                      />
                    ) : (
                      <video
                        src={previewUrl}
                        controls
                        className="max-w-full max-h-64 mx-auto"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading || !selectedFile}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 px-4 rounded transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Run Detection'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300">
                Error: {error}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="w-1/2 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Detection Results</h2>
            
            {!detectionResult && !isLoading && (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <p>Results will appear here after detection</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-400">Analyzing image...</p>
              </div>
            )}

            {detectionResult && (
              <div>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Detections Found:</h3>
                  <div className="space-y-2">
                    {(detectionResult.detections || []).map((detection, index) => (
                      <div key={index} className="bg-gray-700 p-3 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">{detection.class}</span>
                          <span className="text-green-400">
                            {(detection.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          Box: [{detection.box.map(n => n.toFixed(0)).join(', ')}]
                        </div>
                      </div>
                    ))}
                    
                    {/* For dual model detection */}
                    {(detectionResult.weapon_detections || []).length > 0 && (
                      <div>
                        <h4 className="font-medium mt-3 mb-2 text-red-400">Weapon Detections:</h4>
                        {detectionResult.weapon_detections.map((detection, index) => (
                          <div key={`weapon-${index}`} className="bg-red-900/30 p-3 rounded border border-red-700">
                            <div className="flex justify-between">
                              <span className="font-medium capitalize">{detection.class}</span>
                              <span className="text-red-400">
                                {(detection.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(detectionResult.fire_smoke_detections || []).length > 0 && (
                      <div>
                        <h4 className="font-medium mt-3 mb-2 text-blue-400">Fire/Smoke Detections:</h4>
                        {detectionResult.fire_smoke_detections.map((detection, index) => (
                          <div key={`fire-${index}`} className="bg-blue-900/30 p-3 rounded border border-blue-700">
                            <div className="flex justify-between">
                              <span className="font-medium capitalize">{detection.class}</span>
                              <span className="text-blue-400">
                                {(detection.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {detectionResult.image && (
                  <div>
                    <h3 className="font-medium mb-2">Processed Image:</h3>
                    <div className="border border-gray-600 rounded p-2 bg-black">
                      <img 
                        src={`data:image/jpeg;base64,${detectionResult.image}`}
                        alt="Detection result"
                        className="max-w-full"
                      />
                    </div>
                  </div>
                )}

                {/* For dual model - show both images */}
                {detectionResult.weapon_image && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2 text-red-400">Weapon Detection Result:</h3>
                    <div className="border border-red-700 rounded p-2 bg-black">
                      <img 
                        src={`data:image/jpeg;base64,${detectionResult.weapon_image}`}
                        alt="Weapon detection result"
                        className="max-w-full"
                      />
                    </div>
                  </div>
                )}

                {detectionResult.fire_smoke_image && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2 text-blue-400">Fire/Smoke Detection Result:</h3>
                    <div className="border border-blue-700 rounded p-2 bg-black">
                      <img 
                        src={`data:image/jpeg;base64,${detectionResult.fire_smoke_image}`}
                        alt="Fire/Smoke detection result"
                        className="max-w-full"
                      />
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

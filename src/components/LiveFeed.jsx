import React, { useState } from 'react';
import Sidebar from './Sidebar';
import '../styles/LiveFeed.css';

const LiveFeed = ({ onLogout, onNavigate, currentPage }) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCamera, setSelectedCamera] = useState(null);

  const [cameras] = useState([
    { id: 1, name: 'Entrance', location: 'Building A - Floor 1', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 2, name: 'Parking Lot', location: 'Building A - Outdoor', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 3, name: 'Reception', location: 'Building A - Floor 1', status: 'Active', fps: 25, resolution: '1280x720' },
    { id: 4, name: 'Server Room', location: 'Building B - Floor 2', status: 'Active', fps: 30, resolution: '1920x1080' },
    { id: 5, name: 'Hallway East', location: 'Building A - Floor 2', status: 'Active', fps: 25, resolution: '1280x720' },
    { id: 6, name: 'Hallway West', location: 'Building A - Floor 2', status: 'Active', fps: 30, resolution: '1920x1080' },
  ]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="livefeed-container">
      <Sidebar 
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
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
          <span className="status-text">System Online / All Cameras Operational</span>
          <span className="status-count">{cameras.length} cameras active</span>
        </div>

        {/* Camera Grid */}
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
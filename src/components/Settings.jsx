import React, { useState } from 'react';
import Sidebar from './Sidebar';
import '../styles/Settings.css';

const Settings = ({ onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    alertSound: true
  });

  const [detectionSettings, setDetectionSettings] = useState({
    motionDetection: true,
    objectDetection: true,
    poseEstimation: true,
    behaviorAnalysis: true,
    fireDetection: true,
    weaponDetection: true
  });

  const [alertThresholds, setAlertThresholds] = useState({
    detectionConfidence: 75,
    behaviorConfidence: 80,
    alertCooldown: 30
  });

  const [systemSettings, setSystemSettings] = useState({
    recordingEnabled: true,
    autoArchive: true,
    retentionDays: 30,
    storageLimit: 100
  });

  const handleNotificationToggle = (key) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDetectionToggle = (key) => {
    setDetectionSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSystemToggle = (key) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleThresholdChange = (key, value) => {
    setAlertThresholds(prev => ({
      ...prev,
      [key]: parseInt(value)
    }));
  };

  return (
    <div className="settings-container">
      <Sidebar 
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="settings-main">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-content">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Configure your surveillance system</p>
          </div>
          <button className="settings-save-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2"/>
              <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Save Changes</span>
          </button>
        </div>

        <div className="settings-status-banner">
          <div className="settings-status-indicator"></div>
          <span className="settings-status-text">System Online / All cameras operational</span>
        </div>

        {/* Settings Tabs */}
        <div className="settings-tabs">
          {[
            { id: 'notifications', label: 'Notifications', icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )},
            { id: 'detection', label: 'Detection', icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )},
            { id: 'thresholds', label: 'Thresholds', icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <line x1="4" y1="21" x2="4" y2="14" stroke="currentColor" strokeWidth="2"/>
                <line x1="4" y1="10" x2="4" y2="3" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
                <line x1="20" y1="21" x2="20" y2="16" stroke="currentColor" strokeWidth="2"/>
                <line x1="20" y1="12" x2="20" y2="3" stroke="currentColor" strokeWidth="2"/>
                <line x1="1" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2"/>
                <line x1="17" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )},
            { id: 'system', label: 'System', icon: (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 1v6m0 6v6m8.66-15.66l-4.24 4.24m-4.24 4.24l-4.24 4.24M23 12h-6m-6 0H1m19.66 3.66l-4.24-4.24m-4.24-4.24l-4.24-4.24" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab ${activeTab === tab.id ? 'settings-tab-active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Alert Preferences</h3>
                  <p className="settings-card-description">Manage how you receive notifications</p>
                </div>
                <div className="settings-items">
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Email Alerts</h4>
                      <p className="settings-item-description">Receive alerts via email</p>
                    </div>
                    <button 
                      className={`toggle-button ${notificationSettings.emailAlerts ? 'toggle-active' : ''}`}
                      onClick={() => handleNotificationToggle('emailAlerts')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Push Notifications</h4>
                      <p className="settings-item-description">Receive browser notifications</p>
                    </div>
                    <button 
                      className={`toggle-button ${notificationSettings.pushNotifications ? 'toggle-active' : ''}`}
                      onClick={() => handleNotificationToggle('pushNotifications')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">SMS Alerts</h4>
                      <p className="settings-item-description">Receive critical alerts via SMS</p>
                    </div>
                    <button 
                      className={`toggle-button ${notificationSettings.smsAlerts ? 'toggle-active' : ''}`}
                      onClick={() => handleNotificationToggle('smsAlerts')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Alert Sound</h4>
                      <p className="settings-item-description">Play sound for new alerts</p>
                    </div>
                    <button 
                      className={`toggle-button ${notificationSettings.alertSound ? 'toggle-active' : ''}`}
                      onClick={() => handleNotificationToggle('alertSound')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detection Tab */}
          {activeTab === 'detection' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Detection Modules</h3>
                  <p className="settings-card-description">Configure AI-driven detection behaviors</p>
                </div>
                <div className="settings-items">
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Motion Detection</h4>
                      <p className="settings-item-description">Detect movement in camera feeds</p>
                    </div>
                    <button 
                      className={`toggle-button ${detectionSettings.motionDetection ? 'toggle-active' : ''}`}
                      onClick={() => handleDetectionToggle('motionDetection')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Object Detection (YOLOv11)</h4>
                      <p className="settings-item-description">Detect persons and objects in real-time</p>
                    </div>
                    <button 
                      className={`toggle-button ${detectionSettings.objectDetection ? 'toggle-active' : ''}`}
                      onClick={() => handleDetectionToggle('objectDetection')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Pose Estimation (BlazePose)</h4>
                      <p className="settings-item-description">Extract 33 body keypoints for analysis</p>
                    </div>
                    <button 
                      className={`toggle-button ${detectionSettings.poseEstimation ? 'toggle-active' : ''}`}
                      onClick={() => handleDetectionToggle('poseEstimation')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Behavior Analysis</h4>
                      <p className="settings-item-description">Classify suspicious behaviors using Random Forest</p>
                    </div>
                    <button 
                      className={`toggle-button ${detectionSettings.behaviorAnalysis ? 'toggle-active' : ''}`}
                      onClick={() => handleDetectionToggle('behaviorAnalysis')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Fire/Smoke Detection</h4>
                      <p className="settings-item-description">Detect fire and smoke hazards</p>
                    </div>
                    <button 
                      className={`toggle-button ${detectionSettings.fireDetection ? 'toggle-active' : ''}`}
                      onClick={() => handleDetectionToggle('fireDetection')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Weapon Detection</h4>
                      <p className="settings-item-description">Identify weapons in camera feeds</p>
                    </div>
                    <button 
                      className={`toggle-button ${detectionSettings.weaponDetection ? 'toggle-active' : ''}`}
                      onClick={() => handleDetectionToggle('weaponDetection')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thresholds Tab */}
          {activeTab === 'thresholds' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Confidence Thresholds</h3>
                  <p className="settings-card-description">Adjust detection sensitivity and alert parameters</p>
                </div>
                <div className="settings-items">
                  <div className="settings-slider-item">
                    <div className="settings-slider-header">
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">Detection Confidence</h4>
                        <p className="settings-item-description">Minimum confidence for object detection</p>
                      </div>
                      <span className="settings-slider-value">{alertThresholds.detectionConfidence}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={alertThresholds.detectionConfidence}
                      onChange={(e) => handleThresholdChange('detectionConfidence', e.target.value)}
                      className="settings-slider"
                    />
                  </div>

                  <div className="settings-slider-item">
                    <div className="settings-slider-header">
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">Behavior Confidence</h4>
                        <p className="settings-item-description">Minimum confidence for behavior classification</p>
                      </div>
                      <span className="settings-slider-value">{alertThresholds.behaviorConfidence}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={alertThresholds.behaviorConfidence}
                      onChange={(e) => handleThresholdChange('behaviorConfidence', e.target.value)}
                      className="settings-slider"
                    />
                  </div>

                  <div className="settings-slider-item">
                    <div className="settings-slider-header">
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">Alert Cooldown</h4>
                        <p className="settings-item-description">Minimum seconds between duplicate alerts</p>
                      </div>
                      <span className="settings-slider-value">{alertThresholds.alertCooldown}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="120" 
                      value={alertThresholds.alertCooldown}
                      onChange={(e) => handleThresholdChange('alertCooldown', e.target.value)}
                      className="settings-slider"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">System Configuration</h3>
                  <p className="settings-card-description">Manage recording and storage settings</p>
                </div>
                <div className="settings-items">
                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Recording Enabled</h4>
                      <p className="settings-item-description">Save video recordings of detections</p>
                    </div>
                    <button 
                      className={`toggle-button ${systemSettings.recordingEnabled ? 'toggle-active' : ''}`}
                      onClick={() => handleSystemToggle('recordingEnabled')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Auto Archive</h4>
                      <p className="settings-item-description">Automatically archive old recordings</p>
                    </div>
                    <button 
                      className={`toggle-button ${systemSettings.autoArchive ? 'toggle-active' : ''}`}
                      onClick={() => handleSystemToggle('autoArchive')}
                    >
                      <span className="toggle-slider"></span>
                    </button>
                  </div>

                  <div className="settings-info-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Data Retention Period</h4>
                      <p className="settings-item-description">Keep recordings for {systemSettings.retentionDays} days</p>
                    </div>
                    <div className="settings-input-container">
                      <input 
                        type="number"
                        min="7"
                        max="365"
                        value={systemSettings.retentionDays}
                        onChange={(e) => setSystemSettings({...systemSettings, retentionDays: parseInt(e.target.value)})}
                        className="settings-input"
                      />
                      <span className="settings-input-suffix">days</span>
                    </div>
                  </div>

                  <div className="settings-info-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Storage Limit</h4>
                      <p className="settings-item-description">Maximum storage allocation</p>
                    </div>
                    <div className="settings-input-container">
                      <input 
                        type="number"
                        min="10"
                        max="1000"
                        value={systemSettings.storageLimit}
                        onChange={(e) => setSystemSettings({...systemSettings, storageLimit: parseInt(e.target.value)})}
                        className="settings-input"
                      />
                      <span className="settings-input-suffix">GB</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Danger Zone</h3>
                  <p className="settings-card-description">Irreversible actions</p>
                </div>
                <div className="settings-danger-actions">
                  <button className="settings-danger-btn">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Clear All Data
                  </button>
                  <button className="settings-danger-btn">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                      <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2"/>
                      <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
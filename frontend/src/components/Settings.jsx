import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/Settings.css';
import { apiEndpoints } from '../services/api';

const Settings = ({ onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true, pushNotifications: true, smsAlerts: false, alertSound: true
  });

  const [detectionSettings, setDetectionSettings] = useState({
    motionDetection: true, objectDetection: true, poseEstimation: true,
    behaviorAnalysis: true, fireDetection: true, weaponDetection: true
  });

  const [alertThresholds, setAlertThresholds] = useState({
    detectionConfidence: 75, behaviorConfidence: 80, alertCooldown: 30
  });

  const [systemSettings, setSystemSettings] = useState({
    recordingEnabled: true, autoArchive: true, retentionDays: 30, storageLimit: 100
  });

  const handleNotificationToggle = (key) => setNotificationSettings(p => ({ ...p, [key]: !p[key] }));
  const handleDetectionToggle    = (key) => setDetectionSettings(p => ({ ...p, [key]: !p[key] }));
  const handleSystemToggle       = (key) => setSystemSettings(p => ({ ...p, [key]: !p[key] }));
  const handleThresholdChange    = (key, value) => setAlertThresholds(p => ({ ...p, [key]: parseInt(value) }));

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await apiEndpoints.getModels();
        setModels(response.data.models || []);
        setCurrentModel(response.data.current_model || '');
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to load models');
      }
    };
    fetchModels();
  }, []);

  const handleModelSwitch = async (modelName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiEndpoints.switchModel(modelName);
      setCurrentModel(response.data.current_model);
      alert(`Successfully switched to ${modelName} model`);
    } catch (err) {
      console.error('Error switching model:', err);
      setError(err.response?.data?.error || err.message || 'Failed to switch model');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/></svg> },
    { id: 'detection',     label: 'Detection',     icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg> },
    { id: 'models',        label: 'Models',        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2"/></svg> },
    { id: 'thresholds',    label: 'Thresholds',    icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><line x1="4" y1="21" x2="4" y2="14" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="10" x2="4" y2="3" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/><line x1="20" y1="21" x2="20" y2="16" stroke="currentColor" strokeWidth="2"/><line x1="20" y1="12" x2="20" y2="3" stroke="currentColor" strokeWidth="2"/><line x1="1" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="2"/><line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2"/></svg> },
    { id: 'system',        label: 'System',        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M12 1v6m0 6v6m8.66-15.66l-4.24 4.24m-4.24 4.24l-4.24 4.24M23 12h-6m-6 0H1m19.66 3.66l-4.24-4.24m-4.24-4.24l-4.24-4.24" stroke="currentColor" strokeWidth="2"/></svg> },
  ];

  /* Save button — reused in both bars */
  const SaveBtn = () => (
    <button className="settings-save-btn">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2"/>
        <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <span className="hidden sm:inline">Save Changes</span>
      <span className="sm:hidden">Save</span>
    </button>
  );

  return (
    <div className="settings-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onClose={setSidebarOpen}
      />

      <div className="settings-main">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="settings-header">

          {/* Mobile: hamburger left, save button right */}
          <div className="settings-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="settings-menu-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <SaveBtn />
          </div>

          {/* Mobile: title below bar */}
          <div className="settings-title-mobile">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Configure your surveillance system</p>
          </div>

          {/* Desktop: title left, save button right */}
          <div className="settings-desktop-row">
            <div className="settings-header-content">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Configure your surveillance system</p>
            </div>
            <SaveBtn />
          </div>

        </div>

        {/* ── Status Banner ─── */}
        <div className="settings-status-banner">
          <div className="settings-status-indicator"></div>
          <span className="settings-status-text">System Online / All cameras operational</span>
        </div>

        {/* ── Tabs ─── */}
        <div className="settings-tabs">
          {tabs.map(tab => (
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

        {/* ── Settings Content ─── */}
        <div className="settings-content">

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Alert Preferences</h3>
                  <p className="settings-card-description">Manage how you receive notifications</p>
                </div>
                <div className="settings-items">
                  {[
                    { key: 'emailAlerts',        title: 'Email Alerts',        desc: 'Receive alerts via email' },
                    { key: 'pushNotifications',  title: 'Push Notifications',  desc: 'Receive browser notifications' },
                    { key: 'smsAlerts',          title: 'SMS Alerts',          desc: 'Receive critical alerts via SMS' },
                    { key: 'alertSound',         title: 'Alert Sound',         desc: 'Play sound for new alerts' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} className="settings-item">
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">{title}</h4>
                        <p className="settings-item-description">{desc}</p>
                      </div>
                      <button
                        className={`toggle-button ${notificationSettings[key] ? 'toggle-active' : ''}`}
                        onClick={() => handleNotificationToggle(key)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detection */}
          {activeTab === 'detection' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Detection Modules</h3>
                  <p className="settings-card-description">Configure AI-driven detection behaviors</p>
                </div>
                <div className="settings-items">
                  {[
                    { key: 'motionDetection',  title: 'Motion Detection',              desc: 'Detect movement in camera feeds' },
                    { key: 'objectDetection',  title: 'Object Detection (YOLOv11)',     desc: 'Detect persons and objects in real-time' },
                    { key: 'poseEstimation',   title: 'Pose Estimation (BlazePose)',    desc: 'Extract 33 body keypoints for analysis' },
                    { key: 'behaviorAnalysis', title: 'Behavior Analysis',              desc: 'Classify suspicious behaviors using Random Forest' },
                    { key: 'fireDetection',    title: 'Fire/Smoke Detection',           desc: 'Detect fire and smoke hazards' },
                    { key: 'weaponDetection',  title: 'Weapon Detection',               desc: 'Identify weapons in camera feeds' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} className="settings-item">
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">{title}</h4>
                        <p className="settings-item-description">{desc}</p>
                      </div>
                      <button
                        className={`toggle-button ${detectionSettings[key] ? 'toggle-active' : ''}`}
                        onClick={() => handleDetectionToggle(key)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Models */}
          {activeTab === 'models' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">AI Models</h3>
                  <p className="settings-card-description">Switch between different detection models</p>
                </div>
                <div className="settings-items">
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-300 mb-1">Current Model:</p>
                    <p className="text-base sm:text-lg font-semibold capitalize text-blue-400">{currentModel || 'None'}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { model: 'weapon',     label: 'Weapon Detection',    desc: 'Detect weapons using YOLOv11',             activeColor: 'bg-green-600', inactiveColor: 'bg-blue-600 hover:bg-blue-700' },
                      { model: 'fire_smoke', label: 'Fire/Smoke Detection', desc: 'Detect fire and smoke hazards',            activeColor: 'bg-green-600', inactiveColor: 'bg-blue-600 hover:bg-blue-700' },
                      { model: 'both',       label: 'Both Models',          desc: 'Run both weapon and fire/smoke detection', activeColor: 'bg-green-600', inactiveColor: 'bg-purple-600 hover:bg-purple-700' },
                      { model: 'fight',      label: 'Fight Detection',       desc: 'Detect physical altercations',             activeColor: 'bg-green-600', inactiveColor: 'bg-red-600 hover:bg-red-700' },
                    ].map(({ model, label, desc, activeColor, inactiveColor }) => (
                      <div key={model} className="settings-item">
                        <div className="settings-item-info">
                          <h4 className="settings-item-title">{label}</h4>
                          <p className="settings-item-description">{desc}</p>
                        </div>
                        <button
                          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-white text-xs sm:text-sm shrink-0
                            ${currentModel === model ? activeColor : inactiveColor}`}
                          onClick={() => handleModelSwitch(model)}
                          disabled={loading || currentModel === model}
                        >
                          {currentModel === model ? 'Active' : 'Switch'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="mt-3 sm:mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-xs sm:text-sm">
                      Error: {error}
                    </div>
                  )}
                  {loading && (
                    <div className="mt-3 sm:mt-4 text-center text-gray-400 text-sm">
                      Switching model…
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Thresholds */}
          {activeTab === 'thresholds' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Confidence Thresholds</h3>
                  <p className="settings-card-description">Adjust detection sensitivity and alert parameters</p>
                </div>
                <div className="settings-items">
                  {[
                    { key: 'detectionConfidence', title: 'Detection Confidence', desc: 'Minimum confidence for object detection',        suffix: '%',  min: 0,   max: 100 },
                    { key: 'behaviorConfidence',  title: 'Behavior Confidence',  desc: 'Minimum confidence for behavior classification', suffix: '%',  min: 0,   max: 100 },
                    { key: 'alertCooldown',       title: 'Alert Cooldown',       desc: 'Minimum seconds between duplicate alerts',       suffix: 's',  min: 5,   max: 120 },
                  ].map(({ key, title, desc, suffix, min, max }) => (
                    <div key={key} className="settings-slider-item">
                      <div className="settings-slider-header">
                        <div className="settings-item-info">
                          <h4 className="settings-item-title">{title}</h4>
                          <p className="settings-item-description">{desc}</p>
                        </div>
                        <span className="settings-slider-value">{alertThresholds[key]}{suffix}</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={alertThresholds[key]}
                        onChange={(e) => handleThresholdChange(key, e.target.value)}
                        className="settings-slider"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* System */}
          {activeTab === 'system' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">System Configuration</h3>
                  <p className="settings-card-description">Manage recording and storage settings</p>
                </div>
                <div className="settings-items">
                  {[
                    { key: 'recordingEnabled', title: 'Recording Enabled', desc: 'Save video recordings of detections' },
                    { key: 'autoArchive',      title: 'Auto Archive',      desc: 'Automatically archive old recordings' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} className="settings-item">
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">{title}</h4>
                        <p className="settings-item-description">{desc}</p>
                      </div>
                      <button
                        className={`toggle-button ${systemSettings[key] ? 'toggle-active' : ''}`}
                        onClick={() => handleSystemToggle(key)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  ))}

                  <div className="settings-info-item">
                    <div className="settings-item-info">
                      <h4 className="settings-item-title">Data Retention Period</h4>
                      <p className="settings-item-description">Keep recordings for {systemSettings.retentionDays} days</p>
                    </div>
                    <div className="settings-input-container">
                      <input
                        type="number" min="7" max="365"
                        value={systemSettings.retentionDays}
                        onChange={(e) => setSystemSettings({ ...systemSettings, retentionDays: parseInt(e.target.value) })}
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
                        type="number" min="10" max="1000"
                        value={systemSettings.storageLimit}
                        onChange={(e) => setSystemSettings({ ...systemSettings, storageLimit: parseInt(e.target.value) })}
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
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Clear All Data
                  </button>
                  <button className="settings-danger-btn">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
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

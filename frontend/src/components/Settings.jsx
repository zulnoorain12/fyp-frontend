import React, { useState, useEffect, useCallback } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [modelInfo, setModelInfo] = useState({});

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

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiEndpoints.getSettings();
        const s = response.data.settings;
        if (s.notifications) setNotificationSettings(prev => ({ ...prev, ...s.notifications }));
        if (s.detection) setDetectionSettings(prev => ({ ...prev, ...s.detection }));
        if (s.thresholds) setAlertThresholds(prev => ({ ...prev, ...s.thresholds }));
        if (s.system) setSystemSettings(prev => ({ ...prev, ...s.system }));
        setSettingsLoaded(true);
      } catch (err) {
        console.error('Error loading settings:', err);
        setSettingsLoaded(true); // use defaults
      }
    };
    loadSettings();
  }, []);

  // Fetch models and model info
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await apiEndpoints.getModels();
        setModels(response.data.models || []);
        setCurrentModel(response.data.current_model || '');
        setModelInfo(response.data.model_info || {});
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to load models');
      }
    };
    fetchModels();
  }, []);

  const handleNotificationToggle = (key) => {
    setNotificationSettings(p => ({ ...p, [key]: !p[key] }));
    setHasChanges(true);
  };
  const handleDetectionToggle = (key) => {
    setDetectionSettings(p => ({ ...p, [key]: !p[key] }));
    setHasChanges(true);
  };
  const handleSystemToggle = (key) => {
    setSystemSettings(p => ({ ...p, [key]: !p[key] }));
    setHasChanges(true);
  };
  const handleThresholdChange = (key, value) => {
    setAlertThresholds(p => ({ ...p, [key]: parseInt(value) }));
    setHasChanges(true);
  };

  const handleModelSwitch = async (modelName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiEndpoints.switchModel(modelName);
      setCurrentModel(response.data.current_model);
      showToast(`Switched to ${modelName} model`);
    } catch (err) {
      console.error('Error switching model:', err);
      setError(err.response?.data?.error || err.message || 'Failed to switch model');
    } finally {
      setLoading(false);
    }
  };

  // Save all settings to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiEndpoints.saveSettings({
        notifications: notificationSettings,
        detection: detectionSettings,
        thresholds: alertThresholds,
        system: systemSettings,
      });
      setHasChanges(false);
      showToast('Settings saved successfully! Thresholds are now active.');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Clear all detection data
  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear ALL detection and alert data? This cannot be undone.')) return;
    try {
      await apiEndpoints.clearAllData();
      showToast('All detection and alert data cleared');
    } catch (err) {
      console.error('Error clearing data:', err);
      showToast('Failed to clear data', 'error');
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all settings to factory defaults? Your current settings will be lost.')) return;
    try {
      const response = await apiEndpoints.resetDefaults();
      const s = response.data.settings;
      if (s.notifications) setNotificationSettings(s.notifications);
      if (s.detection) setDetectionSettings(s.detection);
      if (s.thresholds) setAlertThresholds(s.thresholds);
      if (s.system) setSystemSettings(s.system);
      setHasChanges(false);
      showToast('Settings reset to defaults');
    } catch (err) {
      console.error('Error resetting settings:', err);
      showToast('Failed to reset settings', 'error');
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
    <button
      className={`settings-save-btn ${hasChanges ? 'settings-save-btn-pulse' : ''}`}
      onClick={handleSave}
      disabled={saving}
    >
      {saving ? (
        <>
          <div className="settings-save-spinner"></div>
          <span>Saving…</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2"/>
            <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2"/>
            <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="hidden sm:inline">{hasChanges ? 'Save Changes *' : 'Save Changes'}</span>
          <span className="sm:hidden">Save</span>
        </>
      )}
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

        {/* ── Toast Notification ─── */}
        {toast && (
          <div className={`settings-toast ${toast.type === 'error' ? 'settings-toast-error' : 'settings-toast-success'}`}>
            <span>{toast.type === 'error' ? '❌' : '✅'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Header ─── */}
        <div className="settings-header">
          <div className="settings-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="settings-menu-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <SaveBtn />
          </div>
          <div className="settings-title-mobile">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Configure your surveillance system</p>
          </div>
          <div className="settings-desktop-row">
            <div className="settings-header-content">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Configure your surveillance system</p>
            </div>
            <SaveBtn />
          </div>
        </div>

        {/* ── Status Banner ─── */}
        <div className={`settings-status-banner ${hasChanges ? 'settings-status-unsaved' : ''}`}>
          <div className={`settings-status-indicator ${hasChanges ? 'settings-status-indicator-warn' : ''}`}></div>
          <span className="settings-status-text">
            {hasChanges ? 'Unsaved changes — click Save to apply' : 'System Online / All cameras operational'}
          </span>
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
              {/* Current Active Model Banner */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Active Detection Model</h3>
                  <p className="settings-card-description">The model currently being used for real-time detection</p>
                </div>
                <div className="settings-model-active-banner">
                  <div className="settings-model-active-indicator"></div>
                  <div className="settings-model-active-info">
                    <span className="settings-model-active-label">Currently Running:</span>
                    <span className="settings-model-active-name">
                      {currentModel === 'weapon' ? '🔫 Weapon Detection' :
                       currentModel === 'fire_smoke' ? '🔥 Fire/Smoke Detection' :
                       currentModel === 'fight' ? '👊 Fight Detection' :
                       currentModel === 'both' ? '⚡ Weapon + Fire/Smoke' :
                       currentModel === 'all' ? '🛡️ All Models' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Models */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Available AI Models</h3>
                  <p className="settings-card-description">Switch between detection models or run them simultaneously</p>
                </div>
                <div className="settings-models-grid">
                  {/* Weapon Detection Model */}
                  <div className={`settings-model-card ${currentModel === 'weapon' ? 'settings-model-card-active' : ''}`}>
                    <div className="settings-model-card-header">
                      <div className="settings-model-icon settings-model-icon-weapon">🔫</div>
                      <div className="settings-model-meta">
                        <h4 className="settings-model-name">Weapon Detection</h4>
                        <span className={`settings-model-badge ${models.includes('weapon') ? 'settings-model-badge-loaded' : 'settings-model-badge-unloaded'}`}>
                          {models.includes('weapon') ? 'Loaded' : 'Not Available'}
                        </span>
                      </div>
                    </div>
                    <p className="settings-model-desc">Detects weapons including guns, knives, pistols, rifles, and other dangerous objects using YOLOv11 deep learning model.</p>
                    <div className="settings-model-details">
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">Architecture</span>
                        <span className="settings-model-detail-value">YOLOv11</span>
                      </div>
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">Classes</span>
                        <span className="settings-model-detail-value">gun, knife, pistol, rifle</span>
                      </div>
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">File</span>
                        <span className="settings-model-detail-value">weapon.pt</span>
                      </div>
                    </div>
                    <button
                      className={`settings-model-switch-btn ${currentModel === 'weapon' ? 'settings-model-switch-active' : ''}`}
                      onClick={() => handleModelSwitch('weapon')}
                      disabled={loading || currentModel === 'weapon' || !models.includes('weapon')}
                    >
                      {currentModel === 'weapon' ? '✓ Active' : 'Switch to This Model'}
                    </button>
                  </div>

                  {/* Fire/Smoke Detection Model */}
                  <div className={`settings-model-card ${currentModel === 'fire_smoke' ? 'settings-model-card-active' : ''}`}>
                    <div className="settings-model-card-header">
                      <div className="settings-model-icon settings-model-icon-fire">🔥</div>
                      <div className="settings-model-meta">
                        <h4 className="settings-model-name">Fire/Smoke Detection</h4>
                        <span className={`settings-model-badge ${models.includes('fire_smoke') ? 'settings-model-badge-loaded' : 'settings-model-badge-unloaded'}`}>
                          {models.includes('fire_smoke') ? 'Loaded' : 'Not Available'}
                        </span>
                      </div>
                    </div>
                    <p className="settings-model-desc">Identifies fire and smoke hazards in real-time, detecting flames, smoke plumes, and blaze conditions for early warning systems.</p>
                    <div className="settings-model-details">
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">Architecture</span>
                        <span className="settings-model-detail-value">YOLOv11</span>
                      </div>
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">Classes</span>
                        <span className="settings-model-detail-value">fire, smoke</span>
                      </div>
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">File</span>
                        <span className="settings-model-detail-value">fire_smoke.pt</span>
                      </div>
                    </div>
                    <button
                      className={`settings-model-switch-btn ${currentModel === 'fire_smoke' ? 'settings-model-switch-active' : ''}`}
                      onClick={() => handleModelSwitch('fire_smoke')}
                      disabled={loading || currentModel === 'fire_smoke' || !models.includes('fire_smoke')}
                    >
                      {currentModel === 'fire_smoke' ? '✓ Active' : 'Switch to This Model'}
                    </button>
                  </div>

                  {/* Fight Detection Model */}
                  <div className={`settings-model-card ${currentModel === 'fight' ? 'settings-model-card-active' : ''}`}>
                    <div className="settings-model-card-header">
                      <div className="settings-model-icon settings-model-icon-fight">👊</div>
                      <div className="settings-model-meta">
                        <h4 className="settings-model-name">Fight Detection</h4>
                        <span className={`settings-model-badge ${models.includes('fight') ? 'settings-model-badge-loaded' : 'settings-model-badge-unloaded'}`}>
                          {models.includes('fight') ? 'Loaded' : 'Not Available'}
                        </span>
                      </div>
                    </div>
                    <p className="settings-model-desc">Detects physical altercations and violent behavior using pose estimation (BlazePose) combined with LSTM sequence analysis for temporal fight pattern recognition.</p>
                    <div className="settings-model-details">
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">Architecture</span>
                        <span className="settings-model-detail-value">BlazePose + LSTM</span>
                      </div>
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">Classes</span>
                        <span className="settings-model-detail-value">fight, no_fight</span>
                      </div>
                      <div className="settings-model-detail">
                        <span className="settings-model-detail-label">File</span>
                        <span className="settings-model-detail-value">fight_detection_model.h5</span>
                      </div>
                    </div>
                    <button
                      className={`settings-model-switch-btn ${currentModel === 'fight' ? 'settings-model-switch-active' : ''}`}
                      onClick={() => handleModelSwitch('fight')}
                      disabled={loading || currentModel === 'fight' || !models.includes('fight')}
                    >
                      {currentModel === 'fight' ? '✓ Active' : 'Switch to This Model'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Combined Modes */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Combined Detection Modes</h3>
                  <p className="settings-card-description">Run multiple models simultaneously for comprehensive threat detection</p>
                </div>
                <div className="settings-items">
                  <div className={`settings-model-combined-item ${currentModel === 'both' ? 'settings-model-combined-active' : ''}`}>
                    <div className="settings-model-combined-info">
                      <div className="settings-model-combined-icons">
                        <span>🔫</span><span>+</span><span>🔥</span>
                      </div>
                      <div>
                        <h4 className="settings-item-title">Weapon + Fire/Smoke</h4>
                        <p className="settings-item-description">Run both YOLO models in parallel for weapon and fire/smoke detection on every frame</p>
                      </div>
                    </div>
                    <button
                      className={`settings-model-switch-btn ${currentModel === 'both' ? 'settings-model-switch-active' : ''}`}
                      onClick={() => handleModelSwitch('both')}
                      disabled={loading || currentModel === 'both'}
                    >
                      {currentModel === 'both' ? '✓ Active' : 'Activate'}
                    </button>
                  </div>

                  <div className={`settings-model-combined-item ${currentModel === 'all' ? 'settings-model-combined-active' : ''}`}>
                    <div className="settings-model-combined-info">
                      <div className="settings-model-combined-icons">
                        <span>🔫</span><span>+</span><span>🔥</span><span>+</span><span>👊</span>
                      </div>
                      <div>
                        <h4 className="settings-item-title">All Models</h4>
                        <p className="settings-item-description">Run weapon, fire/smoke, and fight detection simultaneously with cross-model deduplication and quality filtering</p>
                      </div>
                    </div>
                    <button
                      className={`settings-model-switch-btn ${currentModel === 'all' ? 'settings-model-switch-active' : ''}`}
                      onClick={() => handleModelSwitch('all')}
                      disabled={loading || currentModel === 'all' || !models.includes('all')}
                    >
                      {currentModel === 'all' ? '✓ Active' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="settings-model-error">
                  <span>⚠️</span> Error: {error}
                </div>
              )}
              {loading && (
                <div className="settings-model-loading">
                  <div className="settings-save-spinner"></div>
                  <span>Switching model…</span>
                </div>
              )}
            </div>
          )}

          {/* Thresholds */}
          {activeTab === 'thresholds' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Confidence Thresholds</h3>
                  <p className="settings-card-description">Adjust detection sensitivity and alert parameters. Changes are applied to the live detection pipeline when saved.</p>
                </div>
                <div className="settings-items">
                  {[
                    { key: 'detectionConfidence', title: 'Detection Confidence', desc: 'Minimum confidence for object detection — directly controls the YOLO model threshold', suffix: '%',  min: 5,   max: 100 },
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

              {/* Live indicator */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <h3 className="settings-card-title">Current Active Values</h3>
                  <p className="settings-card-description">These values are actively being used by the detection system</p>
                </div>
                <div className="settings-threshold-preview">
                  <div className="settings-threshold-preview-item">
                    <span className="settings-threshold-preview-label">YOLO Confidence</span>
                    <span className="settings-threshold-preview-value">{(alertThresholds.detectionConfidence / 100).toFixed(2)}</span>
                    <span className="settings-threshold-preview-hint">conf parameter</span>
                  </div>
                  <div className="settings-threshold-preview-item">
                    <span className="settings-threshold-preview-label">Behavior Threshold</span>
                    <span className="settings-threshold-preview-value">{(alertThresholds.behaviorConfidence / 100).toFixed(2)}</span>
                    <span className="settings-threshold-preview-hint">classification gate</span>
                  </div>
                  <div className="settings-threshold-preview-item">
                    <span className="settings-threshold-preview-label">Alert Cooldown</span>
                    <span className="settings-threshold-preview-value">{alertThresholds.alertCooldown}s</span>
                    <span className="settings-threshold-preview-hint">between duplicates</span>
                  </div>
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
                        onChange={(e) => { setSystemSettings({ ...systemSettings, retentionDays: parseInt(e.target.value) || 7 }); setHasChanges(true); }}
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
                        onChange={(e) => { setSystemSettings({ ...systemSettings, storageLimit: parseInt(e.target.value) || 10 }); setHasChanges(true); }}
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
                  <button className="settings-danger-btn" onClick={handleClearData}>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Clear All Data
                  </button>
                  <button className="settings-danger-btn" onClick={handleResetDefaults}>
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

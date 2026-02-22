import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import '../styles/Alerts.css';
import { apiEndpoints } from '../services/api';
import audioAlert from '../utils/audioAlert';
import socket from '../services/socket';

const Alerts = ({ onLogout, onNavigate, currentPage }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const previousAlertIdsRef = useRef(new Set());

  const mapDetectionToAlert = (detection) => {
    const typeMap = {
      weapon: 'Weapon Detected', fire: 'Fire Detected', smoke: 'Smoke Detected',
      fight: 'Fight Detected', person: 'Person Detected',
      car: 'Vehicle Detected', truck: 'Vehicle Detected'
    };
    const severityMap = { high: 'Critical', medium: 'Warning', low: 'Info' };

    const timeAgo = (timestamp) => {
      let then;
      if (timestamp instanceof Date) {
        then = timestamp;
      } else if (typeof timestamp === 'string') {
        then = new Date((!timestamp.includes('Z') && !timestamp.includes('+') && timestamp.includes('T'))
          ? timestamp + 'Z' : timestamp);
      } else {
        then = new Date(timestamp);
      }
      if (isNaN(then.getTime())) return 'Unknown';
      const diffMs = new Date() - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return {
      id: detection.detection_id,
      type: typeMap[detection.type] || `${(detection.type || 'unknown').charAt(0).toUpperCase() + (detection.type || 'unknown').slice(1)} Detected`,
      severity: detection.confidence >= 0.8 ? 'Critical' : detection.confidence >= 0.6 ? 'Warning' : 'Info',
      description: `Detected ${detection.type} with ${(detection.confidence * 100).toFixed(1)}% confidence`,
      location: detection.camera_location || `Camera ${(detection.detection_id % 6) || 1}`,
      time: timeAgo(detection.timestamp),
      status: 'Active',
      timestamp: detection.timestamp
    };
  };

  const combineAlerts = (backendAlerts, socketAlerts) =>
    [...backendAlerts, ...socketAlerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const markAsRead = (alertId) => {
    const updated = alerts.map(a => a.id === alertId ? { ...a, status: 'Acknowledged' } : a);
    setAlerts(updated);
    setUnreadCount(updated.filter(a => a.status === 'Active' || a.status === 'Investigating').length);
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(a => ({ ...a, status: 'Acknowledged' })));
    setUnreadCount(0);
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'alert-severity-badge alert-severity-critical';
      case 'warning': return 'alert-severity-badge alert-severity-warning';
      case 'info': return 'alert-severity-badge alert-severity-info';
      default: return 'alert-severity-badge';
    }
  };

  useEffect(() => { audioAlert.init(); }, []);

  // ── Socket.IO: receive real-time alerts ─────────────────────
  useEffect(() => {
    const handleNewAlert = (alertData) => {
      console.log('[Alerts] Received new_alert via Socket.IO:', alertData);
      setAlerts(prev => {
        // Avoid duplicates
        if (prev.some(a => a.id === alertData.id)) return prev;
        const newAlerts = [alertData, ...prev].slice(0, 100);
        return newAlerts;
      });
      // Play audio based on severity
      audioAlert.playAlert(alertData.severity || 'Info');
    };

    socket.on('new_alert', handleNewAlert);
    return () => {
      socket.off('new_alert', handleNewAlert);
    };
  }, []);

  // ── Initial fetch from database (one-time + slow poll as fallback) ──
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiEndpoints.getDetections(50);
        const detections = response.data.detections || [];
        const backendAlerts = detections.map(mapDetectionToAlert);

        setAlerts(prev => {
          // Merge backend alerts with any socket alerts already in state
          const socketOnly = prev.filter(a => typeof a.id === 'number' && String(a.id).length > 10);
          return combineAlerts(backendAlerts, socketOnly);
        });
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError('Failed to load alerts');
        const fallback = [
          { id: 1, type: 'Unauthorized Access Detected', severity: 'Critical', description: 'Person detected entering restricted area without proper credentials', location: 'Parking Lot – Camera 02', time: '2 minutes ago', status: 'Active', timestamp: new Date().toISOString() },
          { id: 2, type: 'Perimeter Breach', severity: 'Critical', description: 'Movement detected in restricted zone outside operating hours', location: 'Back Entrance – Camera 08', time: '15 minutes ago', status: 'Active', timestamp: new Date().toISOString() },
          { id: 3, type: 'Unusual Activity Pattern', severity: 'Warning', description: 'Prolonged loitering detected near secured entrance', location: 'Main Entrance – Camera 01', time: '45 minutes ago', status: 'Acknowledged', timestamp: new Date().toISOString() },
          { id: 4, type: 'Object Left Unattended', severity: 'Warning', description: 'Suspicious package left unattended in public area', location: 'Reception – Camera 03', time: '1 hour ago', status: 'Investigating', timestamp: new Date().toISOString() },
          { id: 5, type: 'System Notification', severity: 'Info', description: 'Camera maintenance scheduled for tomorrow', location: 'Server Room – Camera 04', time: '2 hours ago', status: 'Acknowledged', timestamp: new Date().toISOString() },
          { id: 6, type: 'Motion Detected', severity: 'Info', description: 'Motion detected in low-traffic area during off-hours', location: 'Hallway East – Camera 05', time: '3 hours ago', status: 'Resolved', timestamp: new Date().toISOString() },
        ];
        setAlerts(fallback);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    // Slow poll as a fallback; real-time updates come via Socket.IO
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnreadCount(alerts.filter(a => a.status === 'Active' || a.status === 'Investigating').length);
  }, [alerts]);

  if (loading) {
    return (
      <div className="alerts-container">
        <div className="alerts-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading alerts...</div>
        </div>
      </div>
    );
  }

  const filterAlerts = () => {
    if (activeTab === 'all') return alerts;
    if (activeTab === 'unread') return alerts.filter(a => a.status === 'Active' || a.status === 'Investigating');
    return alerts.filter(a => a.severity.toLowerCase() === activeTab.toLowerCase());
  };

  const getAlertCount = (severity) => {
    if (severity === 'all') return alerts.length;
    return alerts.filter(a => a.severity.toLowerCase() === severity.toLowerCase()).length;
  };

  /* Shared action buttons used in both mobile bar and desktop row */
  const ActionButtons = () => (
    <div className="alerts-actions">
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="alerts-action-btn"
          style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" />
            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Mark All Read ({unreadCount})</span>
        </button>
      )}
      <button className="alerts-action-btn">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span>Export</span>
      </button>
    </div>
  );

  return (
    <div className="alerts-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onClose={setSidebarOpen}
      />

      <div className="alerts-main">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="alerts-header">

          {/* Mobile: hamburger left, action buttons right */}
          <div className="alerts-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="alerts-menu-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ActionButtons />
          </div>

          {/* Mobile: title below bar */}
          <div className="alerts-title-mobile">
            <h1 className="alerts-title">Alerts & Notifications</h1>
            <p className="alerts-subtitle">Real-time security alerts and system notifications</p>
          </div>

          {/* Desktop: title left, actions right */}
          <div className="alerts-desktop-row">
            <div className="alerts-header-content">
              <h1 className="alerts-title">Alerts & Notifications</h1>
              <p className="alerts-subtitle">Real-time security alerts and system notifications</p>
            </div>
            <ActionButtons />
          </div>

        </div>

        {/* ── Status Banner ─── */}
        <div className="alerts-status-banner">
          <div className="alerts-status-indicator"></div>
          <span className="alerts-status-text">System Online / Monitoring Active</span>
          {unreadCount > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-red-600 text-white rounded-full text-xs shrink-0">
              {unreadCount} Unread
            </span>
          )}
        </div>

        {/* ── Tabs ─── */}
        <div className="alerts-tabs">
          {[
            { id: 'all', label: 'All Alerts', badge: getAlertCount('all'), badgeClass: 'alerts-tab-badge-default' },
            { id: 'critical', label: 'Critical', badge: getAlertCount('critical'), badgeClass: 'alerts-tab-badge-critical' },
            { id: 'warning', label: 'Warning', badge: getAlertCount('warning'), badgeClass: 'alerts-tab-badge-warning' },
            { id: 'info', label: 'Info', badge: getAlertCount('info'), badgeClass: 'alerts-tab-badge-info' },
            { id: 'unread', label: 'Unread', badge: unreadCount, badgeClass: 'alerts-tab-badge-default' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`alerts-tab ${activeTab === tab.id ? 'alerts-tab-active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className={`alerts-tab-badge ${tab.badgeClass}`}>{tab.badge}</span>
            </button>
          ))}
        </div>

        {/* ── Alerts List ─── */}
        <div className="alerts-list">
          {filterAlerts().map((alert, index) => (
            <div
              key={alert.id}
              className="alert-card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Icon — hidden on mobile via CSS */}
              <div className="alert-icon-container">
                <div className={`alert-icon ${alert.severity === 'Critical' ? 'alert-icon-critical' :
                  alert.severity === 'Warning' ? 'alert-icon-warning' : 'alert-icon-info'
                  }`}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="17" r="1" fill="currentColor" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="alert-content">
                <div className="alert-header">
                  <h3 className="alert-type">{alert.type}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={getSeverityBadgeClass(alert.severity)}>{alert.severity}</span>
                    {(alert.status === 'Active' || alert.status === 'Investigating') && (
                      <span className="px-1.5 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">NEW</span>
                    )}
                  </div>
                </div>
                <p className="alert-description">{alert.description}</p>
                <div className="alert-metadata">
                  <span className="alert-meta-item">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {alert.location}
                  </span>
                  <span className="alert-meta-item">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {alert.time}
                  </span>
                  <span className={`alert-status-badge ${alert.status === 'Active' ? 'alert-status-active' :
                    alert.status === 'Acknowledged' ? 'alert-status-acknowledged' :
                      alert.status === 'Investigating' ? 'alert-status-investigating' :
                        'alert-status-resolved'
                    }`}>
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="alert-actions">
                {(alert.status === 'Active' || alert.status === 'Investigating') && (
                  <button className="alert-action-acknowledge" onClick={() => markAsRead(alert.id)}>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" />
                      <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>Mark as Read</span>
                  </button>
                )}
                <button className="alert-action-view">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Alerts;

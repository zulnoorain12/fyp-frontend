import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/Alerts.css';
import { apiEndpoints } from '../services/api';

const Alerts = ({ onLogout, onNavigate, currentPage }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map backend detection types to alert types
  const mapDetectionToAlert = (detection) => {
    const typeMap = {
      'weapon': 'Weapon Detected',
      'fire': 'Fire Detected',
      'smoke': 'Smoke Detected',
      'fight': 'Fight Detected',
      'person': 'Person Detected',
      'car': 'Vehicle Detected',
      'truck': 'Vehicle Detected'
    };
    
    const severityMap = {
      'high': 'Critical',
      'medium': 'Warning',
      'low': 'Info'
    };
    
    const timeAgo = (timestamp) => {
      // Handle different timestamp formats
      let then;
      
      // If timestamp is already a Date object, use it directly
      if (timestamp instanceof Date) {
        then = timestamp;
      } else {
        // Handle ISO string format (e.g., "2025-10-29T15:40:56.603100")
        // Ensure proper formatting for Date constructor
        if (typeof timestamp === 'string') {
          // If the timestamp doesn't have timezone info, assume it's in local timezone
          if (!timestamp.includes('Z') && !timestamp.includes('+') && timestamp.includes('T')) {
            // Add 'Z' to treat as UTC, then convert to local time for accurate calculation
            const utcTimestamp = timestamp + 'Z';
            then = new Date(utcTimestamp);
          } else {
            then = new Date(timestamp);
          }
        } else {
          then = new Date(timestamp);
        }
      }
      
      const now = new Date();
      const diffMs = now - then;
      
      // Handle invalid dates
      if (isNaN(then.getTime())) {
        return 'Unknown';
      }
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };
    
    return {
      id: detection.id,
      type: typeMap[detection.detection_type] || `${detection.detection_type.charAt(0).toUpperCase() + detection.detection_type.slice(1)} Detected`,
      severity: severityMap[detection.severity] || 'Info',
      description: `Detected ${detection.detection_type} with ${(detection.confidence * 100).toFixed(1)}% confidence`,
      location: `Camera ${detection.id % 6 || 1}`,
      time: timeAgo(detection.timestamp),
      status: 'Active',
      timestamp: detection.timestamp
    };
  };
  
  // Combine backend alerts with live camera alerts
  const combineAlerts = (backendAlerts, liveAlerts) => {
    // Merge both arrays and sort by timestamp (newest first)
    const allAlerts = [...backendAlerts, ...liveAlerts];
    return allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };
  
  // Mark alert as read
  const markAsRead = (alertId) => {
    const updatedAlerts = alerts.map(alert => 
      alert.id === alertId ? { ...alert, status: 'Acknowledged' } : alert
    );
    setAlerts(updatedAlerts);
    
    // Update unread count
    const newUnreadCount = updatedAlerts.filter(alert => 
      alert.status === 'Active' || alert.status === 'Investigating'
    ).length;
    setUnreadCount(newUnreadCount);
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    const updatedAlerts = alerts.map(alert => ({
      ...alert,
      status: 'Acknowledged'
    }));
    setAlerts(updatedAlerts);
    setUnreadCount(0);
  };
  
  // Get alert severity badge class
  const getSeverityBadgeClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'alert-severity-badge alert-severity-critical';
      case 'warning': return 'alert-severity-badge alert-severity-warning';
      case 'info': return 'alert-severity-badge alert-severity-info';
      default: return 'alert-severity-badge';
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiEndpoints.getDetections(50);
        const detections = response.data.detections || [];
        
        // Convert detections to alerts
        const backendAlerts = detections.map(mapDetectionToAlert);
        
        // Get live alerts from localStorage
        const liveAlerts = JSON.parse(localStorage.getItem('liveAlerts') || '[]');
        
        // Combine backend and live alerts
        const combinedAlerts = combineAlerts(backendAlerts, liveAlerts);
        
        setAlerts(combinedAlerts);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError('Failed to load alerts');
        // Fallback to mock data
        const fallbackAlerts = [
          { id: 1, type: 'Unauthorized Access Detected', severity: 'Critical', description: 'Person detected entering restricted area without proper credentials', location: 'Parking Lot – Camera 02', time: '2 minutes ago', status: 'Active' },
          { id: 2, type: 'Perimeter Breach', severity: 'Critical', description: 'Movement detected in restricted zone outside operating hours', location: 'Back Entrance – Camera 08', time: '15 minutes ago', status: 'Active' },
          { id: 3, type: 'Unusual Activity Pattern', severity: 'Warning', description: 'Prolonged loitering detected near secured entrance', location: 'Main Entrance – Camera 01', time: '45 minutes ago', status: 'Acknowledged' },
          { id: 4, type: 'Object Left Unattended', severity: 'Warning', description: 'Suspicious package left unattended in public area', location: 'Reception – Camera 03', time: '1 hour ago', status: 'Investigating' },
          { id: 5, type: 'System Notification', severity: 'Info', description: 'Camera maintenance scheduled for tomorrow', location: 'Server Room – Camera 04', time: '2 hours ago', status: 'Acknowledged' },
          { id: 6, type: 'Motion Detected', severity: 'Info', description: 'Motion detected in low-traffic area during off-hours', location: 'Hallway East – Camera 05', time: '3 hours ago', status: 'Resolved' },
        ];
        
        // Add any live alerts from localStorage
        const liveAlerts = JSON.parse(localStorage.getItem('liveAlerts') || '[]');
        const combinedAlerts = combineAlerts(fallbackAlerts, liveAlerts);
        
        setAlerts(combinedAlerts);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
    
    // Set up interval to periodically check for new live alerts
    const interval = setInterval(fetchAlerts, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Update unread count when alerts change
  useEffect(() => {
    const count = alerts.filter(alert => 
      alert.status === 'Active' || alert.status === 'Investigating'
    ).length;
    setUnreadCount(count);
  }, [alerts]);
  
  if (loading) {
    return (
      <div className="alerts-container">
        <div className="alerts-main" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
          <div>Loading alerts...</div>
        </div>
      </div>
    );
  }

  const filterAlerts = () => {
    if (activeTab === 'all') return alerts;
    if (activeTab === 'unread') return alerts.filter(alert => 
      alert.status === 'Active' || alert.status === 'Investigating'
    );
    return alerts.filter(alert => alert.severity.toLowerCase() === activeTab.toLowerCase());
  };

  const getAlertCount = (severity) => {
    if (severity === 'all') return alerts.length;
    return alerts.filter(alert => alert.severity.toLowerCase() === severity.toLowerCase()).length;
  };

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

      {/* Main Content */}
      <div className="alerts-main">
        {/* Header */}
        <div className="alerts-header">
          <div className="alerts-header-content">
            <h1 className="alerts-title">Alerts & Notifications</h1>
            <p className="alerts-subtitle">Real-time security alerts and system notifications</p>
          </div>
          <div className="alerts-actions">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}
            <button className="alerts-action-btn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="alerts-status-banner">
          <div className="alerts-status-indicator"></div>
          <span className="alerts-status-text">System Online / Monitoring Active</span>
          {unreadCount > 0 && (
            <span className="ml-4 px-2 py-1 bg-red-600 text-white rounded-full text-xs">
              {unreadCount} Unread
            </span>
          )}
        </div>

        {/* Alert Tabs */}
        <div className="alerts-tabs">
          {[
            { id: 'all', label: 'All Alerts', badge: getAlertCount('all') },
            { id: 'critical', label: 'Critical', badge: getAlertCount('critical'), class: 'alerts-tab-badge-critical' },
            { id: 'warning', label: 'Warning', badge: getAlertCount('warning'), class: 'alerts-tab-badge-warning' },
            { id: 'info', label: 'Info', badge: getAlertCount('info'), class: 'alerts-tab-badge-info' },
            { id: 'unread', label: 'Unread', badge: unreadCount, class: 'alerts-tab-badge-default' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`alerts-tab ${activeTab === tab.id ? 'alerts-tab-active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className={`alerts-tab-badge ${tab.class || 'alerts-tab-badge-default'}`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="alerts-list">
          {filterAlerts().map((alert, index) => (
            <div 
              key={alert.id} 
              className="alert-card"
              style={{animationDelay: `${index * 0.05}s`}}
            >
              <div className="alert-icon-container">
                <div className={`alert-icon ${
                  alert.severity === 'Critical' ? 'alert-icon-critical' :
                  alert.severity === 'Warning' ? 'alert-icon-warning' :
                  'alert-icon-info'
                }`}>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="17" r="1" fill="currentColor"/>
                  </svg>
                </div>
              </div>

              <div className="alert-content">
                <div className="alert-header">
                  <h3 className="alert-type">{alert.type}</h3>
                  <div className="flex gap-2">
                    <span className={getSeverityBadgeClass(alert.severity)}>
                      {alert.severity}
                    </span>
                    {(alert.status === 'Active' || alert.status === 'Investigating') && (
                      <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs">
                        NEW
                      </span>
                    )}
                  </div>
                </div>
                <p className="alert-description">{alert.description}</p>
                <div className="alert-metadata">
                  <span className="alert-meta-item">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {alert.location}
                  </span>
                  <span className="alert-meta-item">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {alert.time}
                  </span>
                  <span className={`alert-status-badge ${
                    alert.status === 'Active' ? 'alert-status-active' :
                    alert.status === 'Acknowledged' ? 'alert-status-acknowledged' :
                    alert.status === 'Investigating' ? 'alert-status-investigating' :
                    'alert-status-resolved'
                  }`}>
                    {alert.status}
                  </span>
                </div>
              </div>

              <div className="alert-actions">
                {(alert.status === 'Active' || alert.status === 'Investigating') && (
                  <button 
                    className="alert-action-acknowledge"
                    onClick={() => markAsRead(alert.id)}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Mark as Read
                  </button>
                )}
                <button className="alert-action-view">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Details
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
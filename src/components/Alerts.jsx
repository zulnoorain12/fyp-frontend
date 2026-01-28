import React, { useState } from 'react';
import Sidebar from './Sidebar';
import '../styles/Alerts.css';

const Alerts = ({ onLogout, onNavigate, currentPage }) => {
  const [activeTab, setActiveTab] = useState('all');

  const [alerts] = useState([
    { id: 1, type: 'Unauthorized Access Detected', severity: 'Critical', description: 'Person detected entering restricted area without proper credentials', location: 'Parking Lot – Camera 02', time: '2 minutes ago', status: 'Active' },
    { id: 2, type: 'Perimeter Breach', severity: 'Critical', description: 'Movement detected in restricted zone outside operating hours', location: 'Back Entrance – Camera 08', time: '15 minutes ago', status: 'Active' },
    { id: 3, type: 'Unusual Activity Pattern', severity: 'Warning', description: 'Prolonged loitering detected near secured entrance', location: 'Main Entrance – Camera 01', time: '45 minutes ago', status: 'Acknowledged' },
    { id: 4, type: 'Object Left Unattended', severity: 'Warning', description: 'Suspicious package left unattended in public area', location: 'Reception – Camera 03', time: '1 hour ago', status: 'Investigating' },
    { id: 5, type: 'System Notification', severity: 'Info', description: 'Camera maintenance scheduled for tomorrow', location: 'Server Room – Camera 04', time: '2 hours ago', status: 'Acknowledged' },
    { id: 6, type: 'Motion Detected', severity: 'Info', description: 'Motion detected in low-traffic area during off-hours', location: 'Hallway East – Camera 05', time: '3 hours ago', status: 'Resolved' },
  ]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filterAlerts = () => {
    if (activeTab === 'all') return alerts;
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
      />

      {/* Main Content */}
      <div className="alerts-main">
        {/* Header */}
        <div className="alerts-header">
          <div className="alerts-header-content">
            <h1 className="alerts-title">Alerts & Notifications</h1>
            <p className="alerts-subtitle">Monitor and manage security events</p>
          </div>
          <div className="alerts-actions">
            <button className="alerts-action-btn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Filter</span>
            </button>
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
          <span className="alerts-status-text">System Online / All cameras operational</span>
        </div>

        {/* Alert Tabs */}
        <div className="alerts-tabs">
          {['all', 'critical', 'warning', 'info'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`alerts-tab ${activeTab === tab ? 'alerts-tab-active' : ''}`}
            >
              <span className="capitalize">{tab}</span>
              <span className={`alerts-tab-badge ${
                tab === 'critical' ? 'alerts-tab-badge-critical' :
                tab === 'warning' ? 'alerts-tab-badge-warning' :
                tab === 'info' ? 'alerts-tab-badge-info' :
                'alerts-tab-badge-default'
              }`}>
                {getAlertCount(tab)}
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
                  <span className={`alert-severity-badge ${
                    alert.severity === 'Critical' ? 'alert-severity-critical' :
                    alert.severity === 'Warning' ? 'alert-severity-warning' :
                    'alert-severity-info'
                  }`}>
                    {alert.severity}
                  </span>
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
                {alert.status === 'Active' && (
                  <>
                    <button className="alert-action-acknowledge">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Acknowledge
                    </button>
                    <button className="alert-action-resolve">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Resolve
                    </button>
                  </>
                )}
                <button className="alert-action-view">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  View
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
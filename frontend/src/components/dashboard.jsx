import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/dashboard.css';
import { apiEndpoints } from '../services/api';
import socket from '../services/socket';

const Dashboard = ({ onLogout, onNavigate, currentPage }) => {
  const [systemStats, setSystemStats] = useState({
    activeCameras: 0,
    activeAlerts: 0,
    detectedPeople: 0,
    systemHealth: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cameras] = useState([
    { id: 1, name: 'Main Entrance', location: 'Building A - Floor 1', status: 'Active', lastUpdate: '2 min ago' },
    { id: 2, name: 'Parking Lot', location: 'Building A - Outdoor', status: 'Active', lastUpdate: '1 min ago' },
    { id: 3, name: 'Reception', location: 'Building A - Floor 1', status: 'Active', lastUpdate: '3 min ago' },
    { id: 4, name: 'Server Room', location: 'Building B - Floor 2', status: 'Warning', lastUpdate: '5 min ago' },
    { id: 5, name: 'Hallway East', location: 'Building A - Floor 2', status: 'Active', lastUpdate: '1 min ago' },
    { id: 6, name: 'Hallway West', location: 'Building A - Floor 2', status: 'Active', lastUpdate: '4 min ago' },
  ]);

  const [recentAlerts, setRecentAlerts] = useState([
    { id: 1, type: 'Unauthorized Access', severity: 'Critical', location: 'Parking Lot', time: '2 min ago' },
    { id: 2, type: 'Unusual Activity', severity: 'Warning', location: 'Main Entrance', time: '15 min ago' },
    { id: 3, type: 'Loitering Detected', severity: 'Info', location: 'Reception', time: '1 hour ago' },
  ]);

  // ── Socket.IO: receive real-time alerts on Dashboard ────────
  useEffect(() => {
    const handleNewAlert = (alertData) => {
      console.log('[Dashboard] Received new_alert via Socket.IO:', alertData);
      setRecentAlerts(prev => {
        // Avoid duplicates
        if (prev.some(a => a.id === alertData.id)) return prev;
        const formatted = {
          id: alertData.id,
          type: alertData.type,
          severity: alertData.severity,
          location: alertData.location || 'Detection Page',
          time: 'Just now',
          timestamp: alertData.timestamp,
        };
        return [formatted, ...prev].slice(0, 5);
      });
      // Also bump the active alerts counter
      setSystemStats(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts + 1
      }));
    };

    socket.on('new_alert', handleNewAlert);
    return () => {
      socket.off('new_alert', handleNewAlert);
    };
  }, []);

  // ── Initial fetch + slow poll as fallback ───────────────────
  useEffect(() => {
    const fetchRecentAlerts = async () => {
      try {
        let dbAlerts = [];
        try {
          const response = await apiEndpoints.getDetections(10);
          const detections = response.data.detections || [];
          dbAlerts = detections.map(d => {
            const severityMap = { high: 'Critical', medium: 'Warning', low: 'Info' };
            const typeMap = {
              weapon: 'Weapon Detected', fire: 'Fire Detected', smoke: 'Smoke Detected',
              fight: 'Fight Detected', person: 'Person Detected',
            };
            const then = new Date(d.timestamp);
            const diffMs = Date.now() - then.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            let timeStr = 'Just now';
            if (diffMins >= 60) timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            else if (diffMins >= 1) timeStr = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

            return {
              id: `db-${d.detection_id}`,
              type: typeMap[d.type] || `${(d.type || 'unknown').charAt(0).toUpperCase() + (d.type || 'unknown').slice(1)} Detected`,
              severity: d.confidence >= 0.8 ? 'Critical' : d.confidence >= 0.6 ? 'Warning' : 'Info',
              location: d.camera_location || `Camera ${(d.detection_id % 6) || 1}`,
              time: timeStr,
              timestamp: d.timestamp
            };
          });
        } catch (err) {
          console.error('Error fetching DB alerts for dashboard:', err);
        }

        // Combine DB alerts with any socket-pushed alerts already in state
        const combined = dbAlerts
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);

        if (combined.length > 0) setRecentAlerts(combined);
      } catch (err) {
        console.error('Error fetching recent alerts:', err);
      }
    };
    fetchRecentAlerts();
    // Slow poll as fallback; real-time updates come via Socket.IO
    const interval = setInterval(fetchRecentAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const detectionsRes = await apiEndpoints.getDetections(100);
        const detections = detectionsRes.data.detections || [];
        const peopleDetections = detections.filter(d =>
          d.type === 'person' || (d.type && d.type.includes('person'))
        ).length;
        const recentDetections = detections.filter(d =>
          new Date(d.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        setSystemStats(prev => ({
          activeCameras: 6,
          activeAlerts: Math.max(prev.activeAlerts, recentDetections),
          detectedPeople: peopleDetections,
          systemHealth: 98
        }));
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load system statistics');
        setSystemStats(prev => ({ ...prev, activeCameras: 6, systemHealth: 98 }));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={onNavigate}
        currentPage={currentPage}
        onLogout={onLogout}
      />

      <div className="main-content">

        {/* ── Header ── */}
        <div className="dashboard-header">

          {/* Mobile: top bar with hamburger on left, badge on right */}
          <div className="header-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="menu-button">
              <svg className="icon-menu" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="status-badge">
              <span className="status-indicator"></span>
              System Online
            </div>
          </div>

          {/* Mobile: title block below the bar */}
          <div className="header-title-mobile">
            <h1 className="header-title">Dashboard</h1>
            <p className="header-subtitle">Real-time system monitoring and overview</p>
          </div>

          {/* Desktop: title left, badge right — single row */}
          <div className="header-desktop-row">
            <div>
              <h1 className="header-title">Dashboard</h1>
              <p className="header-subtitle">Real-time system monitoring and overview</p>
            </div>
            <div className="status-badge">
              <span className="status-indicator"></span>
              System Online / All Cameras Operational
            </div>
          </div>

        </div>

        {/* ── Stats Grid ── */}
        <div className="stats-grid">
          {[
            { label: 'Active Cameras', value: systemStats.activeCameras, change: '↑ 2 from yesterday', positive: true, color: 'cyan' },
            { label: 'Active Alerts', value: systemStats.activeAlerts, change: '↓ 5 from yesterday', positive: false, color: 'amber' },
            { label: 'Detected People', value: systemStats.detectedPeople, change: '↑ 12 from last hour', positive: true, color: 'purple' },
            { label: 'System Health', value: `${systemStats.systemHealth}%`, change: 'Excellent', positive: true, color: 'emerald' },
          ].map((stat, index) => {
            const colorClasses = {
              cyan: 'bg-cyan-500/10 text-cyan-400',
              amber: 'bg-amber-500/10 text-amber-400',
              purple: 'bg-purple-500/10 text-purple-400',
              emerald: 'bg-emerald-500/10 text-emerald-400',
            };
            return (
              <div key={index} className="stat-card">
                <div className="stat-header">
                  <div className={`stat-icon ${colorClasses[stat.color]}`} />
                  <span className="stat-label">{stat.label}</span>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className={`stat-change ${stat.positive ? 'stat-change-positive' : 'stat-change-negative'}`}>
                  {stat.change}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Content Grid ── */}
        <div className="content-grid">

          {/* Camera Status */}
          <div className="content-card">
            <div className="card-header">
              <h2 className="card-title">Camera Status</h2>
              <button className="view-all-button">View All →</button>
            </div>
            <div className="camera-list">
              {cameras.map(camera => (
                <div key={camera.id} className="camera-item">
                  <div className="camera-info">
                    <span className={`camera-status ${camera.status === 'Active' ? 'camera-status-active' : 'camera-status-warning'}`}>
                      {camera.status}
                    </span>
                    <h3 className="camera-name">{camera.name}</h3>
                    <p className="camera-location">{camera.location}</p>
                  </div>
                  <div className="camera-update">{camera.lastUpdate}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="content-card">
            <div className="card-header">
              <h2 className="card-title">Recent Alerts</h2>
              <button className="view-all-button">View All →</button>
            </div>
            <div className="alert-list">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="alert-item">
                  <div className="alert-info">
                    <span className={`alert-severity ${alert.severity === 'Critical' ? 'alert-severity-critical' :
                      alert.severity === 'Warning' ? 'alert-severity-warning' :
                        'alert-severity-info'
                      }`}>
                      {alert.severity}
                    </span>
                    <h3 className="alert-type">{alert.type}</h3>
                    <p className="alert-details">{alert.location} • {alert.time}</p>
                  </div>
                  <button className="alert-view-button">View</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

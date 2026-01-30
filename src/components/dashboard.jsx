import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/dashboard.css';
import { apiEndpoints } from '../services/api';

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
  
  // Fetch recent alerts for dashboard
  useEffect(() => {
    const fetchRecentAlerts = () => {
      try {
        // Get recent alerts from localStorage (live alerts)
        const liveAlerts = JSON.parse(localStorage.getItem('liveAlerts') || '[]');
        
        // Get last 3 recent alerts
        const recentLiveAlerts = liveAlerts
          .slice(0, 3)
          .map(alert => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            location: alert.location,
            time: alert.time
          }));
        
        if (recentLiveAlerts.length > 0) {
          setRecentAlerts(recentLiveAlerts);
        }
      } catch (err) {
        console.error('Error fetching recent alerts:', err);
      }
    };
    
    fetchRecentAlerts();
    
    // Check for new alerts every 3 seconds
    const interval = setInterval(fetchRecentAlerts, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch system stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch detections
        const detectionsRes = await apiEndpoints.getDetections(100);
        const detections = detectionsRes.data.detections || [];
        
        // Get live alerts from localStorage
        const liveAlerts = JSON.parse(localStorage.getItem('liveAlerts') || '[]');
        
        // Calculate stats
        const peopleDetections = detections.filter(d => 
          d.detection_type === 'person' || d.detection_type.includes('person')
        ).length;
        
        // Count recent alerts (last 24 hours) + live alerts
        const recentDetections = detections.filter(d => 
          new Date(d.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        
        const recentLiveAlerts = liveAlerts.filter(alert => 
          new Date(alert.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;
        
        setSystemStats({
          activeCameras: 6, // Could be fetched from an API endpoint
          activeAlerts: recentDetections + recentLiveAlerts,
          detectedPeople: peopleDetections,
          systemHealth: 98 // Could be calculated from system metrics
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load system statistics');
        // Fallback to mock data
        setSystemStats({
          activeCameras: 6,
          activeAlerts: 3,
          detectedPeople: 47,
          systemHealth: 98
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="main-content" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
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

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="dashboard-header">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="menu-button"
          >
            <svg className="icon-menu" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 className="header-title">Dashboard</h1>
            <p className="header-subtitle">Real-time system monitoring and overview</p>
          </div>
          
          <div className="status-badge">
            <span className="status-indicator"></span>
            System Online / All Cameras Operational
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {[
            { label: 'Active Cameras', value: systemStats.activeCameras, change: '↑ 2 from yesterday', positive: true, icon: <></>, color: 'cyan' },
            { label: 'Active Alerts', value: systemStats.activeAlerts, change: '↓ 5 from yesterday', positive: false, icon: <></>, color: 'amber' },
            { label: 'Detected People', value: systemStats.detectedPeople, change: '↑ 12 from last hour', positive: true, icon: <></>, color: 'purple' },
            { label: 'System Health', value: `${systemStats.systemHealth}%`, change: 'Excellent', positive: true, icon: <></>, color: 'emerald' }
          ].map((stat, index) => {
            const colorClasses = {
              cyan: 'bg-cyan-500/10 text-cyan-400',
              amber: 'bg-amber-500/10 text-amber-400',
              purple: 'bg-purple-500/10 text-purple-400',
              emerald: 'bg-emerald-500/10 text-emerald-400'
            };

            return (
              <div key={index} className="stat-card">
                <div className="stat-header">
                  <div className={`stat-icon ${colorClasses[stat.color]}`}>
                    {stat.icon}
                  </div>
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

        {/* Content Grid */}
        <div className="content-grid">
          {/* Camera Overview */}
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

          {/* Alerts */}
          <div className="content-card">
            <div className="card-header">
              <h2 className="card-title">Recent Alerts</h2>
              <button className="view-all-button">View All →</button>
            </div>
            <div className="alert-list">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="alert-item">
                  <div className="alert-info">
                    <span className={`alert-severity ${
                      alert.severity === 'Critical' ? 'alert-severity-critical' :
                      alert.severity === 'Warning' ? 'alert-severity-warning' :
                      'alert-severity-info'
                    }`}>
                      {alert.severity}
                    </span>
                    <h3 className="alert-type">{alert.type}</h3>
                    <p className="alert-details">
                      {alert.location} • {alert.time}
                    </p>
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

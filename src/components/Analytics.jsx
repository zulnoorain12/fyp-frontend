import React, { useState } from 'react';
import Sidebar from './Sidebar';
import '../styles/Analytics.css';

const Analytics = ({ onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState('week');

  const [stats] = useState({
    totalDetections: 1247,
    averageResponseTime: '2.3s',
    activityTimeRange: '9am - 5pm',
    accuracyRate: 94.8
  });

  const [detectionActivity] = useState([
    { time: '00:00', detections: 12 },
    { time: '03:00', detections: 8 },
    { time: '06:00', detections: 25 },
    { time: '09:00', detections: 145 },
    { time: '12:00', detections: 178 },
    { time: '15:00', detections: 156 },
    { time: '18:00', detections: 89 },
    { time: '21:00', detections: 34 }
  ]);

  const [alertDistribution] = useState([
    { type: 'Critical', count: 23, percentage: 18.4, color: 'rose' },
    { type: 'Warning', count: 45, percentage: 36.0, color: 'amber' },
    { type: 'Info', count: 57, percentage: 45.6, color: 'blue' }
  ]);

  const [behaviorAnalysis] = useState([
    { behavior: 'Normal Activity', count: 1098, percentage: 88.1 },
    { behavior: 'Loitering', count: 89, percentage: 7.1 },
    { behavior: 'Unauthorized Access', count: 34, percentage: 2.7 },
    { behavior: 'Suspicious Posture', count: 26, percentage: 2.1 }
  ]);

  const [cameraPerformance] = useState([
    { camera: 'Main Entrance', detections: 342, alerts: 12, uptime: 99.8 },
    { camera: 'Parking Lot', detections: 289, alerts: 18, uptime: 99.5 },
    { camera: 'Reception', detections: 267, alerts: 8, uptime: 100 },
    { camera: 'Server Room', detections: 156, alerts: 5, uptime: 99.9 },
    { camera: 'Hallway East', detections: 98, alerts: 3, uptime: 98.7 },
    { camera: 'Hallway West', detections: 95, alerts: 4, uptime: 99.2 }
  ]);

  const maxDetections = Math.max(...detectionActivity.map(d => d.detections));

  return (
    <div className="analytics-container">
      <Sidebar 
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="analytics-main">
        {/* Header */}
        <div className="analytics-header">
          <div className="analytics-header-content">
            <h1 className="analytics-title">Analytics & Insights</h1>
            <p className="analytics-subtitle">Monitor system performance and detection patterns</p>
          </div>
          <div className="analytics-actions">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="analytics-date-select"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button className="analytics-export-btn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Export Report</span>
            </button>
          </div>
        </div>

        <div className="analytics-status-banner">
          <div className="analytics-status-indicator"></div>
          <span className="analytics-status-text">System Online / All cameras operational</span>
        </div>

        {/* Stats Grid */}
        <div className="analytics-stats-grid">
          <div className="analytics-stat-card">
            <div className="stat-icon stat-icon-cyan">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Detections</p>
              <h3 className="stat-value">{stats.totalDetections.toLocaleString()}</h3>
              <p className="stat-change stat-change-positive">↑ 12% from last week</p>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="stat-icon stat-icon-purple">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Avg Response Time</p>
              <h3 className="stat-value">{stats.averageResponseTime}</h3>
              <p className="stat-change stat-change-positive">↓ 0.3s from last week</p>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="stat-icon stat-icon-blue">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Peak Activity</p>
              <h3 className="stat-value">{stats.activityTimeRange}</h3>
              <p className="stat-change stat-change-neutral">Same as last week</p>
            </div>
          </div>

          <div className="analytics-stat-card">
            <div className="stat-icon stat-icon-emerald">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2"/>
                <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Accuracy Rate</p>
              <h3 className="stat-value">{stats.accuracyRate}%</h3>
              <p className="stat-change stat-change-positive">↑ 2.1% from last week</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="analytics-charts-grid">
          {/* Detection Activity Chart */}
          <div className="analytics-chart-card analytics-chart-large">
            <div className="chart-header">
              <h3 className="chart-title">Detection Activity</h3>
              <p className="chart-subtitle">Hourly detection patterns over the last 24 hours</p>
            </div>
            <div className="chart-content">
              <div className="bar-chart">
                {detectionActivity.map((item, index) => (
                  <div key={index} className="bar-chart-item">
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ height: `${(item.detections / maxDetections) * 100}%` }}
                      >
                        <span className="bar-value">{item.detections}</span>
                      </div>
                    </div>
                    <span className="bar-label">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alert Distribution */}
          <div className="analytics-chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Alert Distribution</h3>
              <p className="chart-subtitle">Breakdown by severity level</p>
            </div>
            <div className="chart-content">
              <div className="distribution-chart">
                {alertDistribution.map((item, index) => (
                  <div key={index} className="distribution-item">
                    <div className="distribution-header">
                      <span className={`distribution-label distribution-label-${item.color}`}>
                        {item.type}
                      </span>
                      <span className="distribution-count">{item.count}</span>
                    </div>
                    <div className="distribution-bar-container">
                      <div 
                        className={`distribution-bar distribution-bar-${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="distribution-percentage">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Behavior Analysis */}
        <div className="analytics-charts-grid">
          <div className="analytics-chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Behavior Analysis</h3>
              <p className="chart-subtitle">Detected behavior patterns</p>
            </div>
            <div className="chart-content">
              <div className="behavior-list">
                {behaviorAnalysis.map((item, index) => (
                  <div key={index} className="behavior-item">
                    <div className="behavior-info">
                      <span className="behavior-name">{item.behavior}</span>
                      <span className="behavior-count">{item.count} incidents</span>
                    </div>
                    <div className="behavior-bar-container">
                      <div 
                        className="behavior-bar"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="behavior-percentage">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Camera Performance */}
          <div className="analytics-chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Camera Performance</h3>
              <p className="chart-subtitle">Activity and uptime by camera</p>
            </div>
            <div className="chart-content">
              <div className="camera-performance-list">
                {cameraPerformance.map((camera, index) => (
                  <div key={index} className="camera-performance-item">
                    <div className="camera-info">
                      <h4 className="camera-name">{camera.camera}</h4>
                      <div className="camera-metrics">
                        <span className="camera-metric">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {camera.detections}
                        </span>
                        <span className="camera-metric">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {camera.alerts}
                        </span>
                      </div>
                    </div>
                    <div className="camera-uptime">
                      <span className={`uptime-badge ${camera.uptime >= 99 ? 'uptime-excellent' : 'uptime-good'}`}>
                        {camera.uptime}% uptime
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
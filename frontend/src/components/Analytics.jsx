import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import '../styles/Analytics.css';
import { apiEndpoints } from '../services/api';
import socket from '../services/socket';

/* ─────────────────── helpers ─────────────────── */
const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const pct = (n, total) => (total === 0 ? 0 : +((n / total) * 100).toFixed(1));

const Analytics = ({ onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const liveTimeout = useRef(null);

  /* ── derived state ──────────────────────────── */
  const [stats, setStats] = useState({
    totalDetections: 0,
    averageConfidence: 0,
    peakHour: 'N/A',
    highSeverityRate: 0
  });
  const [detectionActivity, setDetectionActivity] = useState([]);
  const [alertDistribution, setAlertDistribution] = useState([]);
  const [detectionTypes, setDetectionTypes] = useState([]);
  const [recentDetections, setRecentDetections] = useState([]);

  /* ── compute analytics from raw detections ───── */
  const computeAnalytics = useCallback((detections) => {
    if (!detections || detections.length === 0) {
      setStats({ totalDetections: 0, averageConfidence: 0, peakHour: 'N/A', highSeverityRate: 0 });
      setDetectionActivity([]);
      setAlertDistribution([]);
      setDetectionTypes([]);
      setRecentDetections([]);
      return;
    }

    /* ── filter by dateRange ──────────────────── */
    const now = new Date();
    let cutoff;
    switch (dateRange) {
      case 'today': cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': cutoff = new Date(now - 7 * 86400000); break;
      case 'month': cutoff = new Date(now - 30 * 86400000); break;
      case 'year': cutoff = new Date(now - 365 * 86400000); break;
      default: cutoff = new Date(0);
    }
    const filtered = detections.filter(d => new Date(d.timestamp) >= cutoff);
    const total = filtered.length;

    /* ── stats ────────────────────────────────── */
    const avgConf = total > 0
      ? +(filtered.reduce((s, d) => s + (d.confidence || 0), 0) / total * 100).toFixed(1)
      : 0;

    const highCount = filtered.filter(d => (d.confidence || 0) >= 0.8).length;

    /* ── hourly activity ─────────────────────── */
    const hourBuckets = Array(8).fill(0);
    const hourLabels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
    filtered.forEach(d => {
      const h = new Date(d.timestamp).getHours();
      const bucket = Math.min(Math.floor(h / 3), 7);
      hourBuckets[bucket]++;
    });
    const peakIdx = hourBuckets.indexOf(Math.max(...hourBuckets));
    const activity = hourLabels.map((time, i) => ({ time, detections: hourBuckets[i] }));

    /* ── severity distribution ───────────────── */
    const sev = { Critical: 0, Warning: 0, Info: 0 };
    filtered.forEach(d => {
      const c = d.confidence || 0;
      if (c >= 0.8) sev.Critical++;
      else if (c >= 0.5) sev.Warning++;
      else sev.Info++;
    });
    const dist = [
      { type: 'Critical', count: sev.Critical, percentage: pct(sev.Critical, total), color: 'rose' },
      { type: 'Warning', count: sev.Warning, percentage: pct(sev.Warning, total), color: 'amber' },
      { type: 'Info', count: sev.Info, percentage: pct(sev.Info, total), color: 'blue' },
    ];

    /* ── detection types ─────────────────────── */
    const typeCounts = {};
    filtered.forEach(d => {
      const t = d.detection_type || d.type || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const typeLabels = { weapon: '🔫 Weapon', fire: '🔥 Fire', smoke: '💨 Smoke', fight: '👊 Fight', person: '🧍 Person' };
    const types = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type: typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1),
        count,
        percentage: pct(count, total)
      }));

    /* ── recent detections list ───────────────── */
    const recent = filtered
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8)
      .map(d => ({
        id: d.detection_id,
        type: d.detection_type || d.type || 'unknown',
        confidence: d.confidence || 0,
        time: timeAgo(d.timestamp),
        timestamp: d.timestamp
      }));

    /* ── commit ───────────────────────────────── */
    setStats({
      totalDetections: total,
      averageConfidence: avgConf,
      peakHour: hourBuckets[peakIdx] > 0 ? hourLabels[peakIdx] : 'N/A',
      highSeverityRate: pct(highCount, total)
    });
    setDetectionActivity(activity);
    setAlertDistribution(dist);
    setDetectionTypes(types);
    setRecentDetections(recent);
  }, [dateRange]);

  /* ── fetch from API ────────────────────────── */
  const detectionsRef = useRef([]);

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response = await apiEndpoints.getDetections(1000);
      const detections = response.data.detections || [];
      detectionsRef.current = detections;
      computeAnalytics(detections);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [computeAnalytics]);

  /* ── initial fetch + polling fallback ──────── */
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ── re-compute when dateRange changes ─────── */
  useEffect(() => {
    if (detectionsRef.current.length > 0) {
      computeAnalytics(detectionsRef.current);
    }
  }, [dateRange, computeAnalytics]);

  /* ── real-time Socket.IO updates ───────────── */
  useEffect(() => {
    const handleNewAlert = (alertData) => {
      console.log('[Analytics] Real-time update:', alertData);
      // Flash the live indicator
      setIsLive(true);
      if (liveTimeout.current) clearTimeout(liveTimeout.current);
      liveTimeout.current = setTimeout(() => setIsLive(false), 3000);

      // Add to our local detections and recompute
      const newDetection = {
        detection_id: alertData.id || Date.now(),
        detection_type: alertData.detection_type || alertData.type || 'unknown',
        type: alertData.detection_type || alertData.type || 'unknown',
        confidence: alertData.confidence || 0.5,
        timestamp: alertData.timestamp || new Date().toISOString()
      };
      detectionsRef.current = [newDetection, ...detectionsRef.current];
      computeAnalytics(detectionsRef.current);
      setLastUpdated(new Date());
    };

    socket.on('new_alert', handleNewAlert);
    return () => {
      socket.off('new_alert', handleNewAlert);
      if (liveTimeout.current) clearTimeout(liveTimeout.current);
    };
  }, [computeAnalytics]);

  const maxDetections = Math.max(...detectionActivity.map(d => d.detections), 1);

  /* ── Action Controls (shared between mobile & desktop) ── */
  const ActionControls = () => (
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
      <button className="analytics-refresh-btn" onClick={() => fetchData(false)} title="Refresh data">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="analytics-loading">
            <div className="analytics-loading-spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onClose={setSidebarOpen}
      />

      <div className="analytics-main">

        {/* ── Header ─────────────────────────────── */}
        <div className="analytics-header">
          <div className="analytics-mobile-bar">
            <button onClick={() => setSidebarOpen(true)} className="analytics-menu-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ActionControls />
          </div>

          <div className="analytics-title-mobile">
            <h1 className="analytics-title">Analytics & Insights</h1>
            <p className="analytics-subtitle">Real-time system performance and detection patterns</p>
          </div>

          <div className="analytics-desktop-row">
            <div className="analytics-header-content">
              <h1 className="analytics-title">Analytics & Insights</h1>
              <p className="analytics-subtitle">Real-time system performance and detection patterns</p>
            </div>
            <ActionControls />
          </div>
        </div>

        {/* ── Live Status Banner ─── */}
        <div className={`analytics-status-banner ${isLive ? 'analytics-status-live' : ''}`}>
          <div className={`analytics-status-indicator ${isLive ? 'analytics-status-pulse' : ''}`}></div>
          <span className="analytics-status-text">
            {isLive ? '🔴 Live update received' : 'System Online — Real-time monitoring active'}
          </span>
          {lastUpdated && (
            <span className="analytics-last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && (
          <div className="analytics-error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchData(true)}>Retry</button>
          </div>
        )}

        {/* ── Stats Grid ─── */}
        <div className="analytics-stats-grid">
          {[
            {
              iconClass: 'stat-icon-cyan', label: 'Total Detections',
              value: stats.totalDetections.toLocaleString(),
              change: stats.totalDetections > 0 ? `In selected period` : 'No detections yet',
              changeClass: stats.totalDetections > 0 ? 'stat-change-positive' : 'stat-change-neutral',
              icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /></>
            },
            {
              iconClass: 'stat-icon-purple', label: 'Avg Confidence',
              value: `${stats.averageConfidence}%`,
              change: stats.averageConfidence >= 70 ? 'High accuracy' : stats.averageConfidence >= 50 ? 'Moderate' : 'Low confidence',
              changeClass: stats.averageConfidence >= 70 ? 'stat-change-positive' : 'stat-change-neutral',
              icon: <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" /></>
            },
            {
              iconClass: 'stat-icon-blue', label: 'Peak Activity',
              value: stats.peakHour,
              change: stats.peakHour !== 'N/A' ? 'Most active time slot' : 'No data',
              changeClass: 'stat-change-neutral',
              icon: <><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" /><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" /><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" /></>
            },
            {
              iconClass: 'stat-icon-emerald', label: 'High Severity Rate',
              value: `${stats.highSeverityRate}%`,
              change: stats.highSeverityRate > 30 ? '⚠️ Needs attention' : 'Within normal range',
              changeClass: stats.highSeverityRate > 30 ? 'stat-change-negative' : 'stat-change-positive',
              icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" /><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" /></>
            },
          ].map((s, i) => (
            <div key={i} className="analytics-stat-card">
              <div className={`stat-icon ${s.iconClass}`}>
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none">{s.icon}</svg>
              </div>
              <div className="stat-content">
                <p className="stat-label">{s.label}</p>
                <h3 className="stat-value">{s.value}</h3>
                <p className={`stat-change ${s.changeClass}`}>{s.change}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Detection Activity + Alert Distribution ─── */}
        <div className="analytics-charts-grid">

          <div className="analytics-chart-card analytics-chart-large">
            <div className="chart-header">
              <h3 className="chart-title">Detection Activity</h3>
              <p className="chart-subtitle">Detection patterns across 3-hour intervals</p>
            </div>
            <div className="chart-content">
              {detectionActivity.length > 0 && detectionActivity.some(d => d.detections > 0) ? (
                <div className="bar-chart">
                  {detectionActivity.map((item, index) => (
                    <div key={index} className="bar-chart-item">
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{ height: `${Math.max((item.detections / maxDetections) * 100, 2)}%` }}
                        >
                          <span className="bar-value">{item.detections}</span>
                        </div>
                      </div>
                      <span className="bar-label">{item.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty-state">
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M7 16l4-4 4 4 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>No detection activity in this period</p>
                </div>
              )}
            </div>
          </div>

          <div className="analytics-chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Alert Distribution</h3>
              <p className="chart-subtitle">Breakdown by severity level</p>
            </div>
            <div className="chart-content">
              {alertDistribution.some(d => d.count > 0) ? (
                <div className="distribution-chart">
                  {alertDistribution.map((item, index) => (
                    <div key={index} className="distribution-item">
                      <div className="distribution-header">
                        <span className={`distribution-label distribution-label-${item.color}`}>{item.type}</span>
                        <span className="distribution-count">{item.count}</span>
                      </div>
                      <div className="distribution-bar-container">
                        <div className={`distribution-bar distribution-bar-${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                      <span className="distribution-percentage">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty-state">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p>No alerts in this period</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Detection Types + Recent Detections ─── */}
        <div className="analytics-charts-grid">

          <div className="analytics-chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Detection Types</h3>
              <p className="chart-subtitle">Breakdown by detection category</p>
            </div>
            <div className="chart-content">
              {detectionTypes.length > 0 ? (
                <div className="behavior-list">
                  {detectionTypes.map((item, index) => (
                    <div key={index} className="behavior-item">
                      <div className="behavior-info">
                        <span className="behavior-name">{item.type}</span>
                        <span className="behavior-count">{item.count} detection{item.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="behavior-bar-container">
                        <div className="behavior-bar" style={{ width: `${item.percentage}%` }}></div>
                      </div>
                      <span className="behavior-percentage">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty-state">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <p>No detection types recorded</p>
                </div>
              )}
            </div>
          </div>

          <div className="analytics-chart-card">
            <div className="chart-header">
              <div className="chart-header-row">
                <div>
                  <h3 className="chart-title">Recent Detections</h3>
                  <p className="chart-subtitle">Latest detection events (live)</p>
                </div>
                {isLive && <span className="live-badge">● LIVE</span>}
              </div>
            </div>
            <div className="chart-content">
              {recentDetections.length > 0 ? (
                <div className="recent-detections-list">
                  {recentDetections.map((item, index) => {
                    const typeLabels = { weapon: '🔫 Weapon', fire: '🔥 Fire', smoke: '💨 Smoke', fight: '👊 Fight', person: '🧍 Person' };
                    const typeLabel = typeLabels[item.type] || item.type;
                    const severityClass = item.confidence >= 0.8 ? 'severity-critical'
                      : item.confidence >= 0.5 ? 'severity-warning' : 'severity-info';
                    return (
                      <div key={item.id || index} className={`recent-detection-item ${index === 0 && isLive ? 'recent-detection-new' : ''}`}>
                        <div className="recent-detection-info">
                          <span className="recent-detection-type">{typeLabel}</span>
                          <span className={`recent-detection-confidence ${severityClass}`}>
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <span className="recent-detection-time">{item.time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="analytics-empty-state">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <p>No recent detections</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Analytics;

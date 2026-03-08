import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/dashboard';
import LiveFeed from './components/LiveFeed';
import Alerts from './components/Alerts';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Detection from './components/Detection';

const API_URL = 'http://localhost:8000';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // On mount, check if user has a valid token stored
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Verify token is still valid by calling /api/auth/me
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setCurrentPage('dashboard');
          } else {
            // Token expired – try refreshing
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });

              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                localStorage.setItem('access_token', refreshData.access_token);
                localStorage.setItem('refresh_token', refreshData.refresh_token);

                // Re-fetch user
                const meRes = await fetch(`${API_URL}/api/auth/me`, {
                  headers: { Authorization: `Bearer ${refreshData.access_token}` },
                });
                if (meRes.ok) {
                  const meData = await meRes.json();
                  setUser(meData.user);
                  setCurrentPage('dashboard');
                } else {
                  clearAuth();
                }
              } else {
                clearAuth();
              }
            } else {
              clearAuth();
            }
          }
        } catch {
          // Server might be down – stay on login
          clearAuth();
        }
      }
      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleLogout = () => {
    clearAuth();
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
  };

  // Show nothing while checking auth to avoid flash of login page
  if (!authChecked) {
    return null;
  }

  if (currentPage === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  // Render the appropriate page based on currentPage
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
      case 'live-feed':
        return <LiveFeed onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
      case 'detection':
        return <Detection onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
      case 'alerts':
        return <Alerts onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
      case 'analytics':
        return <Analytics onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
      default:
        return <Dashboard onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} user={user} />;
    }
  };

  return renderPage();
}

export default App;

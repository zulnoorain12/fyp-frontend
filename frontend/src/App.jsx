import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/dashboard';
import LiveFeed from './components/LiveFeed';
import Alerts from './components/Alerts';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Detection from './components/Detection';

function App() {
  const [currentPage, setCurrentPage] = useState('login');

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleLogout = () => {
    setCurrentPage('login');
  };

  if (currentPage === 'login') {
    return <Login onLogin={() => setCurrentPage('dashboard')} />;
  }

  // Render the appropriate page based on currentPage
  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
      case 'live-feed':
        return <LiveFeed onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
      case 'detection':
        return <Detection onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
      case 'alerts':
        return <Alerts onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
      case 'analytics':
        return <Analytics onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
      default:
        return <Dashboard onNavigate={handleNavigate} currentPage={currentPage} onLogout={handleLogout} />;
    }
  };

  return renderPage();
}

export default App;

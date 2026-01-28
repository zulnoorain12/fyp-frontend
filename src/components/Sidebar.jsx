import React from 'react';

const Sidebar = ({ currentPage, onNavigate, onLogout, sidebarOpen, setSidebarOpen }) => {
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        </>
      )
    },
    { 
      id: 'live-feed', 
      label: 'Live Feed', 
      icon: (
        <>
          <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2"/>
          <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        </>
      )
    },
    { 
      id: 'alerts', 
      label: 'Alerts', 
      icon: (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
        </>
      )
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: (
        <>
          <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2"/>
          <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2"/>
        </>
      )
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: (
        <>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 1v6m0 6v6m8.66-15.66l-4.24 4.24m-4.24 4.24l-4.24 4.24M23 12h-6m-6 0H1m19.66 3.66l-4.24-4.24m-4.24-4.24l-4.24-4.24" stroke="currentColor" strokeWidth="2"/>
        </>
      )
    }
  ];

  return (
    <>
      {/* Desktop & Mobile Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-white">CyberisAI</span>
          </div>
          {/* Close button for mobile */}
          <button 
            className="lg:hidden w-8 h-8 text-slate-400 hover:text-white transition-colors duration-300" 
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden ${
                currentPage === item.id 
                  ? 'text-white bg-white/5 before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-cyan-500 before:to-blue-600' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="w-5 h-5 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
                  {item.icon}
                </svg>
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Admin User</p>
              <p className="text-slate-400 text-xs">Administrator</p>
            </div>
          </div>
          <button 
            className="w-9 h-9 rounded-lg bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition-all duration-300"
            onClick={onLogout}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl text-white flex items-center justify-center hover:bg-slate-800 transition-all duration-300"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
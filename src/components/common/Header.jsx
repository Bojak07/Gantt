import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Header() {
  const { currentView, setCurrentView, resetDemo, refreshAll, loading } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (window.confirm('Reset all demo data back to the clean enterprise initial state?')) {
      setResetting(true);
      await resetDemo();
      setResetting(false);
    }
  };

  const navItems = [
    { id: 'portfolio', label: 'Portfolio', icon: 'fa-chart-pie' },
    { id: 'plan', label: 'Plan (Gantt)', icon: 'fa-chart-gantt' },
    { id: 'resources', label: 'Resources', icon: 'fa-users-gear' },
    { id: 'management', label: 'Management', icon: 'fa-sliders' },
    { id: 'presentation', label: 'Presentation', icon: 'fa-display' }
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-wrapper" onClick={() => setCurrentView('portfolio')}>
          <div className="brand-icon">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-title">ZupaViz</span>
              {/*<span className="brand-tag">Enterprise</span>*/}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs" role="tablist">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-tab-btn ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
              role="tab"
              aria-selected={currentView === item.id}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={resetting || loading}
          title="Restore standard demo data in SQLite"
        >
          <i className={`fa-solid fa-arrow-rotate-left ${resetting ? 'fa-spin' : ''}`}></i>
          <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
        </button>

        <button
          className="btn btn-icon"
          onClick={refreshAll}
          disabled={loading}
          title="Refresh Data from Server"
        >
          <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
        </button>

        <button
          className="btn btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </div>
    </header>
  );
}

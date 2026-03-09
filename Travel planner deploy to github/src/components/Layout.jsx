import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import SaveIndicator from './SaveIndicator';
import './Layout.css';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>
      <div className={`sidebar-wrap ${mobileMenuOpen ? 'sidebar-wrap-open' : ''}`}>
        <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <main className="main-content">
        <Outlet />
      </main>
      <SaveIndicator />
    </div>
  );
}

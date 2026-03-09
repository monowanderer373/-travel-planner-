import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import Sidebar from './Sidebar';
import SaveIndicator from './SaveIndicator';
import './Layout.css';

function hasItinerary(trip) {
  return !!(trip?.destination?.trim() && trip?.startDate && trip?.endDate);
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { trip } = useItinerary();
  const itineraryReady = hasItinerary(trip);
  const pathname = location.pathname || '';
  const isCreate = pathname.endsWith('create') || pathname.endsWith('create/');
  const isSettings = pathname.endsWith('settings') || pathname.endsWith('settings/');
  const allowedWithoutItinerary = isCreate || isSettings;

  if (!allowedWithoutItinerary && !itineraryReady) {
    return <Navigate to="/create" replace />;
  }

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

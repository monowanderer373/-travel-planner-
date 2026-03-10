import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import SaveIndicator from './SaveIndicator';
import './Layout.css';

function hasItinerary(trip) {
  return !!(trip?.destination?.trim() && trip?.startDate && trip?.endDate);
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { trip, shareSettings } = useItinerary();
  const itineraryReady = hasItinerary(trip);
  const pathname = location.pathname || '';
  const search = location.search || '';
  const isCreate = pathname.endsWith('create') || pathname.endsWith('create/');
  const isSettings = pathname.endsWith('settings') || pathname.endsWith('settings/');
  const allowedWithoutItinerary = isCreate || isSettings;
  const params = new URLSearchParams(search);
  const hasInviteQuery = params.has('invite') || params.has('trip');
  let hasPendingInvite = false;
  try {
    hasPendingInvite = !!localStorage.getItem('pending_invite_token') || !!localStorage.getItem('pending_trip_id');
  } catch {}
  const joiningSharedTrip = !!shareSettings?.tripId || hasInviteQuery || hasPendingInvite;

  // Don't redirect to /create while invite/shared-trip bootstrapping is in progress.
  if (!allowedWithoutItinerary && !itineraryReady && !joiningSharedTrip) {
    return <Navigate to="/create" replace />;
  }

  return (
    <div className="app-layout">
      <header className="layout-topbar">
        <TopBar onMenuClick={() => setMobileMenuOpen((o) => !o)} menuOpen={mobileMenuOpen} />
      </header>
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="layout-body">
        <div className={`sidebar-wrap ${mobileMenuOpen ? 'sidebar-wrap-open' : ''}`}>
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </div>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      {createPortal(
        <div className="bottom-nav-wrap">
          <BottomNav />
        </div>,
        document.body
      )}
      <SaveIndicator />
    </div>
  );
}

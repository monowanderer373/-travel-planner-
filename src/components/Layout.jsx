import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import TopBar from './TopBar';
import JoinSharedTripModal from './JoinSharedTripModal';
import SharedTripGuestBanner from './SharedTripGuestBanner';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import SaveIndicator from './SaveIndicator';
import './Layout.css';

function hasItinerary(trip) {
  return !!(trip?.destination?.trim() && trip?.startDate && trip?.endDate);
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showJoinShared, setShowJoinShared] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { trip, shareSettings, tripmates, tripCreator } = useItinerary();
  const itineraryReady = hasItinerary(trip);
  const pathname = location.pathname || '';
  const search = location.search || '';
  const isCreate = pathname.endsWith('create') || pathname.endsWith('create/');
  const isSettings = pathname.endsWith('settings') || pathname.endsWith('settings/');
  const allowedWithoutItinerary = isCreate || isSettings;
  const params = new URLSearchParams(search);
  const hasInviteQuery = params.has('invite') || params.has('trip');
  const hasPlanQuery = params.has('plan');
  let hasPendingInvite = false;
  try {
    hasPendingInvite = !!localStorage.getItem('pending_invite_token') || !!localStorage.getItem('pending_trip_id');
  } catch {}
  const bootstrappingPlan = !!shareSettings?.tripId || hasInviteQuery || hasPendingInvite || hasPlanQuery;

  useEffect(() => {
    try {
      const j = sessionStorage.getItem('share_join_flow');
      if (!j || shareSettings.tripId !== j || !user?.id || String(user.id).startsWith('user-')) {
        setShowJoinShared(false);
        return;
      }
      const isCreator =
        tripCreator?.email &&
        user?.email &&
        String(tripCreator.email).trim().toLowerCase() === String(user.email).trim().toLowerCase();
      const member = tripmates.some((m) => m.userId && m.userId === user.id);
      setShowJoinShared(!isCreator && !member);
    } catch {
      setShowJoinShared(false);
    }
  }, [shareSettings.tripId, user?.id, user?.email, tripmates, tripCreator?.email]);

  useEffect(() => {
    // Keep browser tab title in sync with language + route.
    const p = (pathname || '').replace(/\/+$/, '');
    const label =
      p === '' || p === '/'
        ? t('nav.home')
        : p.endsWith('/create')
          ? t('nav.create')
          : p.endsWith('/itinerary')
            ? t('nav.itinerary')
            : p.endsWith('/saved')
              ? t('nav.saved')
              : p.endsWith('/transport')
                ? t('nav.transport')
                : p.endsWith('/cost')
                  ? t('nav.cost')
                  : p.endsWith('/group')
                    ? t('home.tripmates.title')
                    : p.endsWith('/settings')
                      ? t('nav.settings')
                      : '';
    const app = t('app.name');
    const next = label ? `${app} — ${label}` : app;
    if (typeof document !== 'undefined') document.title = next;
  }, [t, pathname]);

  const isGuestOnShared =
    !!shareSettings?.tripId && user?.id && String(user.id).startsWith('user-');

  // Don't redirect to /create while invite/shared-trip bootstrapping is in progress.
  if (!allowedWithoutItinerary && !itineraryReady && !bootstrappingPlan) {
    return <Navigate to="/create" replace />;
  }

  return (
    <div className="app-layout">
      {isGuestOnShared && <SharedTripGuestBanner />}
      {showJoinShared && <JoinSharedTripModal onDone={() => setShowJoinShared(false)} />}
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

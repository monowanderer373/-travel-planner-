import { Component, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SaveStatusProvider } from './context/SaveStatusContext';
import { ItineraryProvider } from './context/ItineraryContext';
import { CostProvider } from './context/CostContext';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import CreateItinerary from './pages/CreateItinerary';
import Itinerary from './pages/Itinerary';
import SavedPlaces from './pages/SavedPlaces';
import Transport from './pages/Transport';
import TripJournal from './pages/TripJournal';
import Cost from './pages/Cost';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ShareView from './pages/ShareView';
import Group from './pages/Group';
import './App.css';

const AUTH_RETURN_KEY = 'auth_return_to';

function RequireAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();

  // After OAuth, Google redirects to site root (/) so Welcome never mounts. Redirect to stored join/share path if present.
  useEffect(() => {
    if (!authReady || !user) return;
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(AUTH_RETURN_KEY) : null;
    if (!stored) return;
    const currentPath = location.pathname + location.search;
    if (stored === currentPath) return;
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    navigate(stored, { replace: true });
  }, [authReady, user, location.pathname, location.search, navigate]);

  // Extra safety: if invite token survived OAuth in localStorage, force user back to invite URL.
  useEffect(() => {
    if (!authReady || !user) return;
    const pendingTrip = typeof localStorage !== 'undefined' ? localStorage.getItem('pending_trip_id') : null;
    if (pendingTrip) {
      const params = new URLSearchParams(location.search);
      const currentTrip = params.get('trip');
      if (currentTrip !== pendingTrip) {
        navigate(`/?trip=${encodeURIComponent(pendingTrip)}`, { replace: true });
        return;
      }
      return;
    }
    const pendingInvite = typeof localStorage !== 'undefined' ? localStorage.getItem('pending_invite_token') : null;
    if (!pendingInvite) return;
    const params = new URLSearchParams(location.search);
    const currentInvite = params.get('invite');
    if (currentInvite === pendingInvite) return;
    navigate(`/?invite=${encodeURIComponent(pendingInvite)}`, { replace: true });
  }, [authReady, user, location.pathname, location.search, navigate]);

  if (!authReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', fontFamily: 'system-ui' }}>
        Loading…
      </div>
    );
  }
  if (!user) {
    const trip = new URLSearchParams(location.search).get('trip');
    const invite = new URLSearchParams(location.search).get('invite');
    if (trip && typeof localStorage !== 'undefined') localStorage.setItem('pending_trip_id', trip);
    if (invite && typeof localStorage !== 'undefined') localStorage.setItem('pending_invite_token', invite);
    return <Navigate to="/welcome" state={{ from: location.pathname + location.search }} replace />;
  }
  return <Outlet />;
}

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ color: '#c06060' }}>Something went wrong</h1>
          <p>The app hit an error. Try refreshing the page.</p>
          <pre style={{ background: '#f5f0e8', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem' }}>
            {this.state.error?.message}
            {this.state.error?.stack ? `\n\n${this.state.error.stack}` : null}
            {this.state.error?.componentStack ? `\n\n${this.state.error.componentStack}` : null}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <LanguageProvider>
    <AuthProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL}>
      <SaveStatusProvider>
        <ItineraryProvider>
          <CostProvider>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/share/:shareId" element={<ShareView />} />
            <Route path="/join/:joinId" element={<ShareView />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="create" element={<CreateItinerary />} />
                <Route path="itinerary" element={<Itinerary />} />
                <Route path="saved" element={<SavedPlaces />} />
                <Route path="transport" element={<Transport />} />
                <Route path="journal" element={<TripJournal />} />
                <Route path="cost" element={<Cost />} />
                <Route path="group" element={<Group />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </CostProvider>
        </ItineraryProvider>
      </SaveStatusProvider>
    </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

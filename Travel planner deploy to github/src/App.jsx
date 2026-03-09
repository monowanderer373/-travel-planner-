import { Component } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SaveStatusProvider } from './context/SaveStatusContext';
import { ItineraryProvider } from './context/ItineraryContext';
import { CostProvider } from './context/CostContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Itinerary from './pages/Itinerary';
import SavedPlaces from './pages/SavedPlaces';
import Transport from './pages/Transport';
import TripJournal from './pages/TripJournal';
import Cost from './pages/Cost';
import Settings from './pages/Settings';
import './App.css';

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
    <BrowserRouter basename={import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL}>
      <SaveStatusProvider>
        <ItineraryProvider>
          <CostProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="itinerary" element={<Itinerary />} />
              <Route path="saved" element={<SavedPlaces />} />
              <Route path="transport" element={<Transport />} />
              <Route path="journal" element={<TripJournal />} />
              <Route path="cost" element={<Cost />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          </CostProvider>
        </ItineraryProvider>
      </SaveStatusProvider>
    </BrowserRouter>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

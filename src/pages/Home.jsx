import { Link } from 'react-router-dom';
import SummaryBlock from '../components/SummaryBlock';
import ShareModal from '../components/ShareModal';
import AddTripmateButton from '../components/AddTripmateButton';
import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { getTotalTravelDays } from '../utils/time';
import './Home.css';

export default function Home() {
  const [shareOpen, setShareOpen] = useState(false);
  const { trip, days } = useItinerary();
  const hasTripDetails = trip.destination?.trim() && trip.startDate && trip.endDate;
  const totalDays = hasTripDetails ? getTotalTravelDays(trip.startDate, trip.endDate) : days.length;

  return (
    <div className="page home-page">
      <header className="page-header">
        <h1>Plan your trip</h1>
        <div className="page-header-actions">
          <AddTripmateButton />
          <button type="button" className="primary" onClick={() => setShareOpen(true)}>
            Share itinerary
          </button>
        </div>
      </header>
      {!hasTripDetails && (
        <p className="home-validation-hint">
          Set your destination and dates in Create itinerary to see the full summary.
        </p>
      )}
      <section className="section home-trip-summary">
        <div className="home-trip-summary-header">
          <h2 className="section-title">Trip details</h2>
          <Link to="/create" className="home-edit-trip">Edit trip</Link>
        </div>
        <div className="summary-overview home-trip-overview">
          <p><strong>Destination:</strong> {trip.destination || '—'}</p>
          <p><strong>Dates:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}</p>
          <p><strong>Total days:</strong> {totalDays}</p>
          {trip.locations?.length > 0 && (
            <p><strong>Locations:</strong> {trip.locations.join(', ')}</p>
          )}
        </div>
      </section>
      <SummaryBlock />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

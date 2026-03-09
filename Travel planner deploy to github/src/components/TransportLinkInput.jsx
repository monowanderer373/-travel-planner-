import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import TransportCard from './TransportCard';
import './TransportLinkInput.css';

/** Placeholder: in production would fetch route/schedule from link */
function fetchTransportFromLink(link) {
  if (!link?.trim()) return null;
  return {
    id: `transport-${Date.now()}`,
    travelTime: '45 min',
    mode: 'Train',
    routeOverview: 'Station A → Station B → Station C',
    nextTrainTimes: ['10:15', '10:45', '11:15'],
    estimatedArrival: '11:00',
    rawLink: link,
  };
}

export default function TransportLinkInput() {
  const { trip, updateTrip } = useItinerary();
  const [transportData, setTransportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const link = trip.transportLink?.trim();
    if (!link) return;
    setLoading(true);
    setTimeout(() => {
      setTransportData(fetchTransportFromLink(link));
      setLoading(false);
    }, 500);
  };

  return (
    <section className="section transport-link-section">
      <h2 className="section-title">Transport / train route</h2>
      <form onSubmit={handleSubmit} className="transport-link-form">
        <input
          type="url"
          placeholder="Google Maps route or train schedule link"
          value={trip.transportLink}
          onChange={(e) => updateTrip({ transportLink: e.target.value })}
          className="transport-link-input"
        />
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Loading…' : 'Load route'}
        </button>
      </form>
      {transportData && (
        <div className="transport-result animate-in">
          <TransportCard transport={transportData} onAddToTimeline={() => {}} />
        </div>
      )}
    </section>
  );
}

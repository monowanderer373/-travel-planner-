import GeneralInputs from '../components/GeneralInputs';
import SummaryBlock from '../components/SummaryBlock';
import ShareModal from '../components/ShareModal';
import AddTripmateButton from '../components/AddTripmateButton';
import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import './Home.css';

export default function Home() {
  const [shareOpen, setShareOpen] = useState(false);
  const { trip } = useItinerary();
  const showTripHint = !trip.destination?.trim() || !trip.startDate || !trip.endDate;

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
      {showTripHint && (
        <p className="home-validation-hint">
          Tip: Set destination and dates above for your trip summary and export.
        </p>
      )}
      <GeneralInputs />
      <SummaryBlock />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

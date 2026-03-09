import DayPanel from '../components/DayPanel';
import ShareModal from '../components/ShareModal';
import { useState } from 'react';
import './Itinerary.css';

export default function Itinerary() {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="page itinerary-page">
      <header className="page-header">
        <h1>Daily planner</h1>
        <button type="button" className="primary" onClick={() => setShareOpen(true)}>
          Share itinerary
        </button>
      </header>
      <p className="page-intro">
        Add days and plan your schedule from 8 AM to 11 PM. Click a start time, then an end time to create a block.
      </p>
      <DayPanel />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { formatHour } from '../utils/time';
import './TripJournal.css';

export default function TripJournal() {
  const { trip, days, savedPlaces, savedTransports, tripMemories, updateTripMemories } = useItinerary();
  const [copyStatus, setCopyStatus] = useState('');

  const buildSummaryText = useCallback(() => {
    const lines = [];
    lines.push('TRIP SUMMARY');
    lines.push('');
    lines.push(`Destination: ${trip.destination || '—'}`);
    lines.push(`Dates: ${trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}`);
    if (trip.travelStyle) lines.push(`Style: ${trip.travelStyle}`);
    if (trip.budget) lines.push(`Budget: ${trip.budget}`);
    lines.push('');
    lines.push('ITINERARY BY DAY');
    days.forEach((day) => {
      lines.push(`\n${day.label}`);
      (day.timeline || []).forEach((item) => {
        const time = `${formatHour(item.startHour)} – ${formatHour(item.endHour)}`;
        const name = item.type === 'transport'
          ? `🚆 ${item.lineName || 'Transport'} (${item.durationMinutes ?? item.duration ?? '—'} min)`
          : item.name;
        lines.push(`  ${time}  ${name}`);
      });
    });
    if (savedPlaces.length > 0) {
      lines.push('\nSAVED PLACES');
      savedPlaces.forEach((p) => lines.push(`  • ${p.name || p.title || 'Place'}`));
    }
    if (savedTransports.length > 0) {
      lines.push('\nSAVED ROUTES');
      savedTransports.forEach((t) => lines.push(`  • ${t.lineName}: ${t.locationA} → ${t.locationB} (${t.durationMinutes} min)`));
    }
    if (tripMemories.trim()) {
      lines.push('\nMEMORIES');
      lines.push(tripMemories.trim());
    }
    return lines.join('\n');
  }, [trip, days, savedPlaces, savedTransports, tripMemories]);

  const handleCopySummary = async () => {
    const text = buildSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied to clipboard');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Could not copy');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page journal-page">
      <header className="page-header">
        <h1>Trip Journal</h1>
        <div className="journal-header-actions">
          <button type="button" className="primary" onClick={handleCopySummary}>
            Copy trip summary
          </button>
          <button type="button" onClick={handlePrint}>Print / Save as PDF</button>
          {copyStatus && <span className="journal-copy-status">{copyStatus}</span>}
        </div>
      </header>
      <p className="journal-intro">Your whole trip at a glance. Summarize it into memories below.</p>

      <section className="section journal-section journal-trip">
        <h2 className="section-title">Trip details</h2>
        <div className="journal-trip-details">
          <p><strong>Destination:</strong> {trip.destination || '—'}</p>
          <p><strong>Dates:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}</p>
          {trip.travelStyle && <p><strong>Style:</strong> {trip.travelStyle}</p>}
          {trip.budget && <p><strong>Budget:</strong> {trip.budget}</p>}
        </div>
      </section>

      <section className="section journal-section">
        <h2 className="section-title">Itinerary by day</h2>
        {days.length === 0 ? (
          <p className="journal-empty">No days added yet.</p>
        ) : (
          <div className="journal-days">
            {days.map((day) => (
              <div key={day.id} className="journal-day">
                <h3>{day.label}</h3>
                {!day.timeline?.length ? (
                  <p className="journal-empty">No activities</p>
                ) : (
                  <ul className="journal-timeline">
                    {day.timeline.map((item) => (
                      <li key={item.id} className={item.type === 'transport' ? 'journal-item-transport' : ''}>
                        <span className="journal-item-time">
                          {formatHour(item.startHour)} – {formatHour(item.endHour)}
                        </span>
                        {item.type === 'transport' ? (
                          <span className="journal-item-name">🚆 {item.lineName || 'Transport'} ({item.durationMinutes ?? (item.duration && `${item.duration}h`)})</span>
                        ) : (
                          <span className="journal-item-name">{item.name}</span>
                        )}
                        {item.notes && <span className="journal-item-notes">{item.notes}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {savedPlaces.length > 0 && (
        <section className="section journal-section">
          <h2 className="section-title">Saved places</h2>
          <ul className="journal-places">
            {savedPlaces.map((p) => (
              <li key={p.id}>{p.name || p.title || 'Place'}</li>
            ))}
          </ul>
        </section>
      )}

      {savedTransports.length > 0 && (
        <section className="section journal-section">
          <h2 className="section-title">Saved routes</h2>
          <ul className="journal-routes">
            {savedTransports.map((t) => (
              <li key={t.id}>{t.lineName}: {t.locationA} → {t.locationB} ({t.durationMinutes} min)</li>
            ))}
          </ul>
        </section>
      )}

      <section className="section journal-section journal-memories">
        <h2 className="section-title">Memories</h2>
        <p className="journal-memories-hint">Summarize your trip into memories (e.g. highlights, feelings, tips).</p>
        <textarea
          className="journal-memories-input"
          placeholder="Write your trip memories here..."
          value={tripMemories}
          onChange={(e) => updateTripMemories(e.target.value)}
          rows={6}
        />
      </section>
    </div>
  );
}

import { useItinerary } from '../context/ItineraryContext';
import { formatTimelineTime } from '../utils/time';
import './ResultArea.css';

export default function ResultArea() {
  const { trip, days } = useItinerary();

  const totalHours = days.reduce(
    (acc, day) =>
      acc + (day.timeline || []).reduce((a, t) => a + (t.endHour - t.startHour), 0),
    0
  );

  const handleCopy = () => {
    const text = [
      `Trip: ${trip.destination}`,
      `Dates: ${trip.startDate} – ${trip.endDate}`,
      `Budget: ${trip.budget}`,
      `Style: ${trip.travelStyle}`,
      '',
      ...days.map(
        (d) =>
          `${d.label}: ${(d.timeline || []).map((t) => `${t.name} (${formatTimelineTime(t)})`).join(', ')}`
      ),
      '',
      `Total planned time: ${totalHours} hours`,
    ].join('\n');
    navigator.clipboard?.writeText(text);
  };

  const handleExport = () => {
    const data = { trip, days, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itinerary-${trip.destination || 'trip'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="section result-area">
      <h2 className="section-title">Summary & output</h2>
      <div className="result-summary">
        <div className="result-trip">
          <h3>{trip.destination || 'Your trip'}</h3>
          <p>{trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}</p>
          <p>Budget: {trip.budget || '—'} · Style: {trip.travelStyle || '—'}</p>
        </div>
        <div className="result-days">
          {days.map((day) => (
            <div key={day.id} className="result-day">
              <h4>{day.label}</h4>
              <ul>
                {(day.timeline || []).map((t, i) => (
                  <li key={i}>
                    <strong>{t.name}</strong> — {formatTimelineTime(t)}
                    {t.notes && ` · ${t.notes}`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="result-meta">
          <p>Estimated total travel time: <strong>{totalHours} hours</strong></p>
        </div>
        <div className="result-map-preview">
          <div className="map-placeholder">
            Google Maps link preview (placeholder)
            <p className="map-hint">In production: embed or link to map with your places</p>
          </div>
        </div>
        <div className="result-actions">
          <button type="button" className="primary" onClick={handleCopy}>
            Copy summary
          </button>
          <button type="button" onClick={handleExport}>
            Export JSON
          </button>
        </div>
      </div>
    </section>
  );
}

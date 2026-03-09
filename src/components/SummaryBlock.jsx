import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { formatHour } from '../utils/time';
import './SummaryBlock.css';

export default function SummaryBlock() {
  const { trip, days } = useItinerary();
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id || null);

  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];
  const timeline = selectedDay?.timeline || [];

  return (
    <>
      <section className="section summary-section">
        <h2 className="section-title">Summary — places by day</h2>
        <p className="summary-intro">Select a day to see its schedule.</p>
        <div className="summary-day-tabs">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`summary-day-tab ${selectedDayId === d.id ? 'summary-day-tab-active' : ''}`}
              onClick={() => setSelectedDayId(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section summary-section">
        <h2 className="section-title">{selectedDay?.label} — places to go</h2>
        {timeline.length === 0 ? (
          <p className="summary-empty">No activities or transport for this day yet. Add from Itinerary or Transport.</p>
        ) : (
          <ol className="summary-list">
            {timeline.map((item) => (
              <li key={item.id} className={`summary-item ${item.type === 'transport' ? 'summary-item-transport' : ''}`}>
                <span className="summary-item-time">
                  {formatHour(item.startHour)} – {formatHour(item.endHour)}
                </span>
                <span className="summary-item-name">
                  {item.type === 'transport' ? (
                    <>🚆 {item.lineName || 'Transport'} ({item.duration ?? (item.endHour - item.startHour)}h)</>
                  ) : (
                    item.name
                  )}
                </span>
                {item.notes && <span className="summary-item-notes">{item.notes}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="section summary-section">
        <h2 className="section-title">Trip overview</h2>
        <div className="summary-overview">
          <p><strong>Destination:</strong> {trip.destination || '—'}</p>
          <p><strong>Dates:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}</p>
          <p><strong>Days:</strong> {days.length}</p>
        </div>
      </section>
    </>
  );
}

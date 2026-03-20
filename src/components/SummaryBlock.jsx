import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { formatTimelineTime } from '../utils/time';
import './SummaryBlock.css';

export default function SummaryBlock() {
  const { t } = useLanguage();
  const { trip, days } = useItinerary();
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id || null);

  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];
  const timeline = selectedDay?.timeline || [];

  return (
    <>
      <section className="section summary-section">
        <h2 className="section-title">{t('summary.placesByDay')}</h2>
        <p className="summary-intro">{t('summary.selectDay')}</p>
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
        <h2 className="section-title">{selectedDay?.label} — {t('summary.placesToGo')}</h2>
        {timeline.length === 0 ? (
          <p className="summary-empty">{t('summary.emptyDay')}</p>
        ) : (
          <ol className="summary-list">
            {timeline.map((item) => (
              <li key={item.id} className={`summary-item ${item.type === 'transport' ? 'summary-item-transport' : ''}`}>
                <span className="summary-item-time">
                  {formatTimelineTime(item)}
                </span>
                <span className="summary-item-name">
                  {item.type === 'transport' ? (
                    <>🚆 {item.lineName || t('transport.title')} ({item.duration ?? (item.endHour - item.startHour)}h)</>
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
        <h2 className="section-title">{t('summary.tripOverview')}</h2>
        <div className="summary-overview">
          <p><strong>{t('summary.destination')}:</strong> {trip.destination || t('home.dash')}</p>
          <p><strong>{t('summary.dates')}:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : t('home.dash')}</p>
          <p><strong>{t('summary.days')}:</strong> {days.length}</p>
        </div>
      </section>
    </>
  );
}

import { useState, useCallback } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { formatHour, getTripStatus } from '../utils/time';
import './TripJournal.css';

const STATUS_LABELS = {
  upcoming: { en: 'Upcoming Trip', zh: '即将出发' },
  current: { en: 'Current Trip', zh: '进行中' },
  past: { en: 'Past Trip', zh: '已结束' },
};

export default function TripJournal() {
  const { trip, days, savedPlaces, savedTransports, tripMemories, updateTripMemories } = useItinerary();
  const { lang } = useLanguage();
  const [copyStatus, setCopyStatus] = useState('');
  const tripStatus = getTripStatus(trip.startDate, trip.endDate);
  const isZh = lang === 'zh-CN';
  const statusLabel = tripStatus && STATUS_LABELS[tripStatus] ? (isZh ? STATUS_LABELS[tripStatus].zh : STATUS_LABELS[tripStatus].en) : '';

  const buildSummaryText = useCallback(() => {
    const lines = [];
    lines.push('TRIP SUMMARY');
    lines.push('');
    lines.push(`Destination: ${trip.destination || '—'}`);
    lines.push(`Dates: ${trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}`);
    if (trip.travelStyle) lines.push(`Style: ${trip.travelStyle}`);
    if (trip.budget) lines.push(`Budget: ${trip.budget}`);
    lines.push('');
    lines.push('ITINERARY OF THE TRIP');
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
        <h1>{isZh ? '旅行日记' : 'Trip Journal'}</h1>
        <div className="journal-header-actions">
          <button type="button" className="primary" onClick={handleCopySummary}>
            {isZh ? '复制行程摘要' : 'Copy trip summary'}
          </button>
          <button type="button" onClick={handlePrint}>{isZh ? '打印 / 另存为 PDF' : 'Print / Save as PDF'}</button>
          {copyStatus && <span className="journal-copy-status">{copyStatus}</span>}
        </div>
      </header>
      <p className="journal-intro">{isZh ? '行程一览，可在下方写下回忆。' : 'Your whole trip at a glance. Summarize it into memories below.'}</p>

      <section className="section journal-section journal-trip">
        <h2 className="section-title">{isZh ? '行程详情' : 'Trip details'}</h2>
        <div className="journal-trip-details">
          {statusLabel && (
            <p className="journal-trip-status">
              <strong>{isZh ? '状态' : 'Status'}:</strong>{' '}
              <span className={`journal-status-badge journal-status-${tripStatus}`}>{statusLabel}</span>
            </p>
          )}
          <p><strong>{isZh ? '目的地' : 'Destination'}:</strong> {trip.destination || '—'}</p>
          <p><strong>{isZh ? '日期' : 'Dates'}:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : '—'}</p>
          {trip.travelStyle && <p><strong>{isZh ? '风格' : 'Style'}:</strong> {trip.travelStyle}</p>}
          {trip.budget && <p><strong>{isZh ? '预算' : 'Budget'}:</strong> {trip.budget}</p>}
        </div>

        <h3 className="journal-subsection-title">{isZh ? '行程安排' : 'Itinerary of the trip'}</h3>
        {days.length === 0 ? (
          <p className="journal-empty">{isZh ? '尚未添加日程' : 'No days added yet.'}</p>
        ) : (
          <div className="journal-days">
            {days.map((day) => (
              <div key={day.id} className="journal-day">
                <h4 className="journal-day-label">{day.label}</h4>
                {!day.timeline?.length ? (
                  <p className="journal-empty">{isZh ? '无活动' : 'No activities'}</p>
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

        {savedPlaces.length > 0 && (
          <>
            <h3 className="journal-subsection-title">{isZh ? '收藏地点' : 'Saved places'}</h3>
            <ul className="journal-places">
              {savedPlaces.map((p) => (
                <li key={p.id}>{p.name || p.title || 'Place'}</li>
              ))}
            </ul>
          </>
        )}

        {savedTransports.length > 0 && (
          <>
            <h3 className="journal-subsection-title">{isZh ? '交通路线' : 'Saved routes'}</h3>
            <ul className="journal-routes">
              {savedTransports.map((t) => (
                <li key={t.id}>{t.lineName}: {t.locationA} → {t.locationB} ({t.durationMinutes} min)</li>
              ))}
            </ul>
          </>
        )}

        <h3 className="journal-subsection-title">{isZh ? '回忆' : 'Memories'}</h3>
        <p className="journal-memories-hint">{isZh ? '写下行程中的亮点、感受或小贴士。' : 'Summarize your trip into memories (e.g. highlights, feelings, tips).'}</p>
        <textarea
          className="journal-memories-input"
          placeholder={isZh ? '在此写下旅行回忆…' : 'Write your trip memories here...'}
          value={tripMemories}
          onChange={(e) => updateTripMemories(e.target.value)}
          rows={6}
        />
      </section>
    </div>
  );
}

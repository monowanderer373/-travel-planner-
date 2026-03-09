import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import PlaceCard from './PlaceCard';
import './PlaceLinkInput.css';

function extractEmbedUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes('<iframe') && trimmed.includes('src=')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) return match[1].trim();
  }
  if (trimmed.startsWith('http') && trimmed.includes('maps/embed')) return trimmed;
  return trimmed.startsWith('http') ? trimmed : null;
}

// 24hr options: 00:00 to 23:30 in 30-min steps
const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`);
    opts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return opts;
})();

function buildPlaceFromEmbed(embedInputRaw, manualName, openTime, closeTime, extraNote) {
  const embedUrl = extractEmbedUrl(embedInputRaw);
  if (!embedUrl) return null;
  const hours = openTime && closeTime ? `${openTime} – ${closeTime}` : '—';
  return {
    id: `place-${Date.now()}`,
    title: manualName?.trim() || 'Map location',
    hours,
    rating: null,
    category: 'Place',
    photoUrl: null,
    reviews: [],
    embedUrl,
    extraNote: extraNote?.trim() || '',
  };
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8–23

export default function PlaceLinkInput() {
  const { addSavedPlace, days, addToTimeline } = useItinerary();
  const [placeData, setPlaceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [embedInput, setEmbedInput] = useState('');
  const [manualName, setManualName] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [extraNote, setExtraNote] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDayId, setAddDayId] = useState('');
  const [addTimeMode, setAddTimeMode] = useState('specific');
  const [addStartHour, setAddStartHour] = useState(9);
  const [addEndHour, setAddEndHour] = useState(11);

  const canLoad = !!extractEmbedUrl(embedInput);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canLoad) return;
    setLoading(true);
    setTimeout(() => {
      const data = buildPlaceFromEmbed(embedInput, manualName, openTime, closeTime, extraNote);
      setPlaceData(data);
      setSavedFeedback(false);
      setLoading(false);
    }, 400);
  };

  const handleEmbedChange = (e) => {
    const raw = e.target.value;
    const extracted = extractEmbedUrl(raw);
    setEmbedInput(raw.includes('<iframe') && extracted ? extracted : raw);
  };

  const handleAddToSaved = () => {
    if (!placeData) return;
    addSavedPlace(placeData);
    setSavedFeedback(true);
    // Clear form after short delay so user sees "Saved" feedback, then form resets for next place
    setTimeout(() => {
      setPlaceData(null);
      setSavedFeedback(false);
      setEmbedInput('');
      setManualName('');
      setOpenTime('09:00');
      setCloseTime('18:00');
      setExtraNote('');
    }, 1500);
  };

  const handleOpenAddModal = () => {
    if (!placeData || !days.length) return;
    setAddDayId(days[0]?.id || '');
    setAddStartHour(9);
    setAddEndHour(11);
    setAddModalOpen(true);
  };

  const handleConfirmAddToTimeline = () => {
    if (!placeData || !addDayId) return;
    const start = addTimeMode === 'specific' ? addStartHour : addStartHour;
    const end = addTimeMode === 'specific' ? addStartHour + 1 : Math.max(addStartHour + 1, addEndHour);
    const endHour = Math.min(23, end);
    addToTimeline(addDayId, {
      id: `tl-${Date.now()}`,
      name: placeData.title,
      startHour: start,
      endHour: endHour,
      duration: endHour - start,
      notes: placeData.extraNote || '',
    });
    setAddModalOpen(false);
  };

  return (
    <section className="section place-link-section">
      <h2 className="section-title">Map place (embed only)</h2>
      <form onSubmit={handleSubmit} className="place-link-form">
        <label className="place-link-field place-link-embed">
          <span>Embed — paste embed URL or full iframe HTML from Google Maps → Share → Embed a map</span>
          <textarea
            placeholder='Paste embed URL or iframe HTML (<iframe src="..." ...></iframe>)'
            value={embedInput}
            onChange={handleEmbedChange}
            className="place-link-input place-link-embed-textarea"
            rows={3}
          />
        </label>
        <div className="place-link-manual-fields">
          <span className="place-link-manual-label">Optional — place name and operating hours (24hr):</span>
          <label className="place-link-field">
            <span>Place name</span>
            <input
              type="text"
              placeholder="e.g. Tsutenkaku"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="place-link-input"
            />
          </label>
          <div className="place-link-time-row">
            <label className="place-link-field">
              <span>Open (24hr)</span>
              <select value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="place-link-input">
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="place-link-field">
              <span>Close (24hr)</span>
              <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="place-link-input">
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <label className="place-link-field place-link-extra-note">
          <span>Extra note</span>
          <textarea
            placeholder="e.g. Cash only, watch for stairs, last entry 30 min before close"
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            className="place-link-input"
            rows={2}
          />
        </label>
        <button type="submit" className="primary" disabled={loading || !canLoad}>
          {loading ? 'Loading…' : 'Load place'}
        </button>
        {!canLoad && (
          <p className="place-link-hint">Paste the embed (URL or iframe HTML) to load.</p>
        )}
      </form>

      {placeData && (
        <div className="place-result animate-in">
          <PlaceCard
            place={placeData}
            onAddToDay={handleOpenAddModal}
            onAddToSaved={handleAddToSaved}
            savedFeedback={savedFeedback}
          />
        </div>
      )}

      {addModalOpen && placeData && (
        <div className="place-modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="place-modal" onClick={(e) => e.stopPropagation()}>
            <div className="place-modal-header">
              <h3>Add to timeline</h3>
              <button type="button" className="place-modal-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="place-modal-body">
              <label className="place-modal-field">
                <span>Day</span>
                <select value={addDayId} onChange={(e) => setAddDayId(e.target.value)}>
                  {days.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </label>
              <div className="place-modal-time-mode">
                <span>Time</span>
                <label className="place-modal-radio">
                  <input type="radio" checked={addTimeMode === 'specific'} onChange={() => setAddTimeMode('specific')} />
                  Specific hour
                </label>
                <label className="place-modal-radio">
                  <input type="radio" checked={addTimeMode === 'range'} onChange={() => setAddTimeMode('range')} />
                  Between hours
                </label>
              </div>
              {addTimeMode === 'specific' ? (
                <label className="place-modal-field">
                  <span>Hour</span>
                  <select value={addStartHour} onChange={(e) => setAddStartHour(Number(e.target.value))}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h === 12 ? '12:00' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                  <span className="place-modal-time-hint">→ 1 hour slot (e.g. 9:00–10:00)</span>
                </label>
              ) : (
                <div className="place-modal-range">
                  <label className="place-modal-field">
                    <span>Start</span>
                    <select value={addStartHour} onChange={(e) => { const v = Number(e.target.value); setAddStartHour(v); if (addEndHour <= v) setAddEndHour(v + 1); }}>
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h === 12 ? '12:00' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="place-modal-field">
                    <span>End</span>
                    <select value={addEndHour} onChange={(e) => setAddEndHour(Number(e.target.value))}>
                      {HOURS.filter((h) => h > addStartHour).map((h) => (
                        <option key={h} value={h}>{h === 12 ? '12:00' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="place-modal-footer">
              <button type="button" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="button" className="primary" onClick={handleConfirmAddToTimeline}>
                Add to timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

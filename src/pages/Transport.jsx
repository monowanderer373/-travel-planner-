import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import './Transport.css';

function extractEmbedUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes('<iframe') && trimmed.includes('src=')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) return match[1].trim();
  }
  if (trimmed.startsWith('http') && (trimmed.includes('maps/embed') || trimmed.includes('google'))) return trimmed;
  return trimmed.startsWith('http') ? trimmed : null;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
const MINUTES = [0, 15, 30, 45];

export default function Transport() {
  const { t } = useLanguage();
  const { days, addToTimeline, savedTransports, addSavedTransport, removeSavedTransport } = useItinerary();
  const [embedInput, setEmbedInput] = useState('');
  const [locationA, setLocationA] = useState('');
  const [locationB, setLocationB] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [lineName, setLineName] = useState('');
  const [useManualDuration, setUseManualDuration] = useState(false);
  const [loadedRoute, setLoadedRoute] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [transportToAdd, setTransportToAdd] = useState(null);
  const [addDayId, setAddDayId] = useState(days[0]?.id || '');
  const [leaveHour, setLeaveHour] = useState(9);
  const [leaveMin, setLeaveMin] = useState(0);
  const [arriveHour, setArriveHour] = useState(10);
  const [arriveMin, setArriveMin] = useState(0);

  const canLoad = !!extractEmbedUrl(embedInput) || (locationA && locationB);

  const handleLoadRoute = (e) => {
    e.preventDefault();
    const embedUrl = extractEmbedUrl(embedInput);
    if (!embedUrl && !locationA.trim() && !locationB.trim()) return;
    setLoadedRoute({
      id: `route-${Date.now()}`,
      embedUrl: embedUrl || null,
      locationA: locationA.trim() || t('transport.locationA'),
      locationB: locationB.trim() || t('transport.locationB'),
      durationMinutes: useManualDuration ? durationMinutes : 45,
      lineName: lineName.trim() || t('transport.defaultLineName'),
    });
  };

  const handleSaveRoute = () => {
    if (!loadedRoute) return;
    addSavedTransport(loadedRoute);
    setLoadedRoute(null);
    setEmbedInput('');
    setLocationA('');
    setLocationB('');
    setDurationMinutes(45);
    setLineName('');
  };

  const openAddToItineraryModal = (transport) => {
    setTransportToAdd(transport);
    setAddDayId(days[0]?.id || '');
    setLeaveHour(9);
    setLeaveMin(0);
    setArriveHour(10);
    setArriveMin(0);
    setAddModalOpen(true);
  };

  const handleAddToItinerary = () => {
    const transport = transportToAdd;
    if (!transport || !addDayId) return;
    const startHour = leaveHour + leaveMin / 60;
    let endHour = arriveHour + arriveMin / 60;
    if (endHour <= startHour) endHour = startHour + (transport.durationMinutes ?? 45) / 60;
    endHour = Math.min(23 + 59/60, endHour);
    const duration = endHour - startHour;
    const durationMinutes = transport.durationMinutes ?? Math.round(duration * 60);
    addToTimeline(addDayId, {
      id: `tl-${Date.now()}`,
      type: 'transport',
      name: `${transport.lineName}: ${transport.locationA} → ${transport.locationB}`,
      lineName: transport.lineName,
      locationA: transport.locationA,
      locationB: transport.locationB,
      startHour,
      endHour,
      duration,
      durationMinutes,
      notes: `${durationMinutes} min`,
    });
    setAddModalOpen(false);
    setTransportToAdd(null);
  };

  const handleEmbedChange = (e) => {
    const raw = e.target.value;
    const extracted = extractEmbedUrl(raw);
    setEmbedInput(raw.includes('<iframe') && extracted ? extracted : raw);
  };

  return (
    <div className="page transport-page">
      <header className="page-header">
        <h1>{t('transport.title')}</h1>
      </header>

      <section className="section transport-section">
        <h2 className="section-title">{t('transport.addRoute')}</h2>
        <p className="transport-hint">{t('transport.hint')}</p>
        <form onSubmit={handleLoadRoute} className="transport-form">
          <label className="transport-field transport-field-wide">
            <span>{t('transport.embedLabel')}</span>
            <textarea
              placeholder={t('transport.embedPlaceholder')}
              value={embedInput}
              onChange={handleEmbedChange}
              className="transport-textarea"
              rows={2}
            />
          </label>
          <div className="transport-row">
            <label className="transport-field">
              <span>{t('transport.from')}</span>
              <input type="text" placeholder="e.g. Tokyo Station" value={locationA} onChange={(e) => setLocationA(e.target.value)} />
            </label>
            <label className="transport-field">
              <span>{t('transport.to')}</span>
              <input type="text" placeholder="e.g. Shinjuku" value={locationB} onChange={(e) => setLocationB(e.target.value)} />
            </label>
          </div>
          <label className="transport-field transport-check">
            <input type="checkbox" checked={useManualDuration} onChange={(e) => setUseManualDuration(e.target.checked)} />
            <span>{t('transport.manualDuration')} (if embed doesn’t work)</span>
          </label>
          {useManualDuration && (
            <label className="transport-field">
              <span>{t('transport.durationMinutes')}</span>
              <input type="number" min={1} max={600} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
            </label>
          )}
          <label className="transport-field">
            <span>{t('transport.lineRouteName')}</span>
            <input type="text" placeholder="e.g. JR Yamanote Line" value={lineName} onChange={(e) => setLineName(e.target.value)} />
          </label>
          <button type="submit" className="primary" disabled={!canLoad}>
            {t('transport.loadRoute')}
          </button>
        </form>
      </section>

      {loadedRoute && (
        <section className="section transport-section transport-loaded animate-in">
          <h2 className="section-title">{t('transport.loadedRoute')}</h2>
          {loadedRoute.embedUrl && (
            <div className="transport-embed-wrap">
              <iframe
                src={loadedRoute.embedUrl}
                title="Route map"
                className="transport-embed-iframe"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
          <div className="transport-route-info">
            <p><strong>{loadedRoute.locationA}</strong> → <strong>{loadedRoute.locationB}</strong></p>
            <p>{loadedRoute.lineName} · {loadedRoute.durationMinutes} min</p>
          </div>
          <div className="transport-loaded-actions">
            <button type="button" className="primary" onClick={handleSaveRoute}>{t('transport.saveRoute')}</button>
            <button type="button" onClick={() => openAddToItineraryModal(loadedRoute)}>{t('transport.addToItinerary')}</button>
          </div>
        </section>
      )}

      {savedTransports.length > 0 && (
        <section className="section transport-section">
          <h2 className="section-title">{t('transport.savedRoutes')}</h2>
          <div className="transport-saved-list">
            {savedTransports.map((t) => (
              <div key={t.id} className="transport-saved-card">
                {t.embedUrl && (
                  <div className="transport-saved-embed">
                    <iframe src={t.embedUrl} title={t.lineName} className="transport-saved-iframe" />
                  </div>
                )}
                <div className="transport-saved-body">
                  <p className="transport-saved-route">{t.locationA} → {t.locationB}</p>
                  <p className="transport-saved-meta">{t.lineName} · {t.durationMinutes} min</p>
                  <div className="transport-saved-actions">
                    <button type="button" className="primary" onClick={() => openAddToItineraryModal(t)}>{t('transport.addToItinerary')}</button>
                    <button type="button" onClick={() => removeSavedTransport(t.id)}>{t('transport.remove')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {addModalOpen && transportToAdd && (
        <div className="transport-modal-backdrop" onClick={() => { setAddModalOpen(false); setTransportToAdd(null); }}>
          <div className="transport-modal" onClick={(e) => e.stopPropagation()}>
            <div className="transport-modal-header">
              <h3>{t('transport.addToItinerary')}</h3>
              <button type="button" className="transport-modal-close" onClick={() => { setAddModalOpen(false); setTransportToAdd(null); }}>×</button>
            </div>
            <div className="transport-modal-body">
              <p className="transport-modal-hint">{t('transport.modalHint')}</p>
              <label className="transport-modal-field">
                <span>{t('transport.day')}</span>
                <select value={addDayId} onChange={(e) => setAddDayId(e.target.value)}>
                  {days.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </label>
              <div className="transport-modal-time-row">
                <div className="transport-modal-field-group">
                  <span className="transport-modal-field-label">{t('transport.leaving')}</span>
                  <div className="transport-time-inputs">
                    <label className="transport-time-label">
                      <select value={leaveHour} onChange={(e) => { const h = Number(e.target.value); setLeaveHour(h); if (arriveHour < h || (arriveHour === h && arriveMin <= leaveMin)) { setArriveHour(h); setArriveMin(Math.min(59, leaveMin + 30)); } }}>
                        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span>hr</span>
                    </label>
                    <label className="transport-time-label">
                      <select value={leaveMin} onChange={(e) => setLeaveMin(Number(e.target.value))}>
                        {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                      </select>
                      <span>min</span>
                    </label>
                  </div>
                </div>
                <div className="transport-modal-field-group">
                  <span className="transport-modal-field-label">{t('transport.arriving')}</span>
                  <div className="transport-time-inputs">
                    <label className="transport-time-label">
                      <select value={arriveHour} onChange={(e) => { setArriveHour(Number(e.target.value)); if (Number(e.target.value) === leaveHour && arriveMin <= leaveMin) setArriveMin(Math.min(59, leaveMin + 15)); }}>
                        {HOURS.filter((h) => h >= leaveHour).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span>hr</span>
                    </label>
                    <label className="transport-time-label">
                      <select value={arriveMin} onChange={(e) => setArriveMin(Number(e.target.value))}>
                        {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                      </select>
                      <span>min</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="transport-modal-footer">
              <button type="button" onClick={() => { setAddModalOpen(false); setTransportToAdd(null); }}>{t('transport.cancel')}</button>
              <button type="button" className="primary" onClick={handleAddToItinerary}>
                {t('transport.addToItinerary')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

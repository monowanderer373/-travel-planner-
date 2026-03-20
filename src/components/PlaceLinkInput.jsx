import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import {
  extractPlaceNameFromGoogleMapsUrl,
  extractEmbedUrl,
  extractSourceUrl,
  findSavedPlaceByDuplicateLink,
} from '../utils/mapsEmbed';
import PlaceCard from './PlaceCard';
import { resolveDayForTimelineAdd } from '../lib/itineraryPayloadCompare';
import { formatHour, formatHourDropdownLabel } from '../utils/time';
import './PlaceLinkInput.css';

// "-" = unspecified; then 00:00–23:30 in 30-min steps
const TIME_OPTIONS = [
  '-',
  ...(() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      opts.push(`${String(h).padStart(2, '0')}:00`);
      opts.push(`${String(h).padStart(2, '0')}:30`);
    }
    return opts;
  })(),
];

function buildPlaceFromEmbed(embedInputRaw, manualName, openTime, closeTime, extraNote) {
  const embedUrl = extractEmbedUrl(embedInputRaw);
  if (!embedUrl) return null;
  const sourceUrl = extractSourceUrl(embedInputRaw) || embedUrl;
  const inferred = extractPlaceNameFromGoogleMapsUrl(sourceUrl);
  const hasHours =
    openTime &&
    closeTime &&
    openTime !== '-' &&
    closeTime !== '-';
  const hours = hasHours ? `${openTime} – ${closeTime}` : '—';
  return {
    id: `place-${Date.now()}`,
    title: manualName?.trim() || inferred || '',
    hours,
    rating: null,
    category: '',
    photoUrl: null,
    reviews: [],
    embedUrl,
    mapUrl: sourceUrl,
    extraNote: extraNote?.trim() || '',
  };
}

/** Whole hours 0–23 (full day) */
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function PlaceLinkInput({
  initialEmbedUrl = '',
  /** Import modal: one-click save, close parent, duplicate notice */
  importDirectSave = false,
  onImportDone,
  onDuplicateDismiss,
}) {
  const { t } = useLanguage();
  const { addSavedPlace, days, addToTimeline, savedPlaces } = useItinerary();
  const [placeData, setPlaceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [embedInput, setEmbedInput] = useState(initialEmbedUrl || '');
  const [manualName, setManualName] = useState('');
  const [openTime, setOpenTime] = useState('-');
  const [closeTime, setCloseTime] = useState('-');
  const [extraNote, setExtraNote] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDayId, setAddDayId] = useState('');
  const [addDayIndex, setAddDayIndex] = useState(0);
  const [addTimeMode, setAddTimeMode] = useState('specific');
  const [addStartHour, setAddStartHour] = useState(9);
  const [addEndHour, setAddEndHour] = useState(11);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingPlace, setPendingPlace] = useState(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);

  const canLoad = !!extractEmbedUrl(embedInput);
  const inferredName = useMemo(() => {
    const src = extractSourceUrl(embedInput);
    return src ? extractPlaceNameFromGoogleMapsUrl(src) : null;
  }, [embedInput]);

  const resetFormFields = () => {
    setPlaceData(null);
    setSavedFeedback(false);
    setEmbedInput('');
    setManualName('');
    setOpenTime('-');
    setCloseTime('-');
    setExtraNote('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canLoad) return;

    if (importDirectSave) {
      const dup = findSavedPlaceByDuplicateLink(embedInput, savedPlaces);
      if (dup) {
        setDuplicateNotice(true);
        return;
      }
      setLoading(true);
      setTimeout(() => {
        const data = buildPlaceFromEmbed(embedInput, manualName, openTime, closeTime, extraNote);
        if (!data) {
          setLoading(false);
          return;
        }
        const resolvedTitle = (manualName.trim() || inferredName || data.title || '').trim();
        if (!resolvedTitle) {
          setPendingPlace(data);
          setPendingName('');
          setNamePromptOpen(true);
          setLoading(false);
          return;
        }
        addSavedPlace({ ...data, title: resolvedTitle });
        setLoading(false);
        resetFormFields();
        onImportDone?.();
      }, 400);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const data = buildPlaceFromEmbed(embedInput, manualName, openTime, closeTime, extraNote);
      setPlaceData(data);
      if (!manualName.trim() && inferredName) setManualName(inferredName);
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
    const title = (placeData.title || '').trim();
    if (!title) {
      setPendingPlace(placeData);
      setPendingName('');
      setNamePromptOpen(true);
      return;
    }
    addSavedPlace({ ...placeData, title });
    setSavedFeedback(true);
    // Clear form after short delay so user sees "Saved" feedback, then form resets for next place
    setTimeout(() => {
      resetFormFields();
    }, 1500);
  };

  const confirmName = () => {
    const name = (pendingName || '').trim();
    if (!pendingPlace || !name) return;
    addSavedPlace({ ...pendingPlace, title: name });
    setNamePromptOpen(false);
    setPendingPlace(null);
    setPendingName('');
    setSavedFeedback(true);
    if (importDirectSave) {
      resetFormFields();
      onImportDone?.();
      return;
    }
    setTimeout(() => {
      resetFormFields();
    }, 1500);
  };

  const handleOpenAddModal = () => {
    if (!placeData || !days.length) return;
    setAddDayId(days[0]?.id || '');
    setAddDayIndex(0);
    setAddStartHour(9);
    setAddEndHour(11);
    setAddModalOpen(true);
  };

  const handleConfirmAddToTimeline = () => {
    if (!placeData) return;
    const day = resolveDayForTimelineAdd(days, addDayId, addDayIndex);
    if (!day?.id) return;
    const start = addTimeMode === 'specific' ? addStartHour : addStartHour;
    const end = addTimeMode === 'specific' ? addStartHour + 1 : Math.max(addStartHour + 1, addEndHour);
    const endHour = Math.min(24, end);
    addToTimeline(day.id, {
      id: `tl-${Date.now()}`,
      name: placeData.title || t('place.placeName'),
      mapUrl: placeData.mapUrl || placeData.embedUrl || '',
      startHour: start,
      endHour: endHour,
      duration: endHour - start,
      notes: placeData.extraNote || '',
    });
    setAddModalOpen(false);
  };

  return (
    <section className="section place-link-section">
      <h2 className="section-title">{t('place.mapPlace')}</h2>
      <form onSubmit={handleSubmit} className="place-link-form">
        <label className="place-link-field place-link-embed">
          <span>{t('place.pasteHint')} (link from Maps app) — we’ll embed it</span>
          <textarea
            placeholder={t('place.pasteHint')}
            value={embedInput}
            onChange={handleEmbedChange}
            className="place-link-input place-link-embed-textarea"
            rows={3}
          />
        </label>
        <div className="place-link-manual-fields">
          <span className="place-link-manual-label">{t('place.optionalFields')}</span>
          <label className="place-link-field">
            <span>{t('place.placeName')}</span>
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
              <span>{t('place.open')}</span>
              <select value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="place-link-input">
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="place-link-field">
              <span>{t('place.close')}</span>
              <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="place-link-input">
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <label className="place-link-field place-link-extra-note">
          <span>{t('place.extraNote')}</span>
          <textarea
            placeholder="e.g. Cash only, watch for stairs, last entry 30 min before close"
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            className="place-link-input"
            rows={2}
          />
        </label>
        <button type="submit" className="primary" disabled={loading || !canLoad}>
          {loading ? t('place.loading') : importDirectSave ? t('place.savePlace') : t('place.previewPlace')}
        </button>
        {!canLoad && (
          <p className="place-link-hint">{t('place.pasteEmbed')}</p>
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

      {namePromptOpen && (
        <div className="place-modal-backdrop" onClick={() => setNamePromptOpen(false)}>
          <div className="place-modal" onClick={(e) => e.stopPropagation()}>
            <div className="place-modal-header">
              <h3>{t('place.namePromptTitle')}</h3>
              <button type="button" className="place-modal-close" onClick={() => setNamePromptOpen(false)}>×</button>
            </div>
            <div className="place-modal-body">
              <p className="cost-hint" style={{ marginTop: 0 }}>{t('place.namePromptDesc')}</p>
              <label className="place-modal-field">
                <span>{t('place.placeName')}</span>
                <input
                  type="text"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  placeholder={t('place.placeName')}
                  autoFocus
                />
              </label>
              <div className="place-modal-actions">
                <button type="button" className="primary" onClick={confirmName} disabled={!pendingName.trim()}>
                  {t('place.savePlace')}
                </button>
                <button type="button" onClick={() => setNamePromptOpen(false)}>{t('cost.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicateNotice &&
        createPortal(
          <div
            className="place-duplicate-overlay"
            role="alertdialog"
            aria-live="polite"
            onClick={() => {
              setDuplicateNotice(false);
              onDuplicateDismiss?.();
            }}
          >
            <div className="place-duplicate-card">
              <p className="place-duplicate-text">{t('place.importDuplicateNotice')}</p>
              <p className="place-duplicate-hint">{t('place.importDuplicateTap')}</p>
            </div>
          </div>,
          document.body
        )}

      {addModalOpen && placeData && (
        <div className="place-modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="place-modal" onClick={(e) => e.stopPropagation()}>
            <div className="place-modal-header">
              <h3>{t('place.addToTimeline')}</h3>
              <button type="button" className="place-modal-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="place-modal-body">
              <label className="place-modal-field">
                <span>{t('saved.day')}</span>
                <select
                  value={addDayId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAddDayId(id);
                    const i = days.findIndex((d) => d.id === id);
                    if (i >= 0) setAddDayIndex(i);
                  }}
                >
                  {days.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </label>
              <div className="place-modal-time-mode">
                <span>{t('saved.time')}</span>
                <label className="place-modal-radio">
                  <input type="radio" checked={addTimeMode === 'specific'} onChange={() => setAddTimeMode('specific')} />
                  {t('saved.specificHour')}
                </label>
                <label className="place-modal-radio">
                  <input type="radio" checked={addTimeMode === 'range'} onChange={() => setAddTimeMode('range')} />
                  {t('saved.betweenHours')}
                </label>
              </div>
              {addTimeMode === 'specific' ? (
                <label className="place-modal-field">
                  <span>{t('saved.hour')}</span>
                  <select value={addStartHour} onChange={(e) => setAddStartHour(Number(e.target.value))}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{formatHourDropdownLabel(h)}</option>
                    ))}
                  </select>
                  <span className="place-modal-time-hint">{t('place.timeSlotHint')}</span>
                </label>
              ) : (
                <div className="place-modal-range">
                  <label className="place-modal-field">
                    <span>{t('saved.start')}</span>
                    <select value={addStartHour} onChange={(e) => { const v = Number(e.target.value); setAddStartHour(v); if (addEndHour <= v) setAddEndHour(v + 1); }}>
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{formatHourDropdownLabel(h)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="place-modal-field">
                    <span>{t('saved.end')}</span>
                    <select value={addEndHour} onChange={(e) => setAddEndHour(Number(e.target.value))}>
                      {Array.from({ length: 24 - addStartHour }, (_, i) => addStartHour + 1 + i).map((h) => (
                        <option key={h} value={h}>{h <= 23 ? formatHourDropdownLabel(h) : formatHour(24)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="place-modal-footer">
              <button type="button" onClick={() => setAddModalOpen(false)}>{t('saved.cancel')}</button>
              <button type="button" className="primary" onClick={handleConfirmAddToTimeline}>
                {t('place.addToTimeline')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

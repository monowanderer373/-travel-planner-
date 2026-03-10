import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import PlaceCard from '../components/PlaceCard';
import PlaceLinkInput from '../components/PlaceLinkInput';
import VotingUI from '../components/VotingUI';
import './SavedPlaces.css';

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`);
    opts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return opts;
})();

function parseHours(hours) {
  if (!hours || hours === '—') return { open: '09:00', close: '18:00' };
  const parts = hours.split(/\s*[–-]\s*/);
  const open = parts[0]?.trim() && TIME_OPTIONS.includes(parts[0].trim()) ? parts[0].trim() : '09:00';
  const close = parts[1]?.trim() && TIME_OPTIONS.includes(parts[1].trim()) ? parts[1].trim() : '18:00';
  return { open, close };
}

function SavedPlaceEdit({ place, onUpdate }) {
  const [title, setTitle] = useState(place.title || '');
  const { open: initOpen, close: initClose } = parseHours(place.hours);
  const [openTime, setOpenTime] = useState(initOpen);
  const [closeTime, setCloseTime] = useState(initClose);
  const [extraNote, setExtraNote] = useState(place.extraNote || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const hours = openTime && closeTime ? `${openTime} – ${closeTime}` : place.hours || '—';
    onUpdate(place.id, { title: title.trim() || place.title, hours, extraNote: extraNote.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const { t } = useLanguage();
  return (
    <div className="saved-place-edit">
      <span className="saved-place-edit-label">{t('saved.editLabel')}</span>
      <div className="saved-place-edit-row">
        <label className="saved-place-edit-field">
          <span>{t('saved.placeName')}</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('saved.placeName')} />
        </label>
        <label className="saved-place-edit-field">
          <span>{t('saved.open')}</span>
          <select value={openTime} onChange={(e) => setOpenTime(e.target.value)}>
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="saved-place-edit-field">
          <span>{t('saved.close')}</span>
          <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)}>
            {TIME_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
      </div>
      <label className="saved-place-edit-field saved-place-edit-extra">
        <span>{t('saved.extraNote')}</span>
        <input type="text" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="e.g. Cash only, watch for stairs" />
      </label>
      <button type="button" className="primary saved-place-edit-btn" onClick={handleSave}>
        {saved ? t('saved.updated') : t('saved.update')}
      </button>
    </div>
  );
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8–23

export default function SavedPlaces() {
  const { t } = useLanguage();
  const { savedPlaces, removeSavedPlace, setVotes, updateSavedPlace, days, addToTimeline } = useItinerary();
  const maxVotes = savedPlaces.length ? Math.max(...savedPlaces.map((p) => p.votes || 0)) : 0;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalPlace, setAddModalPlace] = useState(null);
  const [addDayId, setAddDayId] = useState('');
  const [addTimeMode, setAddTimeMode] = useState('specific');
  const [addStartHour, setAddStartHour] = useState(9);
  const [addEndHour, setAddEndHour] = useState(11);

  const handleOpenAddModal = (place) => {
    if (!place || !days.length) return;
    setAddModalPlace(place);
    setAddDayId(days[0]?.id || '');
    setAddStartHour(9);
    setAddEndHour(11);
    setAddModalOpen(true);
  };

  const handleConfirmAddToTimeline = () => {
    if (!addModalPlace || !addDayId) return;
    const start = addTimeMode === 'specific' ? addStartHour : addStartHour;
    const end = addTimeMode === 'specific' ? addStartHour + 1 : Math.max(addStartHour + 1, addEndHour);
    const endHour = Math.min(23, end);
    addToTimeline(addDayId, {
      id: `tl-${Date.now()}`,
      name: addModalPlace.title || 'Saved place',
      startHour: start,
      endHour: endHour,
      duration: endHour - start,
      notes: addModalPlace.extraNote || '',
    });
    setAddModalOpen(false);
    setAddModalPlace(null);
  };

  return (
    <div className="page saved-places-page">
      <header className="page-header">
        <h1>{t('saved.title')}</h1>
      </header>

      <PlaceLinkInput />

      <h2 className="saved-places-list-title">{t('saved.listTitle')}</h2>
      {savedPlaces.length === 0 ? (
        <div className="empty-state">
          <p>{t('saved.empty')}</p>
        </div>
      ) : (
        <div className="saved-places-grid">
          {savedPlaces.map((place) => (
            <div key={place.id} className="saved-place-card animate-in">
              <PlaceCard place={place} onAddToDay={() => handleOpenAddModal(place)} />
              <SavedPlaceEdit place={place} onUpdate={updateSavedPlace} />
              <div className="saved-place-footer">
                <VotingUI
                  itemId={place.id}
                  votes={place.votes ?? 0}
                  isMostVoted={(place.votes || 0) === maxVotes && maxVotes > 0}
                  onVote={(id, count) => setVotes(id, count)}
                />
                <button type="button" onClick={() => removeSavedPlace(place.id)}>
                  {t('saved.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addModalOpen && addModalPlace && (
        <div className="place-modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="place-modal" onClick={(e) => e.stopPropagation()}>
            <div className="place-modal-header">
              <h3>{t('saved.addToTimeline')}</h3>
              <button type="button" className="place-modal-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="place-modal-body">
              <label className="place-modal-field">
                <span>{t('saved.day')}</span>
                <select value={addDayId} onChange={(e) => setAddDayId(e.target.value)}>
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
                      <option key={h} value={h}>{h === 12 ? '12:00' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                  <span className="place-modal-time-hint">→ 1 hour slot (e.g. 9:00–10:00)</span>
                </label>
              ) : (
                <div className="place-modal-range">
                  <label className="place-modal-field">
                    <span>{t('saved.start')}</span>
                    <select value={addStartHour} onChange={(e) => { const v = Number(e.target.value); setAddStartHour(v); if (addEndHour <= v) setAddEndHour(v + 1); }}>
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h === 12 ? '12:00' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="place-modal-field">
                    <span>{t('saved.end')}</span>
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
              <button type="button" onClick={() => setAddModalOpen(false)}>{t('saved.cancel')}</button>
              <button type="button" className="primary" onClick={handleConfirmAddToTimeline}>
                {t('saved.addToTimeline')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

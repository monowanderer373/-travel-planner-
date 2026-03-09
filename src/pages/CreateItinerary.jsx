import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { getTotalTravelDays } from '../utils/time';
import './CreateItinerary.css';

export default function CreateItinerary() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { trip, updateTrip, addLocation, removeLocation, setTripCreator } = useItinerary();
  const [newLocation, setNewLocation] = useState('');

  const handleAddLocation = (e) => {
    e.preventDefault();
    if (newLocation.trim()) {
      addLocation(newLocation.trim());
      setNewLocation('');
    }
  };

  const handleStartPlanning = () => {
    if (user) setTripCreator({ name: user.name, id: user.id });
    navigate('/', { replace: true });
  };

  const canStart = trip.destination?.trim() && trip.startDate && trip.endDate;

  const dayCount = trip.startDate && trip.endDate ? getTotalTravelDays(trip.startDate, trip.endDate) : 0;
  return (
    <div className="page create-itinerary-page">
      <header className="page-header">
        <h1>{t('create.title')}</h1>
      </header>
      <p className="page-intro create-intro">
        {t('create.intro')}
      </p>

      <section className="section general-inputs">
        <h2 className="section-title">{t('create.tripDetails')}</h2>
        <div className="inputs-grid">
          <label className="input-group input-destination">
            <span>{t('create.destination')}</span>
            <input
              type="text"
              placeholder={t('create.destinationPlaceholder')}
              value={trip.destination}
              onChange={(e) => updateTrip({ destination: e.target.value })}
            />
          </label>
          <label className="input-group">
            <span>{t('create.startDate')}</span>
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => updateTrip({ startDate: e.target.value })}
            />
          </label>
          <label className="input-group">
            <span>{t('create.endDate')}</span>
            <input
              type="date"
              value={trip.endDate}
              onChange={(e) => updateTrip({ endDate: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="section locations-section">
        <h2 className="section-title">{t('create.locationsTitle')}</h2>
        <p className="create-hint">{t('create.locationsHint')}</p>
        <form onSubmit={handleAddLocation} className="locations-form">
          <input
            type="text"
            placeholder={t('create.locationsPlaceholder')}
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            className="locations-input"
          />
          <button type="submit" className="primary" disabled={!newLocation.trim()}>
            {t('create.addLocation')}
          </button>
        </form>
        {trip.locations?.length > 0 && (
          <ul className="locations-list">
            {trip.locations.map((name) => (
              <li key={name} className="locations-list-item">
                <span>{name}</span>
                <button type="button" className="locations-remove" onClick={() => removeLocation(name)} aria-label={`Remove ${name}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section cities-section">
        <h2 className="section-title">{t('create.citiesTitle')}</h2>
        <p className="create-hint">{t('create.citiesHint')}</p>
        {(trip.cities || []).map((city, idx) => (
          <div key={idx} className="city-row">
            <input
              type="text"
              placeholder={t('create.cityNamePlaceholder')}
              value={city.name || ''}
              onChange={(e) => {
                const next = [...(trip.cities || [])];
                next[idx] = { ...next[idx], name: e.target.value };
                updateTrip({ cities: next });
              }}
              className="city-name-input"
            />
            <input
              type="date"
              value={city.startDate || ''}
              min={trip.startDate}
              max={trip.endDate}
              onChange={(e) => {
                const next = [...(trip.cities || [])];
                next[idx] = { ...next[idx], startDate: e.target.value };
                updateTrip({ cities: next });
              }}
            />
            <input
              type="date"
              value={city.endDate || ''}
              min={city.startDate || trip.startDate}
              max={trip.endDate}
              onChange={(e) => {
                const next = [...(trip.cities || [])];
                next[idx] = { ...next[idx], endDate: e.target.value };
                updateTrip({ cities: next });
              }}
            />
            <button
              type="button"
              className="locations-remove"
              onClick={() => updateTrip({ cities: (trip.cities || []).filter((_, i) => i !== idx) })}
              aria-label="Remove city"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="primary primary-outline"
          onClick={() => updateTrip({ cities: [...(trip.cities || []), { name: '', startDate: trip.startDate || '', endDate: trip.endDate || '' }] })}
          disabled={!trip.startDate || !trip.endDate}
        >
          {t('create.addCity')}
        </button>
      </section>

      <div className="create-actions">
        <button type="button" className="primary primary-large" onClick={handleStartPlanning} disabled={!canStart}>
          {t('create.startPlanning')}
        </button>
        <p className="create-dates-note">
          {trip.startDate && trip.endDate
            ? t('create.daysNote', { count: dayCount })
            : t('create.setDatesNote')}
        </p>
      </div>
    </div>
  );
}

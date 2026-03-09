import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import { getTotalTravelDays } from '../utils/time';
import './CreateItinerary.css';

export default function CreateItinerary() {
  const navigate = useNavigate();
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

  return (
    <div className="page create-itinerary-page">
      <header className="page-header">
        <h1>Create your itinerary</h1>
      </header>
      <p className="page-intro create-intro">
        Set your destination and dates. You can add multiple locations (e.g. Osaka, Kyoto) for a multi-city trip.
      </p>

      <section className="section general-inputs">
        <h2 className="section-title">Trip details</h2>
        <div className="inputs-grid">
          <label className="input-group input-destination">
            <span>Destination</span>
            <input
              type="text"
              placeholder="e.g. Japan"
              value={trip.destination}
              onChange={(e) => updateTrip({ destination: e.target.value })}
            />
          </label>
          <label className="input-group">
            <span>Start date</span>
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => updateTrip({ startDate: e.target.value })}
            />
          </label>
          <label className="input-group">
            <span>End date</span>
            <input
              type="date"
              value={trip.endDate}
              onChange={(e) => updateTrip({ endDate: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="section locations-section">
        <h2 className="section-title">Locations (optional)</h2>
        <p className="create-hint">Split your trip by city or region, e.g. Osaka, Kyoto.</p>
        <form onSubmit={handleAddLocation} className="locations-form">
          <input
            type="text"
            placeholder="e.g. Osaka"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            className="locations-input"
          />
          <button type="submit" className="primary" disabled={!newLocation.trim()}>
            Add location
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

      <div className="create-actions">
        <button type="button" className="primary primary-large" onClick={handleStartPlanning} disabled={!canStart}>
          Start planning
        </button>
        <p className="create-dates-note">
          {trip.startDate && trip.endDate
            ? `Your trip has ${getTotalTravelDays(trip.startDate, trip.endDate)} days. The itinerary page will show Day 1, Day 2, … with dates.`
            : 'Set start and end date to see total travel days.'}
        </p>
      </div>
    </div>
  );
}

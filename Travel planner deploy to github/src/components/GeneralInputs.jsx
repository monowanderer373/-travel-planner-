import { useItinerary } from '../context/ItineraryContext';
import './GeneralInputs.css';

export default function GeneralInputs() {
  const { trip, updateTrip } = useItinerary();

  return (
    <section className="section general-inputs">
      <h2 className="section-title">Trip details</h2>
      <div className="inputs-grid">
        <label className="input-group">
          <span>Destination</span>
          <input
            type="text"
            placeholder="e.g. Tokyo, Japan"
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
  );
}

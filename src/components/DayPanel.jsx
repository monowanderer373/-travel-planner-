import { useItinerary } from '../context/ItineraryContext';
import Timeline from './Timeline';
import './DayPanel.css';

export default function DayPanel() {
  const { days, addDay } = useItinerary();

  return (
    <section className="section day-panel">
      <div className="day-panel-header">
        <h2 className="section-title">Days</h2>
        <button type="button" className="primary" onClick={addDay}>
          + Add day
        </button>
      </div>
      <div className="days-list">
        {days.map((day) => (
          <div key={day.id} className="day-block animate-in">
            <h3 className="day-block-title">{day.label}</h3>
            <Timeline day={day} />
          </div>
        ))}
      </div>
    </section>
  );
}

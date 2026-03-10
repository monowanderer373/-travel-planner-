import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import Timeline from './Timeline';
import './DayPanel.css';

export default function DayPanel() {
  const { t } = useLanguage();
  const { days, addDay } = useItinerary();

  return (
    <section className="section day-panel">
      <div className="day-panel-header">
        <h2 className="section-title">{t('itinerary.days')}</h2>
        <button type="button" className="primary" onClick={addDay}>
          {t('itinerary.addDay')}
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

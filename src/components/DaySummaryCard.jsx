import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { formatHour } from '../utils/time';
import DashboardCard from './DashboardCard';
import './DaySummaryCard.css';

export default function DaySummaryCard({ selectedDay }) {
  const { t } = useLanguage();
  const { days } = useItinerary();
  const effectiveDay = selectedDay || days[0];
  const timeline = effectiveDay?.timeline || [];

  return (
    <DashboardCard title={effectiveDay?.label || t('itinerary.summary.title')}>
      {timeline.length === 0 ? (
        <p className="day-summary-empty">{t('itinerary.summary.empty')}</p>
      ) : (
        <ol className="day-summary-list">
          {timeline.map((item) => (
            <li key={item.id} className="day-summary-item">
              <span className="day-summary-time">
                {formatHour(item.startHour)} – {formatHour(item.endHour)}
              </span>
              <span className="day-summary-name">{item.name}</span>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}


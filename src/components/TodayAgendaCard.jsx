import { Link } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { formatHour } from '../utils/time';
import DashboardCard from './DashboardCard';
import './TodayAgendaCard.css';

const MAX_ITEMS = 3;

export default function TodayAgendaCard() {
  const { t } = useLanguage();
  const { days } = useItinerary();
  const firstDay = days[0];
  const timeline = firstDay?.timeline || [];
  const slice = timeline.slice(0, MAX_ITEMS);

  return (
    <DashboardCard titleKey="home.today.title" actionLabel="home.today.viewAll" actionTo="/itinerary">
      {slice.length === 0 ? (
        <p className="today-agenda-empty">{t('home.today.empty')}</p>
      ) : (
        <ol className="today-agenda-list">
          {slice.map((item) => (
            <li key={item.id} className={`today-agenda-item ${item.type === 'transport' ? 'today-agenda-transport' : ''}`}>
              <span className="today-agenda-time">
                {formatHour(item.startHour)} – {formatHour(item.endHour)}
              </span>
              <span className="today-agenda-name">
                {item.type === 'transport' ? `🚆 ${item.lineName || t('transport.title')}` : item.name}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}

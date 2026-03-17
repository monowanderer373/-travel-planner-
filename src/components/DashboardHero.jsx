import { Link } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { getTotalTravelDays } from '../utils/time';
import './DashboardHero.css';

export default function DashboardHero() {
  const { t } = useLanguage();
  const { trip, days } = useItinerary();
  const hasDetails = trip.destination?.trim() && trip.startDate && trip.endDate;
  const totalDays = hasDetails ? getTotalTravelDays(trip.startDate, trip.endDate) : days.length;
  const title = trip.destination?.trim() || t('home.hero.defaultTitle');
  const dates =
    trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : t('home.dash');

  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero-bg" aria-hidden="true" />
      <div className="dashboard-hero-content">
        <h1 className="dashboard-hero-title">{title}</h1>
        <p className="dashboard-hero-meta">
          {dates}
          {totalDays > 0 && (
            <span className="dashboard-hero-days">
              · {totalDays} {t('home.totalDays')}
            </span>
          )}
        </p>
        <Link to="/create" className="dashboard-hero-cta primary">
          {t('home.hero.continuePlanning')}
        </Link>
      </div>
    </header>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getTotalTravelDays } from '../utils/time';
import './DashboardHero.css';

export default function DashboardHero() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { themeId } = useTheme();
  const { trip, days } = useItinerary();
  const hasDetails = trip.destination?.trim() && trip.startDate && trip.endDate;
  const totalDays = hasDetails ? getTotalTravelDays(trip.startDate, trip.endDate) : days.length;
  const title = trip.destination?.trim() || t('home.hero.defaultTitle');
  const dates =
    trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : t('home.dash');
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';
  const [paste, setPaste] = useState('');

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
          {isVoyage && <span className="dashboard-hero-chip">Weather</span>}
        </p>
        <div className="dashboard-hero-actions">
          <Link to="/create" className="dashboard-hero-cta primary">
            {t('home.hero.continuePlanning')}
          </Link>
          {isVoyage && (
            <form
              className="dashboard-hero-paste"
              onSubmit={(e) => {
                e.preventDefault();
                const url = (paste || '').trim();
                if (!url) return;
                setPaste('');
                navigate('/saved', { state: { pasteUrl: url } });
              }}
            >
              <input
                className="dashboard-hero-paste-input"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={t('home.paste.placeholder')}
                type="url"
              />
            </form>
          )}
        </div>
      </div>
    </header>
  );
}

import { Link } from 'react-router-dom';
import { useState } from 'react';
import SummaryBlock from '../components/SummaryBlock';
import ShareModal from '../components/ShareModal';
import AddTripmateButton from '../components/AddTripmateButton';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { getTotalTravelDays } from '../utils/time';
import './Home.css';

export default function Home() {
  const { t } = useLanguage();
  const [shareOpen, setShareOpen] = useState(false);
  const { trip, days } = useItinerary();
  const hasTripDetails = trip.destination?.trim() && trip.startDate && trip.endDate;
  const totalDays = hasTripDetails ? getTotalTravelDays(trip.startDate, trip.endDate) : days.length;

  return (
    <div className="page home-page">
      <header className="page-header">
        <h1>{t('home.title')}</h1>
        <div className="page-header-actions">
          <AddTripmateButton />
          <button type="button" className="primary" onClick={() => setShareOpen(true)}>
            {t('home.shareItinerary')}
          </button>
        </div>
      </header>
      {!hasTripDetails && (
        <p className="home-validation-hint">
          {t('home.validationHint')}
        </p>
      )}
      <section className="section home-trip-summary">
        <div className="home-trip-summary-header">
          <h2 className="section-title">{t('home.tripDetails')}</h2>
          <Link to="/create" className="home-edit-trip">{t('home.editTrip')}</Link>
        </div>
        <div className="summary-overview home-trip-overview">
          <p><strong>{t('home.destination')}:</strong> {trip.destination || t('home.dash')}</p>
          <p><strong>{t('home.dates')}:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : t('home.dash')}</p>
          <p><strong>{t('home.totalDays')}:</strong> {totalDays}</p>
          {trip.locations?.length > 0 && (
            <p><strong>{t('home.locations')}:</strong> {trip.locations.join(', ')}</p>
          )}
        </div>
      </section>
      <SummaryBlock />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

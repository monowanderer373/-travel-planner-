import { Link } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardCard from './DashboardCard';
import './UnplannedSavesCard.css';

const MAX_ITEMS = 6;

export default function UnplannedSavesCard() {
  const { t } = useLanguage();
  const { savedPlaces } = useItinerary();
  const slice = (savedPlaces || []).slice(0, MAX_ITEMS);

  return (
    <DashboardCard titleKey="home.unplanned.title" actionLabel="home.unplanned.viewAll" actionTo="/saved">
      {slice.length === 0 ? (
        <p className="unplanned-empty">{t('home.unplanned.empty')}</p>
      ) : (
        <div className="unplanned-grid">
          {slice.map((place) => (
            <Link
              key={place.id}
              to="/saved"
              className="unplanned-item"
              title={place.title || place.name}
            >
              {place.photoUrl || place.embedUrl ? (
                <div
                  className="unplanned-thumb"
                  style={{
                    backgroundImage: place.photoUrl
                      ? `url(${place.photoUrl})`
                      : 'none',
                    backgroundColor: place.embedUrl ? 'var(--pastel-sky)' : 'var(--pastel-sand)',
                  }}
                />
              ) : (
                <div className="unplanned-thumb unplanned-thumb-placeholder">
                  {(place.title || place.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="unplanned-label">{place.title || place.name || t('saved.placeName')}</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

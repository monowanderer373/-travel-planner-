import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './SharedTripGuestBanner.css';

export default function SharedTripGuestBanner() {
  const { t } = useLanguage();
  return (
    <div className="shared-guest-banner" role="alert">
      <p>{t('sharedGuest.banner')}</p>
      <Link to="/welcome" className="shared-guest-banner-link">
        {t('sharedGuest.googleOnly')}
      </Link>
    </div>
  );
}

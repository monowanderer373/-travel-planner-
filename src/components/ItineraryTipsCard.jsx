import { useLanguage } from '../context/LanguageContext';
import DashboardCard from './DashboardCard';
import './ItineraryTipsCard.css';

export default function ItineraryTipsCard() {
  const { t } = useLanguage();

  return (
    <DashboardCard title={t('itinerary.tips.title')}>
      <p className="itinerary-tips-body">
        {t('itinerary.tips.body')}
      </p>
    </DashboardCard>
  );
}


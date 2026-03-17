import DayPanel from '../components/DayPanel';
import ShareModal from '../components/ShareModal';
import DaySummaryCard from '../components/DaySummaryCard';
import ItineraryTipsCard from '../components/ItineraryTipsCard';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Itinerary.css';

export default function Itinerary() {
  const { t } = useLanguage();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="page itinerary-page">
      <header className="page-header">
        <h1>{t('itinerary.title')}</h1>
        <button type="button" className="primary" onClick={() => setShareOpen(true)}>
          {t('itinerary.share')}
        </button>
      </header>
      <p className="page-intro">
        {t('itinerary.intro')}
      </p>
      <div className="itinerary-main">
        <DayPanel />
        <div className="itinerary-sidebar">
          <DaySummaryCard />
          <ItineraryTipsCard />
        </div>
      </div>
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

import { useState, useEffect } from 'react';
import DayPanel from '../components/DayPanel';
import ShareModal from '../components/ShareModal';
import DaySummaryCard from '../components/DaySummaryCard';
import ItineraryTipsCard from '../components/ItineraryTipsCard';
import { useLanguage } from '../context/LanguageContext';
import { useItinerary } from '../context/ItineraryContext';
import { useTheme } from '../context/ThemeContext';
import VoyagePlan from '../components/VoyagePlan';
import './Itinerary.css';

export default function Itinerary() {
  const { t } = useLanguage();
  const { days } = useItinerary();
  const { themeId } = useTheme();
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(() => (days[0]?.id ?? null));

  useEffect(() => {
    if (!days.length) return;
    if (!selectedDayId || !days.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];

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
      {isVoyage ? (
        <VoyagePlan days={days} />
      ) : (
        <div className="itinerary-main">
          <DayPanel selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} />
          <div className="itinerary-sidebar">
            <DaySummaryCard selectedDay={selectedDay} />
            <ItineraryTipsCard />
          </div>
        </div>
      )}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

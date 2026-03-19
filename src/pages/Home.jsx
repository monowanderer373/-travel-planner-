import { Link } from 'react-router-dom';
import { useState } from 'react';
import AddTripmateButton from '../components/AddTripmateButton';
import LeaveSharedTripButton from '../components/LeaveSharedTripButton';
import ActivityFeed from '../components/ActivityFeed';
import TripmatesBoard from '../components/TripmatesBoard';
import DashboardHero from '../components/DashboardHero';
import SmartPasteBar from '../components/SmartPasteBar';
import TodayAgendaCard from '../components/TodayAgendaCard';
import UnplannedSavesCard from '../components/UnplannedSavesCard';
import BudgetSnapshotCard from '../components/BudgetSnapshotCard';
import DashboardCard from '../components/DashboardCard';
import ShareModal from '../components/ShareModal';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Home.css';

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { themeId } = useTheme();
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';
  const [shareOpen, setShareOpen] = useState(false);
  const { trip } = useItinerary();

  const hasTripDetails = trip.destination?.trim() && trip.startDate && trip.endDate;

  return (
    <div className="page home-page">
      <header className="page-header home-dashboard-header">
        <h1>{t('home.title')}</h1>
        <div className="page-header-actions">
          <AddTripmateButton />
        </div>
      </header>
      {!hasTripDetails && (
        <p className="home-validation-hint">
          {t('home.validationHint')}
        </p>
      )}
      <DashboardHero />
      {!isVoyage && <SmartPasteBar />}
      <div className="home-dashboard">
        <TodayAgendaCard />
        <UnplannedSavesCard />
        <BudgetSnapshotCard />
        <DashboardCard titleKey="home.shareItinerary">
          <button
            type="button"
            className="primary"
            style={{ width: '100%' }}
            onClick={() => setShareOpen(true)}
          >
            {t('tripmate.generateLink')}
          </button>
        </DashboardCard>
        <DashboardCard titleKey="home.tripmates.title">
          <TripmatesBoard />
        </DashboardCard>
        <DashboardCard titleKey="home.activity.title" actionLabel="home.activity.viewAll" actionTo="/itinerary">
          <ActivityFeed limit={5} hideTitle />
        </DashboardCard>
      </div>
      <LeaveSharedTripButton variant="home" />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

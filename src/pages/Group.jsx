import AddTripmateButton from '../components/AddTripmateButton';
import TripmatesBoard from '../components/TripmatesBoard';
import ActivityFeed from '../components/ActivityFeed';
import DashboardCard from '../components/DashboardCard';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useItinerary } from '../context/ItineraryContext';
import { useAuth } from '../context/AuthContext';
import LeaveSharedTripButton from '../components/LeaveSharedTripButton';
import './Group.css';

export default function Group() {
  const { t } = useLanguage();
  const { themeId } = useTheme();
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';
  const { shareSettings, tripCreator } = useItinerary();
  const { user } = useAuth();

  const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
  const currentEmail = String(user?.email || '').trim().toLowerCase();
  const isCreator = !!creatorEmail && !!currentEmail && creatorEmail === currentEmail;
  const isShared = !!shareSettings?.tripId;
  const access = shareSettings?.linkAccess || 'invited';
  const perm = shareSettings?.linkPermission || 'edit';

  return (
    <div className="page group-page">
      <header className="page-header group-header">
        <h1>{t('home.tripmates.title')}</h1>
        <div className="page-header-actions">
          <AddTripmateButton />
        </div>
      </header>

      <div className="group-grid">
        {isVoyage && (
          <DashboardCard title="Collaboration">
            <div className="group-collab">
              <div className="group-collab-row">
                <span className="group-collab-label">Shared trip</span>
                <span className={`group-collab-pill ${isShared ? 'on' : ''}`}>{isShared ? 'On' : 'Off'}</span>
              </div>
              {isShared && (
                <>
                  <div className="group-collab-row">
                    <span className="group-collab-label">Access</span>
                    <span className="group-collab-value">{access === 'web' ? 'Anyone with link' : 'Invited only'}</span>
                  </div>
                  <div className="group-collab-row">
                    <span className="group-collab-label">Permission</span>
                    <span className="group-collab-value">{perm === 'edit' ? 'Can edit' : 'View only'}</span>
                  </div>
                </>
              )}
              <div className="group-collab-actions">
                <AddTripmateButton />
                {!isCreator && <LeaveSharedTripButton variant="settings" />}
              </div>
              <p className="group-collab-hint">
                Invite friends, control access, and see who changed what. Everything syncs in real time for shared trips.
              </p>
            </div>
          </DashboardCard>
        )}
        <DashboardCard titleKey="home.tripmates.title">
          <TripmatesBoard />
        </DashboardCard>
        <DashboardCard titleKey="home.activity.title">
          <ActivityFeed />
        </DashboardCard>
      </div>
    </div>
  );
}


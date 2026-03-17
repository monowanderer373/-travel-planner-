import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import './LeaveSharedTripButton.css';

export default function LeaveSharedTripButton({ variant = 'home' }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { shareSettings, tripCreator, tripmates, leaveSharedTrip } = useItinerary();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cr = (tripCreator?.email || '').trim().toLowerCase();
  const ue = (user?.email || '').trim().toLowerCase();
  const isCreatorByEmail = !!(cr && ue && cr === ue);
  const listedAsTripmate = tripmates.some((m) => m.userId && m.userId === user?.id);
  const isInvitee =
    !!shareSettings.tripId && !isCreatorByEmail && (listedAsTripmate || (cr && ue && cr !== ue));

  if (!isInvitee) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await leaveSharedTrip();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const dialog = open && (
    <div
      className="leave-shared-trip-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-shared-title"
      onClick={() => !busy && setOpen(false)}
    >
      <div className="leave-shared-trip-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 id="leave-shared-title">{t('tripmate.leaveSharedTitle')}</h3>
        <p className="leave-shared-trip-desc">{t('tripmate.leaveSharedDesc')}</p>
        <div className="leave-shared-trip-actions">
          <button type="button" className="leave-shared-trip-cancel" onClick={() => setOpen(false)} disabled={busy}>
            {t('settings.cancel')}
          </button>
          <button type="button" className="leave-shared-trip-confirm" onClick={handleConfirm} disabled={busy}>
            {busy ? t('profile.saving') : t('tripmate.leaveSharedConfirmBtn')}
          </button>
        </div>
      </div>
    </div>
  );

  if (variant === 'settings') {
    return (
      <section className="section leave-shared-trip-section">
        <h2 className="section-title">{t('tripmate.leaveSharedSection')}</h2>
        <p className="settings-hint">{t('tripmate.leaveSharedDesc')}</p>
        <button type="button" className="leave-shared-trip-btn leave-shared-trip-btn--settings" onClick={() => setOpen(true)}>
          {t('tripmate.leaveShared')}
        </button>
        {dialog}
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`leave-shared-trip-btn leave-shared-trip-btn--${variant}`}
        onClick={() => setOpen(true)}
      >
        {t('tripmate.leaveShared')}
      </button>
      {dialog}
    </>
  );
}

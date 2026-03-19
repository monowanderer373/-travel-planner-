import { useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useItinerary } from '../context/ItineraryContext';
import './ShareModal.css';

export default function ShareModal({ open, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    tripCreator,
    activePlanRecord,
    isActivePlanOwner,
    shareSettings,
    setShareSettings,
    generateTripmateLink,
    tripmateShareLink,
    stablePlanShareLink,
    ensureCurrentPlanShareLink,
    revokeCurrentPlanShareLink,
    syncCurrentPlanShareSettings,
  } = useItinerary();

  const ownerMatch = useMemo(() => {
    const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
    const currentEmail = String(user?.email || '').trim().toLowerCase();
    const creatorId = String(tripCreator?.id || tripCreator?.userId || '').trim();
    const currentId = String(user?.id || '').trim();
    return (!!creatorId && !!currentId && creatorId === currentId) || (!!creatorEmail && !!currentEmail && creatorEmail === currentEmail);
  }, [tripCreator?.email, tripCreator?.id, tripCreator?.userId, user?.email, user?.id]);

  const isCreator = isActivePlanOwner && ownerMatch;
  const link = stablePlanShareLink || tripmateShareLink || '';
  const hasStablePlanLink = !!stablePlanShareLink;
  const hasCorrectTripLink = link.includes('?trip=') || link.includes('trip=');

  const handleGenerate = async () => {
    if (hasStablePlanLink) return;
    const res = await ensureCurrentPlanShareLink();
    if (res?.ok) return;
    return generateTripmateLink();
  };
  const handleRevokeOldLinks = async () => {
    const ok = window.confirm(
      'Revoke old links and create a new one?\nPeople using previous links will stop syncing until they rejoin with the new link.'
    );
    if (!ok) return;
    if (hasStablePlanLink || activePlanRecord?.id) {
      await revokeCurrentPlanShareLink();
      await ensureCurrentPlanShareLink({ forceNew: true });
      return;
    }
    await generateTripmateLink({ forceNew: true, revokeOld: true });
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link);
  };

  // If creator has a cached link but it's not in the expected format,
  // regenerate so it contains the correct GitHub Pages base path.
  useEffect(() => {
    if (!open) return;
    if (!isCreator) return;
    if (!stablePlanShareLink && !tripmateShareLink) {
      void ensureCurrentPlanShareLink().then((res) => {
        if (!res?.ok) void generateTripmateLink();
      });
      return;
    }
    if (!stablePlanShareLink && tripmateShareLink && !hasCorrectTripLink) {
      void generateTripmateLink();
    }
  }, [open, isCreator, stablePlanShareLink, tripmateShareLink, hasCorrectTripLink, ensureCurrentPlanShareLink, generateTripmateLink]);

  if (!open) return null;

  if (!isCreator) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Share itinerary</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="modal-body">
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {t('share.creatorOnly')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share itinerary</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {!link || (!hasStablePlanLink && !hasCorrectTripLink) ? (
            <button type="button" className="primary" onClick={handleGenerate}>
              {t('share.createLink')}
            </button>
          ) : (
            <>
              <label className="share-field">
                <span>{t('tripmate.whoCanAccess')}</span>
                <select
                  value={shareSettings.linkAccess || 'invited'}
                  onChange={(e) => {
                    void syncCurrentPlanShareSettings({ linkAccess: e.target.value });
                  }}
                >
                  <option value="invited">{t('tripmate.onlyInvited')}</option>
                  <option value="web">{t('tripmate.anyoneWithLink')}</option>
                </select>
              </label>
              <label className="share-field">
                <span>{t('tripmate.permission')}</span>
                <select
                  value={shareSettings.linkPermission || 'edit'}
                  onChange={(e) => {
                    void syncCurrentPlanShareSettings({
                      linkPermission: e.target.value,
                      allowEdit: e.target.value === 'edit',
                    });
                  }}
                >
                  <option value="edit">{t('tripmate.canEdit')}</option>
                  <option value="view">{t('tripmate.canView')}</option>
                </select>
              </label>
              <label className="share-field">
                <span>Link</span>
                <div className="share-link-row">
                  <input type="text" readOnly value={link} />
                  <button type="button" onClick={handleCopy}>{t('share.copyLink')}</button>
                </div>
              </label>
              {hasStablePlanLink ? (
                <p style={{ marginTop: 0, marginBottom: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {t('share.stableHint')}
                </p>
              ) : null}
              {isCreator && (
                <button
                  type="button"
                  className="secondary"
                  style={{ marginBottom: '0.8rem' }}
                  onClick={handleRevokeOldLinks}
                >
                  {t('share.revokeCreate')}
                </button>
              )}
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={shareSettings.allowVote}
                  onChange={(e) => {
                    void syncCurrentPlanShareSettings({ allowVote: e.target.checked });
                  }}
                />
                <span>Others with this link can vote</span>
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={shareSettings.allowEdit}
                  onChange={(e) => {
                    void syncCurrentPlanShareSettings({
                      allowEdit: e.target.checked,
                      linkPermission: e.target.checked ? 'edit' : 'view',
                    });
                  }}
                />
                <span>Others with this link can edit</span>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './AddTripmateButton.css';

export default function AddTripmateButton() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    tripmates,
    addTripmate,
    updateTripmate,
    removeTripmate,
    shareSettings,
    setShareSettings,
    tripmateShareLink,
    generateTripmateLink,
    tripCreator,
    setTripCreator,
  } = useItinerary();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [creatorName, setCreatorName] = useState(tripCreator.name || '');
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [cloudMsg, setCloudMsg] = useState(null);

  const handleGenerateLink = async () => {
    setLinkGenerated(true);
    setCloudMsg(null);
    try {
      const res = await generateTripmateLink();
      if (res?.ok) setCloudMsg('ok');
      else if (res?.error === 'no_supabase') setCloudMsg('no_keys');
      else setCloudMsg('err');
    } catch {
      setCloudMsg('err');
    }
  };

  const handleAddLocal = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    addTripmate({ name, email: '' });
    setNewName('');
  };

  const handleAddInvites = (e) => {
    e.preventDefault();
    const emails = inviteEmails
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v && v.includes('@'));
    if (emails.length === 0) return;
    setShareSettings((prev) => ({
      ...prev,
      invitedEmails: [...new Set([...(prev.invitedEmails || []), ...emails])],
    }));
    setInviteEmails('');
  };

  const copyLinkWithSource = () => {
    if (!tripmateShareLink) return;
    const sep = tripmateShareLink.includes('?') ? '&' : '?';
    const withSource = `${tripmateShareLink}${sep}source=copy_link`;
    navigator.clipboard?.writeText(withSource);
  };

  return (
    <>
      <button type="button" className="add-tripmate-btn" onClick={() => setModalOpen(true)}>
        {t('tripmate.addBtn')}
      </button>
      {modalOpen && (
        <div className="tripmate-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="tripmate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tripmate-modal-header">
              <h2>{t('tripmate.title')}</h2>
              <button type="button" className="tripmate-modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="tripmate-modal-body">
              <p className="tripmate-hint">{t('tripmate.hint')}</p>
              {!linkGenerated ? (
                <button type="button" className="primary" onClick={handleGenerateLink}>
                  {t('tripmate.generateLink')}
                </button>
              ) : (
                <div className="tripmate-link-box">
                  {cloudMsg === 'ok' && (
                    <p className="tripmate-cloud-ok" role="status">{t('tripmate.cloudSaved')}</p>
                  )}
                  {cloudMsg === 'no_keys' && (
                    <p className="tripmate-cloud-warn" role="alert">{t('tripmate.cloudNoKeys')}</p>
                  )}
                  {cloudMsg === 'err' && (
                    <p className="tripmate-cloud-err" role="alert">{t('tripmate.cloudFailed')}</p>
                  )}
                  <div className="tripmate-access-block">
                    <h3 className="tripmate-list-title">{t('tripmate.generalAccess')}</h3>
                    <div className="tripmate-access-row">
                      <label className="tripmate-link-label">{t('tripmate.whoCanAccess')}</label>
                      <select
                        className="tripmate-access-select"
                        value={shareSettings.linkAccess || 'invited'}
                        onChange={(e) => setShareSettings((s) => ({ ...s, linkAccess: e.target.value }))}
                      >
                        <option value="invited">{t('tripmate.onlyInvited')}</option>
                        <option value="web">{t('tripmate.anyoneWithLink')}</option>
                      </select>
                    </div>
                    <div className="tripmate-access-row">
                      <label className="tripmate-link-label">{t('tripmate.permission')}</label>
                      <select
                        className="tripmate-access-select"
                        value={shareSettings.linkPermission || 'edit'}
                        onChange={(e) => setShareSettings((s) => ({
                          ...s,
                          linkPermission: e.target.value,
                          allowEdit: e.target.value === 'edit',
                        }))}
                      >
                        <option value="edit">{t('tripmate.canEdit')}</option>
                        <option value="view">{t('tripmate.canView')}</option>
                      </select>
                    </div>
                  </div>
                  <label className="tripmate-link-label">{t('tripmate.shareLinkLabel')}</label>
                  <div className="tripmate-link-row">
                    <input type="text" readOnly value={tripmateShareLink} className="tripmate-link-input" />
                    <button type="button" onClick={copyLinkWithSource}>{t('tripmate.copy')}</button>
                  </div>
                  {(shareSettings.linkAccess || 'invited') === 'invited' && (
                    <>
                      <label className="tripmate-link-label">{t('tripmate.inviteByEmail')}</label>
                      <form onSubmit={handleAddInvites} className="tripmate-add-form">
                        <input
                          type="text"
                          value={inviteEmails}
                          onChange={(e) => setInviteEmails(e.target.value)}
                          placeholder={t('tripmate.emailPlaceholder')}
                          className="tripmate-name-input"
                        />
                        <button type="submit" className="primary">{t('tripmate.addInvite')}</button>
                      </form>
                    </>
                  )}
                </div>
              )}

              <h3 className="tripmate-list-title">{t('tripmate.youCreator')}</h3>
              <p className="tripmate-hint">{t('tripmate.setProfile')}</p>
              {tripCreator.name ? (
                <div className="tripmate-creator-row">
                  <span className="tripmate-avatar">{tripCreator.name.charAt(0).toUpperCase()}</span>
                  <span className="tripmate-creator-name">{tripCreator.name}</span>
                  <button type="button" onClick={() => { setTripCreator({ name: '', email: '' }); setCreatorName(''); }}>{t('tripmate.change')}</button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = creatorName.trim();
                    if (name) {
                      setTripCreator({ name, email: user?.email || '' });
                      setCreatorName('');
                    }
                  }}
                  className="tripmate-add-form"
                >
                  <input
                    type="text"
                    placeholder={t('tripmate.yourName')}
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="tripmate-name-input"
                  />
                  <button type="submit" className="primary">{t('tripmate.setProfileBtn')}</button>
                </form>
              )}

              <h3 className="tripmate-list-title">{t('tripmate.membersTitle')}</h3>
              <form onSubmit={handleAddLocal} className="tripmate-add-form">
                <input
                  type="text"
                  placeholder={t('tripmate.namePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="tripmate-name-input"
                />
                <button type="submit" className="primary">{t('tripmate.addProfile')}</button>
              </form>
              <ul className="tripmate-list">
                {tripmates.map((t) => (
                  <li key={t.id} className="tripmate-item">
                    <span className="tripmate-avatar">{t.name.charAt(0).toUpperCase()}</span>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => updateTripmate(t.id, { name: e.target.value })}
                      className="tripmate-item-name"
                    />
                    <button type="button" className="tripmate-remove" onClick={() => removeTripmate(t.id)}>{t('tripmate.remove')}</button>
                  </li>
                ))}
              </ul>
              {tripmates.length === 0 && (
                <p className="tripmate-empty">{t('tripmate.empty')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

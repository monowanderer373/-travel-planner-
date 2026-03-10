import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import './AddTripmateButton.css';

export default function AddTripmateButton() {
  const { t } = useLanguage();
  const {
    tripmates,
    addTripmate,
    updateTripmate,
    removeTripmate,
    tripmateShareLink,
    generateTripmateLink,
    tripCreator,
    setTripCreator,
  } = useItinerary();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatorName, setCreatorName] = useState(tripCreator.name || '');
  const [linkGenerated, setLinkGenerated] = useState(false);

  const handleGenerateLink = () => {
    setLinkGenerated(true);
    try {
      generateTripmateLink();
    } catch (_) {
      // Link box already shown; context may have set a fallback
    }
  };

  const handleAddLocal = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    addTripmate({ name, email: '' });
    setNewName('');
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
                  <label className="tripmate-link-label">{t('tripmate.shareLinkLabel')}</label>
                  <div className="tripmate-link-row">
                    <input type="text" readOnly value={tripmateShareLink} className="tripmate-link-input" />
                    <button type="button" onClick={() => navigator.clipboard?.writeText(tripmateShareLink)}>{t('tripmate.copy')}</button>
                  </div>
                </div>
              )}

              <h3 className="tripmate-list-title">{t('tripmate.youCreator')}</h3>
              <p className="tripmate-hint">{t('tripmate.setProfile')}</p>
              {tripCreator.name ? (
                <div className="tripmate-creator-row">
                  <span className="tripmate-avatar">{tripCreator.name.charAt(0).toUpperCase()}</span>
                  <span className="tripmate-creator-name">{tripCreator.name}</span>
                  <button type="button" onClick={() => { setTripCreator({ name: '' }); setCreatorName(''); }}>{t('tripmate.change')}</button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = creatorName.trim();
                    if (name) {
                      setTripCreator({ name });
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

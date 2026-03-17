import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import './JoinSharedTripModal.css';

export default function JoinSharedTripModal({ onDone }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addTripmate } = useItinerary();
  const [name, setName] = useState((user?.name || '').trim() || '');
  const [bio, setBio] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    addTripmate({
      name: n,
      email: user?.email || '',
      userId: user?.id || '',
      bio: bio.trim(),
      avatarUrl: user?.photoURL || '',
    });
    try {
      sessionStorage.removeItem('share_join_flow');
    } catch {}
    onDone?.();
  };

  return (
    <div className="join-shared-backdrop" role="dialog" aria-modal="true" aria-labelledby="join-shared-title">
      <div className="join-shared-modal">
        <h2 id="join-shared-title">{t('joinShared.title')}</h2>
        <p className="join-shared-desc">{t('joinShared.desc')}</p>
        <form onSubmit={handleSubmit}>
          <label className="join-shared-label">
            {t('joinShared.displayName')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('joinShared.namePh')}
              required
              autoFocus
            />
          </label>
          <label className="join-shared-label">
            {t('joinShared.bioOptional')}
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder={t('joinShared.bioPh')} />
          </label>
          <button type="submit" className="primary join-shared-submit">
            {t('joinShared.join')}
          </button>
        </form>
      </div>
    </div>
  );
}

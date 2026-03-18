import { useLanguage } from '../context/LanguageContext';
import { useItinerary } from '../context/ItineraryContext';
import './ShareItineraryCard.css';

export default function ShareItineraryCard() {
  const { t } = useLanguage();
  const { shareSettings, setShareSettings, generateShareLink } = useItinerary();

  const hasLink = !!shareSettings?.shareLink;

  const handleGenerate = () => {
    generateShareLink();
  };

  const handleCopy = () => {
    if (!shareSettings?.shareLink) return;
    navigator.clipboard?.writeText(shareSettings.shareLink);
  };

  return (
    <div className="shareit-card">
      <p className="shareit-hint">{t('tripmate.hint')}</p>

      {!hasLink ? (
        <button type="button" className="primary shareit-generate" onClick={handleGenerate}>
          {t('tripmate.generateLink')}
        </button>
      ) : (
        <>
          <label className="shareit-field">
            <span>Link</span>
            <div className="shareit-link-row">
              <input type="text" readOnly value={shareSettings.shareLink || ''} />
              <button type="button" className="shareit-copy" onClick={handleCopy}>
                {t('tripmate.copy')}
              </button>
            </div>
          </label>

          <label className="shareit-toggle">
            <input
              type="checkbox"
              checked={!!shareSettings.allowVote}
              onChange={(e) => setShareSettings((s) => ({ ...s, allowVote: e.target.checked }))}
            />
            <span>Others with this link can vote</span>
          </label>

          <label className="shareit-toggle">
            <input
              type="checkbox"
              checked={shareSettings.allowEdit !== false}
              onChange={(e) => setShareSettings((s) => ({ ...s, allowEdit: e.target.checked }))}
            />
            <span>{t('tripmate.canEdit') ? `${t('tripmate.canEdit')}` : 'Others with this link can edit'}</span>
          </label>
        </>
      )}
    </div>
  );
}


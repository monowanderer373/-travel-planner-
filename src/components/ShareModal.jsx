import { useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import './ShareModal.css';

export default function ShareModal({ open, onClose }) {
  const { user } = useAuth();
  const { tripCreator, shareSettings, setShareSettings, generateShareLink } = useItinerary();

  const isCreator = useMemo(() => {
    const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
    const currentEmail = String(user?.email || '').trim().toLowerCase();
    const creatorId = String(tripCreator?.id || tripCreator?.userId || '').trim();
    const currentId = String(user?.id || '').trim();
    return (!!creatorId && !!currentId && creatorId === currentId) || (!!creatorEmail && !!currentEmail && creatorEmail === currentEmail);
  }, [tripCreator?.email, tripCreator?.id, tripCreator?.userId, user?.email, user?.id]);

  const shareLink = shareSettings?.shareLink || '';
  const hasCorrectShareLink = shareLink.includes('?share=') || shareLink.includes('share=');

  const handleGenerate = () => generateShareLink();

  const handleCopy = () => {
    if (!shareSettings?.shareLink) return;
    navigator.clipboard?.writeText(shareSettings.shareLink);
  };

  // If creator has a cached link but it's not in the expected format,
  // regenerate so it contains the correct GitHub Pages base path.
  useEffect(() => {
    if (!open) return;
    if (!isCreator) return;
    if (!shareSettings?.shareLink || !hasCorrectShareLink) {
      generateShareLink();
    }
  }, [open, isCreator, hasCorrectShareLink, shareSettings?.shareLink, generateShareLink]);

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
              Only the trip creator can generate the share link.
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
          {!shareSettings?.shareLink || !hasCorrectShareLink ? (
            <button type="button" className="primary" onClick={handleGenerate}>
              Generate share link
            </button>
          ) : (
            <>
              <label className="share-field">
                <span>Link</span>
                <div className="share-link-row">
                  <input type="text" readOnly value={shareSettings.shareLink} />
                  <button type="button" onClick={handleCopy}>Copy</button>
                </div>
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={shareSettings.allowVote}
                  onChange={(e) => setShareSettings((s) => ({ ...s, allowVote: e.target.checked }))}
                />
                <span>Others with this link can vote</span>
              </label>
              <label className="share-toggle">
                <input
                  type="checkbox"
                  checked={shareSettings.allowEdit}
                  onChange={(e) => setShareSettings((s) => ({ ...s, allowEdit: e.target.checked }))}
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

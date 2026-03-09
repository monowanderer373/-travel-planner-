import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import './ShareModal.css';

export default function ShareModal({ open, onClose }) {
  const { shareSettings, setShareSettings, generateShareLink } = useItinerary();
  const [linkGenerated, setLinkGenerated] = useState(!!shareSettings.shareLink);

  const handleGenerate = () => {
    generateShareLink();
    setLinkGenerated(true);
  };

  const handleCopy = () => {
    if (shareSettings.shareLink) {
      navigator.clipboard?.writeText(shareSettings.shareLink);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share itinerary</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {!linkGenerated ? (
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

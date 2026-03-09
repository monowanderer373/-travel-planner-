import { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import './AddTripmateButton.css';

export default function AddTripmateButton() {
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
    generateTripmateLink();
    setLinkGenerated(true);
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
        Add Tripmate
      </button>
      {modalOpen && (
        <div className="tripmate-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="tripmate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tripmate-modal-header">
              <h2>Trip mates</h2>
              <button type="button" className="tripmate-modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="tripmate-modal-body">
              <p className="tripmate-hint">Share a link for others to join this trip (they can sign in with Google and add their name).</p>
              {!linkGenerated ? (
                <button type="button" className="primary" onClick={handleGenerateLink}>
                  Generate share link
                </button>
              ) : (
                <div className="tripmate-link-box">
                  <label className="tripmate-link-label">Share this link (sign in with Google on your app):</label>
                  <div className="tripmate-link-row">
                    <input type="text" readOnly value={tripmateShareLink} className="tripmate-link-input" />
                    <button type="button" onClick={() => navigator.clipboard?.writeText(tripmateShareLink)}>Copy</button>
                  </div>
                  <p className="tripmate-oauth-note">Joining with Google will be enabled when you connect a backend. For now, add trip mates below.</p>
                </div>
              )}

              <h3 className="tripmate-list-title">You (trip creator)</h3>
              <p className="tripmate-hint">Set your profile so others see who created this trip. Sign in with Google can be enabled later.</p>
              {tripCreator.name ? (
                <div className="tripmate-creator-row">
                  <span className="tripmate-avatar">{tripCreator.name.charAt(0).toUpperCase()}</span>
                  <span className="tripmate-creator-name">{tripCreator.name}</span>
                  <button type="button" onClick={() => { setTripCreator({ name: '' }); setCreatorName(''); }}>Change</button>
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
                    placeholder="Your name"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="tripmate-name-input"
                  />
                  <button type="submit" className="primary">Set my profile</button>
                </form>
              )}

              <h3 className="tripmate-list-title">Trip mates on this trip</h3>
              <form onSubmit={handleAddLocal} className="tripmate-add-form">
                <input
                  type="text"
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="tripmate-name-input"
                />
                <button type="submit" className="primary">Add profile</button>
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
                    <button type="button" className="tripmate-remove" onClick={() => removeTripmate(t.id)}>Remove</button>
                  </li>
                ))}
              </ul>
              {tripmates.length === 0 && (
                <p className="tripmate-empty">No trip mates yet. Add a name above or share the link.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

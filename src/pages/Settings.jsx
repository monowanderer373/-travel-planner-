import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import { useCost } from '../context/CostContext';
import { getAllTripData, clearAllTripData } from '../utils/storage';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { themeId, setThemeId, themes } = useTheme();
  const { user, signOut } = useAuth();
  const { replaceItineraryState, tripCreator } = useItinerary();
  const isCreator = !!(user && tripCreator?.name && user.name === tripCreator.name);
  const { replaceCostState } = useCost();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [importError, setImportError] = useState('');
  const importInputRef = useRef(null);

  const handleSignOut = () => {
    signOut();
    navigate('/welcome', { replace: true });
  };

  const handleExport = () => {
    const data = getAllTripData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-planner-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (data.itinerary) replaceItineraryState(data.itinerary);
        if (data.cost) replaceCostState(data.cost);
        if (importInputRef.current) importInputRef.current.value = '';
      } catch (err) {
        setImportError('Invalid file. Use an exported trip JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    clearAllTripData();
    setClearConfirm(false);
    window.location.reload();
  };

  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1>Settings</h1>
      </header>
      <section className="section">
        <h2 className="section-title">Account</h2>
        <p className="settings-hint">Signed in as <strong>{user?.name || 'Guest'}</strong>. Data is stored only in this browser.</p>
        <button type="button" className="settings-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </section>
      <section className="section">
        <h2 className="section-title">Theme</h2>
        <p className="settings-hint">Choose a visual theme. Google Doodle is a dark theme with pink, purple and blue accents.</p>
        <div className="theme-selection">
          {themes.map((t) => (
            <label key={t.id} className={`theme-option ${themeId === t.id ? 'theme-option-active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={t.id}
                checked={themeId === t.id}
                onChange={() => setThemeId(t.id)}
              />
              <span className="theme-option-label">{t.label}</span>
            </label>
          ))}
        </div>
      </section>

      {isCreator ? (
        <>
          <section className="section">
            <h2 className="section-title">Trip data</h2>
            <p className="settings-hint">Export to share with friends or backup. Import to load a shared trip file. Only the itinerary creator can use this.</p>
            <div className="settings-data-actions">
              <button type="button" className="primary" onClick={handleExport}>
                Export trip data (JSON)
              </button>
              <label className="settings-import-btn">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
                Import trip data
              </label>
            </div>
            {importError && <p className="settings-error">{importError}</p>}
          </section>

          <section className="section">
            <h2 className="section-title">Clear data</h2>
            <p className="settings-hint">Remove all trip and cost data from this device. This cannot be undone.</p>
            <div className="settings-clear-actions">
              {!clearConfirm ? (
                <button type="button" className="settings-clear-btn" onClick={() => setClearConfirm(true)}>
                  Clear all trip data
                </button>
              ) : (
                <>
                  <span className="settings-clear-warn">Are you sure? Page will reload.</span>
                  <button type="button" className="primary" onClick={handleClearAll}>
                    Yes, clear everything
                  </button>
                  <button type="button" onClick={() => setClearConfirm(false)}>Cancel</button>
                </>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <h2 className="section-title">Trip data &amp; Clear data</h2>
          <p className="settings-hint">Only the person who created this itinerary can export, import, or clear trip data. Sign out and create your own trip from the welcome page to become the creator.</p>
        </section>
      )}
    </div>
  );
}

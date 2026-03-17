import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useItinerary } from '../context/ItineraryContext';
import { useCost } from '../context/CostContext';
import { getAllTripData, clearAllTripData } from '../utils/storage';
import { languageOptions } from '../i18n/translations';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { t, lang, setLanguage } = useLanguage();
  const { themeId, setThemeId, themes } = useTheme();
  const { user, signOut, hasSupabase } = useAuth();
  const isCloudUser = user?.id && !String(user.id).startsWith('user-');
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
        setImportError(t('settings.importError'));
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
        <h1>{t('settings.title')}</h1>
      </header>
      <section className="section">
        <h2 className="section-title">{t('settings.language')}</h2>
        <p className="settings-hint">{t('settings.languageHint')}</p>
        <div className="settings-language-switch">
          <select
            value={lang}
            onChange={(e) => setLanguage(e.target.value)}
            className="settings-language-select"
            aria-label={t('settings.language')}
          >
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </section>
      <section className="section">
        <h2 className="section-title">{t('settings.account')}</h2>
        <p className="settings-hint">
          {t('settings.signedInAs')} <strong>{user?.name || t('settings.guest')}</strong>.
          {hasSupabase() && isCloudUser && (
            <> {t('settings.dataHintCloud')}</>
          )}
          {hasSupabase() && !isCloudUser && (
            <> {t('settings.dataHintGuest')}</>
          )}
          {!hasSupabase() && <> {t('settings.dataHint')}</>}
        </p>
        {hasSupabase() && (
          <div className="settings-sync-box">
            <h3 className="settings-sync-title">{t('settings.cloudSyncTitle')}</h3>
            <p className="settings-hint">{t('settings.cloudSyncUrl')}</p>
            <p className="settings-hint">{t('settings.cloudSyncShared')}</p>
            <p className="settings-hint">{t('settings.mapsEmbedHint')}</p>
          </div>
        )}
        <button type="button" className="settings-signout" onClick={handleSignOut}>
          {t('settings.signOut')}
        </button>
      </section>
      <section className="section">
        <h2 className="section-title">{t('settings.theme')}</h2>
        <p className="settings-hint">{t('settings.themeHint')}</p>
        <div className="theme-selection">
          {themes.map((theme) => (
            <label key={theme.id} className={`theme-option ${themeId === theme.id ? 'theme-option-active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={theme.id}
                checked={themeId === theme.id}
                onChange={() => setThemeId(theme.id)}
              />
              <span className="theme-option-label">{theme.label}</span>
            </label>
          ))}
        </div>
      </section>

      {isCreator ? (
        <>
          <section className="section">
            <h2 className="section-title">{t('settings.tripData')}</h2>
            <p className="settings-hint">{t('settings.tripDataHint')}</p>
            <div className="settings-data-actions">
              <button type="button" className="primary" onClick={handleExport}>
                {t('settings.exportTrip')}
              </button>
              <label className="settings-import-btn">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
                {t('settings.importTrip')}
              </label>
            </div>
            {importError && <p className="settings-error">{importError}</p>}
          </section>

          <section className="section">
            <h2 className="section-title">{t('settings.clearData')}</h2>
            <p className="settings-hint">{t('settings.clearDataHint')}</p>
            <div className="settings-clear-actions">
              {!clearConfirm ? (
                <button type="button" className="settings-clear-btn" onClick={() => setClearConfirm(true)}>
                  {t('settings.clearAll')}
                </button>
              ) : (
                <>
                  <span className="settings-clear-warn">{t('settings.clearConfirm')}</span>
                  <button type="button" className="primary" onClick={handleClearAll}>
                    {t('settings.clearYes')}
                  </button>
                  <button type="button" onClick={() => setClearConfirm(false)}>{t('settings.cancel')}</button>
                </>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="section">
          <h2 className="section-title">{t('settings.tripDataCreatorOnly')}</h2>
          <p className="settings-hint">{t('settings.creatorOnlyHint')}</p>
        </section>
      )}
    </div>
  );
}

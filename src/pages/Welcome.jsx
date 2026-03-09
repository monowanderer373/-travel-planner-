import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, setUser, signInWithGoogle, hasSupabase } = useAuth();
  const [mode, setMode] = useState('welcome'); // 'welcome' | 'signup' | 'signin'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSignUp = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setUser({ name: name.trim(), email: email.trim() || undefined });
    navigate('/create', { replace: true });
  };

  const handleSignInWithGoogle = async () => {
    if (hasSupabase()) {
      setGoogleLoading(true);
      try {
        await signInWithGoogle();
      } finally {
        setGoogleLoading(false);
      }
    } else {
      if (name.trim()) {
        setUser({ name: name.trim(), email: email.trim() || undefined });
        navigate('/create', { replace: true });
      } else {
        setMode('signup');
      }
    }
  };

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        {mode === 'welcome' && (
          <>
            <h1 className="welcome-title">{t('welcome.title')}</h1>
            <p className="welcome-tagline">{t('welcome.tagline')}</p>
            <div className="welcome-how">
              <h2>{t('welcome.howTitle')}</h2>
              <ul>
                <li>{t('welcome.how1')}</li>
                <li>{t('welcome.how2')}</li>
                <li>{t('welcome.how3')}</li>
                <li>{t('welcome.how4')}</li>
              </ul>
            </div>
            <p className="welcome-cta">{t('welcome.cta')}</p>
            <div className="welcome-actions">
              <button type="button" className="primary" onClick={() => setMode('signup')}>
                {t('welcome.signUp')}
              </button>
              <button type="button" onClick={() => setMode('signin')}>
                {t('welcome.signIn')}
              </button>
            </div>
          </>
        )}

        {(mode === 'signup' || mode === 'signin') && (
          <>
            <h1 className="welcome-title">{mode === 'signup' ? t('welcome.signUp') : t('welcome.signIn')}</h1>
            <form onSubmit={handleSignUp} className="welcome-form">
              <label className="input-group">
                <span>{t('welcome.displayName')}</span>
                <input
                  type="text"
                  placeholder={t('welcome.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="input-group">
                <span>{t('welcome.emailOptional')}</span>
                <input
                  type="email"
                  placeholder={t('welcome.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {mode === 'signup' && (
                <button type="submit" className="primary" disabled={!name.trim()}>
                  {t('welcome.createProfile')}
                </button>
              )}
              {mode === 'signin' && (
                <button type="submit" className="primary" disabled={!name.trim()}>
                  {t('welcome.continue')}
                </button>
              )}
            </form>
            <div className="welcome-google">
              <span className="welcome-google-label">{t('welcome.or')}</span>
              {hasSupabase() ? (
                <>
                  <button type="button" className="welcome-google-btn" onClick={handleSignInWithGoogle} disabled={googleLoading}>
                    {googleLoading ? t('welcome.googleRedirecting') : t('welcome.googleSignIn')}
                  </button>
                  <p className="welcome-google-note">{t('welcome.googleNote')}</p>
                </>
              ) : (
                <>
                  <button type="button" className="welcome-google-btn" onClick={handleSignInWithGoogle}>
                    {t('welcome.googleUseName')}
                  </button>
                  <p className="welcome-google-note">{t('welcome.googleNoteNoConfig')}</p>
                </>
              )}
            </div>
            <button type="button" className="welcome-back" onClick={() => { setMode('welcome'); setName(''); setEmail(''); }}>
              {t('welcome.back')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

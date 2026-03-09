import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [mode, setMode] = useState('welcome'); // 'welcome' | 'signup' | 'signin'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSignUp = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setUser({ name: name.trim(), email: email.trim() || undefined });
    navigate('/create', { replace: true });
  };

  const handleSignInWithGoogle = () => {
    if (name.trim()) {
      setUser({ name: name.trim(), email: email.trim() || undefined });
      navigate('/create', { replace: true });
    } else {
      setMode('signup');
    }
  };

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        {mode === 'welcome' && (
          <>
            <h1 className="welcome-title">Welcome to Wander</h1>
            <p className="welcome-tagline">Your travel itinerary planner</p>
            <div className="welcome-how">
              <h2>How it works</h2>
              <ul>
                <li>Set your <strong>destination</strong>, <strong>dates</strong>, and optional locations (e.g. Osaka, Kyoto) for multi-city trips.</li>
                <li>Build a <strong>day-by-day timeline</strong> from 8 AM to 11 PM — add activities and transport.</li>
                <li><strong>Save places</strong> from Google Maps links and vote with tripmates.</li>
                <li><strong>Share</strong> your itinerary or export it as JSON.</li>
              </ul>
            </div>
            <p className="welcome-cta">Create a profile to start planning your trip.</p>
            <div className="welcome-actions">
              <button type="button" className="primary" onClick={() => setMode('signup')}>
                Sign up
              </button>
              <button type="button" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </div>
          </>
        )}

        {(mode === 'signup' || mode === 'signin') && (
          <>
            <h1 className="welcome-title">{mode === 'signup' ? 'Sign up' : 'Sign in'}</h1>
            <form onSubmit={handleSignUp} className="welcome-form">
              <label className="input-group">
                <span>Display name</span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="input-group">
                <span>Email (optional)</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {mode === 'signup' && (
                <button type="submit" className="primary" disabled={!name.trim()}>
                  Create profile & continue
                </button>
              )}
              {mode === 'signin' && (
                <button type="submit" className="primary" disabled={!name.trim()}>
                  Continue
                </button>
              )}
            </form>
            <div className="welcome-google">
              <span className="welcome-google-label">Or</span>
              <button type="button" className="welcome-google-btn" onClick={handleSignInWithGoogle}>
                Sign in with Google (coming soon)
              </button>
              <p className="welcome-google-note">Google sign-in is a placeholder. For now use your name above. Data is stored only in your browser.</p>
            </div>
            <button type="button" className="welcome-back" onClick={() => { setMode('welcome'); setName(''); setEmail(''); }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

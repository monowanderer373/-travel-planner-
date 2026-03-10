import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ShareView.css';

export default function ShareView() {
  const params = useParams();
  const shareId = params.shareId || params.joinId;
  const navigate = useNavigate();
  const [errorReason, setErrorReason] = useState('');

  // Backwards compatibility: /join/:id and /share/:id redirect to /?invite=id so Home handles join (works on GitHub Pages)
  useEffect(() => {
    if (shareId) {
      navigate(`/?invite=${encodeURIComponent(shareId)}`, { replace: true });
      return;
    }
    setErrorReason('no_id');
    setStatus('error');
  }, [shareId, navigate]);

  if (!shareId) {
    const reasonText =
      errorReason === 'no_id'
        ? 'URL is missing the trip id (check the link).'
        : errorReason === 'no_supabase'
          ? 'App is not connected to Supabase on this site (check build env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).'
          : errorReason === 'no_row'
            ? 'No shared trip found for this id (creator should generate link from the live site while signed in).'
            : errorReason
              ? `Error: ${errorReason}`
              : '';
    return (
      <div className="page share-view-page">
        <div className="share-view-message">
          <h2>Link not found or expired</h2>
          <p>This share link may be invalid or the trip was not synced yet. Ask the person who shared it to generate a new link (they should be signed in with Google when generating it), then try again.</p>
          {reasonText && (
            <p className="share-view-diagnostic" style={{ fontSize: '0.85rem', marginTop: '0.5rem', wordBreak: 'break-all' }}>
              {reasonText}
            </p>
          )}
          <div className="share-view-actions">
            <button type="button" className="primary" onClick={() => navigate('/')}>
              Go to home
            </button>
            <button type="button" onClick={() => navigate('/welcome')}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page share-view-page">
      <div className="share-view-loading">
        <p>Loading shared itinerary…</p>
      </div>
    </div>
  );
}

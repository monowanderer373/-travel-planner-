import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { supabase, hasSupabase } from '../lib/supabase';
import './ShareView.css';

export default function ShareView() {
  const params = useParams();
  const shareId = params.shareId || params.joinId;
  const navigate = useNavigate();
  const { replaceItineraryState } = useItinerary();
  const [status, setStatus] = useState('loading'); // 'loading' | 'done' | 'error'

  useEffect(() => {
    if (!shareId) {
      setStatus('error');
      return;
    }
    if (!hasSupabase() || !supabase) {
      setStatus('error');
      return;
    }
    supabase
      .from('shared_itineraries')
      .select('data')
      .eq('id', shareId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (error || !row?.data) {
          setStatus('error');
          return;
        }
        const data = row.data;
        replaceItineraryState({
          ...data,
          shareSettings: { ...data.shareSettings, tripId: shareId },
        });
        setStatus('done');
        navigate('/', { replace: true });
      })
      .catch(() => setStatus('error'));
  }, [shareId, replaceItineraryState, navigate]);

  if (status === 'error') {
    return (
      <div className="page share-view-page">
        <div className="share-view-message">
          <h2>Link not found or expired</h2>
          <p>This share link may be invalid. Ask the person who shared it for a new link.</p>
          <button type="button" className="primary" onClick={() => navigate('/')}>
            Go to home
          </button>
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

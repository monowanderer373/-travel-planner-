import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { hasSupabase, supabase } from '../lib/supabase';
import { joinPlanMember, loadPlanSharePreview } from '../lib/planSharing';
import './ShareView.css';

export default function ShareView() {
  const params = useParams();
  const shareId = params.shareId || params.joinId;
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { t } = useLanguage();
  const [errorReason, setErrorReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const title = useMemo(() => {
    const raw = preview?.destination || preview?.plan_title || '';
    return String(raw).trim() || 'Untitled trip';
  }, [preview?.destination, preview?.plan_title]);
  const dateText = useMemo(() => {
    const start = preview?.start_date || '';
    const end = preview?.end_date || '';
    return start && end ? `${start} - ${end}` : '';
  }, [preview?.start_date, preview?.end_date]);

  useEffect(() => {
    if (!shareId) {
      setErrorReason('no_id');
      setLoading(false);
      return;
    }
    if (!hasSupabase() || !supabase) {
      setErrorReason('no_supabase');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadPlanSharePreview(supabase, shareId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setErrorReason(error?.message || 'preview_failed');
          setLoading(false);
          return;
        }
        if (!data?.plan_id || !data?.is_active) {
          setErrorReason('legacy_or_missing');
          setLoading(false);
          return;
        }
        setPreview(data);
        setErrorReason('');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorReason(err?.message || 'preview_failed');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  useEffect(() => {
    if (!authReady || !user || !preview?.plan_id) return;
    if (!hasSupabase() || !supabase) return;

    let cancelled = false;
    void supabase
      .from('plan_members')
      .select('plan_id')
      .eq('plan_id', preview.plan_id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) return;
        const isOwner = String(preview.owner_profile_id || '').trim() === String(user.id || '').trim();
        const alreadyJoined = !!data?.plan_id || isOwner;
        if (alreadyJoined) {
          navigate(`/?plan=${encodeURIComponent(preview.plan_id)}`, { replace: true });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, preview?.plan_id, preview?.owner_profile_id, navigate]);

  const handleJoin = async () => {
    if (!shareId) return;
    if (!user) {
      navigate('/welcome', { state: { from: `/share/${encodeURIComponent(shareId)}` } });
      return;
    }
    if (!hasSupabase() || !supabase) return;
    setJoining(true);
    try {
      const { error, share } = await joinPlanMember(supabase, { token: shareId, userId: user.id, joinedVia: 'link' });
      if (error || !share?.plan_id) {
        setErrorReason(error?.message || 'join_failed');
        return;
      }
      navigate(`/?plan=${encodeURIComponent(share.plan_id)}`, { replace: true });
    } finally {
      setJoining(false);
    }
  };

  const openLegacyLink = () => {
    if (!shareId) return;
    if (!authReady || user) {
      navigate(`/?trip=${encodeURIComponent(shareId)}`, { replace: true });
      return;
    }
    navigate('/welcome', { state: { from: `/?trip=${encodeURIComponent(shareId)}` } });
  };

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

  if (loading) {
    return (
      <div className="page share-view-page">
        <div className="share-view-loading">
          <p>Loading shared itinerary…</p>
        </div>
      </div>
    );
  }

  if (preview?.plan_id) {
    return (
      <div className="page share-view-page">
        <div className="share-view-message">
          <h2>{title}</h2>
          {dateText ? <p>{dateText}</p> : null}
          <p>
            {user
              ? t('share.previewSignedIn')
              : t('share.previewNeedSignIn')}
          </p>
          <div className="share-view-actions">
            <button type="button" className="primary" onClick={handleJoin} disabled={joining}>
              {joining ? t('share.joining') : t('share.join')}
            </button>
            {!user && (
              <button type="button" onClick={() => navigate('/welcome', { state: { from: `/share/${encodeURIComponent(shareId)}` } })}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (errorReason === 'legacy_or_missing') {
    return (
      <div className="page share-view-page">
        <div className="share-view-message">
          <h2>Open shared trip</h2>
          <p>This looks like an older share link. You can still try opening it with the legacy shared-trip flow.</p>
          <div className="share-view-actions">
            <button type="button" className="primary" onClick={openLegacyLink}>
              {t('share.openLegacy')}
            </button>
            <button type="button" onClick={() => navigate('/')}>
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

import { useState, useEffect } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, hasSupabase } from '../lib/supabase';
import './ActivityFeed.css';

const ACTION_LABELS = {
  added_saved_place: { en: 'added saved place', zh: '添加了收藏地点' },
  added_transport: { en: 'added transport', zh: '添加了交通' },
  updated_cost: { en: 'updated cost item', zh: '更新了花费项' },
  updated_trip: { en: 'updated trip details', zh: '更新了行程信息' },
};

function formatTime(createdAt) {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export default function ActivityFeed({ limit = 50, hideTitle = false, defaultExpanded = false }) {
  const { shareSettings } = useItinerary();
  const { lang } = useLanguage();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tripId = shareSettings?.tripId;

  useEffect(() => {
    if (!tripId || !hasSupabase() || !supabase) {
      setActivities([]);
      return;
    }
    setLoading(true);
    supabase
      .from('trip_activities')
      .select('id, user_name, action_type, details, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        setLoading(false);
        if (!error && Array.isArray(data)) setActivities(data);
        else setActivities([]);
      })
      .catch(() => {
        setLoading(false);
        setActivities([]);
      });

    const channel = supabase
      .channel(`activities:${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_activities', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload?.new) setActivities((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [tripId]);

  if (!tripId) return null;

  const isZh = lang === 'zh-CN';
  const getActionLabel = (actionType, details) => {
    const key = ACTION_LABELS[actionType];
    const label = key ? (isZh ? key.zh : key.en) : actionType;
    const name = details?.placeName || details?.lineName || details?.itemName;
    if (name) return `${label} "${name}"`;
    if (details?.route) return `${label} ${details.route}`;
    return label;
  };

  const shown = expanded ? activities : activities.slice(0, Math.max(0, limit));
  const canExpand = !expanded && limit < activities.length;

  return (
    <section className="section activity-feed-section">
      {!hideTitle && (
        <div className="activity-feed-header-row">
          <h2 className="section-title">{isZh ? '行程动态' : 'Trip activity'}</h2>
          {canExpand && (
            <button type="button" className="activity-feed-expand" onClick={() => setExpanded(true)}>
              {isZh ? '查看全部' : 'Show all'}
            </button>
          )}
        </div>
      )}
      {loading ? (
        <p className="activity-feed-loading">{isZh ? '加载中…' : 'Loading…'}</p>
      ) : activities.length === 0 ? (
        <p className="activity-feed-empty">{isZh ? '暂无动态' : 'No activity yet.'}</p>
      ) : (
        <ul className="activity-feed-list">
          {shown.map((a) => (
            <li key={a.id} className="activity-feed-item">
              <span className="activity-feed-user">{a.user_name}</span>
              <span className="activity-feed-action">{getActionLabel(a.action_type, a.details || {})}</span>
              <span className="activity-feed-time">{formatTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      {hideTitle && canExpand && (
        <button type="button" className="activity-feed-expand-inline" onClick={() => setExpanded(true)}>
          {isZh ? '查看全部动态' : 'Show all activity'}
        </button>
      )}
    </section>
  );
}

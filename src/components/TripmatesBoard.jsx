import { useState, useEffect } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase, hasSupabase } from '../lib/supabase';
import './TripmatesBoard.css';

const ACTION_LABELS = {
  added_saved_place: { en: 'Added saved place', zh: '添加了收藏地点' },
  added_transport: { en: 'Added transport', zh: '添加了交通' },
  updated_cost: { en: 'Updated cost item', zh: '更新了花费项' },
  updated_trip: { en: 'Updated trip details', zh: '更新了行程信息' },
};

export default function TripmatesBoard() {
  const { tripCreator, tripmates, shareSettings } = useItinerary();
  const { lang } = useLanguage();
  const [activities, setActivities] = useState([]);
  const [selectedName, setSelectedName] = useState(null);
  const tripId = shareSettings?.tripId;
  const isZh = lang === 'zh-CN';

  const members = [
    ...(tripCreator?.name ? [{ name: tripCreator.name, isCreator: true }] : []),
    ...tripmates.map((t) => ({ name: t.name, isCreator: false })),
  ];
  const uniqueNames = [...new Set(members.map((m) => m.name).filter(Boolean))];

  useEffect(() => {
    if (!tripId || !hasSupabase() || !supabase) {
      setActivities([]);
      return;
    }
    supabase
      .from('trip_activities')
      .select('id, user_name, action_type, details, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) setActivities(data);
        else setActivities([]);
      })
      .catch(() => setActivities([]));
  }, [tripId]);

  const getActionLabel = (actionType, details) => {
    const key = ACTION_LABELS[actionType];
    const label = key ? (isZh ? key.zh : key.en) : actionType;
    const name = details?.placeName || details?.lineName || details?.itemName;
    if (name) return `${label}: ${name}`;
    if (details?.route) return `${label}: ${details.route}`;
    return label;
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return '';
    try {
      return new Date(createdAt).toLocaleString(lang === 'zh-CN' ? 'zh-CN' : 'en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  };

  const selectedActivities = selectedName ? activities.filter((a) => a.user_name === selectedName) : [];

  if (uniqueNames.length === 0) return null;

  return (
    <section className="section tripmates-board-section">
      <h2 className="section-title">{isZh ? '旅伴' : 'Tripmates'}</h2>
      <p className="tripmates-board-count">
        {isZh ? `共 ${uniqueNames.length} 人` : `${uniqueNames.length} member${uniqueNames.length !== 1 ? 's' : ''}`}
      </p>
      <ul className="tripmates-board-list">
        {members.filter((m) => m.name).map((m, i) => (
          <li key={m.name + i} className="tripmates-board-item">
            <button
              type="button"
              className="tripmates-board-member-btn"
              onClick={() => setSelectedName(m.name)}
            >
              <span className="tripmates-board-avatar">{m.name.charAt(0).toUpperCase()}</span>
              <span className="tripmates-board-name">{m.name}</span>
              {m.isCreator && <span className="tripmates-board-badge">{isZh ? '创建者' : 'Creator'}</span>}
            </button>
          </li>
        ))}
      </ul>

      {selectedName && (
        <div className="tripmates-board-backdrop" onClick={() => setSelectedName(null)}>
          <div className="tripmates-board-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tripmates-board-modal-header">
              <h3>{selectedName}</h3>
              <button type="button" className="tripmates-board-modal-close" onClick={() => setSelectedName(null)}>
                ×
              </button>
            </div>
            <div className="tripmates-board-modal-body">
              <h4 className="tripmates-board-modal-subtitle">{isZh ? '近期动态' : 'Recent activity'}</h4>
              {selectedActivities.length === 0 ? (
                <p className="tripmates-board-modal-empty">{isZh ? '暂无记录' : 'No activity yet.'}</p>
              ) : (
                <ul className="tripmates-board-activity-list">
                  {selectedActivities.slice(0, 20).map((a) => (
                    <li key={a.id} className="tripmates-board-activity-item">
                      <span className="tripmates-board-activity-action">
                        {getActionLabel(a.action_type, a.details || {})}
                      </span>
                      <span className="tripmates-board-activity-time">{formatDate(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

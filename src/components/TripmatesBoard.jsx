import { useState, useEffect, useMemo } from 'react';
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
  const { lang, t } = useLanguage();
  const [activities, setActivities] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const tripId = shareSettings?.tripId;
  const isZh = lang === 'zh-CN';

  const members = useMemo(() => {
    const list = [];
    if (tripCreator?.name?.trim()) {
      list.push({
        key: 'creator',
        name: tripCreator.name.trim(),
        email: (tripCreator.email || '').trim(),
        bio: (tripCreator.bio || '').trim(),
        avatarUrl: (tripCreator.avatarUrl || tripCreator.photoURL || '').trim(),
        isCreator: true,
      });
    }
    tripmates.forEach((tm, i) => {
      const name = (tm.name || '').trim();
      if (!name) return;
      list.push({
        key: tm.userId ? `u-${tm.userId}` : `t-${tm.id || i}`,
        name,
        email: (tm.email || '').trim(),
        bio: (tm.bio || '').trim(),
        avatarUrl: (tm.avatarUrl || '').trim(),
        isCreator: false,
      });
    });
    return list;
  }, [tripCreator, tripmates]);

  const selectedMember = selectedKey ? members.find((m) => m.key === selectedKey) : null;

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

  const selectedActivities = selectedMember
    ? activities.filter((a) => a.user_name === selectedMember.name)
    : [];

  if (members.length === 0) return null;

  return (
    <section className="section tripmates-board-section">
      <h2 className="section-title">{isZh ? '旅伴' : 'Tripmates'}</h2>
      <p className="tripmates-board-count">
        {isZh ? `共 ${members.length} 人` : `${members.length} member${members.length !== 1 ? 's' : ''}`}
      </p>
      <ul className="tripmates-board-list">
        {members.map((m) => (
          <li key={m.key} className="tripmates-board-item">
            <button
              type="button"
              className="tripmates-board-member-btn"
              onClick={() => setSelectedKey(m.key)}
            >
              {m.avatarUrl ? (
                <img className="tripmates-board-avatar-img" src={m.avatarUrl} alt="" />
              ) : (
                <span className="tripmates-board-avatar">{m.name.charAt(0).toUpperCase()}</span>
              )}
              <span className="tripmates-board-name">{m.name}</span>
              {m.isCreator && <span className="tripmates-board-badge">{isZh ? '创建者' : 'Creator'}</span>}
            </button>
          </li>
        ))}
      </ul>

      {selectedMember && (
        <div className="tripmates-board-backdrop" onClick={() => setSelectedKey(null)}>
          <div className="tripmates-board-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tripmates-board-modal-header">
              <div className="tripmates-board-modal-profile-row">
                {selectedMember.avatarUrl ? (
                  <img
                    className="tripmates-board-modal-avatar"
                    src={selectedMember.avatarUrl}
                    alt=""
                  />
                ) : (
                  <span className="tripmates-board-modal-avatar-fallback">
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <h3>{selectedMember.name}</h3>
              </div>
              <button type="button" className="tripmates-board-modal-close" onClick={() => setSelectedKey(null)}>
                ×
              </button>
            </div>
            <div className="tripmates-board-modal-body">
              {selectedMember.email && (
                <p className="tripmates-board-modal-field">
                  <strong>{t('tripmates.email')}</strong> {selectedMember.email}
                </p>
              )}
              {selectedMember.bio && (
                <p className="tripmates-board-modal-field tripmates-board-modal-bio">
                  <strong>{t('tripmates.bio')}</strong> {selectedMember.bio}
                </p>
              )}
              <h4 className="tripmates-board-modal-subtitle">{t('tripmates.recentActivity')}</h4>
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

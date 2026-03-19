import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useCost } from '../context/CostContext';
import './TripmatesBoard.css';

export default function TripmatesBoard() {
  const { tripCreator, tripmates, planMembers, shareSettings } = useItinerary();
  const { lang, t } = useLanguage();
  const { people } = useCost();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState(null);
  const tripId = shareSettings?.tripId;
  const isZh = lang === 'zh-CN';

  const members = useMemo(() => {
    if (Array.isArray(planMembers) && planMembers.length > 0) {
      return planMembers
        .filter((m) => m?.name?.trim())
        .map((m, i) => ({
          key: m.userId ? `u-${m.userId}` : `pm-${i}`,
          name: m.name.trim(),
          email: (m.email || '').trim(),
          bio: (m.bio || '').trim(),
          avatarUrl: (m.avatarUrl || '').trim(),
          isCreator: m.role === 'owner',
        }));
    }
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
  }, [planMembers, tripCreator, tripmates]);

  const selectedMember = selectedKey ? members.find((m) => m.key === selectedKey) : null;

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const name = params.get('member');
      if (!name) return;
      const decoded = decodeURIComponent(name);
      const hit = members.find((m) => m.name === decoded);
      if (hit) setSelectedKey(hit.key);
      params.delete('member');
      navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    } catch {
      // ignore
    }
  }, [location.search, members, navigate]);

  const paymentInfo = useMemo(() => {
    if (!selectedMember) return null;
    const norm = (s) => String(s || '').trim().toLowerCase();
    const p = people.find((x) => norm(x.name) === norm(selectedMember.name));
    const pay = p?.paymentInfo;
    if (!pay || !pay.saved) return null;
    const hasAny = !!(pay.qrCode || pay.bankName || pay.accountHolder || pay.accountNumber || pay.notes);
    if (!hasAny) return null;
    return pay;
  }, [people, selectedMember]);

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
              {paymentInfo && (
                <>
                  <h4 className="tripmates-board-modal-subtitle">{t('tripmates.paymentDetails')}</h4>
                  <div className="tripmates-pay-card">
                    {paymentInfo.qrCode && (
                      <div className="tripmates-pay-qr">
                        <img src={paymentInfo.qrCode} alt="" />
                      </div>
                    )}
                    <div className="tripmates-pay-fields">
                      {paymentInfo.bankName && (
                        <p className="tripmates-board-modal-field">
                          <strong>{t('cost.bankName')}</strong> {paymentInfo.bankName}
                        </p>
                      )}
                      {paymentInfo.accountHolder && (
                        <p className="tripmates-board-modal-field">
                          <strong>{t('cost.accountHolder')}</strong> {paymentInfo.accountHolder}
                        </p>
                      )}
                      {paymentInfo.accountNumber && (
                        <p className="tripmates-board-modal-field">
                          <strong>{t('cost.accountNumber')}</strong> {paymentInfo.accountNumber}
                        </p>
                      )}
                      {paymentInfo.notes && (
                        <p className="tripmates-board-modal-field tripmates-board-modal-bio">
                          <strong>{t('cost.notes')}</strong> {paymentInfo.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

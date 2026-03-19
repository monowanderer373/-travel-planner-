import { NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useItinerary } from '../context/ItineraryContext';
import './TopBarVoyage.css';

const base = import.meta.env.BASE_URL || '/';
const settingsIcon = `${base.replace(/\/$/, '')}/icons/settings.png`;

export default function TopBar({ onMenuClick, menuOpen }) {
  const { user } = useAuth();
  const { themeId } = useTheme();
  const { t, lang } = useLanguage();
  const displayName = user?.name?.trim() || 'Profile';
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';

  const location = useLocation();
  const [voyageNavOpen, setVoyageNavOpen] = useState(false);
  const voyageToggleRef = useRef(null);
  const voyagePanelRef = useRef(null);

  const {
    trip,
    shareSettings,
    leaveSharedTrip,
    availablePlans,
    activePlanRecord,
    plansLoaded,
    activePersonalPlanId,
    switchToPersonalPlan,
    createPersonalPlan,
    deletePersonalPlan,
    leavePlan,
  } = useItinerary();
  const [planOpen, setPlanOpen] = useState(false);
  const planToggleRef = useRef(null);
  const planPanelRef = useRef(null);

  const voyageTabs = useMemo(
    () => [
      { to: '/', label: t('nav.home'), end: true },
      { to: '/itinerary', label: t('nav.itinerary') },
      { to: '/saved', label: t('nav.saved') },
      { to: '/transport', label: t('nav.transport') },
      { to: '/cost', label: t('nav.cost') },
      { to: '/group', label: t('home.tripmates.title') },
    ],
    [t]
  );

  useEffect(() => {
    // Close dropdown on route change.
    setVoyageNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!voyageNavOpen) return;
    const onDown = (e) => {
      const target = e.target;
      const inPanel = voyagePanelRef.current && voyagePanelRef.current.contains(target);
      const inToggle = voyageToggleRef.current && voyageToggleRef.current.contains(target);
      if (!inPanel && !inToggle) setVoyageNavOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [voyageNavOpen]);

  useEffect(() => {
    if (!planOpen) return;
    const onDown = (e) => {
      const target = e.target;
      const inPanel = planPanelRef.current && planPanelRef.current.contains(target);
      const inToggle = planToggleRef.current && planToggleRef.current.contains(target);
      if (!inPanel && !inToggle) setPlanOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [planOpen]);

  const isSharedMode = !!shareSettings?.tripId;
  const activePlan = activePlanRecord || availablePlans[0] || null;
  const activeTrip = isSharedMode ? (trip || {}) : (activePlan?.data?.trip || {});
  const activeTitle = String(activeTrip?.destination || '').trim() || 'Untitled';
  const activeStartDate = activeTrip?.startDate;
  const monthYearFmt = new Intl.DateTimeFormat(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
  });
  const activeMonthYear = activeStartDate ? monthYearFmt.format(new Date(`${activeStartDate}T00:00:00`)) : '';

  const planTitleText = `${activeTitle}${activeMonthYear ? ` · ${activeMonthYear}` : ''}`;
  const planRows = availablePlans;
  const formatPlanLabel = (plan) => {
    const tripData = plan?.data?.trip || {};
    const title = String(tripData?.destination || '').trim() || 'Untitled';
    const ownerTag = plan?.memberType === 'guest' ? t('plan.guest') : t('plan.you');
    return `${title} (${ownerTag})`;
  };
  const formatPlanMeta = (plan) => {
    const tripData = plan?.data?.trip || {};
    const startDate = tripData?.startDate;
    return startDate ? monthYearFmt.format(new Date(`${startDate}T00:00:00`)) : '';
  };
  const handlePlanSwitch = (planId) => {
    if (!planId) return;
    if (isSharedMode) {
      const ok = window.confirm('Switch to this plan and leave the current shared trip?');
      if (!ok) return;
    }
    setPlanOpen(false);
    void switchToPersonalPlan(planId);
  };
  const handleCreatePlan = () => {
    if (isSharedMode) {
      const ok = window.confirm('Create a new plan and leave the current shared trip?');
      if (!ok) return;
    }
    setPlanOpen(false);
    void createPersonalPlan();
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        {!isVoyage && (
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={onMenuClick}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
        <Link to="/" className="topbar-brand" aria-label="Home">
          <span className="topbar-logo">{isVoyage ? 'Voyage' : 'Wander'}</span>
          {!isVoyage && <span className="topbar-tagline">Travel Planner</span>}
        </Link>
        {isVoyage && (
          <>
            <button
              ref={voyageToggleRef}
              type="button"
              className="topbar-voyage-mobile-tabs-btn"
              aria-label={voyageNavOpen ? 'Close tabs' : 'Open tabs'}
              aria-expanded={voyageNavOpen}
              onClick={() => setVoyageNavOpen((v) => !v)}
            >
              ☰
            </button>

            <nav className="topbar-nav" aria-label="Primary">
              {voyageTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end ? true : undefined}
                  className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            {voyageNavOpen && (
              <div ref={voyagePanelRef} className="topbar-voyage-mobile-panel" role="menu" aria-label="Voyage tabs">
                {voyageTabs.map((tab) => (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end ? true : undefined}
                    className={({ isActive }) => `topbar-voyage-mobile-item ${isActive ? 'topbar-voyage-mobile-item-active' : ''}`}
                    onClick={() => setVoyageNavOpen(false)}
                  >
                    {tab.label}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="topbar-actions">
        <div className="topbar-plan-wrap">
          <button
            ref={planToggleRef}
            type="button"
            className={`topbar-link topbar-plan-toggle ${planOpen ? 'topbar-plan-toggle-open' : ''}`}
            onClick={() => setPlanOpen((v) => !v)}
            aria-label="Your Plan"
            aria-expanded={planOpen}
          >
            Your Plan
          </button>
          {planOpen && (
            <div ref={planPanelRef} className="topbar-plan-panel" role="menu" aria-label="Personal plans">
              {isSharedMode ? (
                <div className="topbar-plan-list">
                  <button
                    type="button"
                    className="topbar-plan-item topbar-plan-item-active"
                    disabled
                    aria-disabled="true"
                  >
                    <span className="topbar-plan-item-label">{planTitleText}</span>
                    <span className="topbar-plan-item-spacer" />
                  </button>
                </div>
              ) : !plansLoaded ? (
                <div className="topbar-plan-empty">Loading…</div>
              ) : planRows.length === 0 ? (
                <div className="topbar-plan-empty">No plans yet.</div>
              ) : (
                <div className="topbar-plan-list">
                  {planRows.map((p) => {
                    const label = formatPlanLabel(p);
                    const active = p?.id === activePersonalPlanId;
                    const isGuestPlan = p?.memberType === 'guest';
                    return (
                      <button
                        key={p?.id}
                        type="button"
                        className={`topbar-plan-item ${active ? 'topbar-plan-item-active' : ''}`}
                        onClick={() => handlePlanSwitch(p?.id)}
                      >
                        <span className="topbar-plan-item-label">
                          <span className="topbar-plan-item-title">{label}</span>
                          {formatPlanMeta(p) ? <span className="topbar-plan-item-meta">{formatPlanMeta(p)}</span> : null}
                        </span>
                        <span className="topbar-plan-item-spacer" />
                        <button
                          type="button"
                          className="topbar-plan-item-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ok = window.confirm(isGuestPlan ? t('plan.leaveConfirm') : t('plan.deleteConfirm'));
                            if (!ok) return;
                            if (isGuestPlan) void leavePlan(p?.id);
                            else void deletePersonalPlan(p?.id);
                          }}
                          aria-label={isGuestPlan ? t('plan.leave') : t('plan.delete')}
                        >
                          {isGuestPlan ? t('plan.leave') : t('plan.delete')}
                        </button>
                      </button>
                    );
                  })}
                </div>
              )}
              {isSharedMode && (
                <>
                  <div className="topbar-plan-divider" />
                  {!plansLoaded ? (
                    <div className="topbar-plan-empty">Loading…</div>
                  ) : planRows.length === 0 ? (
                    <div className="topbar-plan-empty">No plans yet.</div>
                  ) : (
                    <div className="topbar-plan-list">
                      {planRows.map((p) => {
                        const pLabel = formatPlanLabel(p);
                        const active = p?.id === activePersonalPlanId;
                        return (
                          <button
                            key={p?.id}
                            type="button"
                            className={`topbar-plan-item ${active ? 'topbar-plan-item-active' : ''}`}
                            onClick={() => handlePlanSwitch(p?.id)}
                          >
                            <span className="topbar-plan-item-label">
                              <span className="topbar-plan-item-title">{pLabel}</span>
                              {formatPlanMeta(p) ? <span className="topbar-plan-item-meta">{formatPlanMeta(p)}</span> : null}
                            </span>
                            <span className="topbar-plan-item-spacer" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              <div className="topbar-plan-divider" />
              {isSharedMode ? (
                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  <button
                    type="button"
                    className="topbar-plan-new"
                    onClick={handleCreatePlan}
                  >
                    + New Plan
                  </button>
                  <button
                    type="button"
                    className="topbar-plan-new"
                    onClick={() => {
                      setPlanOpen(false);
                      void leaveSharedTrip();
                    }}
                  >
                    Leave shared trip
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="topbar-plan-new"
                  onClick={handleCreatePlan}
                >
                  + New Plan
                </button>
              )}
              {(isSharedMode || activePlan) ? <div className="topbar-plan-active-hint" aria-hidden="true">{planTitleText}</div> : null}
            </div>
          )}
        </div>
        <NavLink
          to="/profile"
          className={({ isActive }) => `topbar-link ${isActive ? 'topbar-link-active' : ''}`}
        >
          {displayName}
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `topbar-link topbar-settings ${isActive ? 'topbar-link-active' : ''}`}
          aria-label="Settings"
        >
          <img src={settingsIcon} alt="" aria-hidden />
        </NavLink>
      </div>
    </header>
  );
}

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
    personalPlans,
    activePersonalPlanId,
    switchToPersonalPlan,
    createPersonalPlan,
    deletePersonalPlan,
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
  const activePlan = personalPlans.find((p) => p?.id === activePersonalPlanId) || personalPlans[0];
  const activeTrip = isSharedMode ? (trip || {}) : (activePlan?.data?.trip || {});
  const activeTitle = String(activeTrip?.destination || '').trim() || 'Untitled';
  const activeStartDate = activeTrip?.startDate;
  const monthYearFmt = new Intl.DateTimeFormat(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
  });
  const activeMonthYear = activeStartDate ? monthYearFmt.format(new Date(`${activeStartDate}T00:00:00`)) : '';

  const planTitleText = `${activeTitle}${activeMonthYear ? ` · ${activeMonthYear}` : ''}`;

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
              ) : personalPlans.length === 0 ? (
                <div className="topbar-plan-empty">Loading…</div>
              ) : (
                <div className="topbar-plan-list">
                  {personalPlans.map((p) => {
                    const trip = p?.data?.trip || {};
                    const title = String(trip?.destination || '').trim() || 'Untitled';
                    const startDate = trip?.startDate;
                    const monthYear = startDate ? monthYearFmt.format(new Date(`${startDate}T00:00:00`)) : '';
                    const label = `${title}${monthYear ? ` · ${monthYear}` : ''}`;
                    const active = p?.id === activePersonalPlanId;
                    return (
                      <button
                        key={p?.id}
                        type="button"
                        className={`topbar-plan-item ${active ? 'topbar-plan-item-active' : ''}`}
                        onClick={() => {
                          setPlanOpen(false);
                          void switchToPersonalPlan(p?.id);
                        }}
                      >
                        <span className="topbar-plan-item-label">{label}</span>
                        <span className="topbar-plan-item-spacer" />
                        <button
                          type="button"
                          className="topbar-plan-item-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ok = window.confirm('Delete this plan? This can not be undone.');
                            if (!ok) return;
                            void deletePersonalPlan(p?.id);
                          }}
                          aria-label="Delete plan"
                        >
                          ×
                        </button>
                      </button>
                    );
                  })}
                </div>
              )}
              {isSharedMode && (
                <>
                  <div className="topbar-plan-divider" />
                  {personalPlans.length === 0 ? (
                    <div className="topbar-plan-empty">Loading…</div>
                  ) : (
                    <div className="topbar-plan-list">
                      {personalPlans.map((p) => {
                        const pTrip = p?.data?.trip || {};
                        const pTitle = String(pTrip?.destination || '').trim() || 'Untitled';
                        const pStartDate = pTrip?.startDate;
                        const pMonthYear = pStartDate ? monthYearFmt.format(new Date(`${pStartDate}T00:00:00`)) : '';
                        const pLabel = `${pTitle}${pMonthYear ? ` · ${pMonthYear}` : ''}`;
                        const active = p?.id === activePersonalPlanId;
                        return (
                          <button
                            key={p?.id}
                            type="button"
                            className={`topbar-plan-item ${active ? 'topbar-plan-item-active' : ''}`}
                            onClick={() => {
                              const ok = window.confirm('Switch to your personal plan and leave this shared trip?');
                              if (!ok) return;
                              setPlanOpen(false);
                              void switchToPersonalPlan(p?.id);
                            }}
                          >
                            <span className="topbar-plan-item-label">{pLabel}</span>
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
                    onClick={() => {
                      const ok = window.confirm('Create a new personal plan and leave this shared trip?');
                      if (!ok) return;
                      setPlanOpen(false);
                      void createPersonalPlan();
                    }}
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
                  onClick={() => {
                    setPlanOpen(false);
                    void createPersonalPlan();
                  }}
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

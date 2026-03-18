import { NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import './TopBarVoyage.css';

const base = import.meta.env.BASE_URL || '/';
const settingsIcon = `${base.replace(/\/$/, '')}/icons/settings.png`;

export default function TopBar({ onMenuClick, menuOpen }) {
  const { user } = useAuth();
  const { themeId } = useTheme();
  const { t } = useLanguage();
  const displayName = user?.name?.trim() || 'Profile';
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';

  const location = useLocation();
  const [voyageNavOpen, setVoyageNavOpen] = useState(false);
  const voyageToggleRef = useRef(null);
  const voyagePanelRef = useRef(null);

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

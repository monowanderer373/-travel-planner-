import { NavLink, Link } from 'react-router-dom';
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
          <nav className="topbar-nav" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/itinerary" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              {t('nav.itinerary')}
            </NavLink>
            <NavLink to="/saved" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              {t('nav.saved')}
            </NavLink>
            <NavLink to="/transport" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              {t('nav.transport')}
            </NavLink>
            <NavLink to="/cost" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              {t('nav.cost')}
            </NavLink>
            <NavLink to="/group" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              {t('home.tripmates.title')}
            </NavLink>
          </nav>
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

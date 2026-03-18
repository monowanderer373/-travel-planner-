import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './TopBarVoyage.css';

const base = import.meta.env.BASE_URL || '/';
const settingsIcon = `${base.replace(/\/$/, '')}/icons/settings.png`;

export default function TopBar({ onMenuClick, menuOpen }) {
  const { user } = useAuth();
  const { themeId } = useTheme();
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
              首页
            </NavLink>
            <NavLink to="/itinerary" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              行程
            </NavLink>
            <NavLink to="/saved" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              收藏
            </NavLink>
            <NavLink to="/transport" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              交通
            </NavLink>
            <NavLink to="/cost" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              花费
            </NavLink>
            <NavLink to="/group" className={({ isActive }) => `topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
              旅伴
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

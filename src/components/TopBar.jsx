import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const base = import.meta.env.BASE_URL || '/';
const settingsIcon = `${base.replace(/\/$/, '')}/icons/settings.png`;

export default function TopBar({ onMenuClick, menuOpen }) {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || 'Profile';

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <Link to="/" className="topbar-brand" aria-label="Wander Travel Planner - Home">
          <span className="topbar-logo">Wander</span>
          <span className="topbar-tagline">Travel Planner</span>
        </Link>
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

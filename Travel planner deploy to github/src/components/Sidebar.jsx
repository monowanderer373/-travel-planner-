import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/itinerary', label: 'Itinerary', icon: '📅' },
  { to: '/saved', label: 'Saved Places', icon: '📍' },
  { to: '/transport', label: 'Transport', icon: '🚆' },
  { to: '/journal', label: 'Trip Journal', icon: '📖' },
  { to: '/cost', label: 'Cost', icon: '💰' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="sidebar" onClick={onNavigate}>
      <div className="sidebar-brand">
        <span className="sidebar-logo">Wander</span>
        <span className="sidebar-tagline">Travel Planner</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const base = import.meta.env.BASE_URL || '/';
const icon = (name) => `${base.replace(/\/$/, '')}/icons/${name}`;

const navItems = [
  { to: '/', label: 'Home', icon: icon('home.png') },
  { to: '/create', label: 'Create / Edit trip', icon: icon('create-trip.png') },
  { to: '/itinerary', label: 'Itinerary', icon: icon('itinerary.png') },
  { to: '/saved', label: 'Saved Places', icon: icon('saved-places.png') },
  { to: '/transport', label: 'Transport', icon: icon('transport.png') },
  { to: '/journal', label: 'Trip Journal', icon: icon('journal.png') },
  { to: '/cost', label: 'Cost', icon: icon('cost.png') },
  { to: '/settings', label: 'Settings', icon: icon('settings.png') },
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
            <span className="sidebar-link-icon">
              <img src={icon} alt="" aria-hidden />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

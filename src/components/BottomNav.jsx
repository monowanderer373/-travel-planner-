import { NavLink } from 'react-router-dom';

const base = import.meta.env.BASE_URL || '/';
const icon = (name) => `${base.replace(/\/$/, '')}/icons/${name}`;

const bottomNavItems = [
  { to: '/', label: 'Home', icon: icon('home.png') },
  { to: '/itinerary', label: 'Itinerary', icon: icon('itinerary.png') },
  { to: '/saved', label: 'Saved Places', icon: icon('saved-places.png') },
  { to: '/cost', label: 'Cost', icon: icon('cost.png') },
  { to: '/transport', label: 'Transport', icon: icon('transport.png') },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {bottomNavItems.map(({ to, label, icon: iconSrc }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav-link ${isActive ? 'bottom-nav-link-active' : ''}`}
          aria-current={undefined}
        >
          <span className="bottom-nav-icon">
            <img src={iconSrc} alt="" aria-hidden />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

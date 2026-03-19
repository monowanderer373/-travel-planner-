import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { toWithPreservedSearch } from '../utils/preserveSearch';
import './Sidebar.css';

const base = import.meta.env.BASE_URL || '/';
const icon = (name) => `${base.replace(/\/$/, '')}/icons/${name}`;

const navKeys = [
  { to: '/', key: 'nav.home', icon: icon('home.png') },
  { to: '/create', key: 'nav.create', icon: icon('create-trip.png') },
  { to: '/itinerary', key: 'nav.itinerary', icon: icon('itinerary.png') },
  { to: '/saved', key: 'nav.saved', icon: icon('saved-places.png') },
  { to: '/transport', key: 'nav.transport', icon: icon('transport.png') },
  { to: '/journal', key: 'nav.journal', icon: icon('journal.png') },
  { to: '/cost', key: 'nav.cost', icon: icon('cost.png') },
  { to: '/settings', key: 'nav.settings', icon: icon('settings.png') },
];

export default function Sidebar({ onNavigate }) {
  const { t } = useLanguage();
  const { search } = useLocation();
  return (
    <aside className="sidebar" onClick={onNavigate}>
      <div className="sidebar-brand">
        <span className="sidebar-logo">{t('app.name')}</span>
        <span className="sidebar-tagline">{t('app.tagline')}</span>
      </div>
      <nav className="sidebar-nav">
        {navKeys.map(({ to, key, icon }) => (
          <NavLink
            key={to}
            to={toWithPreservedSearch(to, search)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <img src={icon} alt="" aria-hidden />
            </span>
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

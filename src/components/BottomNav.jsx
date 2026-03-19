import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { toWithPreservedSearch } from '../utils/preserveSearch';

const base = import.meta.env.BASE_URL || '/';
const icon = (name) => `${base.replace(/\/$/, '')}/icons/${name}`;

export default function BottomNav() {
  const { t } = useLanguage();
  const { search } = useLocation();
  const bottomNavItems = [
    { to: '/', label: t('nav.home'), icon: icon('home.png') },
    { to: '/itinerary', label: t('nav.itinerary'), icon: icon('itinerary.png') },
    { to: '/saved', label: t('nav.saved'), icon: icon('saved-places.png') },
    { to: '/cost', label: t('nav.cost'), icon: icon('cost.png') },
    { to: '/transport', label: t('nav.transport'), icon: icon('transport.png') },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {bottomNavItems.map(({ to, label, icon: iconSrc }) => (
        <NavLink
          key={to}
          to={toWithPreservedSearch(to, search)}
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

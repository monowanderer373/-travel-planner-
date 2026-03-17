import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './DashboardCard.css';

export default function DashboardCard({ title, titleKey, actionLabel, actionTo, children, className = '' }) {
  const { t } = useLanguage();
  const label = titleKey ? t(titleKey) : title;
  const linkText = typeof actionLabel === 'string' && actionLabel.startsWith('home.') ? t(actionLabel) : actionLabel;

  return (
    <section className={`dashboard-card ${className}`}>
      <div className="dashboard-card-header">
        <h2 className="dashboard-card-title">{label}</h2>
        {actionTo && linkText && (
          <Link to={actionTo} className="dashboard-card-action">
            {linkText}
          </Link>
        )}
      </div>
      <div className="dashboard-card-body">{children}</div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { useCost } from '../context/CostContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardCard from './DashboardCard';
import './BudgetSnapshotCard.css';

export default function BudgetSnapshotCard() {
  const { t } = useLanguage();
  const { expenses, CURRENCIES } = useCost();
  const total = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const count = (expenses || []).length;
  const currency = expenses?.[0]?.paidCurrency || 'USD';
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol || currency;

  return (
    <DashboardCard titleKey="home.budget.title" actionLabel="home.budget.viewAll" actionTo="/cost">
      {count === 0 ? (
        <p className="budget-snapshot-empty">{t('home.budget.empty')}</p>
      ) : (
        <div className="budget-snapshot-summary">
          <span className="budget-snapshot-total">
            {symbol}
            {total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="budget-snapshot-count">
            {count} {count === 1 ? t('cost.expensesCount') : t('cost.expensesCountPlural')}
          </span>
        </div>
      )}
    </DashboardCard>
  );
}

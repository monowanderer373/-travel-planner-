import './ExpenseCategoryModal.css';

export const EXPENSE_CATEGORIES = [
  { id: 'flights', label: 'Flights', icon: '✈️' },
  { id: 'lodging', label: 'Lodging', icon: '🛏️' },
  { id: 'car_rental', label: 'Car rental', icon: '🚗' },
  { id: 'transit', label: 'Transit', icon: '🚆' },
  { id: 'food', label: 'Food', icon: '🍴' },
  { id: 'drinks', label: 'Drinks', icon: '🍷' },
  { id: 'sightseeing', label: 'Sightseeing', icon: '🏛️' },
  { id: 'activities', label: 'Activities', icon: '🎫' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'gas', label: 'Gas', icon: '⛽' },
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'other', label: 'Other', icon: '📄' },
];

export default function ExpenseCategoryModal({ open, selectedId, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="category-modal-backdrop" onClick={onClose}>
      <div className="category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="category-modal-header">
          <button type="button" className="category-modal-back" onClick={onClose} aria-label="Back">
            ←
          </button>
          <h2 className="category-modal-title">Select category</h2>
          <button type="button" className="category-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="category-modal-grid">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-modal-btn ${selectedId === cat.id ? 'category-modal-btn-selected' : ''}`}
              onClick={() => { onSelect(cat.id); onClose(); }}
            >
              <span className="category-modal-icon">{cat.icon}</span>
              <span className="category-modal-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

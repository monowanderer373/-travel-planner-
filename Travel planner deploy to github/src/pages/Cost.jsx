import { useState, useCallback, useRef } from 'react';
import { useCost, fetchRate } from '../context/CostContext';
import { useItinerary } from '../context/ItineraryContext';
import ExpenseCategoryModal, { EXPENSE_CATEGORIES } from '../components/ExpenseCategoryModal';
import './Cost.css';

// ─── Helpers ──────────────────────────────────────────────────
function useSymbol(code) {
  const { CURRENCIES } = useCost();
  return CURRENCIES.find((c) => c.code === code)?.symbol || '';
}

// ─── People Manager ───────────────────────────────────────────
function PeopleManager() {
  const { people, addPerson, updatePerson, removePerson } = useCost();
  const { tripmates, tripCreator } = useItinerary();
  const [nameInput, setNameInput] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    addPerson(name);
    setNameInput('');
  };

  const existingNames = new Set(people.map((p) => p.name.trim().toLowerCase()));
  const tripmatesToAdd = tripmates.filter((t) => t.name && !existingNames.has(t.name.trim().toLowerCase()));
  const creatorName = tripCreator?.name?.trim();
  const creatorNotInPeople = creatorName && !existingNames.has(creatorName.toLowerCase());
  const canAddAll = people.length === 0 && (tripmatesToAdd.length > 0 || creatorNotInPeople);

  const addTripmatesAsTravellers = () => {
    tripmatesToAdd.forEach((t) => addPerson(t.name));
  };

  const addCreatorAsTraveller = () => {
    if (creatorName) addPerson(creatorName);
  };

  const addTripMatesAndCreatorAsTravellers = () => {
    if (creatorNotInPeople && creatorName) addPerson(creatorName);
    tripmatesToAdd.forEach((t) => addPerson(t.name));
  };

  return (
    <section className="section cost-section">
      <h2 className="section-title">
        Travellers <span className="count-badge">{people.length}</span>
      </h2>
      {canAddAll && (
        <div className="cost-tripmates-row cost-prefill-banner">
          <p className="cost-hint">
            Add trip mates and creator as travellers in one click?
          </p>
          <button type="button" className="primary" onClick={addTripMatesAndCreatorAsTravellers}>
            Add trip mates and creator as travellers
          </button>
        </div>
      )}
      {!canAddAll && tripmatesToAdd.length > 0 && (
        <div className="cost-tripmates-row">
          <p className="cost-hint">
            Tripmates from this trip: {tripmates.map((t) => t.name).join(', ')}.
          </p>
          <button type="button" className="primary" onClick={addTripmatesAsTravellers}>
            Add tripmates as travellers
          </button>
        </div>
      )}
      {!canAddAll && creatorNotInPeople && (
        <div className="cost-tripmates-row">
          <p className="cost-hint">Trip creator not yet in travellers.</p>
          <button type="button" className="primary" onClick={addCreatorAsTraveller}>
            Add {creatorName} (trip creator) as traveller
          </button>
        </div>
      )}
      <div className="people-list">
        {people.map((p) => (
          <div key={p.id} className="person-chip animate-in">
            <span className="person-avatar">{p.name.charAt(0).toUpperCase()}</span>
            <input
              type="text"
              value={p.name}
              onChange={(e) => updatePerson(p.id, e.target.value)}
              className="person-name-input"
            />
            <button type="button" className="person-remove" onClick={() => removePerson(p.id)}>×</button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="add-person-form">
        <input
          type="text"
          placeholder="Add traveller name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={30}
        />
        <button type="submit" className="primary">Add</button>
      </form>
    </section>
  );
}

// ─── Traveller Payment Details (QR + bank for others to pay) ───
function TravellerPaymentDetails() {
  const { people, updatePersonPayment } = useCost();

  if (people.length === 0) return null;

  const defaultPayment = () => ({
    qrCode: null,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    notes: '',
  });

  return (
    <section className="section cost-section">
      <h2 className="section-title">Traveller payment details</h2>
      <p className="cost-hint payment-details-hint">
        Add your QR code or bank account so others can pay you back.
      </p>
      <div className="traveller-payment-grid">
        {people.map((p) => {
          const pay = p.paymentInfo || defaultPayment();
          return (
            <div key={p.id} className="traveller-payment-card animate-in">
              <div className="traveller-payment-header">
                <span className="person-avatar">{p.name.charAt(0).toUpperCase()}</span>
                <span className="traveller-payment-name">{p.name}</span>
              </div>
              <div className="traveller-payment-body">
                <label className="payment-field">
                  <span>QR Code (PayNow, DuitNow, etc.)</span>
                  <div className="qr-upload-area">
                    {pay.qrCode ? (
                      <div className="qr-preview">
                        <img src={pay.qrCode} alt="QR code" />
                        <button
                          type="button"
                          className="qr-remove"
                          onClick={() => updatePersonPayment(p.id, { qrCode: null })}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="qr-upload-btn">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = URL.createObjectURL(file);
                            updatePersonPayment(p.id, { qrCode: url });
                          }}
                          style={{ display: 'none' }}
                        />
                        📷 Upload QR code
                      </label>
                    )}
                  </div>
                </label>
                <label className="payment-field">
                  <span>Bank name</span>
                  <input
                    type="text"
                    placeholder="e.g. Maybank, CIMB"
                    value={pay.bankName}
                    onChange={(e) => updatePersonPayment(p.id, { bankName: e.target.value })}
                  />
                </label>
                <label className="payment-field">
                  <span>Account holder name</span>
                  <input
                    type="text"
                    placeholder="Name on account"
                    value={pay.accountHolder}
                    onChange={(e) => updatePersonPayment(p.id, { accountHolder: e.target.value })}
                  />
                </label>
                <label className="payment-field">
                  <span>Account number</span>
                  <input
                    type="text"
                    placeholder="Account or card number"
                    value={pay.accountNumber}
                    onChange={(e) => updatePersonPayment(p.id, { accountNumber: e.target.value })}
                  />
                </label>
                <label className="payment-field">
                  <span>Notes (e.g. branch, Swift)</span>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={pay.notes}
                    onChange={(e) => updatePersonPayment(p.id, { notes: e.target.value })}
                  />
                </label>
              </div>
              {(pay.qrCode || pay.bankName || pay.accountNumber) && (
                <div className="payment-preview-note">
                  ✓ Others can use this to pay {p.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Add Expense Form ─────────────────────────────────────────
function blankForm(people) {
  return {
    category: 'other',
    description: '',
    payerId: people[0]?.id || '',
    dayTag: 'day-1',
    paymentMethod: 'card',
    amount: '',
    paidCurrency: 'JPY',
    splitPersonIds: people.map((p) => p.id),
    repayCurrency: 'MYR',
    useCustomDate: false,
    customDate: new Date().toISOString().slice(0, 10),
    receipt: null,
  };
}

function AddExpenseForm() {
  const { people, addExpense, getCachedRate, setCachedRate, CURRENCIES } = useCost();
  const { days, trip } = useItinerary();
  const receiptRef = useRef();

  const [form, setForm] = useState(() => blankForm(people));
  const [rateInfo, setRateInfo] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleSplitPerson = (id) =>
    setForm((f) => ({
      ...f,
      splitPersonIds: f.splitPersonIds.includes(id)
        ? f.splitPersonIds.filter((x) => x !== id)
        : [...f.splitPersonIds, id],
    }));

  const getDateForDay = useCallback(() => {
    if (form.useCustomDate) return form.customDate || 'latest';
    if (!trip.startDate) return 'latest';
    const idx = days.findIndex((d) => d.id === form.dayTag);
    if (idx < 0) return 'latest';
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + idx);
    return d.toISOString().slice(0, 10);
  }, [form.useCustomDate, form.customDate, form.dayTag, trip.startDate, days]);

  const handleFetchRate = async () => {
    if (form.paidCurrency === form.repayCurrency) {
      setRateInfo({ rate: 1, source: 'same currency', date: 'N/A' });
      return;
    }
    const date = getDateForDay();
    const cached = getCachedRate(form.paidCurrency, form.repayCurrency, date);
    if (cached) { setRateInfo(cached); return; }
    setRateLoading(true);
    setRateError('');
    const result = await fetchRate(form.paidCurrency, form.repayCurrency, date);
    setRateLoading(false);
    if (result) {
      setCachedRate(form.paidCurrency, form.repayCurrency, date, result);
      setRateInfo(result);
    } else {
      setRateError('Could not fetch rate. Check connection.');
    }
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set('receipt', { name: file.name, url: URL.createObjectURL(file) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.description?.trim()) {
      setFormError('Enter a description.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (!form.payerId) {
      setFormError('Select who paid.');
      return;
    }
    if (form.splitPersonIds.length === 0) {
      setFormError('Select at least one person to split the expense with.');
      return;
    }

    const amt = parseFloat(form.amount);
    const rate = rateInfo?.rate ?? null;
    const perPerson = amt / form.splitPersonIds.length;

    const splits = form.splitPersonIds.map((pid) => ({
      personId: pid,
      amount: perPerson,
      repayCurrency: form.repayCurrency,
      convertedAmount: rate ? parseFloat((perPerson * rate).toFixed(4)) : null,
      rate,
      rateSource: rateInfo?.source || null,
      rateDate: rateInfo?.date || null,
      repaid: false,
      repaidAt: null,
      repaidDate: null,
      repaidAttachment: null,
    }));

    addExpense({
      category: form.category,
      description: form.description,
      payerId: form.payerId,
      dayTag: form.dayTag,
      paymentMethod: form.paymentMethod,
      amount: amt,
      paidCurrency: form.paidCurrency,
      repayCurrency: form.repayCurrency,
      splits,
      date: getDateForDay(),
      receipt: form.receipt,
    });

    setForm(blankForm(people));
    setRateInfo(null);
    setRateError('');
    setFormError('');
    if (receiptRef.current) receiptRef.current.value = '';
  };

  if (people.length === 0) {
    return (
      <section className="section cost-section">
        <h2 className="section-title">Add expense</h2>
        <p className="cost-hint">Add at least one traveller above first.</p>
      </section>
    );
  }

  const paidSym = CURRENCIES.find((c) => c.code === form.paidCurrency)?.symbol || '';
  const repaySym = CURRENCIES.find((c) => c.code === form.repayCurrency)?.symbol || '';

  return (
    <section className="section cost-section">
      <h2 className="section-title">Add expense</h2>
      <form onSubmit={handleSubmit} className="expense-form">

        {/* Category */}
        <div className="ef-row">
          <div className="ef-field ef-wide">
            <span className="ef-label">Category</span>
            <button
              type="button"
              className="ef-category-trigger"
              onClick={() => setCategoryModalOpen(true)}
            >
              <span className="ef-category-icon">
                {EXPENSE_CATEGORIES.find((c) => c.id === form.category)?.icon || '📄'}
              </span>
              <span className="ef-category-label">
                {EXPENSE_CATEGORIES.find((c) => c.id === form.category)?.label || 'Other'}
              </span>
            </button>
            <ExpenseCategoryModal
              open={categoryModalOpen}
              selectedId={form.category}
              onSelect={(id) => set('category', id)}
              onClose={() => setCategoryModalOpen(false)}
            />
          </div>
        </div>

        {/* Description */}
        <div className="ef-row">
          <label className="ef-field ef-wide">
            <span>Description</span>
            <input
              type="text"
              placeholder="e.g. Ramen dinner, Shinkansen ticket"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              required
            />
          </label>
        </div>

        {/* Payer · Day · Method */}
        <div className="ef-row">
          <label className="ef-field">
            <span>Who paid?</span>
            <select value={form.payerId} onChange={(e) => set('payerId', e.target.value)} required>
              <option value="">Select person</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="ef-field">
            <span>Day</span>
            <select value={form.dayTag} onChange={(e) => { set('dayTag', e.target.value); setRateInfo(null); }}>
              {days.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label className="ef-field">
            <span>Paid by</span>
            <div className="toggle-group">
              <button type="button" className={form.paymentMethod === 'card' ? 'toggle-active' : ''} onClick={() => set('paymentMethod', 'card')}>💳 Card</button>
              <button type="button" className={form.paymentMethod === 'cash' ? 'toggle-active' : ''} onClick={() => set('paymentMethod', 'cash')}>💵 Cash</button>
            </div>
          </label>
        </div>

        {/* Custom date override */}
        <div className="ef-row ef-row-align">
          <label className="ef-date-toggle">
            <input type="checkbox" checked={form.useCustomDate} onChange={(e) => set('useCustomDate', e.target.checked)} />
            <span>Custom date (if you forgot to log on the day)</span>
          </label>
          {form.useCustomDate && (
            <input
              type="date"
              value={form.customDate}
              onChange={(e) => { set('customDate', e.target.value); setRateInfo(null); }}
              className="ef-custom-date animate-in"
            />
          )}
        </div>

        {/* Amount · Paid currency */}
        <div className="ef-row">
          <label className="ef-field">
            <span>Amount ({paidSym})</span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              required
            />
          </label>
          <label className="ef-field">
            <span>Paid in currency</span>
            <select value={form.paidCurrency} onChange={(e) => { set('paidCurrency', e.target.value); setRateInfo(null); }}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
          </label>
        </div>

        {/* Split among */}
        <div className="ef-row ef-row-col">
          <span className="ef-label">Split among</span>
          <div className="split-people">
            {people.map((p) => (
              <label key={p.id} className={`split-chip ${form.splitPersonIds.includes(p.id) ? 'split-chip-active' : ''}`}>
                <input type="checkbox" checked={form.splitPersonIds.includes(p.id)} onChange={() => toggleSplitPerson(p.id)} />
                <span className="split-avatar">{p.name.charAt(0).toUpperCase()}</span>
                {p.name}
              </label>
            ))}
          </div>
          {form.splitPersonIds.length > 0 && form.amount && (
            <p className="split-preview">
              {paidSym}{(parseFloat(form.amount || 0) / form.splitPersonIds.length).toFixed(2)} / person
            </p>
          )}
        </div>

        {/* Repayment currency + rate */}
        <div className="ef-row ef-row-align">
          <label className="ef-field">
            <span>Debtors repay in</span>
            <select value={form.repayCurrency} onChange={(e) => { set('repayCurrency', e.target.value); setRateInfo(null); }}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
          </label>
          <div className="ef-field ef-rate-field">
            <span>Exchange rate on day</span>
            <div className="rate-row">
              <button type="button" onClick={handleFetchRate} disabled={rateLoading} className="rate-fetch-btn">
                {rateLoading ? 'Fetching…' : '🔄 Get rate'}
              </button>
              {rateInfo && (
                <span className="rate-badge">
                  1 {form.paidCurrency} = {rateInfo.rate.toFixed(4)} {form.repayCurrency}
                  <span className="rate-source"> via {rateInfo.source} · {rateInfo.date}</span>
                </span>
              )}
              {rateError && <span className="rate-error">{rateError}</span>}
            </div>
          </div>
        </div>

        {/* Conversion preview */}
        {rateInfo && form.amount && form.splitPersonIds.length > 0 && (
          <div className="conversion-preview animate-in">
            <span>Each debtor owes approx.</span>
            <strong>{repaySym}{(parseFloat(form.amount) / form.splitPersonIds.length * rateInfo.rate).toFixed(2)}</strong>
            <span>({form.repayCurrency})</span>
          </div>
        )}

        {/* Receipt upload */}
        <div className="ef-row ef-row-col">
          <span className="ef-label">Receipt / bill photo (optional)</span>
          <label className="receipt-upload-btn">
            <input
              ref={receiptRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptChange}
              style={{ display: 'none' }}
            />
            {form.receipt ? (
              <span className="receipt-attached">📎 {form.receipt.name} <button type="button" onClick={() => set('receipt', null)}>×</button></span>
            ) : (
              <span>📎 Upload receipt</span>
            )}
          </label>
        </div>

        {formError && <p className="ef-form-error">{formError}</p>}
        <div className="ef-actions">
          <button type="submit" className="primary">Add expense</button>
        </div>
      </form>
    </section>
  );
}

// ─── Split Repay Row ──────────────────────────────────────────
function SplitRepayRow({ exp, splitIndex }) {
  const { markSplitRepaid, unmarkSplitRepaid, people, CURRENCIES } = useCost();
  const split = exp.splits[splitIndex];
  const person = people.find((p) => p.id === split.personId);
  const isPayer = split.personId === exp.payerId;

  const [showForm, setShowForm] = useState(false);
  const [repayDate, setRepayDate] = useState(new Date().toISOString().slice(0, 10));
  const [attachment, setAttachment] = useState(null);
  const fileRef = useRef();

  const repaySym = CURRENCIES.find((c) => c.code === split.repayCurrency)?.symbol || '';
  const paidSym = CURRENCIES.find((c) => c.code === exp.paidCurrency)?.symbol || '';

  const amountLabel =
    split.convertedAmount != null
      ? `${repaySym}${split.convertedAmount.toFixed(2)} ${split.repayCurrency}`
      : `${paidSym}${split.amount.toFixed(2)} ${exp.paidCurrency}`;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachment({ name: file.name, url: URL.createObjectURL(file) });
  };

  const handleConfirm = () => {
    markSplitRepaid(exp.id, splitIndex, repayDate, attachment);
    setShowForm(false);
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (isPayer) {
    return (
      <div className="split-row split-row-payer">
        <span className="split-person-avatar">{person?.name.charAt(0).toUpperCase() || '?'}</span>
        <span className="split-person-name">{person?.name || '?'}</span>
        <span className="payer-chip">Payer</span>
        <span className="split-amount-label payer-amount">{paidSym}{split.amount.toFixed(2)} {exp.paidCurrency}</span>
      </div>
    );
  }

  if (split.repaid) {
    return (
      <div className="split-row split-row-repaid animate-in">
        <span className="split-person-avatar">{person?.name.charAt(0).toUpperCase() || '?'}</span>
        <span className="split-person-name">{person?.name || '?'}</span>
        <span className="split-amount-label">{amountLabel}</span>
        <span className="repaid-chip">✅ Repaid</span>
        <span className="repaid-date">on {split.repaidDate}</span>
        {split.repaidAttachment && (
          <a href={split.repaidAttachment.url} target="_blank" rel="noreferrer" className="attach-link">
            📎 {split.repaidAttachment.name}
          </a>
        )}
        <button type="button" className="undo-repaid-btn" onClick={() => unmarkSplitRepaid(exp.id, splitIndex)}>
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className={`split-row ${showForm ? 'split-row-open' : ''}`}>
      <span className="split-person-avatar">{person?.name.charAt(0).toUpperCase() || '?'}</span>
      <span className="split-person-name">{person?.name || '?'}</span>
      <span className="split-amount-label">{amountLabel}</span>
      {!showForm ? (
        <button type="button" className="mark-repaid-btn" onClick={() => setShowForm(true)}>
          Mark repaid
        </button>
      ) : (
        <div className="repay-inline-form animate-in">
          <label className="repay-inline-label">
            <span>Repaid on</span>
            <input type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} />
          </label>
          <label className="attach-btn">
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{ display: 'none' }} />
            <span>{attachment ? `📎 ${attachment.name}` : '📎 Proof'}</span>
          </label>
          <button type="button" className="primary" onClick={handleConfirm}>Confirm</button>
          <button type="button" onClick={() => { setShowForm(false); setAttachment(null); }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── Single Expense Card ──────────────────────────────────────
function ExpenseCard({ exp }) {
  const { removeExpense, people, CURRENCIES } = useCost();
  const [expanded, setExpanded] = useState(true);

  const payer = people.find((p) => p.id === exp.payerId);
  const paidSym = CURRENCIES.find((c) => c.code === exp.paidCurrency)?.symbol || '';
  const rateInfo = exp.splits?.[0];

  const allRepaid = exp.splits?.length > 0 &&
    exp.splits.filter((s) => s.personId !== exp.payerId).every((s) => s.repaid);

  return (
    <div className={`expense-card-v2 ${allRepaid ? 'expense-card-settled' : ''}`}>
      <div className="expense-card-header" onClick={() => setExpanded((v) => !v)}>
        <div className="expense-card-left">
          <span className="expense-collapse-icon">{expanded ? '▾' : '▸'}</span>
          <span className="expense-desc-v2">{exp.description}</span>
          {exp.category && (
            <span className="tag tag-category" title={EXPENSE_CATEGORIES.find((c) => c.id === exp.category)?.label}>
              {EXPENSE_CATEGORIES.find((c) => c.id === exp.category)?.icon || '📄'}
            </span>
          )}
          <span className={`tag tag-method`}>{exp.paymentMethod === 'card' ? '💳' : '💵'}</span>
          {allRepaid && <span className="settled-badge">✅ Settled</span>}
        </div>
        <div className="expense-amount-v2">
          <span className="amount-big">{paidSym}{exp.amount.toLocaleString()}</span>
          <span className="amount-cur">{exp.paidCurrency}</span>
        </div>
      </div>

      {expanded && (
        <div className="expense-card-body animate-in">
          <div className="expense-meta-row">
            <span>Paid by <strong>{payer?.name || '?'}</strong></span>
            <span>· {exp.date}</span>
            {rateInfo?.rate && (
              <span className="rate-source-small">· Rate 1 {exp.paidCurrency} = {rateInfo.rate.toFixed(4)} {exp.repayCurrency} ({rateInfo.rateSource})</span>
            )}
            {exp.receipt && (
              <a href={exp.receipt.url} target="_blank" rel="noreferrer" className="receipt-link">
                🧾 {exp.receipt.name}
              </a>
            )}
          </div>

          <div className="split-rows">
            {exp.splits?.map((_, i) => (
              <SplitRepayRow key={i} exp={exp} splitIndex={i} />
            ))}
          </div>

          <button type="button" className="expense-remove-v2" onClick={() => removeExpense(exp.id)}>
            Remove expense
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Day Expense View ─────────────────────────────────────────
function DayExpenseView() {
  const { expenses, CURRENCIES } = useCost();
  const { days } = useItinerary();
  const [collapsedDays, setCollapsedDays] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');

  if (expenses.length === 0) return null;

  const toggleDay = (dayId) =>
    setCollapsedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));

  return (
    <section className="section cost-section">
      <div className="day-exp-header-row">
        <h2 className="section-title">Expenses by day</h2>
        <label className="cost-category-filter">
          <span className="cost-category-filter-label">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="cost-category-filter-select"
          >
            <option value="all">All</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="day-expense-list">
        {days.map((day) => {
          const dayExps = expenses.filter(
            (e) => e.dayTag === day.id && (categoryFilter === 'all' || (e.category || 'other') === categoryFilter)
          );
          if (dayExps.length === 0) return null;

          const collapsed = !!collapsedDays[day.id];
          const total = dayExps.reduce((s, e) => s + e.amount, 0);
          const primaryCur = dayExps[0]?.paidCurrency || '';
          const primarySym = CURRENCIES.find((c) => c.code === primaryCur)?.symbol || '';
          const allDaySettled = dayExps.every((e) =>
            e.splits?.filter((s) => s.personId !== e.payerId).every((s) => s.repaid)
          );

          return (
            <div key={day.id} className={`day-exp-card ${allDaySettled ? 'day-exp-card-settled' : ''}`}>
              <div className="day-exp-header" onClick={() => toggleDay(day.id)}>
                <div className="day-exp-header-left">
                  <span className="day-collapse-icon">{collapsed ? '▸' : '▾'}</span>
                  <span className="day-exp-label">{day.label}</span>
                  <span className="day-exp-count">{dayExps.length} expense{dayExps.length !== 1 ? 's' : ''}</span>
                  {allDaySettled && <span className="day-settled-badge">✅ All settled</span>}
                </div>
                <span className="day-exp-total">
                  {primarySym}{total.toLocaleString()} <span className="day-exp-cur">{primaryCur}</span>
                </span>
              </div>

              {!collapsed && (
                <div className="day-exp-body animate-in">
                  {dayExps.map((exp) => (
                    <ExpenseCard key={exp.id} exp={exp} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Settlement Summary ───────────────────────────────────────
function SettlementSummary() {
  const { people, expenses, getSettlements, getRepaidSummary, CURRENCIES } = useCost();

  if (expenses.length === 0 || people.length === 0) return null;

  const outstanding = getSettlements();
  const repaid = getRepaidSummary();
  const getName = (id) => people.find((p) => p.id === id)?.name || '?';
  const getSymbol = (code) => CURRENCIES.find((c) => c.code === code)?.symbol || '';

  const totals = {};
  people.forEach((p) => { totals[p.id] = 0; });
  expenses.forEach((e) => { if (totals[e.payerId] !== undefined) totals[e.payerId] += e.amount; });

  const paidCur = expenses[0]?.paidCurrency || '';
  const paidSym = getSymbol(paidCur);

  return (
    <section className="section cost-section">
      <h2 className="section-title">Settlement summary</h2>

      {/* Who paid how much */}
      <div className="settlement-totals">
        {people.map((p) => (
          <div key={p.id} className="settlement-person">
            <span className="person-avatar-sm">{p.name.charAt(0).toUpperCase()}</span>
            <span className="settlement-name">{p.name}</span>
            <span className="settlement-paid">{paidSym}{(totals[p.id] || 0).toLocaleString()} {paidCur}</span>
          </div>
        ))}
      </div>

      {/* Outstanding */}
      {outstanding.length === 0 ? (
        <p className="cost-hint settlement-ok">✅ All settled up!</p>
      ) : (
        <div className="settlement-block">
          <h3 className="settlement-subtitle">⏳ Outstanding</h3>
          <div className="settlement-list">
            {outstanding.map((s, i) => (
              <div key={i} className="settlement-row animate-in">
                <span className="settle-debtor">{getName(s.debtorId)}</span>
                <span className="settle-arrow">owes</span>
                <span className="settle-creditor">{getName(s.creditorId)}</span>
                <span className="settle-amount">
                  {getSymbol(s.currency)}{s.amount.toFixed(2)}
                  <span className="settle-currency"> {s.currency}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed repayments */}
      {repaid.length > 0 && (
        <div className="settlement-block repaid-block">
          <h3 className="settlement-subtitle">✅ Repaid</h3>
          <div className="settlement-list">
            {repaid.map((r, i) => (
              <div key={i} className="settlement-row settlement-row-done animate-in">
                <span className="settle-debtor">{getName(r.debtorId)}</span>
                <span className="settle-arrow">repaid</span>
                <span className="settle-creditor">{getName(r.creditorId)}</span>
                <span className="settle-amount done">
                  {getSymbol(r.currency)}{r.amount.toFixed(2)}
                  <span className="settle-currency"> {r.currency}</span>
                </span>
                <span className="repaid-date-summary">on {r.repaidDate}</span>
                {r.repaidAttachment && (
                  <a href={r.repaidAttachment.url} target="_blank" rel="noreferrer" className="attach-link-sm">
                    📎 {r.repaidAttachment.name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Cost() {
  return (
    <div className="page cost-page">
      <header className="page-header">
        <h1>Cost splitter</h1>
        <p className="page-intro-inline">Track who paid what, split by day, and settle up.</p>
      </header>
      <PeopleManager />
      <TravellerPaymentDetails />
      <AddExpenseForm />
      <DayExpenseView />
      <SettlementSummary />
    </div>
  );
}

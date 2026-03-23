import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCost, fetchRate } from '../context/CostContext';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ExpenseCategoryModal, { EXPENSE_CATEGORIES } from '../components/ExpenseCategoryModal';
import './Cost.css';

// ─── Helpers ──────────────────────────────────────────────────
function useSymbol(code) {
  const { CURRENCIES } = useCost();
  return CURRENCIES.find((c) => c.code === code)?.symbol || '';
}

// ─── People Manager ───────────────────────────────────────────
function PeopleManager() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { people, addPerson, updatePerson, removePerson, removeExpensesForPersonId } = useCost();
  const { tripmates, tripCreator, planMembers, shareSettings, isActivePlanOwner } = useItinerary();
  const [nameInput, setNameInput] = useState('');

  // Prevent "auto-add newly joined tripmates" effect from immediately restoring travellers you manually removed.
  const removedNamesRef = useRef(new Set());
  const normName = (s) => String(s || '').trim().toLowerCase();

  const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
  const currentEmail = String(user?.email || '').trim().toLowerCase();
  const creatorId = String(tripCreator?.id || tripCreator?.userId || '').trim();
  const currentId = String(user?.id || '').trim();
  const isLegacyCreator =
    (!!creatorId && !!currentId && creatorId === currentId) ||
    (!!creatorEmail && !!currentEmail && creatorEmail === currentEmail);
  const isCreator = shareSettings?.tripId ? isLegacyCreator : !!isActivePlanOwner;

  const openMemberProfile = (name) => {
    const n = (name || '').trim();
    if (!n) return;
    navigate(`/group?member=${encodeURIComponent(n)}`);
  };

  // Auto-add newly joined tripmates into Cost → Travellers (creator only).
  useEffect(() => {
    // Ensure invited guests also see travellers from the shared trip.
    // We only block removal/editing UI for non-creators, not the initial
    // local "people" hydration from itinerary members.
    const norm = (s) => String(s || '').trim().toLowerCase();
    const existing = new Set(people.map((p) => norm(p.name)));
    const candidates = [];

    const memberSource = Array.isArray(planMembers) && planMembers.length > 0
      ? planMembers.map((member) => ({ name: member?.name || '' }))
      : [
          tripCreator?.name ? { name: tripCreator.name } : null,
          ...(tripmates || []),
        ].filter(Boolean);
    memberSource.forEach((tm) => {
      const n = (tm?.name || '').trim();
      if (n) candidates.push(n);
    });

    const toAdd = [];
    for (const n of candidates) {
      const k = norm(n);
      if (!k || existing.has(k)) continue;
      // Only creators can manually remove; prevent re-adding those names for them.
      if (isCreator && removedNamesRef.current.has(k)) continue;
      existing.add(k);
      toAdd.push(n);
    }

    toAdd.forEach((n) => addPerson(n));
  }, [isCreator, people, planMembers, tripmates, tripCreator?.name, addPerson]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!isCreator) return;
    const name = nameInput.trim();
    if (!name) return;
    addTraveller(name);
    setNameInput('');
  };

  const existingNames = new Set(people.map((p) => p.name.trim().toLowerCase()));
  const candidateTripmates = (Array.isArray(planMembers) && planMembers.length > 0
    ? planMembers.map((member) => ({ name: member?.name || '' }))
    : tripmates
  ).filter((t) => t?.name && !existingNames.has(t.name.trim().toLowerCase()));
  const tripmatesToAdd = candidateTripmates;
  const creatorName = tripCreator?.name?.trim();
  const creatorNotInPeople = creatorName && !existingNames.has(creatorName.toLowerCase());
  const canAddAll = people.length === 0 && (tripmatesToAdd.length > 0 || creatorNotInPeople);

  const addTraveller = (name) => {
    const k = normName(name);
    if (k) removedNamesRef.current.delete(k);
    addPerson(name);
  };

  const addTripmatesAsTravellers = () => {
    if (!isCreator) return;
    tripmatesToAdd.forEach((t) => addTraveller(t.name));
  };

  const addCreatorAsTraveller = () => {
    if (!isCreator) return;
    if (creatorName) addTraveller(creatorName);
  };

  const addTripMatesAndCreatorAsTravellers = () => {
    if (!isCreator) return;
    if (creatorNotInPeople && creatorName) addTraveller(creatorName);
    tripmatesToAdd.forEach((t) => addTraveller(t.name));
  };

  return (
    <section className="section cost-section">
      <h2 className="section-title">
        {t('cost.travellers')} <span className="count-badge">{people.length}</span>
      </h2>
      {!isCreator && (
        <p className="cost-hint">{t('cost.creatorOnlyTravellers')}</p>
      )}
      {canAddAll && (
        <div className="cost-tripmates-row cost-prefill-banner">
          <p className="cost-hint">
            {t('cost.addTripmatesHint')}
          </p>
          <button type="button" className="primary" onClick={addTripMatesAndCreatorAsTravellers} disabled={!isCreator}>
            {t('cost.addTripmatesAndCreator')}
          </button>
        </div>
      )}
      {!canAddAll && tripmatesToAdd.length > 0 && (
        <div className="cost-tripmates-row">
          <p className="cost-hint">
            {t('cost.tripmatesFromTrip')} {tripmatesToAdd.map((m) => m.name).join(', ')}.
          </p>
          <button type="button" className="primary" onClick={addTripmatesAsTravellers} disabled={!isCreator}>
            {t('cost.addTripmatesAsTravellers')}
          </button>
        </div>
      )}
      {!canAddAll && creatorNotInPeople && (
        <div className="cost-tripmates-row">
          <p className="cost-hint">{t('cost.creatorNotInTravellers')}</p>
          <button type="button" className="primary" onClick={addCreatorAsTraveller} disabled={!isCreator}>
            {t('cost.addCreatorAsTraveller', { name: creatorName })}
          </button>
        </div>
      )}
      <div className="people-list">
        {people.map((p) => (
          <div key={p.id} className="person-chip animate-in">
            <span className="person-avatar">{p.name.charAt(0).toUpperCase()}</span>
            {isCreator ? (
              <input
                type="text"
                value={p.name}
                onChange={(e) => updatePerson(p.id, e.target.value)}
                className="person-name-input"
              />
            ) : (
              <button type="button" className="person-name-btn" onClick={() => openMemberProfile(p.name)}>
                {p.name}
              </button>
            )}
            {isCreator && (
              <button
                type="button"
                className="person-remove"
                onClick={() => {
                  const k = normName(p.name);
                  if (k) removedNamesRef.current.add(k);

                  // Clear related local expenses on this device.
                  removeExpensesForPersonId(p.id);
                  removePerson(p.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {isCreator && (
        <form onSubmit={handleAdd} className="add-person-form">
        <input
          type="text"
          placeholder={t('cost.addTravellerPlaceholder')}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={30}
        />
        <button type="submit" className="primary">{t('cost.add')}</button>
        </form>
      )}
    </section>
  );
}

// ─── Traveller Payment Details (QR + bank for others to pay) ───
function TravellerPaymentDetails() {
  const { t } = useLanguage();
  const { people, updatePersonPayment, canEditCost } = useCost();

  if (people.length === 0) return null;

  const defaultPayment = () => ({
    qrCode: null,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    notes: '',
    saved: false,
    savedAt: null,
  });

  const unsavedPeople = people.filter((p) => !(p.paymentInfo || defaultPayment()).saved);
  if (unsavedPeople.length === 0) return null;

  return (
    <section className="section cost-section">
      <h2 className="section-title">{t('cost.travellerPaymentDetails')}</h2>
      <p className="cost-hint payment-details-hint">
        {t('cost.paymentHint')}
      </p>
      {!canEditCost && <p className="cost-hint">{t('cost.readOnlyHint')}</p>}
      <div className="traveller-payment-grid">
        {unsavedPeople.map((p) => {
          const pay = p.paymentInfo || defaultPayment();
          const canSave = !!(pay.qrCode || pay.bankName || pay.accountHolder || pay.accountNumber || pay.notes);
          return (
            <div key={p.id} className="traveller-payment-card animate-in">
              <div className="traveller-payment-header">
                <span className="person-avatar">{p.name.charAt(0).toUpperCase()}</span>
                <span className="traveller-payment-name">{p.name}</span>
                <button
                  type="button"
                  className="traveller-payment-save"
                  disabled={!canEditCost || !canSave}
                  onClick={() => updatePersonPayment(p.id, { ...(p.paymentInfo || defaultPayment()), saved: true, savedAt: new Date().toISOString() })}
                >
                  {t('cost.savePayment')}
                </button>
              </div>
              <div className="traveller-payment-body">
                <label className="payment-field">
                  <span>{t('cost.qrCode')}</span>
                  <div className="qr-upload-area">
                    {pay.qrCode ? (
                      <div className="qr-preview">
                        <img src={pay.qrCode} alt="QR code" />
                        <button
                          type="button"
                          className="qr-remove"
                          disabled={!canEditCost}
                          onClick={() => updatePersonPayment(p.id, { qrCode: null, saved: false, savedAt: null })}
                        >
                          {t('cost.remove')}
                        </button>
                      </div>
                    ) : (
                      <label className="qr-upload-btn">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canEditCost}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = URL.createObjectURL(file);
                            updatePersonPayment(p.id, { qrCode: url, saved: false, savedAt: null });
                          }}
                          style={{ display: 'none' }}
                        />
                        📷 {t('cost.uploadQR')}
                      </label>
                    )}
                  </div>
                </label>
                <label className="payment-field">
                  <span>{t('cost.bankName')}</span>
                  <input
                    type="text"
                    placeholder="e.g. Maybank, CIMB"
                    value={pay.bankName}
                    disabled={!canEditCost}
                    onChange={(e) => updatePersonPayment(p.id, { bankName: e.target.value, saved: false, savedAt: null })}
                  />
                </label>
                <label className="payment-field">
                  <span>{t('cost.accountHolder')}</span>
                  <input
                    type="text"
                    placeholder={t('cost.nameOnAccount')}
                    value={pay.accountHolder}
                    disabled={!canEditCost}
                    onChange={(e) => updatePersonPayment(p.id, { accountHolder: e.target.value, saved: false, savedAt: null })}
                  />
                </label>
                <label className="payment-field">
                  <span>{t('cost.accountNumber')}</span>
                  <input
                    type="text"
                    placeholder={t('cost.accountOrCard')}
                    value={pay.accountNumber}
                    disabled={!canEditCost}
                    onChange={(e) => updatePersonPayment(p.id, { accountNumber: e.target.value, saved: false, savedAt: null })}
                  />
                </label>
                <label className="payment-field">
                  <span>{t('cost.notes')}</span>
                  <input
                    type="text"
                    placeholder={t('cost.optional')}
                    value={pay.notes}
                    disabled={!canEditCost}
                    onChange={(e) => updatePersonPayment(p.id, { notes: e.target.value, saved: false, savedAt: null })}
                  />
                </label>
              </div>
              {(pay.qrCode || pay.bankName || pay.accountNumber) && (
                <div className="payment-preview-note">
                  ✓ {t('cost.othersCanPay', { name: p.name })}
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
    rateMode: 'auto', // 'auto' | 'manual'
    manualRate: '',
    splitMode: 'equal', // 'equal' | 'itemized'
    itemizedInputMode: 'pretax', // 'pretax' | 'total'
    itemized: {}, // { [personId]: string } base amount (pre-tax)
    serviceTaxPct: '5',
    salesTaxPct: '8',
    tipsPct: '0',
    receipt: null,
  };
}

/** Rebuild add-form state from a saved expense (for Edit). */
function expenseToForm(exp, people, days) {
  const itemized = {};
  if (exp.splitMode === 'itemized' && Array.isArray(exp.splits)) {
    for (const s of exp.splits) {
      if (!s) continue;
      if (exp.itemizedInputMode === 'total') {
        itemized[s.personId] = s.amount != null && Number.isFinite(s.amount) ? String(s.amount) : '';
      } else {
        itemized[s.personId] = s.baseAmount != null && Number.isFinite(s.baseAmount) ? String(s.baseAmount) : '';
      }
    }
  }
  const first = exp.splits?.[0];
  const manualR = first?.rateSource === 'manual';
  const day0 = days[0]?.id || 'day-1';
  return {
    category: exp.category || 'other',
    description: exp.description || '',
    payerId: exp.payerId || people[0]?.id || '',
    dayTag: exp.dayTag || day0,
    paymentMethod: exp.paymentMethod === 'cash' ? 'cash' : 'card',
    amount: exp.amount != null ? String(exp.amount) : '',
    paidCurrency: exp.paidCurrency || 'JPY',
    splitPersonIds:
      Array.isArray(exp.splits) && exp.splits.length > 0
        ? exp.splits.map((s) => s.personId).filter(Boolean)
        : people.map((p) => p.id),
    repayCurrency: exp.repayCurrency || first?.repayCurrency || 'MYR',
    useCustomDate: !!exp.customDateUsed,
    customDate: exp.date || new Date().toISOString().slice(0, 10),
    rateMode: manualR ? 'manual' : 'auto',
    manualRate: manualR && first?.rate != null ? String(first.rate) : '',
    splitMode: exp.splitMode === 'itemized' ? 'itemized' : 'equal',
    itemizedInputMode: exp.itemizedInputMode === 'total' ? 'total' : 'pretax',
    itemized,
    serviceTaxPct: exp.serviceTaxPct != null ? String(exp.serviceTaxPct) : '5',
    salesTaxPct: exp.salesTaxPct != null ? String(exp.salesTaxPct) : '8',
    tipsPct: exp.tipsPct != null ? String(exp.tipsPct) : '0',
    receipt: exp.receipt || null,
  };
}

/** Set by AddExpenseForm — ExpenseCard calls startEdit / expandNew without prop drilling. */
const expenseFormControllerRef = { current: null };

function AddExpenseForm() {
  const { t } = useLanguage();
  const { people, expenses, addExpense, updateExpense, getCachedRate, setCachedRate, CURRENCIES, canEditCost } = useCost();
  const { days, trip } = useItinerary();
  const receiptRef = useRef();

  const [form, setForm] = useState(() => blankForm(people));
  const [formExpanded, setFormExpanded] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [rateInfo, setRateInfo] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  useLayoutEffect(() => {
    expenseFormControllerRef.current = {
      startEdit: (exp) => {
        if (!exp?.id) return;
        setForm(expenseToForm(exp, people, days));
        setEditingExpenseId(exp.id);
        setFormExpanded(true);
        setFormError('');
        setRateError('');
        const first = exp.splits?.[0];
        if (exp.paidCurrency === exp.repayCurrency) {
          setRateInfo({ rate: 1, source: 'same currency', date: 'N/A' });
        } else if (first?.rateSource === 'manual' && first?.rate != null) {
          setRateInfo(null);
        } else if (first?.rate != null) {
          setRateInfo({
            rate: first.rate,
            source: first.rateSource || 'saved',
            date: first.rateDate || exp.date || 'N/A',
          });
        } else {
          setRateInfo(null);
        }
        if (receiptRef.current) receiptRef.current.value = '';
      },
      expandNew: () => {
        setForm(blankForm(people));
        setEditingExpenseId(null);
        setFormExpanded(true);
        setRateInfo(null);
        setRateError('');
        setFormError('');
        if (receiptRef.current) receiptRef.current.value = '';
      },
      collapse: () => {
        setFormExpanded(false);
        setEditingExpenseId(null);
        setForm(blankForm(people));
        setRateInfo(null);
        setRateError('');
        setFormError('');
        if (receiptRef.current) receiptRef.current.value = '';
      },
    };
    return () => {
      expenseFormControllerRef.current = null;
    };
  }, [people, days]);

  useEffect(() => {
    if (!formExpanded) return;
    const el = document.querySelector('.cost-add-expense-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [formExpanded]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleSplitPerson = (id) =>
    setForm((f) => ({
      ...f,
      splitPersonIds: f.splitPersonIds.includes(id)
        ? f.splitPersonIds.filter((x) => x !== id)
        : [...f.splitPersonIds, id],
    }));

  const totalTaxPct = useMemo(() => {
    const s = parseFloat(form.serviceTaxPct || '0');
    const x = parseFloat(form.salesTaxPct || '0');
    const tip = parseFloat(form.tipsPct || '0');
    const pct =
      (Number.isFinite(s) ? s : 0) +
      (Number.isFinite(x) ? x : 0) +
      (Number.isFinite(tip) ? tip : 0);
    return Math.max(0, pct);
  }, [form.serviceTaxPct, form.salesTaxPct, form.tipsPct]);

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
    if (!canEditCost) return;
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
      set('rateMode', 'auto');
    } else {
      setRateError(t('cost.rateError'));
    }
  };

  const effectiveRate = useMemo(() => {
    if (form.paidCurrency === form.repayCurrency) return 1;
    if (form.rateMode === 'manual') {
      const v = parseFloat(form.manualRate || '');
      return Number.isFinite(v) && v > 0 ? v : null;
    }
    return rateInfo?.rate ?? null;
  }, [form.paidCurrency, form.repayCurrency, form.rateMode, form.manualRate, rateInfo]);

  const setItemized = (personId, val) =>
    setForm((f) => ({ ...f, itemized: { ...(f.itemized || {}), [personId]: val } }));

  const calcItemizedSplits = (amt, rate) => {
    const selected = form.splitPersonIds;
    const pct = totalTaxPct / 100;
    return selected.map((pid) => {
      const rawStr = (form.itemized || {})[pid];
      const raw = rawStr != null && rawStr !== '' ? parseFloat(rawStr) : null;
      const valid = raw != null && Number.isFinite(raw);
      const base =
        valid
          ? (form.itemizedInputMode === 'total'
              ? parseFloat((raw / (1 + pct)).toFixed(4))
              : raw)
          : null;
      const taxAmount = base != null ? parseFloat((base * pct).toFixed(4)) : null;
      const total =
        base != null
          ? parseFloat((base + (taxAmount || 0)).toFixed(4))
          : null;
      return {
        personId: pid,
        baseAmount: base != null && Number.isFinite(base) ? base : null,
        taxAmount,
        amount: total,
        repayCurrency: form.repayCurrency,
        convertedAmount: rate && total != null ? parseFloat((total * rate).toFixed(4)) : null,
        rate,
        rateSource: form.rateMode === 'manual' ? 'manual' : (rateInfo?.source || null),
        rateDate: form.rateMode === 'manual' ? getDateForDay() : (rateInfo?.date || null),
        repaid: false,
        repaidAt: null,
        repaidDate: null,
        repaidAttachment: null,
      };
    });
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set('receipt', { name: file.name, url: URL.createObjectURL(file) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEditCost) return;
    setFormError('');
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError(t('cost.enterValidAmount'));
      return;
    }
    if (!form.payerId) {
      setFormError(t('cost.selectWhoPaid'));
      return;
    }
    if (form.splitPersonIds.length === 0) {
      setFormError(t('cost.selectOnePerson'));
      return;
    }

    const amt = parseFloat(form.amount);
    const rate = effectiveRate;
    let splits = [];
    if (form.splitMode === 'itemized') {
      // Require payer to at least fill their own base amount (others can be blank).
      const payerStr = (form.itemized || {})[form.payerId];
      const payerVal = payerStr != null && payerStr !== '' ? parseFloat(payerStr) : null;
      if (!(payerVal != null && Number.isFinite(payerVal) && payerVal >= 0)) {
        setFormError(t('cost.itemizedNeedPayer'));
        return;
      }
      splits = calcItemizedSplits(amt, rate);
    } else {
      const perPerson = amt / form.splitPersonIds.length;
      splits = form.splitPersonIds.map((pid) => ({
        personId: pid,
        amount: perPerson,
        repayCurrency: form.repayCurrency,
        convertedAmount: rate ? parseFloat((perPerson * rate).toFixed(4)) : null,
        rate,
        rateSource: form.rateMode === 'manual' ? 'manual' : (rateInfo?.source || null),
        rateDate: form.rateMode === 'manual' ? getDateForDay() : (rateInfo?.date || null),
        repaid: false,
        repaidAt: null,
        repaidDate: null,
        repaidAttachment: null,
      }));
    }

    if (editingExpenseId) {
      const prev = expenses.find((e) => e.id === editingExpenseId);
      if (prev && Array.isArray(prev.splits)) {
        const repaidByPerson = new Map(
          prev.splits.filter((s) => s?.repaid).map((s) => [s.personId, s])
        );
        splits = splits.map((s) => {
          const old = repaidByPerson.get(s.personId);
          if (!old) return s;
          return {
            ...s,
            repaid: true,
            repaidAt: old.repaidAt,
            repaidDate: old.repaidDate,
            repaidAttachment: old.repaidAttachment,
          };
        });
      }
    }

    const expensePayload = {
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
      customDateUsed: !!form.useCustomDate,
      splitMode: form.splitMode,
      itemizedInputMode: form.splitMode === 'itemized' ? form.itemizedInputMode : null,
      serviceTaxPct: form.splitMode === 'itemized' ? parseFloat(form.serviceTaxPct || '0') : null,
      salesTaxPct: form.splitMode === 'itemized' ? parseFloat(form.salesTaxPct || '0') : null,
      tipsPct: form.splitMode === 'itemized' ? parseFloat(form.tipsPct || '0') : null,
      taxPctTotal: form.splitMode === 'itemized' ? totalTaxPct : null,
      receipt: form.receipt,
    };

    if (editingExpenseId) {
      updateExpense(editingExpenseId, expensePayload);
    } else {
      addExpense(expensePayload);
    }

    setForm(blankForm(people));
    setEditingExpenseId(null);
    setFormExpanded(false);
    setRateInfo(null);
    setRateError('');
    setFormError('');
    if (receiptRef.current) receiptRef.current.value = '';
  };

  if (people.length === 0) {
    return (
      <section className="section cost-section">
        <h2 className="section-title">{t('cost.addExpense')}</h2>
        <p className="cost-hint">{t('cost.addTravellerFirst')}</p>
      </section>
    );
  }

  const paidSym = CURRENCIES.find((c) => c.code === form.paidCurrency)?.symbol || '';
  const repaySym = CURRENCIES.find((c) => c.code === form.repayCurrency)?.symbol || '';

  return (
    <section className="section cost-section cost-add-expense-section">
      <div className="cost-add-expense-toolbar">
        <h2 className="section-title">
          {formExpanded && editingExpenseId ? t('cost.editExpenseTitle') : t('cost.addExpense')}
        </h2>
        {formExpanded && (
          <button
            type="button"
            className="cost-add-cancel"
            onClick={() => expenseFormControllerRef.current?.collapse()}
          >
            {t('cost.cancel')}
          </button>
        )}
      </div>
      {!canEditCost && <p className="cost-hint">{t('cost.readOnlyHint')}</p>}
      {!formExpanded ? (
        <button
          type="button"
          className="primary cost-open-add-expense-btn"
          disabled={!canEditCost}
          onClick={() => expenseFormControllerRef.current?.expandNew()}
        >
          {t('cost.openAddExpense')}
        </button>
      ) : (
      <form onSubmit={handleSubmit} className="expense-form">
        <fieldset disabled={!canEditCost} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

        {/* Category */}
        <div className="ef-row">
          <div className="ef-field ef-wide">
            <span className="ef-label">{t('cost.category')}</span>
            <button
              type="button"
              className="ef-category-trigger"
              onClick={() => setCategoryModalOpen(true)}
            >
              <span className="ef-category-icon">
                {EXPENSE_CATEGORIES.find((c) => c.id === form.category)?.icon || '📄'}
              </span>
              <span className="ef-category-label">
                {EXPENSE_CATEGORIES.find((c) => c.id === form.category)?.label || t('cost.other')}
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
            <span>{t('cost.description')}</span>
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
            <span>{t('cost.whoPaid')}</span>
            <select value={form.payerId} onChange={(e) => set('payerId', e.target.value)} required>
              <option value="">{t('cost.selectPerson')}</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="ef-field">
            <span>{t('cost.day')}</span>
            <select value={form.dayTag} onChange={(e) => { set('dayTag', e.target.value); setRateInfo(null); }}>
              {days.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label className="ef-field">
            <span>{t('cost.paidBy')}</span>
            <div className="toggle-group">
              <button type="button" className={form.paymentMethod === 'card' ? 'toggle-active' : ''} onClick={() => set('paymentMethod', 'card')}>💳 {t('cost.card')}</button>
              <button type="button" className={form.paymentMethod === 'cash' ? 'toggle-active' : ''} onClick={() => set('paymentMethod', 'cash')}>💵 {t('cost.cash')}</button>
            </div>
          </label>
        </div>

        {/* Custom date override */}
        <div className="ef-row ef-row-align">
          <label className="ef-date-toggle">
            <input type="checkbox" checked={form.useCustomDate} onChange={(e) => set('useCustomDate', e.target.checked)} />
            <span>{t('cost.customDate')}</span>
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
            <span>{t('cost.amount')} ({paidSym})</span>
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
            <span>{t('cost.paidInCurrency')}</span>
            <select value={form.paidCurrency} onChange={(e) => { set('paidCurrency', e.target.value); setRateInfo(null); }}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
          </label>
        </div>

        {/* Split among */}
        <div className="ef-row ef-row-col">
          <div className="ef-split-head">
            <span className="ef-label">{t('cost.splitAmong')}</span>
            <div className="ef-split-mode">
              <button
                type="button"
                className={form.splitMode === 'equal' ? 'toggle-active' : ''}
                onClick={() => set('splitMode', 'equal')}
              >
                {t('cost.splitEqual')}
              </button>
              <button
                type="button"
                className={form.splitMode === 'itemized' ? 'toggle-active' : ''}
                onClick={() => set('splitMode', 'itemized')}
              >
                {t('cost.splitItemized')}
              </button>
            </div>
          </div>
          <div className="split-people">
            {people.map((p) => (
              <label key={p.id} className={`split-chip ${form.splitPersonIds.includes(p.id) ? 'split-chip-active' : ''}`}>
                <input type="checkbox" checked={form.splitPersonIds.includes(p.id)} onChange={() => toggleSplitPerson(p.id)} />
                <span className="split-avatar">{p.name.charAt(0).toUpperCase()}</span>
                {p.name}
              </label>
            ))}
          </div>
          {form.splitMode === 'equal' && form.splitPersonIds.length > 0 && form.amount && (
            <p className="split-preview">
              {paidSym}{(parseFloat(form.amount || 0) / form.splitPersonIds.length).toFixed(2)} {t('cost.perPerson')}
            </p>
          )}
          {form.splitMode === 'itemized' && form.splitPersonIds.length > 0 && (
            <div className="itemized-box animate-in">
              <div className="itemized-mode-row">
                <span className="itemized-mode-label">{t('cost.itemizedMode')}</span>
                <div className="itemized-mode-toggle">
                  <button
                    type="button"
                    className={form.itemizedInputMode === 'pretax' ? 'toggle-active' : ''}
                    onClick={() => set('itemizedInputMode', 'pretax')}
                  >
                    {t('cost.modePreTax')}
                  </button>
                  <button
                    type="button"
                    className={form.itemizedInputMode === 'total' ? 'toggle-active' : ''}
                    onClick={() => set('itemizedInputMode', 'total')}
                  >
                    {t('cost.modeAfterTax')}
                  </button>
                </div>
              </div>
              <div className="itemized-tax-row">
                <label>
                  <span>{t('cost.serviceTax')}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.serviceTaxPct}
                    onChange={(e) => set('serviceTaxPct', e.target.value)}
                  />
                </label>
                <label>
                  <span>{t('cost.salesTax')}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.salesTaxPct}
                    onChange={(e) => set('salesTaxPct', e.target.value)}
                  />
                </label>
                <label>
                  <span>{t('cost.tips')}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.tipsPct}
                    onChange={(e) => set('tipsPct', e.target.value)}
                  />
                </label>
                <span className="itemized-tax-total">
                  {t('cost.taxTotal', { pct: totalTaxPct.toFixed(0) })}
                </span>
              </div>
              <div className="itemized-remaining">
                {(() => {
                  const pct = totalTaxPct / 100;
                  const totalAmt = parseFloat(form.amount || 0);
                  const baseTotal = pct > 0 ? parseFloat((totalAmt / (1 + pct)).toFixed(2)) : parseFloat(totalAmt.toFixed(2));
                  const targetTotal = parseFloat(totalAmt.toFixed(2));
                  const sumRaw = form.splitPersonIds.reduce((s, pid) => {
                    const v = (form.itemized || {})[pid];
                    const n = v != null && v !== '' ? parseFloat(v) : null;
                    return s + (n != null && Number.isFinite(n) ? n : 0);
                  }, 0);
                  const remaining =
                    form.itemizedInputMode === 'total'
                      ? parseFloat((targetTotal - sumRaw).toFixed(2))
                      : parseFloat((baseTotal - sumRaw).toFixed(2));
                  if (!form.amount) return null;
                  return (
                    <span>
                      {form.itemizedInputMode === 'total' ? t('cost.remainingTotalToFill') : t('cost.remainingBaseToFill')}{' '}
                      <strong>{paidSym}{Math.max(0, remaining).toFixed(2)}</strong>
                    </span>
                  );
                })()}
              </div>
              <div className="itemized-grid">
                {form.splitPersonIds.map((pid) => {
                  const p = people.find((x) => x.id === pid);
                  const rawStr = (form.itemized || {})[pid] ?? '';
                  const raw = rawStr !== '' ? parseFloat(rawStr) : null;
                  const pct = totalTaxPct / 100;
                  const computedTotal =
                    raw != null && Number.isFinite(raw)
                      ? (form.itemizedInputMode === 'total'
                          ? raw.toFixed(2)
                          : (raw * (1 + pct)).toFixed(2))
                      : '';
                  const computedBase =
                    raw != null && Number.isFinite(raw)
                      ? (form.itemizedInputMode === 'total'
                          ? (raw / (1 + pct)).toFixed(2)
                          : raw.toFixed(2))
                      : '';
                  return (
                    <label key={pid} className="itemized-row">
                      <span className="itemized-name">{p?.name || '?'}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={form.itemizedInputMode === 'total' ? t('cost.totalAmountPh') : t('cost.baseAmountPh')}
                        value={rawStr}
                        onChange={(e) => setItemized(pid, e.target.value)}
                      />
                      <span className="itemized-total">
                        {computedTotal !== '' ? `${paidSym}${computedTotal}` : '—'}
                      </span>
                      <span className="itemized-sub">
                        {computedBase !== '' ? `${t('cost.baseShort')} ${paidSym}${computedBase}` : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="cost-hint itemized-hint">{t('cost.itemizedHint')}</p>
            </div>
          )}
        </div>

        {/* Repayment currency + rate */}
        <div className="ef-row ef-row-align">
          <label className="ef-field">
            <span>{t('cost.debtorsRepayIn')}</span>
            <select value={form.repayCurrency} onChange={(e) => { set('repayCurrency', e.target.value); setRateInfo(null); }}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
          </label>
          <div className="ef-field ef-rate-field">
            <span>{t('cost.exchangeRateOnDay')}</span>
            <div className="rate-row">
              <button type="button" onClick={handleFetchRate} disabled={rateLoading} className="rate-fetch-btn">
                {rateLoading ? t('cost.fetching') : `🔄 ${t('cost.getRate')}`}
              </button>
              <label className="rate-manual">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={t('cost.manualRatePh')}
                  value={form.manualRate}
                  onChange={(e) => { set('manualRate', e.target.value); set('rateMode', 'manual'); }}
                />
              </label>
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
        {effectiveRate && form.amount && form.splitPersonIds.length > 0 && form.splitMode === 'equal' && (
          <div className="conversion-preview animate-in">
            <span>{t('cost.eachDebtorOwes')}</span>
            <strong>{repaySym}{(parseFloat(form.amount) / form.splitPersonIds.length * effectiveRate).toFixed(2)}</strong>
            <span>({form.repayCurrency})</span>
          </div>
        )}

        {/* Receipt upload */}
        <div className="ef-row ef-row-col">
          <span className="ef-label">{t('cost.receiptOptional')}</span>
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
              <span>📎 {t('cost.uploadReceipt')}</span>
            )}
          </label>
        </div>

        {formError && <p className="ef-form-error">{formError}</p>}
        <div className="ef-actions">
          <button type="submit" className="primary">
            {editingExpenseId ? t('cost.saveExpenseChanges') : t('cost.addExpenseBtn')}
          </button>
        </div>
        </fieldset>
      </form>
      )}
    </section>
  );
}

// ─── Split Repay Row ──────────────────────────────────────────
function SplitRepayRow({ exp, splitIndex }) {
  const { t } = useLanguage();
  const { markSplitRepaid, unmarkSplitRepaid, updateExpense, people, CURRENCIES, canEditCost } = useCost();
  const split = exp.splits?.[splitIndex] || {};
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
      : split.amount != null
        ? `${paidSym}${split.amount.toFixed(2)} ${exp.paidCurrency}`
        : `—`;

  const canMarkRepaid = split.amount != null || split.convertedAmount != null;

  const itemizedPct = (() => {
    const pct = parseFloat(exp.taxPctTotal ?? exp.serviceTaxPct ?? '0');
    return Number.isFinite(pct) ? Math.max(0, pct) : 0;
  })();

  const handleSetItemizedAmount = (val) => {
    const pct = itemizedPct / 100;
    const raw = val === '' ? null : parseFloat(val);
    const base =
      raw != null && Number.isFinite(raw)
        ? (exp.itemizedInputMode === 'total'
            ? parseFloat((raw / (1 + pct)).toFixed(4))
            : raw)
        : null;
    const taxAmount = base != null && Number.isFinite(base) ? parseFloat((base * pct).toFixed(4)) : null;
    const total = base != null && Number.isFinite(base) ? parseFloat((base + (taxAmount || 0)).toFixed(4)) : null;
    const rate = split.rate ?? null;
    const converted = rate && total != null ? parseFloat((total * rate).toFixed(4)) : null;
    const nextSplits = exp.splits.map((s, i) =>
      i === splitIndex
        ? { ...s, baseAmount: base, taxAmount, amount: total, convertedAmount: converted }
        : s
    );
    updateExpense(exp.id, { splits: nextSplits });
  };

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
        <span className="payer-chip">{t('cost.payer')}</span>
        <span className="split-amount-label payer-amount">
          {split.amount != null ? `${paidSym}${split.amount.toFixed(2)} ${exp.paidCurrency}` : '—'}
        </span>
      </div>
    );
  }

  if (split.repaid) {
    return (
      <div className="split-row split-row-repaid animate-in">
        <span className="split-person-avatar">{person?.name.charAt(0).toUpperCase() || '?'}</span>
        <span className="split-person-name">{person?.name || '?'}</span>
        <span className="split-amount-label">{amountLabel}</span>
        <span className="repaid-chip">✅ {t('cost.repaid')}</span>
        <span className="repaid-date">{t('cost.onDate')} {split.repaidDate}</span>
        {split.repaidAttachment && (
          <a href={split.repaidAttachment.url} target="_blank" rel="noreferrer" className="attach-link">
            📎 {split.repaidAttachment.name}
          </a>
        )}
        <button type="button" className="undo-repaid-btn" disabled={!canEditCost} onClick={() => unmarkSplitRepaid(exp.id, splitIndex)}>
          {t('cost.undo')}
        </button>
      </div>
    );
  }

  return (
    <div className={`split-row ${showForm ? 'split-row-open' : ''}`}>
      <span className="split-person-avatar">{person?.name.charAt(0).toUpperCase() || '?'}</span>
      <span className="split-person-name">{person?.name || '?'}</span>
      <span className="split-amount-label">{amountLabel}</span>
      {exp.splitMode === 'itemized' && (
        <label className="itemized-inline">
          <span>{exp.itemizedInputMode === 'total' ? t('cost.yourTotal') : t('cost.yourBase')}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={
              exp.itemizedInputMode === 'total'
                ? (split.amount != null ? split.amount : '')
                : (split.baseAmount != null ? split.baseAmount : '')
            }
            disabled={!canEditCost}
            placeholder={exp.itemizedInputMode === 'total' ? t('cost.totalAmountPh') : t('cost.baseAmountPh')}
            onChange={(e) => handleSetItemizedAmount(e.target.value)}
          />
        </label>
      )}
      {!showForm ? (
        <button type="button" className="mark-repaid-btn" onClick={() => setShowForm(true)} disabled={!canEditCost || !canMarkRepaid}>
          {t('cost.markRepaid')}
        </button>
      ) : (
        <div className="repay-inline-form animate-in">
          <label className="repay-inline-label">
            <span>{t('cost.repaidOn')}</span>
            <input type="date" value={repayDate} disabled={!canEditCost} onChange={(e) => setRepayDate(e.target.value)} />
          </label>
          <label className="attach-btn">
            <input ref={fileRef} type="file" accept="image/*,.pdf" disabled={!canEditCost} onChange={handleFile} style={{ display: 'none' }} />
            <span>{attachment ? `📎 ${attachment.name}` : `📎 ${t('cost.proof')}`}</span>
          </label>
          <button type="button" className="primary" disabled={!canEditCost} onClick={handleConfirm}>{t('cost.confirm')}</button>
          <button type="button" disabled={!canEditCost} onClick={() => { setShowForm(false); setAttachment(null); }}>{t('cost.cancel')}</button>
        </div>
      )}
    </div>
  );
}

// ─── Single Expense Card ──────────────────────────────────────
function ExpenseCard({ exp }) {
  const { t } = useLanguage();
  const { removeExpense, people, CURRENCIES, canEditCost } = useCost();
  const [expanded, setExpanded] = useState(false);

  const payer = people.find((p) => p.id === exp.payerId);
  const paidSym = CURRENCIES.find((c) => c.code === exp.paidCurrency)?.symbol || '';
  const rateInfo = exp.splits?.[0];
  const pctTotal = parseFloat(exp.taxPctTotal ?? 0) || 0;
  const baseTotal = pctTotal > 0 ? (exp.amount / (1 + pctTotal / 100)) : exp.amount;
  const sumBase = (exp.splits || []).reduce((s, sp) => s + (Number.isFinite(sp.baseAmount) ? sp.baseAmount : 0), 0);
  const remainingBase = Math.max(0, parseFloat((baseTotal - sumBase).toFixed(2)));
  const sumTotal = (exp.splits || []).reduce((s, sp) => s + (Number.isFinite(sp.amount) ? sp.amount : 0), 0);
  const remainingTotal = Math.max(0, parseFloat((exp.amount - sumTotal).toFixed(2)));

  const allRepaid = exp.splits?.length > 0 &&
    exp.splits.filter((s) => s.personId !== exp.payerId).every((s) => s.repaid);

  return (
    <div className={`expense-card-v2 ${allRepaid ? 'expense-card-settled' : ''}`}>
      <div className="expense-card-header" onClick={() => setExpanded((v) => !v)}>
        <div className="expense-card-left">
          <span className="expense-collapse-icon">{expanded ? '▾' : '▸'}</span>
          <span className="expense-desc-v2">{exp.description?.trim() ? exp.description : t('cost.untitledExpense')}</span>
          {exp.category && (
            <span className="tag tag-category" title={EXPENSE_CATEGORIES.find((c) => c.id === exp.category)?.label}>
              {EXPENSE_CATEGORIES.find((c) => c.id === exp.category)?.icon || '📄'}
            </span>
          )}
          <span className={`tag tag-method`}>{exp.paymentMethod === 'card' ? '💳' : '💵'}</span>
          {allRepaid && <span className="settled-badge">✅ {t('cost.allSettled')}</span>}
        </div>
        <div className="expense-amount-v2">
          <span className="amount-big">{paidSym}{exp.amount.toLocaleString()}</span>
          <span className="amount-cur">{exp.paidCurrency}</span>
        </div>
      </div>

      {expanded && (
        <div className="expense-card-body animate-in">
          <div className="expense-meta-row">
            <span>{t('cost.paidByLabel')} <strong>{payer?.name || '?'}</strong></span>
            <span>· {exp.date}</span>
            {exp.splitMode === 'itemized' && (exp.itemizedInputMode === 'total' ? remainingTotal > 0.009 : remainingBase > 0.009) && (
              <span className="rate-source-small">
                · {(exp.itemizedInputMode === 'total' ? t('cost.remainingTotalToFill') : t('cost.remainingBaseToFill'))}{' '}
                <strong>
                  {paidSym}{(exp.itemizedInputMode === 'total' ? remainingTotal : remainingBase).toFixed(2)}
                </strong>
              </span>
            )}
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
            {exp.splits?.map((s, i) => (
              <SplitRepayRow key={`${s?.personId ?? 'p'}-${i}`} exp={exp} splitIndex={i} />
            ))}
          </div>

          <div className="expense-card-actions">
            <button
              type="button"
              className="expense-edit-btn"
              disabled={!canEditCost || !exp?.id}
              onClick={(e) => {
                e.stopPropagation();
                expenseFormControllerRef.current?.startEdit(exp);
              }}
            >
              {t('cost.editExpense')}
            </button>
            <button
              type="button"
              className="expense-remove-v2"
              onClick={(e) => {
                e.stopPropagation();
                if (exp?.id) removeExpense(exp.id);
              }}
              disabled={!canEditCost || !exp?.id}
            >
              {t('cost.removeExpense')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day Expense View ─────────────────────────────────────────
function DayExpenseView() {
  const { t } = useLanguage();
  const { expenses, CURRENCIES } = useCost();
  const { days, trip } = useItinerary();
  const [collapsedDays, setCollapsedDays] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');

  const toggleDay = (dayId) =>
    setCollapsedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));

  const dayDateMap = useMemo(() => {
    const map = {};
    if (!trip?.startDate) return map;
    for (let i = 0; i < days.length; i++) {
      const d = new Date(trip.startDate);
      d.setDate(d.getDate() + i);
      map[days[i].id] = d.toISOString().slice(0, 10);
    }
    return map;
  }, [trip?.startDate, days]);

  const customGroups = useMemo(() => {
    const byDate = {};
    for (const e of expenses) {
      if (categoryFilter !== 'all' && (e.category || 'other') !== categoryFilter) continue;
      const isCustom = !!e.customDateUsed;
      if (!isCustom) continue;
      const date = e.date || '';
      const matchesDay = Object.values(dayDateMap).includes(date);
      if (matchesDay) continue;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(e);
    }
    const entries = Object.entries(byDate).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return entries;
  }, [expenses, categoryFilter, dayDateMap]);

  if (expenses.length === 0) return null;

  return (
    <section className="section cost-section">
      <div className="day-exp-header-row">
        <h2 className="section-title">{t('cost.expensesByDay')}</h2>
        <label className="cost-category-filter">
          <span className="cost-category-filter-label">{t('cost.categoryFilter')}</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="cost-category-filter-select"
          >
            <option value="all">{t('cost.all')}</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="day-expense-list">
        {days.map((day) => {
          const dayExps = expenses.filter(
            (e) => {
              if (categoryFilter !== 'all' && (e.category || 'other') !== categoryFilter) return false;
              // If it is a custom date expense, only show under Day if the date matches itinerary day date.
              if (e.customDateUsed) {
                const shouldMatch = dayDateMap[day.id];
                return shouldMatch && e.date === shouldMatch;
              }
              return e.dayTag === day.id;
            }
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
                  <span className="day-exp-count">{dayExps.length} {dayExps.length !== 1 ? t('cost.expensesCountPlural') : t('cost.expensesCount')}</span>
                  {allDaySettled && <span className="day-settled-badge">✅ {t('cost.allSettled')}</span>}
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

        {customGroups.length > 0 && (
          <div className="custom-date-groups">
            {customGroups.map(([date, exps]) => {
              const dayId = `custom:${date}`;
              const collapsed = !!collapsedDays[dayId];
              const total = exps.reduce((s, e) => s + (e.amount || 0), 0);
              const primaryCur = exps[0]?.paidCurrency || '';
              const primarySym = CURRENCIES.find((c) => c.code === primaryCur)?.symbol || '';
              const allSettled = exps.every((e) =>
                e.splits?.filter((s) => s.personId !== e.payerId).every((s) => s.repaid)
              );
              return (
                <div key={dayId} className={`day-exp-card ${allSettled ? 'day-exp-card-settled' : ''}`}>
                  <div className="day-exp-header" onClick={() => toggleDay(dayId)}>
                    <div className="day-exp-header-left">
                      <span className="day-collapse-icon">{collapsed ? '▸' : '▾'}</span>
                      <span className="day-exp-label">{t('cost.customDateGroup', { date })}</span>
                      <span className="day-exp-count">{exps.length} {exps.length !== 1 ? t('cost.expensesCountPlural') : t('cost.expensesCount')}</span>
                      {allSettled && <span className="day-settled-badge">✅ {t('cost.allSettled')}</span>}
                    </div>
                    <span className="day-exp-total">
                      {primarySym}{total.toLocaleString()} <span className="day-exp-cur">{primaryCur}</span>
                    </span>
                  </div>
                  {!collapsed && (
                    <div className="day-exp-body animate-in">
                      {exps.map((exp) => (
                        <ExpenseCard key={exp.id} exp={exp} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Settlement Summary ───────────────────────────────────────
function SettlementSummary() {
  const { t } = useLanguage();
  const { people, expenses, getRepaidSummary, CURRENCIES } = useCost();
  const [detailPersonId, setDetailPersonId] = useState(null);

  const getName = useCallback((id) => people.find((p) => p.id === id)?.name || '?', [people]);
  const getSymbol = useCallback((code) => CURRENCIES.find((c) => c.code === code)?.symbol || '', [CURRENCIES]);

  const debtorBreakdown = useMemo(() => {
    if (!detailPersonId) return null;
    const lines = [];
    const totals = {};
    for (const e of expenses) {
      (e.splits || []).forEach((s) => {
        if (s.personId !== detailPersonId || s.personId === e.payerId || s.repaid) return;
        const cur = s.repayCurrency || e.paidCurrency;
        const amt = Number(s.convertedAmount ?? s.amount) || 0;
        if (amt <= 0.0001) return;
        totals[cur] = (totals[cur] || 0) + amt;
        lines.push({
          expenseId: e.id,
          description: (e.description || '').trim() || t('cost.untitledExpense'),
          creditorName: getName(e.payerId),
          currency: cur,
          amount: amt,
        });
      });
    }
    return { lines, totals };
  }, [detailPersonId, expenses, getName, t]);

  const creditorBreakdown = useMemo(() => {
    if (!detailPersonId) return null;
    const lines = [];
    const totals = {};
    for (const e of expenses) {
      if (e.payerId !== detailPersonId) continue;
      (e.splits || []).forEach((s) => {
        if (s.personId === e.payerId || s.repaid) return;
        const cur = s.repayCurrency || e.paidCurrency;
        const amt = Number(s.convertedAmount ?? s.amount) || 0;
        if (amt <= 0.0001) return;
        totals[cur] = (totals[cur] || 0) + amt;
        lines.push({
          expenseId: e.id,
          description: (e.description || '').trim() || t('cost.untitledExpense'),
          debtorName: getName(s.personId),
          currency: cur,
          amount: amt,
        });
      });
    }
    return { lines, totals };
  }, [detailPersonId, expenses, getName, t]);

  /** Per-expense rows for Outstanding table (unpaid splits only). */
  const outstandingExpenseRows = useMemo(() => {
    const rows = [];
    for (const e of expenses) {
      const unpaid = (e.splits || []).filter((s) => s.personId !== e.payerId && !s.repaid);
      const byCur = {};
      const whoOwes = [];
      unpaid.forEach((s) => {
        const cur = s.repayCurrency || e.paidCurrency;
        const amt = Number(s.convertedAmount ?? s.amount) || 0;
        if (amt <= 0.0001) return;
        byCur[cur] = (byCur[cur] || 0) + amt;
        whoOwes.push({ name: getName(s.personId), amount: amt, currency: cur });
      });
      if (Object.keys(byCur).length === 0) continue;
      rows.push({
        id: e.id,
        description: (e.description || '').trim() || t('cost.untitledExpense'),
        category: e.category || '',
        date: e.date || '',
        payerName: getName(e.payerId),
        paidAmount: e.amount,
        paidCurrency: e.paidCurrency,
        outstandingByCurrency: byCur,
        whoOwes,
      });
    }
    return rows;
  }, [expenses, getName, t]);

  useEffect(() => {
    if (!detailPersonId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailPersonId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailPersonId]);

  if (expenses.length === 0 || people.length === 0) return null;

  const repaid = getRepaidSummary();

  const totals = {};
  people.forEach((p) => {
    totals[p.id] = 0;
  });
  expenses.forEach((e) => {
    if (totals[e.payerId] !== undefined) totals[e.payerId] += e.amount;
  });

  const paidCur = expenses[0]?.paidCurrency || '';
  const paidSym = getSymbol(paidCur);

  const detailPerson = detailPersonId ? people.find((p) => p.id === detailPersonId) : null;

  return (
    <section className="section cost-section">
      <h2 className="section-title">{t('cost.settlementSummary')}</h2>

      {/* Who paid how much — click traveler for breakdown */}
      <div className="settlement-totals">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className="settlement-person settlement-person-btn"
            onClick={() => setDetailPersonId(p.id)}
          >
            <span className="person-avatar-sm">{p.name.charAt(0).toUpperCase()}</span>
            <span className="settlement-name">{p.name}</span>
            <span className="settlement-paid">
              {paidSym}
              {(totals[p.id] || 0).toLocaleString()} {paidCur}
            </span>
          </button>
        ))}
      </div>

      {/* Outstanding — per-expense table + mobile cards */}
      {outstandingExpenseRows.length === 0 ? (
        <p className="cost-hint settlement-ok">✅ {t('cost.allSettledUp')}</p>
      ) : (
        <div className="settlement-block settlement-outstanding-block">
          <div className="settlement-outstanding-head">
            <h3 className="settlement-subtitle">⏳ {t('cost.outstanding')}</h3>
            <p className="settlement-outstanding-hint">{t('cost.outstandingTableHint')}</p>
          </div>

          <p className="settlement-scroll-hint" aria-hidden>
            {t('cost.scrollTableHint')}
          </p>

          <div
            className="settlement-outstanding-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('cost.outstanding')}
          >
            <table className="settlement-outstanding-table">
              <thead>
                <tr>
                  <th scope="col" className="settlement-os-col-item">
                    {t('cost.colItem')}
                  </th>
                  <th scope="col" className="settlement-os-col-payer">
                    {t('cost.colPayer')}
                  </th>
                  <th scope="col" className="settlement-os-col-num">
                    {t('cost.colPaidAmount')}
                  </th>
                  <th scope="col" className="settlement-os-col-out">
                    {t('cost.colOutstandingRepay')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {outstandingExpenseRows.map((row) => {
                  const catIcon = EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.icon;
                  return (
                    <tr key={row.id}>
                      <td className="settlement-os-col-item">
                        <div className="settlement-os-item-cell">
                          {catIcon && (
                            <span className="settlement-os-cat" title={row.category} aria-hidden>
                              {catIcon}
                            </span>
                          )}
                          <div>
                            <div className="settlement-os-item-title">{row.description}</div>
                            {row.date && (
                              <div className="settlement-os-item-date">{row.date}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="settlement-os-col-payer">
                        <span className="settlement-os-payer-name">{row.payerName}</span>
                      </td>
                      <td className="settlement-os-col-num">
                        <span className="settlement-os-money settlement-os-money-paid">
                          {getSymbol(row.paidCurrency)}
                          {Number(row.paidAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className="settlement-os-cur-code">{row.paidCurrency}</span>
                      </td>
                      <td className="settlement-os-col-out">
                        <div className="settlement-os-out-stack">
                          {Object.entries(row.outstandingByCurrency).map(([cur, amt]) => (
                            <div key={cur} className="settlement-os-out-line">
                              <span className="settlement-os-money settlement-os-money-out">
                                {getSymbol(cur)}
                                {amt.toFixed(2)}
                              </span>
                              <span className="settlement-os-cur-code">{cur}</span>
                            </div>
                          ))}
                          <div className="settlement-os-who">
                            <span className="settlement-os-who-label">{t('cost.outstandingWhoBreakdown')}</span>
                            <ul className="settlement-os-who-list">
                              {row.whoOwes.map((w, wi) => (
                                <li key={`${row.id}-who-${wi}`}>
                                  <strong>{w.name}</strong>
                                  <span className="settlement-os-who-amt">
                                    {' '}
                                    {getSymbol(w.currency)}
                                    {w.amount.toFixed(2)} {w.currency}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="settlement-os-mobile-cards">
            {outstandingExpenseRows.map((row) => {
              const catIcon = EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.icon;
              return (
                <article key={`m-${row.id}`} className="settlement-os-card">
                  <div className="settlement-os-card-head">
                    {catIcon && <span className="settlement-os-cat">{catIcon}</span>}
                    <div>
                      <h4 className="settlement-os-card-title">{row.description}</h4>
                      {row.date && <p className="settlement-os-card-date">{row.date}</p>}
                    </div>
                  </div>
                  <dl className="settlement-os-card-dl">
                    <div>
                      <dt>{t('cost.colPayer')}</dt>
                      <dd>{row.payerName}</dd>
                    </div>
                    <div>
                      <dt>{t('cost.colPaidAmount')}</dt>
                      <dd>
                        <span className="settlement-os-money settlement-os-money-paid">
                          {getSymbol(row.paidCurrency)}
                          {Number(row.paidAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>{' '}
                        <span className="settlement-os-cur-code">{row.paidCurrency}</span>
                      </dd>
                    </div>
                    <div className="settlement-os-card-out">
                      <dt>{t('cost.colOutstandingRepay')}</dt>
                      <dd>
                        {Object.entries(row.outstandingByCurrency).map(([cur, amt]) => (
                          <div key={cur} className="settlement-os-out-line">
                            <span className="settlement-os-money settlement-os-money-out">
                              {getSymbol(cur)}
                              {amt.toFixed(2)}
                            </span>{' '}
                            <span className="settlement-os-cur-code">{cur}</span>
                          </div>
                        ))}
                      </dd>
                    </div>
                    <div className="settlement-os-card-who">
                      <dt>{t('cost.outstandingWhoBreakdown')}</dt>
                      <dd>
                        <ul className="settlement-os-who-list">
                          {row.whoOwes.map((w, wi) => (
                            <li key={`m-${row.id}-who-${wi}`}>
                              <strong>{w.name}</strong>
                              <span className="settlement-os-who-amt">
                                {' '}
                                {getSymbol(w.currency)}
                                {w.amount.toFixed(2)} {w.currency}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed repayments */}
      {repaid.length > 0 && (
        <div className="settlement-block repaid-block">
          <h3 className="settlement-subtitle">✅ {t('cost.repaidLabel')}</h3>
          <div className="settlement-list">
            {repaid.map((r, i) => (
              <div key={i} className="settlement-row settlement-row-done animate-in">
                <span className="settle-debtor">{getName(r.debtorId)}</span>
                <span className="settle-arrow">{t('cost.repaidShort')}</span>
                <span className="settle-creditor">{getName(r.creditorId)}</span>
                <span className="settle-amount done">
                  {getSymbol(r.currency)}
                  {r.amount.toFixed(2)}
                  <span className="settle-currency"> {r.currency}</span>
                </span>
                <span className="repaid-date-summary">
                  {t('cost.onDate')} {r.repaidDate}
                </span>
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

      {detailPerson && debtorBreakdown && creditorBreakdown && (
        <div
          className="settlement-detail-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-detail-title"
          onClick={() => setDetailPersonId(null)}
        >
          <div className="settlement-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settlement-detail-head">
              <h3 id="settlement-detail-title">
                {t('cost.travelerSettlementTitle', { name: detailPerson.name })}
              </h3>
              <button
                type="button"
                className="settlement-detail-close"
                onClick={() => setDetailPersonId(null)}
                aria-label={t('cost.closeSettlementDetail')}
              >
                ×
              </button>
            </div>
            <div className="settlement-detail-body">
              <h4 className="settlement-detail-section-title">{t('cost.settlementYouOwe')}</h4>
              {Object.keys(debtorBreakdown.totals).length === 0 ? (
                <p className="settlement-detail-empty">{t('cost.settlementNoDebtorLines')}</p>
              ) : (
                <>
                  <p className="settlement-detail-lead">{t('cost.totalYouOwe')}</p>
                  <div className="settlement-detail-totals">
                    {Object.entries(debtorBreakdown.totals).map(([cur, amt]) => (
                      <div key={cur} className="settlement-detail-total-pill">
                        <strong>
                          {getSymbol(cur)}
                          {amt.toFixed(2)} {cur}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <table className="settlement-detail-table">
                    <thead>
                      <tr>
                        <th>{t('cost.expenseCol')}</th>
                        <th>{t('cost.repayTo')}</th>
                        <th className="settlement-detail-th-amount">{t('cost.amountCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debtorBreakdown.lines.map((row, idx) => (
                        <tr key={`d-${row.expenseId}-${idx}`}>
                          <td>{row.description}</td>
                          <td>{row.creditorName}</td>
                          <td className="settlement-detail-amount">
                            {getSymbol(row.currency)}
                            {row.amount.toFixed(2)} {row.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <h4 className="settlement-detail-section-title settlement-detail-section-spaced">
                {t('cost.settlementOthersOweYou')}
              </h4>
              {Object.keys(creditorBreakdown.totals).length === 0 ? (
                <p className="settlement-detail-empty">{t('cost.settlementNoCreditorLines')}</p>
              ) : (
                <>
                  <p className="settlement-detail-lead">{t('cost.totalOwedToYou')}</p>
                  <div className="settlement-detail-totals">
                    {Object.entries(creditorBreakdown.totals).map(([cur, amt]) => (
                      <div key={cur} className="settlement-detail-total-pill settlement-detail-total-pill-credit">
                        <strong>
                          {getSymbol(cur)}
                          {amt.toFixed(2)} {cur}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <table className="settlement-detail-table">
                    <thead>
                      <tr>
                        <th>{t('cost.expenseCol')}</th>
                        <th>{t('cost.owedBy')}</th>
                        <th className="settlement-detail-th-amount">{t('cost.amountCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditorBreakdown.lines.map((row, idx) => (
                        <tr key={`c-${row.expenseId}-${idx}`}>
                          <td>{row.description}</td>
                          <td>{row.debtorName}</td>
                          <td className="settlement-detail-amount">
                            {getSymbol(row.currency)}
                            {row.amount.toFixed(2)} {row.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Cost() {
  const { t } = useLanguage();
  return (
    <div className="page cost-page">
      <header className="page-header">
        <h1>{t('cost.splitter')}</h1>
        <p className="page-intro-inline">{t('cost.intro')}</p>
      </header>
      <PeopleManager />
      <TravellerPaymentDetails />
      <AddExpenseForm />
      <DayExpenseView />
      <SettlementSummary />
    </div>
  );
}

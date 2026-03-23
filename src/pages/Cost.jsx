import { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCost, fetchRate } from '../context/CostContext';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ExpenseCategoryModal, { EXPENSE_CATEGORIES } from '../components/ExpenseCategoryModal';
import { defaultPaymentInfo } from '../lib/costData';
import { fileToSyncAttachment, SYNC_FILE_ERROR_TOO_LARGE } from '../lib/syncFileAttachment';
import './Cost.css';

// ─── Helpers ──────────────────────────────────────────────────
function useSymbol(code) {
  const { CURRENCIES } = useCost();
  return CURRENCIES.find((c) => c.code === code)?.symbol || '';
}

// ─── Read-only payment summary (others viewing your card) ───
function PaymentReadonlyCard({ pay, travellerName, t }) {
  const has =
    !!pay?.qrCode ||
    !!(pay?.bankName && String(pay.bankName).trim()) ||
    !!(pay?.accountNumber && String(pay.accountNumber).trim()) ||
    !!(pay?.accountHolder && String(pay.accountHolder).trim()) ||
    !!(pay?.notes && String(pay.notes).trim());
  if (!has) {
    return (
      <div className="traveller-payment-body payment-readonly-body">
        <p className="cost-hint payment-card-viewonly-empty">
          {t('cost.paymentCardEmptyForViewer', { name: travellerName })}
        </p>
      </div>
    );
  }
  return (
    <div className="traveller-payment-body payment-readonly-body">
      <p className="payment-viewonly-badge">{t('cost.viewOnlyPayment')}</p>
      {pay.qrCode ? (
        <div className="qr-preview payment-readonly-qr">
          <img src={pay.qrCode} alt="QR" />
        </div>
      ) : null}
      {(pay.bankName || pay.accountNumber || pay.accountHolder || pay.notes) && (
        <dl className="payment-readonly-dl">
          {pay.bankName ? (
            <>
              <dt>{t('cost.bankName')}</dt>
              <dd>{pay.bankName}</dd>
            </>
          ) : null}
          {pay.accountHolder ? (
            <>
              <dt>{t('cost.accountHolder')}</dt>
              <dd>{pay.accountHolder}</dd>
            </>
          ) : null}
          {pay.accountNumber ? (
            <>
              <dt>{t('cost.accountNumber')}</dt>
              <dd className="payment-readonly-account">{pay.accountNumber}</dd>
            </>
          ) : null}
          {pay.notes ? (
            <>
              <dt>{t('cost.notes')}</dt>
              <dd>{pay.notes}</dd>
            </>
          ) : null}
        </dl>
      )}
    </div>
  );
}

// ─── People Manager ───────────────────────────────────────────
function PeopleManager({ onAvatarScrollToPayment }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    people,
    addPerson,
    updatePerson,
    removePerson,
    removeExpensesForPersonId,
    canEditTravellerNameFor,
    getTravellerAvatarUrlForPersonId,
  } = useCost();
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
        {people.map((p) => {
          const avatarUrl = getTravellerAvatarUrlForPersonId(p.id);
          const canEditName = canEditTravellerNameFor(p.id);
          return (
          <div key={p.id} className="person-chip animate-in">
            <button
              type="button"
              className="person-avatar person-avatar--chip-btn"
              onClick={() => onAvatarScrollToPayment?.(p.id)}
              title={t('cost.jumpToPaymentCard')}
              aria-label={t('cost.jumpToPaymentCardNamed', { name: p.name })}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="person-avatar-img" />
              ) : (
                <span className="person-avatar-letter">{p.name.charAt(0).toUpperCase()}</span>
              )}
            </button>
            {canEditName ? (
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
          );
        })}
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

/** QR image stored as data: URL so shared itinerary / Supabase sync works for all members. */
function TravellerPaymentQrUpload({ personId, pay, canEdit, updatePersonPayment }) {
  const { t } = useLanguage();
  const [qrError, setQrError] = useState('');

  return (
    <div className="qr-upload-area">
      {pay.qrCode ? (
        <div className="qr-preview">
          <img src={pay.qrCode} alt="QR code" />
          <button
            type="button"
            className="qr-remove"
            disabled={!canEdit}
            onClick={() => {
              setQrError('');
              updatePersonPayment(personId, { qrCode: null, saved: false, savedAt: null });
            }}
          >
            {t('cost.remove')}
          </button>
        </div>
      ) : (
        <label className="qr-upload-btn">
          <input
            type="file"
            accept="image/*"
            disabled={!canEdit}
            onChange={async (e) => {
              setQrError('');
              const file = e.target.files?.[0];
              const inp = e.target;
              try {
                if (!file) return;
                const { url } = await fileToSyncAttachment(file);
                updatePersonPayment(personId, { qrCode: url, saved: false, savedAt: null });
              } catch (err) {
                setQrError(
                  err?.code === SYNC_FILE_ERROR_TOO_LARGE || err?.message === SYNC_FILE_ERROR_TOO_LARGE
                    ? t('cost.fileTooLargeForSync')
                    : t('cost.fileReadError')
                );
              } finally {
                inp.value = '';
              }
            }}
            style={{ display: 'none' }}
          />
          📷 {t('cost.uploadQR')}
        </label>
      )}
      {qrError ? <p className="cost-hint qr-upload-error">{qrError}</p> : null}
    </div>
  );
}

// ─── Traveller Payment Details (QR + bank for others to pay) ───
function TravellerPaymentDetails({ highlightPersonId }) {
  const { t } = useLanguage();
  const {
    people,
    updatePersonPayment,
    canEditCost,
    canEditPersonPaymentFor,
    getTravellerAvatarUrlForPersonId,
  } = useCost();

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

  return (
    <section id="section-traveller-payment-details" className="section cost-section">
      <h2 className="section-title">{t('cost.travellerPaymentDetails')}</h2>
      <p className="cost-hint payment-details-hint">
        {t('cost.paymentHint')}
      </p>
      <p className="cost-hint payment-details-nav-hint">{t('cost.paymentDetailsNavHint')}</p>
      {canEditCost ? (
        <p className="cost-hint payment-details-permission-hint">{t('cost.paymentDetailsPermissionHint')}</p>
      ) : (
        <p className="cost-hint">{t('cost.readOnlyHint')}</p>
      )}
      <div className="traveller-payment-grid">
        {people.map((p) => {
          const pay = p.paymentInfo || defaultPayment();
          const canEditThis = canEditPersonPaymentFor(p.id);
          const canSave = !!(pay.qrCode || pay.bankName || pay.accountHolder || pay.accountNumber || pay.notes);
          const avatarUrl = getTravellerAvatarUrlForPersonId(p.id);
          const pulse = highlightPersonId === p.id;
          return (
            <div
              key={p.id}
              id={`traveller-payment-card-${p.id}`}
              className={`traveller-payment-card animate-in${pulse ? ' traveller-payment-card--pulse' : ''}`}
            >
              <div className="traveller-payment-header">
                {avatarUrl ? (
                  <span className="person-avatar person-avatar--photo">
                    <img src={avatarUrl} alt="" className="person-avatar-header-img" />
                  </span>
                ) : (
                  <span className="person-avatar">{p.name.charAt(0).toUpperCase()}</span>
                )}
                <span className="traveller-payment-name">{p.name}</span>
                {canEditThis ? (
                  <button
                    type="button"
                    className="traveller-payment-save"
                    disabled={!canEditCost || !canSave}
                    onClick={() =>
                      updatePersonPayment(p.id, {
                        ...(p.paymentInfo || defaultPayment()),
                        saved: true,
                        savedAt: new Date().toISOString(),
                      })
                    }
                  >
                    {t('cost.savePayment')}
                  </button>
                ) : (
                  <span className="traveller-payment-viewonly-label">{t('cost.viewOnlyPayment')}</span>
                )}
              </div>
              {canEditThis ? (
                <>
                  <div className="traveller-payment-body">
                    <label className="payment-field">
                      <span>{t('cost.qrCode')}</span>
                      <TravellerPaymentQrUpload
                        personId={p.id}
                        pay={pay}
                        canEdit={canEditCost && canEditThis}
                        updatePersonPayment={updatePersonPayment}
                      />
                    </label>
                    <label className="payment-field">
                      <span>{t('cost.bankName')}</span>
                      <input
                        type="text"
                        placeholder="e.g. Maybank, CIMB"
                        value={pay.bankName}
                        disabled={!canEditCost}
                        onChange={(e) =>
                          updatePersonPayment(p.id, { bankName: e.target.value, saved: false, savedAt: null })
                        }
                      />
                    </label>
                    <label className="payment-field">
                      <span>{t('cost.accountHolder')}</span>
                      <input
                        type="text"
                        placeholder={t('cost.nameOnAccount')}
                        value={pay.accountHolder}
                        disabled={!canEditCost}
                        onChange={(e) =>
                          updatePersonPayment(p.id, { accountHolder: e.target.value, saved: false, savedAt: null })
                        }
                      />
                    </label>
                    <label className="payment-field">
                      <span>{t('cost.accountNumber')}</span>
                      <input
                        type="text"
                        placeholder={t('cost.accountOrCard')}
                        value={pay.accountNumber}
                        disabled={!canEditCost}
                        onChange={(e) =>
                          updatePersonPayment(p.id, { accountNumber: e.target.value, saved: false, savedAt: null })
                        }
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
                </>
              ) : (
                <PaymentReadonlyCard pay={pay} travellerName={p.name} t={t} />
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

  const handleReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    const inp = e.target;
    setFormError('');
    try {
      if (!file) return;
      const att = await fileToSyncAttachment(file);
      set('receipt', att);
    } catch (err) {
      setFormError(
        err?.code === SYNC_FILE_ERROR_TOO_LARGE || err?.message === SYNC_FILE_ERROR_TOO_LARGE
          ? t('cost.fileTooLargeForSync')
          : t('cost.fileReadError')
      );
    } finally {
      inp.value = '';
    }
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
  const [attachError, setAttachError] = useState('');
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

  const handleFile = async (e) => {
    setAttachError('');
    const file = e.target.files?.[0];
    const inp = e.target;
    try {
      if (!file) return;
      const att = await fileToSyncAttachment(file);
      setAttachment(att);
    } catch (err) {
      setAttachError(
        err?.code === SYNC_FILE_ERROR_TOO_LARGE || err?.message === SYNC_FILE_ERROR_TOO_LARGE
          ? t('cost.fileTooLargeForSync')
          : t('cost.fileReadError')
      );
    } finally {
      inp.value = '';
    }
  };

  const handleConfirm = () => {
    markSplitRepaid(exp.id, splitIndex, repayDate, attachment);
    setShowForm(false);
    setAttachment(null);
    setAttachError('');
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
          <button
            type="button"
            disabled={!canEditCost}
            onClick={() => {
              setShowForm(false);
              setAttachment(null);
              setAttachError('');
            }}
          >
            {t('cost.cancel')}
          </button>
          {attachError ? <p className="ef-form-error split-attach-error">{attachError}</p> : null}
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

function personHasPayableDetails(person) {
  if (!person) return false;
  const pay =
    person.paymentInfo && typeof person.paymentInfo === 'object'
      ? { ...defaultPaymentInfo(), ...person.paymentInfo }
      : defaultPaymentInfo();
  return !!(pay.qrCode || String(pay.bankName || '').trim() || String(pay.accountNumber || '').trim());
}

// ─── Payer payment info (QR / bank) — read-only modal ────────
function PayerPaymentDetailModal({ person, onClose, t }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  if (!person) return null;
  const pay = person.paymentInfo && typeof person.paymentInfo === 'object'
    ? { ...defaultPaymentInfo(), ...person.paymentInfo }
    : defaultPaymentInfo();
  const hasQr = !!pay.qrCode;
  const hasBank = !!(String(pay.bankName || '').trim() || String(pay.accountNumber || '').trim());
  if (!hasQr && !hasBank) return null;

  const acct = String(pay.accountNumber || '').trim();
  const copyAcct = async () => {
    if (!acct) return;
    try {
      await navigator.clipboard.writeText(acct);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="payer-pay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payer-pay-title"
      onClick={onClose}
    >
      <div className="payer-pay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payer-pay-head">
          <h3 id="payer-pay-title">{person.name}</h3>
          <button type="button" className="payer-pay-close" onClick={onClose} aria-label={t('cost.closeSettlementDetail')}>
            ×
          </button>
        </div>
        <div className="payer-pay-body">
          {hasQr && (
            <div className="payer-pay-qr">
              <img src={pay.qrCode} alt="" />
            </div>
          )}
          {hasBank && (
            <div className="payer-pay-bank">
              {pay.bankName?.trim() && (
                <p className="payer-pay-line">
                  <strong>{t('cost.bankName')}</strong> {pay.bankName.trim()}
                </p>
              )}
              {pay.accountHolder?.trim() && (
                <p className="payer-pay-line">
                  <strong>{t('cost.accountHolder')}</strong> {pay.accountHolder.trim()}
                </p>
              )}
              {acct && (
                <p className="payer-pay-line payer-pay-acct-row">
                  <span>
                    <strong>{t('cost.accountNumber')}</strong> {acct}
                  </span>
                  <button type="button" className="payer-pay-copy" onClick={copyAcct}>
                    {copied ? t('cost.copied') : t('cost.copyAccount')}
                  </button>
                </p>
              )}
            </div>
          )}
          {pay.notes?.trim() && (
            <p className="payer-pay-notes">
              <strong>{t('cost.notes')}</strong> {pay.notes.trim()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settlement remarks (per expense, multi-author) ───────────
function OutstandingRemarkEditor({ expenseId, remarks, people, updateExpense, canEditCost, t, getName }) {
  const list = Array.isArray(remarks) ? remarks : [];
  const [personId, setPersonId] = useState(() => people[0]?.id || '');
  const [text, setText] = useState('');

  useEffect(() => {
    if (people.length === 0) return;
    if (!people.some((p) => p.id === personId)) {
      setPersonId(people[0].id);
    }
  }, [people, personId]);

  const add = () => {
    const trimmed = String(text || '').trim();
    if (!trimmed || !personId || !expenseId) return;
    updateExpense(expenseId, { settlementRemarks: [...list, { personId, text: trimmed }] });
    setText('');
  };

  return (
    <div className="settlement-remark-cell">
      <div className="settlement-remark-lines">
        {list.length === 0 ? (
          <span className="settlement-remark-empty">—</span>
        ) : (
          list.map((r, i) => (
            <p key={i} className="settlement-remark-line">
              <strong>{getName(r.personId)}:</strong> {r.text}
            </p>
          ))
        )}
      </div>
      {canEditCost && people.length > 0 && (
        <div className="settlement-remark-form">
          <label className="settlement-remark-sr-only" htmlFor={`sr-${expenseId}`}>
            {t('cost.selectRemarkAuthor')}
          </label>
          <select
            id={`sr-${expenseId}`}
            className="settlement-remark-select"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="settlement-remark-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('cost.remarkPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="settlement-remark-add-btn" onClick={add}>
            {t('cost.addRemark')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Settlement Summary ───────────────────────────────────────
function SettlementSummary() {
  const { t } = useLanguage();
  const {
    people,
    expenses,
    getRepaidSummary,
    CURRENCIES,
    updateExpense,
    canEditCost,
    bulkMarkSplitsRepaid,
    bulkRepayEvents,
  } = useCost();
  const [detailPersonId, setDetailPersonId] = useState(null);
  const [payerFilterId, setPayerFilterId] = useState(null);
  const [payerMenuOpen, setPayerMenuOpen] = useState(false);
  const payerFilterRef = useRef(null);
  const [debtorFilterId, setDebtorFilterId] = useState(null);
  const [debtorMenuOpen, setDebtorMenuOpen] = useState(false);
  const debtorFilterRef = useRef(null);
  const [paymentModalPayerId, setPaymentModalPayerId] = useState(null);
  const [bulkRepayOpen, setBulkRepayOpen] = useState(false);
  const [bulkRepayDate, setBulkRepayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkRepayAttach, setBulkRepayAttach] = useState(null);
  const [bulkRepayAttachError, setBulkRepayAttachError] = useState('');
  const bulkRepayFileRef = useRef(null);

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

  /** Per-expense rows: show if any non-payer split is still unpaid; list all non-payer splits (repaid + unpaid). */
  const outstandingExpenseRows = useMemo(() => {
    const rows = [];
    for (const e of expenses) {
      const whoOwesAll = [];
      (e.splits || []).forEach((s, si) => {
        if (s.personId === e.payerId) return;
        const cur = s.repayCurrency || e.paidCurrency;
        const amt = Number(s.convertedAmount ?? s.amount) || 0;
        if (amt <= 0.0001) return;
        whoOwesAll.push({
          splitIndex: si,
          personId: s.personId,
          name: getName(s.personId),
          amount: amt,
          currency: cur,
          repaid: !!s.repaid,
        });
      });
      const hasUnpaid = whoOwesAll.some((w) => !w.repaid);
      if (!hasUnpaid) continue;

      const unpaidByCurrency = {};
      whoOwesAll.forEach((w) => {
        if (w.repaid) return;
        unpaidByCurrency[w.currency] = (unpaidByCurrency[w.currency] || 0) + w.amount;
      });

      rows.push({
        id: e.id,
        payerId: e.payerId,
        description: (e.description || '').trim() || t('cost.untitledExpense'),
        category: e.category || '',
        date: e.date || '',
        payerName: getName(e.payerId),
        paidAmount: e.amount,
        paidCurrency: e.paidCurrency,
        whoOwesAll,
        unpaidByCurrency,
        settlementRemarks: Array.isArray(e.settlementRemarks) ? e.settlementRemarks : [],
      });
    }
    return rows;
  }, [expenses, getName, t]);

  const payersInOutstanding = useMemo(() => {
    const ids = [...new Set(outstandingExpenseRows.map((r) => r.payerId))];
    return ids
      .map((id) => ({ id, name: getName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [outstandingExpenseRows, getName]);

  const payerScopedRows = useMemo(() => {
    if (!payerFilterId) return outstandingExpenseRows;
    return outstandingExpenseRows.filter((r) => r.payerId === payerFilterId);
  }, [outstandingExpenseRows, payerFilterId]);

  const debtorsInOutstanding = useMemo(() => {
    const ids = new Set();
    for (const r of payerScopedRows) {
      for (const w of r.whoOwesAll) {
        if (!w.repaid) ids.add(w.personId);
      }
    }
    return [...ids]
      .map((id) => ({ id, name: getName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payerScopedRows, getName]);

  /**
   * When a payer is selected, also list people who only owe them in the reverse direction
   * (they paid bills where the selected payer still has an unpaid split) so contra / net still works.
   */
  const debtorsForPayerFilterUi = useMemo(() => {
    if (!payerFilterId) return debtorsInOutstanding;
    const ids = new Set(debtorsInOutstanding.map((d) => d.id));
    for (const e of expenses) {
      if (e.payerId === payerFilterId) {
        (e.splits || []).forEach((s) => {
          if (s.personId === e.payerId || s.repaid) return;
          ids.add(s.personId);
        });
      } else {
        (e.splits || []).forEach((s) => {
          if (s.personId === e.payerId || s.repaid) return;
          if (s.personId === payerFilterId) ids.add(e.payerId);
        });
      }
    }
    return [...ids]
      .map((id) => ({ id, name: getName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [debtorsInOutstanding, payerFilterId, expenses, getName]);

  const tableDisplayRows = useMemo(() => {
    if (!debtorFilterId) {
      return payerScopedRows.map((r) => ({
        ...r,
        whoOwesDisplay: r.whoOwesAll,
        unpaidByCurrencyRow: r.unpaidByCurrency,
      }));
    }
    return payerScopedRows
      .filter((r) => r.whoOwesAll.some((w) => w.personId === debtorFilterId && !w.repaid))
      .map((r) => {
        const whoOwesDisplay = r.whoOwesAll.filter((w) => w.personId === debtorFilterId);
        const unpaidByCurrencyRow = {};
        whoOwesDisplay.forEach((w) => {
          if (w.repaid) return;
          unpaidByCurrencyRow[w.currency] = (unpaidByCurrencyRow[w.currency] || 0) + w.amount;
        });
        return { ...r, whoOwesDisplay, unpaidByCurrencyRow };
      });
  }, [payerScopedRows, debtorFilterId]);

  const overallDebtorUnpaidByCurrency = useMemo(() => {
    if (!debtorFilterId) return {};
    const totals = {};
    for (const r of payerScopedRows) {
      for (const w of r.whoOwesAll) {
        if (w.personId !== debtorFilterId || w.repaid) continue;
        totals[w.currency] = (totals[w.currency] || 0) + w.amount;
      }
    }
    return totals;
  }, [payerScopedRows, debtorFilterId]);

  const bulkRepayTargets = useMemo(() => {
    if (!debtorFilterId) return [];
    const targets = [];
    for (const e of expenses) {
      if (payerFilterId && e.payerId !== payerFilterId) continue;
      (e.splits || []).forEach((s, i) => {
        if (s.personId === e.payerId || s.repaid || s.personId !== debtorFilterId) return;
        const amt = Number(s.convertedAmount ?? s.amount) || 0;
        if (amt <= 0.0001) return;
        targets.push({ expenseId: e.id, splitIndex: i });
      });
    }
    return targets;
  }, [expenses, payerFilterId, debtorFilterId]);

  /** Unpaid splits where debtorFilterId paid and payerFilterId owes them (reverse direction). */
  const counterpartyOwesDebtorByCurrency = useMemo(() => {
    if (!debtorFilterId || !payerFilterId) return {};
    const totals = {};
    for (const e of expenses) {
      if (e.payerId !== debtorFilterId) continue;
      (e.splits || []).forEach((s) => {
        if (s.personId === e.payerId || s.repaid) return;
        if (s.personId !== payerFilterId) return;
        const cur = s.repayCurrency || e.paidCurrency;
        const amt = Number(s.convertedAmount ?? s.amount) || 0;
        if (amt <= 0.0001) return;
        totals[cur] = (totals[cur] || 0) + amt;
      });
    }
    return totals;
  }, [expenses, debtorFilterId, payerFilterId]);

  /** Per currency: gross debtor→payer minus gross payer→debtor (no FX conversion). */
  const contraNetByCurrency = useMemo(() => {
    if (!debtorFilterId || !payerFilterId) return [];
    const grossDebtorOwes = overallDebtorUnpaidByCurrency;
    const grossPayerOwes = counterpartyOwesDebtorByCurrency;
    const keys = new Set([...Object.keys(grossDebtorOwes), ...Object.keys(grossPayerOwes)]);
    const lines = [];
    for (const cur of [...keys].sort()) {
      const a = grossDebtorOwes[cur] || 0;
      const b = grossPayerOwes[cur] || 0;
      if (a < 0.0001 && b < 0.0001) continue;
      const signed = a - b;
      let kind = 'even';
      if (signed > 0.005) kind = 'debtor_pays';
      else if (signed < -0.005) kind = 'payer_pays';
      lines.push({
        cur,
        grossDebtorOwes: a,
        grossPayerOwes: b,
        signed,
        absNet: Math.abs(signed),
        kind,
      });
    }
    return lines;
  }, [debtorFilterId, payerFilterId, overallDebtorUnpaidByCurrency, counterpartyOwesDebtorByCurrency]);

  useEffect(() => {
    if (!debtorFilterId) return;
    if (!debtorsForPayerFilterUi.some((d) => d.id === debtorFilterId)) {
      setDebtorFilterId(null);
    }
  }, [debtorFilterId, debtorsForPayerFilterUi]);

  useEffect(() => {
    if (!debtorMenuOpen) return;
    const close = (ev) => {
      if (debtorFilterRef.current && !debtorFilterRef.current.contains(ev.target)) {
        setDebtorMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [debtorMenuOpen]);

  useEffect(() => {
    if (!payerMenuOpen) return;
    const close = (ev) => {
      if (payerFilterRef.current && !payerFilterRef.current.contains(ev.target)) {
        setPayerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [payerMenuOpen]);

  useEffect(() => {
    if (!detailPersonId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailPersonId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailPersonId]);

  useEffect(() => {
    if (!bulkRepayOpen && !paymentModalPayerId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setBulkRepayOpen(false);
        setBulkRepayAttachError('');
        setPaymentModalPayerId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bulkRepayOpen, paymentModalPayerId]);

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

      {/* Outstanding — table + mobile cards */}
      {outstandingExpenseRows.length === 0 ? (
        <p className="cost-hint settlement-ok">✅ {t('cost.allSettledUp')}</p>
      ) : (
        <div className="settlement-block settlement-outstanding-block">
          <div className="settlement-outstanding-head">
            <h3 className="settlement-subtitle">⏳ {t('cost.outstanding')}</h3>
            <p className="settlement-outstanding-hint">{t('cost.outstandingTableHint')}</p>
          </div>

          <div className="settlement-os-mobile-filter">
            <label className="settlement-os-mobile-filter-label" htmlFor="settlement-payer-filter-m">
              {t('cost.colPayer')}
            </label>
            <select
              id="settlement-payer-filter-m"
              className="settlement-os-mobile-filter-select"
              value={payerFilterId ?? ''}
              onChange={(e) => setPayerFilterId(e.target.value || null)}
            >
              <option value="">{t('cost.payerFilterAll')}</option>
              {payersInOutstanding.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="settlement-os-mobile-filter settlement-os-mobile-filter-debtor">
            <label className="settlement-os-mobile-filter-label" htmlFor="settlement-debtor-filter-m">
              {t('cost.colOutstandingRepay')}
            </label>
            <select
              id="settlement-debtor-filter-m"
              className="settlement-os-mobile-filter-select"
              value={debtorFilterId ?? ''}
              onChange={(e) => setDebtorFilterId(e.target.value || null)}
            >
              <option value="">{t('cost.allDebtors')}</option>
              {debtorsForPayerFilterUi.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {Array.isArray(bulkRepayEvents) && bulkRepayEvents.length > 0 && (
            <div className="settlement-bulk-log animate-in">
              <h4 className="settlement-bulk-log-title">{t('cost.bulkRepaySummaryTitle')}</h4>
              <ul className="settlement-bulk-log-list">
                {[...bulkRepayEvents].reverse().slice(0, 12).map((ev) => (
                  <li key={ev.id} className="settlement-bulk-log-item">
                    {ev.creditorId
                      ? t('cost.bulkRepayLogLine', {
                          debtor: getName(ev.debtorId),
                          creditor: getName(ev.creditorId),
                          date: ev.repaidDate || '—',
                        })
                      : t('cost.bulkRepayLogLineMulti', {
                          debtor: getName(ev.debtorId),
                          date: ev.repaidDate || '—',
                        })}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="settlement-os-col-item">
                    {t('cost.colItem')}
                  </th>
                  <th
                    ref={payerFilterRef}
                    scope="col"
                    className="settlement-os-col-payer settlement-os-th-payer"
                  >
                    <button
                      type="button"
                      className="settlement-os-payer-filter-btn"
                      aria-expanded={payerMenuOpen}
                      aria-haspopup="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPayerMenuOpen((o) => !o);
                        setDebtorMenuOpen(false);
                      }}
                    >
                      <span className="settlement-os-payer-th-title">{t('cost.colPayer')}</span>
                      <span className="settlement-os-filter-chip">
                        {payerFilterId ? getName(payerFilterId) : t('cost.payerFilterAll')}
                      </span>
                      <span className="settlement-os-caret" aria-hidden>
                        {payerMenuOpen ? '▴' : '▾'}
                      </span>
                    </button>
                    {payerMenuOpen && (
                      <ul className="settlement-os-payer-menu" role="menu">
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="settlement-os-payer-menu-item"
                            onClick={() => {
                              setPayerFilterId(null);
                              setPayerMenuOpen(false);
                            }}
                          >
                            {t('cost.payerFilterAll')}
                          </button>
                        </li>
                        {payersInOutstanding.map((p) => (
                          <li key={p.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className="settlement-os-payer-menu-item"
                              onClick={() => {
                                setPayerFilterId(p.id);
                                setPayerMenuOpen(false);
                              }}
                            >
                              {p.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </th>
                  <th
                    ref={debtorFilterRef}
                    scope="col"
                    className="settlement-os-col-out settlement-os-th-debtor"
                  >
                    <button
                      type="button"
                      className="settlement-os-payer-filter-btn"
                      aria-expanded={debtorMenuOpen}
                      aria-haspopup="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDebtorMenuOpen((o) => !o);
                        setPayerMenuOpen(false);
                      }}
                    >
                      <span className="settlement-os-payer-th-title">{t('cost.colOutstandingRepay')}</span>
                      <span className="settlement-os-filter-chip">
                        {debtorFilterId ? getName(debtorFilterId) : t('cost.allDebtors')}
                      </span>
                      <span className="settlement-os-caret" aria-hidden>
                        {debtorMenuOpen ? '▴' : '▾'}
                      </span>
                    </button>
                    {debtorMenuOpen && (
                      <ul className="settlement-os-payer-menu settlement-os-debtor-menu" role="menu">
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="settlement-os-payer-menu-item"
                            onClick={() => {
                              setDebtorFilterId(null);
                              setDebtorMenuOpen(false);
                            }}
                          >
                            {t('cost.allDebtors')}
                          </button>
                        </li>
                        {debtorsForPayerFilterUi.map((p) => (
                          <li key={p.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className="settlement-os-payer-menu-item"
                              onClick={() => {
                                setDebtorFilterId(p.id);
                                setDebtorMenuOpen(false);
                              }}
                            >
                              {p.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </th>
                  <th scope="col" className="settlement-os-col-remarks">
                    {t('cost.colRemarks')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payerScopedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="settlement-os-empty-filter">
                      {t('cost.noExpensesForPayer')}
                    </td>
                  </tr>
                ) : tableDisplayRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="settlement-os-empty-filter">
                      {t('cost.noMatchingOutstanding')}
                    </td>
                  </tr>
                ) : (
                  tableDisplayRows.map((row) => {
                    const catIcon = EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.icon;
                    const payerPerson = people.find((p) => p.id === row.payerId);
                    const payerClickable = personHasPayableDetails(payerPerson);
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
                          <div className="settlement-os-payer-stack">
                            {payerClickable ? (
                              <button
                                type="button"
                                className="settlement-os-payer-name-btn"
                                onClick={() => setPaymentModalPayerId(row.payerId)}
                              >
                                {row.payerName}
                              </button>
                            ) : (
                              <span className="settlement-os-payer-name">{row.payerName}</span>
                            )}
                            <div className="settlement-os-paid-under">
                              <span className="settlement-os-money settlement-os-money-paid">
                                {getSymbol(row.paidCurrency)}
                                {Number(row.paidAmount).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="settlement-os-cur-code">{row.paidCurrency}</span>
                            </div>
                          </div>
                        </td>
                        <td className="settlement-os-col-out">
                          <div className="settlement-os-out-stack">
                            <div className="settlement-os-who">
                              <span className="settlement-os-who-label">
                                {t('cost.outstandingWhoBreakdown')}
                              </span>
                              <ul className="settlement-os-who-list">
                                {row.whoOwesDisplay.map((w, wi) => (
                                  <li
                                    key={`${row.id}-who-${wi}`}
                                    className={
                                      w.repaid
                                        ? 'settlement-os-who-repaid'
                                        : 'settlement-os-who-unpaid'
                                    }
                                  >
                                    {w.repaid && (
                                      <span className="settlement-os-long-dash" aria-hidden>
                                        ———————————————
                                      </span>
                                    )}
                                    <span className="settlement-os-who-line-main">
                                      <strong>{w.name}</strong>
                                      <span className="settlement-os-who-amt">
                                        {' '}
                                        {getSymbol(w.currency)}
                                        {w.amount.toFixed(2)} {w.currency}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="settlement-os-out-totals">
                              <div className="settlement-os-total-label">
                                {t('cost.totalOutstandingRepay')}
                              </div>
                              {Object.entries(row.unpaidByCurrencyRow).map(([cur, amt]) => (
                                <div key={cur} className="settlement-os-out-total-line">
                                  <span className="settlement-os-money settlement-os-money-out">
                                    {getSymbol(cur)}
                                    {amt.toFixed(2)}
                                  </span>
                                  <span className="settlement-os-cur-code">{cur}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="settlement-os-col-remarks">
                          <OutstandingRemarkEditor
                            expenseId={row.id}
                            remarks={row.settlementRemarks}
                            people={people}
                            updateExpense={updateExpense}
                            canEditCost={canEditCost}
                            t={t}
                            getName={getName}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {debtorFilterId && (
            <div className="settlement-os-bulk-bar">
              <div className="settlement-os-bulk-bar-inner">
                <div className="settlement-os-overall">
                  <span className="settlement-os-overall-label">{t('cost.overallOutstanding')}</span>
                  {payerFilterId && (
                    <span className="settlement-os-overall-sublabel">
                      {t('cost.overallOutstandingGrossToPayer', {
                        debtor: getName(debtorFilterId),
                        payer: getName(payerFilterId),
                      })}
                    </span>
                  )}
                  <div className="settlement-os-overall-pills">
                    {Object.keys(overallDebtorUnpaidByCurrency).length === 0 ? (
                      <span className="settlement-os-overall-zero">—</span>
                    ) : (
                      Object.entries(overallDebtorUnpaidByCurrency).map(([cur, amt]) => (
                        <span key={cur} className="settlement-os-overall-pill">
                          <strong>
                            {getSymbol(cur)}
                            {amt.toFixed(2)}
                          </strong>
                          <span className="settlement-os-cur-code">{cur}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {bulkRepayTargets.length > 0 && canEditCost && (
                  <button
                    type="button"
                    className="primary settlement-os-repay-all-btn"
                    onClick={() => {
                      setBulkRepayDate(new Date().toISOString().slice(0, 10));
                      setBulkRepayAttach(null);
                      setBulkRepayAttachError('');
                      if (bulkRepayFileRef.current) bulkRepayFileRef.current.value = '';
                      setBulkRepayOpen(true);
                    }}
                  >
                    {t('cost.repayAll')}
                  </button>
                )}
              </div>
              {!payerFilterId && (
                <p className="cost-hint settlement-os-contra-select-hint">{t('cost.contraSelectPayerHint')}</p>
              )}
              {payerFilterId && (
                <div className="settlement-os-contra-block">
                  <h4 className="settlement-os-contra-heading">{t('cost.contraPaymentTitle')}</h4>
                  <div className="settlement-os-contra-row">
                    <span className="settlement-os-contra-label">
                      {t('cost.counterpartyOwesYou', {
                        payer: getName(payerFilterId),
                        debtor: getName(debtorFilterId),
                      })}
                    </span>
                    <div className="settlement-os-overall-pills settlement-os-contra-pills">
                      {Object.keys(counterpartyOwesDebtorByCurrency).length === 0 ? (
                        <span className="settlement-os-overall-zero">—</span>
                      ) : (
                        Object.entries(counterpartyOwesDebtorByCurrency).map(([cur, amt]) => (
                          <span key={cur} className="settlement-os-overall-pill settlement-os-contra-pill">
                            <strong>
                              {getSymbol(cur)}
                              {amt.toFixed(2)}
                            </strong>
                            <span className="settlement-os-cur-code">{cur}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="settlement-os-net-block">
                    <span className="settlement-os-overall-label settlement-os-net-label">
                      {t('cost.netAfterContra')}
                    </span>
                    {contraNetByCurrency.length === 0 ? (
                      <span className="settlement-os-overall-zero">—</span>
                    ) : (
                      <ul className="settlement-os-net-list">
                        {contraNetByCurrency.map((line) => (
                          <li key={line.cur} className={`settlement-os-net-item settlement-os-net-${line.kind}`}>
                            <div className="settlement-os-net-cur">{line.cur}</div>
                            <div className="settlement-os-net-body">
                              <span className="settlement-os-net-math" title={t('cost.contraSetOff')}>
                                {getSymbol(line.cur)}
                                {line.grossDebtorOwes.toFixed(2)} − {getSymbol(line.cur)}
                                {line.grossPayerOwes.toFixed(2)}
                              </span>
                              {line.kind === 'debtor_pays' && (
                                <p className="settlement-os-net-result">
                                  <strong className="settlement-os-net-amt">
                                    {getSymbol(line.cur)}
                                    {line.absNet.toFixed(2)}
                                  </strong>
                                  <span className="settlement-os-net-desc">
                                    {t('cost.netYouPayCounterparty', {
                                      debtor: getName(debtorFilterId),
                                      payer: getName(payerFilterId),
                                    })}
                                  </span>
                                </p>
                              )}
                              {line.kind === 'payer_pays' && (
                                <p className="settlement-os-net-result">
                                  <strong className="settlement-os-net-amt">
                                    {getSymbol(line.cur)}
                                    {line.absNet.toFixed(2)}
                                  </strong>
                                  <span className="settlement-os-net-desc">
                                    {t('cost.netCounterpartyPaysYou', {
                                      payer: getName(payerFilterId),
                                      debtor: getName(debtorFilterId),
                                    })}
                                  </span>
                                </p>
                              )}
                              {line.kind === 'even' && (
                                <p className="settlement-os-net-result settlement-os-net-result-even">
                                  {t('cost.netEvenContra', { currency: line.cur })}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {payerFilterId && bulkRepayTargets.length > 0 && canEditCost && (
                <p className="cost-hint settlement-os-repay-gross-hint">{t('cost.repayAllGrossHint')}</p>
              )}
            </div>
          )}

          <div className="settlement-os-mobile-cards">
            {payerScopedRows.length === 0 ? (
              <p className="settlement-os-empty-filter settlement-os-empty-filter-card">
                {t('cost.noExpensesForPayer')}
              </p>
            ) : tableDisplayRows.length === 0 ? (
              <p className="settlement-os-empty-filter settlement-os-empty-filter-card">
                {t('cost.noMatchingOutstanding')}
              </p>
            ) : (
              tableDisplayRows.map((row) => {
                const catIcon = EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.icon;
                const payerPerson = people.find((p) => p.id === row.payerId);
                const payerClickable = personHasPayableDetails(payerPerson);
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
                        <dd>
                          <div className="settlement-os-payer-stack">
                            {payerClickable ? (
                              <button
                                type="button"
                                className="settlement-os-payer-name-btn"
                                onClick={() => setPaymentModalPayerId(row.payerId)}
                              >
                                {row.payerName}
                              </button>
                            ) : (
                              <span className="settlement-os-payer-name">{row.payerName}</span>
                            )}
                            <div className="settlement-os-paid-under">
                              <span className="settlement-os-money settlement-os-money-paid">
                                {getSymbol(row.paidCurrency)}
                                {Number(row.paidAmount).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                              </span>{' '}
                              <span className="settlement-os-cur-code">{row.paidCurrency}</span>
                            </div>
                          </div>
                        </dd>
                      </div>
                      <div className="settlement-os-card-out">
                        <dt>{t('cost.colOutstandingRepay')}</dt>
                        <dd>
                          <div className="settlement-os-who">
                            <span className="settlement-os-who-label">
                              {t('cost.outstandingWhoBreakdown')}
                            </span>
                            <ul className="settlement-os-who-list">
                              {row.whoOwesDisplay.map((w, wi) => (
                                <li
                                  key={`m-${row.id}-who-${wi}`}
                                  className={
                                    w.repaid
                                      ? 'settlement-os-who-repaid'
                                      : 'settlement-os-who-unpaid'
                                  }
                                >
                                  {w.repaid && (
                                    <span className="settlement-os-long-dash" aria-hidden>
                                      ———————————————
                                    </span>
                                  )}
                                  <span className="settlement-os-who-line-main">
                                    <strong>{w.name}</strong>
                                    <span className="settlement-os-who-amt">
                                      {' '}
                                      {getSymbol(w.currency)}
                                      {w.amount.toFixed(2)} {w.currency}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="settlement-os-out-totals">
                            <div className="settlement-os-total-label">
                              {t('cost.totalOutstandingRepay')}
                            </div>
                            {Object.entries(row.unpaidByCurrencyRow).map(([cur, amt]) => (
                              <div key={cur} className="settlement-os-out-total-line">
                                <span className="settlement-os-money settlement-os-money-out">
                                  {getSymbol(cur)}
                                  {amt.toFixed(2)}
                                </span>{' '}
                                <span className="settlement-os-cur-code">{cur}</span>
                              </div>
                            ))}
                          </div>
                        </dd>
                      </div>
                      <div className="settlement-os-card-remarks">
                        <dt>{t('cost.colRemarks')}</dt>
                        <dd>
                          <OutstandingRemarkEditor
                            expenseId={row.id}
                            remarks={row.settlementRemarks}
                            people={people}
                            updateExpense={updateExpense}
                            canEditCost={canEditCost}
                            t={t}
                            getName={getName}
                          />
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })
            )}
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

      {paymentModalPayerId &&
        personHasPayableDetails(people.find((p) => p.id === paymentModalPayerId)) && (
          <PayerPaymentDetailModal
            person={people.find((p) => p.id === paymentModalPayerId)}
            onClose={() => setPaymentModalPayerId(null)}
            t={t}
          />
        )}

      {bulkRepayOpen && debtorFilterId && (
        <div
          className="bulk-repay-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-repay-title"
          onClick={() => {
            setBulkRepayOpen(false);
            setBulkRepayAttachError('');
          }}
        >
          <div className="bulk-repay-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="bulk-repay-title">{t('cost.bulkRepayTitle')}</h3>
            <p className="bulk-repay-desc">{t('cost.bulkRepayDesc')}</p>
            <p className="bulk-repay-meta">
              <strong>{getName(debtorFilterId)}</strong>
              {payerFilterId ? (
                <>
                  {' → '}
                  <strong>{getName(payerFilterId)}</strong>
                </>
              ) : (
                <> · {t('cost.bulkRepayAllCreditors')}</>
              )}
            </p>
            <ul className="bulk-repay-totals">
              {Object.entries(overallDebtorUnpaidByCurrency).map(([cur, amt]) => (
                <li key={cur}>
                  {getSymbol(cur)}
                  {amt.toFixed(2)} {cur}
                </li>
              ))}
            </ul>
            <p className="bulk-repay-count">
              {t('cost.bulkRepaySplitCount', { n: bulkRepayTargets.length })}
            </p>
            <label className="bulk-repay-field">
              <span>{t('cost.repaidOn')}</span>
              <input
                type="date"
                value={bulkRepayDate}
                disabled={!canEditCost}
                onChange={(e) => setBulkRepayDate(e.target.value)}
              />
            </label>
            <label className="bulk-repay-attach attach-btn">
              <input
                ref={bulkRepayFileRef}
                type="file"
                accept="image/*,.pdf"
                disabled={!canEditCost}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  setBulkRepayAttachError('');
                  const file = e.target.files?.[0];
                  const inp = e.target;
                  try {
                    if (!file) return;
                    const att = await fileToSyncAttachment(file);
                    setBulkRepayAttach(att);
                  } catch (err) {
                    setBulkRepayAttachError(
                      err?.code === SYNC_FILE_ERROR_TOO_LARGE || err?.message === SYNC_FILE_ERROR_TOO_LARGE
                        ? t('cost.fileTooLargeForSync')
                        : t('cost.fileReadError')
                    );
                  } finally {
                    inp.value = '';
                  }
                }}
              />
              <span>
                {bulkRepayAttach ? `📎 ${bulkRepayAttach.name}` : `📎 ${t('cost.proof')}`}
              </span>
            </label>
            {bulkRepayAttachError ? <p className="ef-form-error bulk-repay-attach-error">{bulkRepayAttachError}</p> : null}
            <div className="bulk-repay-actions">
              <button
                type="button"
                className="primary"
                disabled={!canEditCost || bulkRepayTargets.length === 0}
                onClick={() => {
                  if (!debtorFilterId || bulkRepayTargets.length === 0) return;
                  bulkMarkSplitsRepaid(bulkRepayTargets, bulkRepayDate, bulkRepayAttach, {
                    debtorId: debtorFilterId,
                    creditorId: payerFilterId || null,
                    repaidDate: bulkRepayDate,
                  });
                  setBulkRepayOpen(false);
                  setBulkRepayAttach(null);
                  setBulkRepayAttachError('');
                  if (bulkRepayFileRef.current) bulkRepayFileRef.current.value = '';
                }}
              >
                {t('cost.confirm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkRepayOpen(false);
                  setBulkRepayAttach(null);
                  setBulkRepayAttachError('');
                  if (bulkRepayFileRef.current) bulkRepayFileRef.current.value = '';
                }}
              >
                {t('cost.cancel')}
              </button>
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
  const [paymentHighlightId, setPaymentHighlightId] = useState(null);

  useEffect(() => {
    if (!paymentHighlightId) return undefined;
    const el = document.getElementById(`traveller-payment-card-${paymentHighlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const timer = window.setTimeout(() => setPaymentHighlightId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [paymentHighlightId]);

  return (
    <div className="page cost-page">
      <header className="page-header">
        <h1>{t('cost.splitter')}</h1>
        <p className="page-intro-inline">{t('cost.intro')}</p>
      </header>
      <PeopleManager onAvatarScrollToPayment={(id) => setPaymentHighlightId(id)} />
      <TravellerPaymentDetails highlightPersonId={paymentHighlightId} />
      <AddExpenseForm />
      <DayExpenseView />
      <SettlementSummary />
    </div>
  );
}

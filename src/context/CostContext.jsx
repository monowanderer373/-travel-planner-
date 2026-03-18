import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadCost, saveCost } from '../utils/storage';
import { useSaveStatus } from './SaveStatusContext';

const CostContext = createContext(null);

export const CURRENCIES = [
  { code: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { code: 'MYR', label: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'SGD', label: 'Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { code: 'THB', label: 'Thai Baht (฿)', symbol: '฿' },
  { code: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'KRW', label: 'Korean Won (₩)', symbol: '₩' },
  { code: 'HKD', label: 'Hong Kong Dollar (HK$)', symbol: 'HK$' },
  { code: 'CNY', label: 'Chinese Yuan (¥)', symbol: 'CN¥' },
  { code: 'TWD', label: 'Taiwan Dollar (NT$)', symbol: 'NT$' },
];

function toFiniteNumber(val, fallback = 0) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSplit(s) {
  if (!s || typeof s !== 'object') return { personId: '', repaid: false };
  const repaid = s.repaid === true || s.repaid === 'true';
  const amount = s.amount == null ? null : toFiniteNumber(s.amount, NaN);
  const convertedAmount =
    s.convertedAmount == null ? null : (Number.isFinite(parseFloat(s.convertedAmount)) ? parseFloat(s.convertedAmount) : null);
  const rate = s.rate == null ? null : (Number.isFinite(parseFloat(s.rate)) ? parseFloat(s.rate) : null);
  const baseAmount = s.baseAmount == null ? null : (Number.isFinite(parseFloat(s.baseAmount)) ? parseFloat(s.baseAmount) : null);
  const taxAmount = s.taxAmount == null ? null : (Number.isFinite(parseFloat(s.taxAmount)) ? parseFloat(s.taxAmount) : null);

  return {
    ...s,
    personId: typeof s.personId === 'string' ? s.personId : (s.personId != null ? String(s.personId) : ''),
    repaid: !!repaid,
    amount: amount == null || !Number.isFinite(amount) ? null : amount,
    convertedAmount: convertedAmount == null || !Number.isFinite(convertedAmount) ? null : convertedAmount,
    rate: rate == null || !Number.isFinite(rate) ? null : rate,
    baseAmount: baseAmount == null || !Number.isFinite(baseAmount) ? null : baseAmount,
    taxAmount: taxAmount == null || !Number.isFinite(taxAmount) ? null : taxAmount,
    repaidDate: s.repaidDate || null,
    repaidAt: s.repaidAt || null,
    repaidAttachment: s.repaidAttachment || null,
    rateSource: s.rateSource || null,
    rateDate: s.rateDate || null,
  };
}

function normalizeExpense(e, i) {
  if (!e || typeof e !== 'object') return null;
  const id = e.id || `exp-legacy-${Date.now()}-${i}`;
  const amount = toFiniteNumber(e.amount, 0);
  const splitsRaw = Array.isArray(e.splits) ? e.splits : [];
  const splits = splitsRaw.map((s) => normalizeSplit(s));
  return {
    ...e,
    id,
    amount,
    splits,
  };
}

/**
 * Fetch exchange rate via Wise (no-auth attempt), then Frankfurter (ECB).
 * Returns { rate, source, date } or null.
 */
export async function fetchRate(fromCurrency, toCurrency, date = 'latest') {
  if (fromCurrency === toCurrency) return { rate: 1, source: 'same', date };

  // ── Attempt 1: Wise ──
  try {
    const wiseDate = date === 'latest' ? new Date().toISOString().slice(0, 10) : date;
    const res = await fetch(
      `https://api.wise.com/v1/rates?source=${fromCurrency}&target=${toCurrency}`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.rate) {
        return { rate: data[0].rate, source: 'Wise', date: wiseDate };
      }
    }
  } catch { /* fall through */ }

  // ── Attempt 2: Frankfurter (ECB, free, no key, supports JPY + MYR) ──
  try {
    const endpoint =
      date === 'latest'
        ? `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`
        : `https://api.frankfurter.app/${date}?from=${fromCurrency}&to=${toCurrency}`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.[toCurrency];
      if (rate) return { rate, source: 'Frankfurter (ECB)', date: data.date };
    }
  } catch { /* network error */ }

  return null;
}

function getInitialCost() {
  const loaded = loadCost();
  if (!loaded) return null;
  return {
    people: Array.isArray(loaded.people) ? loaded.people : [],
    expenses: Array.isArray(loaded.expenses)
      ? loaded.expenses.map((e, i) => normalizeExpense(e, i)).filter(Boolean)
      : [],
  };
}

export function CostProvider({ children }) {
  const initial = getInitialCost();
  const [people, setPeople] = useState(initial?.people ?? []);
  const [expenses, setExpenses] = useState(initial?.expenses ?? []);
  const [rateCache, setRateCache] = useState({});
  const { reportSaving, reportSaved } = useSaveStatus();
  const saveTimeoutRef = useRef(null);

  // ── People ───────────────────────────────────────────────────
  const defaultPaymentInfo = () => ({
    qrCode: null,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    notes: '',
    saved: false,
    savedAt: null,
  });

  const addPerson = useCallback((name) => {
    setPeople((prev) => [...prev, { id: `person-${Date.now()}`, name, paymentInfo: defaultPaymentInfo() }]);
  }, []);

  const updatePerson = useCallback((id, name) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const updatePersonPayment = useCallback((personId, paymentInfo) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? { ...p, paymentInfo: { ...(p.paymentInfo || defaultPaymentInfo()), ...paymentInfo } }
          : p
      )
    );
  }, []);

  const removePerson = useCallback((id) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Expenses ─────────────────────────────────────────────────
  const addExpense = useCallback((expense) => {
    setExpenses((prev) => [...prev, { ...expense, id: `exp-${Date.now()}` }]);
  }, []);

  const updateExpense = useCallback((id, updates) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const removeExpense = useCallback((id) => {
    if (!id) return;
    setExpenses((prev) =>
      prev
        .filter((e) => e.id !== id)
        .map((e, i) => normalizeExpense(e, i))
        .filter(Boolean)
    );
  }, []);

  // ── Repayment ─────────────────────────────────────────────────
  /** Mark a single split as repaid. attachment: { name, url } | null */
  const markSplitRepaid = useCallback((expenseId, splitIndex, repaidDate, attachment) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        return {
          ...e,
          splits: e.splits.map((s, i) =>
            i === splitIndex
              ? {
                  ...s,
                  repaid: true,
                  repaidAt: new Date().toISOString(),
                  repaidDate: repaidDate || new Date().toISOString().slice(0, 10),
                  repaidAttachment: attachment || null,
                }
              : s
          ),
        };
      })
    );
  }, []);

  const unmarkSplitRepaid = useCallback((expenseId, splitIndex) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        return {
          ...e,
          splits: e.splits.map((s, i) =>
            i === splitIndex
              ? { ...s, repaid: false, repaidAt: null, repaidDate: null, repaidAttachment: null }
              : s
          ),
        };
      })
    );
  }, []);

  // ── Rate cache ────────────────────────────────────────────────
  const getCachedRate = useCallback(
    (from, to, date) => rateCache[`${from}->${to}@${date}`] || null,
    [rateCache]
  );

  const setCachedRate = useCallback((from, to, date, rateData) => {
    setRateCache((prev) => ({ ...prev, [`${from}->${to}@${date}`]: rateData }));
  }, []);

  // ── Settlements ───────────────────────────────────────────────
  /** Outstanding debts only (non-repaid splits). */
  const getSettlements = useCallback(() => {
    const debts = {};
    for (const expense of expenses) {
      const payer = expense.payerId;
      for (const split of expense.splits || []) {
        if (split.personId === payer || split.repaid) continue;
        if (!debts[split.personId]) debts[split.personId] = {};
        if (!debts[split.personId][payer]) debts[split.personId][payer] = {};
        const cur = split.repayCurrency || expense.paidCurrency;
        const add = split.convertedAmount ?? split.amount;
        if (add == null || Number.isNaN(add)) continue;
        debts[split.personId][payer][cur] = (debts[split.personId][payer][cur] || 0) + add;
      }
    }
    const settlements = [];
    for (const [debtorId, creditors] of Object.entries(debts)) {
      for (const [creditorId, currencies] of Object.entries(creditors)) {
        for (const [currency, amount] of Object.entries(currencies)) {
          if (amount > 0.001) settlements.push({ debtorId, creditorId, currency, amount });
        }
      }
    }
    return settlements;
  }, [expenses]);

  /** Completed repayments for the "settled" section. */
  const getRepaidSummary = useCallback(() => {
    const repaid = [];
    for (const expense of expenses) {
      for (const split of expense.splits || []) {
        if (!split.repaid) continue;
        const amount = split.convertedAmount ?? split.amount;
        if (amount == null || Number.isNaN(amount)) continue;
        repaid.push({
          debtorId: split.personId,
          creditorId: expense.payerId,
          currency: split.repayCurrency || expense.paidCurrency,
          amount,
          repaidDate: split.repaidDate,
          repaidAttachment: split.repaidAttachment,
          description: expense.description,
        });
      }
    }
    return repaid;
  }, [expenses]);

  const replaceCostState = useCallback((data) => {
    if (!data) return;
    if (Array.isArray(data.people)) {
      setPeople(data.people.map((p) => ({
        ...p,
        paymentInfo: p.paymentInfo && typeof p.paymentInfo === 'object'
          ? { ...defaultPaymentInfo(), ...p.paymentInfo }
          : defaultPaymentInfo(),
      })));
    }
    if (Array.isArray(data.expenses)) {
      setExpenses(data.expenses.map((e, i) => normalizeExpense(e, i)).filter(Boolean));
    }
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    reportSaving();
    saveTimeoutRef.current = setTimeout(() => {
      saveCost({ people, expenses });
      reportSaved();
      saveTimeoutRef.current = null;
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [people, expenses]);

  const value = {
    people,
    addPerson,
    updatePerson,
    updatePersonPayment,
    removePerson,
    expenses,
    addExpense,
    updateExpense,
    removeExpense,
    markSplitRepaid,
    unmarkSplitRepaid,
    getCachedRate,
    setCachedRate,
    getSettlements,
    getRepaidSummary,
    replaceCostState,
    CURRENCIES,
  };

  return <CostContext.Provider value={value}>{children}</CostContext.Provider>;
}

export function useCost() {
  const ctx = useContext(CostContext);
  if (!ctx) throw new Error('useCost must be used within CostProvider');
  return ctx;
}

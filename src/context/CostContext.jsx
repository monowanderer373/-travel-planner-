import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useItinerary } from './ItineraryContext';
import { useAuth } from './AuthContext';
import { defaultPaymentInfo } from '../lib/costData';
import {
  buildCostMemberRoster,
  getPersonPaymentEditPolicy,
  getAvatarUrlForPerson,
  isUserTripCreator,
} from '../lib/costPersonIdentity';

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
export function CostProvider({ children }) {
  const {
    cost,
    replaceCostState: replaceCloudCostState,
    updateCostState,
    canEditCurrentPlan,
    tripmates,
    tripCreator,
    planMembers,
    shareSettings,
    isActivePlanOwner,
  } = useItinerary();
  const { user } = useAuth();
  const people = cost?.people ?? [];
  const expenses = cost?.expenses ?? [];
  const bulkRepayEvents = Array.isArray(cost?.bulkRepayEvents) ? cost.bulkRepayEvents : [];
  const [rateCache, setRateCache] = useState({});

  const memberRoster = useMemo(
    () => buildCostMemberRoster(tripCreator, tripmates, planMembers),
    [tripCreator, tripmates, planMembers]
  );

  const isTripCreator = useMemo(
    () => isUserTripCreator(user, tripCreator, shareSettings?.tripId, isActivePlanOwner),
    [user, tripCreator, shareSettings?.tripId, isActivePlanOwner]
  );

  const canEditPersonPaymentFor = useCallback(
    (personId) => {
      if (!canEditCurrentPlan) return false;
      const person = people.find((p) => p.id === personId);
      if (!person) return false;
      return getPersonPaymentEditPolicy(user, person, memberRoster, isTripCreator, true).canEdit;
    },
    [canEditCurrentPlan, people, user, memberRoster, isTripCreator]
  );

  const canEditTravellerNameFor = useCallback(
    (personId) => {
      if (!canEditCurrentPlan) return false;
      const person = people.find((p) => p.id === personId);
      if (!person) return false;
      const { canEdit } = getPersonPaymentEditPolicy(user, person, memberRoster, isTripCreator, true);
      return isTripCreator || canEdit;
    },
    [canEditCurrentPlan, people, user, memberRoster, isTripCreator]
  );

  const getTravellerAvatarUrlForPersonId = useCallback(
    (personId) => {
      const person = people.find((p) => p.id === personId);
      if (!person) return '';
      return getAvatarUrlForPerson(person, memberRoster);
    },
    [people, memberRoster]
  );

  const addPerson = useCallback((name) => {
    if (!canEditCurrentPlan) return;
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    updateCostState((prev) => ({
      ...prev,
      people: [
        ...(prev?.people || []),
        { id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: trimmed, paymentInfo: defaultPaymentInfo() },
      ],
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const updatePerson = useCallback(
    (id, name) => {
      if (!canEditCurrentPlan) return;
      updateCostState((prev) => {
        const ppl = prev?.people || [];
        const person = ppl.find((p) => p.id === id);
        if (!person) return prev;
        const roster = buildCostMemberRoster(tripCreator, tripmates, planMembers);
        const creator = isUserTripCreator(user, tripCreator, shareSettings?.tripId, isActivePlanOwner);
        const { canEdit } = getPersonPaymentEditPolicy(user, person, roster, creator, true);
        if (!creator && !canEdit) return prev;
        return {
          ...prev,
          people: ppl.map((p) => (p.id === id ? { ...p, name } : p)),
        };
      });
    },
    [canEditCurrentPlan, updateCostState, user, tripCreator, tripmates, planMembers, shareSettings?.tripId, isActivePlanOwner]
  );

  const updatePersonPayment = useCallback(
    (personId, paymentInfo) => {
      if (!canEditCurrentPlan) return;
      updateCostState((prev) => {
        const ppl = prev?.people || [];
        const person = ppl.find((p) => p.id === personId);
        if (!person) return prev;
        const roster = buildCostMemberRoster(tripCreator, tripmates, planMembers);
        const creator = isUserTripCreator(user, tripCreator, shareSettings?.tripId, isActivePlanOwner);
        const { canEdit } = getPersonPaymentEditPolicy(user, person, roster, creator, true);
        if (!canEdit) return prev;
        return {
          ...prev,
          people: ppl.map((p) =>
            p.id === personId
              ? { ...p, paymentInfo: { ...(p.paymentInfo || defaultPaymentInfo()), ...paymentInfo } }
              : p
          ),
        };
      });
    },
    [canEditCurrentPlan, updateCostState, user, tripCreator, tripmates, planMembers, shareSettings?.tripId, isActivePlanOwner]
  );

  const removePerson = useCallback((id) => {
    if (!canEditCurrentPlan) return;
    updateCostState((prev) => ({
      ...prev,
      people: (prev?.people || []).filter((p) => p.id !== id),
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const addExpense = useCallback((expense) => {
    if (!canEditCurrentPlan) return;
    updateCostState((prev) => ({
      ...prev,
      expenses: [...(prev?.expenses || []), { ...expense, id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }],
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const updateExpense = useCallback((id, updates) => {
    if (!canEditCurrentPlan) return;
    updateCostState((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const removeExpense = useCallback((id) => {
    if (!canEditCurrentPlan || !id) return;
    updateCostState((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).filter((e) => e.id !== id),
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const removeExpensesForPersonId = useCallback((personId) => {
    if (!canEditCurrentPlan || !personId) return;
    updateCostState((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).filter((e) => {
          if (!e || typeof e !== 'object') return false;
          if (e.payerId === personId) return false;
          const splits = Array.isArray(e.splits) ? e.splits : [];
          const used = splits.some((s) => s && typeof s === 'object' && s.personId === personId);
          return !used;
        }),
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const markSplitRepaid = useCallback((expenseId, splitIndex, repaidDate, attachment) => {
    if (!canEditCurrentPlan) return;
    updateCostState((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).map((e) => {
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
      }),
    }));
  }, [canEditCurrentPlan, updateCostState]);

  const unmarkSplitRepaid = useCallback((expenseId, splitIndex) => {
    if (!canEditCurrentPlan) return;
    updateCostState((prev) => ({
      ...prev,
      expenses: (prev?.expenses || []).map((e) => {
        if (e.id !== expenseId) return e;
        return {
          ...e,
          splits: e.splits.map((s, i) =>
            i === splitIndex
              ? { ...s, repaid: false, repaidAt: null, repaidDate: null, repaidAttachment: null }
              : s
          ),
        };
      }),
    }));
  }, [canEditCurrentPlan, updateCostState]);

  /**
   * Mark many splits repaid in one action (e.g. settlement "Repay all").
   * @param {Array<{ expenseId: string, splitIndex: number }>} targets
   * @param {object|null} logEntry - appended to bulkRepayEvents if provided
   */
  const bulkMarkSplitsRepaid = useCallback(
    (targets, repaidDate, attachment, logEntry) => {
      if (!canEditCurrentPlan || !Array.isArray(targets) || targets.length === 0) return;
      const byExp = new Map();
      for (const t of targets) {
        if (!t?.expenseId || t.splitIndex == null) continue;
        if (!byExp.has(t.expenseId)) byExp.set(t.expenseId, new Set());
        byExp.get(t.expenseId).add(t.splitIndex);
      }
      if (byExp.size === 0) return;
      const dateStr = repaidDate || new Date().toISOString().slice(0, 10);
      updateCostState((prev) => {
        const prevPeople = prev?.people || [];
        const prevEvents = Array.isArray(prev?.bulkRepayEvents) ? prev.bulkRepayEvents : [];
        const nextExpenses = (prev?.expenses || []).map((e) => {
          const idxSet = byExp.get(e.id);
          if (!idxSet) return e;
          return {
            ...e,
            splits: e.splits.map((s, i) => {
              if (!idxSet.has(i) || s.repaid) return s;
              return {
                ...s,
                repaid: true,
                repaidAt: new Date().toISOString(),
                repaidDate: dateStr,
                repaidAttachment: attachment || null,
              };
            }),
          };
        });
        const nextEvents =
          logEntry && typeof logEntry === 'object'
            ? [
                ...prevEvents,
                {
                  ...logEntry,
                  id: logEntry.id || `bulk-${Date.now()}`,
                  at: new Date().toISOString(),
                },
              ]
            : prevEvents;
        return {
          ...prev,
          people: prevPeople,
          expenses: nextExpenses,
          bulkRepayEvents: nextEvents,
        };
      });
    },
    [canEditCurrentPlan, updateCostState]
  );

  const getCachedRate = useCallback(
    (from, to, date) => rateCache[`${from}->${to}@${date}`] || null,
    [rateCache]
  );

  const setCachedRate = useCallback((from, to, date, rateData) => {
    setRateCache((prev) => ({ ...prev, [`${from}->${to}@${date}`]: rateData }));
  }, []);

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
    replaceCloudCostState(data);
  }, [replaceCloudCostState]);

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
    removeExpensesForPersonId,
    markSplitRepaid,
    unmarkSplitRepaid,
    bulkMarkSplitsRepaid,
    bulkRepayEvents,
    getCachedRate,
    setCachedRate,
    getSettlements,
    getRepaidSummary,
    replaceCostState,
    canEditCost: canEditCurrentPlan,
    canEditPersonPaymentFor,
    canEditTravellerNameFor,
    getTravellerAvatarUrlForPersonId,
    CURRENCIES,
  };

  return <CostContext.Provider value={value}>{children}</CostContext.Provider>;
}

export function useCost() {
  const ctx = useContext(CostContext);
  if (!ctx) throw new Error('useCost must be used within CostProvider');
  return ctx;
}

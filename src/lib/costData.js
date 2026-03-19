export function defaultPaymentInfo() {
  return {
    qrCode: null,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    notes: '',
    saved: false,
    savedAt: null,
  };
}

export function defaultCostData() {
  return {
    people: [],
    expenses: [],
  };
}

function toFiniteNumber(val, fallback = 0) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSplit(split) {
  if (!split || typeof split !== 'object') return { personId: '', repaid: false };
  const repaid = split.repaid === true || split.repaid === 'true';
  const amount = split.amount == null ? null : toFiniteNumber(split.amount, NaN);
  const convertedAmount =
    split.convertedAmount == null ? null : (Number.isFinite(parseFloat(split.convertedAmount)) ? parseFloat(split.convertedAmount) : null);
  const rate = split.rate == null ? null : (Number.isFinite(parseFloat(split.rate)) ? parseFloat(split.rate) : null);
  const baseAmount = split.baseAmount == null ? null : (Number.isFinite(parseFloat(split.baseAmount)) ? parseFloat(split.baseAmount) : null);
  const taxAmount = split.taxAmount == null ? null : (Number.isFinite(parseFloat(split.taxAmount)) ? parseFloat(split.taxAmount) : null);

  return {
    ...split,
    personId: typeof split.personId === 'string' ? split.personId : (split.personId != null ? String(split.personId) : ''),
    repaid: !!repaid,
    amount: amount == null || !Number.isFinite(amount) ? null : amount,
    convertedAmount: convertedAmount == null || !Number.isFinite(convertedAmount) ? null : convertedAmount,
    rate: rate == null || !Number.isFinite(rate) ? null : rate,
    baseAmount: baseAmount == null || !Number.isFinite(baseAmount) ? null : baseAmount,
    taxAmount: taxAmount == null || !Number.isFinite(taxAmount) ? null : taxAmount,
    repaidDate: split.repaidDate || null,
    repaidAt: split.repaidAt || null,
    repaidAttachment: split.repaidAttachment || null,
    rateSource: split.rateSource || null,
    rateDate: split.rateDate || null,
  };
}

function normalizeExpense(expense, index) {
  if (!expense || typeof expense !== 'object') return null;
  const id = expense.id || `exp-legacy-${Date.now()}-${index}`;
  const amount = toFiniteNumber(expense.amount, 0);
  const splitsRaw = Array.isArray(expense.splits) ? expense.splits : [];
  const splits = splitsRaw.map((split) => normalizeSplit(split));
  return {
    ...expense,
    id,
    amount,
    splits,
  };
}

function normalizePerson(person, index) {
  if (!person || typeof person !== 'object') return null;
  const name = String(person.name || '').trim();
  if (!name) return null;
  return {
    ...person,
    id: String(person.id || `person-legacy-${Date.now()}-${index}`),
    name,
    paymentInfo:
      person.paymentInfo && typeof person.paymentInfo === 'object'
        ? { ...defaultPaymentInfo(), ...person.paymentInfo }
        : defaultPaymentInfo(),
  };
}

export function normalizeCostData(data) {
  if (!data || typeof data !== 'object') return defaultCostData();
  const people = Array.isArray(data.people)
    ? data.people.map((person, index) => normalizePerson(person, index)).filter(Boolean)
    : [];
  const expenses = Array.isArray(data.expenses)
    ? data.expenses.map((expense, index) => normalizeExpense(expense, index)).filter(Boolean)
    : [];
  return { people, expenses };
}

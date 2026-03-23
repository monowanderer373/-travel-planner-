import { isPersistableMediaUrl } from './syncFileAttachment';

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
    bulkRepayEvents: [],
  };
}

function sanitizeReceiptLike(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const name = typeof obj.name === 'string' ? obj.name : 'attachment';
  const url = typeof obj.url === 'string' ? obj.url : '';
  if (!url || !isPersistableMediaUrl(url)) return null;
  return { name, url };
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
    repaidAttachment: sanitizeReceiptLike(split.repaidAttachment),
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
    receipt: sanitizeReceiptLike(expense.receipt),
  };
}

function normalizePerson(person, index) {
  if (!person || typeof person !== 'object') return null;
  const name = String(person.name || '').trim();
  if (!name) return null;
  const paymentInfo =
    person.paymentInfo && typeof person.paymentInfo === 'object'
      ? { ...defaultPaymentInfo(), ...person.paymentInfo }
      : defaultPaymentInfo();
  const qr = paymentInfo.qrCode;
  if (typeof qr === 'string' && qr && !isPersistableMediaUrl(qr)) {
    paymentInfo.qrCode = null;
  }
  return {
    ...person,
    id: String(person.id || `person-legacy-${Date.now()}-${index}`),
    name,
    paymentInfo,
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
  const bulkRepayEvents = Array.isArray(data.bulkRepayEvents)
    ? data.bulkRepayEvents.filter((ev) => ev && typeof ev === 'object')
    : [];
  return { people, expenses, bulkRepayEvents };
}

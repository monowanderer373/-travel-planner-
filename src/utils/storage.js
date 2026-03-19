const ITINERARY_KEY = 'trip-planner-itinerary';
const COST_KEY = 'trip-planner-cost';
const USER_KEY = 'trip-planner-user';
const VERSION = 1;

function safeParse(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const data = JSON.parse(raw);
    if (data?.version !== VERSION) return defaultValue;
    return data.payload ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeStringify(payload) {
  try {
    return JSON.stringify({ version: VERSION, payload });
  } catch {
    return null;
  }
}

export function loadItinerary() {
  return safeParse(ITINERARY_KEY, null);
}

export function saveItinerary(payload) {
  const s = safeStringify(payload);
  if (s) localStorage.setItem(ITINERARY_KEY, s);
}

export function loadCost() {
  return safeParse(COST_KEY, null);
}

export function saveCost(payload) {
  const s = safeStringify(payload);
  if (s) localStorage.setItem(COST_KEY, s);
}

export function clearAllTripData() {
  localStorage.removeItem(ITINERARY_KEY);
  localStorage.removeItem(COST_KEY);
}

export function getAllTripData() {
  const itinerary = safeParse(ITINERARY_KEY, null);
  const legacyCost = safeParse(COST_KEY, null);
  return {
    itinerary,
    cost: itinerary?.cost ?? legacyCost,
  };
}

export function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

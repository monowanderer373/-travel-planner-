const ITINERARY_KEY = 'trip-planner-itinerary';
const COST_KEY = 'trip-planner-cost';
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
  return {
    itinerary: safeParse(ITINERARY_KEY, null),
    cost: safeParse(COST_KEY, null),
  };
}

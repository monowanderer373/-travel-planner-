/**
 * Keep ?plan= / ?trip= / ?share= / ?invite= when switching tabs so guest stable plans don't "disappear".
 * @param {string} pathname - e.g. '/itinerary'
 * @param {string} search - location.search from useLocation()
 */
export function toWithPreservedSearch(pathname, search) {
  const q = typeof search === 'string' ? search : '';
  if (!q) return pathname;
  return { pathname, search: q };
}

export const ACTIVE_PLAN_SESSION_KEY = 'wander_active_plan_id';

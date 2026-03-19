/**
 * Canonical JSON for comparing itinerary payloads (Realtime echo vs local state).
 */

function stableStringify(v) {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

export function normalizeItineraryPayload(data) {
  if (!data || typeof data !== 'object') return {};
  return {
    trip: data.trip,
    days: data.days,
    savedPlaces: data.savedPlaces,
    savedTransports: data.savedTransports,
    cost: data.cost,
    tripmates: data.tripmates,
    tripCreator: data.tripCreator,
    tripMemories: data.tripMemories,
    shareSettings: data.shareSettings,
    tripmateShareLink: data.tripmateShareLink,
  };
}

function dropUndefinedDeep(v) {
  if (v === undefined) return undefined;
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    return v.map(dropUndefinedDeep).filter((x) => x !== undefined);
  }
  const o = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === undefined) continue;
    const x = dropUndefinedDeep(val);
    if (x !== undefined) o[k] = x;
  }
  return o;
}

export function itineraryPayloadCanonical(data) {
  try {
    const raw = normalizeItineraryPayload(data);
    const cleaned = dropUndefinedDeep(raw);
    return stableStringify(cleaned);
  } catch {
    return '';
  }
}

export function itineraryPayloadsEqual(a, b) {
  if (!a || !b) return false;
  return itineraryPayloadCanonical(a) === itineraryPayloadCanonical(b);
}

/** Resolve target day after days[] may have been resynced (ids rotated). */
export function resolveDayForTimelineAdd(days, dayId, dayIndex) {
  if (!days?.length) return null;
  const idx =
    typeof dayIndex === 'number' && dayIndex >= 0 && dayIndex < days.length ? dayIndex : -1;
  if (idx >= 0) {
    const byIndex = days[idx];
    if (byIndex && (!dayId || byIndex.id === dayId)) return byIndex;
  }
  const byId = days.find((d) => d.id === dayId);
  if (byId) return byId;
  if (idx >= 0) return days[idx];
  return days[0];
}

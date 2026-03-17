/**
 * Writes to shared_itineraries without PostgREST upsert (some projects return 400 on ?on_conflict=).
 */
function stripUndefinedDeep(v) {
  if (v === undefined) return undefined;
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    return v.map(stripUndefinedDeep).filter((x) => x !== undefined);
  }
  const o = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === undefined) continue;
    const x = stripUndefinedDeep(val);
    if (x !== undefined) o[k] = x;
  }
  return o;
}

function compactIfHuge(data) {
  try {
    const s = JSON.stringify(data);
    if (s.length < 1_000_000) return data;
  } catch {
    return data;
  }
  const copy = JSON.parse(JSON.stringify(data));
  if (Array.isArray(copy.savedPlaces)) {
    copy.savedPlaces = copy.savedPlaces.slice(0, 80).map((p) => ({
      ...p,
      reviews: Array.isArray(p.reviews) ? p.reviews.slice(0, 2) : [],
    }));
  }
  if (Array.isArray(copy.days)) {
    copy.days = copy.days.map((d) => ({
      ...d,
      timeline: Array.isArray(d.timeline) ? d.timeline.slice(0, 200) : d.timeline,
    }));
  }
  return copy;
}

export function sanitizePayloadForJsonb(payload) {
  const stripped = stripUndefinedDeep(payload);
  let data = JSON.parse(
    JSON.stringify(stripped, (k, v) => {
      if (typeof v === 'string') return v.replace(/\u0000/g, '');
      if (typeof v === 'bigint') return v.toString();
      return v;
    })
  );
  return compactIfHuge(data);
}

export async function writeSharedItineraryRow(supabase, tripId, payload) {
  if (!supabase || !tripId) return { error: new Error('missing supabase or tripId') };
  let data;
  try {
    data = sanitizePayloadForJsonb(payload);
  } catch (e) {
    return { error: e };
  }
  const updated_at = new Date().toISOString();

  const { data: existing, error: selErr } = await supabase
    .from('shared_itineraries')
    .select('id')
    .eq('id', tripId)
    .maybeSingle();
  if (selErr) return { error: selErr };

  if (existing?.id) {
    const { error: e1 } = await supabase.from('shared_itineraries').update({ data }).eq('id', tripId);
    if (!e1) return { error: null };
    const { error: e2 } = await supabase
      .from('shared_itineraries')
      .update({ data, updated_at })
      .eq('id', tripId);
    if (!e2) return { error: null };
    return { error: e1 };
  }

  const { error: insErr } = await supabase.from('shared_itineraries').insert({ id: tripId, data });
  if (!insErr) return { error: null };

  const code = insErr.code || '';
  const msg = String(insErr.message || '').toLowerCase();
  if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
    const { error } = await supabase.from('shared_itineraries').update({ data, updated_at }).eq('id', tripId);
    return { error };
  }
  return { error: insErr };
}

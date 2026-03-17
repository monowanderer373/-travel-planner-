/**
 * Writes to shared_itineraries without PostgREST upsert (some projects return 400 on ?on_conflict=).
 * Uses select → insert OR update.
 */
export function sanitizePayloadForJsonb(payload) {
  return JSON.parse(
    JSON.stringify(payload, (k, v) => {
      if (typeof v === 'string') return v.replace(/\u0000/g, '');
      if (typeof v === 'bigint') return v.toString();
      return v;
    })
  );
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
    const { error } = await supabase.from('shared_itineraries').update({ data, updated_at }).eq('id', tripId);
    return { error };
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

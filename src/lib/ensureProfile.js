/**
 * Itineraries.profile_id references profiles(id). If we INSERT into itineraries
 * before the profile row exists, Postgres rejects it — and the app was swallowing
 * that error, so cloud stayed empty and phones saw no data.
 */
export async function ensureProfileExists(supabase, user) {
  if (!supabase || !user?.id || String(user.id).startsWith('user-')) {
    return { ok: false, error: new Error('no supabase user') };
  }
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      name: user.name || null,
      email: user.email || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) {
    if (import.meta.env.DEV) console.warn('[ensureProfileExists]', error);
    return { ok: false, error };
  }
  return { ok: true };
}

/**
 * Log a trip activity to Supabase (for shared trips). No-op if not Supabase or no tripId.
 */
export async function logTripActivity(supabase, tripId, userName, userId, actionType, details = {}) {
  if (!supabase || !tripId || !actionType) return;
  try {
    await supabase.from('trip_activities').insert({
      trip_id: tripId,
      user_name: userName || 'Someone',
      user_id: userId || null,
      action_type: actionType,
      details: typeof details === 'object' ? details : {},
    });
  } catch (_) {}
}

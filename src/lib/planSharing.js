function randomToken() {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid.replace(/-/g, '').slice(0, 24);
  } catch {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.slice(0, 24);
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function buildPlanShareSummary(data) {
  const trip = data?.trip && typeof data.trip === 'object' ? data.trip : {};
  const destination = String(trip.destination || '').trim();
  const title = String(trip.title || destination || '').trim() || null;
  return {
    plan_title: title,
    destination: destination || null,
    start_date: safeDate(trip.startDate),
    end_date: safeDate(trip.endDate),
  };
}

export async function ensureOwnerMembership(supabase, planId, ownerId) {
  if (!supabase || !planId || !ownerId) return;
  await supabase
    .from('plan_members')
    .upsert(
      {
        plan_id: planId,
        user_id: ownerId,
        role: 'owner',
        joined_via: 'owner',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plan_id,user_id' }
    );
}

export async function ensureStablePlanShare(
  supabase,
  {
    planId,
    ownerProfileId,
    existingToken,
    sharingEnabled = true,
    linkAccess = 'invited',
    linkPermission = 'edit',
    data = {},
    forceNewToken = false,
  }
) {
  if (!supabase || !planId || !ownerProfileId) {
    return { error: new Error('missing plan share params') };
  }
  const token = forceNewToken || !existingToken ? randomToken() : String(existingToken).trim();
  const summary = buildPlanShareSummary(data);
  const updated_at = new Date().toISOString();

  const { error: itErr } = await supabase
    .from('itineraries')
    .update({
      share_token: token,
      sharing_enabled: !!sharingEnabled,
      link_access: linkAccess || 'invited',
      link_permission: linkPermission || 'edit',
      revoked_at: forceNewToken ? null : undefined,
      owner_profile_id: ownerProfileId,
      updated_at,
    })
    .eq('id', planId)
    .eq('profile_id', ownerProfileId);
  if (itErr) return { error: itErr };

  const { error: shareErr } = await supabase
    .from('plan_shares')
    .upsert(
      {
        token,
        plan_id: planId,
        owner_profile_id: ownerProfileId,
        ...summary,
        access_mode: linkAccess || 'invited',
        permission_mode: linkPermission || 'edit',
        is_active: !!sharingEnabled,
        updated_at,
      },
      { onConflict: 'token' }
    );
  if (shareErr) return { error: shareErr };

  await ensureOwnerMembership(supabase, planId, ownerProfileId);
  return { error: null, token };
}

export async function revokeStablePlanShare(supabase, { planId, ownerProfileId }) {
  if (!supabase || !planId || !ownerProfileId) return { error: new Error('missing revoke params') };
  const updated_at = new Date().toISOString();
  const { data: row, error: selErr } = await supabase
    .from('itineraries')
    .select('share_token')
    .eq('id', planId)
    .eq('profile_id', ownerProfileId)
    .maybeSingle();
  if (selErr) return { error: selErr };

  const token = row?.share_token;
  const { error: itErr } = await supabase
    .from('itineraries')
    .update({ sharing_enabled: false, revoked_at: updated_at, updated_at })
    .eq('id', planId)
    .eq('profile_id', ownerProfileId);
  if (itErr) return { error: itErr };

  if (token) {
    const { error: shareErr } = await supabase
      .from('plan_shares')
      .update({ is_active: false, updated_at })
      .eq('token', token)
      .eq('owner_profile_id', ownerProfileId);
    if (shareErr) return { error: shareErr };
  }
  return { error: null, token: token || '' };
}

export async function loadPlanSharePreview(supabase, token) {
  if (!supabase || !token) return { error: new Error('missing preview token') };
  return supabase
    .from('plan_shares')
    .select('token, plan_id, owner_profile_id, plan_title, destination, start_date, end_date, access_mode, permission_mode, is_active')
    .eq('token', token)
    .maybeSingle();
}

export async function joinPlanMember(
  supabase,
  {
    token,
    userId,
    joinedVia = 'link',
  }
) {
  if (!supabase || !token || !userId) return { error: new Error('missing join params') };
  const { data: share, error: shareErr } = await loadPlanSharePreview(supabase, token);
  if (shareErr) return { error: shareErr };
  if (!share?.plan_id || !share?.is_active) return { error: new Error('share_not_found') };

  const role = share.permission_mode === 'edit' ? 'editor' : 'viewer';
  const { error } = await supabase
    .from('plan_members')
    .upsert(
      {
        plan_id: share.plan_id,
        user_id: userId,
        role,
        joined_via: joinedVia,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plan_id,user_id' }
    );
  return { error, share };
}

export async function listPlansForUser(supabase, userId) {
  if (!supabase || !userId) return { owned: [], guest: [], error: new Error('missing list params') };

  const ownedRes = await supabase
    .from('itineraries')
    .select('*')
    .or(`profile_id.eq.${userId},owner_profile_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(50);

  const memberRes = await supabase
    .from('plan_members')
    .select('plan_id, role, joined_via, updated_at, itineraries!inner(*)')
    .eq('user_id', userId)
    .neq('role', 'owner')
    .order('updated_at', { ascending: false })
    .limit(50);

  const owned = Array.isArray(ownedRes.data)
    ? ownedRes.data.map((row) => ({
        ...row,
        owner_profile_id: row.profile_id,
        membershipRole: 'owner',
        memberType: 'owner',
      }))
    : [];

  const guest = Array.isArray(memberRes.data)
    ? memberRes.data
        .map((row) => {
          const plan = row?.itineraries;
          if (!plan || typeof plan !== 'object') return null;
          return {
            ...plan,
            owner_profile_id: plan.profile_id,
            link_permission: plan.link_permission || (row.role === 'editor' ? 'edit' : 'view'),
            membershipRole: row.role || 'viewer',
            memberType: 'guest',
            joinedVia: row.joined_via || 'invite',
          };
        })
        .filter(Boolean)
    : [];

  // If the migration hasn't been applied yet, the missing table error is expected.
  const memberError = memberRes.error && !/plan_members/i.test(String(memberRes.error?.message || ''))
    ? memberRes.error
    : null;

  return {
    owned,
    guest,
    error: ownedRes.error || memberError || null,
  };
}

export async function loadPlanMembers(supabase, planId) {
  if (!supabase || !planId) return { members: [], error: new Error('missing plan id') };
  const { data, error } = await supabase
    .from('plan_members')
    .select('user_id, role, joined_via, profiles!inner(id, name, email, bio, avatar_url)')
    .eq('plan_id', planId)
    .order('created_at', { ascending: true });

  if (error) {
    if (/plan_members|profiles/i.test(String(error?.message || ''))) return { members: [], error: null };
    return { members: [], error };
  }

  const members = Array.isArray(data)
    ? data
        .map((row) => {
          const profile = row?.profiles;
          if (!profile || typeof profile !== 'object') return null;
          return {
            userId: String(profile.id || row.user_id || '').trim(),
            name: String(profile.name || profile.email || 'Traveler').trim(),
            email: String(profile.email || '').trim(),
            bio: String(profile.bio || '').trim(),
            avatarUrl: String(profile.avatar_url || '').trim(),
            role: row.role || 'viewer',
            joinedVia: row.joined_via || 'invite',
          };
        })
        .filter(Boolean)
    : [];

  return { members, error: null };
}

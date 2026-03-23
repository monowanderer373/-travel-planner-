/**
 * Map Cost "travellers" (people[]) to plan/trip members for avatars & edit permissions.
 */

export function normTravelerKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * @returns {Array<{ norm: string, userId: string, email: string, avatarUrl: string, displayName: string }>}
 */
export function buildCostMemberRoster(tripCreator, tripmates, planMembers) {
  const rows = [];
  if (Array.isArray(planMembers) && planMembers.length > 0) {
    for (const m of planMembers) {
      const name = String(m?.name || m?.email || '').trim();
      if (!name) continue;
      rows.push({
        norm: normTravelerKey(name),
        userId: String(m?.userId || '').trim(),
        email: String(m?.email || '').trim().toLowerCase(),
        avatarUrl: String(m?.avatarUrl || '').trim(),
        displayName: name,
      });
    }
    return rows;
  }
  if (tripCreator?.name) {
    const name = String(tripCreator.name).trim();
    if (name) {
      rows.push({
        norm: normTravelerKey(name),
        userId: String(tripCreator.userId || tripCreator.id || '').trim(),
        email: String(tripCreator.email || '').trim().toLowerCase(),
        avatarUrl: String(tripCreator.avatarUrl || tripCreator.photoURL || '').trim(),
        displayName: name,
      });
    }
  }
  for (const m of tripmates || []) {
    const name = String(m?.name || m?.email || '').trim();
    if (!name) continue;
    rows.push({
      norm: normTravelerKey(name),
      userId: String(m?.userId || '').trim(),
      email: String(m?.email || '').trim().toLowerCase(),
      avatarUrl: String(m?.avatarUrl || '').trim(),
      displayName: name,
    });
  }
  return rows;
}

export function findMembersMatchingPersonName(personName, roster) {
  const n = normTravelerKey(personName);
  return roster.filter((m) => m.norm === n);
}

export function isViewerLinkedToMember(user, member) {
  if (!user || !member) return false;
  if (member.userId && String(member.userId) === String(user.id)) return true;
  const uEmail = String(user.email || '').trim().toLowerCase();
  if (member.email && uEmail && member.email === uEmail) return true;
  return false;
}

/** When multiple roster rows share the same display name, pick the one that matches the logged-in user. */
export function pickMemberForViewer(matchingMembers, user) {
  if (!matchingMembers.length) return null;
  if (!user?.id && !user?.email) return matchingMembers[0];
  const byId = matchingMembers.find((m) => m.userId && String(m.userId) === String(user.id));
  if (byId) return byId;
  const uEmail = String(user.email || '').trim().toLowerCase();
  if (uEmail) {
    const byEmail = matchingMembers.find((m) => m.email && m.email === uEmail);
    if (byEmail) return byEmail;
  }
  return matchingMembers[0];
}

/**
 * Avatar for a traveller row: prefer a roster entry with an avatar image.
 */
export function getAvatarUrlForPerson(person, roster) {
  const matches = findMembersMatchingPersonName(person.name, roster);
  if (!matches.length) return '';
  const withPic = matches.find((m) => m.avatarUrl);
  return (withPic || matches[0]).avatarUrl || '';
}

/**
 * @returns {{ canEdit: boolean, displayMember: object|null }}
 */
export function getPersonPaymentEditPolicy(user, person, roster, isTripCreator, canEditPlan) {
  if (!canEditPlan || !person) {
    return { canEdit: false, displayMember: null };
  }
  const matches = findMembersMatchingPersonName(person.name, roster);
  const linked = matches.filter((m) => m.userId);
  if (linked.length === 0) {
    return {
      canEdit: !!isTripCreator,
      displayMember: matches[0] || null,
    };
  }
  const viewerMember = pickMemberForViewer(linked, user);
  const canEdit = !!viewerMember && isViewerLinkedToMember(user, viewerMember);
  return {
    canEdit,
    displayMember: viewerMember || matches[0] || null,
  };
}

export function isUserTripCreator(user, tripCreator, activeShareTripId, isActivePlanOwner) {
  const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
  const currentEmail = String(user?.email || '').trim().toLowerCase();
  const creatorId = String(tripCreator?.id || tripCreator?.userId || '').trim();
  const currentId = String(user?.id || '').trim();
  const isLegacyCreator =
    (!!creatorId && !!currentId && creatorId === currentId) ||
    (!!creatorEmail && !!currentEmail && creatorEmail === currentEmail);
  return activeShareTripId ? isLegacyCreator : !!isActivePlanOwner;
}

export function maskAccountNumberForDisplay(raw) {
  const s = String(raw || '').replace(/\s/g, '');
  if (!s) return '';
  if (s.length <= 4) return '••••';
  return `•••• •••• ${s.slice(-4)}`;
}

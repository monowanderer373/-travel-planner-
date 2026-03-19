import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadItinerary, saveItinerary } from '../utils/storage';
import { useSaveStatus } from './SaveStatusContext';
import { useAuth } from './AuthContext';
import { supabase, hasSupabase } from '../lib/supabase';
import { getPublicBaseUrl, getInviteBaseUrl, decodeInviteToken } from '../utils/publicUrl';
import { getTotalTravelDays, getDayLabel, getDayLabelWithCity } from '../utils/time';
import { logTripActivity } from '../lib/tripActivity';
import { ensureProfileExists } from '../lib/ensureProfile';
import { writeSharedItineraryRow } from '../lib/sharedItineraryWrite';
import { itineraryPayloadCanonical } from '../lib/itineraryPayloadCompare';
import { buildPlanShareSummary, ensureOwnerMembership, ensureStablePlanShare, listPlansForUser, loadPlanMembers, revokeStablePlanShare, syncPlanShareSummary } from '../lib/planSharing';

const ItineraryContext = createContext(null);

const TRAVEL_STYLES = ['Chill', 'Adventure', 'Foodie', 'Aesthetic', 'Culture', 'Nature', 'City'];

const defaultTrip = {
  destination: '',
  startDate: '',
  endDate: '',
  budget: '',
  travelStyle: '',
  placeLink: '',
  transportLink: '',
  locations: [],
  cities: [], // { name, startDate, endDate } for multi-city day labels
};

const defaultDays = [{ id: 'day-1', label: 'Day 1', timeline: [] }];

/** Get trip id from URL (?trip=ID preferred, or ?invite=TOKEN), localStorage pending keys, or /join/:id, /share/:id. */
function getTripIdFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const trip = params.get('trip');
  if (trip) return trip;
  const invite = params.get('invite');
  if (invite) return decodeInviteToken(invite) || invite;
  try {
    const pendingTrip = localStorage.getItem('pending_trip_id');
    if (pendingTrip) return pendingTrip;
    const pending = localStorage.getItem('pending_invite_token');
    if (pending) return decodeInviteToken(pending) || pending;
  } catch {}
  const path = window.location.pathname || '';
  const joinMatch = path.match(/\/join\/([^/]+)/);
  if (joinMatch) return joinMatch[1];
  const shareMatch = path.match(/\/share\/([^/]+)/);
  if (shareMatch) return shareMatch[1];
  return null;
}

function getInitialItinerary() {
  const loaded = loadItinerary();
  const urlTripId = getTripIdFromUrl();
  const defaultShare = {
    allowVote: false,
    allowEdit: true,
    shareLink: '',
    tripId: null,
    linkAccess: 'invited', // 'invited' | 'web'
    linkPermission: 'edit', // 'view' | 'edit'
    invitedEmails: [],
  };
  const shareSettings = loaded?.shareSettings && typeof loaded.shareSettings === 'object'
    ? { ...defaultShare, ...loaded.shareSettings }
    : { ...defaultShare };
  if (urlTripId) shareSettings.tripId = urlTripId;

  if (!loaded || !loaded.trip) {
    if (urlTripId) {
      return {
        trip: defaultTrip,
        days: defaultDays,
        savedPlaces: [],
        savedTransports: [],
        tripmates: [],
        tripCreator: { name: '' },
        tripMemories: '',
        planSharedTripId: '',
        shareSettings,
        tripmateShareLink: '',
      };
    }
    return null;
  }
  const trip = { ...defaultTrip, ...loaded.trip };
  if (!Array.isArray(trip.locations)) trip.locations = [];
  if (!Array.isArray(trip.cities)) trip.cities = [];
  return {
    trip,
    days: Array.isArray(loaded.days) && loaded.days.length > 0 ? loaded.days : defaultDays,
    savedPlaces: Array.isArray(loaded.savedPlaces) ? loaded.savedPlaces : [],
    savedTransports: Array.isArray(loaded.savedTransports) ? loaded.savedTransports : [],
    tripmates: Array.isArray(loaded.tripmates) ? loaded.tripmates : [],
    tripCreator: loaded.tripCreator && typeof loaded.tripCreator === 'object' ? loaded.tripCreator : { name: '' },
    tripMemories: typeof loaded.tripMemories === 'string' ? loaded.tripMemories : '',
    planSharedTripId: typeof loaded.planSharedTripId === 'string' ? loaded.planSharedTripId : '',
    shareSettings,
    tripmateShareLink: typeof loaded.tripmateShareLink === 'string' ? loaded.tripmateShareLink : '',
  };
}

function isSupabaseUser(user) {
  return user?.id && !user.id.startsWith('user-');
}

/** Build candidate ids for shared_itineraries (links may include extra chars after copy). */
function sharedTripIdCandidates(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const s = raw.trim();
  const out = new Set([s]);
  if (s.length > 14) out.add(s.slice(0, 14));
  return [...out].filter(Boolean);
}

function extractLegacySharedTripIds(data) {
  const out = new Set();
  const push = (value) => {
    for (const candidate of sharedTripIdCandidates(String(value || '').trim())) {
      out.add(candidate);
    }
  };

  if (data?.planSharedTripId) push(data.planSharedTripId);
  if (data?.shareSettings?.tripId) push(data.shareSettings.tripId);

  const rawLink = String(data?.tripmateShareLink || '').trim();
  if (rawLink) {
    try {
      const url = new URL(rawLink);
      const tripId = url.searchParams.get('trip');
      if (tripId) push(tripId);
    } catch {
      const match = rawLink.match(/[?&]trip=([^&#]+)/);
      if (match?.[1]) {
        try {
          push(decodeURIComponent(match[1]));
        } catch {
          push(match[1]);
        }
      }
    }
  }

  return [...out].filter(Boolean);
}

export function ItineraryProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tripFromUrl = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get('trip');
    } catch {
      return null;
    }
  }, [location.search]);
  const initial = getInitialItinerary();
  const [trip, setTrip] = useState(initial?.trip ?? defaultTrip);
  const [days, setDays] = useState(initial?.days ?? defaultDays);
  const [savedPlaces, setSavedPlaces] = useState(initial?.savedPlaces ?? []);
  const [savedTransports, setSavedTransports] = useState(initial?.savedTransports ?? []);
  const [tripmates, setTripmates] = useState(initial?.tripmates ?? []);
  const [tripCreator, setTripCreatorState] = useState(initial?.tripCreator ?? { name: '' });
  const [tripMemories, setTripMemories] = useState(initial?.tripMemories ?? '');
  const [planSharedTripId, setPlanSharedTripId] = useState(initial?.planSharedTripId ?? '');
  const [shareSettings, setShareSettings] = useState(
    initial?.shareSettings ?? {
      allowVote: false,
      allowEdit: true,
      shareLink: '',
      tripId: null,
      linkAccess: 'invited',
      linkPermission: 'edit',
      invitedEmails: [],
    }
  );
  const planFromUrl = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get('plan');
    } catch {
      return null;
    }
  }, [location.search]);

  const resolvedSharedTripId = useMemo(() => {
    try {
      const p = typeof localStorage !== 'undefined' ? localStorage.getItem('pending_trip_id') : null;
      // Always prioritize explicit shared link in URL.
      // If ?trip= is present, we are in shared mode regardless of ?plan.
      if (tripFromUrl) return tripFromUrl;
      return shareSettings.tripId || p || null;
    } catch {
      return tripFromUrl || shareSettings.tripId;
    }
  }, [shareSettings.tripId, tripFromUrl, location.search]);

  const [personalPlans, setPersonalPlans] = useState([]);
  const [sharedPlans, setSharedPlans] = useState([]);
  const [planMembers, setPlanMembers] = useState([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [planDebugInfo, setPlanDebugInfo] = useState(null);
  const [activePersonalPlanId, setActivePersonalPlanId] = useState(() => planFromUrl || null);
  const [tripmateShareLink, setTripmateShareLink] = useState(initial?.tripmateShareLink ?? '');
  const { reportSaving, reportSaved } = useSaveStatus();
  const saveTimeoutRef = useRef(null);
  const supabaseLoadedRef = useRef(false);
  // Tracks whether shared trip data has been loaded at least once; prevents saving empty state over the creator's trip
  const sharedTripLoadedRef = useRef(false);
  /** Skip Realtime apply when payload matches our in-flight or last successful shared write (stops save↔realtime loop). */
  const pendingSharedWriteCanonicalRef = useRef(null);
  const lastLocallyWrittenCanonicalRef = useRef(null);
  /** After clearing a stale tripId, skip cloud→local replace so new local edits are not overwritten before save. */
  const orphanTripRecoveryRef = useRef(false);
  /** Increment to pull latest personal row from cloud (e.g. after tab visible again). */
  const [personalCloudPullKey, setPersonalCloudPullKey] = useState(0);
  const lastHiddenAtRef = useRef(0);
  const joinTripmateSyncRef = useRef('');
  const planLoadInProgressRef = useRef(false);
  const availablePlans = useMemo(() => {
    const seen = new Set();
    const merged = [];
    for (const row of [...personalPlans, ...sharedPlans]) {
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
    if (merged.length === 0) {
      const currentId = activePersonalPlanId || planFromUrl || null;
      const currentTitle = String(trip?.destination || '').trim();
      const creatorId = String(tripCreator?.id || tripCreator?.userId || '').trim();
      const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
      const currentUserId = String(user?.id || '').trim();
      const currentUserEmail = String(user?.email || '').trim().toLowerCase();
      const isOwner =
        (!!creatorId && !!currentUserId && creatorId === currentUserId) ||
        (!!creatorEmail && !!currentUserEmail && creatorEmail === currentUserEmail) ||
        !shareSettings?.tripId;
      if (currentId || currentTitle || trip?.startDate || trip?.endDate) {
        merged.push({
          id: currentId || `current-${isOwner ? 'owner' : 'guest'}`,
          data: {
            trip,
          },
          memberType: isOwner ? 'owner' : 'guest',
          membershipRole: isOwner ? 'owner' : 'viewer',
          fallback: true,
        });
      }
    }
    return merged;
  }, [personalPlans, sharedPlans, activePersonalPlanId, planFromUrl, trip, tripCreator, user?.id, user?.email, shareSettings?.tripId]);
  const activePlanRecord = useMemo(
    () => availablePlans.find((p) => p?.id === activePersonalPlanId) || availablePlans[0] || null,
    [availablePlans, activePersonalPlanId]
  );
  const isActivePlanOwner = activePlanRecord?.memberType !== 'guest';
  const currentActivityTripId = useMemo(() => {
    if (shareSettings?.tripId) return shareSettings.tripId;
    if (!activePersonalPlanId) return null;
    if (activePlanRecord?.memberType === 'guest') return activePersonalPlanId;
    if (activePlanRecord?.share_token) return activePersonalPlanId;
    return null;
  }, [shareSettings?.tripId, activePersonalPlanId, activePlanRecord?.memberType, activePlanRecord?.share_token]);

  function isTripIdActiveInUrl(tid) {
    if (!tid || typeof window === 'undefined') return false;
    try {
      const q = new URLSearchParams(window.location.search).get('trip');
      if (!q) return false;
      const decoded = decodeURIComponent(q);
      return q === tid || decoded === tid;
    } catch {
      return false;
    }
  }

  const updateTrip = useCallback((updates) => {
    setTrip((prev) => {
      const next = { ...prev, ...updates };
      if (Object.prototype.hasOwnProperty.call(updates || {}, 'destination')) {
        next.title = updates.destination || '';
      }
      return next;
    });
  }, []);

  const addLocation = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setTrip((prev) => ({
      ...prev,
      locations: prev.locations.includes(trimmed) ? prev.locations : [...prev.locations, trimmed],
    }));
  }, []);

  const removeLocation = useCallback((name) => {
    setTrip((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l !== name),
    }));
  }, []);

  const addDay = useCallback((locationName) => {
    setDays((prev) => {
      const n = prev.length + 1;
      const cities = Array.isArray(trip.cities) ? trip.cities : [];
      const label = getDayLabelWithCity(prev.length, trip.startDate, cities);
      return [
        ...prev,
        { id: `day-${n}-${Date.now()}`, label, timeline: [], location: locationName || '' },
      ];
    });
  }, [trip.startDate, trip.cities]);

  /** Sync day count and labels from trip start/end dates (and cities if set). */
  useEffect(() => {
    if (!trip.startDate || !trip.endDate) return;
    const total = getTotalTravelDays(trip.startDate, trip.endDate);
    if (total <= 0) return;
    const cities = Array.isArray(trip.cities) ? trip.cities : [];
    setDays((prev) => {
      const next = [];
      for (let i = 0; i < total; i++) {
        const existing = prev[i];
        next.push({
          id: existing?.id || `day-${i + 1}-${Date.now()}`,
          label: getDayLabelWithCity(i, trip.startDate, cities),
          timeline: existing?.timeline ?? [],
          location: existing?.location ?? '',
        });
      }
      return next.length ? next : prev;
    });
  }, [trip.startDate, trip.endDate, trip.cities]);

  const updateDayTimeline = useCallback((dayId, timeline) => {
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, timeline } : d))
    );
  }, []);

  const norm = (s) => String(s || '').trim().toLowerCase();

  const addToTimeline = useCallback((dayId, item) => {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, timeline: [...d.timeline, item] } : d
      )
    );
  }, []);

  const removeFromTimeline = useCallback((dayId, index) => {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, timeline: d.timeline.filter((_, i) => i !== index) }
          : d
      )
    );
  }, []);

  const updateTimelineItem = useCallback((dayId, index, updates) => {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              timeline: d.timeline.map((t, i) =>
                i === index ? { ...t, ...updates } : t
              ),
            }
          : d
      )
    );
  }, []);

  const addSavedPlace = useCallback((place) => {
    setSavedPlaces((prev) => [...prev, { ...place, id: `place-${Date.now()}` }]);
    if (currentActivityTripId && hasSupabase() && supabase) {
      logTripActivity(supabase, currentActivityTripId, user?.name, user?.id, 'added_saved_place', { placeName: place?.title || place?.name || 'Place' });
    }
  }, [currentActivityTripId, user?.name, user?.id]);

  const removeSavedPlace = useCallback((id) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateSavedPlace = useCallback((placeId, updates) => {
    setSavedPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, ...updates } : p))
    );
  }, []);

  /**
   * Backfill mapUrl for legacy timeline items:
   * - old items only stored `name`
   * - saved places store `embedUrl`
   * When names match (case-insensitive), fill `mapUrl` so the itinerary name becomes clickable.
   */
  useEffect(() => {
    if (!Array.isArray(savedPlaces) || savedPlaces.length === 0) return;
    setDays((prev) => {
      let changed = false;
      const placeByName = new Map();
      for (const p of savedPlaces) {
        const key = norm(p?.title || p?.name);
        const url = (p?.embedUrl || '').trim();
        if (key && url && !placeByName.has(key)) placeByName.set(key, url);
      }
      if (placeByName.size === 0) return prev;

      const next = prev.map((day) => {
        const tl = Array.isArray(day.timeline) ? day.timeline : [];
        let dayChanged = false;
        const nextTl = tl.map((item) => {
          if (!item || typeof item !== 'object') return item;
          if (item.type === 'transport') return item;
          const existing = (item.mapUrl || '').trim();
          if (existing) return item;
          const key = norm(item.name);
          const url = key ? placeByName.get(key) : null;
          if (!url) return item;
          dayChanged = true;
          return { ...item, mapUrl: url };
        });
        if (!dayChanged) return day;
        changed = true;
        return { ...day, timeline: nextTl };
      });
      return changed ? next : prev;
    });
  }, [savedPlaces]);

  const setVotes = useCallback((placeId, votes) => {
    setSavedPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, votes } : p))
    );
  }, []);

  const generateShareLink = useCallback(() => {
    const id = btoa(JSON.stringify({ t: Date.now() })).slice(0, 12);
    // Prefer canonical public URL (set in CI) so share links are always correct after deploy
    let base = getPublicBaseUrl();
    if (!base && typeof window !== 'undefined') {
      const origin = window.location.origin;
      let path = (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '') || '';
      if (!path && window.location.pathname) {
        const first = window.location.pathname.split('/').filter(Boolean)[0];
        if (first) path = first;
      }
      if (!path && origin.includes('github.io')) path = '-travel-planner-';
      base = path ? `${origin}/${path}` : origin;
    }
    const link = base ? `${base.replace(/\/$/, '')}/?share=${id}` : `#share-${id}`;
    const nextShareSettings = { ...shareSettings, shareLink: link, tripId: id };
    setShareSettings(nextShareSettings);
    if (hasSupabase() && supabase) {
      const payload = {
        trip,
        days,
        savedPlaces,
        savedTransports,
        tripmates,
        tripCreator,
        tripMemories,
        shareSettings: nextShareSettings,
        tripmateShareLink: tripmateShareLink || (base ? `${base.replace(/\/$/, '')}/?trip=${encodeURIComponent(id)}` : `#trip-${id}`),
      };
      void writeSharedItineraryRow(supabase, id, payload).then(({ error }) => {
        if (error && import.meta.env.DEV) console.warn('[generateShareLink]', error);
      });
    }
    return link;
  }, [trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, shareSettings, tripmateShareLink]);

  const addSavedTransport = useCallback((transport) => {
    setSavedTransports((prev) => [...prev, { ...transport, id: `transport-${Date.now()}` }]);
    if (currentActivityTripId && hasSupabase() && supabase) {
      logTripActivity(supabase, currentActivityTripId, user?.name, user?.id, 'added_transport', {
        lineName: transport?.lineName,
        route: transport?.locationA && transport?.locationB ? `${transport.locationA} → ${transport.locationB}` : null,
      });
    }
  }, [currentActivityTripId, user?.name, user?.id]);

  const removeSavedTransport = useCallback((id) => {
    setSavedTransports((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTripmate = useCallback((tripmate) => {
    setTripmates((prev) => [...prev, { ...tripmate, id: `tripmate-${Date.now()}` }]);
  }, []);

  const updateTripmate = useCallback((id, updates) => {
    setTripmates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const removeTripmate = useCallback((id) => {
    setTripmates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const generateTripmateLink = useCallback(async (options = {}) => {
    const { forceNew = false, revokeOld = false } = options || {};
    // Generate robust unique shared row id (avoid timestamp-prefix collisions).
    const newRowId = () => {
      try {
        const uuid = globalThis.crypto?.randomUUID?.();
        if (uuid) return uuid.replace(/-/g, '').slice(0, 14);
      } catch {}
      const rand = Math.random().toString(36).slice(2, 10);
      const ts = Date.now().toString(36);
      return `${ts}${rand}`.slice(0, 14);
    };

    const linkTripId = (() => {
      const raw = String(tripmateShareLink || '').trim();
      if (!raw) return '';
      try {
        const u = new URL(raw);
        return String(u.searchParams.get('trip') || '').trim();
      } catch {
        const m = raw.match(/[?&]trip=([^&]+)/);
        return m?.[1] ? decodeURIComponent(m[1]).trim() : '';
      }
    })();
    const validTripId = (s) =>
      s &&
      s.length >= 10 &&
      s.length <= 24 &&
      /[a-zA-Z]/.test(s) &&
      !/^\d+$/.test(s);

    const existing = validTripId(planSharedTripId) ? planSharedTripId : (validTripId(linkTripId) ? linkTripId : '');
    const tripId = !forceNew && existing ? String(existing).slice(0, 14) : newRowId();
    const oldTripId = existing && existing !== tripId ? existing : null;

    setShareSettings((prev) => ({ ...prev, tripId }));

    // Important: mark the generated shared trip id in the URL (`?trip=`) immediately.
    // This prevents the shared-trip loader from thinking the row doesn't exist yet (race condition),
    // which could fall back to the user's latest Japan plan.
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('trip', tripId);
      params.delete('plan');
      params.delete('share');
      params.delete('invite');
      params.delete('source');
      const q = params.toString();
      navigate(`${location.pathname}${q ? `?${q}` : ''}`, { replace: true });
    } catch {}

    const base = getPublicBaseUrl() || getInviteBaseUrl();
    const link = base ? `${base.replace(/\/$/, '')}/?trip=${encodeURIComponent(tripId)}` : `#trip-${tripId}`;
    setTripmateShareLink(link);
    setPlanSharedTripId(tripId);

    const nextShareSettings = { ...shareSettings, tripId, shareLink: shareSettings.shareLink || '', tripmateShareLink: link };
    const payload = {
      trip,
      days,
      savedPlaces,
      savedTransports,
      tripmates,
      tripCreator,
      tripMemories,
      planSharedTripId: tripId,
      shareSettings: nextShareSettings,
      tripmateShareLink: link,
    };

    if (!hasSupabase() || !supabase) {
      sharedTripLoadedRef.current = true;
      return { ok: false, link, error: 'no_supabase' };
    }

    // Persist per-plan shared link metadata so each personal plan keeps its own stable link.
    if (activePersonalPlanId && user?.id) {
      try {
        const { data: planRow } = await supabase
          .from('itineraries')
          .select('data')
          .eq('id', activePersonalPlanId)
          .eq('profile_id', user.id)
          .maybeSingle();
        const cur = planRow?.data && typeof planRow.data === 'object' ? planRow.data : {};
        const nextData = { ...cur, planSharedTripId: tripId, tripmateShareLink: link };
        await supabase
          .from('itineraries')
          .update({ data: nextData, updated_at: new Date().toISOString() })
          .eq('id', activePersonalPlanId)
          .eq('profile_id', user.id);
        setPersonalPlans((prev) => prev.map((p) => (p.id === activePersonalPlanId ? { ...p, data: nextData } : p)));
      } catch {}
    }

    if (revokeOld && oldTripId) {
      try {
        await supabase.from('shared_itineraries').delete().eq('id', oldTripId);
      } catch {}
    }

    const { error } = await writeSharedItineraryRow(supabase, tripId, payload);
    sharedTripLoadedRef.current = true;
    if (error) {
      console.error('[generateTripmateLink]', error?.message || error, error?.details, error?.hint);
      return { ok: false, link, error: error?.message || String(error) };
    }
    return { ok: true, link };
  }, [shareSettings, trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, planSharedTripId, tripmateShareLink, activePersonalPlanId, user?.id, navigate, location.pathname]);

  const stablePlanShareLink = useMemo(() => {
    const token = String(activePlanRecord?.share_token || '').trim();
    if (!token) return '';
    const base = getPublicBaseUrl() || getInviteBaseUrl();
    return base ? `${base.replace(/\/$/, '')}/share/${encodeURIComponent(token)}` : `/share/${encodeURIComponent(token)}`;
  }, [activePlanRecord?.share_token]);

  const ensureCurrentPlanShareLink = useCallback(
    async ({ forceNew = false } = {}) => {
      if (!user?.id || !activePersonalPlanId || !hasSupabase() || !supabase) {
        return { ok: false, error: 'no_supabase' };
      }
      const nextAccess = (shareSettings.linkAccess || 'invited') === 'web' ? 'link' : (shareSettings.linkAccess || 'invited');
      const nextPermission = shareSettings.linkPermission || (shareSettings.allowEdit ? 'edit' : 'view');
      const res = await ensureStablePlanShare(supabase, {
        planId: activePersonalPlanId,
        ownerProfileId: user.id,
        existingToken: activePlanRecord?.share_token || '',
        sharingEnabled: true,
        linkAccess: nextAccess,
        linkPermission: nextPermission,
        data: {
          trip,
          days,
          savedPlaces,
          savedTransports,
          tripmates,
          tripCreator,
          tripMemories,
          shareSettings,
          tripmateShareLink,
        },
        forceNewToken: forceNew,
      });
      if (res?.error) return { ok: false, error: res.error?.message || String(res.error) };
      const token = res?.token || '';
      const base = getPublicBaseUrl() || getInviteBaseUrl();
      const link = token ? `${(base || '').replace(/\/$/, '')}/share/${encodeURIComponent(token)}` : '';
      setPersonalPlans((prev) => prev.map((p) => (
        p.id === activePersonalPlanId
          ? { ...p, share_token: token, sharing_enabled: true, link_access: nextAccess, link_permission: nextPermission }
          : p
      )));
      return { ok: true, token, link };
    },
    [user?.id, activePersonalPlanId, activePlanRecord?.share_token, shareSettings, trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, tripmateShareLink]
  );

  const revokeCurrentPlanShareLink = useCallback(async () => {
    if (!user?.id || !activePersonalPlanId || !hasSupabase() || !supabase) {
      return { ok: false, error: 'no_supabase' };
    }
    const res = await revokeStablePlanShare(supabase, {
      planId: activePersonalPlanId,
      ownerProfileId: user.id,
    });
    if (res?.error) return { ok: false, error: res.error?.message || String(res.error) };
    setPersonalPlans((prev) => prev.map((p) => (
      p.id === activePersonalPlanId
        ? { ...p, share_token: '', sharing_enabled: false }
        : p
    )));
    return { ok: true };
  }, [user?.id, activePersonalPlanId]);

  const syncCurrentPlanShareSettings = useCallback(
    async (patch = {}) => {
      setShareSettings((prev) => ({ ...prev, ...patch }));
      if (!user?.id || !activePersonalPlanId || !hasSupabase() || !supabase || !isActivePlanOwner) {
        return { ok: false, error: 'no_supabase' };
      }
      const merged = { ...shareSettings, ...patch };
      const nextAccess = (merged.linkAccess || 'invited') === 'web' ? 'link' : (merged.linkAccess || 'invited');
      const nextPermission = merged.linkPermission || (merged.allowEdit ? 'edit' : 'view');
      const res = await ensureStablePlanShare(supabase, {
        planId: activePersonalPlanId,
        ownerProfileId: user.id,
        existingToken: activePlanRecord?.share_token || '',
        sharingEnabled: true,
        linkAccess: nextAccess,
        linkPermission: nextPermission,
        data: {
          trip,
          days,
          savedPlaces,
          savedTransports,
          tripmates,
          tripCreator,
          tripMemories,
          shareSettings: merged,
          tripmateShareLink,
        },
        forceNewToken: false,
      });
      if (res?.error) return { ok: false, error: res.error?.message || String(res.error) };
      setPersonalPlans((prev) => prev.map((p) => (
        p.id === activePersonalPlanId
          ? { ...p, share_token: res.token || p.share_token, sharing_enabled: true, link_access: nextAccess, link_permission: nextPermission }
          : p
      )));
      return { ok: true, token: res?.token || '' };
    },
    [user?.id, activePersonalPlanId, isActivePlanOwner, shareSettings, activePlanRecord?.share_token, trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, tripmateShareLink]
  );

  const updateTripMemories = useCallback((text) => {
    setTripMemories(text);
  }, []);

  const setTripCreator = useCallback((profile) => {
    setTripCreatorState((prev) => (typeof profile === 'function' ? profile(prev) : { ...prev, ...profile }));
  }, []);

  const replaceItineraryState = useCallback((data) => {
    if (!data) return;
    if (data.trip) setTrip((prev) => ({ ...defaultTrip, ...prev, ...data.trip }));
    if (data.days && data.days.length > 0) setDays(data.days);
    if (Array.isArray(data.savedPlaces)) setSavedPlaces(data.savedPlaces);
    if (Array.isArray(data.savedTransports)) setSavedTransports(data.savedTransports);
    if (Array.isArray(data.tripmates)) setTripmates(data.tripmates);
    if (data.tripCreator) setTripCreatorState((prev) => ({ ...prev, ...data.tripCreator }));
    if (typeof data.tripMemories === 'string') setTripMemories(data.tripMemories);
    if (typeof data.planSharedTripId === 'string') setPlanSharedTripId(data.planSharedTripId);
    if (data.shareSettings) {
      setShareSettings((prev) => ({ ...prev, ...data.shareSettings }));
      if (data.shareSettings.tripId) sharedTripLoadedRef.current = true;
    }
    if (typeof data.tripmateShareLink === 'string') setTripmateShareLink(data.tripmateShareLink);
  }, []);

  const setActiveTripId = useCallback((tripId) => {
    setShareSettings((prev) => ({ ...prev, tripId: tripId || null }));
  }, []);

  const clearSharedUrlParams = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.delete('trip');
      params.delete('share');
      params.delete('invite');
      params.delete('source');
      return params;
    } catch {
      return null;
    }
  }, []);

  const switchToPersonalPlan = useCallback(
    async (planId) => {
      if (!user?.id) return;
      planLoadInProgressRef.current = true;
      // Exit shared mode first (URL + state), then load the selected personal plan.
      try {
        localStorage.removeItem('pending_trip_id');
        localStorage.removeItem('pending_invite_token');
        sessionStorage.removeItem('share_join_flow');
      } catch {}

      const params = clearSharedUrlParams() || new URLSearchParams();
      if (planId) params.set('plan', planId);
      const q = params.toString();
      navigate(`${location.pathname}${q ? `?${q}` : ''}`, { replace: true });

      if (!planId) {
        const blankPayload = {
          trip: { ...defaultTrip },
          days: JSON.parse(JSON.stringify(defaultDays)),
          savedPlaces: [],
          savedTransports: [],
          tripmates: [],
          tripCreator: { name: user?.name || '', email: user?.email || '', id: user?.id || '' },
          tripMemories: '',
          planSharedTripId: '',
          shareSettings: {
            allowVote: false,
            allowEdit: true,
            shareLink: '',
            tripId: null,
            linkAccess: 'invited',
            linkPermission: 'edit',
            invitedEmails: [],
          },
          tripmateShareLink: '',
        };
        setShareSettings((prev) => ({ ...prev, tripId: null, shareLink: '' }));
        setTripmateShareLink('');
        setPlanSharedTripId('');
        replaceItineraryState(blankPayload);
        setActivePersonalPlanId(null);
        supabaseLoadedRef.current = `personal-none-${user.id}`;
        queueMicrotask(() => {
          planLoadInProgressRef.current = false;
        });
        return;
      }

      if (!hasSupabase() || !supabase) {
        setShareSettings((prev) => ({ ...prev, tripId: null, shareLink: '' }));
        setTripmateShareLink('');
        setPlanSharedTripId('');
        setActivePersonalPlanId(planId || null);
        planLoadInProgressRef.current = false;
        return;
      }
      const { data: row, error } = await supabase
        .from('itineraries')
        .select('data')
        .eq('id', planId)
        .maybeSingle();
      if (error || !row?.data || typeof row.data !== 'object') {
        planLoadInProgressRef.current = false;
        return;
      }
      setShareSettings((prev) => ({ ...prev, tripId: null, shareLink: '' }));
      setTripmateShareLink('');
      setPlanSharedTripId('');
      replaceItineraryState({ ...row.data, shareSettings: { ...(row.data.shareSettings || {}), tripId: null } });
      setActivePersonalPlanId(planId || null);
      supabaseLoadedRef.current = planId ? `personal-${user.id}-${planId}` : `personal-latest-${user.id}`;
      queueMicrotask(() => {
        planLoadInProgressRef.current = false;
      });
    },
    [user?.id, clearSharedUrlParams, navigate, hasSupabase, supabase, replaceItineraryState, location.pathname]
  );

  const createPersonalPlan = useCallback(async () => {
    if (!user) return null;
    // Exit shared mode first so the autosave doesn't write to shared tables.
    try {
      localStorage.removeItem('pending_trip_id');
      localStorage.removeItem('pending_invite_token');
      sessionStorage.removeItem('share_join_flow');
    } catch {}

    setShareSettings((prev) => ({ ...prev, tripId: null, shareLink: '' }));
    setTripmateShareLink('');
    setPlanSharedTripId('');

    const blankPayload = {
      trip: { ...defaultTrip },
      days: JSON.parse(JSON.stringify(defaultDays)),
      savedPlaces: [],
      savedTransports: [],
      tripmates: [],
      tripCreator: { name: user?.name || '', email: user?.email || '', id: user?.id || '' },
      tripMemories: '',
      planSharedTripId: '',
      shareSettings: {
        allowVote: false,
        allowEdit: true,
        shareLink: '',
        tripId: null,
        linkAccess: 'invited',
        linkPermission: 'edit',
        invitedEmails: [],
      },
      tripmateShareLink: '',
    };

    if (!hasSupabase() || !supabase) {
      setActivePersonalPlanId(null);
      replaceItineraryState(blankPayload);
      return null;
    }

    try {
      const { ok } = await ensureProfileExists(supabase, user);
      if (!ok) return null;
    } catch {
      return null;
    }

    const { data: insRow, error } = await supabase
      .from('itineraries')
      .insert({
        profile_id: user.id,
        owner_profile_id: user.id,
        sharing_enabled: false,
        link_access: 'invited',
        link_permission: 'edit',
        data: blankPayload,
      })
      .select('id, profile_id, owner_profile_id, data, updated_at')
      .maybeSingle();

    if (error || !insRow?.id) {
      console.warn('[Your Plan][createPersonalPlan][insert]', error || 'missing_insert_row');
      setPlanDebugInfo({
        at: new Date().toISOString(),
        userId: user?.id || '',
        userEmail: user?.email || '',
        createError: error?.message || 'missing_insert_row',
      });
      return null;
    }

    const newId = insRow.id;
    await ensureOwnerMembership(supabase, newId, user.id).catch((err) => {
      console.warn('[Your Plan][createPersonalPlan][ownerMembership]', err);
      setPlanDebugInfo({
        at: new Date().toISOString(),
        userId: user?.id || '',
        userEmail: user?.email || '',
        createError: err?.message || 'owner_membership_failed',
      });
    });
    setPersonalPlans((prev) => [
      {
        ...insRow,
        membershipRole: 'owner',
        memberType: 'owner',
      },
      ...prev.filter((p) => p.id !== newId),
    ]);
    setPlansLoaded(true);
    await switchToPersonalPlan(newId);
    return newId;
  }, [user, hasSupabase, supabase, replaceItineraryState, switchToPersonalPlan]);

  const deletePersonalPlan = useCallback(
    async (planId) => {
      if (!user?.id || !planId) return;
      if (!hasSupabase() || !supabase) return;
      const { data: row } = await supabase
        .from('itineraries')
        .select('id, data')
        .eq('id', planId)
        .maybeSingle();

      const legacySharedIds = extractLegacySharedTripIds(row?.data || {});
      if (legacySharedIds.length > 0) {
        try {
          await supabase.from('shared_itineraries').delete().in('id', legacySharedIds);
        } catch {}
      }

      await supabase.from('itineraries').delete().eq('id', planId);
      setPersonalPlans((prev) => prev.filter((p) => p.id !== planId));

      // If we deleted the active plan, switch to the newest remaining plan.
      if (activePersonalPlanId === planId) {
        const next = personalPlans.filter((p) => p.id !== planId);
        const nextId = next[0]?.id ?? null;
        await switchToPersonalPlan(nextId);
      }
    },
    [user?.id, hasSupabase, supabase, activePersonalPlanId, personalPlans, switchToPersonalPlan]
  );

  const renamePersonalPlan = useCallback(
    async (planId, nextTitle) => {
      const trimmed = String(nextTitle || '').trim();
      if (!user?.id || !planId || !trimmed) return { ok: false, error: 'invalid_plan_name' };
      if (!hasSupabase() || !supabase) return { ok: false, error: 'no_supabase' };

      const { data: row, error } = await supabase
        .from('itineraries')
        .select('id, data, share_token, owner_profile_id, profile_id')
        .eq('id', planId)
        .maybeSingle();
      if (error || !row?.id || !row?.data || typeof row.data !== 'object') {
        return { ok: false, error: error?.message || 'plan_not_found' };
      }

      const ownerId = String(row.owner_profile_id || row.profile_id || '').trim();
      if (ownerId && ownerId !== String(user.id)) {
        return { ok: false, error: 'not_plan_owner' };
      }

      const currentTrip = row.data?.trip && typeof row.data.trip === 'object' ? row.data.trip : {};
      const updatedData = {
        ...row.data,
        trip: {
          ...currentTrip,
          destination: trimmed,
          title: trimmed,
        },
      };
      const updatedAt = new Date().toISOString();

      const { error: upErr } = await supabase
        .from('itineraries')
        .update({ data: updatedData, updated_at: updatedAt })
        .eq('id', planId);
      if (upErr) return { ok: false, error: upErr?.message || String(upErr) };

      const shareSummary = buildPlanShareSummary(updatedData);
      try {
        await supabase
          .from('plan_shares')
          .update({ ...shareSummary, updated_at: updatedAt })
          .eq('plan_id', planId)
          .eq('owner_profile_id', user.id);
      } catch {}

      setPersonalPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, data: updatedData } : p)));
      setSharedPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, data: updatedData } : p)));

      if (activePersonalPlanId === planId) {
        planLoadInProgressRef.current = true;
        replaceItineraryState(updatedData);
        queueMicrotask(() => {
          planLoadInProgressRef.current = false;
        });
      }

      return { ok: true, title: trimmed };
    },
    [user?.id, activePersonalPlanId, replaceItineraryState]
  );

  const repairPersonalPlan = useCallback(
    async (planId, nextTitle) => {
      const trimmed = String(nextTitle || '').trim();
      if (!user?.id || !planId || !trimmed) return { ok: false, error: 'invalid_plan_name' };
      if (!hasSupabase() || !supabase) return { ok: false, error: 'no_supabase' };

      const { data: row, error } = await supabase
        .from('itineraries')
        .select('id, data, owner_profile_id, profile_id')
        .eq('id', planId)
        .maybeSingle();
      if (error || !row?.id || !row?.data || typeof row.data !== 'object') {
        return { ok: false, error: error?.message || 'plan_not_found' };
      }

      const ownerId = String(row.owner_profile_id || row.profile_id || '').trim();
      if (ownerId && ownerId !== String(user.id)) {
        return { ok: false, error: 'not_plan_owner' };
      }

      const currentShareSettings = row.data?.shareSettings && typeof row.data.shareSettings === 'object'
        ? row.data.shareSettings
        : {};
      const currentCreator = row.data?.tripCreator && typeof row.data.tripCreator === 'object'
        ? row.data.tripCreator
        : { name: user?.name || '', email: user?.email || '', id: user?.id || '' };
      const updatedData = {
        ...row.data,
        trip: {
          ...defaultTrip,
          destination: trimmed,
          title: trimmed,
        },
        days: JSON.parse(JSON.stringify(defaultDays)),
        savedPlaces: [],
        savedTransports: [],
        tripMemories: '',
        shareSettings: {
          ...currentShareSettings,
          tripId: null,
        },
        tripCreator: {
          ...currentCreator,
          id: currentCreator?.id || user?.id || '',
          email: currentCreator?.email || user?.email || '',
          name: currentCreator?.name || user?.name || trimmed,
        },
      };
      const updatedAt = new Date().toISOString();

      const { error: upErr } = await supabase
        .from('itineraries')
        .update({ data: updatedData, updated_at: updatedAt })
        .eq('id', planId);
      if (upErr) return { ok: false, error: upErr?.message || String(upErr) };

      const shareSummary = buildPlanShareSummary(updatedData);
      try {
        await supabase
          .from('plan_shares')
          .update({ ...shareSummary, updated_at: updatedAt })
          .eq('plan_id', planId)
          .eq('owner_profile_id', user.id);
      } catch {}

      setPersonalPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, data: updatedData } : p)));
      setSharedPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, data: updatedData } : p)));

      if (activePersonalPlanId === planId) {
        planLoadInProgressRef.current = true;
        replaceItineraryState(updatedData);
        queueMicrotask(() => {
          planLoadInProgressRef.current = false;
        });
      }

      return { ok: true, title: trimmed };
    },
    [user?.id, user?.name, user?.email, activePersonalPlanId, replaceItineraryState]
  );

  const leavePlan = useCallback(
    async (planId) => {
      if (!user?.id || !planId) return;
      if (!hasSupabase() || !supabase) return;
      const res = await supabase
        .from('plan_members')
        .delete()
        .eq('plan_id', planId)
        .eq('user_id', user.id);
      if (res?.error) return;
      setSharedPlans((prev) => prev.filter((p) => p.id !== planId));
      if (activePersonalPlanId === planId) {
        const next = personalPlans[0]?.id ?? null;
        await switchToPersonalPlan(next);
      }
    },
    [user?.id, hasSupabase, supabase, activePersonalPlanId, personalPlans, switchToPersonalPlan]
  );

  /** Invited user leaves shared trip → load personal itinerary (or empty default). */
  const leaveSharedTrip = useCallback(async () => {
    if (!shareSettings.tripId) return;
    sharedTripLoadedRef.current = false;
    supabaseLoadedRef.current = null;
    try {
      localStorage.removeItem('pending_trip_id');
      localStorage.removeItem('pending_invite_token');
      sessionStorage.removeItem('share_join_flow');
    } catch {}

    const blankShare = {
      allowVote: false,
      allowEdit: true,
      shareLink: '',
      tripId: null,
      linkAccess: 'invited',
      linkPermission: 'edit',
      invitedEmails: [],
    };

    const emptyPersonal = () => {
      replaceItineraryState({
        trip: { ...defaultTrip },
        days: JSON.parse(JSON.stringify(defaultDays)),
        savedPlaces: [],
        savedTransports: [],
        tripmates: [],
        tripCreator: { name: user?.name || '', email: user?.email || '' },
        tripMemories: '',
        planSharedTripId: '',
        shareSettings: blankShare,
        tripmateShareLink: '',
      });
    };

    if (hasSupabase() && supabase && user?.id && !String(user.id).startsWith('user-')) {
      const desired = activePersonalPlanId || null;
      const { data: row } = desired
        ? await supabase
          .from('itineraries')
          .select('id, data')
          .eq('id', desired)
          .maybeSingle()
        : await supabase
          .from('itineraries')
          .select('id, data')
          .or(`profile_id.eq.${user.id},owner_profile_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (row?.data && typeof row.data === 'object') {
        const d = { ...row.data };
        d.shareSettings = {
          ...(d.shareSettings && typeof d.shareSettings === 'object' ? d.shareSettings : {}),
          tripId: null,
        };
        planLoadInProgressRef.current = true;
        replaceItineraryState(d);
        setActivePersonalPlanId(row.id);
        queueMicrotask(() => {
          planLoadInProgressRef.current = false;
        });
      } else {
        emptyPersonal();
      }
      supabaseLoadedRef.current = desired ? `personal-${user.id}-${desired}` : `personal-latest-${user.id}`;
    } else {
      emptyPersonal();
    }
    navigate('/', { replace: true });
  }, [shareSettings.tripId, user, replaceItineraryState, navigate]);

  // Load itinerary: shared trip (by tripId) or user's own (by profile_id)
  useEffect(() => {
    if (!user) {
      supabaseLoadedRef.current = null;
      return;
    }
    if (!hasSupabase() || !supabase || !isSupabaseUser(user)) return;
    const tripId = resolvedSharedTripId;
    if (tripId) {
      const loadKey = `shared-${tripId}`;
      if (supabaseLoadedRef.current === loadKey) return;
      supabaseLoadedRef.current = loadKey;
      void (async () => {
        const candidates = sharedTripIdCandidates(tripId);
        for (const id of candidates) {
          const { data: row, error } = await supabase
            .from('shared_itineraries')
            .select('data')
            .eq('id', id)
            .maybeSingle();
          if (error || !row?.data || typeof row.data !== 'object') continue;
          replaceItineraryState({
            ...row.data,
            shareSettings: { ...(row.data.shareSettings || {}), tripId: id },
          });
          sharedTripLoadedRef.current = true;
          try {
            const d = row.data;
            const cr = (d?.tripCreator?.email || '').trim().toLowerCase();
            const ue = (user?.email || '').trim().toLowerCase();
            if (!cr || !ue || cr !== ue) sessionStorage.setItem('share_join_flow', id);
            localStorage.removeItem('pending_trip_id');
            localStorage.removeItem('pending_invite_token');
          } catch {}
          return;
        }
        if (isTripIdActiveInUrl(tripId)) {
          sharedTripLoadedRef.current = true;
          return;
        }
        orphanTripRecoveryRef.current = true;
        sharedTripLoadedRef.current = false;
        supabaseLoadedRef.current = null;
        try {
          localStorage.removeItem('pending_trip_id');
          localStorage.removeItem('pending_invite_token');
        } catch {}
        setShareSettings((prev) => ({ ...prev, tripId: null }));
        if (import.meta.env.DEV) {
          console.warn(
            '[Travel Planner] Shared trip not found; cleared stale link. Check shared_itineraries in Supabase (invite links use that table, not itineraries).'
          );
        }
      })();
    } else {
      // Don't load user's own trip if there's a pending invite (it would be overwritten shortly and the save effect could corrupt the shared trip)
      try {
        const hasPendingInvite =
          new URLSearchParams(window.location.search).get('invite') ||
          localStorage.getItem('pending_invite_token') ||
          sessionStorage.getItem('auth_return_to')?.includes('invite');
        if (hasPendingInvite) return;
      } catch {}
      const desiredPlanId = planFromUrl || activePersonalPlanId || null;
      const loadKey = desiredPlanId ? `personal-${user.id}-${desiredPlanId}` : `personal-latest-${user.id}`;
      if (supabaseLoadedRef.current === loadKey) return;
      supabaseLoadedRef.current = loadKey;
      if (orphanTripRecoveryRef.current) {
        orphanTripRecoveryRef.current = false;
        supabaseLoadedRef.current = loadKey;
        return;
      }
      const q = desiredPlanId
        ? supabase.from('itineraries').select('id, data').eq('id', desiredPlanId).maybeSingle()
        : supabase
          .from('itineraries')
          .select('id, data')
          .or(`profile_id.eq.${user.id},owner_profile_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      void q
        .then(({ data: row }) => {
          if (!row?.data || typeof row.data !== 'object') return;
          // Old rows often still had tripId in JSON → next effect run would load shared_itineraries and overwrite this with empty/stale data (breaks phone sync).
          const d = { ...row.data };
          d.shareSettings = { ...(d.shareSettings && typeof d.shareSettings === 'object' ? d.shareSettings : {}), tripId: null };
          planLoadInProgressRef.current = true;
          replaceItineraryState(d);
          setActivePersonalPlanId(row.id);
          queueMicrotask(() => {
            planLoadInProgressRef.current = false;
          });
        })
        .catch(() => {});
    }
  }, [user?.id, shareSettings.tripId, resolvedSharedTripId, personalCloudPullKey, replaceItineraryState, planFromUrl, activePersonalPlanId]);

  // Load owned + shared plans list for the "Your Plan" dropdown.
  useEffect(() => {
    if (!user) {
      setPersonalPlans([]);
      setSharedPlans([]);
      setPlanMembers([]);
      setPlansLoaded(true);
      setActivePersonalPlanId(null);
      return;
    }
    if (!hasSupabase() || !supabase || !isSupabaseUser(user)) {
      setPlansLoaded(true);
      return;
    }
    setPlansLoaded(false);

    void listPlansForUser(supabase, user.id, user.email || '')
      .then(({ owned, guest, error, debug }) => {
        const ownedRows = Array.isArray(owned) ? owned : [];
        const guestRows = Array.isArray(guest) ? guest : [];
        setPersonalPlans(ownedRows);
        setSharedPlans(guestRows);
        setPlanDebugInfo({
          at: new Date().toISOString(),
          userId: user.id,
          userEmail: user.email || '',
          error: error?.message || null,
          ...(debug || {}),
        });
        if (error) console.warn('[Your Plan][listPlansForUser]', error);
        const merged = [...ownedRows, ...guestRows];
        const desired = planFromUrl || activePersonalPlanId || (merged[0]?.id ?? null);
        setActivePersonalPlanId(desired);
        setPlansLoaded(true);
      })
      .catch(() => {
        setPersonalPlans([]);
        setSharedPlans([]);
        setPlanDebugInfo({
          at: new Date().toISOString(),
          userId: user.id,
          userEmail: user.email || '',
          error: 'listPlansForUser_failed',
        });
        setPlansLoaded(true);
      });
  }, [user?.id, planFromUrl, activePersonalPlanId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.__wanderPlanDebug = {
        plansLoaded,
        activePersonalPlanId,
        availablePlanIds: availablePlans.map((p) => p?.id).filter(Boolean),
        availablePlanSummaries: availablePlans.map((p) => ({
          id: p?.id || null,
          memberType: p?.memberType || null,
          title: String(p?.data?.trip?.destination || p?.data?.trip?.title || '').trim() || 'Untitled',
          startDate: p?.data?.trip?.startDate || null,
        })),
        planDebugInfo,
      };
    } catch {}
  }, [plansLoaded, activePersonalPlanId, availablePlans, planDebugInfo]);

  useEffect(() => {
    if (!activePersonalPlanId || !hasSupabase() || !supabase) {
      setPlanMembers([]);
      return;
    }
    let cancelled = false;
    void loadPlanMembers(supabase, activePersonalPlanId)
      .then(({ members }) => {
        if (cancelled) return;
        setPlanMembers(Array.isArray(members) ? members : []);
      })
      .catch(() => {
        if (!cancelled) setPlanMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activePersonalPlanId]);

  useEffect(() => {
    if (!activePersonalPlanId || !hasSupabase() || !supabase) return;
    const channel = supabase
      .channel(`plan-members:${activePersonalPlanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_members', filter: `plan_id=eq.${activePersonalPlanId}` },
        () => {
          void loadPlanMembers(supabase, activePersonalPlanId)
            .then(({ members }) => {
              setPlanMembers(Array.isArray(members) ? members : []);
            })
            .catch(() => {});
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePersonalPlanId]);

  // Ensure invited user is recorded in tripmates once they join a shared trip.
  // We do an immediate cloud write so closing the browser right away still keeps the record.
  useEffect(() => {
    const tripId = shareSettings?.tripId;
    if (!tripId || !user?.id) return;
    if (!hasSupabase() || !supabase) return;
    if (!isSupabaseUser(user)) return;

    let joinFlowId = '';
    try {
      joinFlowId = sessionStorage.getItem('share_join_flow') || '';
    } catch {}
    if (!joinFlowId || joinFlowId !== tripId) return;

    const creatorId = String(tripCreator?.id || tripCreator?.userId || '').trim();
    const creatorEmail = String(tripCreator?.email || '').trim().toLowerCase();
    const userEmail = String(user?.email || '').trim().toLowerCase();
    const isCreator = (!!creatorId && creatorId === String(user.id)) || (!!creatorEmail && !!userEmail && creatorEmail === userEmail);
    if (isCreator) {
      try { sessionStorage.removeItem('share_join_flow'); } catch {}
      return;
    }

    const opKey = `${tripId}:${user.id}`;
    if (joinTripmateSyncRef.current === opKey) return;
    joinTripmateSyncRef.current = opKey;

    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const exists = tripmates.some((m) =>
      (m?.userId && String(m.userId) === String(user.id)) ||
      (m?.email && userEmail && same(m.email, userEmail))
    );

    if (exists) {
      try { sessionStorage.removeItem('share_join_flow'); } catch {}
      return;
    }

    const member = {
      id: `tripmate-${Date.now()}`,
      userId: String(user.id),
      name: String(user?.name || user?.email || 'Traveler').trim() || 'Traveler',
      email: String(user?.email || '').trim(),
      avatarUrl: String(user?.photoURL || '').trim(),
      joinedAt: new Date().toISOString(),
    };
    const nextTripmates = [...tripmates, member];
    setTripmates(nextTripmates);

    const payload = {
      trip,
      days,
      savedPlaces,
      savedTransports,
      tripmates: nextTripmates,
      tripCreator,
      tripMemories,
      planSharedTripId,
      shareSettings: { ...shareSettings, tripId },
      tripmateShareLink,
    };

    void writeSharedItineraryRow(supabase, tripId, payload).finally(() => {
      try { sessionStorage.removeItem('share_join_flow'); } catch {}
    });
  }, [
    shareSettings?.tripId,
    user?.id,
    user?.name,
    user?.email,
    user?.photoURL,
    tripCreator,
    tripmates,
    trip,
    days,
    savedPlaces,
    savedTransports,
    tripMemories,
    planSharedTripId,
    tripmateShareLink,
  ]);

  const shareTripIdRef = useRef(shareSettings.tripId);
  useEffect(() => {
    shareTripIdRef.current = shareSettings.tripId;
    pendingSharedWriteCanonicalRef.current = null;
    lastLocallyWrittenCanonicalRef.current = null;
  }, [shareSettings.tripId]);

  const wasHiddenForPullRef = useRef(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAtRef.current = Date.now();
        wasHiddenForPullRef.current = true;
        return;
      }
      if (document.visibilityState !== 'visible' || !wasHiddenForPullRef.current) return;
      if (Date.now() - lastHiddenAtRef.current < 12000) return;
      wasHiddenForPullRef.current = false;
      if (!shareTripIdRef.current) {
        supabaseLoadedRef.current = null;
        setPersonalCloudPullKey((k) => k + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Realtime: when in a shared trip, subscribe so all participants see updates
  useEffect(() => {
    const tripId = shareSettings.tripId;
    if (!tripId || !hasSupabase() || !supabase) return;
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shared_itineraries', filter: `id=eq.${tripId}` },
        (payload) => {
          const data = payload?.new?.data;
          if (!data || typeof data !== 'object') return;
          const inc = itineraryPayloadCanonical(data);
          if (
            inc &&
            (inc === pendingSharedWriteCanonicalRef.current ||
              inc === lastLocallyWrittenCanonicalRef.current)
          ) {
            return;
          }
          replaceItineraryState(data);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareSettings.tripId, replaceItineraryState]);

  // Realtime for stable shared plans (plan_members + itineraries model).
  useEffect(() => {
    if (shareSettings.tripId) return;
    if (!activePersonalPlanId || !hasSupabase() || !supabase) return;
    const channel = supabase
      .channel(`plan:${activePersonalPlanId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'itineraries', filter: `id=eq.${activePersonalPlanId}` },
        (payload) => {
          const data = payload?.new?.data;
          if (!data || typeof data !== 'object') return;
          const inc = itineraryPayloadCanonical(data);
          if (
            inc &&
            (inc === pendingSharedWriteCanonicalRef.current ||
              inc === lastLocallyWrittenCanonicalRef.current)
          ) {
            return;
          }
          replaceItineraryState({
            ...data,
            shareSettings: { ...(data.shareSettings || {}), tripId: null },
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareSettings.tripId, activePersonalPlanId, replaceItineraryState]);

  useEffect(() => {
    if (planLoadInProgressRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const tripId = shareSettings.tripId;
    const debounceMs = tripId ? 1000 : 500;
    reportSaving();
    saveTimeoutRef.current = setTimeout(() => {
      const payload = {
        trip,
        days,
        savedPlaces,
        savedTransports,
        tripmates,
        tripCreator,
        tripMemories,
        planSharedTripId,
        shareSettings,
        tripmateShareLink,
      };
      const canon = itineraryPayloadCanonical(payload);
      if (tripId && canon) pendingSharedWriteCanonicalRef.current = canon;
      saveItinerary(payload);
      if (hasSupabase() && supabase && isSupabaseUser(user)) {
        const updatedAt = new Date().toISOString();
        if (tripId) {
          const creatorEmail = (tripCreator?.email || '').trim().toLowerCase();
          const currentEmail = (user?.email || '').trim().toLowerCase();
          const isCreator = !!creatorEmail && creatorEmail === currentEmail;
          const canEditByPermission = (shareSettings.linkPermission || 'edit') === 'edit';
          if (!isCreator && !canEditByPermission) {
            pendingSharedWriteCanonicalRef.current = null;
            reportSaved();
            saveTimeoutRef.current = null;
            return;
          }
          if (!sharedTripLoadedRef.current) {
            pendingSharedWriteCanonicalRef.current = null;
            reportSaved();
            saveTimeoutRef.current = null;
            return;
          }
          void writeSharedItineraryRow(supabase, tripId, payload).then(({ error }) => {
            pendingSharedWriteCanonicalRef.current = null;
            if (!error) {
              lastLocallyWrittenCanonicalRef.current = canon;
              return;
            }
            const msg = String(error?.message || error);
            console.warn('[Travel Planner] shared save failed:', msg, error);
            if (/permission|rls|policy|42501|PGRST301/i.test(msg)) {
              console.warn(
                '[Travel Planner] 协作者无法写入 shared_itineraries 多半是 RLS：请在 Supabase 执行 docs/shared-itineraries-collab-rls.sql'
              );
            }
          });
        } else {
          pendingSharedWriteCanonicalRef.current = null;
          void (async () => {
            try {
              const { ok } = await ensureProfileExists(supabase, user);
              if (!ok) return;
              const personalPayload = {
                ...payload,
                shareSettings: { ...shareSettings, tripId: null },
              };
              const body = { data: personalPayload, updated_at: updatedAt };

              // Prefer updating the currently selected plan, including shared plans
              // that were added into "Your Plan" through plan_members.
              if (activePersonalPlanId) {
                const { data: upRow, error: upErr } = await supabase
                  .from('itineraries')
                  .update(body)
                  .eq('id', activePersonalPlanId)
                  .select('id')
                  .maybeSingle();
                if (upErr) throw upErr;

                if (upRow?.id) {
                  if (isActivePlanOwner) {
                    await syncPlanShareSummary(supabase, {
                      planId: activePersonalPlanId,
                      ownerProfileId: user.id,
                      data: personalPayload,
                    });
                  }
                  lastLocallyWrittenCanonicalRef.current = canon;
                  return;
                }
              }

              if (!isActivePlanOwner) {
                // Guest members should never create a new personal copy when the shared plan update misses.
                return;
              }

              // Never guess a "latest row" here. If the active plan id is temporarily
              // missing during refresh/switch, updating the latest row can overwrite a
              // different plan with the current in-memory state.
              if (!plansLoaded) {
                return;
              }

              if (availablePlans.length === 0) {
                const { data: insRow, error: insErr } = await supabase
                  .from('itineraries')
                  .insert({ profile_id: user.id, owner_profile_id: user.id, ...body })
                  .select('id')
                  .maybeSingle();
                if (insErr) throw insErr;
                if (insRow?.id) {
                  setActivePersonalPlanId(insRow.id);
                  lastLocallyWrittenCanonicalRef.current = canon;
                }
              } else {
                return;
              }
            } catch (e) {
              console.warn('[Travel Planner] Cloud save failed (check login & Supabase).', e?.message || e);
            }
          })();
        }
      }
      reportSaved();
      saveTimeoutRef.current = null;
    }, debounceMs);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, planSharedTripId, shareSettings, tripmateShareLink, user?.id, activePersonalPlanId, isActivePlanOwner, plansLoaded, availablePlans.length]);

  const value = {
    trip,
    updateTrip,
    addLocation,
    removeLocation,
    days,
    addDay,
    updateDayTimeline,
    addToTimeline,
    removeFromTimeline,
    updateTimelineItem,
    savedPlaces,
    addSavedPlace,
    removeSavedPlace,
    updateSavedPlace,
    setVotes,
    shareSettings,
    setShareSettings,
    generateShareLink,
    savedTransports,
    addSavedTransport,
    removeSavedTransport,
    tripmates,
    addTripmate,
    updateTripmate,
    removeTripmate,
    tripmateShareLink,
    setTripmateShareLink,
    generateTripmateLink,
    stablePlanShareLink,
    ensureCurrentPlanShareLink,
    revokeCurrentPlanShareLink,
    syncCurrentPlanShareSettings,
    tripCreator,
    setTripCreator,
    tripMemories,
    updateTripMemories,
    replaceItineraryState,
    setActiveTripId,
    leaveSharedTrip,
    activeTripId: shareSettings.tripId,
    // Personal multi-plan support (Your Plan dropdown)
    personalPlans,
    sharedPlans,
    availablePlans,
    activePlanRecord,
    planMembers,
    plansLoaded,
    isActivePlanOwner,
    currentActivityTripId,
    activePersonalPlanId,
    switchToPersonalPlan,
    createPersonalPlan,
    deletePersonalPlan,
    renamePersonalPlan,
    repairPersonalPlan,
    leavePlan,
    TRAVEL_STYLES,
  };

  return (
    <ItineraryContext.Provider value={value}>
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error('useItinerary must be used within ItineraryProvider');
  return ctx;
}

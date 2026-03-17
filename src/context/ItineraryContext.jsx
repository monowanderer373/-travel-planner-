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
  const resolvedSharedTripId = useMemo(() => {
    try {
      const p = typeof localStorage !== 'undefined' ? localStorage.getItem('pending_trip_id') : null;
      return shareSettings.tripId || tripFromUrl || p || null;
    } catch {
      return shareSettings.tripId || tripFromUrl;
    }
  }, [shareSettings.tripId, tripFromUrl, location.search]);
  const [tripmateShareLink, setTripmateShareLink] = useState(initial?.tripmateShareLink ?? '');
  const { reportSaving, reportSaved } = useSaveStatus();
  const saveTimeoutRef = useRef(null);
  const supabaseLoadedRef = useRef(false);
  // Tracks whether shared trip data has been loaded at least once; prevents saving empty state over the creator's trip
  const sharedTripLoadedRef = useRef(false);
  /** After clearing a stale tripId, skip cloud→local replace so new local edits are not overwritten before save. */
  const orphanTripRecoveryRef = useRef(false);
  /** Increment to pull latest personal row from cloud (e.g. after tab visible again). */
  const [personalCloudPullKey, setPersonalCloudPullKey] = useState(0);
  const lastHiddenAtRef = useRef(0);

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
    setTrip((prev) => ({ ...prev, ...updates }));
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
    if (shareSettings.tripId && hasSupabase() && supabase) {
      logTripActivity(supabase, shareSettings.tripId, user?.name, user?.id, 'added_saved_place', { placeName: place?.title || place?.name || 'Place' });
    }
  }, [shareSettings.tripId, user?.name, user?.id]);

  const removeSavedPlace = useCallback((id) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateSavedPlace = useCallback((placeId, updates) => {
    setSavedPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, ...updates } : p))
    );
  }, []);

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
    if (shareSettings.tripId && hasSupabase() && supabase) {
      logTripActivity(supabase, shareSettings.tripId, user?.name, user?.id, 'added_transport', {
        lineName: transport?.lineName,
        route: transport?.locationA && transport?.locationB ? `${transport.locationA} → ${transport.locationB}` : null,
      });
    }
  }, [shareSettings.tripId, user?.name, user?.id]);

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

  const generateTripmateLink = useCallback(async () => {
    /** Row id for shared_itineraries — must match URL ?trip= exactly. Never use decodeInviteToken here:
     * strings like eyJ0cmlwIjoxNz parse as {"trip":17 → id "17" while the link still shows wrong id → empty table / broken join. */
    const newRowId = () => btoa(JSON.stringify({ trip: Date.now() })).slice(0, 14);
    const ex = shareSettings.tripId;
    const exs = ex != null ? String(ex).trim() : '';
    const looksOpaque =
      exs.length >= 10 &&
      exs.length <= 24 &&
      /[a-zA-Z]/.test(exs) &&
      !/^\d+$/.test(exs);
    const tripId = looksOpaque ? exs.slice(0, 14) : newRowId();

    setShareSettings((prev) => ({ ...prev, tripId }));

    const base = getPublicBaseUrl() || getInviteBaseUrl();
    const link = base ? `${base.replace(/\/$/, '')}/?trip=${encodeURIComponent(tripId)}` : `#trip-${tripId}`;
    setTripmateShareLink(link);

    const nextShareSettings = { ...shareSettings, tripId, shareLink: shareSettings.shareLink || '', tripmateShareLink: link };
    const payload = {
      trip,
      days,
      savedPlaces,
      savedTransports,
      tripmates,
      tripCreator,
      tripMemories,
      shareSettings: nextShareSettings,
      tripmateShareLink: link,
    };

    if (!hasSupabase() || !supabase) {
      sharedTripLoadedRef.current = true;
      return { ok: false, link, error: 'no_supabase' };
    }
    const { error } = await writeSharedItineraryRow(supabase, tripId, payload);
    sharedTripLoadedRef.current = true;
    if (error) {
      console.error('[generateTripmateLink]', error?.message || error, error?.details, error?.hint);
      return { ok: false, link, error: error?.message || String(error) };
    }
    return { ok: true, link };
  }, [shareSettings, trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories]);

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
    if (data.shareSettings) {
      setShareSettings((prev) => ({ ...prev, ...data.shareSettings }));
      if (data.shareSettings.tripId) sharedTripLoadedRef.current = true;
    }
    if (typeof data.tripmateShareLink === 'string') setTripmateShareLink(data.tripmateShareLink);
  }, []);

  const setActiveTripId = useCallback((tripId) => {
    setShareSettings((prev) => ({ ...prev, tripId: tripId || null }));
  }, []);

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
        shareSettings: blankShare,
        tripmateShareLink: '',
      });
    };

    if (hasSupabase() && supabase && user?.id && !String(user.id).startsWith('user-')) {
      const { data: row } = await supabase
        .from('itineraries')
        .select('data')
        .eq('profile_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (row?.data && typeof row.data === 'object') {
        const d = { ...row.data };
        d.shareSettings = {
          ...(d.shareSettings && typeof d.shareSettings === 'object' ? d.shareSettings : {}),
          tripId: null,
        };
        replaceItineraryState(d);
      } else {
        emptyPersonal();
      }
      supabaseLoadedRef.current = user.id;
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
      if (supabaseLoadedRef.current === user.id) return;
      supabaseLoadedRef.current = user.id;
      if (orphanTripRecoveryRef.current) {
        orphanTripRecoveryRef.current = false;
        supabaseLoadedRef.current = user.id;
        return;
      }
      supabase
        .from('itineraries')
        .select('data')
        .eq('profile_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: row }) => {
          if (!row?.data || typeof row.data !== 'object') return;
          // Old rows often still had tripId in JSON → next effect run would load shared_itineraries and overwrite this with empty/stale data (breaks phone sync).
          const d = { ...row.data };
          d.shareSettings = { ...(d.shareSettings && typeof d.shareSettings === 'object' ? d.shareSettings : {}), tripId: null };
          replaceItineraryState(d);
        })
        .catch(() => {});
    }
  }, [user?.id, shareSettings.tripId, resolvedSharedTripId, personalCloudPullKey, replaceItineraryState]);

  const shareTripIdRef = useRef(shareSettings.tripId);
  useEffect(() => {
    shareTripIdRef.current = shareSettings.tripId;
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
          if (payload?.new?.data) replaceItineraryState(payload.new.data);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareSettings.tripId, replaceItineraryState]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
        shareSettings,
        tripmateShareLink,
      };
      saveItinerary(payload);
      if (hasSupabase() && supabase && isSupabaseUser(user)) {
        const tripId = shareSettings.tripId;
        const updatedAt = new Date().toISOString();
        if (tripId) {
          const creatorEmail = (tripCreator?.email || '').trim().toLowerCase();
          const currentEmail = (user?.email || '').trim().toLowerCase();
          const isCreator = !!creatorEmail && creatorEmail === currentEmail;
          const canEditByPermission = (shareSettings.linkPermission || 'edit') === 'edit';
          if (!isCreator && !canEditByPermission) { reportSaved(); saveTimeoutRef.current = null; return; }
          // Only write to shared_itineraries after we've loaded the shared trip at least once (prevents overwriting creator's data with empty state during invite processing)
          if (!sharedTripLoadedRef.current) { reportSaved(); saveTimeoutRef.current = null; return; }
          void writeSharedItineraryRow(supabase, tripId, payload).then(({ error }) => {
            if (!error) return;
            const msg = String(error?.message || error);
            console.warn('[Travel Planner] shared save failed:', msg, error);
            if (/permission|rls|policy|42501|PGRST301/i.test(msg)) {
              console.warn(
                '[Travel Planner] 协作者无法写入 shared_itineraries 多半是 RLS：请在 Supabase 执行 docs/shared-itineraries-collab-rls.sql'
              );
            }
          });
        } else {
          void (async () => {
            try {
              const { ok } = await ensureProfileExists(supabase, user);
              if (!ok) return;
              const { data: row, error: selErr } = await supabase
                .from('itineraries')
                .select('id')
                .eq('profile_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (selErr) throw selErr;
              const personalPayload = {
                ...payload,
                shareSettings: { ...shareSettings, tripId: null },
              };
              const body = { data: personalPayload, updated_at: updatedAt };
              if (row?.id) {
                const { error: upErr } = await supabase.from('itineraries').update(body).eq('id', row.id);
                if (upErr) throw upErr;
              } else {
                const { error: insErr } = await supabase
                  .from('itineraries')
                  .insert({ profile_id: user.id, ...body });
                if (insErr) throw insErr;
              }
            } catch (e) {
              console.warn('[Travel Planner] Cloud save failed (check login & Supabase).', e?.message || e);
            }
          })();
        }
      }
      reportSaved();
      saveTimeoutRef.current = null;
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, shareSettings, tripmateShareLink, user?.id]);

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
    tripCreator,
    setTripCreator,
    tripMemories,
    updateTripMemories,
    replaceItineraryState,
    setActiveTripId,
    leaveSharedTrip,
    activeTripId: shareSettings.tripId,
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

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadItinerary, saveItinerary } from '../utils/storage';
import { useSaveStatus } from './SaveStatusContext';

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
};

const defaultDays = [{ id: 'day-1', label: 'Day 1', timeline: [] }];

function getInitialItinerary() {
  const loaded = loadItinerary();
  if (!loaded || !loaded.trip) return null;
  return {
    trip: { ...defaultTrip, ...loaded.trip },
    days: Array.isArray(loaded.days) && loaded.days.length > 0 ? loaded.days : defaultDays,
    savedPlaces: Array.isArray(loaded.savedPlaces) ? loaded.savedPlaces : [],
    savedTransports: Array.isArray(loaded.savedTransports) ? loaded.savedTransports : [],
    tripmates: Array.isArray(loaded.tripmates) ? loaded.tripmates : [],
    tripCreator: loaded.tripCreator && typeof loaded.tripCreator === 'object' ? loaded.tripCreator : { name: '' },
    tripMemories: typeof loaded.tripMemories === 'string' ? loaded.tripMemories : '',
    shareSettings: loaded.shareSettings && typeof loaded.shareSettings === 'object'
      ? { allowVote: false, allowEdit: false, shareLink: '', ...loaded.shareSettings }
      : { allowVote: false, allowEdit: false, shareLink: '' },
    tripmateShareLink: typeof loaded.tripmateShareLink === 'string' ? loaded.tripmateShareLink : '',
  };
}

export function ItineraryProvider({ children }) {
  const initial = getInitialItinerary();
  const [trip, setTrip] = useState(initial?.trip ?? defaultTrip);
  const [days, setDays] = useState(initial?.days ?? defaultDays);
  const [savedPlaces, setSavedPlaces] = useState(initial?.savedPlaces ?? []);
  const [savedTransports, setSavedTransports] = useState(initial?.savedTransports ?? []);
  const [tripmates, setTripmates] = useState(initial?.tripmates ?? []);
  const [tripCreator, setTripCreatorState] = useState(initial?.tripCreator ?? { name: '' });
  const [tripMemories, setTripMemories] = useState(initial?.tripMemories ?? '');
  const [shareSettings, setShareSettings] = useState(initial?.shareSettings ?? { allowVote: false, allowEdit: false, shareLink: '' });
  const [tripmateShareLink, setTripmateShareLink] = useState(initial?.tripmateShareLink ?? '');
  const { reportSaving, reportSaved } = useSaveStatus();
  const saveTimeoutRef = useRef(null);

  const updateTrip = useCallback((updates) => {
    setTrip((prev) => ({ ...prev, ...updates }));
  }, []);

  const addDay = useCallback(() => {
    setDays((prev) => [
      ...prev,
      { id: `day-${prev.length + 1}`, label: `Day ${prev.length + 1}`, timeline: [] },
    ]);
  }, []);

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
  }, []);

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
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const id = btoa(JSON.stringify({ t: Date.now() })).slice(0, 12);
    setShareSettings((prev) => ({ ...prev, shareLink: `${base}/share/${id}` }));
    return `${base}/share/${id}`;
  }, []);

  const addSavedTransport = useCallback((transport) => {
    setSavedTransports((prev) => [...prev, { ...transport, id: `transport-${Date.now()}` }]);
  }, []);

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

  const generateTripmateLink = useCallback(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const id = btoa(JSON.stringify({ trip: Date.now() })).slice(0, 14);
    const link = `${base}/join/${id}`;
    setTripmateShareLink(link);
    return link;
  }, []);

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
    if (data.shareSettings) setShareSettings((prev) => ({ ...prev, ...data.shareSettings }));
    if (typeof data.tripmateShareLink === 'string') setTripmateShareLink(data.tripmateShareLink);
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    reportSaving();
    saveTimeoutRef.current = setTimeout(() => {
      saveItinerary({
        trip,
        days,
        savedPlaces,
        savedTransports,
        tripmates,
        tripCreator,
        tripMemories,
        shareSettings,
        tripmateShareLink,
      });
      reportSaved();
      saveTimeoutRef.current = null;
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [trip, days, savedPlaces, savedTransports, tripmates, tripCreator, tripMemories, shareSettings, tripmateShareLink]);

  const value = {
    trip,
    updateTrip,
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

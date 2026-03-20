import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { formatHour, formatHourDropdownLabel } from '../utils/time';
import PlaceCard from '../components/PlaceCard';
import PlaceLinkInput from '../components/PlaceLinkInput';
import VotingUI from '../components/VotingUI';
import { resolveDayForTimelineAdd } from '../lib/itineraryPayloadCompare';
import { getOpenInGoogleMapsUrl } from '../utils/mapsEmbed';
import './SavedPlaces.css';

const TIME_OPTIONS = [
  '-',
  ...(() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      opts.push(`${String(h).padStart(2, '0')}:00`);
      opts.push(`${String(h).padStart(2, '0')}:30`);
    }
    return opts;
  })(),
];

function parseHours(hours) {
  if (!hours || hours === '—') return { open: '-', close: '-' };
  const parts = hours.split(/\s*[–-]\s*/);
  const open = parts[0]?.trim() && TIME_OPTIONS.includes(parts[0].trim()) ? parts[0].trim() : '-';
  const close = parts[1]?.trim() && TIME_OPTIONS.includes(parts[1].trim()) ? parts[1].trim() : '-';
  return { open, close };
}

const VOYAGE_CATEGORY_PRESETS = [
  { key: 'food', label: 'Food', terms: ['food', 'restaurant', 'ramen', 'sushi', 'noodle', 'meal'] },
  { key: 'coffee', label: 'Coffee', terms: ['coffee', 'cafe', 'café'] },
  { key: 'pastry', label: 'Pastry', terms: ['pastry', 'bakery', 'bake', 'bread', 'croissant'] },
  { key: 'stay', label: 'Stay', terms: ['stay', 'hotel', 'hostel', 'lodging', 'bnb'] },
  { key: 'nightlife', label: 'Nightlife', terms: ['nightlife', 'club', 'bar', 'pub'] },
  { key: 'entertainment', label: 'Entertainment', terms: ['entertainment', 'show', 'theater', 'theatre', 'cinema'] },
  { key: 'shopping', label: 'Shopping', terms: ['shopping', 'shop', 'mall', 'market'] },
  { key: 'wellness', label: 'Wellness', terms: ['wellness', 'spa', 'massage', 'yoga', 'gym'] },
  { key: 'transport', label: 'Transport', terms: ['transport', 'train', 'bus', 'metro', 'taxi'] },
  { key: 'photo_spot', label: 'Photo Spot', terms: ['photo', 'spot', 'view', 'scenic', 'instagram'] },
  { key: 'culture', label: 'Culture', terms: ['culture', 'museum', 'heritage', 'temple', 'gallery'] },
  { key: 'adventure', label: 'Adventure', terms: ['adventure', 'hike', 'outdoor', 'trek'] },
];

function SavedPlaceEdit({ place, onUpdate }) {
  const [title, setTitle] = useState(place.title || '');
  const { open: initOpen, close: initClose } = parseHours(place.hours);
  const [openTime, setOpenTime] = useState(initOpen);
  const [closeTime, setCloseTime] = useState(initClose);
  const [extraNote, setExtraNote] = useState(place.extraNote || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const hasHours =
      openTime &&
      closeTime &&
      openTime !== '-' &&
      closeTime !== '-';
    const hours = hasHours ? `${openTime} – ${closeTime}` : '—';
    onUpdate(place.id, { title: title.trim() || place.title, hours, extraNote: extraNote.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const { t } = useLanguage();
  return (
    <div className="saved-place-edit">
      <span className="saved-place-edit-label">{t('saved.editLabel')}</span>
      <div className="saved-place-edit-row">
        <label className="saved-place-edit-field">
          <span>{t('saved.placeName')}</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('saved.placeName')} />
        </label>
        <label className="saved-place-edit-field">
          <span>{t('saved.open')}</span>
          <select value={openTime} onChange={(e) => setOpenTime(e.target.value)}>
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="saved-place-edit-field">
          <span>{t('saved.close')}</span>
          <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)}>
            {TIME_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
      </div>
      <label className="saved-place-edit-field saved-place-edit-extra">
        <span>{t('saved.extraNote')}</span>
        <input type="text" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="e.g. Cash only, watch for stairs" />
      </label>
      <button type="button" className="primary saved-place-edit-btn" onClick={handleSave}>
        {saved ? t('saved.updated') : t('saved.update')}
      </button>
    </div>
  );
}

/** Whole hours 0–23 (full day) */
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SavedPlaces() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { themeId } = useTheme();
  const isVoyage = themeId === 'voyage-light' || themeId === 'voyage-dark';
  const { savedPlaces, removeSavedPlace, setVotes, updateSavedPlace, addSavedPlace, days, addToTimeline } = useItinerary();
  const maxVotes = savedPlaces.length ? Math.max(...savedPlaces.map((p) => p.votes || 0)) : 0;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalPlace, setAddModalPlace] = useState(null);
  const [addDayId, setAddDayId] = useState('');
  const [addDayIndex, setAddDayIndex] = useState(0);
  const [addTimeMode, setAddTimeMode] = useState('specific');
  const [addStartHour, setAddStartHour] = useState(9);
  const [addEndHour, setAddEndHour] = useState(11);

  const pasteUrl = location.state?.pasteUrl || '';
  const [importOpen, setImportOpen] = useState(false);
  const [quickPaste, setQuickPaste] = useState(pasteUrl || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | maps | instagram | xhs | blog | link
  const [categoryFilter, setCategoryFilter] = useState('all'); // keys from VOYAGE_CATEGORY_PRESETS
  const [collectionFilter, setCollectionFilter] = useState(''); // exact match (case-insensitive)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDayId, setBulkDayId] = useState('');
  const [bulkStart, setBulkStart] = useState(9);
  const [bulkCollection, setBulkCollection] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editPlace, setEditPlace] = useState(null);
  const [editMode, setEditMode] = useState('full'); // 'full' | 'linkOnly'
  const [editTitle, setEditTitle] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editLink, setEditLink] = useState('');

  const [categoryPicker, setCategoryPicker] = useState({
    placeId: null,
    left: 0,
    top: 0,
    placement: 'below',
  });
  const categoryPickerRef = useRef(null);

  const measureCategoryPickerPosition = useCallback((placeId) => {
    if (!placeId) return;
    const safe = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(placeId) : String(placeId).replace(/"/g, '\\"');
    const anchor = document.querySelector(`[data-voyage-category-anchor="${safe}"]`);
    const pickerEl = categoryPickerRef.current;
    if (!anchor || !pickerEl) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ph = pickerEl.offsetHeight || pickerEl.getBoundingClientRect().height;
    const pw = pickerEl.offsetWidth || pickerEl.getBoundingClientRect().width;

    let top = rect.bottom + gap;
    let left = rect.left;
    let placement = 'below';

    const fitsBelow = rect.bottom + gap + ph <= vh - margin;
    const fitsAbove = rect.top - gap - ph >= margin;

    if (!fitsBelow && fitsAbove) {
      top = rect.top - gap - ph;
      placement = 'above';
    } else if (!fitsBelow && !fitsAbove) {
      top = Math.max(margin, vh - ph - margin);
      placement = 'below';
    }

    if (left + pw > vw - margin) left = vw - pw - margin;
    if (left < margin) left = margin;

    setCategoryPicker((p) =>
      p.placeId === placeId ? { ...p, left, top, placement } : p
    );
  }, []);

  // Inline title editing (double-click to edit in-place)
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const clickOpenTimerRef = useRef(null);
  const inlineInputRef = useRef(null);

  useEffect(() => {
    if (!isVoyage) return;
    if (pasteUrl && String(pasteUrl).trim()) {
      setImportOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Trimmed category for display & picker; keeps any saved value (including legacy labels). */
  const getDisplayCategoryLabel = (label) => String(label ?? '').trim();

  const selectPlaceCategory = (placeId, nextLabel) => {
    const next = nextLabel ? String(nextLabel).trim() : '';
    updateSavedPlace(placeId, { category: next });
    setCategoryPicker({ placeId: null, left: 0, top: 0, placement: 'below' });
  };

  useLayoutEffect(() => {
    if (!categoryPicker.placeId) return;
    const pid = categoryPicker.placeId;
    measureCategoryPickerPosition(pid);
    const raf = requestAnimationFrame(() => measureCategoryPickerPosition(pid));
    return () => cancelAnimationFrame(raf);
  }, [categoryPicker.placeId, measureCategoryPickerPosition]);

  useEffect(() => {
    if (!categoryPicker.placeId) return;
    const pid = categoryPicker.placeId;
    const tick = () => measureCategoryPickerPosition(pid);
    window.addEventListener('scroll', tick, true);
    window.addEventListener('resize', tick);
    return () => {
      window.removeEventListener('scroll', tick, true);
      window.removeEventListener('resize', tick);
    };
  }, [categoryPicker.placeId, measureCategoryPickerPosition]);

  useEffect(() => {
    if (!categoryPicker.placeId) return;
    const onDown = (e) => {
      const t = e.target;
      if (categoryPickerRef.current?.contains(t)) return;
      if (typeof t?.closest === 'function' && t.closest('[data-voyage-category-anchor]')) return;
      setCategoryPicker({ placeId: null, left: 0, top: 0, placement: 'below' });
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [categoryPicker.placeId]);

  const getSource = (place) => {
    const raw = String(place?.embedUrl || '').trim();
    if (!raw) return { key: 'link', label: 'Link' };
    let host = '';
    try {
      host = new URL(raw).hostname.toLowerCase();
    } catch {
      host = raw.toLowerCase();
    }
    const isMaps =
      host.includes('google.') ||
      host.includes('g.co') ||
      host.includes('goo.gl') ||
      host.includes('maps') ||
      raw.toLowerCase().includes('maps');
    if (isMaps) return { key: 'maps', label: 'Google Maps' };
    if (host.includes('instagram.com')) return { key: 'instagram', label: 'Instagram' };
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) return { key: 'xhs', label: '小红书' };
    if (host.includes('notion.so') || host.includes('medium.com') || host.includes('substack.com'))
      return { key: 'blog', label: 'Blog' };
    return { key: 'link', label: 'Link' };
  };

  const norm = (s) => String(s || '').trim().toLowerCase();

  const filteredPlaces = useMemo(() => {
    const q = norm(search);
    const matchesText = (p) => {
      if (!q) return true;
      return (
        norm(p?.title).includes(q) ||
        norm(p?.name).includes(q) ||
        norm(p?.category).includes(q) ||
        norm(p?.extraNote).includes(q)
      );
    };
    const matchesSourceFilter = (p) => {
      if (filter === 'all') return true;
      const src = getSource(p).key;
      return ['maps', 'instagram', 'xhs', 'blog', 'link'].includes(filter) ? src === filter : true;
    };

    const matchesCategoryFilter = (p) => {
      if (categoryFilter === 'all') return true;
      const preset = VOYAGE_CATEGORY_PRESETS.find((x) => x.key === categoryFilter);
      if (!preset) return true;
      const cat = norm(p?.category);
      if (cat === norm(preset.label)) return true;
      return preset.terms.some((term) => cat.includes(term));
    };

    const matchesFilter = (p) => matchesSourceFilter(p) && matchesCategoryFilter(p);
    const matchesCollection = (p) => {
      if (!collectionFilter) return true;
      return norm(p?.collection) === norm(collectionFilter);
    };
    return (savedPlaces || []).filter((p) => matchesText(p) && matchesFilter(p) && matchesCollection(p));
  }, [savedPlaces, search, filter, categoryFilter, collectionFilter]);

  const collections = useMemo(() => {
    const set = new Set();
    (savedPlaces || []).forEach((p) => {
      const c = String(p?.collection || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [savedPlaces]);

  const openPlanModal = (place, dayIdx = 0) => {
    if (!place || !days.length) return;
    setAddModalPlace(place);
    const idx = Math.max(0, Math.min(dayIdx, days.length - 1));
    setAddDayId(days[idx]?.id || days[0]?.id || '');
    setAddDayIndex(idx);
    setAddStartHour(9);
    setAddEndHour(11);
    setAddModalOpen(true);
  };

  const openEdit = (place, mode = 'full') => {
    if (!place) return;
    setEditMode(mode);
    setEditPlace(place);
    setEditTitle(String(place.title || place.name || '').trim());
    setEditCover(String(place.photoUrl || '').trim());
    setEditLink(String(place.mapUrl || place.embedUrl || '').trim());
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editPlace?.id) return;
    const title = editTitle.trim();
    const cover = editCover.trim();
    const link = editLink.trim();
    updateSavedPlace(editPlace.id, {
      title: editMode === 'linkOnly' ? (editPlace.title || editPlace.name || '') : (title || editPlace.title || editPlace.name || ''),
      photoUrl: cover || null,
      mapUrl: link || null,
      // Keep embedUrl for legacy rendering, but prefer mapUrl for "Open".
      embedUrl: editPlace.embedUrl || link || '',
    });
    setEditOpen(false);
    setEditPlace(null);
  };

  const openMap = (openUrl) => {
    const u = getOpenInGoogleMapsUrl(String(openUrl || '').trim());
    if (!u) return;
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  const commitInlineEdit = (place) => {
    if (!place?.id) return;
    const next = inlineEditValue.trim();
    const fallback = String(place.title || place.name || '').trim();
    const finalTitle = next || fallback;
    const before = String(place.title || place.name || '').trim();
    if (finalTitle !== before) {
      updateSavedPlace(place.id, { title: finalTitle });
    }
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const handleTitleClick = (openUrl) => {
    // Delay opening so a "double click" can cancel the timer.
    if (!openUrl) return;
    if (clickOpenTimerRef.current) window.clearTimeout(clickOpenTimerRef.current);
    clickOpenTimerRef.current = window.setTimeout(() => {
      clickOpenTimerRef.current = null;
      openMap(openUrl);
    }, 260);
  };

  const handleTitleDoubleClick = (e, place, currentTitle) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickOpenTimerRef.current) {
      window.clearTimeout(clickOpenTimerRef.current);
      clickOpenTimerRef.current = null;
    }
    setInlineEditId(place.id);
    setInlineEditValue(String(currentTitle || place.title || place.name || ''));
    setTimeout(() => inlineInputRef.current?.focus(), 0);
  };

  // Title: single-click opens the link; double-click edits title in-place.

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allFilteredSelected = filteredPlaces.length > 0 && filteredPlaces.every((p) => selectedIds.has(p.id));

  const TIME_OPTS = useMemo(() => {
    const out = [];
    for (let h = 0; h <= 23; h += 0.5) out.push(h);
    return out;
  }, []);

  const handleConfirmAddToTimeline = () => {
    if (!addModalPlace) return;
    const day = resolveDayForTimelineAdd(days, addDayId, addDayIndex);
    if (!day?.id) return;
    const src = getSource(addModalPlace).key;
    const start = addTimeMode === 'specific' ? addStartHour : addStartHour;
    const end = addTimeMode === 'specific' ? addStartHour + 1 : Math.max(addStartHour + 1, addEndHour);
    const endHour = Math.min(24, end);
    addToTimeline(day.id, {
      id: `tl-${Date.now()}`,
      name: addModalPlace.title || 'Saved place',
      mapUrl: src === 'maps' ? (addModalPlace.mapUrl || addModalPlace.embedUrl || '').trim() : '',
      startHour: start,
      endHour: endHour,
      duration: endHour - start,
      notes: addModalPlace.extraNote || '',
    });
    setAddModalOpen(false);
    setAddModalPlace(null);
  };

  if (isVoyage) {
    return (
      <div className="page saved-places-page voyage-saved">
        <header className="voyage-saved-hero">
          <div className="voyage-saved-hero-bg" aria-hidden="true" />
          <div className="voyage-saved-hero-content">
            <div className="voyage-saved-title">Explore & Discover</div>
            <form
              className="voyage-saved-paste"
              onSubmit={(e) => {
                e.preventDefault();
                const url = (quickPaste || '').trim();
                if (!url) return;
                setImportOpen(true);
              }}
            >
              <input
                type="url"
                value={quickPaste}
                onChange={(e) => setQuickPaste(e.target.value)}
                placeholder="Paste a link"
                className="voyage-saved-paste-input"
              />
              <button type="submit" className="primary voyage-saved-paste-btn">
                Add
              </button>
            </form>
            <div className="voyage-saved-search-row">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="voyage-saved-search"
                placeholder="Search saved items…"
              />
              <select className="voyage-saved-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="maps">Google Maps</option>
                <option value="instagram">Instagram</option>
                <option value="xhs">小红书</option>
                <option value="blog">Blog</option>
                <option value="link">Link</option>
              </select>
              <select
                className="voyage-saved-filter voyage-categories-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                title="Categories"
              >
                <option value="all">All</option>
                {VOYAGE_CATEGORY_PRESETS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                className="voyage-saved-filter"
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                title="Collection"
              >
                <option value="">All collections</option>
                {collections.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {selectedIds.size > 0 && (
          <div className="voyage-bulkbar">
            <div className="voyage-bulkbar-left">
              <strong>{selectedIds.size}</strong> selected
              <button type="button" className="voyage-bulk-link" onClick={clearSelection}>Clear</button>
              <button
                type="button"
                className="voyage-bulk-link"
                onClick={() => {
                  if (allFilteredSelected) clearSelection();
                  else setSelectedIds(new Set(filteredPlaces.map((p) => p.id)));
                }}
              >
                {allFilteredSelected ? 'Unselect all' : 'Select all (filtered)'}
              </button>
            </div>
            <div className="voyage-bulkbar-right">
              <select className="voyage-bulk-select" value={bulkDayId} onChange={(e) => setBulkDayId(e.target.value)}>
                <option value="">Add to day…</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <select className="voyage-bulk-select" value={bulkStart} onChange={(e) => setBulkStart(Number(e.target.value))}>
                {TIME_OPTS.map((h) => (
                  <option key={h} value={h}>{formatHour(h)}</option>
                ))}
              </select>
              <button
                type="button"
                className="voyage-bulk-btn"
                disabled={!bulkDayId}
                onClick={() => {
                  const day = days.find((d) => d.id === bulkDayId) || days[0];
                  if (!day) return;
                  const picks = filteredPlaces.filter((p) => selectedIds.has(p.id));
                  let cursor = bulkStart;
                  picks.forEach((p) => {
                    const src = getSource(p).key;
                    const start = Math.min(23, cursor);
                    const end = Math.min(24, start + 1);
                    cursor = end;
                    addToTimeline(day.id, {
                      id: `tl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                      name: p.title || p.name || 'Saved item',
                      mapUrl: src === 'maps' ? (p.mapUrl || p.embedUrl || '').trim() : '',
                      startHour: start,
                      endHour: end,
                      duration: end - start,
                      notes: p.extraNote || '',
                    });
                  });
                  clearSelection();
                }}
              >
                Add
              </button>

              <select className="voyage-bulk-select" value={bulkCollection} onChange={(e) => setBulkCollection(e.target.value)}>
                <option value="">Move to collection…</option>
                {collections.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                type="button"
                className="voyage-bulk-btn"
                disabled={!bulkCollection}
                onClick={() => {
                  const picks = filteredPlaces.filter((p) => selectedIds.has(p.id));
                  picks.forEach((p) => updateSavedPlace(p.id, { collection: bulkCollection }));
                  clearSelection();
                }}
              >
                Move
              </button>
            </div>
          </div>
        )}

        {filteredPlaces.length === 0 ? (
          <div className="empty-state">
            <p>{savedPlaces.length === 0 ? t('saved.empty') : 'No matches. Try a different filter or search.'}</p>
          </div>
        ) : (
          <div className="voyage-board" role="list">
            {filteredPlaces.map((place) => {
              const title = place.title || place.name || t('saved.placeName');
              const cover = place.photoUrl || '';
              const src = getSource(place);
              const votes = Number(place.votes || 0);
              const openUrl = place.mapUrl || place.embedUrl || '';
              const openMapsUrl = getOpenInGoogleMapsUrl(openUrl);
              const compact = !cover && src.key === 'maps';
              return (
                <article key={place.id} className={`voyage-card ${compact ? 'voyage-card-compact' : ''}`} role="listitem">
                  {!compact && (
                    <div className="voyage-card-media" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                      {!cover && <div className="voyage-card-media-fallback">{title.charAt(0).toUpperCase()}</div>}
                      {openUrl && openMapsUrl && src.key === 'maps' ? (
                        <a
                          className={`voyage-badge voyage-badge-${src.key} voyage-badge-link`}
                          href={openMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            // prevent accidental double-click handlers on the title
                            e.stopPropagation();
                          }}
                        >
                          {src.label}
                        </a>
                      ) : (
                        <span className={`voyage-badge voyage-badge-${src.key}`}>{src.label}</span>
                      )}
                      {votes > 0 && <span className="voyage-votes">▲ {votes}</span>}
                      <label className="voyage-select">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(place.id)}
                          onChange={() => toggleSelected(place.id)}
                        />
                        <span>Select</span>
                      </label>
                    </div>
                  )}
                  <div className="voyage-card-body">
                    {compact ? (
                      <div className="voyage-compact-row">
                        <label className="voyage-compact-select">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(place.id)}
                            onChange={() => toggleSelected(place.id)}
                          />
                        </label>
                        {inlineEditId === place.id ? (
                          <input
                            ref={inlineInputRef}
                            className="voyage-title-inline-input"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onBlur={() => commitInlineEdit(place)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitInlineEdit(place);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="voyage-card-title voyage-title-btn"
                            onClick={() => handleTitleClick(openUrl)}
                            onDoubleClick={(e) => handleTitleDoubleClick(e, place, title)}
                          >
                            {title}
                          </button>
                        )}
                        {openUrl && openMapsUrl && src.key === 'maps' && (
                          <button type="button" className="voyage-open-mini" onClick={() => openMap(openUrl)}>
                            {src.label}
                          </button>
                        )}
                      </div>
                    ) : (
                      inlineEditId === place.id ? (
                        <input
                          ref={inlineInputRef}
                          className="voyage-title-inline-input"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={() => commitInlineEdit(place)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitInlineEdit(place);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="voyage-card-title voyage-title-btn"
                          onClick={() => handleTitleClick(openUrl)}
                          onDoubleClick={(e) => handleTitleDoubleClick(e, place, title)}
                        >
                          {title}
                        </button>
                      )
                    )}
                    <div className="voyage-card-tags">
                      {(() => {
                        const currentCategory = getDisplayCategoryLabel(place.category);
                        const btnLabel = currentCategory || 'Categories';
                        const open = categoryPicker.placeId === place.id;
                        return (
                          <div className="voyage-category-wrap">
                            <button
                              type="button"
                              data-voyage-category-anchor={place.id}
                              aria-haspopup="menu"
                              aria-expanded={open}
                              className={`voyage-category-btn ${open ? 'voyage-category-btn--active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryPicker((prev) => {
                                  if (prev.placeId === place.id) {
                                    return { placeId: null, left: 0, top: 0, placement: 'below' };
                                  }
                                  return { placeId: place.id, left: 0, top: 0, placement: 'below' };
                                });
                              }}
                            >
                              <span className="voyage-category-btn-label">{btnLabel}</span>
                              <span className="voyage-category-caret">{open ? '▲' : '▼'}</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="voyage-card-actions">
                      <button type="button" className="voyage-btn" onClick={() => openPlanModal(place, 0)}>
                        plan
                      </button>
                      <button type="button" className="voyage-btn voyage-btn-ghost" onClick={() => openEdit(place, 'linkOnly')}>
                        Link
                      </button>
                      <button type="button" className="voyage-btn voyage-btn-danger" onClick={() => removeSavedPlace(place.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {importOpen && (
          <div className="voyage-import-backdrop" onClick={() => setImportOpen(false)}>
            <div className="voyage-import-modal" onClick={(e) => e.stopPropagation()}>
              <div className="voyage-import-header">
                <div className="voyage-import-title">Import link</div>
                <button type="button" className="voyage-import-close" onClick={() => setImportOpen(false)} aria-label="Close">×</button>
              </div>
              {getSource({ embedUrl: quickPaste }).key === 'maps' ? (
                <PlaceLinkInput
                  initialEmbedUrl={quickPaste}
                  importDirectSave
                  onImportDone={() => {
                    setImportOpen(false);
                    setQuickPaste('');
                  }}
                  onDuplicateDismiss={() => {
                    setImportOpen(false);
                    setQuickPaste('');
                    navigate('/saved', { replace: true });
                  }}
                />
              ) : (
                <VoyageLinkImport
                  initialUrl={quickPaste}
                  detectSource={getSource}
                  onSave={(payload) => {
                    addSavedPlace(payload);
                    setQuickPaste('');
                    setImportOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {editOpen && (
          <div className="voyage-import-backdrop" onClick={() => setEditOpen(false)}>
            <div className="voyage-import-modal" onClick={(e) => e.stopPropagation()}>
              <div className="voyage-import-header">
                <div className="voyage-import-title">{editMode === 'linkOnly' ? 'Edit link' : 'Edit saved item'}</div>
                <button type="button" className="voyage-import-close" onClick={() => setEditOpen(false)} aria-label="Close">×</button>
              </div>
              <div className="voyage-link-import">
                {editMode === 'full' && (
                  <div className="voyage-link-import-row">
                    <label className="voyage-link-field" style={{ flex: 1 }}>
                      <span>Title</span>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Place name" />
                    </label>
                  </div>
                )}
                <div className="voyage-link-import-row">
                  <label className="voyage-link-field" style={{ flex: 1 }}>
                    <span>Cover image URL (optional)</span>
                    <input value={editCover} onChange={(e) => setEditCover(e.target.value)} placeholder="https://..." />
                  </label>
                </div>
                <div className="voyage-link-import-row">
                  <label className="voyage-link-field" style={{ flex: 1 }}>
                    <span>Link URL</span>
                    <input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://..." />
                  </label>
                </div>
                <div className="voyage-link-import-actions">
                  <button type="button" className="primary" onClick={saveEdit} disabled={editMode === 'full' && !editTitle.trim()}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditOpen(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {categoryPicker.placeId && (() => {
          const pickerPlace = (savedPlaces || []).find((p) => p.id === categoryPicker.placeId);
          if (!pickerPlace) return null;
          const currentCategory = getDisplayCategoryLabel(pickerPlace.category);
          return createPortal(
            <div
              ref={categoryPickerRef}
              className={`voyage-category-picker ${categoryPicker.placement === 'above' ? 'voyage-category-picker--above' : ''}`}
              role="menu"
              aria-label="Select categories"
              style={{ left: categoryPicker.left, top: categoryPicker.top }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={`voyage-chip ${!currentCategory ? 'voyage-chip-active' : ''}`}
                onClick={() => selectPlaceCategory(pickerPlace.id, '')}
              >
                None
              </button>
              {VOYAGE_CATEGORY_PRESETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`voyage-chip ${currentCategory === c.label ? 'voyage-chip-active' : ''}`}
                  onClick={() => selectPlaceCategory(pickerPlace.id, c.label)}
                >
                  {c.label}
                </button>
              ))}
            </div>,
            document.body
          );
        })()}

        {addModalOpen && addModalPlace && (
          <div className="place-modal-backdrop" onClick={() => setAddModalOpen(false)}>
            <div className="place-modal" onClick={(e) => e.stopPropagation()}>
              <div className="place-modal-header">
                <h3>{t('saved.addToTimeline')}</h3>
                <button type="button" className="place-modal-close" onClick={() => setAddModalOpen(false)}>×</button>
              </div>
              <div className="place-modal-body">
                <label className="place-modal-field">
                  <span>{t('saved.day')}</span>
                  <select
                    value={addDayId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setAddDayId(id);
                      const i = days.findIndex((d) => d.id === id);
                      if (i >= 0) setAddDayIndex(i);
                    }}
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </label>
                <div className="place-modal-time-mode">
                  <span>{t('saved.time')}</span>
                  <label className="place-modal-radio">
                    <input type="radio" checked={addTimeMode === 'specific'} onChange={() => setAddTimeMode('specific')} />
                    {t('saved.specificHour')}
                  </label>
                  <label className="place-modal-radio">
                    <input type="radio" checked={addTimeMode === 'range'} onChange={() => setAddTimeMode('range')} />
                    {t('saved.betweenHours')}
                  </label>
                </div>
                {addTimeMode === 'specific' ? (
                  <label className="place-modal-field">
                    <span>{t('saved.hour')}</span>
                    <select value={addStartHour} onChange={(e) => setAddStartHour(Number(e.target.value))}>
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{formatHourDropdownLabel(h)}</option>
                      ))}
                    </select>
                    <span className="place-modal-time-hint">→ 1 hour slot (e.g. 9:00–10:00)</span>
                  </label>
                ) : (
                  <div className="place-modal-range">
                    <label className="place-modal-field">
                      <span>{t('saved.start')}</span>
                      <select value={addStartHour} onChange={(e) => { const v = Number(e.target.value); setAddStartHour(v); if (addEndHour <= v) setAddEndHour(v + 1); }}>
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{formatHourDropdownLabel(h)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="place-modal-field">
                      <span>{t('saved.end')}</span>
                      <select value={addEndHour} onChange={(e) => setAddEndHour(Number(e.target.value))}>
                        {Array.from({ length: 24 - addStartHour }, (_, i) => addStartHour + 1 + i).map((h) => (
                          <option key={h} value={h}>{h <= 23 ? formatHourDropdownLabel(h) : formatHour(24)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
              <div className="place-modal-footer">
                <button type="button" onClick={() => setAddModalOpen(false)}>{t('saved.cancel')}</button>
                <button type="button" className="primary" onClick={handleConfirmAddToTimeline}>
                  {t('saved.addToTimeline')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page saved-places-page">
      <header className="page-header">
        <h1>{t('saved.title')}</h1>
      </header>

      <PlaceLinkInput initialEmbedUrl={pasteUrl} />

      <h2 className="saved-places-list-title">{t('saved.listTitle')}</h2>
      {savedPlaces.length === 0 ? (
        <div className="empty-state">
          <p>{t('saved.empty')}</p>
        </div>
      ) : (
        <div className="saved-places-grid">
          {savedPlaces.map((place) => (
            <div key={place.id} className="saved-place-card animate-in">
              <PlaceCard place={place} onAddToDay={() => handleOpenAddModal(place)} />
              <SavedPlaceEdit place={place} onUpdate={updateSavedPlace} />
              <div className="saved-place-footer">
                <VotingUI
                  itemId={place.id}
                  votes={place.votes ?? 0}
                  isMostVoted={(place.votes || 0) === maxVotes && maxVotes > 0}
                  onVote={(id, count) => setVotes(id, count)}
                />
                <button type="button" onClick={() => removeSavedPlace(place.id)}>
                  {t('saved.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addModalOpen && addModalPlace && (
        <div className="place-modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="place-modal" onClick={(e) => e.stopPropagation()}>
            <div className="place-modal-header">
              <h3>{t('saved.addToTimeline')}</h3>
              <button type="button" className="place-modal-close" onClick={() => setAddModalOpen(false)}>×</button>
            </div>
            <div className="place-modal-body">
              <label className="place-modal-field">
                <span>{t('saved.day')}</span>
                <select
                  value={addDayId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAddDayId(id);
                    const i = days.findIndex((d) => d.id === id);
                    if (i >= 0) setAddDayIndex(i);
                  }}
                >
                  {days.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </label>
              <div className="place-modal-time-mode">
                <span>{t('saved.time')}</span>
                <label className="place-modal-radio">
                  <input type="radio" checked={addTimeMode === 'specific'} onChange={() => setAddTimeMode('specific')} />
                  {t('saved.specificHour')}
                </label>
                <label className="place-modal-radio">
                  <input type="radio" checked={addTimeMode === 'range'} onChange={() => setAddTimeMode('range')} />
                  {t('saved.betweenHours')}
                </label>
              </div>
              {addTimeMode === 'specific' ? (
                <label className="place-modal-field">
                  <span>{t('saved.hour')}</span>
                  <select value={addStartHour} onChange={(e) => setAddStartHour(Number(e.target.value))}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{formatHourDropdownLabel(h)}</option>
                    ))}
                  </select>
                  <span className="place-modal-time-hint">→ 1 hour slot (e.g. 9:00–10:00)</span>
                </label>
              ) : (
                <div className="place-modal-range">
                  <label className="place-modal-field">
                    <span>{t('saved.start')}</span>
                    <select value={addStartHour} onChange={(e) => { const v = Number(e.target.value); setAddStartHour(v); if (addEndHour <= v) setAddEndHour(v + 1); }}>
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{formatHourDropdownLabel(h)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="place-modal-field">
                    <span>{t('saved.end')}</span>
                    <select value={addEndHour} onChange={(e) => setAddEndHour(Number(e.target.value))}>
                      {Array.from({ length: 24 - addStartHour }, (_, i) => addStartHour + 1 + i).map((h) => (
                        <option key={h} value={h}>{h <= 23 ? formatHourDropdownLabel(h) : formatHour(24)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="place-modal-footer">
              <button type="button" onClick={() => setAddModalOpen(false)}>{t('saved.cancel')}</button>
              <button type="button" className="primary" onClick={handleConfirmAddToTimeline}>
                {t('saved.addToTimeline')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VoyageLinkImport({ initialUrl, detectSource, onSave }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [collection, setCollection] = useState('');
  const [openTime, setOpenTime] = useState('-');
  const [closeTime, setCloseTime] = useState('-');
  const [coverUrl, setCoverUrl] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setUrl(initialUrl || '');
  }, [initialUrl]);

  const src = detectSource({ embedUrl: url });

  const suggestTitle = () => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      return host ? `Link from ${host}` : 'Saved link';
    } catch {
      return 'Saved link';
    }
  };

  const handleSave = () => {
    const u = (url || '').trim();
    if (!u) return;
    const hours =
      openTime === '-' || closeTime === '-' ? '—' : `${openTime} – ${closeTime}`;
    const payload = {
      id: `place-${Date.now()}`,
      title: (title || '').trim() || suggestTitle(),
      hours,
      rating: null,
      // Categories use Voyage presets (not source labels like Google Maps/Link).
      category: (category || '').trim() || '',
      collection: (collection || '').trim() || '',
      photoUrl: (coverUrl || '').trim() || null,
      reviews: [],
      embedUrl: u,
      extraNote: (note || '').trim(),
    };
    onSave?.(payload);
  };

  return (
    <div className="voyage-link-import">
      <div className="voyage-link-import-row">
        <span className={`voyage-badge voyage-badge-${src.key}`}>{src.label}</span>
      </div>
      <label className="voyage-link-field">
        <span>Link</span>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label className="voyage-link-field">
        <span>Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggestTitle()} />
      </label>
      <div className="voyage-link-import-split">
        <label className="voyage-link-field">
          <span>Categories (optional)</span>
          <div className="voyage-import-category-grid">
            <button
              type="button"
              className={`voyage-chip ${!category ? 'voyage-chip-active' : ''}`}
              onClick={() => setCategory('')}
            >
              All
            </button>
            {VOYAGE_CATEGORY_PRESETS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`voyage-chip ${category === c.label ? 'voyage-chip-active' : ''}`}
                onClick={() => setCategory(c.label)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </label>
        <label className="voyage-link-field">
          <span>Collection (optional)</span>
          <input type="text" value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="e.g. Osaka list / Food spots" />
        </label>
      </div>
      <div className="voyage-link-import-split">
        <label className="voyage-link-field">
          <span>Open (optional)</span>
          <select value={openTime} onChange={(e) => setOpenTime(e.target.value)}>
            <option value="-">-</option>
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="voyage-link-field">
          <span>Close (optional)</span>
          <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)}>
            <option value="-">-</option>
            {TIME_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="voyage-link-import-split">
        <label className="voyage-link-field">
          <span>Cover image URL (optional)</span>
          <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="voyage-link-field">
          <span>Note (optional)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you saved this?" />
        </label>
      </div>
      <div className="voyage-link-import-actions">
        <button type="button" className="primary" onClick={handleSave}>
          Save link
        </button>
      </div>
    </div>
  );
}

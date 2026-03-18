import { useEffect, useMemo, useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { formatHour } from '../utils/time';
import './VoyagePlan.css';

function byStart(a, b) {
  const sa = Number(a?.startHour ?? 0);
  const sb = Number(b?.startHour ?? 0);
  if (sa !== sb) return sa - sb;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

function getMapUrl(item) {
  const u = (item?.mapUrl || '').trim();
  return u || '';
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

export default function VoyagePlan({ days }) {
  const { updateDayTimeline, savedPlaces } = useItinerary();
  const [selectedDayId, setSelectedDayId] = useState(() => (days?.[0]?.id ?? null));
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [editItem, setEditItem] = useState(null); // { id, startHour, endHour }

  useEffect(() => {
    if (!days?.length) return;
    if (!selectedDayId || !days.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(days[0].id);
      setSelectedItemId(null);
    }
  }, [days, selectedDayId]);

  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];
  const items = useMemo(() => {
    const tl = Array.isArray(selectedDay?.timeline) ? selectedDay.timeline : [];
    return [...tl].sort(byStart);
  }, [selectedDay?.timeline]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((it) => it.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  useEffect(() => {
    if (!items.length) {
      setSelectedItemId(null);
      return;
    }
    if (selectedItemId && items.some((it) => it.id === selectedItemId)) return;
    setSelectedItemId(items[0].id);
  }, [items, selectedItemId]);

  const savedIndex = useMemo(() => {
    const map = new Map();
    (savedPlaces || []).forEach((p) => {
      const nameKey = norm(p?.title || p?.name);
      const urlKey = norm(p?.embedUrl);
      if (nameKey && !map.has(`n:${nameKey}`)) map.set(`n:${nameKey}`, p);
      if (urlKey && !map.has(`u:${urlKey}`)) map.set(`u:${urlKey}`, p);
    });
    return map;
  }, [savedPlaces]);

  const enrich = (item) => {
    if (!item || typeof item !== 'object') return { thumb: '', category: '', source: '', sourceKey: 'link' };
    const url = norm(item.mapUrl);
    const nameKey = norm(item.name);
    const byUrl = url ? savedIndex.get(`u:${url}`) : null;
    const byName = nameKey ? savedIndex.get(`n:${nameKey}`) : null;
    const p = byUrl || byName;
    const thumb = (p?.photoUrl || '').trim();
    const category = (p?.category || '').trim();
    const sourceKey = url ? 'maps' : 'link';
    const source = sourceKey === 'maps' ? 'Google Maps' : 'Activity';
    return { thumb, category, source, sourceKey };
  };

  const mapUrl = getMapUrl(selectedItem);
  const selectedMeta = enrich(selectedItem);

  const TIME_OPTS = useMemo(() => {
    const out = [];
    for (let h = 8; h <= 23; h += 0.5) out.push(h);
    return out;
  }, []);

  const applyReordered = (nextOrdered) => {
    // Recompute start/end sequentially, preserving durations, starting at 9:00.
    const startBase = 9;
    let cursor = startBase;
    const next = nextOrdered.map((it) => {
      const dur = Math.max(0.5, Number(it.duration || (it.endHour - it.startHour) || 1));
      const start = Math.min(23, cursor);
      const end = Math.min(23.5, start + dur);
      cursor = end;
      return { ...it, startHour: start, endHour: end, duration: end - start };
    });
    updateDayTimeline(selectedDay.id, next);
  };

  return (
    <div className="voyage-plan">
      <aside className="voyage-plan-days" aria-label="Days">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`voyage-day-tab ${d.id === selectedDayId ? 'voyage-day-tab-active' : ''}`}
            onClick={() => {
              setSelectedDayId(d.id);
              setSelectedItemId(null);
            }}
          >
            {d.label}
          </button>
        ))}
      </aside>

      <section className="voyage-plan-main" aria-label="Plan">
        <div className="voyage-plan-toolbar">
          <div className="voyage-plan-title">Itinerary/Plan</div>
          <div className="voyage-plan-tools">
            <button type="button" className="voyage-pill">
              Activity
            </button>
            <button type="button" className="voyage-pill">
              Map
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="voyage-empty">
            <p>No activities yet for this day.</p>
            <p>Add from 收藏 or click time slots in the classic timeline.</p>
          </div>
        ) : (
          <ol className="voyage-plan-list">
            {items.map((item, idx) => {
              const isTransport = item.type === 'transport';
              const active = item.id === selectedItemId;
              const time = `${formatHour(item.startHour)} – ${formatHour(item.endHour)}`;
              const title = isTransport ? `🚆 ${item.lineName || item.name}` : item.name;
              const url = getMapUrl(item);
              const meta = enrich(item);
              return (
                <li
                  key={item.id}
                  className="voyage-plan-row"
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === item.id) return;
                    const from = items.findIndex((x) => x.id === dragId);
                    const to = items.findIndex((x) => x.id === item.id);
                    if (from < 0 || to < 0) return;
                    const next = [...items];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    applyReordered(next);
                    setDragId(null);
                  }}
                >
                  <button
                    type="button"
                    className={`voyage-plan-card ${active ? 'voyage-plan-card-active' : ''} ${
                      isTransport ? 'voyage-plan-card-transport' : ''
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div className="voyage-plan-card-top">
                      <span className="voyage-plan-time">{time}</span>
                      {!isTransport && <span className={`voyage-source-badge voyage-source-badge-${meta.sourceKey}`}>{meta.source}</span>}
                    </div>
                    <div className="voyage-plan-card-mid">
                      <div className="voyage-plan-thumb" aria-hidden="true">
                        {meta.thumb ? (
                          <span className="voyage-plan-thumb-img" style={{ backgroundImage: `url(${meta.thumb})` }} />
                        ) : (
                          <span className="voyage-plan-thumb-fallback">{String(title || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="voyage-plan-text">
                        <div className="voyage-plan-name">{title}</div>
                        {!isTransport && meta.category && <div className="voyage-plan-sub">{meta.category}</div>}
                      </div>
                    </div>
                    <div className="voyage-plan-card-actions">
                      <button
                        type="button"
                        className="voyage-icon-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditItem({ id: item.id, startHour: item.startHour, endHour: item.endHour });
                        }}
                        title="Edit time"
                        aria-label="Edit time"
                      >
                        ⏱
                      </button>
                      <span className="voyage-drag-hint" title="Drag to reorder" aria-hidden>
                        ⋮⋮
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="voyage-plan-x"
                    aria-label="Remove"
                    onClick={() => {
                      const tl = Array.isArray(selectedDay?.timeline) ? selectedDay.timeline : [];
                      updateDayTimeline(selectedDay.id, tl.filter((t) => t.id !== item.id));
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <aside className="voyage-plan-map" aria-label="Map">
        <div className="voyage-map-frame">
          {mapUrl ? (
            <iframe
              title="Map preview"
              src={mapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="voyage-map-iframe"
            />
          ) : (
            <div className="voyage-map-placeholder">
              <div className="voyage-map-placeholder-pin">📍</div>
              <div className="voyage-map-placeholder-text">Select an activity with a map link</div>
            </div>
          )}
        </div>

        <div className="voyage-map-details">
          <div className="voyage-map-details-title">{selectedItem?.name || '—'}</div>
          {selectedMeta?.category && <div className="voyage-map-chip">{selectedMeta.category}</div>}
          {selectedItem?.notes ? (
            <div className="voyage-map-details-desc">{selectedItem.notes}</div>
          ) : (
            <div className="voyage-map-details-desc">Pick an item to see details.</div>
          )}
          {mapUrl && (
            <a className="voyage-map-btn" href={mapUrl} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          )}
        </div>
      </aside>

      {editItem && (
        <div className="voyage-time-backdrop" onClick={() => setEditItem(null)}>
          <div className="voyage-time-modal" onClick={(e) => e.stopPropagation()}>
            <div className="voyage-time-title">Edit time</div>
            <div className="voyage-time-row">
              <label className="voyage-time-field">
                <span>Start</span>
                <select
                  value={editItem.startHour}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setEditItem((p) => ({ ...p, startHour: v, endHour: Math.max(v + 0.5, p.endHour) }));
                  }}
                >
                  {TIME_OPTS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
              <label className="voyage-time-field">
                <span>End</span>
                <select
                  value={editItem.endHour}
                  onChange={(e) => setEditItem((p) => ({ ...p, endHour: Number(e.target.value) }))}
                >
                  {TIME_OPTS.filter((h) => h > editItem.startHour).map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="voyage-time-actions">
              <button type="button" onClick={() => setEditItem(null)}>Cancel</button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const tl = Array.isArray(selectedDay?.timeline) ? selectedDay.timeline : [];
                  const next = tl.map((t) => {
                    if (t.id !== editItem.id) return t;
                    const start = Number(editItem.startHour);
                    const end = Math.max(start + 0.5, Number(editItem.endHour));
                    return { ...t, startHour: start, endHour: end, duration: end - start };
                  });
                  updateDayTimeline(selectedDay.id, next);
                  setEditItem(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


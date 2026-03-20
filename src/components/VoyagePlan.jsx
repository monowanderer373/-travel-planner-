import { useEffect, useMemo, useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { formatHour } from '../utils/time';
import { getOpenInGoogleMapsUrl } from '../utils/mapsEmbed';
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
  const { updateDayTimeline, savedPlaces, trip } = useItinerary();
  const { lang } = useLanguage();
  const [selectedDayId, setSelectedDayId] = useState(() => (days?.[0]?.id ?? null));
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [editItem, setEditItem] = useState(null); // { id, startHour, endHour }
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const s = trip?.startDate;
    const d = s ? new Date(s) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!days?.length) return;
    if (!selectedDayId || !days.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(days[0].id);
      setSelectedItemId(null);
    }
  }, [days, selectedDayId]);

  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];
  const selectedDayIndex = Math.max(0, days.findIndex((d) => d.id === selectedDay?.id));
  const selectedDayDate = useMemo(() => {
    if (!trip?.startDate) return '';
    try {
      const d = new Date(trip.startDate);
      d.setDate(d.getDate() + selectedDayIndex);
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }, [trip?.startDate, selectedDayIndex]);

  const tripRange = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return null;
    try {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return { start, end };
    } catch {
      return null;
    }
  }, [trip?.startDate, trip?.endDate]);
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

  const TIME_OPTS = useMemo(() => {
    const out = [];
    for (let h = 0; h <= 23.5; h += 0.5) out.push(h);
    out.push(24); // end of calendar day (midnight) for “end” pickers
    return out;
  }, []);

  const applyReordered = (nextOrdered) => {
    // Recompute start/end sequentially, preserving durations, starting at 9:00.
    const startBase = 9;
    let cursor = startBase;
    const next = nextOrdered.map((it) => {
      const dur = Math.max(0.5, Number(it.duration || (it.endHour - it.startHour) || 1));
      const start = Math.min(23, cursor);
      const end = Math.min(24, start + dur);
      cursor = end;
      return { ...it, startHour: start, endHour: end, duration: end - start };
    });
    updateDayTimeline(selectedDay.id, next);
  };

  const openCalendar = () => {
    const base = trip?.startDate ? new Date(trip.startDate) : new Date();
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setCalendarOpen(true);
  };

  const monthLabel = (d) => {
    try {
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  };

  const dows = useMemo(() => {
    if (lang === 'zh-CN') return ['日', '一', '二', '三', '四', '五', '六'];
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [lang]);

  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startDow = first.getDay(); // 0 Sun
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startDow);
    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const inMonth = d.getMonth() === first.getMonth();
      const inRange = !!tripRange && d >= tripRange.start && d <= tripRange.end;
      out.push({ d, inMonth, inRange });
    }
    return out;
  }, [calendarMonth, tripRange]);

  const selectDate = (d) => {
    if (!tripRange) return;
    if (d < tripRange.start || d > tripRange.end) return;
    const idx = Math.round((d.getTime() - tripRange.start.getTime()) / 86400000);
    const target = days[idx];
    if (!target) return;
    setSelectedDayId(target.id);
    setSelectedItemId(null);
    setCalendarOpen(false);
  };

  return (
    <div className="voyage-plan">
      <div className="voyage-plan-daypicker">
        <button type="button" className="voyage-daypicker-btn" onClick={openCalendar}>
          <span className="voyage-daypicker-label">{selectedDay?.label || 'Day'}</span>
          {selectedDayDate && <span className="voyage-daypicker-date">{selectedDayDate}</span>}
          <span className="voyage-daypicker-icon" aria-hidden>📅</span>
        </button>
      </div>
      <aside className="voyage-plan-days" aria-label="Days">
        <div className="voyage-days-head">
          <button type="button" className="voyage-days-cal" onClick={openCalendar} aria-label="Calendar" title="Calendar">
            📅
          </button>
        </div>
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
            <p>Add from Saved Places or click time slots in the classic timeline.</p>
          </div>
        ) : (
          <ol className="voyage-plan-list">
            {items.map((item, idx) => {
              const isTransport = item.type === 'transport';
              const active = item.id === selectedItemId;
              const time = `${formatHour(item.startHour)} – ${formatHour(item.endHour)}`;
              const title = isTransport ? `🚆 ${item.lineName || item.name}` : item.name;
              const url = getMapUrl(item);
              const openMapsUrl = getOpenInGoogleMapsUrl(url);
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
                      {!isTransport &&
                        (openMapsUrl ? (
                          <a
                            href={openMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`voyage-source-badge voyage-source-badge-${meta.sourceKey} voyage-source-badge-link`}
                            onClick={(e) => e.stopPropagation()}
                            title="Open in Google Maps"
                          >
                            {meta.source}
                          </a>
                        ) : (
                          <span className={`voyage-source-badge voyage-source-badge-${meta.sourceKey}`}>{meta.source}</span>
                        ))}
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
                  {TIME_OPTS.filter((h) => h < 24).map((h) => (
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

      {calendarOpen && (
        <div className="voyage-cal-backdrop" onClick={() => setCalendarOpen(false)}>
          <div className="voyage-cal" onClick={(e) => e.stopPropagation()}>
            <div className="voyage-cal-head">
              <button
                type="button"
                className="voyage-cal-nav"
                onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <div className="voyage-cal-title">{monthLabel(calendarMonth)}</div>
              <button
                type="button"
                className="voyage-cal-nav"
                onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                ›
              </button>
              <button type="button" className="voyage-cal-close" onClick={() => setCalendarOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="voyage-cal-grid">
              {dows.map((w) => (
                <div key={w} className="voyage-cal-dow">{w}</div>
              ))}
              {calendarDays.map(({ d, inMonth, inRange }, i) => {
                const iso = d.toISOString().slice(0, 10);
                const active = iso === selectedDayDate;
                return (
                  <button
                    key={`${iso}-${i}`}
                    type="button"
                    className={`voyage-cal-day ${inMonth ? '' : 'dim'} ${inRange ? 'in' : ''} ${active ? 'active' : ''}`}
                    onClick={() => selectDate(d)}
                    disabled={!inRange}
                    aria-label={iso}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            {tripRange && (
              <div className="voyage-cal-foot">
                {tripRange.start.toISOString().slice(0, 10)} → {tripRange.end.toISOString().slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Format hour (integer or fractional, e.g. 9.5 for 9:30) as "9:00 AM" or "9:30 AM".
 */
export function formatHour(hour) {
  if (hour == null) return '—';
  const h = Math.floor(hour);
  let m = Math.round((hour - h) * 60);
  if (m >= 60) {
    m = 0;
  }
  // End-of-calendar-day (24:00) — show as midnight for same-day ranges
  if (h === 24 && m === 0) return '12:00 AM';
  const displayH = h % 12 || 12;
  const ampm = h < 12 ? ' AM' : ' PM';
  return m === 0 ? `${displayH}:00${ampm}` : `${displayH}:${String(m).padStart(2, '0')}${ampm}`;
}

/**
 * Label for whole-hour dropdowns (0–23), 12h clock.
 */
export function formatHourDropdownLabel(h) {
  if (h === 0) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

/** Number of calendar days between start and end (inclusive). */
export function getTotalTravelDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (end < start) return 0;
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

/** Date string (YYYY-MM-DD) in local time for day index 0-based. */
export function getDayDate(startDate, dayIndex) {
  if (!startDate) return null;
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + dayIndex);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Trip status based on today vs start/end dates.
 * @returns 'upcoming' | 'current' | 'past' | null (if dates missing)
 */
export function getTripStatus(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  if (start > today) return 'upcoming';
  if (end < today) return 'past';
  return 'current';
}

/** Short label for display e.g. "Mar 10" (local time). */
export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/** "Day 1 (Mar 10)" or "Day 1" if no startDate. */
export function getDayLabel(dayIndex, startDate) {
  const n = dayIndex + 1;
  if (!startDate) return `Day ${n}`;
  const dateStr = getDayDate(startDate, dayIndex);
  const short = formatDateShort(dateStr);
  return short ? `Day ${n} (${short})` : `Day ${n}`;
}

/**
 * Get city name for a day index if cities with date ranges are defined.
 * @param {number} dayIndex - 0-based day index
 * @param {string} startDate - trip start YYYY-MM-DD
 * @param {Array<{ name: string, startDate: string, endDate: string }>} cities
 * @returns {string|null} - city name or null
 */
export function getCityForDay(dayIndex, startDate, cities) {
  if (!startDate || !Array.isArray(cities) || cities.length === 0) return null;
  const dayDateStr = getDayDate(startDate, dayIndex);
  if (!dayDateStr) return null;
  const dayDate = new Date(dayDateStr + 'T00:00:00');
  for (const city of cities) {
    if (!city.name || !city.startDate || !city.endDate) continue;
    const start = new Date(city.startDate + 'T00:00:00');
    const end = new Date(city.endDate + 'T23:59:59');
    if (dayDate >= start && dayDate <= end) return city.name.trim();
  }
  return null;
}

/** "Day 1 — Tokyo" or "Day 1 (Mar 10)" when cities are used or not. */
export function getDayLabelWithCity(dayIndex, startDate, cities) {
  const n = dayIndex + 1;
  const city = getCityForDay(dayIndex, startDate, cities);
  if (city) return `Day ${n} — ${city}`;
  return getDayLabel(dayIndex, startDate);
}

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
  const displayH = h % 12 || 12;
  const ampm = h < 12 ? ' AM' : ' PM';
  return m === 0 ? `${displayH}:00${ampm}` : `${displayH}:${String(m).padStart(2, '0')}${ampm}`;
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

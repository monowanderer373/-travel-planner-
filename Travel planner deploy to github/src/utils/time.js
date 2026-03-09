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

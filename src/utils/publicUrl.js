/**
 * Base URL used for share links so friends get the published site, not localhost.
 * Always includes the app base path (e.g. /-travel-planner-) so links don't 404.
 */
export function getPublicBaseUrl() {
  const pub = import.meta.env.VITE_APP_PUBLIC_URL;
  if (pub && typeof pub === 'string' && pub.trim()) {
    const url = pub.trim().replace(/\/$/, '');
    try {
      const parsed = new URL(url);
      if (parsed.pathname && parsed.pathname !== '/') return url;
    } catch {}
  }
  return getInviteBaseUrl();
}

/** Base URL for invite links; includes GitHub Pages project path (e.g. origin + "/-travel-planner-"). */
export function getInviteBaseUrl() {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin.includes('github.io')) {
    const path = (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '') || '-travel-planner-';
    return `${origin}/${path}`.replace(/\/$/, '');
  }
  const base = import.meta.env.BASE_URL || '/';
  const path = base.replace(/^\/+|\/+$/g, '') || '';
  return path ? `${origin}/${path}`.replace(/\/$/, '') : origin;
}

/** Decode invite token to get tripId. Supports btoa(JSON.stringify({ trip: tripId })) or raw tripId (backwards compat). */
export function decodeInviteToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = atob(token);
    const decoded = JSON.parse(raw);
    if (decoded && typeof decoded.trip !== 'undefined') return String(decoded.trip);
  } catch {
    // Support legacy/truncated tokens like "eyJ0cmlwIjoxNz" -> {"trip":17
    try {
      const raw = atob(token);
      const m = raw.match(/"trip"\s*:\s*"?([^",}\s]+)"?/);
      if (m?.[1]) return String(m[1]);
    } catch {}
  }
  return token;
}

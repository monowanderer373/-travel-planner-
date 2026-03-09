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
  if (typeof window !== 'undefined') {
    const base = import.meta.env.BASE_URL || '/';
    const path = base.replace(/^\/+|\/+$/g, '') || '';
    const origin = window.location.origin;
    return path ? `${origin}/${path}` : origin;
  }
  return '';
}

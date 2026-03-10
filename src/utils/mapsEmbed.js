/**
 * Normalize Google Maps URLs for iframe embed to avoid "Some customised on-map content could not be displayed".
 * Prefer q=lat,lng or q=searchTerm so the map loads reliably.
 */

function extractCoordsFromMapsUrl(u) {
  const atMatch = u.match(/@(-?[\d.]+),(-?[\d.]+)(?:,[\d.]+)?/);
  if (atMatch) {
    const [, lat, lng] = atMatch;
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (latN >= -90 && latN <= 90 && lngN >= -180 && lngN <= 180) return `${lat},${lng}`;
  }
  const qMatch = u.match(/[?&](?:q|ll)=(-?[\d.]+),(-?[\d.]+)/);
  if (qMatch) {
    const [, lat, lng] = qMatch;
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (latN >= -90 && latN <= 90 && lngN >= -180 && lngN <= 180) return `${lat},${lng}`;
  }
  const dataMatch = u.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/);
  if (dataMatch) {
    const [, lat, lng] = dataMatch;
    return `${lat},${lng}`;
  }
  return null;
}

export function normalizeToEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (!u.startsWith('http')) return null;
  if (u.includes('maps/embed') && u.includes('q=')) return u;
  if (u.includes('google.com/maps') && u.includes('output=embed')) return u;

  const coords = extractCoordsFromMapsUrl(u);
  if (coords) return `https://www.google.com/maps?q=${coords}&output=embed`;

  const searchPathMatch = u.match(/google\.com\/maps\/search\/([^/?#]+)/);
  if (searchPathMatch) {
    const term = decodeURIComponent(searchPathMatch[1].replace(/\+/g, ' '));
    return `https://www.google.com/maps?q=${encodeURIComponent(term)}&output=embed`;
  }
  if (u.includes('google.com/maps') && u.includes('?')) {
    try {
      const parsed = new URL(u);
      parsed.searchParams.set('output', 'embed');
      return parsed.toString();
    } catch (_) {}
  }
  if (u.includes('goo.gl/maps') || u.includes('maps.app.goo.gl')) {
    return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(u)}`;
  }
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('google') && parsed.pathname.includes('maps')) {
      const q = parsed.searchParams.get('q') || parsed.pathname.split('/').pop() || '';
      if (q) return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    }
  } catch (_) {}
  return null;
}

/** Use when displaying an iframe: always try to normalize so the map loads without "custom content" error. */
export function getDisplayEmbedUrl(embedUrl) {
  if (!embedUrl) return null;
  return normalizeToEmbedUrl(embedUrl) || embedUrl;
}

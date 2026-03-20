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

/**
 * Best-effort extraction of a human-readable place name from a Google Maps URL.
 * Works for many `google.com/maps/place/<NAME>` or `q=<NAME>` links.
 * Short links like `maps.app.goo.gl/...` typically do NOT contain the name.
 */
export function extractPlaceNameFromGoogleMapsUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const raw = url.trim();
  if (!raw.startsWith('http')) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const isMaps = host.includes('google.') || host.includes('g.co') || host.includes('goo.gl') || host.includes('maps');
  if (!isMaps) return null;

  // google.com/maps/place/<NAME>
  const placeIdx = u.pathname.toLowerCase().split('/').indexOf('place');
  if (placeIdx >= 0) {
    const seg = u.pathname.split('/')[placeIdx + 1] || '';
    const name = seg ? decodeURIComponent(seg.replace(/\+/g, ' ')) : '';
    const cleaned = name.replace(/@.*$/, '').replace(/\s+/g, ' ').trim();
    if (cleaned) return cleaned;
  }

  // q=<NAME> or query=<NAME>
  const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('destination') || '';
  if (q) {
    const decoded = decodeURIComponent(q.replace(/\+/g, ' ')).trim();
    // If it looks like coords, skip.
    if (!decoded.match(/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/)) {
      return decoded;
    }
  }

  // Fallback: last meaningful path segment
  const parts = u.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  const decodedLast = last ? decodeURIComponent(last.replace(/\+/g, ' ')) : '';
  const cleanedLast = decodedLast.replace(/@.*$/, '').replace(/\s+/g, ' ').trim();
  if (cleanedLast && cleanedLast.length > 2 && !cleanedLast.includes('maps')) return cleanedLast;

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

/**
 * URL safe to open in a new tab / window (not iframe-only embed).
 * Embed URLs (maps/embed, output=embed) cause: "The Google Maps Embed API must be used in an iframe."
 */
export function getOpenInGoogleMapsUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const raw = url.trim();
  if (!raw.startsWith('http')) return raw;

  // Short links resolve in the browser — OK for top-level navigation
  if (/maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/maps/i.test(raw)) return raw;

  try {
    const u = new URL(raw);

    // iframe embed path — rebuild as a normal Maps search / view URL
    if (u.hostname.includes('google.') && u.pathname.includes('/maps/embed')) {
      const q = u.searchParams.get('q');
      if (q && q.trim()) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q.trim())}`;
      }
      const pb = u.searchParams.get('pb');
      if (pb) {
        // iframe 里常见的占位/极简 pb（如 !1m0!7b1）无法在新标签页打开为有效地点页
        const trimmed = pb.trim();
        if (trimmed.length < 40 || /^!1m\d+!7b\d+$/i.test(trimmed)) {
          return '';
        }
        return `https://www.google.com/maps?pb=${encodeURIComponent(pb)}`;
      }
      return 'https://www.google.com/maps/';
    }

    // e.g. .../maps?q=...&output=embed — strip embed mode for top-level navigation
    if (u.hostname.includes('google.') && u.pathname.includes('maps')) {
      if (u.searchParams.get('output') === 'embed') u.searchParams.delete('output');
      return u.toString();
    }

    return raw;
  } catch {
    return raw;
  }
}

/** Share / open-in-app URL (not necessarily embed). */
export function extractSourceUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let urlToCheck = trimmed;
  if (trimmed.includes('<iframe') && trimmed.includes('src=')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) urlToCheck = match[1].trim();
  }
  return urlToCheck.startsWith('http') ? urlToCheck : null;
}

/** Best embeddable URL for iframe + duplicate checks. */
export function extractEmbedUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let urlToCheck = trimmed;
  if (trimmed.includes('<iframe') && trimmed.includes('src=')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) urlToCheck = match[1].trim();
  }
  if (urlToCheck.startsWith('http') && urlToCheck.includes('maps/embed')) return urlToCheck;
  const normalized = normalizeToEmbedUrl(urlToCheck);
  if (normalized) return normalized;
  return urlToCheck.startsWith('http') ? urlToCheck : null;
}

export function normalizeMapsUrlForCompare(url) {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (!t) return '';
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = (u.pathname || '').replace(/\/+$/, '') || '';
    const search = u.search || '';
    return `${host}${path}${search}`;
  } catch {
    return t.toLowerCase();
  }
}

export function urlsProbablySameMapsLink(a, b) {
  if (!a || !b) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (sa === sb) return true;
  return normalizeMapsUrlForCompare(sa) === normalizeMapsUrlForCompare(sb);
}

/**
 * @returns {object | null} first saved place whose embed/map URL matches the pasted input
 */
export function findSavedPlaceByDuplicateLink(embedInputRaw, savedPlaces) {
  const embed = extractEmbedUrl(embedInputRaw);
  const source = extractSourceUrl(embedInputRaw) || embed;
  const raw = String(embedInputRaw || '').trim();
  const candidates = [embed, source, raw].filter(Boolean);
  if (candidates.length === 0) return null;
  for (const p of savedPlaces || []) {
    const pe = (p.embedUrl || '').trim();
    const pm = (p.mapUrl || '').trim();
    for (const c of candidates) {
      if (urlsProbablySameMapsLink(c, pe) || urlsProbablySameMapsLink(c, pm)) return p;
    }
  }
  return null;
}

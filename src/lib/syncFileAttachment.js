/**
 * Convert user uploads to strings that survive JSON sync (Supabase shared_itineraries, etc.).
 * blob: URLs are browser-local and must NOT be stored for collaboration.
 */

export const SYNC_FILE_ERROR_TOO_LARGE = 'FILE_TOO_LARGE';

/** Default cap ~1.5MB binary → ~2MB base64; keeps itinerary JSON within practical limits. */
export const DEFAULT_MAX_SYNC_FILE_BYTES = Math.floor(1.5 * 1024 * 1024);

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * @param {File} file
 * @param {{ maxBytes?: number }} [opts]
 * @returns {Promise<{ name: string, url: string }>}
 */
export async function fileToSyncAttachment(file, opts = {}) {
  if (!file || typeof file.size !== 'number') {
    throw new Error('invalid file');
  }
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_SYNC_FILE_BYTES;
  if (file.size > maxBytes) {
    const e = new Error(SYNC_FILE_ERROR_TOO_LARGE);
    e.code = SYNC_FILE_ERROR_TOO_LARGE;
    throw e;
  }
  const url = await readFileAsDataURL(file);
  if (!url.startsWith('data:')) {
    throw new Error('invalid data url');
  }
  return { name: file.name || 'attachment', url };
}

/** True if URL can be opened on another device after JSON sync. */
export function isPersistableMediaUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  if (url.startsWith('blob:')) return false;
  if (url.startsWith('data:')) return true;
  if (/^https?:\/\//i.test(url)) return true;
  return false;
}

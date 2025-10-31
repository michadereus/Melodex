// melodex-back-end/utils/exportWorker.js
// Per-track pipeline: map → chunk(≤100) → add → aggregate with stable ordering

const { ok, fail, CODES } = require('./errorContract');
const { chunk, MAX_URIS_PER_ADD = 100 } = require('./chunk'); // MAX_URIS_PER_ADD is exported in your repo

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * backoff policy helper (bounded). If Retry-After present, use it; else 500ms → 2000ms → 5000ms (default).
 */
async function maybeBackoff(attempt, resLike, backoffMs = [500, 2000, 5000]) {
  // Retry-After may be seconds or HTTP-date; tests usually send seconds
  const ra = resLike?.headers?.['retry-after'] ?? resLike?.headers?.get?.('retry-after');
  if (ra) {
    const secs = Number(ra);
    if (Number.isFinite(secs)) return sleep(Math.max(0, secs * 1000));
    const dt = Date.parse(ra);
    if (!Number.isNaN(dt)) return sleep(Math.max(0, dt - Date.now()));
  }
  const idx = Math.min(attempt, backoffMs.length - 1);
  return sleep(backoffMs[idx]);
}

/**
 * exportPlaylistWorker
 * @param {Object} deps
 * @param {Function} deps.httpAdd - async ({ playlistId, uris }) => { status, headers }
 * @param {Function} deps.httpCreate - async ({ name, description }) => { id, external_urls }
 * @param {Object} deps.mapper - object with mapMany(items) => { uris:string[], keptURIs:string[], reasons:Record<index,{id,reason}> }
 * @param {Array} items - selected items (in UI order). Each should have an id-ish (deezerID or spotifyUri)
 * @param {String} name
 * @param {String} description
 * @param {Number} chunkSize - default 100
 * @param {Number} maxAttempts - per chunk attempts (default 3)
 * @returns {Promise<{ ok:boolean, playlistId?:string, playlistUrl?:string, kept:string[], skipped:Array, failed:Array }>}
 */
async function exportPlaylistWorker({
  httpCreate,
  httpAdd,
  mapper,
  items,
  name,
  description,
  chunkSize = 100,
  maxAttempts = 3,
}) {
  // 1) Map inputs → URIs (+ reasons for pre-skip such as NOT_FOUND/REGION_BLOCKED)
  const mapRes = await mapper.mapMany(items || []);
  const mappedURIs = mapRes.uris || [];
  const preSkipped = mapRes.skipped || []; // optional: array of { id, reason }
  const kept = [];      // successful URIs added
  const failed = [];    // { id, reason }
  const skipped = [...preSkipped]; // start with mapping-time skips

  if (!mappedURIs.length && skipped.length > 0) {
    // Nothing to add, but we still consider this a logical success with informative payload
    return ok({
      playlistId: null,
      playlistUrl: null,
      kept: [],
      skipped,
      failed: [],
    });
  }

  // 2) Create playlist
  const meta = await httpCreate({ name, description });
  const playlistId = meta?.id || 'pl_unknown';
  const playlistUrl = meta?.external_urls?.spotify || `https://open.spotify.com/playlist/${playlistId}`;

  // 3) Chunk and add with bounded retry / 429 policy
  for (const part of chunk(mappedURIs, Math.min(chunkSize, MAX_URIS_PER_ADD || 100))) {
    let attempt = 0;
    let addedThisChunk = false;

    while (attempt < maxAttempts && !addedThisChunk) {
      attempt += 1;
      try {
        const resp = await httpAdd({ playlistId, uris: part });
        const status = resp?.status ?? 500;

        if (status >= 200 && status < 300) {
          kept.push(...part);
          addedThisChunk = true;
          break;
        }

        // 404 / region-blocking-like statuses: mark each as failed with reason and break (no retry)
        if (status === 404 || status === 451) {
          for (const uri of part) {
            failed.push({ id: uri, reason: status === 404 ? 'NOT_FOUND' : 'REGION_BLOCKED' });
          }
          addedThisChunk = true; // terminal for this chunk
          break;
        }

        // 429: retry with Retry-After/backoff, else fall through to fail after attempts
        if (status === 429) {
          await maybeBackoff(attempt - 1, resp);
          continue;
        }

        // Other non-2xx: retry until attempts exhausted
        if (attempt < maxAttempts) {
          continue;
        }
        // Exhausted: mark as generic failure
        for (const uri of part) {
          failed.push({ id: uri, reason: 'ADD_FAILED' });
        }
        break;
      } catch (err) {
        // Network/axios error
        if (attempt < maxAttempts) {
          await maybeBackoff(attempt - 1, err?.response);
          continue;
        }
        for (const uri of part) {
          failed.push({ id: uri, reason: 'ADD_FAILED' });
        }
      }
    }

    // If attempts exhausted because of 429s (never added), mark RATE_LIMIT explicitly
    if (!addedThisChunk && attempt >= maxAttempts) {
      for (const uri of part) {
        failed.push({ id: uri, reason: 'RATE_LIMIT' });
      }
    }
  }

  return ok({
    playlistId,
    playlistUrl,
    kept,
    skipped,
    failed,
  });
}

module.exports = {
  exportPlaylistWorker,
  maybeBackoff,
};

// melodex-back-end/utils/mappingService.js

/**
 * STUB mapper: mirrors the original behavior that IT-005 depended on.
 * - Skip items with checked === false or skipped === true
 * - If spotifyUri present, use it (validate minimal shape)
 * - Else synthesize a Spotify URI from deezerID | deezerId | _id
 * - Keep order; return { uris, skipped }
 */

function coerceTrackUri(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  return /^spotify:track:[A-Za-z0-9]+$/.test(s) ? s : null;
}

function extractFallbackId(item) {
  const id = item?.deezerID ?? item?.deezerId ?? item?._id ?? null;
  if (id == null) return null;
  const s = String(id).trim();
  return s.length ? s : null;
}

async function mapOne(item) {
  if (!item) return null;

  // Respect selection flags (what IT-005 asserts)
  if (item.checked === false || item.skipped) return null;

  // Already-known Spotify URI
  const uri = coerceTrackUri(item.spotifyUri || item.spotify_uri || item.uri);
  if (uri) {
    return { id: uri.split(':').pop(), uri };
  }

  // Fallback: synthesize from a Deezer-ish id
  const fid = extractFallbackId(item);
  if (!fid) return null;

  return { id: fid, uri: `spotify:track:${fid}` };
}

async function mapMany(items) {
  const uris = [];
  const skipped = [];

  for (const it of Array.isArray(items) ? items : []) {
    try {
      const res = await mapOne(it);
      if (res?.uri) uris.push(res.uri);
      else skipped.push(it);
    } catch {
      skipped.push(it);
    }
  }
  return { uris, skipped };
}

/**
 * Env-aware factory. Default = stub mapper (what tests expect).
 */
function mapperForEnv() {
  return {
    mapOne,
    mapMany,
  };
}

/**
 * Real mapper factory — placeholder that currently defers to stub behavior.
 * You can later extend this to call Spotify /v1/search using the provided fetch, token, market.
 */
function realMapper({ fetch, token, market = 'US' } = {}) {
  // For now, mirror stub behavior to keep integration tests offline and stable.
  // When you implement real search, keep the same .mapMany signature.
  return {
    mapOne,
    mapMany,
    _deps: { fetch, token, market },
  };
}

module.exports = {
  // Legacy exports (some files may still import these directly)
  mapOne,
  mapMany,

  // New factory exports used by AuthController
  mapperForEnv,
  realMapper,
};

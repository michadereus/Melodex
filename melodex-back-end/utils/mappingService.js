// File: melodex-back-end/utils/mappingService.js
// Minimal placeholder so IT-005 “real path” works; UT-004 will replace this.

async function mapOne(item) {
  if (!item) return null;

  // Only map items that the user kept
  if (item.checked === false || item.skipped) return null;

  // Prefer an already-known Spotify URI
  if (item.spotifyUri && typeof item.spotifyUri === 'string') {
    const id = item.spotifyUri.split(':').pop();
    return id ? { id, uri: item.spotifyUri } : null;
  }

  // Fallback: treat deezerID or _id as a Spotify track id placeholder
  const id = item.deezerID ?? item._id ?? null;
  if (!id) return null;

  return { id: String(id), uri: `spotify:track:${id}` };
}

async function mapMany(items, _deps = {}) {
  const uris = [];
  const skipped = [];
  for (const it of items || []) {
    const res = await mapOne(it);
    if (res && res.uri) uris.push(res.uri);
    else skipped.push(it);
  }
  return { uris, skipped };
}

module.exports = { mapOne, mapMany };

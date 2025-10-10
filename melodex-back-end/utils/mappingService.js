// melodex-back-end/services/MappingService.js
// Skeleton only — UT-004 will drive real logic later.

async function mapOne(item, deps = {}) {
  // Expected: item has { deezerID, songName, artist, isrc? } etc.
  // Return shape: { id: 'spotifyTrackId', uri: 'spotify:track:<id>' } | null
  // TODO: implement (ISRC-first; metadata fallback; cache read/write)
  return null;
}

async function mapMany(items, deps = {}) {
  const matched = [];
  const skipped = [];
  for (const it of items || []) {
    const res = await mapOne(it, deps);
    if (res && res.uri) matched.push(res.uri);
    else skipped.push(it);
  }
  return { uris: matched, skipped };
}

module.exports = { mapOne, mapMany };

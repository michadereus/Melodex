// melodex-front-end/src/utils/spotifyExport.js
/** ---------- Filters ---------- **/
export function buildFilters(selection = {}) {
  const norm = (v) =>
    typeof v === "string" ? v.trim().toLowerCase() : v;

  const genre = norm(selection.genre);
  const subgenre = norm(selection.subgenre);

  // No genre & no subgenre => empty
  if (!genre && !subgenre) return { type: "none" };

  // Subgenre without a genre => treat as empty
  if (!genre && subgenre) return { type: "none" };

  // Genre present -> build genre filter (subgenre optional)
  const out = { type: "genre", genre };
  if (subgenre) out.subgenre = subgenre;
  return out;
}

/** ---------- Selector (genre/subgenre/decade) ---------- **/

// local normalize (trim → collapse spaces → lowercase)
function _norm(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// "1990s"  -> { start: 1990, end: 1999 }
// "1990-1999" -> { start: 1990, end: 1999 }
// others / "all decades" -> null (wildcard)
function _parseDecadeWindow(decadeRaw) {
  if (decadeRaw == null) return null;
  const d = _norm(decadeRaw);
  if (!d || d === 'all decades') return null;

  const mLabel = d.match(/^(\d{4})s$/); // "1990s"
  if (mLabel) {
    const start = parseInt(mLabel[1], 10);
    return { start, end: start + 9 };
  }

  const mRange = d.match(/^(\d{4})\s*-\s*(\d{4})$/); // "1990-1999"
  if (mRange) {
    const start = parseInt(mRange[1], 10);
    const end = parseInt(mRange[2], 10);
    if (start <= end) return { start, end };
  }
  return null;
}

// Pull a numeric year out of a song's "decade" field.
// Accepts number (1995) or strings like "1990s", "1995", "1990-1999".
function _extractYear(decadeVal) {
  if (decadeVal == null) return null;
  if (typeof decadeVal === 'number') return decadeVal;
  const s = String(decadeVal).trim();
  const mYear = s.match(/(\d{4})/);
  return mYear ? parseInt(mYear[1], 10) : null;
}

/**
 * Pure selector used by UT-011:
 * - 'any' genre/subgenre acts as wildcard
 * - subgenre match is exact; if genre also provided, require BOTH
 * - decade like "1990s" or "1990-1999" filters to that window
 * - songs with missing decade are excluded when a decade filter is set
 */
export function selectRankedByRules(songs, rules = {}) {
  if (!Array.isArray(songs)) return [];

  const genre = _norm(rules.genre ?? 'any');
  const subgenre = _norm(rules.subgenre ?? 'any');

  const decadeNorm = _norm(rules.decade ?? 'all decades');
  const decadeIsAll = (decadeNorm === 'all decades');

  // Window if the decade is a label ("1990s") or a range ("1990-1999")
  const decadeWindow = _parseDecadeWindow(decadeNorm);

  const wantGenre = genre !== 'any';
  const wantSub   = subgenre !== 'any';

  function matchesDecade(songDecade) {
    // If user didn’t set a decade, everything passes decade check.
    if (decadeIsAll) return true;

    // Numeric year like 1995
    if (typeof songDecade === 'number') {
      if (!Number.isFinite(songDecade)) return false;
      if (decadeWindow) {
        return songDecade >= decadeWindow.start && songDecade <= decadeWindow.end;
      }
      const mRange = decadeNorm.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (mRange) {
        const a = parseInt(mRange[1], 10), b = parseInt(mRange[2], 10);
        if (a > b) return false;
        return songDecade >= a && songDecade <= b;
      }
      // exact single-year fallback
      return _norm(String(songDecade)) === decadeNorm;
    }

    // String decade like "1990s" or "1995"
    if (typeof songDecade === 'string') {
      const sNorm = _norm(songDecade);

      if (decadeWindow) {
        const mSongLabel = sNorm.match(/^(\d{4})s$/);
        if (mSongLabel) return parseInt(mSongLabel[1], 10) === decadeWindow.start;

        const y = _extractYear(songDecade);
        if (y == null) return false;
        return y >= decadeWindow.start && y <= decadeWindow.end;
      }

      // range fallback
      const mRange = decadeNorm.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (mRange) {
        const a = parseInt(mRange[1], 10), b = parseInt(mRange[2], 10);
        if (a > b) return false;
        const y = _extractYear(songDecade);
        if (y == null) return false;
        return y >= a && y <= b;
      }

      // exact label fallback
      return sNorm === decadeNorm;
    }

    return false;
  }

  return songs.filter((song) => {
    const sg = _norm(song?.genre);
    const ss = _norm(song?.subgenre);

    // genre/subgenre rules
    if (wantSub) {
      if (ss !== subgenre) return false;
      if (wantGenre && sg !== genre) return false;
    } else if (wantGenre) {
      if (sg !== genre) return false;
    }

    // If a decade filter is set (anything but "all decades"),
    // exclude items with null/empty decade immediately.
    if (!decadeIsAll) {
      const d = song?.decade;
      if (d == null || String(d).trim() === '') return false;
    }

    // decade matching proper
    if (!matchesDecade(song.decade)) return false;

    return true;
  });
}

/** ---------- Mapping ---------- **/
/**
 * Map a list of ranked items (possibly Deezer-origin) to Spotify URIs.
 * Rules expected by tests:
 *  - Prefer ISRC lookup when available
 *  - Fallback to title+artist search (normalized to lower-case, trimmed)
 *  - Skip `removed` or `skipped` items
 *  - Deduplicate by URI, preserving first occurrence (rank order)
 *  - Return shape: { uris: string[] }
 *
 * @param {Array<Object>} items
 * @param {(q: {isrc?: string, title?: string, artist?: string}) => Promise<{uri: string} | null>} search
 */
export async function mapDeezerToSpotifyUris(items = [], search = async () => null) {
  const uris = [];
  const seen = new Set();

  const normText = (s) =>
    (s ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  for (const it of items) {
    if (!it || it.removed || it.skipped) continue;

    // If the item already contains a Spotify URI, use it directly
    const rawUri = it.spotifyUri || it.spotify_uri || it.uri;
    if (typeof rawUri === "string" && /^spotify:track:[A-Za-z0-9]+$/.test(rawUri.trim())) {
      const uri = rawUri.trim();
      if (!seen.has(uri)) {
        seen.add(uri);
        uris.push(uri);
      }
      continue;
    }

    // Prefer ISRC
    let found = null;
    const isrc = typeof it.isrc === "string" ? it.isrc.trim() : null;
    if (isrc) {
      found = await search({ isrc });
    }

    // Fallback to title + artist
    if (!found) {
      const title = normText(it.title);
      const artist = normText(it.artist);
      if (title && artist) {
        found = await search({ title, artist });
      }
    }

    if (found?.uri && /^spotify:track:[A-Za-z0-9]+$/.test(found.uri)) {
      if (!seen.has(found.uri)) {
        seen.add(found.uri);
        uris.push(found.uri);
      }
    }
  }

  return { uris };
}

/** ---------- Create Payload ---------- **/
/**
 * Build the final create-playlist payload.
 * Tests expect:
 *  - Defaults: name "Melodex Playlist YYYY-MM-DD", description "Generated by Melodex"
 *  - If `uris` provided, carry it through as-is (don’t remap here)
 */
export function buildCreatePayload({ name, description, uris = [] } = {}) {
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const defaultName = `Melodex Playlist ${yyyy}-${mm}-${dd}`;
  const safeName = (name ?? "").toString().trim() || defaultName;
  const safeDesc = (description ?? "").toString().trim() || "Generated by Melodex";

  return {
    name: safeName,
    description: safeDesc,
    uris: Array.isArray(uris) ? uris : [],
  };
}

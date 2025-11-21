// melodex-front-end/src/utils/spotifyExport.js

/**
 * Post Spotify track URIs in fixed-size chunks.
 * - Keeps original order
 * - No mutation of input array
 * - Validates chunkSize
 * - Awaits each batch sequentially (preserves playlist order guarantees)
 *
 * @param {string[]} uris
 * @param {number} chunkSize
 * @param {(batch: string[]) => Promise<void>} postFn  // e.g., client.post(`/tracks`, { uris: batch })
 * @returns {Promise<{batches: number, total: number}>}
 */
export async function postUrisInChunks(uris = [], chunkSize = 100, postFn = async () => {}) {
  const list = Array.isArray(uris) ? [...uris] : [];
  const size = Number(chunkSize);

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("chunkSize must be a positive integer");
  }
  if (list.length === 0) return { batches: 0, total: 0 };

  let batches = 0;
  let total = 0;

  for (let i = 0; i < list.length; i += size) {
    const batch = list.slice(i, i + size);
    await postFn(batch);
    batches += 1;
    total += batch.length;
  }
  return { batches, total };
}

/** ---------- Filters ---------- **/
export function buildFilters(selection = {}) {
  const norm = (v) => (typeof v === "string" ? v.trim().toLowerCase() : v);

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
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// "1990s"  -> { start: 1990, end: 1999 }
// "1990-1999" -> { start: 1990, end: 1999 }
// others / "all decades" -> null (wildcard)
function _parseDecadeWindow(decadeRaw) {
  if (decadeRaw == null) return null;
  const d = _norm(decadeRaw);
  if (!d || d === "all decades") return null;

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
  if (typeof decadeVal === "number") return decadeVal;
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

  const genre = _norm(rules.genre ?? "any");
  const subgenre = _norm(rules.subgenre ?? "any");

  const decadeNorm = _norm(rules.decade ?? "all decades");
  const decadeIsAll = decadeNorm === "all decades";

  // Window if the decade is a label ("1990s") or a range ("1990-1999")
  const decadeWindow = _parseDecadeWindow(decadeNorm);

  const wantGenre = genre !== "any";
  const wantSub = subgenre !== "any";

  function matchesDecade(songDecade) {
    // If user didn’t set a decade, everything passes decade check.
    if (decadeIsAll) return true;

    // Numeric year like 1995
    if (typeof songDecade === "number") {
      if (!Number.isFinite(songDecade)) return false;
      if (decadeWindow) {
        return (
          songDecade >= decadeWindow.start && songDecade <= decadeWindow.end
        );
      }
      const mRange = decadeNorm.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (mRange) {
        const a = parseInt(mRange[1], 10),
          b = parseInt(mRange[2], 10);
        if (a > b) return false;
        return songDecade >= a && songDecade <= b;
      }
      // exact single-year fallback
      return _norm(String(songDecade)) === decadeNorm;
    }

    // String decade like "1990s" or "1995"
    if (typeof songDecade === "string") {
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
        const a = parseInt(mRange[1], 10),
          b = parseInt(mRange[2], 10);
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
      if (d == null || String(d).trim() === "") return false;
    }

    // decade matching proper
    if (!matchesDecade(song.decade)) return false;

    return true;
  });
}

/** ---------- Mapping ---------- **/

function normalizeWhitespace(str) {
  return String(str || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArtist(artist) {
  return normalizeWhitespace(artist).toLowerCase();
}

/**
 * Aggressive scrubbing for titles:
 * - lowercases
 * - strips parentheses content `(feat. X)` etc.
 * - removes common variant suffixes (Remaster, Live, Commentary, Karaoke, Short Film)
 * - removes "feat./ft./featuring/with ..." tails
 */
function normalizeTitleForSearch(title) {
  let s = String(title || "").toLowerCase();

  // Normalize fancy dashes to a simple hyphen
  s = s.replace(/[–—]/g, "-");

  // Drop parentheses and their content: (feat. X), (Live), etc.
  s = s.replace(/\(.*?\)/g, " ");

  // Drop "feat/ft/featuring/with ..." tails
  s = s.replace(/\b(feat\.?|ft\.?|featuring|with)\b.*$/g, " ");

  // Drop common variant suffixes like "- Remastered 2011", "- Live at …"
  s = s
    .replace(
      /-?\s*(remaster(ed)?(\s*\d{4})?|live.*|commentary.*|short film.*|karaoke.*)$/g,
      " "
    )
    // Also catch "... 2011 remaster" style endings
    .replace(/\s+\d{4}\s+remaster(ed)?$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

function isVariantName(name) {
  const n = String(name || "").toLowerCase();
  return /\b(remaster(ed)?|live|commentary|short film|karaoke)\b/.test(n);
}

/**
 * Pick a single Spotify URI from a search result.
 * - supports { uri: string } or { items: [{ uri, name, duration_ms }, ...] }
 * - uses duration ±3000ms when provided
 * - prefers non-variant names (no "Remaster"/"Live"/etc.)
 * - if still ambiguous and we have duration, picks closest by duration
 */
function pickUriFromSearchResult(result, item) {
  if (!result) return null;

  // Simple shape: { uri: "spotify:track:..." }
  if (typeof result.uri === "string") {
    return result.uri;
  }

  const candidates = Array.isArray(result.items) ? result.items : [];
  if (!candidates.length) return null;

  const durationTarget =
    item && typeof item.durationMs === "number" ? item.durationMs : null;

  let pool = candidates;

  // 1) Use duration ±3000ms if we have a target
  if (durationTarget != null) {
    const within = candidates.filter(
      (c) =>
        typeof c.duration_ms === "number" &&
        Math.abs(c.duration_ms - durationTarget) <= 3000
    );
    if (within.length) {
      pool = within;
    }
  }

  // 2) Prefer non-variant names when possible (no “Remaster”, “Live”, etc.)
  const nonVariant = pool.filter((c) => !isVariantName(c.name));
  if (nonVariant.length) {
    pool = nonVariant;
  }

  // 3) If still multiple and we have duration, choose the closest by duration
  if (durationTarget != null && pool.length > 1) {
    let best = null;
    let bestDiff = Infinity;
    for (const c of pool) {
      if (typeof c.duration_ms !== "number") continue;
      const diff = Math.abs(c.duration_ms - durationTarget);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }
    if (best && typeof best.uri === "string") {
      return best.uri;
    }
  }

  // 4) Fallback: first candidate in the remaining pool, then first overall
  const chosen = pool[0] || candidates[0];
  return chosen && typeof chosen.uri === "string" ? chosen.uri : null;
}

/**
 * Map a list of ranked items (possibly Deezer-origin) to Spotify URIs.
 * Rules:
 *  - Prefer ISRC lookup when available
 *  - Fallback to title+artist search (normalized)
 *  - Scrub parens/punctuation from title; tolerate common variant terms
 *  - Use duration tie-break within ±3000ms when candidates returned
 *  - Skip `removed` or `skipped` items
 *  - Deduplicate by URI, preserving first occurrence (rank order)
 *  - Return shape: { uris: string[] }
 *
 * The `searchFn` function may return either:
 *  - `{ uri }`  OR
 *  - `{ items: [{ uri, name, duration_ms }, ...] }`
 */
export async function mapDeezerToSpotifyUris(items, searchFn) {
  if (!Array.isArray(items) || typeof searchFn !== "function") {
    return { uris: [] };
  }

  const seen = new Set();
  const uris = [];

  // Filter out null/undefined and removed/skipped up front; preserve ordering.
  const cleanItems = items.filter(
    (raw) => raw && !raw.removed && !raw.skipped
  );

  for (const raw of cleanItems) {
    const item = raw || {};

    const spotifyUri = item.spotifyUri;
    if (spotifyUri && typeof spotifyUri === "string") {
      if (!seen.has(spotifyUri)) {
        seen.add(spotifyUri);
        uris.push(spotifyUri);
      }
      continue;
    }

    const isrc = item.isrc;
    const titleRaw = item.title ?? item.songName ?? "";
    const artistRaw = item.artist ?? "";

    const normalizedTitle = normalizeTitleForSearch(titleRaw);
    const normalizedArtist = normalizeArtist(artistRaw);

    let result = null;

    // ISRC path preferred when available
    if (isrc) {
      result = await searchFn({ isrc });
    } else if (normalizedTitle || normalizedArtist) {
      // Fallback: normalized title + artist
      result = await searchFn({
        title: normalizedTitle,
        artist: normalizedArtist,
      });
    } else {
      // Nothing meaningful to search with
      continue;
    }

    const uri = pickUriFromSearchResult(result, {
      durationMs: item.durationMs,
    });

    if (uri && !seen.has(uri)) {
      seen.add(uri);
      uris.push(uri);
    }
  }

  return { uris };
}

/** ---------- Create Payload ---------- **/
/**
 * Build the final create-playlist payload.
 * Defaults:
 *  - name: "Melodex Playlist YYYY-MM-DD"
 *  - description: "Generated by Melodex"
 * - defensively filters URIs to non-empty strings
 */
export function buildCreatePayload(input = {}) {
  const nameRaw = normalizeWhitespace(input.name ?? "");
  const descRaw = normalizeWhitespace(input.description ?? "");
  const rawUris = Array.isArray(input.uris) ? input.uris : [];

  // Keep only non-empty strings; tests only assert that valid ones survive.
  const safeUris = rawUris.filter(
    (u) => typeof u === "string" && u.trim().length > 0
  );

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const defaultName = `Melodex Playlist ${yyyy}-${mm}-${dd}`;
  const defaultDescription = "Generated by Melodex";

  return {
    name: nameRaw || defaultName,
    description: descRaw || defaultDescription,
    uris: safeUris,
  };
}

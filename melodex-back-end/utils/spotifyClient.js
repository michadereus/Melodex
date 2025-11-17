// melodex-back-end/utils/spotifyClient.js
// Thin wrapper around Spotify Web API for TS-04:
// - create playlist for the current user
// - add tracks (single-shot) with chunking and 429 surfacing
// - add tracks with retry/backoff for the export worker

import axios from "axios";

/**
 * Small helper to read env with fallback.
 */
function env(key, def) {
  return process.env[key] ?? def;
}

/**
 * Sleep helper used for 429 backoff.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse Retry-After header (seconds OR HTTP-date).
 * Returns milliseconds, or 0 when unusable.
 */
function parseRetryAfter(header) {
  if (!header) return 0;

  // Numeric seconds
  const asNum = Number(header);
  if (!Number.isNaN(asNum) && asNum >= 0) return asNum * 1000;

  // HTTP-date
  const date = new Date(header);
  const now = Date.now();
  if (!Number.isNaN(date.getTime())) {
    const diff = date.getTime() - now;
    return diff > 0 ? diff : 0;
  }

  return 0;
}

/**
 * Basic exponential-ish backoff with a cap; driven by env.
 */
function computeBackoffMs(attemptIndex /* 0-based */) {
  const base = Number(env("EXPORT_ADD_BASE_BACKOFF_MS", "500"));
  const max = Number(env("EXPORT_ADD_MAX_BACKOFF_MS", "5000"));

  const pow = Math.max(0, attemptIndex);
  const ms = base * Math.pow(2, pow);
  return Math.min(ms, max);
}

/**
 * Normalized error shape used by TS-04 worker / tests.
 */
function makeErrorShape(err, context) {
  const status = err?.response?.status ?? null;
  const message =
    err?.response?.data?.error?.message ??
    err?.message ??
    "Spotify request failed";

  return {
    ok: false,
    status,
    code: status === 429 ? "RATE_LIMIT" : "SPOTIFY_ERROR",
    message,
    context,
  };
}

/**
 * Build a configured axios instance for Spotify Web API.
 * This does NOT handle token acquisition – it expects a valid access token.
 */
function buildAxios(accessToken) {
  const baseURL = env(
    "SPOTIFY_WEB_API",
    env("SPOTIFY_API_BASE", "https://api.spotify.com")
  );

  const client = axios.create({
    baseURL,
    timeout: Number(env("SPOTIFY_HTTP_TIMEOUT_MS", "10000")),
  });

  client.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
    config.headers["Content-Type"] = "application/json";
    return config;
  });

  return client;
}

/**
 * Create a playlist for the current user.
 * In "real" mode, this will call:
 *   POST /v1/users/me/playlists
 *
 * Returns:
 *   { ok: true, id, url, raw } on success
 *   { ok: false, status, code, message, context } on error
 */
export async function createPlaylist({ accessToken, name, description }) {
  const http = buildAxios(accessToken);

  const body = {
    name,
    description,
    public: false,
  };

  try {
    const res = await http.post("/v1/users/me/playlists", body);
    const data = res.data || {};
    const id = data.id;
    const url =
      data.external_urls?.spotify || data.external_url || data.href || null;

    return {
      ok: true,
      id,
      url,
      raw: data,
    };
  } catch (err) {
    return makeErrorShape(err, { phase: "createPlaylist" });
  }
}

/**
 * Shared chunking helper.
 */
function chunkUris(uris, maxChunkSize) {
  const chunks = [];
  for (let i = 0; i < uris.length; i += maxChunkSize) {
    chunks.push(uris.slice(i, i + maxChunkSize));
  }
  return chunks;
}

/**
 * Single-shot addTracks used by UT-010.
 *
 * Behaviour:
 *   - Chunks URIs into batches of ≤ EXPORT_ADD_MAX_CHUNK (default 100).
 *   - On 2xx responses: returns { kept, failed: [] }.
 *   - On non-2xx (including 429): throws a normalized error with:
 *       status, code, message, context, and (for 429) retryAfterMs.
 */
export async function addTracks({ accessToken, playlistId, uris }) {
  const http = buildAxios(accessToken);

  const maxChunkSize = Number(env("EXPORT_ADD_MAX_CHUNK", "100"));
  const kept = [];
  const failed = [];

  const chunks = chunkUris(uris, maxChunkSize);

  for (const chunk of chunks) {
    try {
      await http.post(
        `/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
        { uris: chunk }
      );
      kept.push(...chunk);
    } catch (err) {
      const status = err?.response?.status;
      const retryAfterHeader =
        err?.response?.headers?.["retry-after"] ??
        err?.response?.headers?.["Retry-After"];

      const errorShape = makeErrorShape(err, {
        phase: "addTracks",
        playlistId,
      });

      if (status === 429) {
        const retryAfterMs = parseRetryAfter(retryAfterHeader);
        if (retryAfterMs > 0) {
          errorShape.retryAfterMs = retryAfterMs;
        }
      }

      throw errorShape;
    }
  }

  return {
    kept,
    failed,
  };
}

/**
 * Add tracks to a playlist with chunking and 429/backoff for the export worker.
 *
 * Params:
 *   - accessToken: Spotify access token
 *   - playlistId: Spotify playlist id
 *   - uris: array of track URIs (strings)
 *
 * Returns:
 *   {
 *     ok: boolean,
 *     kept: string[],      // URIs that were successfully added
 *     failed: { uri, reason, status? }[],
 *     raw: any[]           // raw responses (for debugging)
 *   }
 */
export async function addTracksWithRetry({ accessToken, playlistId, uris }) {
  const http = buildAxios(accessToken);

  const maxChunkSize = Number(env("EXPORT_ADD_MAX_CHUNK", "100"));
  const maxRetries = Number(env("EXPORT_ADD_RETRY_MAX", "3"));

  const kept = [];
  const failed = [];
  const rawResponses = [];

  const chunks = chunkUris(uris, maxChunkSize);

  for (const chunk of chunks) {
    let attempt = 0;
    let chunkSucceeded = false;

    while (attempt <= maxRetries && !chunkSucceeded) {
      try {
        const res = await http.post(
          `/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
          { uris: chunk }
        );
        rawResponses.push(res.data);
        kept.push(...chunk);
        chunkSucceeded = true;
      } catch (err) {
        const status = err?.response?.status;
        const retryAfterHeader =
          err?.response?.headers?.["retry-after"] ??
          err?.response?.headers?.["Retry-After"];

        if (status === 429 && attempt < maxRetries) {
          // Respect Retry-After header if present, otherwise use backoff policy.
          const retryAfterMs = parseRetryAfter(retryAfterHeader);
          const backoffMs =
            retryAfterMs > 0 ? retryAfterMs : computeBackoffMs(attempt);
          await sleep(backoffMs);
          attempt += 1;
          continue;
        }

        // Non-429 or exhausted retries: mark all URIs in this chunk as failed.
        const reason = status === 429 ? "RATE_LIMIT" : "SPOTIFY_ERROR";
        for (const uri of chunk) {
          failed.push({
            uri,
            reason,
            status: status ?? null,
          });
        }
        chunkSucceeded = true; // stop retrying this chunk
      }
    }
  }

  return {
    ok: failed.length === 0,
    kept,
    failed,
    raw: rawResponses,
  };
}

/**
 * Convenience client factory so UT-010 and the export worker
 * can obtain a cohesive API surface.
 *
 * Usage (UT-010):
 *   const client = spotifyClient();
 *   await client.createPlaylist({ accessToken, name, description });
 *   await client.addTracks({ accessToken, playlistId, uris });
 *
 * Usage (worker):
 *   const client = spotifyClient();
 *   await client.addTracksWithRetry({ accessToken, playlistId, uris });
 */
export function spotifyClient(/* config? */) {
  return {
    createPlaylist: (opts) => createPlaylist(opts),
    addTracks: (opts) => addTracks(opts),
    addTracksWithRetry: (opts) => addTracksWithRetry(opts),
  };
}

export default spotifyClient;

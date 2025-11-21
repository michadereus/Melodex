// melodex-back-end/utils/spotifyClient.js
// Thin wrapper around Spotify Web API for TS-04:
// - create playlist for the current user
// - add tracks (single-shot) with chunking and 429 surfacing
// - add tracks with retry/backoff for the export worker

const axios = require("axios");

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

  const asNum = Number(header);
  if (!Number.isNaN(asNum) && asNum >= 0) return asNum * 1000;

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
 *
 * NOTE:
 * - Tests set API_BASE = "https://api.spotify.com".
 * - Endpoints are always called with "/v1/..." in the path.
 */
function buildAxios(accessToken) {
  const root = env("SPOTIFY_WEB_API", "https://api.spotify.com");

  const client = axios.create({
    baseURL: root,
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
 *
 * Behaviour expected by UT-013 + IT-00x:
 *   - POST /v1/users/me/playlists
 *   - returns { ok:true, id, url, raw }
 *
 * We intentionally do NOT call /me here; both unit and integration tests
 * (and the real Spotify Web API) support creating playlists via
 * `/v1/users/me/playlists` when the access token identifies the user.
 */
async function createPlaylist({ accessToken, name, description }) {
  // 0) Basic validation – if we truly have no name, surface a clear error
  if (typeof name !== "string" || !name.trim()) {
    return {
      ok: false,
      status: 400,
      code: "SPOTIFY_ERROR",
      message: "Missing required field: name",
      context: { phase: "createPlaylist", step: "validate" },
    };
  }

  const http = buildAxios(accessToken);

  try {
    // 1) Resolve the current user so we can get a real user_id
    const meResp = await http.get("/v1/me");
    const meData = meResp.data || {};
    const userId = meData.id;

    if (!userId || typeof userId !== "string") {
      return {
        ok: false,
        status: meResp.status || 500,
        code: "SPOTIFY_ERROR",
        message: "Could not resolve current Spotify user id",
        context: { phase: "createPlaylist", step: "resolve-user" },
      };
    }

    // 2) Build the playlist body
    const body = {
      public: false,
      name: name.trim(),
    };
    if (typeof description === "string") {
      body.description = description;
    }

    // 3) Use the *actual* user id in the URL (Spotify requirement)
    const res = await http.post(
      `/v1/users/${encodeURIComponent(userId)}/playlists`,
      body
    );
    const data = res.data || {};

    const id = data.id || null;
    const url =
      (data.external_urls && data.external_urls.spotify) ||
      data.external_url ||
      data.href ||
      null;

    return {
      ok: true,
      id,
      url,
      raw: data,
    };
  } catch (err) {
    const shape = makeErrorShape(err, { phase: "createPlaylist" });
    return {
      ok: false,
      ...shape,
    };
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
 * Single-shot addTracks used by UT-013.
 *
 * Behaviour:
 *   - Chunks URIs into batches of ≤ EXPORT_ADD_MAX_CHUNK (default 100).
 *   - On 2xx responses: returns { kept, failed: [] }.
 *   - On non-2xx (including 429): throws a normalized error with:
 *       status, code, message, context, and (for 429) retryAfterMs.
 */
async function addTracks({ accessToken, playlistId, uris }) {
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
 */
async function addTracksWithRetry({ accessToken, playlistId, uris }) {
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
          const retryAfterMs = parseRetryAfter(retryAfterHeader);
          const backoffMs =
            retryAfterMs > 0 ? retryAfterMs : computeBackoffMs(attempt);
          await sleep(backoffMs);
          attempt += 1;
          continue;
        }

        const reason = status === 429 ? "RATE_LIMIT" : "SPOTIFY_ERROR";
        for (const uri of chunk) {
          failed.push({
            uri,
            reason,
            status: status ?? null,
          });
        }
        chunkSucceeded = true;
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
 * Convenience client factory so UT-013 and the export worker
 * can obtain a cohesive API surface.
 */
function spotifyClient() {
  return {
    createPlaylist: (opts) => createPlaylist(opts),
    addTracks: (opts) => addTracks(opts),
    addTracksWithRetry: (opts) => addTracksWithRetry(opts),
  };
}

module.exports = spotifyClient;
module.exports.spotifyClient = spotifyClient;
module.exports.addTracks = addTracks;
module.exports.addTracksWithRetry = addTracksWithRetry;

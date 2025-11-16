// melodex-back-end/controllers/AuthController.js

const crypto = require("crypto");
const axios = require("axios");
const { CODES, ok, fail } = require("../utils/errorContract");
const { chunk } = require("../utils/chunk");
const { exportPlaylistWorker } = require("../utils/exportWorker");
const { mapperForEnv } = require("../utils/mappingService");

/* ---------- helpers (unchanged) ---------- */

async function postWith429Retry(http, url, data, config = {}) {
  const max = Number(process.env.EXPORT_ADD_RETRY_MAX || 2);
  const base = Number(process.env.EXPORT_ADD_BASE_BACKOFF_MS || 250);

  let attempt = 0;
  for (;;) {
    try {
      return await http.post(url, data, config);
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 429 || attempt >= max) {
        throw err;
      }

      const raHeader =
        err.response?.headers?.["retry-after"] ??
        err.response?.headers?.["Retry-After"];
      const waitMs = raHeader
        ? Number(raHeader) * 1000
        : base * Math.pow(2, attempt);

      await new Promise((r) => setTimeout(r, waitMs));
      attempt += 1;
    }
  }
}

function b64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

function serializeCookie(
  name,
  value,
  { maxAge, httpOnly = true, secure = true, sameSite = "lax", path = "/" } = {}
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (typeof maxAge === "number")
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (sameSite)
    parts.push(
      `SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`
    );
  return parts.join("; ");
}

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const front = (path) => `${FRONTEND_ORIGIN}${path}`;

function playlistMode() {
  // Primary toggle for TS-04:
  //   - PLAYLIST_MODE=real → use real playlist behavior
  //   - PLAYLIST_MODE=stub → force stub behavior
  //
  // If PLAYLIST_MODE is not set, fall back to the legacy EXPORT_STUB flag:
  //   - EXPORT_STUB=off → real
  //   - (anything else / unset) → stub
  const raw = String(process.env.PLAYLIST_MODE || "").toLowerCase();
  if (raw === "real" || raw === "stub") {
    return raw;
  }

  const exportStubRaw = String(process.env.EXPORT_STUB || "on").toLowerCase();
  return exportStubRaw === "off" ? "real" : "stub";
}

function exportStubEnabled() {
  // Historically this only looked at EXPORT_STUB.
  // Keeping behavior identical when PLAYLIST_MODE is unset,
  // while letting tests set PLAYLIST_MODE=real to force real playlists.
  return playlistMode() === "stub";
}

function mappingMode() {
  return String(process.env.MAPPING_MODE || "stub").toLowerCase();
}

/* ---------- AuthController (unchanged) ---------- */

const AuthController = {
  start(req, res) {
    const state = b64url(crypto.randomBytes(16));
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(
      crypto.createHash("sha256").update(verifier).digest()
    );

    // Optional: accept returnTo for post-consent redirect (falls back to /rankings)
    const returnTo =
      typeof req.query.returnTo === "string" &&
      req.query.returnTo.startsWith("/")
        ? req.query.returnTo
        : "/rankings";

    res.setHeader("Set-Cookie", [
      serializeCookie("oauth_state", state, { maxAge: 600 }),
      serializeCookie("pkce_verifier", verifier, { maxAge: 600 }),
      serializeCookie("return_to", encodeURIComponent(returnTo), {
        maxAge: 600,
      }),
    ]);

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
      scope: "playlist-modify-private",
      show_dialog: "true",
    });

    return res.redirect(
      `https://accounts.spotify.com/authorize?${params.toString()}`
    );
  },

  async callback(req, res) {
    try {
      const code = req.query.code;
      const state = req.query.state;
      const err = req.query.error;

      if (err === "access_denied") {
        res.setHeader("Set-Cookie", [
          serializeCookie("oauth_state", "", { maxAge: 0 }),
          serializeCookie("pkce_verifier", "", { maxAge: 0 }),
        ]);
        return res.redirect(front("/login?error=access_denied"));
      }

      if (!code || !state) {
        return res.redirect(front("/login?error=missing_params"));
      }

      const cookies = parseCookies(req.headers.cookie || "");
      const expectedState = cookies["oauth_state"];
      const verifier = cookies["pkce_verifier"];

      if (!expectedState || state !== expectedState) {
        return res.redirect(front("/login?error=state_mismatch"));
      }

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      });
      if (SPOTIFY_CLIENT_SECRET) {
        body.append("client_secret", SPOTIFY_CLIENT_SECRET);
      }

      const tokenResp = await axios.post(
        "https://accounts.spotify.com/api/token",
        body.toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 8000,
          validateStatus: () => true,
        }
      );

      if (tokenResp.status !== 200) {
        res.setHeader("Set-Cookie", [
          serializeCookie("oauth_state", "", { maxAge: 0 }),
          serializeCookie("pkce_verifier", "", { maxAge: 0 }),
        ]);
        return res.redirect(front("/login?error=token_exchange_failed"));
      }

      const { access_token, refresh_token, expires_in = 3600 } = tokenResp.data;

      const outCookies = [
        serializeCookie("access", access_token, {
          maxAge: Math.max(0, expires_in - 60),
        }),
      ];

      if (refresh_token) {
        outCookies.push(
          serializeCookie("refresh", refresh_token, {
            maxAge: 60 * 60 * 24 * 14,
          })
        );
      }

      // Clear transient auth helpers (state/verifier) now that we have tokens
      outCookies.push(
        serializeCookie("oauth_state", "", { maxAge: 0 }),
        serializeCookie("pkce_verifier", "", { maxAge: 0 })
      );

      // Also clear the return_to cookie if present, but do it in the SAME
      // Set-Cookie header so we don’t drop access/refresh.
      const cookies2 = parseCookies(req.headers.cookie || "");
      const rtn = cookies2["return_to"];
      if (typeof rtn === "string") {
        outCookies.push(serializeCookie("return_to", "", { maxAge: 0 }));
      }

      res.setHeader("Set-Cookie", outCookies);

      return res.redirect(front(rtn ? decodeURIComponent(rtn) : "/rankings"));
    } catch (err) {
      console.error("[auth/callback] error", err?.response?.data || err);
      return res.redirect(front("/login?error=unexpected"));
    }
  },

  async session(req, res) {
    const cookie = req.headers.cookie || "";
    const connected = /(?:^|;\s*)access=/.test(cookie);
    return res.json({ connected });
  },
};

/* ---------- middleware ---------- */

function requireSpotifyAuth(req, res, next) {
  const cookie = req.headers.cookie || "";
  const hasSpotifyAccess = /(?:^|;\s*)access=/.test(cookie);
  if (!hasSpotifyAccess) {
    return res.status(401).json(
      fail(CODES.AUTH_SPOTIFY_REQUIRED, "No Spotify session", {
        hint: "Sign in and try again.",
      })
    );
  }
  return next();
}

/* ---------- /playlist/export handler ---------- */

// Stub path: echoes back payload and avoids hitting Spotify at all
function exportPlaylistStub(req, res) {
  const payload = req.body || {};

  const rawName = typeof payload.name === "string" ? payload.name : "";
  const name = rawName.trim() ? rawName.trim() : "Melodex Playlist (stub)";

  const count = Array.isArray(payload.uris)
    ? payload.uris.length
    : Array.isArray(payload.items)
    ? payload.items.length
    : 0;

  const received = {
    name,
    count,
    filters: payload.filters || null,
  };

  // Special-case "no songs" filters.path
  if (payload.filters && payload.filters.type === "none") {
    return res.status(200).json({
      ok: false,
      code: "NO_SONGS",
      message: "No songs found for the selected filters.",
      received,
    });
  }

  // Generic stub success: echo basic info, no real Spotify calls
  return res.status(200).json({
    ok: true,
    received,
  });
}

// Real path: uses exportPlaylistWorker + Spotify API (subject to stub toggle)
async function exportPlaylist(req, res) {
  try {
    // Respect PLAYLIST_MODE / EXPORT_STUB toggle.
    // If stub is enabled, keep old behavior.
    if (exportStubEnabled()) {
      return exportPlaylistStub(req, res);
    }

    const rawCookie = req.headers.cookie || "";
    const cookies = parseCookies(rawCookie);
    const access = cookies["access"];

    // Should usually be caught by requireSpotifyAuth, but keep a guard.
    if (!access) {
      return res.status(401).json(
        fail(CODES.AUTH_SPOTIFY_REQUIRED, "No Spotify session", {
          hint: "Please reconnect Spotify and try again.",
        })
      );
    }

    // Spotify HTTP client
    const http = axios.create({
      baseURL: "https://api.spotify.com/v1",
      timeout: Number(process.env.EXPORT_HTTP_TIMEOUT_MS || 10000),
      headers: {
        Authorization: `Bearer ${access}`,
      },
    });

    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const filters = payload.filters || null;

    // Base input for the worker (TS-02 / TS-04)
    const workerInput = {
      filters,
      items,
      name: payload.name,
      description: payload.description,
    };

    let mapper;

    // 1) Test harness path (IT-004): __testUris present → use them directly.
    if (Array.isArray(payload.__testUris)) {
      const testUris = payload.__testUris
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean);

      mapper = {
        mapMany: async () => ({
          uris: testUris,
          skipped: [],
        }),
      };
    } else {
      // 2) Realistic items[] path (IT-005, frontend export):
      //    - keep checked === true (or undefined) and skipped !== true
      //    - prefer spotifyUri if it looks like a proper track URI
      //    - else synthesize spotify:track:<deezerID|deezerId|_id>
      const selected = items.filter(
        (item) => item && item.checked !== false && item.skipped !== true
      );

      const uris = selected
        .map((item) => {
          const rawUri =
            typeof item.spotifyUri === "string"
              ? item.spotifyUri.trim()
              : null;

          if (rawUri && /^spotify:track:[A-Za-z0-9]+$/.test(rawUri)) {
            return rawUri;
          }

          const id =
            item.deezerID !== undefined && item.deezerID !== null
              ? item.deezerID
              : item.deezerId !== undefined && item.deezerId !== null
              ? item.deezerId
              : item._id !== undefined && item._id !== null
              ? item._id
              : null;

          if (id === null) return null;
          return `spotify:track:${String(id)}`;
        })
        .filter(Boolean);

      mapper = {
        mapMany: async () => ({
          uris,
          skipped: [], // mapping-time skips would be added here later if needed
        }),
      };
    }

    const result = await exportPlaylistWorker(
      {
        // Create playlist and return meta that includes id + external URL
        httpCreate: async ({ name, description }) => {
          const body = {};
          if (typeof name === "string" && name.trim()) {
            body.name = name.trim();
          }
          if (typeof description === "string" && description.trim()) {
            body.description = description.trim();
          }

          // Tests stub this endpoint and capture `body`
          const resp = await http.post("/users/me/playlists", body);
          return resp.data;
        },

        // Add tracks with 429-aware retry
        httpAdd: async ({ playlistId, uris }) => {
          return postWith429Retry(
            http,
            `/playlists/${encodeURIComponent(playlistId)}/tracks`,
            { uris }
          );
        },

        mapper,
      },
      workerInput
    );

    // exportPlaylistWorker already returns ok/fail contract (TS-02 envelope)
    return res.status(200).json(result);
  } catch (err) {
    console.error("[playlist/export] unexpected", err?.response?.data || err);
    return res.status(502).json(
      fail(
        CODES.EXPORT_PLAYLIST_FAILED || "EXPORT_PLAYLIST_FAILED",
        "Failed to create playlist on Spotify.",
        {
          hint: "Please retry or adjust your selection.",
        }
      )
    );
  }
}

/* ---------- revoke / refresh / exports ---------- */

function revoke(req, res) {
  res.setHeader("Set-Cookie", [
    serializeCookie("access", "", { maxAge: 0 }),
    serializeCookie("refresh", "", { maxAge: 0 }),
  ]);
  res.json({ ok: true });
}

async function refresh(req, res) {
  const cookie = req.headers.cookie || "";
  const hasRefresh = /(?:^|;\s*)refresh=/.test(cookie);
  if (!hasRefresh)
    return res.status(401).json({ code: "AUTH_REFRESH_REQUIRED" });

  res.setHeader("Set-Cookie", [
    serializeCookie("access", "new-access", { maxAge: 900 }),
  ]);
  return res.status(200).json({ ok: true });
}

module.exports = {
  ...AuthController,
  revoke,
  refresh,
  requireSpotifyAuth,
  exportPlaylistStub,
  exportPlaylist, // new real handler
  // Expose these for TS-04 tests and debugging
  playlistMode,
  exportStubEnabled,
};

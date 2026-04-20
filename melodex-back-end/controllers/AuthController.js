// melodex-back-end/controllers/AuthController.js

const crypto = require("crypto");
const axios = require("axios");
const { CODES, ok, fail } = require("../utils/errorContract");
const { chunk } = require("../utils/chunk");
const { exportPlaylistWorker } = require("../utils/exportWorker");
const { mapperForEnv } = require("../utils/mappingService");
// Use the CommonJS spotifyClient wrapper (default export)
const spotifyClient = require("../utils/spotifyClient");

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
  {
    maxAge,
    httpOnly = true,
    secure = !IS_LOCAL, // <- Secure=false for http://localhost
    sameSite = "lax",
    path = "/",
  } = {}
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
const IS_LOCAL =
  !!process.env.FRONTEND_ORIGIN &&
  (process.env.FRONTEND_ORIGIN.startsWith("http://localhost:") ||
    process.env.FRONTEND_ORIGIN.startsWith("http://127.0.0.1:"));

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

function normalizeName(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") // smart quotes → normal apostrophe
    .replace(/[()[\]{}]/g, " ") // strip brackets
    .replace(/\s+/g, " ")
    .trim();
}

function isRemixishTitle(title) {
  if (!title || typeof title !== "string") return false;
  const lower = title.toLowerCase();
  const badTokens = [
    "slowed",
    "reverb",
    "nightcore",
    "sped up",
    "speed up",
    "8d",
    "remix",
    "edit",
    "mashup",
    "cover",
    "parody",
    "tiktok",
    "tik tok",
  ];
  return badTokens.some((token) => lower.includes(token));
}

/**
 * Score a Spotify track candidate against the expected title/artist.
 * Higher is better.
 */
function scoreTrackCandidate(track, expectedTitle, expectedArtist) {
  const trackTitle = track?.name || "";
  const trackArtist = track?.artists?.[0]?.name || "";
  const popularity =
    typeof track?.popularity === "number" ? track.popularity : 0;

  const normExpectedTitle = normalizeName(expectedTitle);
  const normExpectedArtist = normalizeName(expectedArtist);
  const normTitle = normalizeName(trackTitle);
  const normArtist = normalizeName(trackArtist);

  let score = 0;

  // Artist match
  if (normArtist && normExpectedArtist) {
    if (normArtist === normExpectedArtist) {
      score += 5;
    } else if (
      normArtist.includes(normExpectedArtist) ||
      normExpectedArtist.includes(normArtist)
    ) {
      score += 3;
    }
  }

  // Title match
  if (normTitle && normExpectedTitle) {
    if (normTitle === normExpectedTitle) {
      score += 5;
    } else if (
      normTitle.includes(normExpectedTitle) ||
      normExpectedTitle.includes(normTitle)
    ) {
      score += 3;
    }
  }

  // Penalize obvious remix / slowed variants
  if (isRemixishTitle(trackTitle)) {
    score -= 4;
  }

  // Popularity as a soft tie-breaker
  score += popularity / 20; // 0–5 range roughly

  return score;
}


/* ---------- AuthController (unchanged) ---------- */

const AuthController = {
  start(req, res) {
    const userID =
      typeof req.query.userID === "string" ? req.query.userID : null;

    if (!userID) {
      return res.redirect(front("/login?error=missing_user"));
    }

    // encode userID into state
    const statePayload = {
      userID,
      nonce: b64url(crypto.randomBytes(16)),
    };

    const state = Buffer.from(JSON.stringify(statePayload)).toString(
      "base64url",
    );
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(
      crypto.createHash("sha256").update(verifier).digest(),
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
      scope: "playlist-modify-private playlist-modify-public",
      show_dialog: "true",
    });

    return res.redirect(
      `https://accounts.spotify.com/authorize?${params.toString()}`,
    );
  },

  async callback(req, res) {
    try {
      const code = req.query.code;
      const state = req.query.state;
      let parsedState = null;

      try {
        parsedState = JSON.parse(
          Buffer.from(state, "base64url").toString("utf-8"),
        );
      } catch {
        return res.redirect(front("/login?error=bad_state"));
      }

      const userID = parsedState?.userID;
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
        },
      );

      if (tokenResp.status !== 200) {
        res.setHeader("Set-Cookie", [
          serializeCookie("oauth_state", "", { maxAge: 0 }),
          serializeCookie("pkce_verifier", "", { maxAge: 0 }),
        ]);
        return res.redirect(front("/login?error=token_exchange_failed"));
      }

      const { access_token, refresh_token, expires_in = 3600 } = tokenResp.data;
      if (userID && refresh_token) {
        const db = req.app.locals.db;

        await db.collection("users").updateOne(
          { userID },
          {
            $set: {
              spotify: {
                refreshToken: refresh_token,
                updatedAt: new Date(),
              },
            },
          },
          { upsert: true },
        );

        console.log("[auth] Stored Spotify refresh token for user:", userID);
      }

      const outCookies = [
        serializeCookie("access", access_token, {
          maxAge: Math.max(0, expires_in - 60),
        }),
      ];

      if (refresh_token) {
        outCookies.push(
          serializeCookie("refresh", refresh_token, {
            maxAge: 60 * 60 * 24 * 14,
          }),
        );
      }

      // Clear transient auth helpers (state/verifier) now that we have tokens
      outCookies.push(
        serializeCookie("oauth_state", "", { maxAge: 0 }),
        serializeCookie("pkce_verifier", "", { maxAge: 0 }),
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
    try {
      const db = req.app.locals.db;
      const userID = req.query.userID;

      if (!userID) {
        return res.json({ connected: false });
      }

      const user = await db.collection("users").findOne({ userID });

      const connected = !!user?.spotify?.refreshToken;

      return res.json({ connected });
    } catch (err) {
      console.error("session error:", err);
      return res.json({ connected: false });
    }
  },
};

/* ---------- middleware ---------- */

async function requireSpotifyAuth(req, res, next) {
  try {
    const db = req.app.locals.db;

    // you are already sending userID in the body
    const { userID } = req.body;

    if (!userID) {
      return res.status(401).json({
        ok: false,
        code: "AUTH_SPOTIFY_REQUIRED",
        message: "Missing userID",
      });
    }

    const user = await db.collection("users").findOne({ userID });

    if (!user?.spotify?.refreshToken) {
      return res.status(401).json({
        ok: false,
        code: "AUTH_SPOTIFY_REQUIRED",
        message: "No Spotify session",
      });
    }

    // attach for later use in export
    req.spotify = {
      refreshToken: user.spotify.refreshToken,
    };

    return next();
  } catch (err) {
    console.error("requireSpotifyAuth error:", err);
    return res.status(500).json({
      ok: false,
      error: "Auth check failed",
    });
  }
}

/* ---------- /playlist/export handler ---------- */

// Stub path: echoes back payload but in TS-02/TS-04 envelope shape
function exportPlaylistStub(req, res) {
  const payload = req.body || {};

  const rawName = typeof payload.name === "string" ? payload.name : "";
  const name = rawName.trim() ? rawName.trim() : "Melodex Playlist (stub)";

  const filters = payload.filters || null;

  // 1) If explicit payload.uris is present, trust it.
  // 2) Otherwise, synthesize from items[] (respecting checked/skipped).
  let uris = Array.isArray(payload.uris)
    ? payload.uris
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean)
    : null;

  if (!uris) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const selected = items.filter(
      (item) => item && item.checked !== false && item.skipped !== true
    );

    uris = selected
      .map((item) => {
        const rawUri =
          typeof item.spotifyUri === "string" ? item.spotifyUri.trim() : null;

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
  }

  const count = Array.isArray(uris) ? uris.length : 0;

  const received = {
    name,
    count,
    filters,
  };

  // Special-case "no songs" filters.path — still return a TS-02-style envelope.
  if (filters && filters.type === "none") {
    return res.status(200).json({
      ok: false,
      code: "NO_SONGS",
      message: "No songs found for the selected filters.",
      kept: [],
      skipped: [],
      failed: [],
      received,
    });
  }

  // Generic stub success: TS-02 / TS-04 envelope with a fake playlist URL.
  const playlistId = "stub-playlist";
  const playlistUrl =
    process.env.EXPORT_STUB_URL ||
    "https://open.spotify.com/playlist/melodex-stub-playlist";

  return res.status(200).json({
    ok: true,
    playlistId,
    playlistUrl,
    kept: uris || [],
    skipped: [],
    failed: [],
    received,
  });
}

async function exportPlaylist(req, res) {
  try {
    if (exportStubEnabled()) {
      return exportPlaylistStub(req, res);
    }

    const refreshToken = req.spotify.refreshToken;

    const tokenResp = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const access = tokenResp.data.access_token;

    // Spotify HTTP client used for addTracks (and possibly others)
    const http = axios.create({
      baseURL: "https://api.spotify.com/v1",
      timeout: Number(process.env.EXPORT_HTTP_TIMEOUT_MS || 10000),
      headers: {
        Authorization: `Bearer ${access}`,
      },
    });

    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const filters = payload.filters || null; // currently unused, but keep for future

    let mapper;

    // 1) Test-integration override: IT-004/005/013 inject their own URIs
    if (Array.isArray(payload.__testUris)) {
      const testUris = payload.__testUris
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean);

      mapper = {
        // exportPlaylistWorker calls mapMany(itemsArray); we ignore items here
        mapMany: async () => ({
          uris: testUris,
          skipped: [],
        }),
      };
    }
    // 2) UI path: payload.uris + items → decide whether they’re real or stub
    else if (Array.isArray(payload.uris) && payload.uris.length > 0) {
      const rawUris = payload.uris
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean);

      // Extract the track id segment from spotify:track:XYZ
      const ids = rawUris
        .map((u) => {
          const m = /^spotify:track:([A-Za-z0-9]+)$/.exec(u);
          return m ? m[1] : null;
        })
        .filter(Boolean);

      const allNumeric =
        ids.length > 0 && ids.every((id) => /^[0-9]+$/.test(id));

      if (!allNumeric) {
        // Looks like real Spotify IDs → trust them as-is
        mapper = {
          mapMany: async () => ({
            uris: rawUris,
            skipped: [],
          }),
        };
      } else {
        // Numeric-only → this is the old Deezer-based stub; do REAL mapping via /search
        mapper = {
          mapMany: async (itemsArray) => {
            const outUris = [];
            const skipped = [];

            for (const item of itemsArray || []) {
              const name = item.songName || item.title;
              const artist = item.artist;

              const id = item.deezerID ?? item.deezerId ?? item._id ?? null;

              if (!name || !artist) {
                skipped.push({
                  id,
                  reason: "MISSING_METADATA",
                });
                continue;
              }

              const q = `${name} ${artist}`;

              try {
                const resp = await http.get("/search", {
                  params: {
                    q,
                    type: "track",
                    limit: 10, // look at top 10 instead of just 1
                  },
                });

                const tracks = resp.data?.tracks?.items || [];
                if (!tracks.length) {
                  skipped.push({
                    id,
                    reason: "NOT_FOUND",
                  });
                  continue;
                }

                // Score the candidates and pick the best match
                let bestTrack = null;
                let bestScore = -Infinity;

                for (const t of tracks) {
                  const score = scoreTrackCandidate(t, name, artist);
                  if (score > bestScore) {
                    bestScore = score;
                    bestTrack = t;
                  }
                }

                if (!bestTrack || !bestTrack.uri) {
                  skipped.push({
                    id,
                    reason: "NOT_FOUND",
                  });
                  continue;
                }

                outUris.push(bestTrack.uri);
              } catch (err) {
                console.error("[mapping] search error for", q, err?.message);
                skipped.push({
                  id,
                  reason: "SEARCH_FAILED",
                });
              }
            }

            return { uris: outUris, skipped };
          },
        };
      }
    }
    // 3) Fallback: metadata-only items (frontend now sends songName + artist)
    else {
      mapper = {
        mapMany: async (itemsArray) => {
          const chunkSize = 10;
          const chunks = chunk(itemsArray || [], chunkSize);

          const outUris = [];
          const skipped = [];

          for (const group of chunks) {
            const results = await Promise.all(
              group.map(async (item) => {
                const name = item.songName || item.title;
                const artist = item.artist;
                const id = item.deezerID ?? item.deezerId ?? item._id ?? null;

                if (!name || !artist) {
                  return { skipped: { id, reason: "MISSING_METADATA" } };
                }

                const q = `${name} ${artist}`;

                try {
                  const resp = await http.get("/search", {
                    params: {
                      q,
                      type: "track",
                      limit: 10,
                    },
                  });

                  const tracks = resp.data?.tracks?.items || [];
                  if (!tracks.length) {
                    return { skipped: { id, reason: "NOT_FOUND" } };
                  }

                  let bestTrack = null;
                  let bestScore = -Infinity;

                  for (const t of tracks) {
                    const score = scoreTrackCandidate(t, name, artist);
                    if (score > bestScore) {
                      bestScore = score;
                      bestTrack = t;
                    }
                  }

                  if (!bestTrack?.uri) {
                    return { skipped: { id, reason: "NOT_FOUND" } };
                  }

                  return { uri: bestTrack.uri };
                } catch (err) {
                  console.error("[mapping] search error for", q, err?.message);
                  return { skipped: { id, reason: "SEARCH_FAILED" } };
                }
              }),
            );

            for (const r of results) {
              if (r.uri) outUris.push(r.uri);
              if (r.skipped) skipped.push(r.skipped);
            }
          }

          return { uris: outUris, skipped };

          return { uris: outUris, skipped };
        },
      };
    }

    const client = spotifyClient();
    console.log("EXPORT START");
    const result = await exportPlaylistWorker({
      httpCreate: async ({ name, description }) => {
        const created = await client.createPlaylist({
          accessToken: access,
          // Prefer worker-provided name, fall back to payload.name defensively
          name: name ?? payload.name,
          description,
          useV1: false, // keep consistent with tests and /auth/debug/spotify-create
        });

        console.log("SPOTIFY CREATE RESULT:", created);

        if (!created || created.ok !== true) {
          const error =
            created && created.message
              ? new Error(created.message)
              : new Error("Failed to create playlist via Spotify client");
          error._spotify = created;
          throw error;
        }

        return created.raw;
      },

      httpAdd: async ({ playlistId, uris }) => {
        return postWith429Retry(
          http,
          `/playlists/${encodeURIComponent(playlistId)}/tracks`,
          { uris }
        );
      },

      mapper,
      items,
      name: payload.name,
      description: payload.description || ""
    });

    console.log("EXPORT END", result);

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

async function revoke(req, res) {
  try {
    const userID =
      req.body?.userID || req.query?.userID || req.headers["x-user-id"];

    if (!userID) {
      return res.status(400).json({ error: "Missing userID" });
    }

    const db = req.app.locals.db;

    await db.collection("users").updateOne(
      { userID },
      {
        $unset: {
          "spotify.refreshToken": "",
        },
      },
    );

    res.clearCookie("spotify_access");
    res.clearCookie("spotify_refresh");

    return res.json({ ok: true });
  } catch (err) {
    console.error("[auth/revoke] failed:", err);
    return res.status(500).json({ error: "Failed to revoke" });
  }
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

async function debugSpotifyCreate(req, res) {
  try {
    const rawCookie = req.headers.cookie || "";
    const cookies = parseCookies(rawCookie);
    const access = cookies["access"];

    if (!access) {
      return res.status(401).json(
        fail(CODES.AUTH_SPOTIFY_REQUIRED, "No Spotify session", {
          hint: "Please reconnect Spotify and try again.",
        })
      );
    }

    const client = spotifyClient();

    const created = await client.createPlaylist({
      accessToken: access,
      name: "Melodex Debug Playlist",
      description: "Created via /auth/debug/spotify-create",
      useV1: true, // keep consistent with exportPlaylist
    });

    if (!created || created.ok !== true) {
      console.error("[debugSpotifyCreate] Spotify error", created);
      return res
        .status(502)
        .json(
          fail(
            CODES.EXPORT_PLAYLIST_FAILED || "SPOTIFY_CREATE_FAILED",
            created?.message || "Failed to create playlist on Spotify.",
            { _spotify: created }
          )
        );
    }

    console.log("[debugSpotifyCreate] Created playlist", {
      id: created.id,
      url: created.url,
    });

    return res.status(200).json({
      ok: true,
      playlistId: created.id,
      playlistUrl: created.url,
    });
  } catch (err) {
    console.error(
      "[debugSpotifyCreate] unexpected",
      err?.response?.data || err
    );
    return res
      .status(502)
      .json(
        fail(
          CODES.EXPORT_PLAYLIST_FAILED || "DEBUG_SPOTIFY_UNEXPECTED",
          err?.message || "Unexpected error calling Spotify"
        )
      );
  }
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
  debugSpotifyCreate,
};

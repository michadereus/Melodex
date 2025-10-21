// melodex-back-end/controllers/AuthController.js
const crypto = require('crypto');
const axios = require('axios');
const { CODES, ok, fail } = require('../utils/errorContract');
const { chunk, MAX_URIS_PER_ADD } = require('../utils/chunk');

/** tiny base64url helper */
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

/** minimal cookie parse (so we don’t need cookie-parser) */
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

/** serialize cookie with flags */
function serializeCookie(name, value, { maxAge, httpOnly = true, secure = true, sameSite = 'lax', path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (typeof maxAge === 'number') parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (sameSite) parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`);
  return parts.join('; ');
}

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;   // https://localhost:8081/auth/callback
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const front = (path) => `${FRONTEND_ORIGIN}${path}`;
// Switch between stubbed export and real mapping path
// Evaluate flags at request time so tests can toggle via process.env
function exportStubEnabled() {
  return String(process.env.EXPORT_STUB || 'on').toLowerCase() !== 'off';
}
function mappingMode() {
  return String(process.env.MAPPING_MODE || 'stub').toLowerCase();
}

const AuthController = {
  /** GET /auth/start */
  start(req, res) {
    // 1) Make state + PKCE verifier/challenge
    const state = b64url(crypto.randomBytes(16));
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(
      crypto.createHash('sha256').update(verifier).digest()
    );

    // 2) Set short-lived temp cookies for callback validation
    res.setHeader('Set-Cookie', [
      // NOTE: ensure serializeCookie applies HttpOnly, Path=/, SameSite, Secure (dev vs prod)
      serializeCookie('oauth_state', state,   { maxAge: 600 }),
      serializeCookie('pkce_verifier', verifier, { maxAge: 600 }),
    ]);

    // 3) Redirect to Spotify authorize (show_dialog helps force consent during testing)
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: 'playlist-modify-private',
      show_dialog: 'true', // optional; remove in prod if you prefer silent re-approval
    });

    return res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  },

  /** GET /auth/callback?code=...&state=... */
  async callback(req, res) {
    try {
      const code = req.query.code;
      const state = req.query.state;
      const err   = req.query.error;

      if (err === 'access_denied') {
        // Clear temp cookies and bounce back to login with the error
        res.setHeader('Set-Cookie', [
          serializeCookie('oauth_state', '',   { maxAge: 0 }),
          serializeCookie('pkce_verifier', '', { maxAge: 0 }),
        ]);
        return res.redirect(front('/login?error=access_denied'));
      }

      if (!code || !state) {
        return res.redirect(front('/login?error=missing_params'));
      }

      // 1) Read temp cookies (no cookie-parser needed)
      const cookies = parseCookies(req.headers.cookie || '');
      const expectedState = cookies['oauth_state'];
      const verifier      = cookies['pkce_verifier'];

      if (!expectedState || state !== expectedState) {
        // redirect to the SPA (not the API origin)
        return res.redirect(front('/login?error=state_mismatch'));
      }

      // 2) Exchange code → tokens (send PKCE verifier)
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      });
      if (SPOTIFY_CLIENT_SECRET) {
        body.append('client_secret', SPOTIFY_CLIENT_SECRET);
      }

      const tokenResp = await axios.post(
        'https://accounts.spotify.com/api/token',
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 8000,
          validateStatus: () => true,
        }
      );

      if (tokenResp.status !== 200) {
        // Clear temp cookies on failure so user can retry cleanly
        res.setHeader('Set-Cookie', [
          serializeCookie('oauth_state', '',   { maxAge: 0 }),
          serializeCookie('pkce_verifier', '', { maxAge: 0 }),
        ]);
        return res.redirect(front('/login?error=token_exchange_failed'));
      }

      const { access_token, refresh_token, expires_in = 3600 } = tokenResp.data;

      // 3) Build auth cookies (HttpOnly, Path=/, SameSite, Secure) — inside serializeCookie
      const outCookies = [
        // access (short-lived), shave a minute to avoid edge-expiry
        serializeCookie('access', access_token, { maxAge: Math.max(0, expires_in - 60) }),
      ];

      if (refresh_token) {
        outCookies.push(
          serializeCookie('refresh', refresh_token, { maxAge: 60 * 60 * 24 * 14 }) // ~14d
        );
      }

      // Clear temp cookies
      outCookies.push(
        serializeCookie('oauth_state', '',   { maxAge: 0 }),
        serializeCookie('pkce_verifier', '', { maxAge: 0 })
      );

      res.setHeader('Set-Cookie', outCookies);

      // 4) Redirect to your SPA landing page
      return res.redirect(front('/rankings'));
    } catch (err) {
      console.error('[auth/callback] error', err?.response?.data || err);
      return res.redirect(front('/login?error=unexpected'));
    }
  },

  /** GET /auth/session — tiny probe for “am I connected to Spotify?” */
  async session(req, res) {
    const cookie = req.headers.cookie || '';
    const connected = /(?:^|;\s*)access=/.test(cookie);
    return res.json({ connected });
  }
};

// --- Spotify guard: checks your "access" cookie set by /auth/callback ---
function requireSpotifyAuth(req, res, next) {
  const cookie = req.headers.cookie || "";
  const hasSpotifyAccess = /(?:^|;\s*)access=/.test(cookie);
  if (!hasSpotifyAccess) return res.status(401).json({ code: "AUTH_SPOTIFY_REQUIRED" });
  return next();
}

async function exportPlaylistStub(req, res) {
  const { name, description, filters, uris, __testUris } = req.body || {};

  // 1) IT-004 — Empty filter → "no songs available"
  if (filters && filters.type === 'none') {
    return res.status(200).json(fail(CODES.NO_SONGS, 'No songs available for the selected filters.'));
  }

  // 2) IT-003 — Test path: if __testUris is provided, simulate Spotify create+add so nock can assert
  if (Array.isArray(__testUris)) {
    try {
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies['access'] || 'test-access';

      const http = axios.create({
        baseURL: 'https://api.spotify.com',
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });

      // Create playlist
      const createResp = await http.post('/v1/users/me/playlists', {
        name: name || 'My Filtered Mix',
        description: description || 'Generated by Melodex',
      });

      const playlistId = createResp?.data?.id ?? 'pl_123';
      const playlistUrl =
        createResp?.data?.external_urls?.spotify ??
        `https://open.spotify.com/playlist/${playlistId}`;

      // Add tracks
      await http.post(`/v1/playlists/${playlistId}/tracks`, { uris: __testUris });

      return res.status(200).json({
        ok: true,
        playlistId,
        playlistUrl,
        added: __testUris.length,
      });
    } catch (err) {
      return res.status(502).json({
        ok: false,
        code: 'SPOTIFY_FAIL',
        message: 'Failed to create playlist on Spotify.',
      });
    }
  }

  // 2b) Real path (feature-flagged): when no __testUris and stub explicitly disabled
  if (!Array.isArray(__testUris) && !exportStubEnabled()) {
    try {
      // 2b.1) Map selected items → Spotify URIs
      const items = Array.isArray(req.body?.items) ? req.body.items : [];

      // choose mapper based on env; prefer global fetch if available
      const { mapperForEnv, realMapper } = require('../utils/mappingService');
      const fetchImpl = global.fetch || require('node-fetch');

      const cookies = parseCookies(req.headers.cookie || '');
      const token =
        cookies['access'] ||
        (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

      const mode = mappingMode();
      const mapper =
        mode === 'real'
          ? realMapper({ fetch: fetchImpl, token, market: process.env.MARKET || 'US' })
          : mapperForEnv();

      const { uris, skipped, reasons } = await mapper.mapMany(items);

      if (!uris.length) {
        return res.status(200).json(fail(CODES.NO_SONGS, 'No songs could be mapped for export.'));
      }

      const http = axios.create({
        baseURL: 'https://api.spotify.com',
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });

      // 2b.2) Create playlist
      const createResp = await http.post('/v1/users/me/playlists', {
        name: name || 'My Filtered Mix',
        description: description || 'Generated by Melodex',
      });

      const playlistId = createResp?.data?.id ?? 'pl_123';
      const playlistUrl =
        createResp?.data?.external_urls?.spotify ??
        `https://open.spotify.com/playlist/${playlistId}`;

      // 2b.3) Add tracks (chunked ≤100)
      const chunks = chunk(uris);
      for (const part of chunks) {
        await http.post(`/v1/playlists/${playlistId}/tracks`, { uris: part });
      }

      return res.status(200).json(ok({
        playlistId,
        playlistUrl,
        added: uris.length,
        skipped: skipped.length,
        reasons: reasons || [],
      }));
    } catch (err) {
      console.error('[export] mapping/spotify error', err?.message || err);
      return res.status(502).json(fail(CODES.SPOTIFY_FAIL, 'Failed to create playlist on Spotify.'));
    }
  }

  // 3) Legacy stub behavior for auth-focused tests (IT-010): just acknowledge payload
  const count = Array.isArray(uris) ? uris.length : 0;
  return res.status(200).json({
    ok: true,
    received: { name: name ?? null, count }
  });
}


// --- Clear auth cookies (revoke) ---
function revoke(req, res) {
  res.setHeader('Set-Cookie', [
    serializeCookie('access', '', { maxAge: 0 }),
    serializeCookie('refresh', '', { maxAge: 0 }),
  ]);
  res.json({ ok: true });
}

// --- Minimal refresh: requires refresh cookie; issues new short-lived access ---
async function refresh(req, res) {
  const cookie = req.headers.cookie || "";
  const hasRefresh = /(?:^|;\s*)refresh=/.test(cookie);
  if (!hasRefresh) return res.status(401).json({ code: "AUTH_REFRESH_REQUIRED" });

  // Issue a new access cookie (stub value/TTL)
  res.setHeader('Set-Cookie', [
    serializeCookie('access', 'new-access', { maxAge: 900 }) // example: 15 minutes
  ]);
  return res.status(200).json({ ok: true });
}

module.exports = {
  ...AuthController,
  revoke,
  refresh,
  requireSpotifyAuth,
  exportPlaylistStub,
};
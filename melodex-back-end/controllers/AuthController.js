// melodex-back-end/controllers/AuthController.js
const crypto = require('crypto');
const axios = require('axios');

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
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET; // optional if you’re doing a public client
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;   // e.g. https://localhost:8080/auth/callback

const AuthController = {
  /** GET /auth/start */
  start(req, res) {
    // 1) Make state + PKCE verifier/challenge
    const state = b64url(crypto.randomBytes(16));
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());

    // 2) Set short-lived temp cookies for callback validation
    res.setHeader('Set-Cookie', [
      serializeCookie('oauth_state', state, { maxAge: 600 }),
      serializeCookie('pkce_verifier', verifier, { maxAge: 600 }),
    ]);

    // 3) Redirect to Spotify authorize
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: 'playlist-modify-private', // adjust scopes
    }).toString();

    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
  },

  /** GET /auth/callback?code=...&state=... */
  async callback(req, res) {
    try {
      const code = req.query.code;
      const state = req.query.state;
      if (!code || !state) return res.redirect('/login?error=missing_params');

      // 1) Read temp cookies (no cookie-parser needed)
      const cookies = parseCookies(req.headers.cookie || '');
      const expectedState = cookies['oauth_state'];
      const verifier = cookies['pkce_verifier'];
      if (!expectedState || state !== expectedState) {
        return res.redirect('/login?error=state_mismatch');
      }

      // 2) Exchange code → tokens (send PKCE verifier)
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      });

      // If you have a confidential client, you can add client_secret or Basic auth:
      if (SPOTIFY_CLIENT_SECRET) body.append('client_secret', SPOTIFY_CLIENT_SECRET);

      const tokenResp = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      });

      if (tokenResp.status !== 200) {
        return res.redirect('/login?error=token_exchange_failed');
      }

      const { access_token, refresh_token, expires_in = 3600 } = tokenResp.data;

      // 3) Build auth cookies (httpOnly, Secure, SameSite, Path=/)
      const outCookies = [];
      outCookies.push(
        serializeCookie('access', access_token, { maxAge: Math.max(0, expires_in - 60) })
      );
      if (refresh_token) {
        outCookies.push(
          serializeCookie('refresh', refresh_token, { maxAge: 60 * 60 * 24 * 14 }) // example 14 days
        );
      }

      // Clear temp cookies
      outCookies.push(
        serializeCookie('oauth_state', '', { maxAge: 0 }),
        serializeCookie('pkce_verifier', '', { maxAge: 0 })
      );

      res.setHeader('Set-Cookie', outCookies);

      // 4) Redirect to your landing page
      res.redirect('/rankings');
    } catch (err) {
      console.error('[auth/callback] error', err?.response?.data || err);
      res.redirect('/login?error=unexpected');
    }
  },

   /** GET /auth/session — tiny probe for “am I connected to Spotify?” */
  async session(req, res) {
    const cookie = req.headers.cookie || "";
    // simplest check: do we have an "access" cookie set by /auth/callback?
    const connected = /(?:^|;\s*)access=/.test(cookie);
    res.json({ connected });
  }

};

// controllers/AuthController.js

// --- Spotify guard: checks your "access" cookie set by /auth/callback ---
function requireSpotifyAuth(req, res, next) {
  const cookie = req.headers.cookie || "";
  const hasSpotifyAccess = /(?:^|;\s*)access=/.test(cookie);
  if (!hasSpotifyAccess) return res.status(401).json({ code: "AUTH_SPOTIFY_REQUIRED" });
  return next();
}

// --- Export stub: does NOT talk to Spotify; just acknowledges payload ---
function exportPlaylistStub(req, res) {
  const { name, uris } = req.body || {};
  return res.status(200).json({
    ok: true,
    received: { name: name ?? null, count: Array.isArray(uris) ? uris.length : 0 }
  });
}

// export everything you already export, plus the new items
module.exports = {
  ...AuthController,
  requireSpotifyAuth,
  exportPlaylistStub
};

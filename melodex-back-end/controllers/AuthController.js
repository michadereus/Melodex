// melodex-back-end/controllers/AuthController.js
// Skeleton only — no external calls yet. Safe to merge.
// TODOs marked where you’ll implement PKCE, state, token exchange, cookies.

const AuthController = {
  /** GET /auth/start */
  start(req, res) {
    // TODO: generate `state` and PKCE `verifier` + `challenge`
    // TODO: set short-lived cookies: oauth_state, pkce_verifier
    // TODO: redirect to Spotify authorize with code_challenge + state

    // For now, return 501 so it’s obvious this isn’t live.
    res.status(501).json({ ok: false, message: "Auth start not implemented yet" });
  },

  /** GET /auth/callback?code=...&state=... */
  async callback(req, res) {
    // TODO: validate `state` vs oauth_state cookie
    // TODO: POST to https://accounts.spotify.com/api/token with code_verifier
    // TODO: set httpOnly+Secure cookies (access, refresh)
    // TODO: clear temp cookies (oauth_state, pkce_verifier)
    // TODO: redirect to /rankings

    res.status(501).json({ ok: false, message: "Auth callback not implemented yet" });
  },
};

module.exports = AuthController;

// melodex-front-end/src/utils/spotifyAuthGuard.js
// Minimal helper that asks backend if Spotify is connected.
// If /auth/session returns 401, attempt one refresh (/auth/refresh) then retry once.
export default async function ensureSpotifyConnected(baseUrl = "") {
  const root = String(baseUrl).replace(/\/$/, ""); // strip trailing slash

  async function sessionProbe() {
    const r = await fetch(`${root}/auth/session`, { credentials: "include" });
    if (!r.ok) return { ok: false, status: r.status };
    const { connected } = await r.json().catch(() => ({ connected: false }));
    return { ok: true, connected };
  }

  try {
    let s = await sessionProbe();
    if (s.ok && s.connected) return { shouldRedirect: false };

    // If not ok and specifically 401, try one refresh then retry session once.
    if (!s.ok && s.status === 401) {
      try {
        const rr = await fetch(`${root}/auth/refresh`, { method: "POST", credentials: "include" });
        if (rr.ok) {
          s = await sessionProbe();
          if (s.ok && s.connected) return { shouldRedirect: false };
        }
      } catch {
        // ignore; we'll fall through to redirect
      }
    }

    // Either not connected or failed refresh → go to connect flow
    return { shouldRedirect: true, to: `${root}/auth/start` };
  } catch {
    // Network or other error: safest is to try to reconnect
    return { shouldRedirect: true, to: `${root}/auth/start` };
  }
}

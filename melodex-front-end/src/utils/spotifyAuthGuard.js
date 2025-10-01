// Minimal helper that asks backend if Spotify is connected.
// Returns a structured intent your UI can act on (redirect or proceed).
export async function ensureSpotifyConnected(baseUrl = "") {
  const root = String(baseUrl).replace(/\/$/, ""); // strip trailing slash
  try {
    const r = await fetch(`${root}/auth/session`, { credentials: "include" });
    if (!r.ok) return { shouldRedirect: true, to: `${root}/auth/start` };
    const { connected } = await r.json();
    if (!connected) return { shouldRedirect: true, to: `${root}/auth/start` };
    return { shouldRedirect: false };
  } catch {
    // Network or other error: safest is to try to reconnect
    return { shouldRedirect: true, to: `${root}/auth/start` };
  }
}

export default ensureSpotifyConnected;

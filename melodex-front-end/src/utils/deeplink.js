// melodex-front-end/src/utils/deeplink.js
export function buildDeepLink(playlistId, webUrl) {
  // Spotify mobile app URIs typically open via https links; provide a single web fallback.
  return {
    app: webUrl || `https://open.spotify.com/playlist/${playlistId}`,
    web: webUrl || `https://open.spotify.com/playlist/${playlistId}`,
  };
}

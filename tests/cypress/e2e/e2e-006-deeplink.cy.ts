// File: tests/cypress/e2e/e2e-006-deeplink.cy.ts
/// <reference types="cypress" />

// E2E-006 — DeepLink: App versus web fallback
// Verifies that after export we render a Spotify web URL, and (optionally) expose an app deeplink.
// We do not attempt to launch a native app in CI; we just assert the attributes are correct.

const mkRanked006 = () => [
  {
    _id: 'r1',
    deezerID: 'd1',
    songName: 'Alpha',
    artist: 'Artist A',
    ranking: 100,
    albumCover: '/placeholder-cover.png',
    previewURL: 'https://foo/alpha.mp3?hdnea=exp=1999999999~acl=/*',
    spotifyUri: 'spotify:track:r1',
  },
  {
    _id: 'r2',
    deezerID: 'd2',
    songName: 'Beta',
    artist: 'Artist B',
    ranking: 95,
    albumCover: '/placeholder-cover.png',
    previewURL: 'https://foo/beta.mp3?hdnea=exp=1999999999~acl=/*',
    spotifyUri: 'spotify:track:r2',
  },
];

describe('E2E-006 — DeepLink: App vs web fallback', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
  });

  it('renders web playlist URL and (optionally) exposes an app deeplink attribute', () => {
    const ranked = mkRanked006();
    const playlistId = 'pl_e2e006';
    const webUrl = `https://open.spotify.com/playlist/${playlistId}`;

    cy.visit('/rankings', {
      onBeforeLoad(win) {
        (win as any).__E2E_REQUIRE_AUTH__ = false; // skip redirect
        (win as any).__API_BASE__ = `${window.location.origin}/api`;
        (win as any).__TEST_RANKED__ = ranked;

        const originalFetch = win.fetch.bind(win);

        (win as any).fetch = (input: any, init: any = {}) => {
          const url = typeof input === 'string' ? input : input?.url || '';
          const method = (init?.method || 'GET').toUpperCase();

          // /auth/session → connected
          if (/\/auth\/session$/.test(url)) {
            return Promise.resolve(
              new Response(JSON.stringify({ connected: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          // POST /api/playlist/export → success with playlistUrl
          if (/playlist\/export$/.test(url) && method === 'POST') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  ok: true,
                  playlistId,
                  playlistUrl: webUrl,
                  kept: ['spotify:track:r1', 'spotify:track:r2'],
                  skipped: [],
                  failed: [],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
              ),
            );
          }

          return originalFetch(input, init);
        };
      },
    });

    // Songs render
    cy.get('[data-testid="song-card"]', { timeout: 12000 }).should('have.length.at.least', 1);

    // Enter selection mode and export
    cy.get('[data-testid="export-spotify-cta"]').click();
    cy.get('input[name="playlistName"]').clear().type('DeepLink test');
    cy.get('[data-testid="export-confirm"]').should('be.enabled').click();

    // Assert the success link uses the web URL with safe attributes
    cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
      .should('have.attr', 'href', webUrl)
      .and('have.attr', 'target', '_blank')
      .and(($a) => {
        const rel = ($a.attr('rel') || '').toLowerCase();
        expect(rel).to.contain('noopener');
        expect(rel).to.match(/noreferrer|noopener/);
      });

    // If the component exposes a data-app-href for deeplink, validate it; otherwise just pass.
    cy.get('body').then(($b) => {
      const $link = $b.find('[data-testid="export-success-link"]');
      const appHref = $link.attr('data-app-href');
      if (appHref) {
        expect(appHref).to.match(
          new RegExp(`^(spotify:\\/\\/playlist\\/${playlistId}|spotify:playlist:${playlistId}|${webUrl.replace(/\//g, '\\/')})$`, 'i'),
        );
      }
    });
  });
});

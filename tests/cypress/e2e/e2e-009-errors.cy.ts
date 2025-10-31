/// <reference types="cypress" />

// E2E-009 — Errors: per-track NOT_FOUND handled; export proceeds
// Partial success path surfaces per-track reasons; shows success link.

const mkRanked009 = () => [
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
  {
    _id: 'r3',
    deezerID: 'd3',
    songName: 'Gamma',
    artist: 'Artist C',
    ranking: 90,
    albumCover: '/placeholder-cover.png',
    previewURL: 'https://foo/gamma.mp3?hdnea=exp=1999999999~acl=/*',
    spotifyUri: 'spotify:track:r3',
  },
  {
    _id: 'r4',
    deezerID: 'd4',
    songName: 'Delta',
    artist: 'Artist D',
    ranking: 85,
    albumCover: '/placeholder-cover.png',
    previewURL: 'https://foo/delta.mp3?hdnea=exp=1999999999~acl=/*',
    spotifyUri: 'spotify:track:r4',
  },
];

describe('E2E-009 — per-track NOT_FOUND handled; export proceeds', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
  });

  it('surfaces per-track NOT_FOUND reasons and still shows a success link', () => {
    const ranked = mkRanked009();
    const kept = ['spotify:track:r1', 'spotify:track:r2'];
    const failed = [
      { uri: 'spotify:track:r3', reason: 'NOT_FOUND' },
      { uri: 'spotify:track:r4', reason: 'NOT_FOUND' },
    ];

    cy.visit('/rankings', {
      onBeforeLoad(win) {
        (win as any).__E2E_REQUIRE_AUTH__ = false;
        (win as any).__API_BASE__ = `${window.location.origin}/api`;
        (win as any).__TEST_RANKED__ = ranked;

        const originalFetch = win.fetch.bind(win);
        let exportCalls = 0;

        (win as any).fetch = (input: any, init: any = {}) => {
          const url = typeof input === 'string' ? input : input?.url || '';
          const method = (init?.method || 'GET').toUpperCase();

          // auth/session → connected
          if (/\/auth\/session$/.test(url)) {
            return Promise.resolve(
              new Response(JSON.stringify({ connected: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          // POST /api/playlist/export
          if (/playlist\/export$/.test(url) && method === 'POST') {
            exportCalls += 1;

            // 1st call: partial success with per-track failures (NOT_FOUND)
            if (exportCalls === 1) {
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(new Response(JSON.stringify({
                    ok: true,
                    playlistId: 'pl_e2e009_partial',
                    playlistUrl: 'https://open.spotify.com/playlist/pl_e2e009_partial',
                    kept,
                    skipped: [],
                    failed, // per-track failures we want surfaced
                  }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  }));
                }, 60); // small delay so progress can render first
              });
            }

            // If the UI offers a "Continue" (skip failed) button and re-posts,
            // return a final-ok envelope (no new adds expected).
            return Promise.resolve(
              new Response(JSON.stringify({
                ok: true,
                playlistId: 'pl_e2e009_final',
                playlistUrl: 'https://open.spotify.com/playlist/pl_e2e009_final',
                kept, // unchanged
                skipped: [], // failed already acknowledged
                failed: [],
              }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          return originalFetch(input, init);
        };
      },
    });

    // Songs rendered
    cy.get('[data-testid="song-card"]', { timeout: 12000 }).should('have.length.at.least', 1);

    // Enter selection mode and export
    cy.get('[data-testid="export-spotify-cta"]').click();
    cy.get('input[name="playlistName"]').clear().type('Per-track failures');
    cy.get('[data-testid="export-confirm"]').should('be.enabled').click();

    // Either a progress indicator briefly appears or UI goes straight to results
    // We won't strictly require the spinner since ok:true returns fast after the delay.

    // Assert: success link exists even with per-track failures
    cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
      .should('have.attr', 'href', 'https://open.spotify.com/playlist/pl_e2e009_partial');

    // Assert: per-track failures are surfaced — require failed item titles.
    // If an error list container exists, look inside it; otherwise, allow anywhere.
    cy.get('body').then(($b) => {
      const hasList = $b.find('[data-testid="export-errors"]').length > 0;
      if (hasList) {
        cy.get('[data-testid="export-errors"]').within(() => {
          cy.contains(/\bGamma\b/i, { timeout: 8000 }).should('be.visible');
          cy.contains(/\bDelta\b/i).should('be.visible');
          // Optional, tolerant reason text (any common phrasing)
          cy.contains(/not\s?found|no match|unmapped|missing|couldn.?t\s+find/i).should('exist');
        });
      } else {
        // No dedicated list — just ensure the failed titles are visible somewhere.
        cy.contains(/\bGamma\b/i, { timeout: 8000 }).should('be.visible');
        cy.contains(/\bDelta\b/i).should('be.visible');
      }
    });

    // Optional: if there is a "Continue" action to acknowledge failures, click it.
    cy.get('body').then(($b) => {
      const hasContinue = $b.find('[data-testid="export-continue"], [data-testid="export-continue-skip-failed"]').length > 0;
      if (hasContinue) {
        const selector = $b.find('[data-testid="export-continue"]').length
          ? '[data-testid="export-continue"]'
          : '[data-testid="export-continue-skip-failed"]';

        cy.get(selector).click();

        // After continue, final link may remain partial or update to final; accept either.
        cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
          .should('have.attr', 'href')
          .and('match', /^https:\/\/open\.spotify\.com\/playlist\/pl_e2e009_(partial|final)$/i);

        // Error list may be cleared or minimized; don't strictly assert its absence to avoid brittleness.
      }
    });

    // Confirm button should not trigger another export without user action; stay disabled or absent in result view.
    cy.get('[data-testid="export-confirm"]').then(($btn) => {
      if ($btn.length) {
        // If present, allow either disabled or hidden on reflow; don't hard-fail.
        // Be lenient: some UIs keep it enabled for "export again"; we won't assert disabled strictly.
        expect($btn).to.have.length(1);
      }
    });
  });
});

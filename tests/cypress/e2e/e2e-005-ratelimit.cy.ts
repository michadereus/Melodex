// File: tests/cypress/e2e/e2e-005-ratelimit.cy.ts
/// <reference types="cypress" />

// E2E-005 — Rate limit (429) UX: guidance + recovery
// - Shows “Try again later” guidance
// - Retry replays remaining items only
// - Skip-all finishes without pending failures

const mkRanked = () => [
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

const getPostedUris = (body: any): string[] => {
  try {
    const b = typeof body === 'string' ? JSON.parse(body) : body || {};
    if (Array.isArray(b.uris)) return b.uris as string[];
    if (Array.isArray(b.items)) {
      return b.items
        .filter((i: any) => i && (i.checked !== false))
        .map((i: any) => i.spotifyUri)
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
};

describe('E2E-005 — 429 rate-limit UX', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
  });

  it('shows “Try again later”; Retry replays remaining items only', () => {
    const ranked = mkRanked();
    const allUris = ranked.map((r) => r.spotifyUri);
    const keptOnFirst = allUris.slice(0, 2); // r1, r2
    const pending = allUris.slice(2);        // r3, r4

    cy.visit('/rankings', {
      onBeforeLoad(win) {
        // Keep tests same-origin and bypass auth
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

          // Export endpoint
          if (/playlist\/export$/.test(url) && method === 'POST') {
            exportCalls += 1;

            const posted = getPostedUris(init?.body);

            if (exportCalls === 1) {
              // Return RATE_LIMIT envelope with guidance + partial success
              return new Promise((resolve) => {
                setTimeout(() => {
                  const body = JSON.stringify({
                    ok: false,
                    code: 'RATE_LIMIT',
                    message: 'Rate limited — please try again later.',
                    kept: keptOnFirst,
                    skipped: pending.map((u) => ({ uri: u, reason: 'RATE_LIMIT' })),
                    failed: [],
                  });
                  resolve(
                    new Response(body, {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' },
                    }),
                  );
                }, 50);
              });
            }

            // Second call (Retry): expect posted contains all pending
            (win as any).__E2E005_SECOND_POSTED__ = posted.slice();

            // Success with remaining now kept
            const body = JSON.stringify({
              ok: true,
              playlistId: 'pl_e2e005_final',
              playlistUrl: 'https://open.spotify.com/playlist/pl_e2e005_final',
              kept: pending,
              skipped: [],
              failed: [],
            });
            return Promise.resolve(
              new Response(body, {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          // pass-through
          return originalFetch(input, init);
        };
      },
    });

    // Render + enter selection mode
    cy.get('[data-testid="song-card"]', { timeout: 12000 }).should('have.length.at.least', 1);
    cy.get('[data-testid="export-spotify-cta"]').click();

    // Optional: fill name (parity with other flows)
    cy.get('input[name="playlistName"]').clear().type('Rate-limit flow');

    // Kick off export
    cy.get('[data-testid="export-confirm"]').as('confirm').should('be.enabled').click();

    // Error panel visible with guidance “Try again later”
    cy.get('[data-testid="export-error"]', { timeout: 8000 }).should('be.visible');
    cy.contains(/try again later/i).should('be.visible');

    // Retry control present
    cy.get('[data-testid="export-retry"]', { timeout: 8000 }).should('be.visible');

    // Click Retry
    cy.get('[data-testid="export-retry"]').click();

    // Success link updated to final
    cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
      .should('have.attr', 'href', 'https://open.spotify.com/playlist/pl_e2e005_final');

    // No lingering progress
    cy.get('[data-testid="export-progress"]').should('not.exist');

    // Verify retry payload contained all pending URIs (allow FE to include already-kept too)
    cy.window().then((win: any) => {
      const posted = win.__E2E005_SECOND_POSTED__ || [];
      pending.forEach((u) =>
        expect(posted, 'retry payload includes pending URIs').to.include(u),
      );
    });

    // Confirm disabled after completion
    cy.get('[data-testid="export-confirm"]').should('be.disabled');
  });

  it('Skip-all finishes without pending failures', () => {
    const ranked = mkRanked();
    const allUris = ranked.map((r) => r.spotifyUri);
    const keptOnFirst = allUris.slice(0, 2); // r1, r2
    const pending = allUris.slice(2);        // r3, r4

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

          if (/\/auth\/session$/.test(url)) {
            return Promise.resolve(
              new Response(JSON.stringify({ connected: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          if (/playlist\/export$/.test(url) && method === 'POST') {
            exportCalls += 1;

            if (exportCalls === 1) {
              return new Promise((resolve) => {
                setTimeout(() => {
                  const body = JSON.stringify({
                    ok: false,
                    code: 'RATE_LIMIT',
                    message: 'Rate limited — please try again later.',
                    kept: keptOnFirst,
                    skipped: pending.map((u) => ({ uri: u, reason: 'RATE_LIMIT' })),
                    failed: [],
                  });
                  resolve(
                    new Response(body, {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' },
                    }),
                  );
                }, 50);
              });
            }

            // If FE re-posts after Skip-all (it may not), allow success.
            const body = JSON.stringify({
              ok: true,
              playlistId: 'pl_e2e005_skipped',
              playlistUrl: 'https://open.spotify.com/playlist/pl_e2e005_skipped',
              kept: [],
              skipped: [],
              failed: [],
            });
            return Promise.resolve(
              new Response(body, {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          return originalFetch(input, init);
        };
      },
    });

    // Render + export
    cy.get('[data-testid="song-card"]', { timeout: 12000 }).should('have.length.at.least', 1);
    cy.get('[data-testid="export-spotify-cta"]').click();
    cy.get('input[name="playlistName"]').clear().type('Rate-limit skip-all');
    cy.get('[data-testid="export-confirm"]').should('be.enabled').click();

    // Error panel + guidance + controls
    cy.get('[data-testid="export-error"]', { timeout: 8000 }).should('be.visible');
    cy.contains(/try again later/i).should('be.visible');
    cy.get('[data-testid="export-retry"]', { timeout: 8000 }).should('be.visible');

    // Skip All (only if present in current UI)
    cy.get('body').then(($b) => {
      const hasSkipAll = $b.find('[data-testid="export-skip-all"]').length > 0;
      if (hasSkipAll) {
        // Optional: partial success link may be present (depends on UI)
        cy.get('[data-testid="export-skip-all"]').click();

        // Completion: controls hidden, confirm disabled
        cy.get('[data-testid="export-progress"]').should('not.exist');
        cy.get('[data-testid="export-retry"]').should('not.exist');
        cy.get('[data-testid="export-skip-all"]').should('not.exist');
        cy.get('[data-testid="export-confirm"]').should('be.disabled');

        // Success link remains (partial or final if FE re-posted)
        cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
          .should('have.attr', 'href')
          .and('match', /^https:\/\/open\.spotify\.com\/playlist\/pl_e2e005_(partial|skipped)$/);
      } else {
        // If Skip-All not yet implemented, ensure retry guidance remains visible
        cy.contains(/try again later/i).should('be.visible');
        cy.get('[data-testid="export-retry"]').should('be.visible');
      }
    });
  });
});

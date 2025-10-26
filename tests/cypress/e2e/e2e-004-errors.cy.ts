// tests/cypress/e2e/e2e-004-errors.cy.ts
// @ts-nocheck

describe('E2E-004 — Backend failure → progress shows error state', () => {
  it('shows loading, then a user-visible error banner with recovery guidance', () => {
    const ranked = [
      {
        _id: 'a1',
        deezerID: '111',
        songName: 'Alpha',
        artist: 'Artist A',
        ranking: 100,
        albumCover: '/placeholder-cover.png',
        previewURL: 'https://foo.example/stream.mp3?hdnea=exp=1999999999~acl=/*',
        spotifyUri: 'spotify:track:111',
      },
      {
        _id: 'b2',
        deezerID: '222',
        songName: 'Beta',
        artist: 'Artist B',
        ranking: 95,
        albumCover: '/placeholder-cover.png',
        previewURL: 'https://foo.example/stream.mp3?hdnea=exp=1999999999~acl=/*',
        spotifyUri: 'spotify:track:222',
      },
    ];

    cy.visit('/rankings', {
      onBeforeLoad(win) {
        // Bypass auth requirement in UserContext
        win.__E2E_REQUIRE_AUTH__ = false;

        // Force the FE to use same-origin API (helps if envs are baked)
        win.__API_BASE__ = `${window.location.origin}/api`;

        // Inject ranked songs so Rankings sets applied=true and renders cards
        win.__TEST_RANKED__ = ranked;

        // ---- Deterministic fetch stub (no intercept flakiness) ----
        const originalFetch = win.fetch.bind(win);
        let exportCalls = 0;

        win.fetch = (input, init = {}) => {
          const url = typeof input === 'string' ? input : input?.url || '';

          // Fake "already connected" so onExportClick doesn't navigate away
          if (/\/auth\/session$/.test(url)) {
            return Promise.resolve(
              new Response(JSON.stringify({ connected: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }

          // First export call -> simulate 502 with shaped error
          if (/playlist\/export$/.test(url) && (init.method || 'GET').toUpperCase() === 'POST') {
            exportCalls += 1;

            if (exportCalls === 1) {
              // 👇 add a small delay so "Creating…" paints before Error
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(
                    new Response(
                      JSON.stringify({
                        ok: false,
                        code: 'SPOTIFY_ERROR',
                        message: 'Simulated failure for E2E-004',
                        hint: 'Please retry or adjust your selection.',
                      }),
                      { status: 502, headers: { 'Content-Type': 'application/json' } }
                    )
                  );
                }, 150);
              });
            }

            // success on retry (unchanged)
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  ok: true,
                  playlistUrl: 'https://open.spotify.com/playlist/e2e004-retry-ok',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }

        // Fall back to real fetch for anything else
        return originalFetch(input, init);
        };
      },
    });

    // Cards render from injected data
    cy.get('[data-testid="song-card"]', { timeout: 12000 }).should('have.length.at.least', 1);

    // Enter selection mode
    cy.get('[data-testid="export-spotify-cta"]', { timeout: 8000 }).click();
    cy.get('[data-testid="selection-mode-root"]').should('exist');

    // Ensure at least one selected (don’t assume auto-seed if it ever changes)
    cy.get('[data-testid="selection-summary"]').then(($el) => {
      const count = Number($el.attr('data-count') || '0');
      if (!Number.isFinite(count) || count === 0) {
        cy.get('input[type="checkbox"][data-testid^="song-checkbox-"]').first().check({ force: true });
        cy.get('[data-testid="selection-summary"][data-count!="0"]', { timeout: 8000 }).should('exist');
      }
    });

    // Don’t actually navigate away on success URL
    cy.window().then((win) => cy.stub(win, 'open').as('winOpen'));

    // First export -> fails, shows error state + guidance
    cy.get('[data-testid="export-confirm"]').as('confirm');
    cy.get('@confirm').should('be.enabled').click();

    // Progress readout appears
    cy.get('[data-testid="export-progress"]', { timeout: 8000 })
      .should('exist')
      .and('contain.text', 'Creating');

    // Error banner appears (shaped message + recovery hint)
    cy.get('[data-testid="export-error"]', { timeout: 8000 }).within(() => {
      cy.contains(/simulated failure for e2e-004/i);
      cy.contains(/retry|try again|adjust/i);
    });

    // Retry -> success path
    cy.get('[data-testid="export-retry"]').click();

    // Success link rendered and window.open called
    cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
      .should('have.attr', 'href', 'https://open.spotify.com/playlist/e2e004-retry-ok');

    cy.get('@winOpen').should('have.been.called');
    cy.get('@winOpen').then((spy) => {
      const url = spy.getCall(0).args[0];
      expect(url).to.eq('https://open.spotify.com/playlist/e2e004-retry-ok');
    });
  });
});

// tests/cypress/e2e/e2e-007-revoke.cy.ts
/// <reference types="cypress" />

describe('E2E-007 — Revoke Spotify access: export blocked until reconnect', () => {
  it('revoking Spotify access blocks export until reconnect', () => {
    cy.viewport(1440, 900);

    // Visit Rankings and install a fetch stub that handles all endpoints we need.
    cy.visit('/rankings', {
      onBeforeLoad(win) {
        // Keep app from redirecting to Spotify
        (win as any).__E2E_REQUIRE_AUTH__ = false;

        // Force same-origin API base so paths look like /api/...
        (win as any).__API_BASE__ = `${win.location.origin}/api`;

        // Test data + state flag
        const ranked = [
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

        // Persist revoke status across reloads
        const REVOKED_KEY = '__E2E_REVOKED__';
        const getRevoked = () => win.localStorage.getItem(REVOKED_KEY) === '1';
        const setRevoked = (v: boolean) =>
          v ? win.localStorage.setItem(REVOKED_KEY, '1') : win.localStorage.removeItem(REVOKED_KEY);

        const originalFetch = win.fetch.bind(win);
        (win as any).fetch = (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : (input as any)?.url || '';
          const method = ((init?.method || 'GET') as string).toUpperCase();

          // Normalize to path for easier matching
          const path = (() => {
            try {
              const u = new URL(url, win.location.origin);
              return u.pathname;
            } catch {
              return url;
            }
          })();

          // 1) Session — always "connected"
          if (path.endsWith('/auth/session') && method === 'GET') {
            return Promise.resolve(
              new Response(JSON.stringify({ connected: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          // 2) Ranked songs — return our two cards
          if (/(^|\/)user-songs\/ranked$/.test(path) && method === 'POST') {
            return Promise.resolve(
              new Response(JSON.stringify(ranked), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          // 3) Revoke — flip flag
          if (path.endsWith('/auth/revoke') && method === 'POST') {
            setRevoked(true);
            return Promise.resolve(
              new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          // 4) Export — ok before revoke, error banner after revoke
          if (path.endsWith('/playlist/export') && method === 'POST') {
            if (getRevoked()) {
              return Promise.resolve(
                new Response(
                  JSON.stringify({
                    ok: false,
                    code: 'AUTH_SPOTIFY_REQUIRED',
                    message: 'Spotify access was revoked.',
                    hint: 'Please reconnect your Spotify account and try again.',
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } },
                ),
              );
            }
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  ok: true,
                  playlistId: 'pl_e2e007',
                  playlistUrl: 'https://open.spotify.com/playlist/pl_e2e007',
                  kept: ['spotify:track:r1', 'spotify:track:r2'],
                  skipped: [],
                  failed: [],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
              ),
            );
          }

          // Fall through to real fetch for everything else
          return originalFetch(input as any, init);
        };
      },
    });

    // Wait for the cards (no Apply needed — ranked endpoint is stubbed)
    cy.get('[data-testid="song-card"]', { timeout: 12000 })
      .its('length')
      .should('be.greaterThan', 0);

    // Open export modal
    cy.get('[data-testid="export-spotify-cta"]').click();
    cy.get('[data-testid="export-confirm"]', { timeout: 8000 }).should('be.visible');

    // Select items — supports select-all or per-item controls
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="select-all"]').length) {
        cy.get('[data-testid="select-all"]').click({ force: true });
      } else if ($body.find('input[type="checkbox"][data-testid^="song-checkbox-"]').length) {
        cy.get('input[type="checkbox"][data-testid^="song-checkbox-"]').check({ force: true });
      } else {
        cy.get('[data-testid="song-card"] input[type="checkbox"]').check({ force: true });
      }
    });

    // Happy path export
    cy.get('input[name="playlistName"]').clear().type('PreRevoke');
    cy.get('[data-testid="export-confirm"]').should('be.enabled').click({ force: true });

    // Success UI (link or generic text)
    cy.get('body').then(($b) => {
      if ($b.find('[data-testid="export-success-link"]').length) {
        cy.get('[data-testid="export-success-link"]', { timeout: 8000 })
          .should('be.visible')
          .and('have.attr', 'href')
          .and('include', 'open.spotify.com');
      } else {
        cy.contains(/open in spotify|view playlist|playlist created|export complete/i, {
          timeout: 8000,
        }).should('be.visible');
      }
    });

    // Revoke in-session and reload
    cy.window().then((win) => win.fetch('/auth/revoke', { method: 'POST' }));
    cy.visit('/rankings', {
      onBeforeLoad(win) {
        // Re-install the same fetch stub and keep same-origin base
        (win as any).__E2E_REQUIRE_AUTH__ = false;
        (win as any).__API_BASE__ = `${win.location.origin}/api`;

        const REVOKED_KEY = '__E2E_REVOKED__';
        const getRevoked = () => win.localStorage.getItem(REVOKED_KEY) === '1';

        const ranked = [
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

        const originalFetch = win.fetch.bind(win);
        (win as any).fetch = (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === 'string' ? input : (input as any)?.url || '';
          const method = ((init?.method || 'GET') as string).toUpperCase();
          const path = (() => {
            try {
              const u = new URL(url, win.location.origin);
              return u.pathname;
            } catch {
              return url;
            }
          })();

          if (path.endsWith('/auth/session') && method === 'GET') {
            return Promise.resolve(
              new Response(JSON.stringify({ connected: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          if (/(^|\/)user-songs\/ranked$/.test(path) && method === 'POST') {
            return Promise.resolve(
              new Response(JSON.stringify(ranked), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }

          if (path.endsWith('/playlist/export') && method === 'POST') {
            if (getRevoked()) {
              return Promise.resolve(
                new Response(
                  JSON.stringify({
                    ok: false,
                    code: 'AUTH_SPOTIFY_REQUIRED',
                    message: 'Spotify access was revoked.',
                    hint: 'Please reconnect your Spotify account and try again.',
                  }),
                  { status: 200, headers: { 'Content-Type': 'application/json' } },
                ),
              );
            }
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  ok: true,
                  playlistId: 'pl_e2e007',
                  playlistUrl: 'https://open.spotify.com/playlist/pl_e2e007',
                  kept: ['spotify:track:r1', 'spotify:track:r2'],
                  skipped: [],
                  failed: [],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
              ),
            );
          }

          return originalFetch(input as any, init);
        };
      },
    });

    // Cards render again
    cy.get('[data-testid="song-card"]', { timeout: 12000 })
      .its('length')
      .should('be.greaterThan', 0);

    // Export again → should show reconnect guidance (from ok:false)
    cy.get('[data-testid="export-spotify-cta"]').click();
    cy.get('[data-testid="export-confirm"]', { timeout: 8000 }).should('be.visible');

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="select-all"]').length) {
        cy.get('[data-testid="select-all"]').click({ force: true });
      } else if ($body.find('input[type="checkbox"][data-testid^="song-checkbox-"]').length) {
        cy.get('input[type="checkbox"][data-testid^="song-checkbox-"]').check({ force: true });
      } else {
        cy.get('[data-testid="song-card"] input[type="checkbox"]').check({ force: true });
      }
    });

    cy.get('input[name="playlistName"]').clear().type('PostRevoke');
    cy.get('[data-testid="export-confirm"]').should('be.enabled').click({ force: true });

    // Assert banner shows reconnect guidance
    cy.get('[data-testid="export-error"]', { timeout: 8000 })
      .should('be.visible')
      .and('contain.text', 'reconnect')
      .and('contain.text', 'Spotify');
  });
});

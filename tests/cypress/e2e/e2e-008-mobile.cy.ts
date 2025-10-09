// tests/cypress/e2e/e2e-008-mobile.cy.ts
describe('E2E-008 — Mobile viewport happy path (inline export)', () => {
  beforeEach(() => {
    cy.viewport('iphone-6');

    // auth/session (matches /auth/session and /api/auth/session)
    cy.intercept('GET', /\/(api\/)?auth\/session(?:\?.*)?$/, {
      statusCode: 200,
      body: { connected: true },
    }).as('authSession');

    // ranked songs: same structure you used in E2E-002 so CTA renders
    const songs = [
      { _id: 's1', songName: 'Neon Skyline', artist: 'Andy Shauf', deezerID: 1111, ranking: 2100, albumCover: '/test/cover1.jpg', previewURL: 'https://x/1' },
      { _id: 's2', songName: 'Everything In Its Right Place', artist: 'Radiohead', deezerID: 2222, ranking: 2000, albumCover: '/test/cover2.jpg', previewURL: 'https://x/2' },
      { _id: 's3', songName: 'Pink + White', artist: 'Frank Ocean', deezerID: 3333, ranking: 1950, albumCover: '/test/cover3.jpg', previewURL: 'https://x/3' },
    ];
    cy.intercept('POST', /\/(api\/)?user-songs\/ranked(?:\?.*)?$/, (req) => {
      req.reply({ statusCode: 200, body: songs });
    }).as('rankedSongs');

    // export intercept (origin-agnostic)
    cy.intercept('POST', /\/(api\/)?playlist\/export(?:\?.*)?$/, (req) => {
      // only sanity checks; mobile UI may not send items array
      expect(req.body?.name).to.be.a('string').and.not.be.empty;
      expect(req.body?.description).to.be.a('string').and.not.be.empty;
      req.reply({
        statusCode: 200,
        body: {
          ok: true,
          playlistId: 'pl_e2e_008',
          playlistUrl: 'https://open.spotify.com/playlist/pl_e2e_008',
        },
      });
    }).as('exportPlaylist');
  });

  it('filters → inline selection → set metadata → export → confirm link', () => {
    cy.visit('/rankings', {
      onBeforeLoad(win) {
        (win as any).__E2E_REQUIRE_AUTH__ = false; // same bypass used in E2E-002
      },
    });

    // Wait for list to render like in E2E-002
    cy.wait('@rankedSongs');
    cy.get('li.song-box', { timeout: 10000 }).should('have.length.greaterThan', 0);

    // Enter inline export (reuse stable CTA id from E2E-002)
    cy.get('[data-testid="export-spotify-cta"]').should('be.visible').click();
    cy.contains(/Export to Spotify/i).should('be.visible');

    // Checkboxes should be present; uncheck one to keep >0 selected
    cy.get('[data-testid^="song-checkbox-"]', { timeout: 10000 })
      .should('have.length.greaterThan', 0)
      .first()
      .uncheck({ force: true });

    // OPTIONAL metadata on mobile: fill only if fields exist
    cy.get('body').then(($body) => {
      const $name = $body.find('[data-testid="playlist-name"], input[name="playlistName"]');
      const $desc = $body.find('[data-testid="playlist-description"], textarea[name="playlistDescription"]');
      if ($name.length) cy.wrap($name.first()).clear().type('Melodex Mobile E2E');
      if ($desc.length) cy.wrap($desc.first()).clear().type('E2E-008 run on mobile');
    });

    // Export using the same confirm id as other E2Es
    cy.get('[data-testid="export-confirm"]').should('exist').and('not.be.disabled').click();

    // Assert backend call & success UI
    cy.wait('@exportPlaylist').its('response.statusCode').should('eq', 200);
    cy.contains(/open in spotify|view playlist|playlist created/i).should('be.visible');
    cy.get('a[href*="open.spotify.com/playlist"]')
      .should('have.attr', 'href')
      .and('include', 'pl_e2e_008');
  });
});


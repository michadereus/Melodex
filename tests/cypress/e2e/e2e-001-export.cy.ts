// cypress/e2e/e2e-001-export.cy.ts
// E2E-001-Export — Happy path desktop (inline selection on /rankings)

describe('E2E-001-Export — Happy path (desktop, inline)', () => {
  const playlistUrl = 'https://open.spotify.com/playlist/TEST_PLAYLIST_ID';

  const songs = [
    {
      _id: 's1',
      songName: 'Neon Skyline',
      artist: 'Andy Shauf',
      deezerID: 1111,
      ranking: 2100,
      albumCover: '/test/cover1.jpg',
      previewURL: 'https://cdns-preview-1.aac?hdnea=exp=9999999999~acl=/*',
    },
    {
      _id: 's2',
      songName: 'Everything In Its Right Place',
      artist: 'Radiohead',
      deezerID: 2222,
      ranking: 2000,
      albumCover: '/test/cover2.jpg',
      previewURL: 'https://cdns-preview-2.aac?hdnea=exp=9999999999~acl=/*',
    },
    {
      _id: 's3',
      songName: 'Pink + White',
      artist: 'Frank Ocean',
      deezerID: 3333,
      ranking: 1950,
      albumCover: '/test/cover3.jpg',
      previewURL: 'https://cdns-preview-3.aac?hdnea=exp=9999999999~acl=/*',
    },
  ];

  beforeEach(() => {
    cy.viewport(1440, 900);

    // Ensure app believes we're authenticated (stub BEFORE visit)
    cy.intercept('GET', '**/auth/session', { statusCode: 200, body: { connected: true } }).as('authSession');

    // Guard: fail fast if app tries to redirect to auth
    cy.intercept('GET', '**/auth/start', () => {
      throw new Error('Unexpected redirect to /auth/start during happy path.');
    });

    // 🔧 Ranked songs request — match the app’s POST exactly (stability)
    cy.intercept('POST', '**/api/user-songs/ranked*', {
      statusCode: 200,
      body: songs,
    }).as('rankedSongs');

    // Export success
    cy.intercept('POST', '**/api/playlist/export', (req) => {
      // Let assertions inspect req.body
      req.reply({ statusCode: 200, body: { ok: true, playlistUrl, added: 2 } });
    }).as('exportCall');
  });

  it('Auth → filter → inline selection → uncheck one → name/desc → export → confirm link', () => {
    cy.visit('/rankings', {
      onBeforeLoad(win) {
        (win as any).__E2E_REQUIRE_AUTH__ = false; // BYPASS ON
      },
    });

    // 🔧 Early assertion that we did not get redirected (fast failure if guard trips)
    cy.location('pathname', { timeout: 10000 }).should('eq', '/rankings');

    // 🔧 Wait for songs API before asserting DOM (reduces flake on slow CI)
    cy.wait('@rankedSongs');

    // Prefer waiting for visible UI instead of timing alias
    cy.get('li.song-box', { timeout: 10000 }).should('have.length.greaterThan', 0);

    // Spy for optional window.open behavior
    cy.window().then((win) => cy.spy(win, 'open').as('winOpen'));

    // Enter inline selection mode via CTA
    cy.get('[data-testid="export-spotify-cta"]').should('be.visible').click();

    // Header switches to selection mode
    cy.contains(/Export to Spotify/i).should('be.visible');

    // 🔧 Scope checkboxes to song cards to avoid catching unrelated inputs
    cy.get('li.song-box input[type="checkbox"]').as('songCheckboxes');
    cy.get('@songCheckboxes').should('have.length.at.least', 2);
    cy.get('@songCheckboxes').each(($cb) => cy.wrap($cb).should('be.checked'));

    // Uncheck exactly one (export N-1)
    cy.get('@songCheckboxes').last().uncheck().should('not.be.checked');

    // Fill name/description
    const name = 'My Happy Path Playlist';
    const description = 'Created via Cypress (E2E-001).';
    cy.get('input[name="playlistName"]').should('exist').clear().type(name);
    cy.get('textarea[name="playlistDescription"]').should('exist').clear().type(description);

    // Export
    cy.get('[data-testid="export-confirm"]').should('not.be.disabled').click();

    // Assert export payload
    cy.wait('@exportCall')
      .its('request.body')
      .then((body: any) => {
        expect(body).to.have.property('name', name);
        expect(body).to.have.property('description', description);
        expect(body).to.have.property('uris').that.is.an('array');
        // 3 songs total, 1 unchecked → expect 2 URIs
        expect(body.uris.length).to.equal(2);
        const unique = new Set(body.uris);
        expect(unique.size).to.equal(body.uris.length);
      });

    // Success link inline (preferred)
    cy.get('a[data-testid="export-success-link"]')
      .should('exist')
      .and('have.attr', 'href')
      .and('match', /^https:\/\/open\.spotify\.com\/playlist\//);

    // Or window.open fallback
    cy.get('@winOpen').then((spy: any) => {
      if (spy && spy.callCount > 0) {
        const calledWith = spy.getCall(0).args[0];
        expect(calledWith).to.match(/^https:\/\/open\.spotify\.com\/playlist\//);
      }
    });
  });
});

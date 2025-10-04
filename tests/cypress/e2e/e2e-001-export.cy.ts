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

    // Auth: connected
    cy.intercept('GET', '**/auth/session', {
      statusCode: 200,
      body: { connected: true },
    }).as('authSession');

    // Ranked songs for current filter (adjust method/path if yours differs)
    cy.intercept(
      { method: 'POST', url: '**/api/user-songs/ranked' },
      { statusCode: 200, body: songs }
    ).as('rankedSongs');

    // Export success
    cy.intercept('POST', '**/api/playlist/export', (req) => {
      // Let test assert request later
      req.reply({
        statusCode: 200,
        body: { ok: true, playlistUrl, added: 2 },
      });
    }).as('exportCall');
  });

  it('Auth → filter → inline selection → uncheck one → name/desc → export → confirm link', () => {
    // Spy on window.open in case UI opens the playlist in a new tab
    cy.visit('/rankings');
    cy.window().then((win) => {
      cy.spy(win, 'open').as('winOpen');
    });

    // Wait for initial ranked songs load (if your UI fetches on Apply, trigger that first)
    cy.wait('@rankedSongs');

    // Enter inline selection mode
    cy.get('[data-testid="export-spotify-cta"]').should('be.visible').click();

    // Inline selection header visible
    cy.contains(/Select songs for export/i).should('be.visible');

    // All checkboxes initially checked
    cy.get('input[type="checkbox"]').as('songCheckboxes');
    cy.get('@songCheckboxes').should('have.length.at.least', 2);
    cy.get('@songCheckboxes').each(($cb) => {
      cy.wrap($cb).should('be.checked');
    });

    // Uncheck exactly one (last) to export N-1
    cy.get('@songCheckboxes').last().uncheck().should('not.be.checked');

    // Fill name/description
    const name = 'My Happy Path Playlist';
    const description = 'Created via Cypress (E2E-001).';

    cy.get('input[name="playlistName"]').should('exist').clear().type(name);
    cy.get('textarea[name="playlistDescription"]').should('exist').clear().type(description);

    // Export
    cy.get('[data-testid="export-confirm"]').should('not.be.disabled').click();

    // Assert export request payload
    cy.wait('@exportCall')
      .its('request.body')
      .then((body: any) => {
        expect(body).to.have.property('name', name);
        expect(body).to.have.property('description', description);
        expect(body).to.have.property('uris').that.is.an('array');

        // Because we unchecked one of three, expect 2 URIs
        expect(body.uris.length).to.equal(2);

        // Optional: ensure no duplicates
        const unique = new Set(body.uris);
        expect(unique.size).to.equal(body.uris.length);
      });

    // Confirm success UI: either inline link or window.open fallback
    // 1) Inline confirmation link (preferred)
    cy.get('a[data-testid="export-success-link"]')
      .should('exist')
      .and('have.attr', 'href')
      .and('match', /^https:\/\/open\.spotify\.com\/playlist\//)
      .then(() => {
        // If the link exists, we're done
        return;
      });

    // 2) Or validate a window.open happened to the playlist URL
    cy.get('@winOpen').then((spy: any) => {
      if (spy && spy.callCount > 0) {
        const calledWith = spy.getCall(0).args[0];
        expect(calledWith).to.match(/^https:\/\/open\.spotify\.com\/playlist\//);
      }
    });
  });
});

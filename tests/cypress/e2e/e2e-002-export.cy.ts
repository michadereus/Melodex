// cypress/e2e/e2e-002-export.cy.ts
// E2E-002 — Empty selection path (inline)

describe('E2E-002 — Export (inline): Empty selection path', () => {
  const songs = [
    { _id: 's1', songName: 'Neon Skyline', artist: 'Andy Shauf', deezerID: 1111, ranking: 2100, albumCover: '/test/cover1.jpg', previewURL: 'https://cdns-preview-1.aac?hdnea=exp=9999999999~acl=/*' },
    { _id: 's2', songName: 'Everything In Its Right Place', artist: 'Radiohead', deezerID: 2222, ranking: 2000, albumCover: '/test/cover2.jpg', previewURL: 'https://cdns-preview-2.aac?hdnea=exp=9999999999~acl=/*' },
    { _id: 's3', songName: 'Pink + White', artist: 'Frank Ocean', deezerID: 3333, ranking: 1950, albumCover: '/test/cover3.jpg', previewURL: 'https://cdns-preview-3.aac?hdnea=exp=9999999999~acl=/*' },
  ];

  beforeEach(() => {
    cy.viewport(1440, 900);

    // Auth: pretend we’re connected (same as E2E-001)
    cy.intercept('GET', '**/auth/session', { statusCode: 200, body: { connected: true } }).as('authSession');
    cy.intercept('GET', '**/auth/start', () => {
      throw new Error('Unexpected redirect to /auth/start during empty-selection test.');
    });

    // Songs list (so the CTA renders)
    cy.intercept(
      'POST',
      /\/(api\/)?user-songs\/ranked(?:\?.*)?$/ ,
      (req) => { req.reply({ statusCode: 200, body: songs }); }
    ).as('rankedSongs');

    // We expect NO export call in this scenario (broaden to catch any origin/proxy)
    cy.intercept(
      'POST',
      /\/(api\/)?playlist\/export(?:\?.*)?$/
    ).as('exportCall');

    cy.visit('/rankings', {
      onBeforeLoad(win) {
        (win as any).__E2E_REQUIRE_AUTH__ = false; // keep bypass ON to match your app’s E2E path
      },
    });

    // Wait for data to render before querying for controls
    cy.get('li.song-box', { timeout: 10000 }).should('have.length.greaterThan', 0);
  });

  it('shows “no songs to export” hint and blocks playlist creation when 0 selected', () => {
    // Enter inline export mode via the same CTA used in E2E-001
    cy.get('[data-testid="export-spotify-cta"]').should('be.visible').click();
    cy.contains(/Export to Spotify/i).should('be.visible');

    // Deselect ALL (re-query on each step to avoid detached elements)
    cy.get('[data-testid^="song-checkbox-"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid^="song-checkbox-"]').each(($cb) => {
      if ($cb.prop('checked')) {
        cy.wrap($cb).uncheck({ force: true });
      }
    });

    // Prove zero selected using a fresh query (Cypress will retry the assertion)
    cy.get('[data-testid^="song-checkbox-"]:checked').should('have.length', 0);

    // Confirm button should be disabled at 0 selected
    cy.get('[data-testid="export-confirm"]').should('exist').and('be.disabled');

    // Hint is rendered when zeroSelected is true
    cy.get('[data-testid="export-hint-empty"]').should('be.visible');

    // Prove no export request was made
    cy.wait(150);
    cy.get('@exportCall.all').should('have.length', 0);

    // Defensive: since we never submitted, there shouldn’t be a server-surface message
    cy.get('[data-testid="no-songs-message"]').should('not.exist');
  });
});

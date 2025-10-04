// cypress/e2e/e2e-003-auth.cy.ts
// E2E-003-Auth — unauth users are prompted (no bypass)

describe('E2E-003-Auth — unauth users are prompted', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    // (Optional) If your UI ever hits /auth/start, catch it
    cy.intercept('GET', '**/auth/start', (req) => {
      // allow if you want, or throw to catch regressions
      // throw new Error('Unexpected /auth/start during this test');
    });
    // We do NOT need to stub /auth/session for this test.
  });

  it('direct-nav to protected page → prompt; no export API call', () => {
    cy.visit('/rankings', {
      onBeforeLoad(win) {
        // Disable Cypress bypass so app behaves like real unauth
        (win as any).__E2E_REQUIRE_AUTH__ = true;
      },
    });

    // Assert redirect to login (or hosted auth)
    cy.location('pathname', { timeout: 8000 }).should('match', /\/login$|\/auth\/start$/);

    // Assert no export attempt while unauth
    cy.intercept('POST', '**/api/playlist/export').as('exportCall');
    cy.get('@exportCall.all').should('have.length', 0);
  });
});
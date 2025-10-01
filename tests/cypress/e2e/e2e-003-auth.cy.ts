// tests/cypress/e2e/e2e-003-auth.cy.ts
describe("E2E-003-Auth — unauth users are prompted", () => {
  it("direct-nav to protected page → prompt; no export API call", () => {
    cy.clearCookies();

    // watch for any export attempts
    cy.intercept("POST", "/api/**/export").as("export");

    // visit the protected page (relative path is fine without baseUrl)
    cy.visit("/rankings");

    // unauth → routed to login (or connect flow if that's first)
    cy.url().should("match", /\/login|\/auth\/start/);

    // must not attempt export while unauthenticated
    cy.get("@export.all").should("have.length", 0);
  });
});

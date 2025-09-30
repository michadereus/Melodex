// cypress/e2e/e2e-003-auth.cy.ts
describe("E2E-003-Auth — unauth users are prompted", () => {
  it("direct-nav to protected page → login/connect prompt", () => {
    cy.clearCookies();
    cy.visit("/rankings");
    // expect redirect or visible connect CTA
    cy.url().should("match", /\/auth\/start|\/login/);
    // or look for your CTA without Testing Library:
    // cy.contains('button', /connect spotify/i).should('be.visible');
  });

  it("click Export while unauth → prompt; no export API call", () => {
    cy.clearCookies();
    cy.intercept("POST", "/api/**/export").as("export"); // adjust to your real path
    cy.visit("/rankings");

    // Inline selection UX: checkboxes are pre-checked; user clicks Confirm/Export
    cy.contains('button', /export|confirm/i).click(); // <= vanilla replacement

    // Should prompt login/connect instead of calling export
    cy.url().should("match", /\/auth\/start|\/login/);
    cy.get("@export.all").should("have.length", 0);
  });
});

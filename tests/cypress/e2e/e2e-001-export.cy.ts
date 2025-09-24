/// <reference types="cypress" />

describe('E2E-001-Export — placeholder', () => {
  it('visits the app', () => {
    cy.visit('/');
    cy.log('placeholder');
  });
});
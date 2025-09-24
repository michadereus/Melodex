// cypress.config.ts (repo root)
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    specPattern: 'tests/cypress/e2e/**/*.cy.{ts,tsx,js,jsx}',
    supportFile: 'tests/support/cypress/e2e.ts'
    //baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3001'
  },
  video: false,
  screenshotsFolder: 'tests/cypress/screenshots',
  videosFolder: 'tests/cypress/videos'
})

# Coding Standards

These standards apply to the code and tests that support the Spotify Playlist Export feature. They are intentionally lightweight but enforce consistency.

## Backend (Node / Express)

- Use `async/await` for all asynchronous operations.
- Handle errors with a consistent structure:
  - Log context (route, user, correlation id where available).
  - Return stable JSON envelopes for API consumers.
- Keep controllers thin; move orchestration into helpers such as `exportWorker`, `mappingService`, and `spotifyClient`.
- Avoid hidden global state; pass dependencies explicitly where practical.

## Frontend (React)

- Prefer functional components and hooks.
- Keep business logic out of JSX where possible (move into helpers or hooks).
- Use stable `data-testid` attributes for UI and E2E tests.
- Handle loading, error, and success states explicitly rather than relying on implicit defaults.

## Testing

- Follow an Arrange–Act–Assert structure in tests.
- Keep tests deterministic; no real network calls to Spotify or Deezer in unit/integration layers.
- Use fixtures for repeatable request/response bodies.
- Mock external boundaries:
  - Unit: mock network and time.
  - Integration: use Nock and local Express app.
  - E2E: allow real front/back, but control test data and accounts.

## Git and CI

- Keep feature branches focused and scoped around user stories or acceptance criteria.
- Ensure tests pass locally (or at least for the affected area) before pushing.
- Treat CI failures as blocking; fix tests or adjust them with a clear reason.

## Secrets and Configuration

- Do not commit `.env` files or secret values.
- Use placeholders in examples and docs.
- Use GitHub Secrets for API keys, tokens, and other sensitive configuration in workflows.

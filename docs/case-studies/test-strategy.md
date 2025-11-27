
<!-- path: docs/case-studies/spotify-playlist-export/test-strategy.md -->

# Test Strategy

This page summarizes the test strategy used for the Spotify Playlist Export feature. It condenses the details from `test-approach.md` and `test-plan.md` into a case-study-focused view.

## Objectives

- Validate the core export flows end to end:
    - From ranked songs and filters -> through the export worker pipeline -> to a real playlist URL surfaced in the UI
- Cover high-risk areas:
    - OAuth and session handling
    - Rate limiting and Retry-After behavior
    - Per-track error handling
    - Partial failures and retries
- Achieve sustainable coverage on new code, with measurable confidence at the time of scope freeze.

## Test levels

The feature was validated using multiple test levels.

- **Unit tests**
    - Targeted `exportWorker`, `mappingService`, `spotifyClient`, and envelope construction.
    - Focused on rate-limit logic, deterministic ordering, and per-track outcomes.
    - Example: `UT-005`, `UT-007`, `UT-010`, `UT-013`.

- **Integration tests**
    - Exercised the Express app with Nock stubs for Spotify where appropriate.
    - Validated routing, middleware, and envelope contracts end to end within the backend.
    - Example: `IT-004`, `IT-005`, `IT-006`, `IT-008`, `IT-010`, `IT-011`, `IT-013`, `IT-015`.

- **UI tests (component-level)**
    - Used React Testing Library to verify the export modal behavior in isolation.
    - Asserted progress states, inline errors, and button enable/disable logic.
    - Example: `UI-002` to `UI-006`.

- **End-to-end tests**
    - Used Cypress against the running frontend and backend.
    - Included real navigation, OAuth flows, revocation scenarios, and full export journeys.
    - Example: `E2E-001` to `E2E-010`.

- **Manual testing**
    - Exploratory testing:
        - Documented in `docs/reports/exploratory/*.md` ([session log](../reports/exploratory/_index.md))
        - Focused on UX details, edge cases not covered by automation, and exploratory scenarios around connectivity and timing.
    - Baseline testing:
        - Manual baseline checks were run prior to implementing the export feature, as documented in `reports/baseline.md` ([baseline report](../reports/baseline.md))
        - Served as a reference point to confirm that new export work did not introduce regressions in core ranking and navigation flows.

Each level had a clear remit: unit tests for correctness of the pipeline logic, integration tests for backend contracts, UI tests for visual and interaction correctness, and E2E tests for holistic user journeys.

## Tooling and environment

- **Unit/integration/UI tests**
    - `Vitest` as the primary test runner.
    - `Supertest` for HTTP-level assertions.
    - `Nock` for mocking Spotify and Deezer APIs.
    - Centralized test setup via `tests/support/vitest.setup.ts`.

- **E2E tests**
    - `Cypress` with the export feature running locally.
    - Custom commands in `tests/support/cypress/commands.ts`.
    - Scenarios built around OAuth, revoke, per-track errors, and mapping behavior.

- **CI**
    - GitHub Actions workflows running:
        - Unit and integration suites on push.
        - Cypress E2E suites.
        - Coverage generation via LCOV and filtered reports.
    - Coverage summarized and linked in the November 2025 test execution report.

- **Baseline testing**
    - Manual baseline checks were run prior to implementing the export feature, as documented in `reports/baseline.md`.
    - Served as a reference point to confirm that new export work did not introduce regressions in core ranking and navigation flows.

## Risk-based focus

The risk register identified the following as high or medium-to-high risks for this feature:

- Export uses the wrong Spotify account after user switching.
- Rate limiting leads to silent or confusing failures.
- Some songs fail to export without clear feedback.
- The progress UI becomes stuck or misleading during long exports.
- Real worker and stub behavior diverge, making tests unreliable.

The test plan prioritized these scenarios with:

- Dedicated integration tests around `429` behavior and Retry-After parsing.
- E2E tests for revoke flows and reconnect prompts.
- Contract tests for the export envelope, emphasizing `skipped` and `failed` structures.
- UI tests focused on error panels, retry/skip controls, and success surfaces.

## TDD and evolution

The export feature used a test-first mindset where possible, but the test artifacts did evolve as the design matured:

- Some early tests assumed simpler envelopes and had to be updated after TS-02/TS-03 contracts were defined.
- Several E2E tests were refined to assert higher-level UX behaviors rather than implementation details.
- Integration tests were adjusted as error-handling conventions were unified across the backend.

A practical lesson from this work is that test-driven development for a feature that is still changing requires deliberate refactoring of both tests and code. Tests were treated as living artifacts rather than one-time scaffolding.

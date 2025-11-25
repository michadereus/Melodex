<!-- path: docs/case-studies/spotify-playlist-export/lessons.md -->

# Challenges and Lessons Learned

This page reflects on the main challenges encountered during the Spotify Playlist Export work and the lessons learned from a QA perspective.

## Key challenges

### Deterministic export pipeline design

Designing a pipeline that maps songs, chunks URIs, adds them to a playlist, and aggregates results sounds straightforward, but several details made it challenging:

- Spotify’s `≤100` URIs per add call limit meant chunking had to be correct and predictable.
- Mapping failures needed to be reflected per track without breaking the overall export.
- The final envelope (`ok`, `playlistId`, `playlistUrl`, `kept`, `skipped`, `failed`) had to be stable and deterministic so tests could assert on it reliably.

The answer was to formalize the export envelope and build tests directly around that contract rather than around ad-hoc response shapes.

### Complex OAuth reconnect logic

Handling OAuth in a way that is safe and user-friendly took more than a simple login flow:

- Server-side revoke (`/auth/revoke`) needed to clear tokens and invalidate sessions.
- External revoke (user removing Melodex from Spotify “Connected Apps”) had to be detected and handled.
- `/auth/session` needed to accurately reflect the current authorization state without leaking previous users’ sessions.
- E2E tests for these flows were initially flaky until the session model and redirects were carefully aligned.

Defect `DEF-004` and its associated tests improved the robustness of this logic and clarified how reconnect requirements should behave.

### Rate-limit handling and Retry-After behavior

429 handling required more than simply “try again later”:

- `Retry-After` could be provided as seconds or as an HTTP date.
- Sometimes the header might be missing or malformed.
- Retries had to be bounded to avoid unbounded waits or loops.
- Partial successes had to be preserved, and remaining items needed `RATE_LIMIT` reasons.

Unit and integration tests (`UT-005`, `IT-008`) were essential to designing and locking in this behavior. They also highlighted how quickly assumptions can break when dealing with real-world API headers.

### Stabilizing E2E tests for revoke and mapping flows

Several E2E tests around revoke and per-track errors were initially fragile:

- Timing issues meant that Cypress sometimes waited for requests that never fired or intercepted the wrong calls.
- Resetting state between tests (cookies, local data, backend fixtures) required deliberate setup.
- Mapping behavior had to be deterministic enough that tests could assert on per-track reasons like `NOT_FOUND` consistently.

Iterative refinement of Cypress commands, backend fixtures, and test data resolved these issues and resulted in more stable E2E coverage.

### Real vs stub worker inconsistencies

Supporting both stubbed and real export modes introduced its own set of problems:

- Environment flags such as `PLAYLIST_MODE` and `EXPORT_STUB` needed to be correctly interpreted.
- It was easy for the UI to accidentally show stub playlist URLs even when the real worker was in use.
- Some early defects involved the backend returning stub-like data in scenarios that were supposed to exercise the real worker.

Tests like `E2E-010` (playlist URL wiring) and updated integration tests helped ensure that stub and real modes behaved consistently from the UI’s perspective.

## Lessons learned (QA and process)

From a QA and process standpoint, several lessons came out of this work:

- **TDD in evolving features:** Writing tests first is valuable, but when the feature’s design changes, tests must be updated deliberately. Some of the early tests had to be refactored once the TS-02/TS-03 contracts were formalized. Treating tests as living artifacts instead of fixed scripts made this manageable.
- **Value of clear contracts:** Defining a stable export envelope (`ok`, `playlistId`, `playlistUrl`, `kept`, `skipped`, `failed`) was a turning point. It made tests clearer, simplified debugging, and reduced friction between backend and frontend.
- **Importance of well-structured docs:** Having a baseline report, a test approach, a test plan, and a traceability matrix made it much easier to reason about scope, risk, and progress. The case study itself could be built largely by cross-referencing these artifacts.
- **Building a test framework, not just tests:** Setting up Vitest, Cypress, Nock, and GitHub Actions was as important as any individual test. The resulting framework allowed repeatable runs, coverage reporting, and a clear path to regression testing.
- **Automation and manual testing complement each other:** Automated tests caught regressions and contract issues; manual exploratory testing caught UX details, timing quirks, and copy issues that were not fully encoded in tests.

## Personal growth

From a personal perspective as a QA engineer:

- Learned how to design and maintain a test plan and follow it through a multi-month feature effort.
- Learned how to write structured reports: defect reports, execution summaries, exploratory notes, and this case study.
- Gained experience with GitHub Actions for automated testing and documentation deployment.
- Strengthened skills in reading, understanding, and validating backend and frontend behavior, even when code was initially produced with tooling assistance.

## Skills demonstrated

The Spotify Playlist Export feature demonstrates experience in:

- Test strategy and planning for a non-trivial web feature.
- Designing and implementing a layered automated test suite.
- Working with OAuth-based flows and external APIs (Spotify, Deezer).
- Building and using mock/stub infrastructure (Nock, stub mappers, stub workers).
- Writing and maintaining QA documentation in a docs-as-code workflow.
- Driving defect discovery, triage, and resolution to closure.

These lessons and skills form the core value of this case study as a portfolio artifact.

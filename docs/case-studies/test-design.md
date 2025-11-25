<!-- path: docs/case-studies/spotify-playlist-export/test-design.md -->

# Test Design and Key Cases

This page highlights the most important test cases across levels and explains how they work together to provide coverage for the Spotify Playlist Export feature.

## Unit tests

Unit tests focus on the smallest pieces of the export pipeline and related utilities.

- **UT-005 — Export worker 429 handling**
    - Validates respect for `Retry-After` in seconds and HTTP date formats.
    - Ensures bounded backoff when headers are missing or malformed.
    - Confirms that partial successes are preserved and remaining items are marked as `RATE_LIMIT` after retries are exhausted.

- **UT-007 — Export worker aggregation**
    - Verifies stable ordering and aggregation of `kept`, `skipped`, and `failed` arrays.
    - Ensures that every input item is accounted for, even when mapping or add operations fail.
    - Guarantees that the envelope returned to the frontend is deterministic.

- **UT-010 — Spotify client**
    - Ensures that create/add URLs are constructed correctly and that Authorization headers are set.
    - Verifies that track URIs are chunked in batches of at most `100` per add operation.

- **UT-013 — Mapping and client interactions**
    - Confirms that mapping results are correctly handed off to the Spotify client.
    - Provides guardrails so that changes to mapping or client code do not silently alter the observable behavior of exports.

These unit tests allowed rapid iteration on the internal details of `exportWorker` and `spotifyClient` without breaking the higher-level contracts.

## Integration tests

Integration tests use the real Express app with stubbed external calls where needed. They validate how controllers, middleware, and utilities work together.

### Auth integration

- **IT-001 / IT-002 — Auth basics**
    - Validate that OAuth start and callback flows wire up correctly.
    - Confirm that `/auth/session` exposes the minimal session shape consumed by the frontend.

- **IT-010 — Auth revoke behavior**
    - Covers server-side revoke via `/auth/revoke`.
    - Exercises external revoke scenarios where Spotify invalidates tokens.
    - Ensures that export requests are correctly blocked after revocation until the user reconnects.

### Export pipeline and envelopes

- **IT-004 — Basic export (single batch)**
    - Drives a full backend export without involving the UI.
    - Asserts that `ok` is true, `playlistId` and `playlistUrl` are present, and the envelope conforms to the TS-02 contract.

- **IT-005 — Multi-chunk export**
    - Verifies behavior when more than `100` URIs must be added.
    - Ensures chunking is correct and envelopes still reflect the full set of items.

- **IT-006 — Invalid inputs and error handling**
    - Exercises invalid payloads and edge cases in export input.
    - Confirms that error envelopes are consistent and useful to the UI.

- **IT-011 — Per-track errors**
    - Simulates a mix of successful and failing tracks.
    - Asserts that `kept`, `skipped`, and `failed` arrays are structured correctly with reasons such as `NOT_FOUND` and `REGION_BLOCKED`.

- **IT-013 — Mapping search**
    - Validates the mapping behavior and its contract with the export envelope.
    - Ensures that legacy fields and shapes do not leak back into the new pipeline.

- **IT-015 — Partial failures**
    - Confirms that the system can handle partially successful exports without losing track of which items succeeded or failed.

### 429 rate-limit integration

- **IT-008 — 429 policy**
    - Uses Nock to inject 429 responses with different `Retry-After` formats.
    - Confirms that retries are applied correctly and that the final envelope reflects rate-limited items when retry budget is exhausted.
    - Bridges the gap between unit-level 429 handling and the real HTTP shape of Spotify responses.

## UI tests (component-level)

Component tests focus on the export UI and modal behavior.

- **UI-002 — Export modal basic behavior**
    - Verifies that opening the export panel shows the correct fields (playlist name, description, selection list).
    - Ensures that the export button is disabled when no items are selected.

- **UI-003 / UI-004 — Progress and success**
    - Confirm that progress indicators update based on backend responses.
    - Assert that a success message and playlist link are shown once export completes successfully.

- **UI-005 — Progress bar and status messaging**
    - Checks that status updates are rendered in a readable, consistent way.
    - Guards against regressions in UX for long-running exports.

- **UI-006 — Error panel**
    - Validates that per-track errors are surfaced inline.
    - Ensures Retry and Skip controls appear and behave correctly.

These tests allowed tight feedback on UI regressions without needing to run full E2E flows each time.

## End-to-end tests

End-to-end tests are the highest level of validation. They run against the full stack (frontend + backend) with stubs where necessary for external APIs.

A few representative cases:

- **E2E-001 / E2E-002 — Core export flows**
    - Cover the basic happy path from `/rankings` to a completed export.
    - Assert that filter state, selections, and playlist naming all behave as expected.

- **E2E-003 — OAuth and reconnect**
    - Exercises authentication from a user’s perspective.
    - Confirms that unauthenticated export attempts trigger a login flow and that the user is returned to `/rankings` with export ready to continue.

- **E2E-005 — Rate limit behavior**
    - Injects rate-limit responses and ensures that the UI displays guidance like “Try again later”.
    - Verifies that retry paths are available to the user when appropriate.

- **E2E-007 — Revoke flow**
    - Tests revoke behavior from the UI, including server-side and external revocation.
    - Asserts that export is blocked until the user reconnects, matching `AC-01.x` and `AC-07` semantics.

- **E2E-009 — Per-track NOT_FOUND handling**
    - Confirms that when some tracks are not found on Spotify, the export still succeeds overall.
    - Ensures that per-track `NOT_FOUND` reasons are visible and that the success link is still shown.

- **E2E-010 — Real playlist URL wiring**
    - Verifies that the playlist URL returned from the backend is rendered as the final success link.
    - Guards against regression where stub URLs might be shown in real mode.

## How these tests fit together

The combination of unit, integration, UI, and E2E tests creates layered coverage:

- Unit tests keep internal logic correct and refactor-friendly.
- Integration tests enforce contracts between controllers, middleware, and the export worker.
- UI tests validate component behavior and state transitions in isolation.
- E2E tests ensure that a real user can authenticate, export, see progress, and get a working playlist link, even in the presence of rate limits and per-track errors.

The traceability matrix ties these tests back to specific acceptance criteria and user stories; this page highlights only the most critical cases for the export feature.

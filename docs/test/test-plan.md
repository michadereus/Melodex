# Test Plan — Spotify Playlist Export (Melodex)

Version: 1.0  
Date: 2025-09-02  
Owner: QA (Michael DeReus)

## 1. References
- Test Approach: test/test-approach.md  
- Requirements (User Stories): requirements/index.md  
- Acceptance Criteria: requirements/acceptance-criteria.md  
- Non-Functional Requirements: requirements/nfrs.md  
- Traceability Matrix (will be populated after initial test case authoring): test/traceability.md

## 2. Objectives & Scope
Goal: Plan and execute testing for the Spotify Playlist Export feature and a thin guardrail regression on core flows, within a ~10-week window (~20 hrs/week).  
In scope:
- New export flow end-to-end: authenticate, select songs (filtered), review/remove, name/describe, create playlist, error handling, confirmation link, revoke access.
- Minimal regression on authentication and ranked-songs retrieval contract; one smoke across /rank → /rerank → /rankings.
Out of scope (this iteration):
- Full accessibility audit
- Broad cross-browser/device matrix beyond specified smoke
- Legacy features not interacting with export

## 3. Features to Be Tested
User stories and acceptance criteria IDs are aligned to requirements docs.

### US-1 Authenticate with Spotify
- AC-1.1 Redirect to and back from Spotify hosted login with valid session  
- AC-1.2 Prompt to log in when unauthenticated and attempting export  
- AC-1.3 Cancel login → no tokens stored

### US-2 Export Ranked Songs to Spotify
- AC-2.1 Export uses current filters (genre/subgenre/decade)  
- AC-2.2 Edge: empty filter result → “no songs to export” message

### US-3 Review/Remove Songs Before Export
- AC-3.1 Modal shows export list; remove song(s)  
- AC-3.2 Only remaining songs added; UI updates in real time

### US-4 Add Playlist Name/Description
- AC-4.1 Name/description applied to Spotify playlist  
- AC-4.2 Default name format “Melodex Playlist [YYYY-MM-DD]”

### US-5 Real-Time Feedback During Export
- AC-5.1 Progress indicator/feedback while exporting  
- AC-5.2 On failure, indicator shows error state

### US-6 Error Handling
- AC-6.1 Per-track errors surfaced (“not found”, etc.)  
- AC-6.2 429 rate limit → “try again later” message and retry guidance

### US-7 Confirmation with Playlist Link
- AC-7.1 Confirmation view with direct link  
- AC-7.2 If Spotify app installed, deep link opens app

### US-8 Revoke Spotify Access
- AC-8.1 Disconnect in profile invalidates tokens and blocks export until reconnect  
- AC-8.2 Spotify account no longer shows Melodex under connected apps

### Guardrail Regression (thin)
- Login happy path (email/Google) and redirect to /rank  
- Ranked songs retrieval contract for export (deezerID, songName, artist, ranking)  
- One smoke journey across /rank → /rerank → /rankings

## 4. Test Items (What we test)
Backend
- POST /api/spotify/export (proposed) or equivalent controller
- Existing endpoints used by export: /api/user-songs/ranked, /api/user-songs/deezer-info
- Export service modules: token handling, chunking, backoff, mapping Deezer to Spotify

Frontend
- ExportModal component (list, remove, default naming, validation)
- Progress/feedback UI
- Confirmation UI with deep link
- Settings view: revoke integration

## 5. Test Strategy Summary
See Test Approach (test/test-approach.md) for full details. In brief:
- Unit (Jest) for export services, token refresh, 429 backoff, selector logic, tiny ELO guard.
- Integration/API (Jest + Supertest) for export endpoints with mocked Spotify SDK.
- Component/UI (React Testing Library) for modal, validation, and states.
- E2E (Cypress) desktop + mobile viewport for happy path and key edges (empty selection, 429, OAuth cancel, song not found).
- Non-functional sanity: performance, security basics, resilience.
- Exploratory, timeboxed around error recovery and mobile UX.

## 6. Test Environment
Local
- Node 18+, MongoDB Atlas test cluster, backend on 8080, frontend on 3001
- External API calls mocked/stubbed by default

Staging (if available)
- One Spotify test account (tokens via CI secrets)
- Minimal live-call runs to validate deep link and playlist creation

Browsers / Devices
- Primary: Chrome (latest), Firefox (latest) desktop
- Mobile emulation: Chrome iPhone 12 viewport in Cypress
- Optional smoke: Playwright WebKit one-path run

## 7. Test Data & Accounts
- Spotify test user: seeded by QA; client ID/secret stored in CI secrets
- Cognito test users: email, Google-federated
- Mongo seed: a mix of genres/subgenres/decades, including duplicates and tracks prone to “not found”
- Naming default checks use the current date in UTC

## 8. Roles & Responsibilities
- QA (Michael DeReus): author tests, execute automation and exploratory, triage bugs, report
- Dev (Michael DeReus/paired AI): implement/export endpoints and UI with TDD where feasible
- Reviewer (Michael DeReus/peer): code review, test review, sign-off

## 9. Schedule & Milestones (high level)
Week 1–2
- Finalize Acceptance Criteria, draft/commit tests skeletons, set up CI secrets
Week 3–5
- Implement + TDD export backend, modal, progress, confirmation
Week 6
- Thin regression guards; Cypress E2E edges; revoke access
Week 7
- Non-functional sanity; flake fixes
Week 8–9
- Stabilization, documentation (reports, videos)
Week 10
- Portfolio packaging, final sign-off

## 10. Entry & Exit Criteria
Entry
- Acceptance Criteria finalized
- Draft API contract for export agreed
- Secrets configured (locally and in CI)

Exit (Feature)
- All Acceptance Criteria covered by automated tests
- New/modified code coverage ≥ 80%
- Cypress happy path green desktop + mobile viewport
- No open Critical/High defects (or explicit, documented deferral)

## 11. Test Design & Traceability
Design techniques
- Equivalence/boundaries (empty selection, minimal set of 1–2, large set)
- State transitions (auth → modal → exporting → done/error)
- Error guessing (401/refresh, 429/backoff, 404 track not found)

Traceability (sample)
- AC-2.2 → E2E: EX-EMPTY-FILTER; UI: MODAL-RENDER-EMPTY
- AC-3.2 → UI: MODAL-REMOVE-REALTIME; E2E: EX-REMOVE-BEFORE-EXPORT
- AC-6.2 → API: RATE-LIMIT-BACKOFF; E2E: EX-429-MESSAGE
- AC-7.2 → E2E: EX-DEEPLINK-APP

A full matrix will be maintained in test/traceability.md and linked from PRs.

## 12. Test Cases Inventory (initial)
IDs are indicative; detailed steps live in component/feature spec files.

Unit (Jest)
- SVC-TOKEN-REFRESH-401: refresh on 401 then retry
- SVC-CHUNK-ADD-TRACKS: batch add in chunks of N
- SVC-BACKOFF-429: exponential backoff and final user-facing message
- SVC-SELECTOR-FILTERS: apply genre/subgenre/decade rules
- SVC-SELECTOR-EMPTY: empty result returns proper status
- GUARD-ELO-MATH: sanity update calc

Integration/API (Jest + Supertest)
- API-EXPORT-VALID: validates payload, calls Spotify client correctly
- API-EXPORT-EMPTY: returns “no songs” response
- API-EXPORT-ERROR-404: per-track not found list returned
- API-EXPORT-ERROR-429: backoff path exercised, message surfaced
- API-RANKED-CONTRACT: ranked endpoint returns required fields

Component/UI (React Testing Library)
- MODAL-RENDER: modal shows list and confirm disabled with 0 items
- MODAL-REMOVE-REALTIME: removing updates count and enables confirm
- MODAL-DEFAULT-NAME: default name uses yyyy-mm-dd format
- UI-PROGRESS-STATES: pending → success/error transitions
- UI-ERROR-MESSAGES: show “try again later” on rate limit

E2E (Cypress)
- EX-HAPPY-PATH-DESKTOP: login → filter → modal → remove → export → confirm link
- EX-MOBILE-VIEWPORT: repeat happy path on mobile viewport
- EX-EMPTY-FILTER: export with 0 matches → user message
- EX-OAUTH-CANCEL: cancel hosted UI → no tokens stored, retry path
- EX-429-MESSAGE: simulated rate-limit → message and recovery path
- EX-TRACK-NOT-FOUND: verify per-track errors, export continues

## 13. Execution Process
- Pull latest main; run unit/integration locally
- For E2E: seed data, run Cypress with tags (e.g., yarn cypress run --env grepTags=@export)
- Record exploratory notes per charter and file defects immediately with repro and logs
- CI: per-PR pipeline runs Jest suites; nightly runs Cypress full suite

## 14. Defect Management
- File issues with template: steps, expected/actual, env, logs, screenshots/video
- Severity/Priority agreed at triage
- Link failing test IDs and PRs
- Retest on fix; close with evidence (test green, video/screenshot if UI)

## 15. Metrics & Reporting
- Coverage (new code ≥ 80%)
- Pass/fail counts by suite (unit/integration/E2E)
- Flake rate (Cypress retries)
- p95 export time (local stubbed vs staging)
- Weekly status note in reports/execution-summary.md

## 16. Risks & Contingencies
- Spotify API instability → retry/backoff, toggle to stub for local/CI
- Token/secret misconfig → verify with smoke before E2E
- Schedule compression → prioritize AC coverage and happy-path E2E first

## 17. Configuration Management
- Tests live beside code (feature branches), PR reviewed
- CI: GitHub Actions; required checks before merge
- Env via .env.local (dev) and GitHub Actions secrets (CI); never commit secrets

## 18. Communication & Approvals
- Progress via PR descriptions and weekly summary
- Sign-off: Michael DeReus

## 19. Revision History
- 1.0 (2025-09-02): Initial plan for Spotify export feature

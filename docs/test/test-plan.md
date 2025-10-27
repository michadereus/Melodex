# Test Plan — Spotify Playlist Export

Version: 1.0  
Date: 2025-09-02  
Owner: QA (Michael DeReus)

## 1. References
- Test Approach: [test-approach](./test-approach.md)  
- Requirements (User Stories): [user-stories](../requirements/user-stories.md)  
- Acceptance Criteria: [acceptance-criteria](../requirements/acceptance-criteria.md)  
- Non-Functional Requirements: [nfrs](../requirements/nfrs.md)  
- Traceability Matrix: [traceability](../test/traceability.md)

---

## 2. Objectives & Scope

### Goal  
Plan and execute testing for the Spotify Playlist Export feature and a thin guardrail regression on core flows, within a ~10-week window (~20 hrs/week).  

### In scope  
- New export flow end-to-end: authenticate, select songs (filtered), review/remove, name/describe, create playlist, error handling, confirmation link, revoke access.  
- Minimal regression on authentication and ranked-songs retrieval contract; one smoke across /rank → /rerank → /rankings.  

### Out of scope  
- Full accessibility audit  
- Broad cross-browser/device matrix beyond specified smoke  
- Legacy features not interacting with export   

---

## 3. Features to Be Tested
> *User stories and acceptance criteria IDs are aligned to requirements docs.*

### US-01 Authenticate with Spotify
- **AC-01.1** Redirect back with valid session (secure httpOnly, SameSite cookies)  
- **AC-01.2** Prompt login when unauthenticated and attempting export or protected route  
- **AC-01.3** Cancel login → no tokens stored  
- **AC-01.4** Tokens stored only in secure cookies; never in web storage  
- **AC-01.5** On 401, single refresh + retry; otherwise logout + reconnect prompt

### US-02 Export ranked songs by current filter (Inline)
- **AC-02.1** Enter inline selection mode; playlist created with only currently filtered songs that remain checked  
- **AC-02.2** Empty filter or zero songs selected → “No songs available for export” and Export button disabled  
- **AC-02.3** Correct Spotify track mapping; unmapped follow error handling  
- **AC-02.4** Only checked, ranked, and not-skipped items included in the export  

### US-03 Review & remove before export (Inline)
- **AC-03.1** Clicking “Export to Spotify” enters inline selection mode where all songs are initially checked and visible (title/artist shown)  
- **AC-03.2** After unchecking one or more songs, only the remaining checked songs are exported  
- **AC-03.3** Exiting selection or changing filters resets the selection; re-entering reflects the latest filters with all visible songs checked by default  

### US-04 Add playlist name/description (Inline)
- **AC-04.1** Name/description entered in inline fields are applied to the created playlist  
- **AC-04.2** Default name “{genre} {subgenre} Playlist” when name is left blank  

### US-05 Real-time feedback during export
- **AC-05.1** Progress/loader while processing  
- **AC-05.2** Success state on completion  
- **AC-05.3** Error state with next steps on failure

### US-06 Error handling
- **AC-06.1** Per-song errors (e.g., not found/region) surfaced with skip/continue/cancel  
- **AC-06.2** 429 shows “Try again later” with guidance  
- **AC-06.3** Retry, skip-all, or cancel options for failures

### US-07 Confirmation with playlist link
- **AC-07.1** Confirmation shows clickable playlist link  
- **AC-07.2** Deep link to app with web fallback

### US-08 Revoke Spotify access
- **AC-08.1** Disconnect invalidates tokens; protected calls blocked  
- **AC-08.2** After revoke, export prompts reconnect  
- **AC-08.3** Spotify connected apps no longer show Melodex (subject to propagation)

### Baseline — Ranking flows & filters
- **AC-F.1** No background fetch until Apply  
- **AC-F.2** Background burst capped ~33  
- **AC-F.3** No clipped UI after apply; remains navigable

### Baseline — Rankings playback stability
- **AC-P.1** Expired preview auto-refreshes; playback resumes  
- **AC-P.2** No broken player states persist across nav/refresh

---

## 4. Test Items (What we test)

### Backend  
- POST /api/spotify/export (proposed) or equivalent controller   
- Existing endpoints used by export: /api/user-songs/ranked, /api/user-songs/deezer-info  
- Export service modules: token handling, chunking, backoff, mapping Deezer to Spotify  

### Frontend
- Inline Selection UI on `/rankings` (enter via Spotify CTA; all visible songs default checked; uncheck to exclude; export disabled at 0 selected; selection resets on exit/filter change)  
- Name/Description inputs inline (default name: “{genre} {subgenre} Playlist” when blank; validation)  
- Progress/feedback UI inline (loading → success/error states during export)  
- Confirmation UI inline with deep link (renders playlist URL; deep-link with web fallback)  
- Settings view: revoke integration (disconnect flow blocks protected calls)  

---

## 5. Test Strategy Summary
> See [Test Approach](../test/test-approach.md) for full details.

- Unit (Jest) for export services, token refresh, 429 backoff, selector logic, tiny ELO guard.  
- Integration/API (Jest + Supertest) for export endpoints with mocked Spotify SDK.  
- Component/UI (React Testing Library) for modal, validation, and states.  
- E2E (Cypress) desktop + mobile viewport for happy path and key edges (empty selection, 429, OAuth cancel, song not found).  
- Non-functional sanity: performance, security basics, resilience.  
- Exploratory, timeboxed around error recovery and mobile UX.  

---

## 6. Test Environment

### Local  
- Node 18+, MongoDB Atlas test cluster, backend on 8080, frontend on 3001
- External API calls mocked/stubbed by default

### Staging  
- One Spotify test account (tokens via CI secrets)
- Minimal live-call runs to validate deep link and playlist creation

### Browsers / Devices  
- Primary: Firefox (latest) desktop (optional: Chrome, Edge)
- Mobile: Firefox Android 15 (latest) (optional: Chrome, Edge)

---

## 7. Test Data & Accounts
- Spotify test user: seeded by QA; client ID/secret stored in CI secrets
- Cognito test users: email, Google-federated
- Mongo seed: a mix of genres/subgenres/decades, including duplicates and tracks prone to “not found”
- Naming default checks use the current date in UTC

---

## 8. Roles & Responsibilities
- QA (Michael DeReus): author tests, execute automation and exploratory, triage bugs, report
- Dev (Michael DeReus/paired AI): implement/export endpoints and UI with TDD where feasible
- Reviewer (Michael DeReus/peer): code review, test review, sign-off

---

## 9. Schedule & Milestones

# 9.a Technical Milestones (implementation gates)

### Milestone A — Mapping service (after AC-03.3, before US-04/05)
- **Why:** US-04/05/06 assert real payloads, errors, and retries; requires correct Spotify mapping first.
- **Deliverables:**
    - **UT-004 — Deezer→Spotify mapping** *(expanded cases: ISRC canonical, variant filtering, duration ±3s tie, normalization, cover-guard, graceful fallback)*.
    - **IT-013 — Mapping integration** *(toggle stub|real; request shape to `/v1/search`; auth; per-batch caching; 429/timeout reasons)*.
    - **Mapping toggle:** `MAPPING_MODE=stub|real` (default **stub** in CI; programmatic override in tests).
- **Unlocks:** US-04 name/description on **real** payloads; foundation for progress/error handling in US-05/06.

### Milestone B — Progress + error contract (start of US-05)
- **Why:** UI progress (idle→loading→success/error) needs a stable backend error envelope.
- **Deliverables:**
    - **UI state machine transitions** for export (idle → loading → success/error; controls disabled during in-flight).
    - **Backend failure shape:** `{ ok:false, code, message, details? }` and success `{ ok:true, playlistId, playlistUrl, kept, skipped, failed? }`; preserve partial outcomes when applicable.
    - **IT-007 — Errors contract** *(forced backend failure paths)*; 
    - **UI-005 — Progress** 
    - **E2E-004 — Errors** *(end-to-end state transitions)*.

### Milestone C — Per-track pipeline + 429 policy (US-06)
- **Why:** ACs require chunking, partial failures, and robust rate-limit handling.
- **Deliverables:**
    - **Export worker:** map → **chunk ≤100** → add → aggregate `{ kept, skipped, failed:[{ id, reason }] }` with stable ordering.
    - **429 policy:** honors **Retry-After**, bounded backoff; marks unprocessed on exhaustion with `RATE_LIMIT`.
    - **UT-007 / IT-011 / E2E-009** — per-track 404/region-blocked surface & continue.
    - **UT-005 / IT-008 / E2E-005** — rate-limit path (backoff, partial, informative UI).

# 9.b Schedule

- **Week 1–2**  
    - Finalize Acceptance Criteria, draft/commit tests skeletons, set up CI secrets  
- **Week 3–5**  
    - Implement + TDD export backend, modal, progress, confirmation  
    - Complete *Milestone A* (mapping service + IT-006) before moving to US-04/05  
- **Week 5-6**
    - Complete *Milestone B* (progress + error contract) before US-06  
- **Week 6-7**  
    - Thin regression guards; Cypress E2E edges; revoke access  
    - Complete *Milestone C* (per-track + 429) before broad E2E edges  
- **Week 8**  
    - Non-functional sanity; flake fixes  
- **Week 9**  
    - Stabilization, documentation (reports, videos)  
- **Week 10**  
    - Portfolio packaging, final sign-off  

---

## 10. Entry & Exit Criteria

### Entry  
- Baseline complete and merged; Auth & Ranking smokes (*SMK-00/01/02/03*) passing on main.  
- Secrets configured for local + CI; mock Spotify client available for tests.  
- Acceptance Criteria finalized  
- Draft API contract for export agreed  
- Secrets configured (locally and in CI)  

### Exit — Spotify Export  
- All US-01…US-08 acceptance criteria covered by automated tests (Unit/Integration/E2E) and passing.  
- No *High* (or above) open defects affecting export (auth, mapping, 429 handling, confirmation link).  
- *E2E-001-Export* desktop + *E2E-008-Mobile* both green in CI.  
- Export API contract documented and linked (request/response, error shapes).  

---

## 11. Test Design & Traceability

### Design techniques

- Equivalence/boundaries (empty selection, minimal set of 1–2, large set)  
- State transitions (auth → modal → exporting → done/error)  
- Error guessing (401/refresh, 429/backoff, 404 track not found)  
- Traceability matrix maintained in [traceability.md](./traceability.md)  

---

## 12. Test Cases Inventory
> *IDs are indicative; detailed steps live in component/feature spec files.*

### Unit (Jest)  

- **UT-001-Auth** — Token exchange success/failure & “no tokens on cancel”  
  _Service logic for handling Spotify OAuth callback outcomes; cancel path leaves storage empty._  

- **UT-002-Auth** — Revoke clears server-side tokens  
  _Revocation call removes tokens/refresh data and returns a clean state._  

- **UT-003-Export** — Filter builder (genre/subgenre/empty)  
  _Selector creates correct filter payload; empty filters handled consistently._  

- **UT-004-Export** — Deezer→Spotify mapping & payload shape  
  _Deterministic mapping rules and final request schema validation._  

- **UT-005-Export** — 429 rate-limit backoff  
  _Backoff/jitter policy applied; surfaces “try again later” on terminal state._  

- **UT-006-Export** — Name/description metadata in request  
  _Playlist name/description included and validated._  

- **UT-007-Export** — Per-item error surfacing (partial failures)  
  _Accumulates per-track errors while continuing the batch._  

- **UT-008-Auth** — Token refresh on 401, then retry  
  _Refreshes access token and retries once; bubbles error if still unauthorized._  

- **UT-009-Export** — Batch add in chunks of N  
  _Chunks requests to Spotify; correct boundaries and final totals._  

- **UT-010-Export** — Selector empty result returns proper status  
  _Signals “no songs available” state to callers._  

- **UT-011-Export** — Selector rules (genre/subgenre/decade)  
  _Correct inclusion/exclusion based on combined rules._  

- **UT-012-Ranking** — ELO/ranking math sanity guard  
  _Quick invariant checks on rank updates (non-regression)._  

### Component / UI (React Testing Library + Vitest)  

- **UI-001-AuthGuard** — Route guard prompts login when unauthenticated  
  _Protected routes redirect or render login CTA._  

- **UI-002-ExportModal** — Remove updates list in real time  
  _Removing an item immediately updates the visible list._  

- **UI-003-ExportModal** — Count/summary reflect removals  
  _Badge/summary updates as items are removed._  

- **UI-004-ExportModal** — Default name “Melodex Playlist [YYYY-MM-DD]”  
  _Default value formatting and editability._  

- **UI-005-Progress** — idle → loading → success/error  
  _State machine renders correct visuals and disables/enables actions appropriately._  

- **UI-006-Errors** — Error list rendering + skip/retry actions  
  _Per-track error display and actionable buttons wired to callbacks._  

- **UI-007-Confirm** — Confirmation link present & correct  
  _Renders returned playlist URL; opens in new tab._  

- **UI-008-DeepLink** — Deep-link formatting & web fallback  
  _Builds app link; falls back to web URL when needed._  

- **UI-009-ExportModal** — Renders with 0 items; confirm disabled  
  _Edge case of empty list handled gracefully._  

- **UI-010-SelectionInline** — Enter inline selection mode; all items checked by default  
  _Clicking the Spotify CTA flips the page into “Select songs for export”; each card shows a checkbox pre-checked._  

- **UI-011-SelectionInline** — Export disabled at 0 selected; hint visible  
  _When all items are unchecked or filter resolves to zero, the confirm/export button is disabled and an inline hint is shown._  

- **UI-012-SelectionSummary** — Count/summary updates as items are toggled  
  _Live badge (e.g., “Selected: N”) stays in sync with checkbox state across the list._  

- **UI-013-SelectionLifecycle** — Re-enter/filters reset selection to defaults  
  _Leaving and re-entering selection mode or changing filters reinitializes selection (all eligible items checked)._  

- **UI-014-NameFields** — Default name visible/editable; description optional  
  _Inline name field shows default formatted value; user edits persist through selection changes; description is optional and saved if present._

### Integration / API (Supertest + Vitest)  

- **IT-001-Auth** — OAuth redirect + callback stores valid session  
  _End-to-end server flow with mocked Spotify returns a session._  

- **IT-002-Auth** — Cancel login → no tokens stored  
  _Callback with error/cancel results in clean storage._  

- **IT-003-Export** — Creates playlist with only filtered tracks  
  _Server constructs payload from filters; posts to Spotify client._  

- **IT-004-Export** — Empty filter → “no songs available”  
  _Server returns appropriate 2xx/4xx contract + message._  

- **IT-005-Export** — Respects removed songs in payload  
  _Server excludes user-removed items prior to POST._  

- **IT-006-Export** — Name/description present in Spotify payload  
  _Asserts request body includes final name/description._  

- **IT-007-Errors** — Forced backend failure → error surfaced to UI contract  
  _Simulated Spotify failure returns API error payload your UI expects._  

- **IT-008-Export** — Inject 429 → backoff + “try again later” contract  
  _Server applies policy; response communicates retry guidance._  

- **IT-009-Confirm** — Response includes playlist URL  
  _Returns the created playlist’s web URL._  

- **IT-010-Auth** — Revoke → subsequent export requires reconnect  
  _After revoke, export endpoint rejects until re-auth._  

- **IT-011-Errors** — Per-track 404 (“not found”) list returned  
  _Aggregates track-level failures in the response._  

- **IT-012-Ranked** — Ranked endpoint contract (deezerID, songName, artist, ranking)  
  _Ensures export depends on a stable, documented schema._  


### End-to-End (Cypress)  

- **E2E-001-Export** — Happy path desktop  
  _Auth → filter → review/remove → name/desc → export → confirm link works._  

- **E2E-002-Export** — Empty filter path  
  _Shows “no songs to export” message and no playlist created._  

- **E2E-003-Auth** — Cancel login → no tokens; blocked until login  
  _Hosted UI cancel behaves correctly._  

- **E2E-004-Errors** — Backend failure → progress shows error state  
  _User-visible error and recovery guidance displayed._  

- **E2E-005-RateLimit** — 429 → “try again later”  
  _Contract message presented; action disabled/enabled appropriately._  

- **E2E-006-DeepLink** — Deep link behavior; fallback to web  
  _Deep link attempted; web fallback verified._  

- **E2E-007-Revoke** — Revoke → export prompts reconnect  
  _From settings, revoke and confirm export is blocked._  

- **E2E-008-Mobile** — Mobile viewport happy path  
  _Responsive flow succeeds on mobile viewport._  

- **E2E-009-Errors** — Per-track “not found” handled; export proceeds  
  _Partial success path with error list and final confirmation._  

---

## 13. Execution Process

- Pull latest main; run unit/integration locally
- For E2E: seed data, run Cypress with tags (e.g., yarn cypress run --env grepTags=@export)
- Record exploratory notes per charter and file defects immediately with repro and logs
- CI: per-PR pipeline runs Jest suites; nightly runs Cypress full suite

---

## 14. Defect Management

- File issues with template: steps, expected/actual, env, logs, screenshots/video
- Severity/Priority agreed at triage
- Link failing test IDs and PRs
- Retest on fix; close with evidence (test green, video/screenshot if UI)

---

## 15. Metrics & Reporting

- Coverage (new code ≥ 80%)
- Pass/fail counts by suite (unit/integration/E2E)
- Flake rate (Cypress retries)
- p95 export time (local stubbed vs staging)
- Weekly status note in reports/execution-summary.md

---

## 16. Risks & Contingencies

- Spotify API instability → retry/backoff, toggle to stub for local/CI
- Token/secret misconfig → verify with smoke before E2E
- Schedule compression → prioritize AC coverage and happy-path E2E first

---

## 17. Configuration Management

- Tests live beside code (feature branches), PR reviewed
- CI: GitHub Actions; required checks before merge
- Env via .env.local (dev) and GitHub Actions secrets (CI)

---


## 18. Communication & Approvals

- Progress via PR descriptions

---
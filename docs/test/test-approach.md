# Test Approach — Spotify Playlist Export (Feature-Focused) + Thin Regression

**Version:** 1.0  
**Date:** 2025-09-02  
**Owner:** Michael DeReus (QA / QA Automation)

---

## 1. Purpose & Context
This Test Approach defines how we will validate the new Spotify Playlist Export feature for Melodex and add a thin, high-value regression layer on existing functionality. The approach is intentionally risk-based and feature-focused to fit a ~10-week timeline (~20 hrs/week). It emphasizes automation (unit, integration, E2E), pragmatic non-functional checks, and clear traceability back to acceptance criteria.

---

## 2. In-Scope

### 2.1 Feature Scope (Primary)
- Spotify OAuth (PKCE/code flow via Cognito-hosted UI) and token refresh.
- Export selection pipeline:
  - Use current filters (genre / subgenre / decade) to build the export set.
  - Review/remove songs before export (modal).
  - Default playlist naming (“Melodex Playlist [YYYY-MM-DD]”) and optional description.
- Playlist creation and add-tracks batching (handles 429 rate-limit with backoff).
- Progress/feedback UI; resilient error messaging (no songs, song not found, API limits).
- Confirmation with deep link; basic mobile behavior.
- Revoke Spotify access (app-level) respected by export flow.

### 2.2 Guardrail Regression (Secondary)
- Authentication happy path (email/Google) and redirect to `/rank`.
- Ranked songs retrieval **contract** (fields needed by export: `deezerID`, `songName`, `artist`, `ranking`).
- One smoke journey across `/rank → /rerank → /rankings`.

---

## 3. Out of Scope (This Iteration)
- Full accessibility audit (retain basic semantic/UI states).
- Comprehensive cross-browser matrix (we’ll do a minimal smoke only).
- Legacy features unrelated to export.
- Full E2E coverage of ELO math (covered by a small targeted unit guard).

---

## 4. Objectives & Quality Goals
- Demonstrate TDD on a realistic web feature (API + UI).
- Achieve **≥80% coverage on new code** (services/components).
- Keep **Cypress E2E happy path green** on desktop and mobile viewport emulation.
- Triage defects with clear repro, logs, expected/actual, and impact.

---

## 5. Risks & Mitigations

| Risk                                  | Impact                               | Mitigation                                                                 |
|---------------------------------------|--------------------------------------|----------------------------------------------------------------------------|
| OAuth/token expiry/refresh issues     | Export failures; user confusion      | Unit tests for refresh; integration tests for 401→refresh→retry; secure storage practices |
| Spotify API 429 rate limits           | Partial/failed exports               | Chunking + exponential backoff; user “try again later” messaging; tests simulating 429    |
| Data mismatches (Deezer ↔ Spotify)    | Missing tracks                       | Clear per-track errors; best-effort export continues; “not found” mapping tests           |
| Flaky previews/third-party instability| Test flake                           | Stub external APIs in tests; one flagged live run on staging                                |
| Mobile UX regressions                 | Poor mobile experience               | Cypress mobile-viewport flow for the export journey                                         |

---

## 6. Test Levels & Types

### 6.1 Unit / Service (Jest)
- `spotifyService`: token acquisition, refresh, retry on 401, 429 backoff, chunking for add-tracks.
- `exportSelector`: filter rules, ranking sort, remove-from-list behavior, empty filters handling.
- **Guardrail:** ELO update math (tiny correctness unit), Deezer→internal model mapper.

### 6.2 API / Integration (Jest + Supertest)
- Export endpoint(s): input validation; mocked Spotify client; error propagation (401/404/409/429); idempotency checks.
- Ranked songs endpoint **contract**: returns fields required by export (shape tests).

### 6.3 Component / UI (React Testing Library)
- Export Modal: rendering, enable/disable confirm, real-time list updates on removal, default name/description behavior.
- Progress states and error banners (empty set, “song not found”, rate-limit).

### 6.4 E2E System (Cypress)
- Desktop & mobile viewport happy path: login → filter → open modal → remove songs → export → confirmation link opens.
- Edge cases:
  - Empty filter → “no songs” message.
  - OAuth cancel → no tokens stored.
  - 429 → “try again later”.
  - “Song not found” messaging.
- Minimal cross-browser/system smoke: one WebKit pass (Playwright or manual) for parity.

### 6.5 Non-Functional (Right-Sized)
- **Performance sanity:** Export p95 < 3s (stubbed) / < 6s (staging) from click to confirmation.
- **Security basics:** no tokens in localStorage/sessionStorage (prefer httpOnly/session on server), no tokens in logs, revoke blocks export.
- **Resilience:** limited retries on 5xx; backoff on 429; informative user feedback.

### 6.6 Exploratory Testing
- Timeboxed charters: “Audio previews & export interaction,” “Error recovery & partial exports,” “Mobile behavior.”
- Capture notes and bugs as artifacts.

---

## 7. Test Design Techniques
- Equivalence partitioning & boundary analysis (empty vs minimal vs large selections; API chunk sizes).
- State transition (login → modal → exporting → completed/failed).
- Error guessing (token expiry, rate limiting, missing tracks).
- Use-case–based E2E scenarios aligned to Acceptance Criteria.

---

## 8. Environments & Data
- **Local dev:** external calls stubbed/mocked.
- **Staging:** single, opt-in live Spotify token session for end-to-end validation.
- **Data:** seeded Mongo fixtures with mixed genres/subgenres, duplicates, and missing previews.
- **Secrets:** managed via env/CI secret store; never committed.

---

## 9. Tooling & Automation
- **Jest** (unit/integration), **React Testing Library**, **Supertest**.
- **Cypress** (E2E + mobile viewports; videos/screenshots).
- **nyc/Istanbul** (coverage), **ESLint/Prettier** (quality gates).
- **GitHub Actions** (CI): per-PR pipeline + nightly E2E; tags to focus runs (`@smoke`, `@export`, `@oauth`, `@ratelimit`).
- (Optional) **Playwright** mini-suite for WebKit smoke.

---

## 10. Entry / Exit Criteria

**Entry**
- Acceptance Criteria finalized.
- Spotify test account/creds available (in CI secrets).
- Export API contract drafted.

**Exit (Feature)**
- All Acceptance Criteria covered by automated tests.
- New/changed code coverage ≥ 80%.
- Cypress happy path green on desktop and mobile viewport.
- Critical/High defects closed or explicitly deferred with sign-off.

---

## 11. Reporting & Governance
- CI badges for build/test/coverage.
- Per-PR summaries (unit/integration counts; Cypress run link).
- Weekly progress note: test debt, flakes, risk changes.
- Traceability: AC → tests matrix (in Test Plan).

---

## 12. Defect Lifecycle
- File in repo Issues using template: steps, expected/actual, env, logs, screenshots/video.
- Severity triage: Critical/High block release; Medium/Low → backlog.
- Link failures to automated test IDs where applicable.

---

## 13. Schedule (High-Level)
- Weeks 1–5: TDD for export service + modal + E2E.
- Week 6: Thin regression guards.
- Week 7: Non-functional sanity.
- Weeks 8–10: Stabilization, docs, portfolio packaging.

---

## 14. Deliverables
- This Test Approach; Test Plan with traceability.
- Automated test suites (Jest/Cypress) and coverage report.
- CI pipeline (per-PR + nightly).
- Exploratory notes, bug reports, and a short demo video.

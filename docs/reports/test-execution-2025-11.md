# Test Execution Summary — November 2025 (draft)

This report captures the latest full run of the Melodex **Spotify Playlist Export** test suites at the time of the **case-study scope freeze**.  

- **Scope freeze commit:** `036b02c`  
- **Execution date:** `2025-11-04`  
- **Runner(s):** Local (Windows 10/11, Node 20) and GitHub Actions (Ubuntu LTS)  
- **Browsers:** Cypress (Chrome, Electron); Manual spot check in Firefox  
- **Repo:** https://github.com/michadereus/Melodex  

---

## 1) Environment & Preconditions  

### Local  
- OS: `Windows 10/11 x64`  
- Node: `v20.x`  
- NPM: `10.x`  
- Firefox: `142+`, Electron: `37.6.0`  
- Network: `Stable broadband`  

### CI  
- Provider: GitHub Actions 
- Image: `ubuntu-latest`  
- Node setup: `actions/setup-node@vX`  
- Artifacts: Cypress videos & screenshots, Vitest coverage HTML  

### Data/Accounts  
- Test user(s): ephemeral Cognito/Google QA accounts  
- Seed: ranked items present for export scenarios  

### Config flags
- `MAPPING_MODE=stub` (CI default; test overrides for Integration)  
- `__E2E_REQUIRE_AUTH__=true`  
- Mobile viewport E2E enabled for `E2E-008-Mobile`  

---

## 2) Commands Used

    # install (monorepo)
    npm -C melodex-back-end ci
    npm -C melodex-front-end ci

    # unit + ui (Vitest)
    npx vitest run unit-ui

    # integration (Vitest)
    npx vitest run integration

    # e2e (Cypress)
    npx cypress run --spec "tests/cypress/e2e/**/*.cy.ts"

> If CI uses a combined script (e.g., `npm run test:all`), paste it here as well.

---

## 3) Results Summary

| Suite | Passed | Failed | Skipped | Duration |
|---|---:|---:|---:|---:|
| **Unit/UI (Vitest)** | `96` | `0` | `0` | `14.56s` |
| **Integration (Vitest)** | `45` | `0` | `0` | `17.38s` |
| **E2E (Cypress)** | `10` | `0` | `0` | `51s` |
| **Total** | `151` | `0` | `0` | `82.94s` |

### Execution Footprint

| Suite | Spec files executed |
|---|---:|
| Unit/UI (Vitest) | `26` |
| Integration (Vitest) | `13` |
| E2E (Cypress) | `9` |

---

## 4) Coverage Summary

> We track coverage at three levels. Overall coverage is **informational**; gates are enforced on **changed files** and on the **feature scope**.

### 4.1 Overall Coverage
> Vitest — informational
> You can find the full coverage HTML [at this link](./coverage-2025-11/index.html). 

| Metric | Percentage | Value |
|---|---|---:|
| **Lines** | `49.44%` | `1568/3171` |
| **Branches** | `74.28%` | `338/455` |
| **Functions** | `61.53%` | `56/91` |
| **Statements** | `49.44%` | `1568/3171` |

### 4.2 Changed-Files Coverage
> Calculated against files modified since baseline `a0dad94`.  
> **Target:** ≥ **80%** Lines & Branches on changed files.

| Metric | Percentage | Value |
|---|---|---:|
| **Lines** | `52.67%` | `1294/2457` |
| **Branches** | `76.22%` | `327/429` |
| **Functions** | `71.64%` | `48/67` |

**Status:** **Not met** (Lines below 80%; Branches met)

### 4.3 Feature-Scope Coverage
> Scope: `melodex-front-end/src/components/Rankings.jsx`, `SongRanker.jsx`, `utils/spotifyExport.js`, `utils/spotifyAuthGuard.js`, `utils/formatDefaultPlaylistName.js`, `utils/deeplink.js`, `contexts/SongContext.jsx`.  
> **Target:** ≥ **75%** Lines & Branches within feature scope.

| Metric | Percentage | Value |
|---|---|---:|
| **Lines** | `60.56%` | `1244/2054` |
| **Branches** | `76.43%` | `321/420` |
| **Functions** | `74.14%` | `43/58` |

**Status:** **Not met** (Lines below 75%; Branches met)

---

## 5) Suite Breakdown (by requirement)

Snapshot of pass/fail by area. Full mapping is in the [Traceability Appendix](./traceability-appendix.md).

### US-01 — Authenticate
- **UT:** `UT-001-Auth`, `UT-008-Auth` — passed
- **IT:** `IT-001-Auth`, `IT-002-Auth`, `IT-010-Auth` — passed
- **E2E:** `E2E-003-Auth` — passed

### US-02 — Export (Inline)
- **UT:** `UT-003`, `UT-004`, `UT-009`, `UT-010`, `UT-011` — passed
- **UI:** `UI-010`, `UI-011` — passed
- **IT:** `IT-003`, `IT-004`, `IT-006`, `IT-012`, `IT-013` — passed
- **E2E:** `E2E-001`, `E2E-002`, `E2E-008` — passed

### US-03 — Review/Remove
- **UI:** `UI-002`, `UI-003`, `UI-010`, `UI-012`, `UI-013` — passed
- **IT:** `IT-005` — passed

### US-04 — Name/Description
- **UT:** `UT-006` — passed
- **UI:** `UI-004`, `UI-014` — passed
- **IT:** `IT-006` — passed

### US-05 — Progress & Errors
- **UI:** `UI-005` — passed
- **IT:** `IT-007` — passed
- **E2E:** `E2E-004` — passed

### US-06 — Error handling
- **UT:** `UT-005`, `UT-007` — passed
- **UI:** `UI-006` — passed
- **IT:** `IT-008`, `IT-011` — passed
- **E2E:** `E2E-005`, `E2E-009` — passed

### US-07 — Confirmation
- **UI:** `UI-007`, `UI-008` — passed
- **IT/E2E:** `IT-009`, `E2E-006` — passed

### US-08 — Revoke access
- **UT:** `UT-002` — passed
- **IT:** `IT-010` — passed
- **E2E:** `E2E-007` — passed

### TS-01/02/03 — Tech milestones
- Covered by UT/IT/E2E above (mapping rules; progress/error envelope; per-track pipeline & 429 policy) — all green.

---

## 6) Evidence & Artifacts

- **Cypress screenshots (on fail):** `tests/cypress/screenshots/`
- **Vitest coverage HTML:** `melodex-front-end/coverage/`
- **Selected logs:** 
    - [Vitest run](https://github.com/michadereus/Melodex/actions/runs/19090079929)
    - [Cypress run](https://github.com/michadereus/Melodex/actions/runs/19197133998)

---

## 7) Notable Defects Closed During Scope

- **[DEF-001](./defects/DEF-001.md) — Verification code error** (Auth): fixed; see PR `#<id>`; validated by `SMK-00/01` and `IT-001`.
- **[DEF-002](./defects/DEF-002.md) — Deezer preview expiry** (Rankings): mitigated; see PR `#<id>`; tracked as risk `R-05` with follow-up in Post-AC Polish.
- **[DEF-003](./defects/DEF-003.md) — Background fetch before Apply**: suppressed; see PR `#<id>`; verified in baseline + exploratory notes.

---

## 8) Risks & Residual Items

- **R-05 — Deezer preview URL expiry**: reduced but not eliminated; Post-AC ticket scheduled for ranked-audio rendering improvement.
- **Mobile perf variance**: no regressions detected; monitor in future runs.
- **Rate-limit policy**: validated under test loads; keep an eye on real-world Retry-After variance.

---

## 9) Quality Gates

- All suites green (UT/UI/IT/E2E) — **met**
- Changed-files coverage ≥ 7% (Lines & Branches) — **not met**  
    - Lines: `52.67% (1294/2457)` — **not met**  
    - Branches: `76.28% (328/430)` — **met**
- Feature-scope coverage ≥ 75% (Lines & Branches) — **not met**  
    - Lines: `60.56% (1244/2054)` — **not met**  
    - Branches: `76.48% (322/421)` — **met**
- No open Sev-1/Sev-2 defects — **met**
- Contract tests (IT-007, IT-013) stable — **met**

### Gate Waiver — Coverage
**Decision:** Proceed with merge despite lines coverage below threshold.

**Rationale:**  
- This test campaign targeted a single feature set (Spotify export flow), not the entire app.  
- High-impact paths are covered via E2E and integration (happy path, 429 policy, per-track errors, revoke).  
- Branch coverage within both scopes are above target (`76.48%`).  

**Compensating controls:**  
- Contract tests (IT-007/IT-013) enforce the API envelope & error policy.  
- Cypress E2E asserts critical UX behaviors before release.  

**Follow-ups:**  
- Convert at least 2–3 UI behaviors in `Rankings.jsx` to unit coverage to raise Lines (deferred).  
- Revisit changed-files coverage if these files are modified again.  

---

## 10) References

- [Vitest coverage HTML](./coverage-2025-11/index.html) 
- [Traceability Appendix](./traceability-appendix.md)
- [Baseline Report](./baseline.md)
- [Case Study](../case-studies/spotify-playlist-export.md)
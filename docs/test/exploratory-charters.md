# Exploratory Testing Charters — Spotify Playlist Export

This page lists focused exploratory charters for the Spotify Playlist Export feature set. Each charter has a clear goal, scope, targeted risks, and a suggested timebox. As you run sessions, add notes under the relevant charter.

## How to use this page
1. Pick a charter from the backlog table and mark it “In Progress”.
2. Timebox the session (e.g., 45–90 minutes).
3. Capture concise notes + evidence (screens, logs, short videos).
4. File bugs in `docs/reports/bugs.md` and link them here.
5. Update Risk Log and Traceability Matrix when appropriate.

---

## Backlog (Overview)

| ID    | Charter Title                          | Primary Goal                                             | Status   | Priority | Suggested Timebox |
|-------|----------------------------------------|----------------------------------------------------------|----------|----------|-------------------|
| CH-01 | OAuth cancellation & token storage     | Prove cancel leaves no tokens and no partial sessions    | Backlog  | High     | 60–90 min         |
| CH-02 | Empty and edge filters                 | Validate empty/edge filters across rank/rerank/rankings  | Backlog  | Medium   | 45–60 min         |
| CH-03 | Deeplink behavior on mobile            | Verify playlist links open correctly (app/web fallback)  | Backlog  | Medium   | 60–90 min         |
| CH-04 | Rate limit handling & recovery         | Confirm 429 handling, backoff, and graceful recovery     | Backlog  | High     | 60–90 min         |

---

## Charter CH-01 — OAuth cancellation & token storage

Intent / Goal  
Show that cancelling Spotify login does not store tokens, cookies, or any residual session state, and that the UI returns to a safe, comprehensible state with a clear path to retry.

Scope  
- Entry points: “Connect Spotify”, export flow that triggers auth.  
- Flows: cancel on provider page, close tab/window mid-flow, back/forward navigation during auth.  
- Storage: Local/session storage, cookies, server-side token cache.  
- UI: Messages, prompts, retry affordances.

Out of Scope  
- Full token refresh lifecycle.

Targeted Risks  
- Ghost/partial tokens; stale auth state; ambiguous UI; PII leakage in storage.

Environments  
- Desktop Chrome (primary), Firefox (secondary).  
- Mobile Safari/Chrome (spot-check).

Heuristics / Oracles  
- Security/privacy expectations, AC-01.3, safe defaults.

Evidence Ideas  
- Local/session storage dumps; devtools HAR; screenshots of cancel states; server logs showing no token issuance.

Status  
Backlog

Suggested Timebox  
60–90 min

### Session #1 — Notes
**Tester:**  
**Date/Timebox:**  
**Environment:** (branch/commit, backend URL, device/browser, network)  
**Tour/Approach:** (e.g., Interrupt tour, FedEx tour)

**Steps/Notes**
- …

**Findings**
- Bugs: (B-### link)  
- Issues/Questions:  
- Opportunities (UX/observability/testability):

**Evidence**
- Screenshot: `[../reports/evidence/CH-01/YYYY-MM-DD/img-01.png]`  
- Video: `[../reports/evidence/CH-01/YYYY-MM-DD/vid-01.mp4]`  
- Logs: `[../reports/evidence/CH-01/YYYY-MM-DD/net-01.har]`

**Coverage & Gaps**
- Covered: (AC IDs, risks)  
- Gaps / Next:

**Follow-ups**
- New/updated charter(s):  
- Test cases to add/expand (unit/integration/E2E):

---

## Charter CH-02 — Empty and edge filters

Intent / Goal  
Demonstrate that empty and edge filters behave predictably in rank, rerank, and rankings views, including the export modal and export action (AC-02.2).

Scope  
- Filters: genre=any, subgenre=any, decade=all decades; rare combos (e.g., K-Pop + 1960s); user with 0 ranked songs.  
- Views: /rank, /rerank, /rankings, and Export modal.  
- Messages: “No songs to export,” disabled CTAs where appropriate.

Out of Scope  
- Detailed Deezer metadata correctness.

Targeted Risks  
- Misleading counts; empty exports; unclear messaging; inconsistency across views.

Environments  
- Desktop Chrome (primary); Mobile Chrome/Safari (sanity checks).

Heuristics / Oracles  
- Clarity, consistency across pages, alignment with AC-02.2.

Evidence Ideas  
- Screenshots of filter states, modals, disabled buttons; short GIFs; console/network logs for 0 results.

Status  
Backlog

Suggested Timebox  
45–60 min

### Session #1 — Notes
**Tester:**  
**Date/Timebox:**  
**Environment:** (branch/commit, backend URL, device/browser)  
**Tour/Approach:** (e.g., Data tour, Configuration tour)

**Steps/Notes**
- …

**Findings**
- Bugs: (B-### link)  
- Issues/Questions:  
- Opportunities:

**Evidence**
- Screenshot: `[../reports/evidence/CH-02/YYYY-MM-DD/img-01.png]`  
- Video: `[../reports/evidence/CH-02/YYYY-MM-DD/vid-01.mp4]`  
- Logs: `[../reports/evidence/CH-02/YYYY-MM-DD/console.log]`

**Coverage & Gaps**
- Covered:  
- Gaps / Next:

**Follow-ups**
- New/updated charter(s):  
- Test cases to add/expand:

---

## Charter CH-03 — Deeplink behavior on mobile

Intent / Goal  
Verify that the playlist confirmation link opens the Spotify app when installed and gracefully falls back to web otherwise (AC-07.2).

Scope  
- Post-export confirmation UI and link.  
- Mobile devices (iOS/Android) with and without Spotify installed.  
- Edge: private/incognito mode, iOS universal link toggles, multiple browsers.

Out of Scope  
- Spotify login internals; playlist content correctness beyond link destination.

Targeted Risks  
- Broken deep links; loops between app/web; confusing fallback; platform inconsistencies.

Environments  
- iOS Safari (with/without app), Android Chrome (with/without app).  
- Desktop sanity check for web fallback.

Heuristics / Oracles  
- Platform UX expectations; link resolution behavior; AC-07.2.

Evidence Ideas  
- Screen recordings; device logs if available; link preview metadata.

Status  
Backlog

Suggested Timebox  
60–90 min

### Session #1 — Notes
**Tester:**  
**Date/Timebox:**  
**Environment:** (device/OS, browser version, app installed? yes/no)  
**Tour/Approach:** (e.g., Mobile app linking tour)

**Steps/Notes**
- …

**Findings**
- Bugs: (B-### link)  
- Issues/Questions:  
- Opportunities:

**Evidence**
- Screenshot/Video: `[../reports/evidence/CH-03/YYYY-MM-DD/mobile-vid-01.mp4]`  
- Logs/Notes: `[../reports/evidence/CH-03/YYYY-MM-DD/notes.md]`

**Coverage & Gaps**
- Covered:  
- Gaps / Next:

**Follow-ups**
- New/updated charter(s):  
- Test cases to add/expand:

---

## Charter CH-04 — Rate limit handling & recovery

Intent / Goal  
Confirm that 429 responses (rate limits) surface a user-friendly message (“try again later”), apply backoff logic, and recover without corruption (AC-06.3).

Scope  
- Export API calls to Spotify; batching behavior; retries/backoff.  
- UI: progress indicator error state (AC-05.3); error list with actions if applicable.

Out of Scope  
- Non-429 server failures.

Targeted Risks  
- Silent failures; repeated hammering; partial/duplicate playlists; stuck progress indicator.

Environments  
- Local/dev with mocked 429s.  
- One live-light pass (if safe) for UX validation only.

Heuristics / Oracles  
- Robustness, user guidance, AC-06.3 / AC-05.3 alignment.

Evidence Ideas  
- Network traces showing 429 and backoff; UI screenshots; Cypress video from mock run.

Status  
Backlog

Suggested Timebox  
60–90 min

### Session #1 — Notes
**Tester:**  
**Date/Timebox:**  
**Environment:** (mock/prod-like, commit SHA, browser)  
**Tour/Approach:** (e.g., Failure tour, Stress tour)

**Steps/Notes**
- …

**Findings**
- Bugs: (B-### link)  
- Issues/Questions:  
- Opportunities:

**Evidence**
- Screenshot: `[../reports/evidence/CH-04/YYYY-MM-DD/img-01.png]`  
- Video: `[../reports/evidence/CH-04/YYYY-MM-DD/vid-01.mp4]`  
- HAR/Logs: `[../reports/evidence/CH-04/YYYY-MM-DD/429.har]`

**Coverage & Gaps**
- Covered:  
- Gaps / Next:

**Follow-ups**
- New/updated charter(s):  
- Test cases to add/expand:

---

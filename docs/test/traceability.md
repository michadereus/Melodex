# Requirements Traceability Matrix

# Traceability Matrix — Spotify Playlist Export (Melodex)

Version: 1.0  
Last Updated: YYYY-MM-DD  
Scope: Maps user stories → acceptance criteria → test cases for the Spotify playlist export feature set.

---

## Legend

- US-xx  = User Story  
- AC-xx.x = Acceptance Criterion for a given story  
- UT-… = Unit tests (Jest / RTL / Supertest)  
- IT-… = Integration/API tests (Supertest)  
- E2E-… = End-to-end tests (Cypress)  
- Status: Planned | In Progress | Passed | Blocked

---

## Matrix (Stories → Criteria → Tests)

| Story ID | User Story (short) | Acceptance Criteria | Unit Tests | Integration Tests | E2E Tests | Evidence | Status |
|---|---|---|---|---|---|---|---|
| US-01 | Authenticate with Spotify | AC-01.1 Redirect back with valid session; AC-01.2 Prompt login if unauthenticated; AC-01.3 No tokens stored on cancel; AC-01.4 Tokens stored securely; AC-01.5 Token refresh working | UT-API-Auth-001 token exchange success/fail; UT-API-Auth-002 refresh flow; UT-FE-Auth-Guard-001 route guard redirects | IT-Auth-001 OAuth redirect ok; IT-Auth-002 cancel flow leaves no tokens; IT-Auth-003 refresh on 401 retries | E2E-001 Happy path (auth included); E2E-003 Cancel login | commit: <sha>; screenshot: auth-cancel.png; cypress: auth-login.mp4 | Planned |
| US-02 | Export ranked songs by current filter | AC-02.1 Creates playlist with filtered songs; AC-02.2 Empty filter shows “no songs to export”; AC-02.3 Spotify track mapping applied; AC-02.4 Only ranked/unskipped included; AC-02.5 Hybrid export path honored | UT-API-Export-001 filter builder; UT-API-Export-002 mapping Deezer→Spotify IDs; UT-API-Export-006 payload shape | IT-Export-001 filtered tracks only; IT-Export-002 empty filter message; IT-Export-008 hybrid path | E2E-001 Export flow; E2E-002 Empty filter | commit: <sha>; postman: Export.postman.json; cypress: export-flow.mp4 | Planned |
| US-03 | Review & remove before export | AC-03.1 Remove items pre-export; AC-03.2 Only remaining songs exported and UI updates real-time; AC-03.3 Select all/clear; AC-03.4 Count summary; AC-03.5 Persist selections through paging | UT-FE-Modal-001 remove updates state; UT-FE-Modal-002 count & summary; UT-FE-Modal-003 bulk actions | IT-Export-003 partial list honored | E2E-004 remove a few, then export | commit: <sha>; gif: modal-removal.gif; cypress: review-remove.mp4 | Planned |
| US-04 | Add playlist name/description | AC-04.1 Name/description reflected in Spotify; AC-04.2 Default “Melodex Playlist [Date]” when blank; AC-04.3 Description templating; AC-04.4 Unicode/emoji safe | UT-FE-Form-001 default name format; UT-API-Export-004 metadata payload; UT-API-Export-007 emoji-safe encode | IT-Export-004 name/description present | E2E-005 custom name + description; E2E-006 default name | commit: <sha>; response: playlist-response.json; screenshot: name-desc.png | Planned |
| US-05 | Real-time feedback during export | AC-05.1 Progress indicator during export; AC-05.2 Completes to success; AC-05.3 Error state on failure | UT-FE-Progress-001 state machine (idle/loading/success/error) | IT-Export-005 simulate failure → error surfaced; IT-Export-009 long-running progress | E2E-007 progress success; E2E-008 progress error | commit: <sha>; screenshots: progress-success.png, progress-error.png; cypress: progress.mp4 | Planned |
| US-06 | Error handling | AC-06.1 Per-song error surfaced; AC-06.2 Batch error list with actions; AC-06.3 429 shows “try again later”; AC-06.4 Retry/skip works | UT-API-Export-003 429 handling/backoff; UT-API-Export-005 per-item errors; UT-FE-Errors-001 render list & actions | IT-Export-006 inject 429 & verify UX; IT-Export-010 per-item fail surfaces | E2E-009 rate-limit path; E2E-010 retry/skip flow | commit: <sha>; logs: error-cases.txt; cypress: rate-limit.mp4; screenshot: retry-message.png | Planned |
| US-07 | Confirmation with playlist link | AC-07.1 Confirmation + clickable link; AC-07.2 Deep link opens Spotify app if installed; AC-07.3 Web fallback if not | UT-FE-Link-001 link shape & target; UT-FE-DeepLink-001 scheme/web fallback | IT-Export-007 link returned in response | E2E-011 follow link; E2E-012 deep-link behavior (desktop fallback) | commit: <sha>; screenshot: confirmation.png; cypress: deeplink.mp4 | Planned |
| US-08 | Revoke Spotify access | AC-08.1 Disconnect invalidates tokens; AC-08.2 Export prompts reconnect; AC-08.3 Removed from Spotify connected apps; AC-08.4 Local state cleared | UT-API-Auth-004 revoke clears server tokens; UT-FE-Auth-002 state reset | IT-Revoke-001 revoke → blocked export | E2E-013 revoke → export blocked; E2E-014 verify removed in Spotify apps | commit: <sha>; screenshot: revoke.png; note: “Spotify > Apps shows Melodex removed” | Planned |

---

### How to Use the Evidence Column
- commit: paste the short or full Git commit SHA that implements or tests the ACs.
- screenshot / gif: drop the file in `docs/reports/evidence/` and paste the relative path.
- cypress video: use the artifact from your CI run (or local `cypress/videos/...`), link or path.
- logs / API response: attach Postman collection exports, curl transcripts, or server logs verifying behavior.

## Acceptance Criteria Reference

- US-01 Authenticate with Spotify  
  - AC-01.1 Given I connect, when I complete Spotify login, then I’m redirected to Melodex with a valid session token.  
  - AC-01.2 Given I’m not authenticated, when I try to export, then I’m prompted to log in first.  
  - AC-01.3 Given I cancel Spotify login, when I return to Melodex, then no tokens are stored.

- US-02 Export ranked songs by current filter  
  - AC-02.1 Given I have ranked songs and a filter, when I export, then a Spotify playlist is created with only the filtered songs.  
  - AC-02.2 Given a filter yields no matches, when I export, then I see “no songs available for export.”

- US-03 Review & remove songs before export  
  - AC-03.1 Given I open the export list, when I remove songs, then the list updates in real time.  
  - AC-03.2 Given removals, when I confirm export, then only remaining songs are included and the UI reflects removals in real time.

- US-04 Add playlist name/description  
  - AC-04.1 Given I enter a name/description, when I export, then Spotify reflects those values.  
  - AC-04.2 Given no name entered, when I export, then the default is “Melodex Playlist [Date].”

- US-05 Real-time feedback during export  
  - AC-05.1 Given export starts, when processing, then a progress indicator is shown.  
  - AC-05.2 Given export completes, then the indicator shows completion.  
  - AC-05.3 Given export fails, then the indicator shows an error state.

- US-06 Error handling  
  - AC-06.1 Given a song can’t be added, then I see an error for that item.  
  - AC-06.2 Given multiple errors, then I see a list with options (skip/retry).  
  - AC-06.3 Given API rate limits (429), then I see “try again later.”

- US-07 Confirmation with playlist link  
  - AC-07.1 Given export succeeds, then I see a confirmation with a clickable link.  
  - AC-07.2 Given the link is clicked and Spotify app is installed, it opens in the app (else web fallback).

- US-08 Revoke Spotify access  
  - AC-08.1 Given I’m connected, when I disconnect, tokens are invalidated.  
  - AC-08.2 Given I revoked, when I try to export, I’m prompted to reconnect.  
  - AC-08.3 Given I revoked, when I check Spotify connected apps, Melodex no longer appears.

---

## Test Case Inventory (IDs Only)

### Unit (Jest / RTL / Supertest)
- UT-API-Auth-001 Token exchange success/failure & “no tokens on cancel”  
- UT-API-Auth-002 Revoke clears server-side tokens  
- UT-API-Export-001 Filter builder (genres/subgenres/empty)  
- UT-API-Export-002 Deezer→Spotify track mapping & payload shape  
- UT-API-Export-003 Rate-limit (429) handling/backoff  
- UT-API-Export-004 Name/description metadata in request  
- UT-API-Export-005 Per-item error surfacing (partial failures)  
- UT-FE-Auth-Guard-001 Route guard prompts login when unauthenticated  
- UT-FE-Modal-001 Remove song updates state list  
- UT-FE-Modal-002 Count/summary reflect removals  
- UT-FE-Form-001 Default name “Melodex Playlist [Date]”  
- UT-FE-Progress-001 Export state machine: idle→loading→success/error  
- UT-FE-Errors-001 Error list rendering + actions (skip/retry)  
- UT-FE-Link-001 Confirmation link present & correct  
- UT-FE-DeepLink-001 Deep-link formatting & web fallback

### Integration (Supertest)
- IT-Auth-001 OAuth redirect + callback stores valid session  
- IT-Auth-002 Cancel login results in no tokens stored  
- IT-Export-001 Creates playlist with only filtered tracks  
- IT-Export-002 Empty filter → “no songs available” response  
- IT-Export-003 Respects removed songs in export payload  
- IT-Export-004 Name/description present in Spotify payload  
- IT-Export-005 Force backend failure → error surfaced to UI contract  
- IT-Export-006 Inject 429 → backoff + “try again later” message contract  
- IT-Export-007 Response includes playlist URL for confirmation  
- IT-Revoke-001 Revoke → subsequent export requires reconnect

### End-to-End (Cypress)
- E2E-001 Happy path: auth → filter → review/remove → name/desc → export → confirm link  
- E2E-002 Empty filter path → “no songs to export”  
- E2E-003 Cancel login → no tokens, still blocked until login  
- E2E-004 Backend failure → progress shows error state  
- E2E-005 429 rate-limit → “try again later”  
- E2E-006 Deep link behavior (assert link; emulate fallback to web)  
- E2E-007 Revoke → export prompts reconnect

---

## Coverage Status (roll-up)

| Layer | Planned | In Progress | Passed | Notes |
|---|---:|---:|---:|---|
| Unit | 15 | 0 | 0 | Target ≥ 80% lines/branches for new code |
| Integration | 10 | 0 | 0 | Critical paths: auth, export, revoke |
| E2E | 7 | 0 | 0 | Run on PR + nightly |

---

## How to Use This Matrix

- When you implement or update a test, change its Status here only after it’s green in CI.  
- Link evidence in commit messages or PR descriptions (e.g., “Passes E2E-001/E2E-003”).  
- Keep this page aligned with:  
  - docs/requirements/acceptance-criteria.md  
  - docs/test/test-plan.md (schedules, environments)  
  - docs/test/traceability.md (this file)


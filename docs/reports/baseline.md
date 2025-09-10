# Baseline: Current State (Pre-Feature)

## 1. Scope & Purpose
This baseline captures the current behavior of Melodex (production) before adding the Spotify Playlist Export feature. It establishes a reference for:  
- What works today (core journeys)  
- Known defects and inconsistencies  
- Performance/stability snapshots  
- A starting point for regression scope once the new feature lands  

## 2. Test Environment
- Site under test: `https://melodx.io`  
- Repository: `https://github.com/michadereus/Melodex`  
- Commit (SHA): `a0dad94`  
- Date init: `<09-09-2025>`  
- Test data accounts:  

| Purpose                  | Email (masked)             | Provider(s)      | Notes |
|---------------------------|----------------------------|------------------|-------|
| Primary QA account        | qa.melodex@gmail.com     | Google (federated via Cognito)   | Short-lived account; loaded with 20 manually ranked songs |
| Fresh QA account          | qa.melodex@gmail.com       | Cognito (email/password) | Un-registered account; verifies signup/login and empty states |

- Network: `Spectrum`, approx `450 up and 11 down`.
- Notes: `No feature flags in use.`

## 3. Devices & Browsers
**Desktop**  
  - Firefox (primary): `Ver: 142.0.1 (64-bit)`  
  - Chrome: `Ver: 139.0.7258.155 (Official Build) (64-bit)`  
**Mobile**  
  - Android Firefox: `OS: Android 15 | Ver: 142.0.1 (Build #2016110943)`  

## 4. Preconditions
- One account can authenticate (Email and/or Google) and reach `/rank`.
- Email and password ready for registration process.
- Seeded data exists to display ranked items (or generate by normal use).
- Network logs (HAR) can be captured in browser devtools.

## 5. Smoke Checklist (happy-path and thin guardrail)

| ID     | Account      | Area                        | Scenario                                              | URL         | Platform | Quick Steps                                                                 | Result                                  | Evidence |
|--------|--------------|-----------------------------|-------------------------------------------------------|-------------|----------|------------------------------------------------------------------------------|:----------------------------------------:|----------|
| SMK-00 | Fresh        | Auth                        | Create new account via Email/Password → lands on Rank | `/register` | Desktop  | Visit `/register`, fill form with unique email+password, verify redirect     | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-00.png` |
| SMK-01 | Fresh        | Auth                        | Login via Email → lands on Rank                       | `/rank`     | Desktop  | Visit `/`, login with Email, verify redirect to `/rank`                      | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-01.png` |
| SMK-02 | Main         | Auth                        | Login via Google → lands on Rank                      | `/rank`     | Desktop  | Login with Google, verify redirect                                           | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-02.png` |
| SMK-03 | Main + Fresh | Rank                        | Pair appears and both previews render controls        | `/rank`     | Desktop  | Load page, confirm two items + play controls visible                         | <span class="pill planned">Not Run</span> | HAR: `../assets/evidence/SMK-03.har` |
| SMK-04 | Main + Fresh | Rank (refresh one)          | Refresh button replaces a single item in pair         | `/rank`     | Desktop  | On a loaded pair, click refresh on one item → confirm it swaps out           | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-04.png` |
| SMK-05 | Main + Fresh | Rank/Re-rank (refresh both) | Refresh-all replaces both items in pair               | `/rank`, `/rerank` | Desktop | On a loaded pair, click refresh-all → confirm both songs change              | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-05.png` |
| SMK-06 | Main + Fresh | Rank → Re-rank              | Navigate to `/rerank` and back without error          | `/rerank`   | Desktop  | From header/nav, open `/rerank`, return to `/rank`                           | <span class="pill planned">Not Run</span> |  |
| SMK-07 | Main + Fresh | Mobile basic                | Load `/rank` and interact with a few pairs            | `/rank`     | Mobile   | Open on mobile, scroll, tap through ~3 pairs to create ranking history       | <span class="pill planned">Not Run</span> | video: `../assets/evidence/SMK-07.mp4` |
| SMK-08 | Main + Fresh | Mobile rankings             | Load `/rankings` and attempt an old preview           | `/rankings` | Mobile   | Scroll to older entries, tap play                                            | <span class="pill planned">Not Run</span> | DEF-001 if fails; HAR |
| SMK-09 | Main + Fresh | Rankings list updates       | Ranking a new pair adds both songs to `/rankings`     | `/rankings` | Desktop  | Rank a pair → navigate to `/rankings` → confirm both songs appear in list    | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-09.png` |
| SMK-10 | Main + Fresh | Rankings (ELO values)       | Ranking a pair updates winner/loser “ranking” values  | `/rankings` | Desktop  | Compare both songs’ ranking values before/after ranking; confirm winner increases and loser decreases | <span class="pill planned">Not Run</span> | screenshot: `../assets/evidence/SMK-10.png` |
| SMK-11 | Main + Fresh | Rankings (load)             | Rankings list loads with N items                      | `/rankings` | Desktop  | Open page, confirm list count displays                                       | <span class="pill planned">Not Run</span> |  |
| SMK-12 | Main + Fresh | Rankings (old previews)     | Older items can play audio (known bug candidate)      | `/rankings` | Desktop  | Scroll to older entries, attempt play                                        | <span class="pill planned">Not Run</span> | DEF-001 if fails; HAR |
| SMK-13 | Main + Fresh | Network health              | Backend API reachable (200)                           | `api/health`| Desktop  | Hit health endpoint, expect 200 with payload                                 | <span class="pill planned">Not Run</span> | response: `../assets/evidence/SMK-13.txt` |
| SMK-14 | Main + Fresh | Logout                      | Logout returns to public state                        | `/`         | Desktop  | Use header/account menu → Logout → return to public                          | <span class="pill planned">Not Run</span> |  |


## 6. Defects Found
Link any issues discovered during the smoke here. If a row above failed, log a defect and reference it.

- **DEF-001** Rankings audio preview fails for old tracks  
  - Link: `./defects/DEF-001.md`  
  - Evidence: HAR `../evidence/DEF-001.har`, screenshot(s)  
  - Status: `<Open/Investigating/Resolved>`

(Add additional defects as `DEF-002`, `DEF-003`, …)

## 7. Quick Performance Snapshot (Coarse)
One pass per primary page on Desktop Firefox with disk cache disabled (Private window).

| Page | Metric | Observation | Evidence |
|---|---|---|---|
| `/rank` | TTFB / Load | `<e.g., ~200ms / ~1.8s>` | HAR: `../assets/evidence/PERF-rank.har` |
| `/rankings` | TTFB / Load | `<e.g., ~220ms / ~1.6s>` | HAR: `../assets/evidence/PERF-rankings.har` |
| API core | Median response | `<e.g., /ranked 180–250ms>` | HAR/log |

(Values are snapshots, not strict SLOs—used to notice regressions later.)

## 8. Targeted Exploratory Session 0 (Baseline Recon)
**Charter:** “Audio previews across old vs. new items; interruptions, retries, and error states on `/rankings` and `/rank`.”

- Timebox: 45–60 minutes  
- Heuristics: SFDPOT, RCRCRC (Risks, Coverage, Results, Claims, Resources, Constraints)  
- Notes doc: `./exploratory/EX-000-baseline.md`  
- If you discover issues → log as DEF-00X and reference here.

*(You’ll add your notes & findings after the session; leave as placeholders now.)*

## 9. Known Issues / Limitations (Pre-Feature)
- Rankings audio preview for older items may fail on web (see DEF-001).
- Mobile deep linking behavior not yet verified across all browsers.
- No Spotify export feature yet (this doc is pre-feature baseline).

## 10. Next Steps
- Close out smoke (all ✓ or logged as defects).  
- Complete Exploratory Session 0 and file any defects.  
- Freeze this baseline by commit SHA and date.  
- Proceed to Week 1 tasks for the Spotify export feature.

---

!!! tip "HAR capture (Chrome)"
    1. Open DevTools → **Network**  
    2. Check **Preserve log**  
    3. Reproduce the action (load/play)  
    4. Right-click in the request list → **Save all as HAR with content**  
    5. Save under `docs/assets/evidence/SMK-XX.har` (and link it above)

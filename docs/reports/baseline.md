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
- Network: `Spectrum`, approx `450 up and 11 down`.
- Test data accounts:  

| Purpose                  | Email (masked)             | Provider(s)      | Notes |
|---------------------------|----------------------------|------------------|-------|
| Main QA account        | qa.melodex@gmail.com     | Google (federated via Cognito)   | Short-lived account; loaded with 40 manually ranked songs |
| Fresh QA account          | qa.melodex@gmail.com       | Cognito (email/password) | Un-registered account; verifies signup/login and empty states |
| Legacy QA account         | mich*****@...     | Cognito (email/password) | Personal account; explores responses to aged data |


## 3. Devices & Browsers
**Desktop**  
  - Firefox: `Ver: 142.0.1 (64-bit)`  
**Mobile**  
  - Android Firefox: `OS: Android 15 | Ver: 142.0.1 (Build #2016110943)`  

## 4. Preconditions
- One account can authenticate (Email and/or Google) and reach `/rank`.
- Email and password ready for registration process.
- Seeded data exists to display ranked items (or generate by normal use).
- Network logs (HAR) can be captured in browser devtools.

## 5. Smoke Checklist 
> Happy-path and thin guardrail

<div class="smoke-table" markdown="1">
| ID     | Account      | Area                        | Scenario                                              | Endpoint         | Platform | Quick Steps                                                                 | Result                                  | Evidence |
|--------|--------------|-----------------------------|-------------------------------------------------------|-------------|----------|------------------------------------------------------------------------------|:----------------------------------------:|----------|
| SMK-00 | Fresh        | Auth                        | Create new account via Email/Password → lands on Rank | `/register` | Desktop  | Visit `/register`, fill form with unique email+password, verify redirect     | <span class="pill pass">Passed</span> | [DEF-001-verify.png](../evidence/DEF-001-verify.png) [DEF-001-verify-rank.png](../evidence/DEF-001-verify-rank.png) [DEF-001-verify-console](../evidence/DEF-001-verify-console.txt) |
| SMK-01 | Fresh        | Auth                        | Login via Email → lands on Rank                       | `/rank`     | Desktop  | Visit `/`, login with Email, verify redirect to `/rank`                      | <span class="pill pass">Passed</span> | [SMK-01-login](./evidence/SMK-01-login.png)  [SMK-01-redirect](./evidence/SMK-01-redirect.png) |
| SMK-02 | Main         | Auth                        | Login via Google → lands on Rank                      | `/rank`     | Desktop  | Login with Google, verify redirect                                           | <span class="pill pass">Passed</span> | [SMK-02-login](./evidence/SMK-02-login.png)  [SMK-02-redirect](./evidence/SMK-02-redirect.png) |
| SMK-03 | Main + Fresh | Rank                        | Pair appears and both previews render controls        | `/rank`     | Desktop  | Load page, confirm two items + play controls visible                         | <span class="pill pass">Passed</span> | [SMK-03-main](./evidence/SMK-03-main.gif)  [SMK-03-fresh](./evidence/SMK-03-fresh.gif) |
| SMK-04 | Main + Fresh | Rank (refresh one)          | Refresh button replaces a single item in pair         | `/rank`     | Desktop  | On a loaded pair, click refresh on one item → confirm it swaps out           | <span class="pill pass">Passed</span> | [SMK-04-fresh](./evidence/SMK-04-fresh.gif) [SMK-04-main](./evidence/SMK-04-main.gif) |
| SMK-05 | Main + Fresh | Rank/Re-rank (refresh both) | Refresh-all replaces both items in pair               | `/rank`, `/rerank` | Desktop | On a loaded pair, click refresh-all → confirm both songs change              | <span class="pill pass">Passed</span> | [SMK-05-main](./evidence/SMK-05-main.gif) [SMK-05-fresh](./evidence/SMK-05-fresh.gif) |
| SMK-06 | Main + Fresh | Profile                     | Profile page loads with correct display name & avatar | `/profile`  | Desktop  | Open `/profile`; verify display name/email present; avatar shows (custom or default fallback); no major console errors | <span class="pill pass">Passed</span> | [SMK-06-main](./evidence/SMK-06-main.png) [SMK-06-fresh](./evidence/SMK-06-fresh.png) |
| SMK-07 | Main + Fresh | Profile (stats)             | Profile stats reflect recent ranking activity         | `/profile`  | Desktop  | Note current stats (e.g., totals/wins/losses); rank one pair; return to `/profile`; confirm totals +2 and winner/loser counts updated | <span class="pill pass">Passed</span> | [SMK-07-fresh](./evidence/SMK-07-fresh.gif)  [SMK-07-main](./evidence/SMK-07-main.gif) |
| SMK-08 | Main + Fresh | Rank → Re-rank              | Navigate to `/rerank` and back without error          | `/rerank`   | Desktop  | From header/nav, open `/rerank`, return to `/rank`                           | <span class="pill pass">Passed</span> | [SMK-08-main](./evidence/SMK-08-main.gif) [SMK-08-fresh](./evidence/SMK-08-fresh.gif) |
| SMK-09 | Main + Fresh | Mobile basic                | Load `/rank` and interact with a few pairs            | `/rank`     | Mobile   | Open on mobile, scroll, tap through ~3 pairs to create ranking history       | <span class="pill pass">Passed</span> | [SMK-09-fresh](./evidence/SMK-09-fresh.gif) [SMK-09-main](./evidence/SMK-09-main.gif) |
| SMK-10 | Main | Mobile rankings             | Load `/rankings` and attempt an old preview           | `/rankings` | Mobile   | Scroll to older entries, tap play                                            | <span class="pill pass">Passed</span> | [SMK-10](./evidence/SMK-10.gif) |
| SMK-11 | Main + Fresh | Rankings list updates       | Ranking a new pair adds both songs to `/rankings`     | `/rankings` | Desktop  | Rank a pair → navigate to `/rankings` → confirm both songs appear in list    | <span class="pill pass">Passed</span> | [SMK-11-main-rank](./evidence/SMK-11-main-rank.png) [SMK-11-main-rankings](./evidence/SMK-11-main-rankings.png) [SMK-11-fresh-rank](./evidence/SMK-11-fresh-rank.png) [SMK-11-fresh-rankings](./evidence/SMK-11-fresh-rankings.png) |
| SMK-12 | Main + Fresh | Rankings (ELO values)       | Re-ranking a pair updates winner/loser “ranking” values  | `/rerank` | Desktop  | Compare both songs’ ranking values before/after ranking; confirm winner increases and loser decreases | <span class="pill pass">Passed</span> | [SMK-12-fresh-1](./evidence/SMK-12-fresh-1.png) [SMK-12-fresh-2](./evidence/SMK-12-fresh-2.png) [SMK-12-main-1](./evidence/SMK-12-main-1.png) [SMK-12-main-2](./evidence/SMK-12-main-2.png) |
| SMK-13 | Main | Rankings (old previews)     | Older items can play audio (known bug candidate)      | `/rankings` | Desktop  | Scroll to older entries, attempt play                                        | <span class="pill pass">Passed</span> | [SMK-13](./evidence/SMK-13.gif) |
| SMK-14 | Main + Fresh | Logout                      | Logout returns to public state                        | `/`         | Desktop  | Use header/account menu → Logout → return to public                          | <span class="pill pass">Passed</span> | [SMK-14](./evidence/SMK-14.png) |
</div>

## 6. Defects Found

**DEF-001**   Verification code error  
  - Link: [DEF-001](./defects/DEF-001.md)  
  - Reference: `SMK-00`  
  - Status: <span class="pill pass">Resolved</span>  

**DEF-002**   Preview link expiry  
  - Link: [DEF-002](./defects/DEF-002.md)  
  - Reference: `EXP-00`  
  - Status: <span class="pill open">Open</span>  

## 7. Coarse Performance Snapshot
One pass per primary page on Desktop Firefox with disk cache disabled (Private window).

| Page | Metric | Observation | Evidence |
|---|---|---|---|
| `/rank` | TTFB / Load | `~190ms` | HAR: [PERF-rank](./evidence/PERF-rank.har)  |
| `/rerank` | TTFB / Load | `~340ms` | HAR: [PERF-rerank](./evidence/PERF-rerank.har)  |
| `/rankings` | TTFB / Load | `~390ms` | HAR: [PERF-rankings](./evidence/PERF-rankings.har)  |
| `/profile` | TTFB / Load | `~155ms` | HAR: [PERF-profile](./evidence/PERF-profile.har) |

## 8. Targeted Exploratory Session 00
**Charter:** Explore reliability of Deezer preview links in `/rankings`, focusing on expired links in older data.  
**Env/Build:** main branch: commit `9c876c9`, melodx.io, Firefox (desktop)  
**Data:**  
- Legacy account with older ranking data  
- Main account with recent rankings  

**Heuristics:**  
- CRUD tour (create/view old vs. new data)  
- Consistency oracle (compare preview behavior across accounts)  

**Notes:**  
- Refreshing /rankings soemtimes displays songs with broken preview links until more songs are ranked or enriched with a refresh.
- Expiry may be tied to Deezer preview link lifespan.  
- Console logs indicate a check for expiration and attempted re-enrichment.  

**Issues:**  
- Expired Deezer preview links break playback for older ranking data and sometimes newer.
- Song enrichment triggers inconsistently.
- Logged as [DEF-002](../reports/defects/DEF-002.md).  

**Learned:**  
- Problem especially reproducible with older ranking data (legacy account).  
- Fresh rankings generate valid, working preview URLs.  
- Ranking / reranking songs on legacy account doesn't trigger enrichment like on newer accounts.

**Risks:**  
- Users returning after inactivity may find rankings unplayable.  
- Could reduce trust if previews silently fail, especially on songs that were recently added.    

**Next:**  
- Investigate how long Deezer preview URLs remain valid.  
- Check when song enrichment is done, should happen on every /rankings load.  
- Assess whether backend should refresh metadata for stale tracks.  



## Next Steps  
- Freeze this baseline by commit SHA and date.  
- Proceed to Week 1 tasks for the Spotify export feature.  
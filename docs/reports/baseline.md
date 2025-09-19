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

| Purpose              | Email (masked)        | Provider(s)                  | Notes |
|----------------------|-----------------------|------------------------------|-------|
| Main QA account      | qa.melodex@gmail.com  | Google (federated via Cognito) | Short-lived account; loaded with 40 manually ranked songs |
| Fresh QA account     | qa.melodex@gmail.com  | Cognito (email/password)     | Un-registered account; verifies signup/login and empty states |
| Legacy QA account    | mich*****@...         | Cognito (email/password)     | Personal account; explores responses to aged data |

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
- References: `SMK-00`, PR: #2  
- Severity: **Major**  
- Priority: **Medium**  
- Status: <span class="pill pass">Resolved</span>  

**DEF-002**   Preview link expiry  
- Link: [DEF-002](./defects/DEF-002.md)  
- References: `EXP-00`, PR: #3  
- Severity: **Major**  
- Priority: **High**  
- Status: <span class="pill pass">Resolved</span>  

**DEF-003**   Songs attempt to load on /rank without filter  
- Link: [DEF-003](./defects/DEF-003.md)  
- References: `EXP-01`, PR: #4  
- Severity: **Minor**  
- Priority: **Medium**  
- Status: <span class="pill pass">Resolved</span>  

## 7. Performance Snapshot (Coarse)
One pass per primary page on Desktop Firefox with disk cache disabled (Private window).

| Page | Metric | Observation | Evidence |
|---|---|---|---|
| `/rank` | TTFB / Load | `<e.g., ~200ms / ~1.8s>` | HAR: `../assets/evidence/PERF-rank.har` |
| `/rerank` | TTFB / Load | `<e.g., ~200ms / ~1.8s>` | HAR: `../assets/evidence/PERF-rerank.har` |
| `/rankings` | TTFB / Load | `<e.g., ~220ms / ~1.6s>` | HAR: `../assets/evidence/PERF-rankings.har` |
| `/profile` | TTFB / Load | `<e.g., ~220ms / ~1.6s>` | HAR: `../assets/evidence/PERF-profile.har` |
| API core | Median response | `<e.g., /ranked 180–250ms>` | HAR/log |

(Values are snapshots, not strict SLOs—used to notice regressions later.)

## 8. Targeted Exploratory Session EXP-00
**Charter:** Explore reliability of Deezer preview links in `/rankings`, focusing on expired links in older data.  

**Env/Build:** `main` branch: commit `9c876c9`, melodx.io, Firefox (desktop)  

**Data:**  
- Legacy account with older ranking data  
- Main account with recent rankings  

**Heuristics:**  
- CRUD tour (create/view old vs. new data)  
- Consistency oracle (compare preview behavior across accounts)  

**Notes:**  
- Refreshing /rankings sometimes displays songs with broken preview links until more songs are ranked or enriched with a refresh.  
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
- Risk: `R-05` (Deezer preview URL expiry breaks audio)  
- Users returning after inactivity may find rankings unplayable.  
- Could reduce trust if previews silently fail, especially on songs that were recently added.  

**Out-of-scope findings:**  
- [DEF-003](../reports/defects/DEF-003.md): Songs attempt to load on /rank without filter  

**Next:**  
- Investigate how long Deezer preview URLs remain valid.  
- Check when song enrichment is done, should happen on every /rankings load.  

## 9. Targeted Exploratory Session EXP-01  
**Charter:** Explore default load behavior of `/rank`, focusing on whether background song fetching starts before user applies filters.  

**Env/Build:** `docs/baseline` branch: commit `6a951eb`, melodx.io, Firefox (desktop)  

**Data:**  
- Main account (Google login)  

**Heuristics:**  
- State-model tour (verify transitions: initial load → filter apply → song fetch)  
- User-intention oracle (system should defer actions until explicit input)  

**Notes:**  
- On first load of `/rank`, background fetch is triggered with default filter values (`pop / all / all`).  
- Multiple cycles of fetch occur before user presses *Apply*.  
- Console shows “Triggering background fetch for more songs” loops, filling buffer with 13–15 songs repeatedly.  
- Occasional timeouts (`DOMException: The operation was aborted`) logged when backend doesn’t respond quickly.  
- Auth state resolves mid-sequence (userContext initially null, then filled).  

**Issues:**  
- Songs are loaded automatically before any filter is chosen.  
- Leads to unnecessary network calls, wasted buffer, and error logs.  
- Behavior contradicts expected UX (user should drive fetch by applying filters).  
- Logged as [DEF-003](../reports/defects/DEF-003.md).  

**Learned:**  
- `SongProvider` is tightly coupled to mount lifecycle, not to filter submission.  
- Default filters act as implicit “apply,” causing fetch loops.  

**Risks:**  
- Backend/API usage inflated by unneeded requests.  
- Users may see irrelevant songs, creating confusion.  
- Timeout errors may impact perceived reliability.  

**Next:**  
- Update `SongProvider` to suppress fetch until filters are applied.  
- Add regression check: `/rank` loads idle with no API calls until user action.  

## 10. Traceability
This section maps requirements → smoke tests → defects, ensuring coverage and visibility into quality.  

| Requirement / Feature               | Smoke Test(s)   | Related Defect(s)   |
|-------------------------------------|-----------------|---------------------|
| User authentication (Email/Password) | SMK-00, SMK-01  | DEF-001             |
| Ranking workflow (/rank)            | SMK-02, SMK-03, SMK-04 | DEF-003   |
| Re-ranking workflow (/rerank)       | SMK-05          | –                   |
| Rankings page (/rankings)           | SMK-06, SMK-07  | DEF-002             |
| Filters (genre, subgenre, decade)   | SMK-08          | DEF-003             |
| Export / Data persistence           | SMK-09          | –                   |

# Traceability Matrix — Spotify Playlist Export (Melodex)
---

## Legend

- **US-xx**  = User Story  
- **AC-xx.x** = Acceptance Criterion for a given story  
- **UT-…** = Unit tests (Jest / RTL / Supertest)  
- **IT-…** = Integration/API tests (Supertest)  
- **E2E-…** = End-to-end tests (Cypress)  
- Status: Planned | In Progress | Passed | Blocked

---

## Matrix
> *This matrix maps User Stories (US) → Acceptance Criteria (AC) → Test Cases (Unit / Integration / E2E), and links Smokes, Defects, and Risks.*  

## Traceability Matrix — Spotify Playlist Export

<div class="trace-table" markdown="1">
| Story ID | User Story | Acceptance Criteria | Unit Tests | UI Tests | Integration Tests | E2E Tests | Smokes | Defects | Risks | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **US-01** | Authenticate with Spotify | AC-01.1 <br>AC-01.2 <br>AC-01.3 <br>AC-01.4 <br>AC-01.5 | UT-001-Auth<br>UT-002-Auth<br>UT-008-Auth | UI-001-AuthGuard | IT-001-Auth<br>IT-002-Auth<br>IT-010-Auth | E2E-001-Export<br>E2E-003-Auth | SMK-00<br>SMK-01 | DEF-001 | R-01<br>R-02 | <span class="pill progress">In Progress</span> |
| **US-02** | Export ranked songs by current filter | AC-02.1 <br>AC-02.2 <br>AC-02.3 <br>AC-02.4 | UT-003-Export<br>UT-004-Export<br>UT-011-Export | UI-009-ExportModal | IT-003-Export<br>IT-004-Export<br>IT-012-Ranked | E2E-001-Export<br>E2E-002-Export | SMK-09 | – | R-04<br>R-14 | <span class="pill planned">Planned</span> |
| **US-03** | Review and remove before export | AC-03.1<br>AC-03.2 <br>AC-03.3 | UI-002-ExportModal<br>UI-003-ExportModal | UI-002-ExportModal<br>UI-003-ExportModal | IT-005-Export | E2E-001-Export | SMK-09 | – | R-15<br>R-20 | <span class="pill planned">Planned</span> |
| **US-04** | Add playlist name and description | AC-04.1 <br>AC-04.2 | UT-006-Export | UI-004-ExportModal | IT-006-Export | E2E-001-Export | SMK-09 | – | R-10<br>R-20 | <span class="pill planned">Planned</span> |
| **US-05** | Real-time feedback during export | AC-05.1 <br>AC-05.2 <br>AC-05.3 | – | UI-005-Progress | IT-007-Errors | E2E-004-Errors<br>E2E-001-Export | SMK-09 | – | R-10 | <span class="pill planned">Planned</span> |
| **US-06** | Error handling | AC-06.1 <br>AC-06.2 <br>AC-06.3 | UT-005-Export<br>UT-007-Export | UI-006-Errors | IT-008-Export<br>IT-011-Errors | E2E-005-RateLimit<br>E2E-009-Errors | SMK-09 | – | R-03<br>R-11 | <span class="pill planned">Planned</span> |
| **US-07** | Confirmation with playlist link | AC-07.1 <br>AC-07.2 | – | UI-007-Confirm<br>UI-008-DeepLink | IT-009-Confirm | E2E-001-Export<br>E2E-006-DeepLink | SMK-09 | – | R-09<br>R-10 | <span class="pill planned">Planned</span> |
| **US-08** | Revoke Spotify access | AC-08.1 <br>AC-08.2 <br>AC-08.3 | UT-002-Auth | – | IT-010-Auth | E2E-007-Revoke | SMK-00 | – | R-02 | <span class="pill planned">Planned</span> |
| **Baseline** | Ranking flows and filters | AC-F.1 <br>AC-F.2<br>AC-F.3 | UT-012-Ranking | – | – | – | SMK-02<br>SMK-03<br>SMK-08 | DEF-003 | R-21 | <span class="pill pass">Passed</span> |
| **Baseline** | Rankings playback stability | AC-P.1 <br>AC-P.2 | – | – | IT-012-Ranked | – | SMK-06<br>SMK-07 | DEF-002 | R-05 | <span class="pill pass">Passed</span> |

</div>

---

## Acceptance Criteria + Test Case Inventory Reference
> *For full inventory with descriptors see test plan.*

### Feature Testing

- **US-01 — Authenticate with Spotify**
    - **AC-01.1** Redirect back with valid session  
        - UT-001-Auth — Cookie flags httpOnly SameSite Secure max-age  
        - IT-001-Auth — Callback success sets cookies plus 302  
    - **AC-01.2** Prompt login if unauthenticated protected action  
        - UI-001-AuthGuard — Export CTA prompts connect when unauthenticated  
        - IT-002-Auth — Auth session connected flag  
        - IT-010-Auth — Revoke blocks export  
        - E2E-003-Auth — Unauth prompt; no export call  
    - **AC-01.3** No tokens stored on cancel  
        - *(Pending)* IT-001d — Callback with error=access_denied → no cookies, redirect to login  
    - **AC-01.4** Tokens stored securely  
        - UT-001-Auth — Cookie flags httpOnly SameSite Secure max-age  
        - IT-001-Auth — Callback success sets cookies plus 302  
    - **AC-01.5** Token refresh works  
        - UT-008-Auth — Refresh on 401  
        - IT-010-Auth — Revoke requires reconnect to export  

- **US-02 — Export ranked songs by current filter**
    - **AC-02.1** Creates playlist with filtered songs  
        - UT-003-Export — Filter builder  
        - UT-004-Export — Deezer to Spotify mapping  
        - IT-003-Export — Creates playlist with only filtered  
        - IT-004-Export — Empty filter message  
        - E2E-001-Export — Happy path including auth  
    - **AC-02.2** Empty filter shows no songs to export  
        - IT-004-Export — Empty filter message  
        - E2E-002-Export — Empty filter path  
    - **AC-02.3** Spotify track mapping applied  
        - UT-004-Export — Deezer to Spotify mapping  
        - UT-011-Export — Selector rules  
        - IT-004-Export — Empty filter message  
        - IT-012-Ranked — Ranked contract deps  
    - **AC-02.4** Only ranked and unskipped included  
        - UT-009-Export — Selector rules  
        - IT-005-Export — Respects removals  
        - IT-006-Export — Name and description in Spotify payload  

- **US-03 — Review and remove before export**
    - **AC-03.1** Remove before export  
        - UI-002-ExportModal — Remove updates list  
        - IT-005-Export — Respects removals  
    - **AC-03.2** Only remaining songs exported  
        - UI-003-ExportModal — Count and summary updates  
        - IT-005-Export — Respects removals  
    - **AC-03.3** Count and summary updates  
        - UI-003-ExportModal — Count and summary updates  
        - IT-005-Export — Respects removals  

- **US-04 — Add playlist name and description**
    - **AC-04.1** Name and description applied  
        - UT-006-Export — Name and description in payload  
        - UI-004-ExportModal — Default name formatting editable  
        - IT-006-Export — Name and description in Spotify payload  
    - **AC-04.2** Default name format  
        - UT-006-Export — Name and description in payload  
        - UI-004-ExportModal — Default name formatting editable  
        - IT-006-Export — Name and description in Spotify payload  

- **US-05 — Real-time feedback during export**
    - **AC-05.1** Progress shown  
        - UI-005-Progress — Idle to loading to success or error  
        - IT-007-Errors — Backend failure returns error contract  
        - E2E-004-Errors — Progress shows error  
    - **AC-05.2** Success state  
        - E2E-001-Export — Happy path including auth  
    - **AC-05.3** Error state  
        - UI-005-Progress — Idle to loading to success or error  
        - IT-007-Errors — Backend failure returns error contract  
        - E2E-004-Errors — Progress shows error  

- **US-06 — Error handling**
    - **AC-06.1** Per-song errors surfaced  
        - UT-005-Export — 429 backoff policy  
        - UI-006-Errors — List plus skip or retry actions  
        - IT-011-Errors — Per-track 404 list  
        - E2E-009-Errors — Partial failures  
    - **AC-06.2** 429 shows try again later  
        - UT-005-Export — 429 backoff policy  
        - IT-008-Export — Inject 429 with retry guidance  
        - E2E-005-RateLimit — 429 path  
    - **AC-06.3** Retry or skip available  
        - UT-007-Export — Per-item error surfacing  
        - UI-006-Errors — List plus skip or retry actions  
        - IT-011-Errors — Per-track 404 list  
        - E2E-009-Errors — Partial failures  

- **US-07 — Confirmation with playlist link**
    - **AC-07.1** Confirmation link present  
        - UI-007-Confirm — Link present and correct  
        - IT-009-Confirm — Response includes playlist URL  
    - **AC-07.2** Deep link with fallback  
        - UI-008-DeepLink — App deep link and web fallback  
        - E2E-006-DeepLink — App versus web fallback  

- **US-08 — Revoke Spotify access**
    - **AC-08.1** Disconnect invalidates tokens  
        - UT-002-Auth — Revoke clears tokens  
        - IT-010-Auth — Revoke requires reconnect to export  
        - E2E-007-Revoke — Blocked until reconnect  
    - **AC-08.2** Export prompts reconnect  
        - UI-001-AuthGuard — Export CTA prompts connect when unauthenticated  
        - IT-010-Auth — Revoke requires reconnect to export  
        - E2E-007-Revoke — Blocked until reconnect  
    - **AC-08.3** Removed from Spotify connected apps  
        - IT-010-Auth — Revoke requires reconnect to export  

### Baseline Testing

- **Baseline — Ranking flows & filters**
    - **AC-F.1** No auto-fetch until Apply  
        - UT-012-Ranking — ELO math sanity  
    - **AC-F.2** Background burst capped about 33  
        - UT-012-Ranking — ELO math sanity  
    - **AC-F.3** Filters do not clip UI  
        - UI-009-ExportModal — Renders zero items confirm disabled  

- **Baseline — Rankings playback stability**
    - **AC-P.1** Older previews refresh  
        - IT-012-Ranked — Ranked endpoint contract  
    - **AC-P.2** No broken players  
        - IT-012-Ranked — Ranked endpoint contract  

---

## Coverage Status (roll-up)

| Layer        | Planned | In Progress | Passed | Notes                                        |
|--------------|-------:|------------:|------:|----------------------------------------------|
| Unit         |    15  |           2 |     1 | Target ≥ 80% lines/branches for new code     |
| UI (component)|     9 |           0 |     1 | RTL + Vitest                                 |
| Integration  |    12  |           0 |     2 | Critical paths: auth, export, revoke         |
| E2E          |     9  |           0 |     0 | Run on PR + nightly                          |

---
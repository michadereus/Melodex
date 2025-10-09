# Traceability Matrix and References
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

## Traceability Matrix

<div class="trace-table" markdown="1">
| Story ID | User Story | Acceptance Criteria | Unit Tests | UI Tests | Integration Tests | E2E Tests | Smokes | Defects | Risks | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **US-01** | Authenticate with Spotify | AC-01.1 <br>AC-01.2 <br>AC-01.3 <br>AC-01.4 <br>AC-01.5 | UT-001-Auth<br>UT-002-Auth<br>UT-008-Auth | UI-001-AuthGuard | IT-001-Auth<br>IT-002-Auth<br>IT-010-Auth<br>IT-001d | E2E-003-Auth | SMK-00<br>SMK-01 | DEF-001 | R-01<br>R-02 | <span class="pill pass">Passed</span> |
| **US-02** | Export ranked songs by current filter | AC-02.1 <br>AC-02.2 <br>AC-02.3 <br>AC-02.4 | UT-003-Export<br>UT-004-Export<br>UT-009-Export<br>UT-010-Export<br>UT-011-Export | UI-010-SelectionInline<br>UI-011-SelectionInline | IT-003-Export<br>IT-004-Export<br>IT-005-Export<br>IT-006-Export<br>IT-012-Ranked | E2E-001-Export<br>E2E-002-Export<br>E2E-008-Mobile | SMK-09 | – | R-04<br>R-14 | <span class="pill progress">In Progress</span> |
| **US-03** | Review and remove before export | AC-03.1<br>AC-03.2 <br>AC-03.3 | – | UI-010-SelectionInline<br>UI-012-SelectionSummary<br>UI-013-SelectionLifecycle<br>UI-002-ExportModal<br>UI-003-ExportModal | IT-005-Export | – | SMK-09 | – | R-15<br>R-20 | <span class="pill planned">Planned</span> |
| **US-04** | Add playlist name and description | AC-04.1 <br>AC-04.2 | UT-006-Export | UI-014-NameFields<br>UI-004-ExportModal | IT-006-Export | – | SMK-09 | – | R-10<br>R-20 | <span class="pill planned">Planned</span> |
| **US-05** | Real-time feedback during export | AC-05.1 <br>AC-05.2 <br>AC-05.3 | – | UI-005-Progress | IT-007-Errors | E2E-001-Export<br>E2E-004-Errors | SMK-09 | – | R-10 | <span class="pill planned">Planned</span> |
| **US-06** | Error handling | AC-06.1 <br>AC-06.2 <br>AC-06.3 | UT-005-Export<br>UT-007-Export | UI-006-Errors | IT-008-Export<br>IT-011-Errors | E2E-005-RateLimit<br>E2E-009-Errors | SMK-09 | – | R-03<br>R-11 | <span class="pill planned">Planned</span> |
| **US-07** | Confirmation with playlist link | AC-07.1 <br>AC-07.2 | – | UI-007-Confirm<br>UI-008-DeepLink | IT-009-Confirm | E2E-001-Export<br>E2E-006-DeepLink | SMK-09 | – | R-09<br>R-10 | <span class="pill planned">Planned</span> |
| **US-08** | Revoke Spotify access | AC-08.1 <br>AC-08.2 <br>AC-08.3 | UT-002-Auth | UI-001-AuthGuard | IT-010-Auth | E2E-007-Revoke | SMK-00 | – | R-02 | <span class="pill planned">Planned</span> |
| **Baseline** | Ranking flows and filters | AC-F.1 <br>AC-F.2<br>AC-F.3 | UT-012-Ranking | UI-009-ExportModal | – | – | SMK-02<br>SMK-03<br>SMK-08 | DEF-003 | R-21 | <span class="pill pass">Passed</span> |
| **Baseline** | Rankings playback stability | AC-P.1 <br>AC-P.2 | – | – | IT-012-Ranked | – | SMK-06<br>SMK-07 | DEF-002 | R-05 | <span class="pill pass">Passed</span> |
</div>

---

## Acceptance Criteria + Test Case Inventory Reference
> *For full inventory with descriptors see [test plan](/test-plan/#12. Test Cases Inventory).*

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

- **US-02 — Export ranked songs by current filter (Inline)**
    - **AC-02.1** Inline selection creates playlist with checked/filtered songs  
        - UT-003-Export — Filter builder  
        - UT-004-Export — Deezer→Spotify mapping  
        - UI-010-SelectionInline — Enter selection mode; all checked by default  
        - IT-003-Export — Creates playlist with only selected (filtered)  
        - E2E-001-Export — Happy path including auth (inline)  
    - **AC-02.2** Empty filter or zero selected disables export  
        - UI-011-SelectionInline — Export disabled at 0 selected; hint visible  
        - IT-004-Export — Empty filter message  
        - E2E-002-Export — Empty selection path (inline)  
    - **AC-02.3** Spotify track mapping applied  
        - UT-004-Export — Deezer→Spotify mapping  
        - IT-012-Ranked — Ranked contract deps  
        - UT-011-Export — Selector rules (genre/subgenre/decade)  
    - **AC-02.4** Only checked, ranked, unskipped included  
        - UT-009-Export — Batch add in chunks of N  
        - UT-010-Export — Selector empty result returns proper status  
        - UT-011-Export — Selector rules (genre/subgenre/decade)  
        - IT-005-Export — Respects unselected/unchecked items  
        - IT-006-Export — Name and description in Spotify payload  
        - E2E-008-Mobile — Mobile viewport happy path  

- **US-03 — Review and remove before export (Inline)**
    - **AC-03.1** Inline uncheck updates list  
        - UI-010-SelectionInline — Checkbox toggles update selection  
        - IT-005-Export — Respects unchecked  
        - UI-002-ExportModal — Remove updates list in real time  
    - **AC-03.2** Only remaining checked songs exported  
        - UI-012-SelectionSummary — Count/summary updates  
        - IT-005-Export — Respects unchecked  
        - UI-003-ExportModal — Count/summary reflect removals  
    - **AC-03.3** Re-enter reflects latest filters; defaults checked  
        - UI-013-SelectionLifecycle — Cancel/filter change resets selection  
        - IT-005-Export — Respects reset state  

- **US-04 — Add playlist name and description (Inline)**
    - **AC-04.1** Name/description applied  
        - UT-006-Export — Name/description in payload  
        - UI-014-NameFields — Default name editable; description optional  
        - IT-006-Export — Name/description in Spotify payload  
        - UI-004-ExportModal — Default name “Melodex Playlist [YYYY-MM-DD]”  
    - **AC-04.2** Default name format  
        - UT-006-Export — Default name formatting  
        - UI-014-NameFields — Default name visible/editable  
        - IT-006-Export — Payload contains final name  

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
        - UT-007-Export — Per-item error surfacing  
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
        - UT-012-Ranking — ELO/ranking math sanity  
    - **AC-F.2** Background burst capped about 33  
        - UT-012-Ranking — ELO/ranking math sanity  
    - **AC-F.3** Filters do not clip UI  
        - UI-009-ExportModal — Renders zero items confirm disabled  

- **Baseline — Rankings playback stability**
    - **AC-P.1** Older previews refresh  
        - IT-012-Ranked — Ranked endpoint contract  
    - **AC-P.2** No broken players  
        - IT-012-Ranked — Ranked endpoint contract  

---

## Coverage Status (roll-up)

| Layer          | Planned | In Progress | Passed | Notes                                                                  |
| -------------- | ------: | ----------: | -----: | ---------------------------------------------------------------------- |
| Unit           |      15 |           0 |      5 | UT-001, UT-008 (auth); UT-003, UT-004 (export); UT-012 (ELO sanity)    |
| UI (component) |       9 |           0 |      2 | UI-001 (AuthGuard); UI-009 (zero items → confirm disabled)             |
| Integration    |      12 |           0 |      5 | IT-001, IT-002, IT-010 (auth); IT-003 (export create); IT-012 (ranked) |
| E2E            |       9 |           0 |      2 | E2E-001 (happy path inline), E2E-003 (unauth redirect)                 |


---
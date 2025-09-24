# Requirements Traceability Matrix

# Traceability Matrix — Spotify Playlist Export (Melodex)
---

## Legend

- US-xx  = User Story  
- AC-xx.x = Acceptance Criterion for a given story  
- UT-… = Unit tests (Jest / RTL / Supertest)  
- IT-… = Integration/API tests (Supertest)  
- E2E-… = End-to-end tests (Cypress)  
- Status: Planned | In Progress | Passed | Blocked

---

## Matrix
> *This matrix maps User Stories (US) → Acceptance Criteria (AC) → Test Cases (Unit / Integration / E2E), and links Smokes, Defects, and Risks.*

<div class="trace-table" markdown="1">
| Story ID | User Story (short) | Acceptance Criteria | Unit Tests | Integration Tests | E2E Tests | Smoke(s) | Defects | Risks | Status |
|---|---|---|---|---|---|---|---|---|---|
| **US-01** | Authenticate with Spotify | **AC-01.1** Redirect back with valid session<br>**AC-01.2** Prompt login if unauthenticated<br>**AC-01.3** No tokens stored on cancel<br>**AC-01.4** Tokens stored securely<br>**AC-01.5** Token refresh works | **UT-001-Auth**<br>**UT-002-Auth**<br>**UT-008-Auth** | **IT-001-Auth**<br>**IT-002-Auth**<br>**IT-010-Auth** | **E2E-001-Export** (auth included)<br>**E2E-003-Auth** (cancel) | **SMK-00** (Login)<br>**SMK-01** (Protected route) | **DEF-001** | **R-01** (Auth/OAuth config)<br>**R-02** (Token refresh) | <span class="pill planned">Planned</span> |
| **US-02** | Export ranked songs by current filter | **AC-02.1** Creates playlist with filtered songs<br>**AC-02.2** Empty filter → “no songs to export”<br>**AC-02.3** Spotify track mapping applied<br>**AC-02.4** Only ranked/unskipped included | **UT-003-Export**<br>**UT-004-Export**<br>**UT-011-Export** | **IT-003-Export**<br>**IT-004-Export**<br>**IT-012-Ranked** | **E2E-001-Export**<br>**E2E-002-Export** | **SMK-09** (Export/data persistence) | – | **R-04** (Mapping quality)<br>**R-14** (Ranking integrity) | <span class="pill planned">Planned</span> |
| **US-03** | Review & remove before export | **AC-03.1** Remove before export<br>**AC-03.2** Only remaining songs exported<br>**AC-03.3** Count/summary updates | **UI-002-ExportModal**<br>**UI-003-ExportModal** | **IT-005-Export** | **E2E-001-Export** | **SMK-09** | – | **R-15** (Duplicates)<br>**R-20** (Export scope clarity) | <span class="pill planned">Planned</span> |
| **US-04** | Add playlist name/description | **AC-04.1** Name/description applied<br>**AC-04.2** Default name format | **UI-004-ExportModal**<br>**UT-006-Export** | **IT-006-Export** | **E2E-001-Export** | **SMK-09** | – | **R-10** (Perception/progress)<br>**R-20** (Scope clarity) | <span class="pill planned">Planned</span> |
| **US-05** | Real-time feedback during export | **AC-05.1** Progress shown<br>**AC-05.2** Success state<br>**AC-05.3** Error state | **UI-005-Progress** | **IT-007-Errors** | **E2E-004-Errors**<br>**E2E-001-Export** | **SMK-09** | – | **R-10** (Perception/progress) | <span class="pill planned">Planned</span> |
| **US-06** | Error handling | **AC-06.1** Per-song errors surfaced<br>**AC-06.2** 429 shows “try again later”<br>**AC-06.3** Retry/skip available | **UT-005-Export**<br>**UT-007-Export**<br>**UI-006-Errors** | **IT-008-Export**<br>**IT-011-Errors** | **E2E-005-RateLimit**<br>**E2E-009-Errors** | **SMK-09** | – | **R-03** (Rate limit 429)<br>**R-11** (Partial failures UX) | <span class="pill planned">Planned</span> |
| **US-07** | Confirmation with playlist link | **AC-07.1** Confirmation link present<br>**AC-07.2** Deep link with fallback | **UI-007-Confirm**<br>**UI-008-DeepLink** | **IT-009-Confirm** | **E2E-001-Export**<br>**E2E-006-DeepLink** | **SMK-09** | – | **R-09** (Mobile deep link)<br>**R-10** (Perception) | <span class="pill planned">Planned</span> |
| **US-08** | Revoke Spotify access | **AC-08.1** Disconnect invalidates tokens<br>**AC-08.2** Export prompts reconnect | **UT-002-Auth** | **IT-010-Auth** | **E2E-007-Revoke** | **SMK-00** (Auth basics) | – | **R-02** (Token refresh/session) | <span class="pill planned">Planned</span> |
| **Baseline** | Ranking flows & filters | **AC-F.1** No auto-fetch until Apply<br>**AC-F.2** Background burst capped ~33<br>**AC-F.3** Filters don’t clip UI | **UT-012-Ranking** | – | – | **SMK-02/03/08** | **DEF-003** | **R-21** (Unbounded fetch → infra costs) | <span class="pill pass">Resolved</span> |
| **Baseline** | Rankings playback stability | **AC-P.1** Older previews refresh<br>**AC-P.2** No broken players | – | **IT-012-Ranked** (contract basis) | – | **SMK-06/07** | **DEF-002** | **R-05** (Preview expiry) | <span class="pill pass">Resolved</span> |

</div>

---

## Acceptance Criteria Reference

- US-01 Authenticate with Spotify  
  - **AC-01.1** Given I connect, when I complete Spotify login, then I’m redirected to Melodex with a valid session token.  
  - **AC-01.2** Given I’m not authenticated, when I try to export, then I’m prompted to log in first.  
  - **AC-01.3** Given I cancel Spotify login, when I return to Melodex, then no tokens are stored.

- US-02 Export ranked songs by current filter  
  - **AC-02.1** Given I have ranked songs and a filter, when I export, then a Spotify playlist is created with only the filtered songs.  
  - **AC-02.2** Given a filter yields no matches, when I export, then I see “no songs available for export.”

- US-03 Review & remove songs before export  
  - **AC-03.1** Given I open the export list, when I remove songs, then the list updates in real time.  
  - **AC-03.2** Given removals, when I confirm export, then only remaining songs are included and the UI reflects removals in real time.

- US-04 Add playlist name/description  
  - **AC-04.1** Given I enter a name/description, when I export, then Spotify reflects those values.  
  - **AC-04.2** Given no name entered, when I export, then the default is “Melodex Playlist [Date].”

- US-05 Real-time feedback during export  
  - **AC-05.1** Given export starts, when processing, then a progress indicator is shown.  
  - **AC-05.2** Given export completes, then the indicator shows completion.  
  - **AC-05.3** Given export fails, then the indicator shows an error state.

- US-06 Error handling  
  - **AC-06.1** Given a song can’t be added, then I see an error for that item.  
  - **AC-06.2** Given multiple errors, then I see a list with options (skip/retry).  
  - **AC-06.3** Given API rate limits (429), then I see “try again later.”

- US-07 Confirmation with playlist link  
  - **AC-07.1** Given export succeeds, then I see a confirmation with a clickable link.  
  - **AC-07.2** Given the link is clicked and Spotify app is installed, it opens in the app (else web fallback).

- US-08 Revoke Spotify access  
  - **AC-08.1** Given I’m connected, when I disconnect, tokens are invalidated.  
  - **AC-08.2** Given I revoked, when I try to export, I’m prompted to reconnect.  
  - **AC-08.3** Given I revoked, when I check Spotify connected apps, Melodex no longer appears.

---

## Test Case Inventory (IDs Only)
> *For full inventory with descriptors see test plan.*

### Unit (Jest)

- UT-001-Auth
- UT-002-Auth
- UT-003-Export
- UT-004-Export
- UT-005-Export
- UT-006-Export
- UT-007-Export
- UT-008-Auth
- UT-009-Export
- UT-010-Export
- UT-011-Export
- UT-012-Ranking

### Component / UI (React Testing Library + Jest)

- UI-001-AuthGuard
- UI-002-ExportModal
- UI-003-ExportModal
- UI-004-ExportModal
- UI-005-Progress
- UI-006-Errors
- UI-007-Confirm
- UI-008-DeepLink
- UI-009-ExportModal

### Integration / API (Supertest + Jest)

- IT-001-Auth
- IT-002-Auth
- IT-003-Export
- IT-004-Export
- IT-005-Export
- IT-006-Export
- IT-007-Errors
- IT-008-Export
- IT-009-Confirm
- IT-010-Auth
- IT-011-Errors
- IT-012-Ranked

### End-to-End (Cypress)

- E2E-001-Export
- E2E-002-Export
- E2E-003-Auth
- E2E-004-Errors
- E2E-005-RateLimit
- E2E-006-DeepLink
- E2E-007-Revoke
- E2E-008-Mobile
- E2E-009-Errors


---

## Coverage Status (roll-up)

| Layer | Planned | In Progress | Passed | Notes |
|---|---:|---:|---:|---|
| Unit | 15 | 0 | 0 | Target ≥ 80% lines/branches for new code |
| Integration | 10 | 0 | 0 | Critical paths: auth, export, revoke |
| E2E | 7 | 0 | 0 | Run on PR + nightly |

---
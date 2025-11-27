# Traceability Appendix

This appendix is the receipts page: it confirms that for each requirement (US/AC), the planned tests exist in the repo at the **scope-freeze** commit.

- **Scope freeze commit:** `2fdb518`  
- **Note on Baseline:** Items labeled “Baseline” in the plan were **manual** checks performed pre-automation. See the separate baseline report for details.

---

## Baseline (Manual, pre-automation)

| Area | Notes | Link |
|---|---|---|
| Ranking flows & filters | Manual baseline prior to automation; see report. | [baseline.md](https://github.com/michadereus/Melodex/blob/main/docs/reports/baseline.md) |
| Rankings playback stability | Manual baseline prior to automation; see report. | [baseline.md](https://github.com/michadereus/Melodex/blob/main/docs/reports/baseline.md) |

---

## US-01 — Authenticate with Spotify

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-01.1** — Redirect back with valid session | UT-001-Auth<br>IT-001-Auth | [ut-001-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-001-auth.spec.ts)<br>[it-001-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-001-auth.spec.ts) |
| **AC-01.2** — Prompt login if unauthenticated <br>protected action | UI-001-AuthGuard<br>IT-002-Auth<br>IT-010-Auth<br>E2E-003-Auth | [ui-001-authguard.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-001-authguard.spec.tsx)<br>[it-002-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-002-auth.spec.ts)<br>[it-010-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-010-auth.spec.ts)<br>[e2e-003-auth.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-003-auth.cy.ts) |
| **AC-01.3** — No tokens stored on cancel | IT-001 (callback error path) | [it-001-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-001-auth.spec.ts) |
| **AC-01.4** — Tokens stored securely | UT-001-Auth<br>IT-001-Auth | [ut-001-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-001-auth.spec.ts)<br>[it-001-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-001-auth.spec.ts) |
| **AC-01.5** — Token refresh works | UT-008-Auth<br>IT-010-Auth | [ut-008-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-008-auth.spec.ts)<br>[it-010-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-010-auth.spec.ts) |

---

## US-02 — Export ranked songs by current filter (Inline)

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-02.1** — Inline selection creates playlist with checked/filtered songs | UT-003-Export<br>UT-004-Export<br>UI-010-SelectionInline<br>IT-003-Export<br>E2E-001-Export | [ut-003-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-003-export.spec.ts)<br>[ut-004-export-mapping.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-004-export-mapping.spec.ts)<br>[ui-010-selection-inline.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-010-selection-inline.spec.tsx)<br>[it-003-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-003-export.spec.ts)<br>[e2e-001-export.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-001-export.cy.ts) |
| **AC-02.2** — Empty filter or zero selected disables export | UI-011-SelectionInline<br>IT-004-Export<br>E2E-002-Export | [ui-011-selection-inline.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-011-selection-inline.spec.tsx)<br>[it-004-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-004-export.spec.ts)<br>[e2e-002-export.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-002-export.cy.ts) |
| **AC-02.3** — Spotify track mapping applied | UT-004-Export<br>IT-013-MappingSearch<br>IT-012-Ranked<br>UT-011-Export | [ut-004-export-mapping.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-004-export-mapping.spec.ts)<br>[it-013-mappingsearch.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-013-mappingsearch.spec.ts)<br>[it-012-ranked.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-012-ranked.spec.ts)<br>[ut-011-export-selector.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-011-export-selector.spec.ts) |
| **AC-02.4** — Only checked, ranked, unskipped included | UT-009-Export<br>UT-010-Export<br>UT-011-Export<br>IT-005-Export<br>IT-006-Export<br>E2E-008-Mobile | [ut-009-export-chunking.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-009-export-chunking.spec.ts)<br>[ut-010-export-selector-empty.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-010-export-selector-empty.spec.ts)<br>[ut-011-export-selector.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-011-export-selector.spec.ts)<br>[it-005-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-005-export.spec.ts)<br>[it-006-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-006-export.spec.ts)<br>[e2e-008-mobile.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-008-mobile.cy.ts) |

---

## US-03 — Review and remove before export (Inline)

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-03.1** — Inline uncheck updates list | UI-010-SelectionInline<br>IT-005-Export<br>UI-002-ExportModal | [ui-010-selection-inline.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-010-selection-inline.spec.tsx)<br>[it-005-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-005-export.spec.ts)<br>[ui-002-exportmodal.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-002-exportmodal.spec.tsx) |
| **AC-03.2** — Only remaining checked songs exported | UI-012-SelectionSummary<br>IT-005-Export<br>UI-003-ExportModal | [ui-012-selection-summary.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-012-selection-summary.spec.tsx)<br>[it-005-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-005-export.spec.ts)<br>[ui-003-exportmodal.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-003-exportmodal.spec.tsx) |
| **AC-03.3** — Re-enter reflects latest filters; defaults checked | UI-013-SelectionLifecycle<br>IT-005-Export | [ui-013-selection-lifecycle.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-013-selection-lifecycle.spec.tsx)<br>[it-005-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-005-export.spec.ts) |

---

## TS-01 — Mapping service toggle & rules (Milestone A)

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-TS2.3.A–F** — toggle/defaults, ISRC canonical,<br>variant tie, structured reasons,<br> per-batch caching, 429/timeout | UT-004-Export<br>IT-013-MappingSearch | [ut-004-export-mapping.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-004-export-mapping.spec.ts)<br>[it-013-mappingsearch.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-013-mappingsearch.spec.ts) |

---

## US-04 — Add playlist name and description (Inline)

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-04.1** — Name/description applied | UT-006-Export<br>UI-014-NameFields<br>IT-006-Export<br>UI-004-ExportModal | [ut-006-export-payload-name.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-006-export-payload-name.spec.ts)<br>[ui-014-namefields.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-014-namefields.spec.tsx)<br>[it-006-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-006-export.spec.ts)<br>[ui-004-exportmodal.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-004-exportmodal.spec.tsx) |
| **AC-04.2** — Default name format | UI-014-NameFields<br>IT-006-Export | [ui-014-namefields.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-014-namefields.spec.tsx)<br>[it-006-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-006-export.spec.ts) |

---

## US-05 — Real-time feedback during export

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-05.1** — Progress shown | UI-005-Progress<br>IT-007-Errors<br>E2E-004-Errors | [ui-005-progress.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-005-progress.spec.tsx)<br>[it-007-errors.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-007-errors.spec.ts)<br>[e2e-004-errors.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-004-errors.cy.ts) |
| **AC-05.2** — Success state | E2E-001-Export | [e2e-001-export.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-001-export.cy.ts) |
| **AC-05.3** — Error state | UI-005-Progress<br>IT-007-Errors<br>E2E-004-Errors | [ui-005-progress.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-005-progress.spec.tsx)<br>[it-007-errors.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-007-errors.spec.ts)<br>[e2e-004-errors.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-004-errors.cy.ts) |

---

## TS-02 — Progress & error contract (Milestone B)

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-TS2.1–2.4** — success/failure envelopes;<br>partial passthrough; UI transitions | UI-005-Progress<br>IT-007-Errors<br>E2E-004-Errors | [ui-005-progress.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-005-progress.spec.tsx)<br>[it-007-errors.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-007-errors.spec.ts)<br>[e2e-004-errors.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-004-errors.cy.ts) |

---

## US-06 — Error handling

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-06.1** — Per-song errors surfaced | UT-007-Export<br>UI-006-Errors<br>IT-011-Errors<br>E2E-009-Errors | [ut-007-export-per-item.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-007-export-per-item.spec.ts)<br>[ui-006-errors.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-006-errors.spec.tsx)<br>[it-011-errors.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-011-errors.spec.ts)<br>[e2e-009-errors.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-009-errors.cy.ts) |
| **AC-06.2** — 429 shows “Try again later” | UT-005-Export<br>IT-008-Export<br>E2E-005-RateLimit | [ut-005-export-429.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-005-export-429.spec.ts)<br>[it-008-export-429.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-008-export-429.spec.ts)<br>[e2e-005-ratelimit.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-005-ratelimit.cy.ts) |
| **AC-06.3** — Retry or skip available | UT-007-Export<br>UI-006-Errors<br>IT-011-Errors<br>E2E-009-Errors | [ut-007-export-per-item.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-007-export-per-item.spec.ts)<br>[ui-006-errors.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-006-errors.spec.tsx)<br>[it-011-errors.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-011-errors.spec.ts)<br>[e2e-009-errors.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-009-errors.cy.ts) |

---

## TS-03 — Per-track pipeline & 429 policy (Milestone C)

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-TS3.1–3.5** — chunking, aggregate results, <br> per-track failures, Retry-After/bounded backoff, <br>determinism | UT-005-Export<br>UT-007-Export<br>IT-008-Export<br>IT-011-Errors<br>E2E-005-RateLimit<br>E2E-009-Errors | [ut-005-export-429.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-005-export-429.spec.ts)<br>[ut-007-export-per-item.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-007-export-per-item.spec.ts)<br>[it-008-export-429.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-008-export-429.spec.ts)<br>[it-011-errors.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-011-errors.spec.ts)<br>[e2e-005-ratelimit.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-005-ratelimit.cy.ts)<br>[e2e-009-errors.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-009-errors.cy.ts) |

---

## US-07 — Confirmation with playlist link

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-07.1** — Confirmation link present | UI-007-Confirm<br>IT-009-Confirm | [ui-007-confirm.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-007-confirm.spec.tsx)<br>[it-009-confirm.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-009-confirm.spec.ts) |
| **AC-07.2** — Deep link with fallback | UI-008-DeepLink<br>E2E-006-DeepLink | [ui-008-deeplink.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-008-deeplink.spec.tsx)<br>[e2e-006-deeplink.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-006-deeplink.cy.ts) |

---

## US-08 — Revoke Spotify access

| AC | Tests (IDs) | File links  |
|---|---|---|
| **AC-08.1** — Disconnect invalidates tokens | UT-002-Auth<br>IT-010-Auth<br>E2E-007-Revoke | [ut-002-auth-revoke.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-002-auth-revoke.spec.ts)<br>[it-010-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-010-auth.spec.ts)<br>[e2e-007-revoke.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-007-revoke.cy.ts) |
| **AC-08.2** — Export prompts reconnect | UI-001-AuthGuard<br>IT-010-Auth<br>E2E-007-Revoke | [ui-001-authguard.spec.tsx](https://github.com/michadereus/Melodex/blob/main/tests/ui/ui-001-authguard.spec.tsx)<br>[it-010-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-010-auth.spec.ts)<br>[e2e-007-revoke.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-007-revoke.cy.ts) |
| **AC-08.3** — Removed from Spotify connected apps | IT-010-Auth | [it-010-auth.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-010-auth.spec.ts) |

---

## TS-04 — Real Spotify integration (Milestone D)

| AC | Tests (IDs) | File links |
|---|---|---|
| **AC-TS4.1–4.4** — real Spotify client for create/add; real-worker integration on `/api/playlist/export`; partial-failure envelope coverage; UI wiring of backend `playlistUrl` | UT-013-SpotifyClient<br>IT-004-Export<br>IT-015-ExportPartialFailures<br>E2E-010-ExportRealUrl | [ut-013-spotify-client.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/unit/ut-013-spotify-client.spec.ts)<br>[it-004-export.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-004-export.spec.ts)<br>[it-015-export-partial-failures.spec.ts](https://github.com/michadereus/Melodex/blob/main/tests/integration/it-015-export-partial-failures.spec.ts)<br>[e2e-010-real-url.cy.ts](https://github.com/michadereus/Melodex/blob/main/tests/cypress/e2e/e2e-010-real-url.cy.ts) |

<!-- path: docs/case-studies/spotify-playlist-export/requirements.md -->

# Requirements and Scope

This page summarizes the requirements that shaped the Spotify Playlist Export feature and shows how they were translated into test scope. The full requirements remain in the dedicated requirements section; this page is a focused view for the case study.

## User stories in scope

The export feature spans multiple user stories, but this case study centers on the following:

- **US-002 — Export ranked songs to Spotify**  
  Export ranked songs that match the current filters and explicit user selections.

- **US-003 — Review and remove songs before export**  
  Let the user see the songs that will be exported and uncheck items they do not want in the playlist.

- **US-004 — Add playlist name and description**  
  Allow the user to customize the playlist name and optional description before creating it on Spotify.

- **US-005 — Confirmation with playlist link**  
  Show a confirmation message with a direct link to the created Spotify playlist.

- **US-006 — Real-time feedback during export**  
  Surface progress and inline feedback (including per-track errors) while the export is running.

- **US-007 — Error handling**  
  Provide clear error messages and sensible recovery paths when the export fails in whole or in part.

Authentication (US-001) is also in scope, but this case study focuses on the parts of OAuth that directly affect export behavior and testability.

## Key acceptance criteria for this feature

The full acceptance criteria are documented in `docs/requirements/acceptance-criteria.md`. For this case study, the most relevant acceptance criteria include:

- **Inline export and selection**
    - `AC-02.1`: Export respects filter state and checked songs.
    - `AC-02.2`: Empty selections are blocked and surfaced to the user.
    - `AC-02.3`: Deezer-backed metadata is used to build stable track identities.

- **Playlist confirmation and link**
    - `AC-05.1`: Export surfaces a success state with playlist link.
    - `AC-05.2`: Link is wired correctly from backend → UI, and opens the playlist in Spotify.

- **Real-time feedback and per-track errors**
    - `AC-06.1`: Per-track failures are shown inline without failing the entire export.
    - `AC-06.2`: Rate-limited scenarios show guidance such as “Try again later”.
    - `AC-06.3`: Retry and Skip flows allow the user to recover from failures without losing progress.

- **OAuth and session behavior**
    - `AC-01.x` set: tokens handled via secure cookies, no storage in web storage, clear reconnect prompts on 401 or revoked sessions.

These criteria directly drove which tests were written and how strict the assertions needed to be. For example, the requirement to show per-track `NOT_FOUND` information later justified integration and E2E tests that asserted structural envelopes instead of just HTTP status codes.

## Non-functional scope

While this feature is mostly functional, a few non-functional requirements mattered for test design:

- Reasonable response times for typical playlist sizes.
- No unbounded retries in the face of repeated 429s.
- Clear UX states, without “stuck” loading indicators.
- No leakage of Spotify auth to the wrong Melodex user.

The non-functional requirements document (`nfrs.md`) sets broader goals, but this campaign focused mainly on correctness, safety, and UX clarity under error conditions.

## Traceability

Cross-references between requirements (`user-stories.md`, `acceptance-criteria.md`), test artifacts (`test-plan.md`, `test-approach.md`, `traceability.md`), defect reports (`docs/reports/defects/*.md`) are maintained in the [traceability matrix](../test/traceability.md). 

The export feature entries in that matrix map:

- User stories and acceptance criteria  
- To specific unit, integration, UI, and E2E tests  
- And to defects raised during this campaign

This case study highlights only the most relevant links rather than reproducing the full matrix.
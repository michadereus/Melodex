<!-- path: docs/case-studies/spotify-playlist-export/defects.md -->

# Defects and Fixes

This page summarizes the most significant defects discovered during the Spotify Playlist Export campaign and how they were resolved. Full defect write-ups are in `docs/reports/defects/*.md`; here, the focus is on impact and lessons.

## DEF-004 — Cross-account Spotify session leak

- **ID:** `DEF-004`
- **Title:** `Spotify session not reset between Melodex users`
- **Location:** `docs/reports/defects/DEF-004.md`

### Summary

Under certain conditions, logging out of Melodex and back in as a different user did not trigger a fresh Spotify OAuth flow. The second user inherited the first user’s Spotify session, and `/auth/session` reported `connected:true` immediately.

### Environment

- **App:** `Melodex` (local dev during feature branch)
- **Commit:** as per defect report
- **Browser:** `Firefox` (desktop)
- **Date:** as per defect report

### Expected vs actual

- Expected:
    - User B should be prompted to connect their own Spotify account.
    - `/auth/session` should reflect the correct authorization state for the currently logged-in Melodex user.
- Actual:
    - No new Spotify prompt for User B.
    - `/auth/session` reported `connected:true` using User A’s tokens.
    - Export actions were performed under User A’s Spotify account.

### Root cause

The root cause was incomplete invalidation of Spotify-related cookies and server-side state when the Melodex user context changed. In some paths, the Spotify session was treated as global rather than per-Melodex-user, and the system relied too heavily on the presence of tokens without confirming their association with the current user.

### Fix

- Tightened coupling between Melodex user identity and Spotify session.
- Ensured that logout and user switching clear relevant tokens and cached Spotify state.
- Strengthened `/auth/session` to return the correct `connected` flag based on the current user context.
- Added integration and E2E coverage to prevent regressions.

### Related tests

- `IT-001`, `IT-002`, `IT-010`
- `E2E-003`, `E2E-007`

These tests collectively assert the expected behavior around OAuth, reconnect requirements, and export blocking after revocation.

---

## DEF-005 — Export consistently fails with 502

- **ID:** `DEF-005`
- **Title:** `502 on /api/playlist/export with no recovery`
- **Location:** `docs/reports/defects/DEF-005.md`

### Summary

Export attempts from `/rankings` consistently failed with a `502` error on `POST /api/playlist/export`. The UI displayed a generic failure message and offered no viable recovery, even when retrying.

### Environment

- **App:** `Melodex` (local dev)
- **Commit:** as per defect report
- **Browser:** `Firefox` (desktop)
- **Date:** `2025-11-10` (execution window)

### Expected vs actual

- Expected:
    - Successful exports should produce a playlist and a usable playlist link.
    - Failures should be accompanied by structured error information and clear guidance.
- Actual:
    - Backend responded with `502` for export requests.
    - UI showed a generic error without helpful context.
    - No structural envelope was available to drive better UX.

### Root cause

The issue was a combination of:

- Upstream failures not being translated into structured error envelopes.
- Incomplete handling of certain error paths in the export worker and controller.
- Lack of alignment between the backend error contract and frontend expectations.

As a result, errors bubbled up as `502` responses without the TS-02/TS-03 envelope, leaving the UI with little information to work with.

### Fix

- Normalized error handling in the export controller and worker to always return a structured envelope, even on failure.
- Ensured that `ok:false` responses provide codes and messages that map cleanly to UI states.
- Updated tests to assert both HTTP status and envelope structure, reducing the chance of regressions.

### Related tests

- `IT-004`, `IT-006`, `IT-008`, `IT-011`
- `E2E-001`, `E2E-004`, `E2E-005`
- UI tests for error panels and messages

These tests now validate that errors produce consistent envelopes and that the UI surfaces useful guidance rather than generic failures.

---

## Other issues and refinements

Several smaller issues and refinements were also discovered and addressed during this campaign:

- Discrepancies between stubbed and real export modes, especially around playlist URLs.
- UI states that could get stuck in a loading or “in-between” state when exports took longer than expected.
- Minor UX consistency issues, such as button enable/disable timing and wording for error messages.

While not all of these warranted a full defect report, they were captured in exploratory notes and resolved in the course of iterative testing.

Collectively, the defect work solidified the export feature’s reliability and ensured that the test suite now guards against similar issues in future changes.

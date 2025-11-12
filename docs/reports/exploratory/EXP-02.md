# EXP-02 - Exporatory Session - Validate end-to-end export 

**Date:** 2025-11-09
**Charter:**  
Validate end-to-end export to Spotify with real mapping: happy path + minimal error variety (NOT_FOUND), confirm playlist create/add, name/description propagation, and auth/session resilience.
**Build/Commit:** `036b02c` (scope-freeze candidate)  
**Environment:** Local (Windows 11), Node 20, Frontend `http://localhost:3001`, Backend `http://localhost:3001`, `MAPPING_MODE=real`, `MARKET=US`  

## Setup
- Logged into Spotify; app authorized with `playlist-modify-private`.
- Seeded ranked items (≥ 8 tracks, mix of common + obscure).
- DevTools Network open; backend `LOG_LEVEL=debug`.

## Notes & Findings
- [ ] Happy path: playlist created `spotify:playlist:...`, 8/8 kept, `ok:true` ✅  
- [ ] Name/Description propagated to playlist ✅  
- [ ] Per-track NOT_FOUND shown inline; export proceeds ✅ / ❌ (detail…)  
- [ ] 401 on export after manual revoke in Connected Apps ❌ (detail…)

### Evidence
- **Backend logs:** `logs/export-real-2025-11-09.txt` (attached in PR #123)
- **Screenshots:** `tests/cypress/screenshots/manual/export-happy.png`

## Bugs / Ideas
- **DEF-00X — Export fails after revoke until full page reload**  
  _Repro:_ revoke in Spotify → back to app → export triggers 401 despite UI showing “connected:true”.  
  _Suspect:_ cookie invalidation/session cache; missing `/auth/session` refresh on export click.  
  _Severity:_ Critical   
  _Links:_ PR #123, commit `abc1234`

- **IDEA — Surface “Reconnect” CTA directly on export error panel**

## Outcome
- **Status:** Completed  
- **Follow-ups:** Fix DEF-00X → re-run charter; update Execution Summary and Quality Gates.

# EXP-02 – Exploratory Session – End-to-End Export (Real Mapping)

**Date:** `2025-11-09`  
**Build/Commit:** *036b02c* 
**Environment:** Local (Windows 11), Node 20, Frontend `http://localhost:3001`, Backend `http://localhost:3001`, `MAPPING_MODE=real`, `MARKET=US`  

**Charter:**  
Validate end-to-end export to Spotify using the **real mapping pipeline**. Confirm that happy-path export works, that per-track `NOT_FOUND` is surfaced correctly, that name/description propagate to the playlist, and that the auth/session flow remains stable across login, consent, and revoke scenarios.

## Setup  
- Logged into Spotify; app authorized with `playlist-modify-private`.  
- Seeded ranked items (≥ 8 tracks with genre variety).  
- DevTools Network open; backend running with `LOG_LEVEL=debug`.  
- Cleared local storage and export-related state between runs.

## Heuristics  
- **Data flow tour:** Deezer → mapping → chunking → playlist create → add tracks.  
- **Consistency oracle:** Verify UI matches backend envelopes (`ok`, `kept`, `skipped`, `failed`).  
- **Auth transitions:** login → consent → callback → `/auth/session` stability → revoke.  

## Notes & Findings  
- Happy path playlist creation succeeded (`spotify:playlist:...`), **8/8** kept, `ok:true`.  
- Playlist name and description matched inline inputs.  
- **Per-track NOT_FOUND** surfaced correctly; export proceeded with remaining tracks.  
- After manually removing the app from Spotify Connected Apps, the next export attempt returned **401**, but the UI still showed `connected:true` until a full reload.  
- Returning from OAuth consent dropped back into `/rankings` but did not reopen Export automatically. Required manual click to resume.  

### Evidence  
- Backend logs: `logs/export-real-2025-11-09.txt`  
- Screenshots: `tests/cypress/screenshots/manual/export-happy.png`  
- Network traces showing `/auth/callback` → `/auth/session` → dropped export intent.  
- Screenshots: [DEF-005-export](DEF-005-export.png), [DEF-005-export-unexpected-response](DEF-005-export-unexpected-response.png) 
    - Network: [DEF-005-session-200](DEF-005-session-200.png)

## Bugs  
- **DEF-004 — Post-Spotify consent returns to /rankings without auto-opening Export**  
  _Repro:_ Start export → Spotify login/consent → return to app → Export UI does not reopen automatically.  
  _Impact:_ Requires an additional click; risks losing selection and description context.  
  _Severity:_ Major  
  _Status:_ Resolved  
  _Report:_ [DEF-004](../defects/DEF-004.md)
  _PR:_ *#33* - [fix: DEF-004](https://github.com/michadereus/Melodex/pull/33)  

- **DEF-005 — Export consistently fails with 502 on /api/playlist/export**  
  _Repro:_ Real mapping invoked mixed stub/real paths, causing invalid IDs (`spotify:track:pl_stub`) to reach Spotify; backend collapsed these into 502.  
  _Impact:_ Playlist export failed for all test cases.  
  _Severity:_ Blocker  
  _Status:_ Resolved  
  _Report:_ [DEF-005](../defects/DEF-005.md)
  _PR:_ *#32* - [fix: DEF-004](https://github.com/michadereus/Melodex/pull/32)  

## Learned  
- Auth/session state can desynchronize if callback intent (`export=1`) is not persisted.  
- Real mapping produces correct track sets but requires stable fallback logic for unmappable/variant items.  
- Export flow depends heavily on durable state during OAuth round-trips.  
- Connected Apps revocation does not naturally propagate; requires explicit refresh and UI update.  

## Risks  
- OAuth round-trip losing context (filters, selection, export intent).  
- Mixed stub/real branches causing invalid Spotify IDs and misleading 502s.  
- Token refresh failures surfacing late, leading to user confusion.  
- Potential for repeated consent loops if `/auth/session` caching is not handled carefully.

## Outcome  
- **Status:** Completed  
- **Follow-ups:**  
  - Implement durable export intent and auto-open logic (addressed in DEF-004).  
  - Clean separation of stub vs real export paths (addressed in DEF-005).  
  - Add regression coverage for:  
    - Export resume after OAuth  
    - Export stability after external revoke  
  - Re-run charter after fixes; update Execution Summary and Quality Gates.  

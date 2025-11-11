# EXP-01 - Exploratory Session - Background Fetch Before Filter

**Date:** 2025-09-18  
**Build/Commit:** `6a951eb` (`docs/baseline` branch)  
**Environment:** melodx.io (Prod), Firefox (desktop)  
**Charter:**  
Investigate default load behavior of `/rank` to confirm whether background song fetching starts before user applies filters.

## Setup
- Account: Main (Google login)  
- Observed initial page load and network activity before filter submission.  
- Console open to track repeated API calls.

## Heuristics
- State-model tour — verify state transitions (`idle → filter apply → song fetch`)  
- User-intention oracle — confirm system waits for explicit input

## Notes & Findings
- `/rank` triggers background fetch immediately using default filter values (`pop / all / all`).  
- Multiple fetch cycles occur before *Apply* is pressed.  
- Console repeatedly logs: “Triggering background fetch for more songs.”  
- ~13–15 songs loaded per cycle; occasional `DOMException: The operation was aborted`.  
- `userContext` resolves mid-sequence, causing further fetches.

### Evidence
- Screenshots: `reports/screenshots/exp01-autofetch.png`  
- Logs: `logs/exp01-autofetch.txt`

## Bugs / Issues
- **DEF-003 — Background fetch before filter apply**  
  _Impact:_ Unnecessary network traffic and irrelevant song buffer.  
  _Expected:_ Idle until user applies filters.  
  _Severity:_ Major  
  _Status:_ Resolved  
  _Report:_ [DEF-003](../defects/DEF-003.md)
  _PR:_ `#4` [fix: DEF-003](https://github.com/michadereus/Melodex/pull/4)

## Learned
- `SongProvider` tied to mount lifecycle, not filter submission.  
- Default filters act as implicit “Apply,” creating fetch loops.

## Risks
- Excess backend/API load from redundant requests.  
- Users may see irrelevant content, confusing UX.  
- Timeouts and console errors may reduce trust.

## Outcome
- **Status:** Completed  
- **Follow-ups:**  
  - Gate `SongProvider` fetch until filters are explicitly applied.  
  - Add regression: `/rank` remains idle until user triggers fetch.

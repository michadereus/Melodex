# EXP-00 - Exploratory Session - Deezer Preview Expiry 

**Date:** `2025-09-14`  
**Build/Commit:** `9c876c9` (main branch)  
**Environment:** `melodx.io` (Prod), Firefox (desktop) 

**Charter:**  
Explore reliability of Deezer preview links in `/rankings`, focusing on expired links in older data.

## Setup
- Accounts:  
  - Legacy account with older ranking data  
  - Main account with recent rankings  
- Browser console and network tabs monitored for media requests and enrichment calls.

## Heuristics
- CRUD tour — compare create/view behavior for old vs. new data  
- Consistency oracle — cross-account preview reliability

## Notes & Findings
- Some `/rankings` items show broken preview links until new songs are ranked or enriched.  
- Expiry appears tied to Deezer’s preview URL lifespan.  
- Console logs show attempted enrichment retries but inconsistent triggers.

### Evidence
- Screenshots: `reports/screenshots/exp00-preview-expiry.png`  
- Logs: `logs/exp00-preview.txt`

## Bugs / Issues
- **DEF-002 — Expired Deezer preview links**  
  _Impact:_ Playback fails for older data and sometimes new items.  
  _Root cause:_ Preview URLs expire; enrichment not always re-triggered.  
  _Severity:_ Critical  
  _Status:_ Resolved  
  _Report:_ [DEF-002](../defects/DEF-002.md)  
  _PR:_ *#3* - [fix: DEF-002](https://github.com/michadereus/Melodex/pull/3)  

### Related Finding
- **DEF-003 — Songs load on `/rank` without filter** (out-of-scope)

## Learned
- Expiry most reproducible with legacy data.  
- Freshly ranked songs always get valid previews.  
- Enrichment triggers inconsistently across accounts.

## Risks
- **R-05 — Deezer preview URL expiry breaks audio**  
  Users returning after inactivity may lose playback.  
  Could undermine perceived reliability.

## Outcome
- **Status:** Completed  
- **Follow-ups:**  
  - Investigate Deezer preview TTL.  
  - Ensure enrichment executes every `/rankings` load.

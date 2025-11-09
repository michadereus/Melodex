# Test Execution Summary — September 2025

## Baseline Regression 
- **Execution date:** `2025-09-18`  
- **Scope freeze commit:** `fce6f79`  
- **Repo:** https://github.com/michadereus/Melodex 
- **Scope:** Authentication, Ranking (/rank), Re-Ranking (/rerank), Rankings (/rankings), Filters  

---

### Results Overview

| Metric                   | Count |
|---------------------------|-------|
| Total Smoke Tests Planned | 10    |
| Executed                  | 10    |
| Passed                    | 10    |
| Failed                    | 0     |
| Blocked/Skipped           | 0     |

---

### Defects Raised

| ID      | Title                                            | Status    |
|---------|--------------------------------------------------|-----------|
| DEF-001 | Rankings audio preview fails for old tracks      | Resolved  |
| DEF-002 | Expired Deezer preview links in `/rankings`      | Resolved  |
| DEF-003 | Songs attempt to load on `/rank` without filter  | Resolved  |

---

### Key Notes
- **Ranking flows stable** for both new and legacy accounts post-fix.  
- **Deezer preview expiry** required backend rehydration changes (DEF-002, fixed).  
- **Filter handling** corrected; medium viewport now consistent (DEF-003, fixed).  

**Release Readiness:**  
All high-priority defects resolved; app stable for mainline use.  

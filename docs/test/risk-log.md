# Risk Log — Melodex (Spotify Playlist Export Feature Slice)

This is the initial risk register for the Spotify playlist export feature and adjacent areas it touches.  
Scales: Likelihood (L) and Impact (I) use Low / Medium / High. Exposure is a simple score: Low=1, Med=2, High=3 → L×I.

## Legend
- Likelihood: Low(1), Medium(2), High(3)
- Impact: Low(1), Medium(2), High(3)
- Exposure: L×I (1–9)
- Status: Open / Mitigating / Accepted / Closed

---

| ID | Risk | Category | L | I | Exposure | Triggers / Indicators | Mitigation / Prevention | Contingency / Response | Owner | Status |
|---|---|---|---|---|---:|---|---|---|---|---|
| R-01 | Spotify OAuth misconfiguration (redirect/callback mismatch) blocks auth | Integration / Config | M | H | 6 | OAuth errors, redirect loop, 400/401 on callback | Keep callback URLs in Cognito & Spotify aligned; env-driven config; add CI check for env consistency | Roll back to last known good config; hotfix callback URLs; manual token testing | Dev | Open |
| R-02 | Token refresh failures (silent 401s) break export mid-flow | Auth / Session | M | H | 6 | 401 during export; partial playlists | Centralized token manager; auto refresh + single retry; Jest for refresh path | On retry fail, surface “reconnect” CTA; log incident; guide user to re-auth | Dev | Open |
| R-03 | Spotify API rate limits (429) during batch add | Third-party Limits | M | H | 6 | 429 responses; delayed export | Backoff + jitter; configurable batch size; preflight estimate | Queue + resume; show “Try again later”; persist progress | Dev | Open |
| R-04 | Deezer↔Spotify track mismatch (wrong tracks added) | Data Quality | M | M | 4 | Unusual playlist contents; user reports | Deterministic mapping; fuzzy match thresholds; add artist+title normalization tests | Provide review modal (remove items); allow re-run with stricter matching | QA | Mitigating |
| R-05 | Deezer preview URL expiry breaks audio in ranking/review | UX / Stability | M | M | 4 | Audio errors; silent players | “Is preview valid” check; refresh metadata endpoint; fallback label | Hide player on error; lazy-refresh preview on demand | Dev | Mitigating |
| R-06 | Sensitive keys or tokens leaked in repo / logs | Security | L | H | 3 | Secrets appear in commits or build logs | `.gitignore` for env; GitHub secrets; secret scanning; no tokens in client logs | Revoke & rotate keys; invalidate sessions; post-mortem | Dev | Open |
| R-07 | MongoDB outage or slow queries block ranking/export | Reliability | L | H | 3 | Timeouts; 5xx from backend | Connection pooling; timeouts; indexes on `userID, deezerID`; health checks | Serve graceful error; circuit break; retry later | DevOps | Open |
| R-08 | CORS misconfig blocks frontend→backend requests | Config | M | M | 4 | CORS errors in console | Keep allowed origins env-based; add preflight tests in CI | Temporarily widen allowlist while hotfixing | Dev | Open |
| R-09 | Mobile browser quirks (deep link, modal scroll) hurt UX | Cross-Device UX | M | M | 4 | Playlist link opens wrong target; scroll lock issues | Cypress mobile view; deep-link scheme + web fallback; focus trapping in modal | Provide “Open in Spotify Web” fallback; close modal on failure | QA | Open |
| R-10 | Long export runs with poor feedback feel “frozen” | UX / Perception | M | M | 4 | User cancels; multiple clicks | Progress states; optimistic UI; disable duplicate submits; toasts | Resume support; idempotent requests; friendly failure message | UX | Mitigating |
| R-11 | Partial failures (some tracks fail) not surfaced clearly | Error Handling | M | M | 4 | User sees fewer songs than expected | Per-item error list with skip/retry; logging for failed IDs | Offer retry all / retry failed; export remainder | QA | Open |
| R-12 | Legal / Terms non-compliance (Spotify/Deezer API usage) | Compliance | L | H | 3 | TOS updates; emails from provider | Review TOS; avoid storing restricted data; cache within limits | Disable feature if required; contact provider support | PM | Open |
| R-13 | Build/Deploy pipeline breaks docs or site (Pages/Actions) | CI/CD | M | M | 4 | Pages build fails; workflow disabled | Pinned actions; simple workflow; status badge; manual run enabled | Serve local docs; re-enable Actions; restore last good run | DevOps | Open |
| R-14 | Regression in ELO/ranking affects export sets | Functional | L | M | 2 | Unexpected song ordering; user complaints | Snapshot unit tests for ELO; contract tests for ranked endpoints | Hotfix ELO; re-run export with corrected set | QA | Open |
| R-15 | Duplicate tracks in playlist (race / mapping issue) | Data Integrity | M | M | 4 | Visible duplicates; Spotify returns 400 | De-dupe by Spotify track ID before POST; idempotent batcher | Remove duplicates; re-post missing items | Dev | Open |
| R-16 | Browser autoplay policy blocks previews during review | Browser Policy | M | L | 2 | No audio until user gesture | Require explicit play; show hint; user gesture to enable sound | Keep non-blocking UI; persist preferred volume | UX | Accepted |
| R-17 | Accessibility gaps in modal hinder some users | Accessibility | L | M | 2 | Keyboard trap; focus loss | Basic focus trapping; aria labels; visible focus | Provide non-modal fallback flow | QA | Accepted |
| R-18 | Flaky E2E tests slow delivery | Quality / Process | M | M | 4 | Intermittent CI failures | Test isolation; data seeding; network stubbing for 3rd-party | Quarantine flaky tests; fix before merging | QA | Open |
| R-19 | Environment parity gaps (local vs. prod) | Config Drift | M | M | 4 | Works local, fails prod | `.env.example`; config docs; smoke tests post-deploy | Feature flag; quick rollback | DevOps | Open |
| R-20 | User confusion about export scope (filters vs. selection) | UX / Clarity | M | L | 2 | Support questions; wrong expectations | Clear summary: N songs, filters applied; confirm modal | Undo/redo; simple re-export | UX | Mitigating |

---

## Risk Heat Map (Initial)

This qualitative heat map groups risks by Likelihood (rows) and Impact (columns). It reflects the current risk register values and will be updated as we re-assess.

**Legend:**  
Rows = Likelihood (High, Medium, Low)  
Columns = Impact (Low, Medium, High)  
Each cell shows: count — list of Risk IDs

|                 | Impact: Low | Impact: Medium | Impact: High |
|-----------------|-------------|----------------|--------------|
| Likelihood: High | 0 — (none) | 0 — (none)     | 0 — (none)   |
| Likelihood: Medium | 2 — R-16, R-20 | 10 — R-04, R-05, R-08, R-09, R-10, R-11, R-13, R-15, R-18, R-19 | 3 — R-01, R-02, R-03 |
| Likelihood: Low | 0 — (none) | 2 — R-14, R-17 | 3 — R-06, R-07, R-12 |

### Notes
- This log is intentionally feature-focused. Platform-wide risks (e.g., domain/DNS, billing) are tracked separately in project ops docs.
- Highest concentration: **Medium Likelihood / Medium Impact** (10 items) — focus mitigations here to reduce overall exposure quickly.
- High Impact clusters:  
  - **Medium/High**: R-01, R-02, R-03 (OAuth, token refresh, rate limits)  
  - **Low/High**: R-06, R-07, R-12 (secrets, DB reliability, TOS compliance)
- Revisit post-implementation of auth & export flows to re-score R-01 to R-03, and after CI hardening to re-score R-13/R-18.



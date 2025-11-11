# Baseline Test Report — September 2025

> **Status:** FROZEN — baseline reference prior to Spotify Playlist Export  
> **Commit:** `a0dad94` (main branch)  
> **Environment:** Production (`https://melodx.io`)  
> **Date:** 2025-09-09  

---

## 1. Scope & Purpose
This baseline captures the current production behavior of **Melodex** before introducing the **Spotify Playlist Export** feature. It establishes reference points for:

- Existing functionality and known defects  
- UX and data-flow consistency  
- Performance snapshots (coarse)  
- Regression scope once the new feature lands  

---

## 2. Test Environment

| Property | Value |
|-----------|--------|
| **Site under test** | [https://melodx.io](https://melodx.io) |
| **Repository** | [github.com/michadereus/Melodex](https://github.com/michadereus/Melodex) |
| **Commit (SHA)** | `a0dad94` |
| **Date init** | 09-09-2025 |
| **Network** | Spectrum (≈ 450 Mbps down / 11 Mbps up) |

### Test Accounts

| Purpose | Email (masked) | Provider(s) | Notes |
|----------|----------------|--------------|-------|
| Main QA account | `qa.melodex@gmail.com` | Google (federated via Cognito) | Seeded with ~40 ranked songs |
| Fresh QA account | `qa.melodex@gmail.com` | Cognito (email/password) | Validates signup/login + empty states |
| Legacy QA account | `mich*****@...` | Cognito (email/password) | Used to probe aged data handling |

---

## 3. Devices & Browsers

| Platform | Device / OS | Browser | Version |
|-----------|-------------|----------|----------|
| **Desktop** | Windows 11 | Firefox | 142.0.1 (64-bit) |
| **Mobile** | Android 15 | Firefox (Android) | 142.0.1 (Build #2016110943) |

---

## 4. Preconditions
- At least one account can authenticate (email + password or Google) and reach `/rank`.  
- Seed data exists or can be generated through normal ranking use.  
- DevTools network logging (HAR) available for each run.  

---

## 5. Smoke Checklist  
> **Objective:** Validate happy-path and guardrail functionality prior to feature work.  

<div class="smoke-table" markdown="1">

| ID | Account | Area | Scenario | Endpoint | Platform | Quick Steps | Result | Evidence |
|----|----------|------|-----------|-----------|-----------|--------------|:-------:|-----------|
| SMK-00 | Fresh | Auth | Create new account via Email/Password → lands on Rank | `/register` | Desktop | Visit `/register`, fill form, verify redirect | <span class="pill pass">Passed</span> | [DEF-001-verify.png](../evidence/DEF-001-verify.png), [DEF-001-verify-rank.png](../evidence/DEF-001-verify-rank.png) |
| SMK-01 | Fresh | Auth | Login via Email → lands on Rank | `/rank` | Desktop | Login, verify redirect | <span class="pill pass">Passed</span> | [SMK-01-login](./evidence/SMK-01-login.png) |
| SMK-02 | Main | Auth | Login via Google → lands on Rank | `/rank` | Desktop | Login with Google, verify redirect | <span class="pill pass">Passed</span> | [SMK-02-login](./evidence/SMK-02-login.png) |
| SMK-03 | Main + Fresh | Rank | Pair appears and both previews render controls | `/rank` | Desktop | Load page, confirm two items + play controls visible | <span class="pill pass">Passed</span> | [SMK-03-main](./evidence/SMK-03-main.gif) |
| SMK-04 | Main + Fresh | Rank (refresh one) | Refresh button replaces a single item | `/rank` | Desktop | Click refresh on one item → confirm swap | <span class="pill pass">Passed</span> | [SMK-04-main](./evidence/SMK-04-main.gif) |
| SMK-05 | Main + Fresh | Rank/Re-rank (refresh both) | Refresh-all replaces both items | `/rank`, `/rerank` | Desktop | Click refresh-all → confirm both songs change | <span class="pill pass">Passed</span> | [SMK-05-main](./evidence/SMK-05-main.gif) |
| SMK-06 | Main + Fresh | Profile | Profile page shows correct display + avatar | `/profile` | Desktop | Verify name/email, avatar fallback | <span class="pill pass">Passed</span> | [SMK-06-main](./evidence/SMK-06-main.png) |
| SMK-07 | Main + Fresh | Profile (stats) | Stats reflect new ranking activity | `/profile` | Desktop | Rank one pair → check totals update | <span class="pill pass">Passed</span> | [SMK-07-main](./evidence/SMK-07-main.gif) |
| SMK-08 | Main + Fresh | Rank ↔ Re-rank | Navigate between pages without error | `/rerank` | Desktop | Use nav, open `/rerank`, return | <span class="pill pass">Passed</span> | [SMK-08-main](./evidence/SMK-08-main.gif) |
| SMK-09 | Main + Fresh | Mobile basic | Load `/rank` and interact with pairs | `/rank` | Mobile | Tap through ~3 pairs | <span class="pill pass">Passed</span> | [SMK-09-main](./evidence/SMK-09-main.gif) |
| SMK-10 | Main | Mobile rankings | Load `/rankings` → attempt old preview | `/rankings` | Mobile | Tap play on older entries | <span class="pill pass">Passed</span> | [SMK-10](./evidence/SMK-10.gif) |
| SMK-11 | Main + Fresh | Rankings list updates | Ranking adds songs to `/rankings` | `/rankings` | Desktop | Rank pair → verify in list | <span class="pill pass">Passed</span> | [SMK-11-main-rank](./evidence/SMK-11-main-rank.png) |
| SMK-12 | Main + Fresh | Rankings (ELO values) | Re-ranking updates winner/loser values | `/rerank` | Desktop | Compare before/after ELO | <span class="pill pass">Passed</span> | [SMK-12-main-1](./evidence/SMK-12-main-1.png) |
| SMK-13 | Main | Rankings (old previews) | Older items can play audio | `/rankings` | Desktop | Scroll and play | <span class="pill pass">Passed</span> | [SMK-13](./evidence/SMK-13.gif) |
| SMK-14 | Main + Fresh | Logout | Logout returns to public state | `/` | Desktop | Use header → Logout | <span class="pill pass">Passed</span> | [SMK-14](./evidence/SMK-14.png) |

</div>

---

## 6. Defects Found

| ID | Title | Severity | Priority | Status | References |
|----|--------|-----------|-----------|---------|-------------|
| **DEF-001** | Verification code error | Major | Medium | <span class="pill pass">Resolved</span> | [DEF-001](./defects/DEF-001.md); SMK-00 · PR #2 · R-01 |
| **DEF-002** | Preview link expiry | Major | High | <span class="pill pass">Resolved</span> | [DEF-002](./defects/DEF-002.md); EXP-00 · PR #3 · R-05 |
| **DEF-003** | Songs load on `/rank` without filter | Minor | Medium | <span class="pill pass">Resolved</span> | [DEF-003](./defects/DEF-003.md); EXP-01 · PR #4 |

---

## 7. Performance Snapshot (Coarse)

| Page | Metric | Observation | Evidence |
|------|---------|--------------|-----------|
| `/rank` | TTFB / Load | ≈ 200 ms / 1.8 s | [PERF-rank.har](../assets/evidence/PERF-rank.har) |
| `/rerank` | TTFB / Load | ≈ 200 ms / 1.8 s | [PERF-rerank.har](../assets/evidence/PERF-rerank.har) |
| `/rankings` | TTFB / Load | ≈ 220 ms / 1.6 s | [PERF-rankings.har](../assets/evidence/PERF-rankings.har) |
| `/profile` | TTFB / Load | ≈ 220 ms / 1.6 s | [PERF-profile.har](../assets/evidence/PERF-profile.har) |
| API (core) | Median response | `/ranked ≈ 180–250 ms` | HAR / logs |

> Values are indicative snapshots, not formal SLOs. Used for future regression comparison.

---

## 8. Targeted Exploratory Session — EXP-00  
Refer to [EXP-00 — Deezer Preview Expiry](./exploratory/EXP-00.md) for full narrative.  
Key outcomes:

- Reproduced expired Deezer preview URLs on legacy accounts.  
- Logged as **DEF-002** (Sev-2, Resolved).  
- Established **Risk R-05** — users may lose playback after inactivity.

---

## 9. Targeted Exploratory Session — EXP-01  
Refer to [EXP-01 — Background Fetch Before Filter](./exploratory/EXP-01.md) for full narrative.  
Key outcomes:

- Discovered premature fetch loop before filter apply.  
- Logged as **DEF-003** (Sev-3, Resolved).  
- Regression check added for idle `/rank` page pre-filter.

---

## 10. Traceability Matrix

| Requirement / Feature | Smoke Test(s) | Related Defect(s) | Related Risk(s) |
|------------------------|---------------|-------------------|-----------------|
| User authentication (Email/Password) | SMK-00 · SMK-01 | DEF-001 | R-01 |
| Ranking workflow (`/rank`) | SMK-02 · SMK-03 · SMK-04 | DEF-003 | R-21 |
| Re-ranking workflow (`/rerank`) | SMK-05 | — | — |
| Rankings page (`/rankings`) | SMK-06 · SMK-07 | DEF-002 | R-05 |
| Filters (genre/subgenre/decade) | SMK-08 | DEF-003 | R-21 |
| Export / Data persistence | SMK-09 | — | — |

---

**Baseline established.**  
This document now serves as the locked reference for post-feature regression comparison and traceability.

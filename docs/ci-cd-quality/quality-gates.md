# Quality Gates

These gates apply to feature work landing on `main`.

## 1) CI health
- Lint, unit/UI (Vitest), integration (Vitest) must pass.
- E2E (Cypress) must pass for the feature PR.

## 2) Coverage gates
We gate what we changed and the feature scope; repo-wide coverage is monitored but not blocking.

### Changed-files coverage (PR diff):
  - **Target:** ≥ **80% Lines & Branches
  - **Definition:** Sources under `melodex-(front-end|back-end)/src/**` that differ from baseline (or `main` for PRs).

### Feature-scope coverage:
  - **Target:** ≥ 75% Lines & Branches
  - **Definition:** Export feature modules (listed in the Test Execution Summary).

### Repo-wide coverage:
  - **Policy:** Must not decrease vs. baseline snapshot. Informational only for this feature case study.

> E2E coverage is intentionally **not** enforced. E2E validates end-to-end behavior; code coverage is assessed via unit/UI/integration layers.

## 3) Defects & security
- No open Sev-1 / Sev-2 defects in scope at merge time.
- No High/Critical vulnerabilities in dependency scan.
- ESLint: no High severity issues in changed files.

## 4) Evidence
- Attach Vitest LCOV artifact and HTML snapshot link(s).
- Link to Cypress run summary & failure videos (if any).
- Link to the Traceability Appendix and Test Execution Summary pages.

# Melodex

> _This repository currently features a **case study** focused on the new portfolio-oriented feature: **Spotify Playlist Export**._

Melodex is a full-stack music discovery and ranking platform. Users compare pairs of well-known tracks, build personalized leaderboards using an ELO-based ranking algorithm, and explore curated lists by genre or subgenre.

The system integrates:

- **Frontend:** React (Vite) hosted via AWS Amplify, wired to AWS Cognito and S3  
- **Backend:** Node.js/Express deployed on AWS Elastic Beanstalk (EC2) with MongoDB Atlas  
- **APIs:** OpenAI (song generation), Deezer (track metadata), and Spotify (playlist creation & track search)
- **Auth:** Cognito User Pools with username/password and Google federation  
- **Docs:** MkDocs (Material) at https://docs.melodx.io  
- **Tests:** Vitest (unit/integration/UI), Cypress (E2E), GitHub Actions  

> The documentation is intentionally scoped to the **Spotify Playlist Export case study**.  
> Additional product documentation may be expanded in the future.

- **Site:** https://www.melodx.io
- **Docs:** https://docs.melodx.io/

---

## Repository Structure

Melodex/  
├─ melodex-back-end/           → Express API (AWS Elastic Beanstalk)  
├─ melodex-front-end/          → React app (Amplify)  
├─ tests/                      → All test suites  
│  ├─ unit/                    → Vitest unit  
│  ├─ integration/             → Supertest/Nock integration  
│  ├─ ui/                      → Component tests (React Testing Library)  
│  ├─ cypress/                 → Cypress E2E  
│  └─ fixtures/                → Shared test data  
├─ scripts/                    → Coverage & CI helper scripts  
├─ docs/                       → MkDocs site  
│  ├─ overview/  
│  ├─ requirements/  
│  ├─ test/  
│  ├─ reports/  
│  ├─ how-to/  
│  ├─ ci-cd-quality/  
│  ├─ case-studies/  
│  └─ index.md  
├─ .github/workflows/          → GitHub Actions  
├─ mkdocs.yml                  → MkDocs configuration  
├─ package.json                → Root scripts    

## Local Development

### Start frontend and backend together

    npm run dev

### Frontend only

    cd melodex-front-end
    npm install
    npm run dev     # → http://localhost:3001

### Backend only

    cd melodex-back-end
    npm install
    npm start       # → http://localhost:8080

---

## Tests

Automated tests are centralized under `/tests` and use **Vitest** (unit, integration, UI) and **Cypress** (E2E).

### Vitest
- Unit: `npx vitest run unit`
- Integration: `npx vitest run integration`
- UI (React Testing Library): `npx vitest run ui`

### Cypress (E2E)
- Headless: `npx cypress run`
- Interactive: `npx cypress open`

## Documentation

The project uses **MkDocs (Material)**, deployed automatically at `https://docs.melodx.io/`.

- Preview locally: `mkdocs serve`
- Build static site: `mkdocs build` 

---

## Status

This repository emphasizes:

- A complete QA/test architecture for the **Spotify Playlist Export** feature  
- A docs-as-code approach with replicable evidence  
- A portfolio-ready case study reflecting real QA engineering workflows  
- A stable CI pipeline validating unit, integration, UI, and E2E layers

Future expansions may integrate additional Melodex features into the documentation.

# Architecture

This feature sits across the frontend, backend, and third-party APIs. Only the components relevant to the Spotify export flow are described here.

- **Frontend:** React (`Vite`) running on AWS Amplify; renders rankings, export UI, and progress/error states.
- **Backend:** Express running on AWS Elastic Beanstalk (EC2); owns export orchestration and API routing.
- **Data:** MongoDB Atlas; stores ranked songs and user selections.
- **Auth:**
    - Cognito for Melodex user accounts.
    - Spotify OAuth for playlist permissions.
- **External services:**
    - Spotify Web API for playlist creation and track addition.
    - Deezer for metadata enrichment.
- **Media:** AWS S3 for profile images.
- **Infrastructure:** Route 53 → Amplify for frontend routing; Elastic Beanstalk for API hosting.
- **Scripts:** Helper utilities under `/scripts` for coverage processing, test orchestration, and CI support.

This architecture influenced testing decisions around:
- OAuth session persistence and revocation behavior
- Rate limiting and Retry-After handling
- Deterministic ordering in the export pipeline
- Contract stability between backend and UI

### CI/CD pipeline diagram

```mermaid
flowchart LR
  Dev["Developer"] --> Commit["Commit and push"]
  Commit --> GitHub["GitHub repo"]

  GitHub --> Tests["CI: test.yml\nVitest unit / integration / UI"]
  GitHub --> E2E["CI: e2e.yml\nCypress E2E"]
  GitHub --> Docs["CI: docs.yml\nMkDocs build"]

  Tests --> Status["Status checks\n(pass / fail)"]
  E2E --> Status
  Docs --> DocsSite["docs.melodx.io"]
```
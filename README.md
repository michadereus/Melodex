# Melodex

Melodex is a music discovery and ranking web app. Users pick a genre/subgenre, compare pairs of well-known tracks with 30-second previews, and build personal rankings powered by an Elo system. The app uses AWS Cognito (email/Google), S3 for profile images, Amplify for the React front end, an Elastic Beanstalk Node.js API backed by MongoDB Atlas, OpenAI for song suggestions, and Deezer for metadata/previews.

> This repository currently features a **case study** focused on a new portfolio-oriented feature: **Spotify Playlist Export**. The case study includes professional requirements, acceptance criteria, a test approach/plan, and CI docs.

---

## Live Documentation (MkDocs)

- Site: https://michadereus.github.io/Melodex/
- Start here: https://michadereus.github.io/Melodex/overview/

The documentation is intentionally scoped to the **Spotify Playlist Export case study** (not the entire product). The landing page explains the scope.

---

## Repository Structure

Melodex/
├─ melodex-back-end/ # Node.js/Express API (Elastic Beanstalk)
├─ melodex-front-end/ # React app (Amplify)
├─ docs/ # MkDocs site (case study docs)
│ ├─ overview/ # Case study overview & architecture
│ ├─ requirements/ # User stories & acceptance criteria
│ ├─ test/ # Test approach, plan, traceability, risks
│ ├─ reports/ # Execution summary, defects
│ ├─ how-to/ # Local dev, running tests, etc.
│ ├─ ci-cd-quality/ # Coding standards, quality gates
│ ├─ case-studies/ # Case study narrative
│ └─ index.md # Landing page for docs
├─ mkdocs.yml # MkDocs configuration
└─ .github/workflows/docs.yml# GitHub Actions: build & publish docs

---

## Local Development (Docs)

1. Install Python 3.9+.
2. Install dependencies:
   ```bash
   pip install mkdocs-material mkdocs-git-revision-date-localized-plugin

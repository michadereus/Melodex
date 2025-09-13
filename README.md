# Melodex

Melodex is a full-stack music discovery and ranking platform. Users select genres or subgenres, compare pairs of well-known tracks with 30-second previews, and build personalized leaderboards using an ELO-based ranking algorithm. 

The system integrates:

- **Frontend:** React (Vite) hosted via AWS Amplify, wired to AWS Cognito for authentication and AWS S3 for profile image storage  
- **Backend:** Node.js/Express deployed on AWS Elastic Beanstalk (EC2), connected to MongoDB Atlas for persistence  
- **APIs:** OpenAI (generates candidate song lists) and Deezer (enriches tracks with IDs, album art, and preview URLs)  
- **Auth:** Cognito User Pools with email/password and Google federation
- **Docs:** MkDocs (Material) published via GitHub Pages at docs.melodx.io

> This repository currently features a **case study** focused on a new portfolio-oriented feature: **Spotify Playlist Export**.

---

## Live Links

- Site: [melodx.io](https://www.melodx.io)
- Docs: [docs.melodx.io](https://docs.melodx.io/)

> The documentation is intentionally scoped to the **Spotify Playlist Export case study** (not the entire product). The landing page explains the scope.

---

## Repository Structure

Melodex/

├─ melodex-back-end/ # Node.js/Express API (Elastic Beanstalk)  
├─ melodex-front-end/ # React app (Amplify)  
├─ docs/ # MkDocs site (case study docs)  
│ ├─ overview/ # Case study overview & architecture  
│ ├─ requirements/ # User stories & acceptance criteria  
│ ├─ test/ # Test approach, plan, traceability, risks  
│ ├─ reports/ # Baseline, execution summary, defects  
│ ├─ how-to/ # Local dev, running tests, etc.  
│ ├─ ci-cd-quality/ # Coding standards, quality gates  
│ ├─ case-studies/ # Case study narrative  
│ └─ index.md # Landing page for docs  
├─ mkdocs.yml # MkDocs configuration  
└─ .github/workflows/docs.yml# GitHub Actions: build & publish docs  

---

## Local Development

### Easy Run
    # root dir
    npm run dev

### Frontend
    cd melodex-front-end
    npm install
    npm run dev             # → http://localhost:3001

### Backend
    cd melodex-back-end
    npm install
    npm start               # → http://localhost:8080
    
### Docs
    pip install mkdocs-material mkdocs-git-revision-date-localized-plugin
    mkdocs serve            # → http://localhost:8000

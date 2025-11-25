<!-- path: docs/case-studies/index.md -->

# Case Study: Spotify Playlist Export

## Pages

- [Requirements and scope](./requirements.md)
- [Executive summary](./index.md)
- [Architecture overview](./architecture.md)
- [Test strategy](./test-strategy.md)
- [Test design and key cases](./test-design.md)
- [Defects and fixes](./defects.md)
- [Results and coverage](./results.md)
- [Challenges and lessons learned](./lessons.md)

## Overview

Melodex is a music-ranking app that lets users maintain ranked lists of songs by genre or filter. The Spotify Playlist Export feature allows users to turn those ranked lists into real Spotify playlists without manually searching and adding each track.

This case study focuses on the end-to-end delivery and validation of the export feature, with emphasis on test architecture, defect discovery, and how the system was made reliable enough to ship.

## Role

> I led the QA architecture, test design, requirements analysis, and validation of the Spotify Playlist Export feature. I developed the test strategy, wrote acceptance criteria, performed manual exploratory testing, evaluated failures, maintained defect logs, and drove the debugging process. I collaborated with AI-assisted tooling to generate implementation code, but all test coverage, verification logic, and correctness decisions were made by me.

## Timeframe and scope

- **Feature:** `Spotify Playlist Export`
- **Scope freeze commit:** `2fdb518`
- **Baseline reference:** `a0dad94` (pre-export production baseline)
- **Primary story scope:** `US-002` to `US-007` (export, feedback, errors)
- **Campaign window:** `2025-09` to `2025-11`

The goal was not just to get “something working”, but to implement a verifiable, testable export pipeline that could withstand OAuth edge cases, rate limiting, and partial failures while giving clear feedback to the user.

## Feature at a glance

- Export selected ranked songs from `/rankings` to a Spotify playlist.
- Respect current filters and checkboxes when building the playlist.
- Allow naming and describing the playlist before export.
- Show progress and final status, including a clickable playlist link.
- Handle per-track failures (for example, `NOT_FOUND` or `REGION_BLOCKED`) without failing the whole export.
- Respect Spotify API constraints, including `≤100` URIs per add call and 429 `Retry-After` behavior.
- Enforce secure OAuth handling with `httpOnly` cookies and reconnect requirements when tokens are revoked or invalid.

## What this case study covers

Each page in this section focuses on a different dimension of the work:

- Requirements and scope: how user stories and acceptance criteria shaped the testing scope.
- Architecture overview: how the export pipeline, mapping layer, and OAuth flow fit together.
- Test strategy: how different test levels and tools were used.
- Test design: key unit, integration, UI, and E2E tests that provide confidence.
- Defects: critical issues found (and how they were fixed) during the feature push.
- Results: final execution summary, coverage, and outcomes at scope freeze.
- Lessons: challenges encountered and what was learned as a QA engineer.

The rest of the case study assumes familiarity with the Melodex repository and the existing test documentation but is written so it can be read on its own by reviewers and hiring managers.

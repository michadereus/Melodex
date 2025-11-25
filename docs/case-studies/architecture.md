<!-- path: docs/case-studies/spotify-playlist-export/architecture.md -->

# Architecture Overview

This page describes the parts of the Melodex architecture that are most relevant to the Spotify Playlist Export feature and explains how they influenced the testing approach.

## System context

At a high level:

- Frontend: React (`Vite`) app that renders rankings, export UI, and progress/error states.
- Backend: Express application (`app.js`) deployed on Elastic Beanstalk.
- Data: `MongoDB Atlas` with `user_songs` and ranking metadata.
- External services:
  - `Spotify Web API` for playlist creation and track addition.
  - `Deezer` for song metadata, preview URLs, and album art.
- Auth:
  - `Cognito` for Melodex user accounts.
  - Spotify OAuth (handled by `AuthController`) for playlist permissions.

The export feature sits at the intersection of all of these.

## Export pipeline

The backend export pipeline is implemented primarily in:

- `routes/api.js` (route wiring)
- `utils/exportWorker.js` (core pipeline)
- `utils/mappingService.js` (mapping Deezer-backed records to Spotify track URIs)
- `utils/spotifyClient.js` (thin client for Spotify API calls)
- `utils/errorContract.js` (shared error and envelope contracts)

At a conceptual level, the pipeline is:

1. Frontend gathers ranked songs, filter state, and metadata from `/user-songs/ranked`.
2. Frontend posts the export request to `POST /api/playlist/export`.
3. The API validates authentication via `requireSpotifyAuth`.
4. `exportWorker`:
    - Uses `mappingService` to translate input items into Spotify URIs and per-track reasons.
    - Chunks URIs into batches of at most `100` per add call, per Spotify API constraints.
    - Calls `spotifyClient` to create the playlist and add tracks.
    - Aggregates per-track outcomes into a structured envelope.
5. Backend returns a response with:
    - Playlist identifiers (`playlistId`, `playlistUrl`)
    - Structured `kept`, `skipped`, and `failed` arrays
    - A top-level `ok` flag and error code when needed.

The export envelope used in tests looked like this:

    {
      "ok": true,
      "playlistId": "pl_123",
      "playlistUrl": "https://open.spotify.com/playlist/pl_123",
      "kept": ["spotify:track:a", "spotify:track:b"],
      "skipped": [{ "id": "spotify:track:c", "reason": "NOT_FOUND" }],
      "failed": [{ "id": "spotify:track:d", "reason": "RATE_LIMIT" }]
    }

The frontend does not need to know how mapping or chunking is implemented; it only needs to render based on this contract.

## Mapping layer

`mappingService` converts ranked items into Spotify track URIs. It handles:

- Reusing valid existing `spotifyUri`.
- Generating URIs from `deezerID`, `deezerId`, or `_id` when needed.
- Filtering out unchecked or explicitly skipped items.
- Returning structured reasons for items that cannot be mapped (for example, `NOT_FOUND`, `REGION_BLOCKED`).

A stubbed mapper exists for tests that do not require real Spotify lookups, while integration and E2E tests use deterministic fixtures so the structure of `skipped` and `failed` arrays remains consistent.

This mapping layer is a major source of per-track outcomes, which is why several integration and E2E tests assert on the `skipped` and `failed` arrays, not just on HTTP status.

## Spotify client and rate limits

`spotifyClient` wraps Spotify’s playlist endpoints:

- `POST /v1/users/{user_id}/playlists` for playlist creation.
- `POST /v1/playlists/{playlist_id}/tracks` for adding tracks.

`exportWorker` applies the rate-limit policy:

- Honors `Retry-After` in seconds or HTTP-date format.
- Falls back to bounded backoff if the header is missing or malformed.
- Preserves partial successes and marks remaining items as `RATE_LIMIT` after exhaustion.

This behavior is validated in `UT-005` and `IT-008`, and surfaced to the UI for `AC-06.2` and `AC-06.3`.

## OAuth and session model

Spotify OAuth is handled in `controllers/AuthController.js` and wired in:

- `GET /auth/start`
- `GET /auth/callback`
- `GET /auth/session`
- `POST /auth/revoke`

Key points:

- Access and refresh tokens are stored in secure `httpOnly` cookies; they never enter local storage.
- `/auth/session` exposes a small JSON shape consumed by the frontend to determine whether export is allowed.
- `/auth/revoke` clears server-side tokens and invalidates the session.
- External revocation (removing Melodex from Spotify “Connected Apps”) is handled by detecting `invalid_grant` and forcing a reconnect.

The export route `/api/playlist/export` is guarded by `requireSpotifyAuth`, which relies on this session model. This interplay between OAuth endpoints and the export route is exercised in `IT-001`, `IT-002`, `IT-010`, and E2E tests such as `E2E-003` and `E2E-007`.

## Impact on testing

This architecture led to several design decisions in the test suite:

- Contract-style tests for the export envelope to avoid regressions in `kept`, `skipped`, and `failed` structures.
- Focused integration tests around rate limiting and `Retry-After` parsing.
- E2E tests that cover OAuth initiation, callback, session exposure, revoke flows, and export blocking/unblocking.
- Clear separation between stubbed and real-worker modes, with tests ensuring the environment flags `PLAYLIST_MODE` and `EXPORT_STUB` are respected.

The next pages describe how this architecture was exercised using unit, integration, UI, and E2E tests.

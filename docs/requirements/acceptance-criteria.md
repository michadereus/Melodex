# Acceptance Criteria

## US-01 — Authenticate with Spotify

## Baseline — Ranking flows & filters

- **AC-F.1** — Given I adjust ranking filters, when I have not clicked Apply, then no background fetch occurs.
- **AC-F.2** — Given the app preloads or refreshes previews/data, when background fetching occurs, then the burst is capped at approximately 33 items to control cost and latency.
- **AC-F.3** — Given I apply filters, when the list updates, then UI elements are not clipped or truncated and remain navigable.

---

## Baseline — Rankings playback stability

- **AC-P.1** — Given a preview URL has expired, when I attempt playback, then the preview refreshes and playback resumes without manual reload.
- **AC-P.2** — Given I navigate or refresh the page, when previews are displayed, then no broken player states persist and controls remain responsive.

---

- **AC-01.1** — Given I complete Spotify OAuth successfully, when Melodex receives the callback with a valid code and state/PKCE, then Melodex establishes a valid session (secure httpOnly, SameSite cookies) and redirects to the post-login route (e.g., `/rank`).
- **AC-01.2** — Given I am not authenticated, when I navigate to a protected route or attempt an export, then I am prompted to log in to Spotify first.
- **AC-01.3** — Given I cancel at Spotify (callback contains `error=access_denied`), when Melodex handles the callback, then no access/refresh tokens are stored anywhere and I remain unauthenticated.
- **AC-01.4** — Given a successful token exchange, when the app stores credentials, then access/refresh tokens are stored only in secure, httpOnly, SameSite cookies and never in web storage.
- **AC-01.5** — Given my access token expires, when a protected request returns 401, then the app attempts a single refresh and retries once on success or logs me out and prompts reconnect on failure.

---

## US-02 — Export ranked songs by current filter (Inline)

- **AC-02.1** — Given I have ranked songs and an active filter, when I click “Export to Spotify,” then the Rankings page enters **inline selection mode** and a new Spotify playlist is created containing only the currently checked songs that match the filter.  
- **AC-02.2** — Given the current filter matches no songs or I uncheck all songs, when I attempt export, then I see a “No songs available for export” message and the Export button is disabled (no playlist is created).  
- **AC-02.3** — Given Melodex holds Deezer-backed metadata for my ranked list, when songs are exported to Spotify, then each exported track resolves to the correct Spotify track using the mapping rules and unmapped tracks follow error handling.  
- **AC-02.4** — Given I uncheck or skip some items in inline selection mode, when I export, then only the checked, ranked, and not-skipped items are sent to Spotify.  

---

## US-03 — Review & remove before export (Inline)

- **AC-03.1** — Given I click “Export to Spotify,” when inline selection mode appears on the Rankings page, then I can see the list of songs (title and artist) with all songs initially checked.  
- **AC-03.2** — Given I uncheck one or more songs inline, when I proceed with export, then only the remaining checked songs are included in the playlist.  
- **AC-03.3** — Given I change filters or exit selection mode, when I re-enter selection mode, then the list reflects the latest filter and defaults back to all visible songs checked, with counts/summary updated accordingly.  

---

## US-04 — Add playlist name/description (Inline)

- **AC-04.1** — Given I am exporting a playlist in inline selection mode, when I enter a name and/or description, then the created Spotify playlist uses those values.  
- **AC-04.2** — Given I do not enter a name, when I confirm export, then the playlist name defaults to **“{genre} {subgenre} Playlist.”**  

---

## US-05 — Real-time feedback during export

- **AC-05.1** — Given I start export, when processing is underway, then a progress or loading indicator remains visible until completion or failure.
- **AC-05.2** — Given the playlist is successfully created, when export completes, then the progress indicator shows completion and a success confirmation is displayed.
- **AC-05.3** — Given an error prevents completion, when the process stops, then I see an error state with clear next steps such as retry.

---

## US-06 — Error handling

- **AC-06.1** — Given a song cannot be added to Spotify (for example, not found or region-restricted), when the export runs, then I see an error message identifying the issue and options to skip the song and continue or cancel the export.
- **AC-06.2** — Given Spotify rate limits are reached, when the export runs, then I see a “Try again later” message that explains the condition and suggests a retry.
- **AC-06.3** — Given one or more errors occur, when I choose how to proceed, then I can retry, skip all failing songs, or cancel the export.

---

## US-07 — Confirmation with playlist link

- **AC-07.1** — Given export succeeds, when the flow completes, then I see a confirmation with a clickable link to the new Spotify playlist.
- **AC-07.2** — Given I click the confirmation link, when the Spotify app is installed, then the playlist opens in the app; otherwise, it opens in the browser with a web fallback.

---

## US-08 — Revoke Spotify access

- **AC-08.1** — Given I am connected to Spotify, when I choose “Disconnect Spotify” in settings, then the integration is revoked and tokens are invalidated so protected Spotify calls are no longer possible.
- **AC-08.2** — Given I have revoked access, when I attempt to export again, then I am prompted to reconnect to Spotify.
- **AC-08.3** — Given I revoke access in Melodex, when I check my Spotify account’s connected apps, then Melodex no longer appears in the list of authorized applications (subject to Spotify’s propagation timing).

---

## TS-01 — Mapping service toggle & rules (Milestone A)

*Parent:* US-02 → **AC-02.3** (Spotify track mapping applied)  
*Non-user-visible:* No UI changes; CI default remains deterministic (**stub**)

- **AC-TS2.3.A** — Given mapping runs in **test/CI**, when no override is provided, then the mapping service uses **stub mode** by default; when explicitly switched, **real mode** uses Spotify `/v1/search`.
- **AC-TS2.3.B** — Given a track has an **ISRC**, when mapping occurs in real mode, then the query uses `q=isrc:<code>` and any result with that exact ISRC is accepted without title heuristics.
- **AC-TS2.3.C** — Given a track lacks ISRC, when mapping by **title+artist**, then normalization removes punctuation/diacritics, collapses “feat./ft./with/and”, filters `Live|Commentary|Short Film|Karaoke`, and applies a **±3s duration** tiebreak when multiple candidates remain.
- **AC-TS2.3.D** — Given Spotify returns no acceptable candidates after filtering, when mapping completes, then the result contains `uri: null` with a structured `reason` (e.g., `NO_MATCH`, `FILTERED_ALL_CANDIDATES`, `DURATION_OUT_OF_TOLERANCE`) and the batch continues.
- **AC-TS2.3.E** — Given multiple inputs normalize to the same search, when mapping runs in real mode, then duplicate outbound requests are avoided within the batch (per-batch caching) and results remain 1:1 and stable-ordered.
- **AC-TS2.3.F** — Given Spotify responds with **429** or a network **timeout**, when mapping completes, then affected items return `uri: null` with `reason: RATE_LIMIT` or `TIMEOUT` and no silent success is reported.

---

## TS-02 — Progress & error contract (Milestone B)

*Parent:* US-05 — Real-time feedback during export  
*Non-user-visible:* Establishes stable backend envelope used by UI state machine

- **AC-TS2.1** — Given any export request succeeds, when the backend responds, then the body uses a **success envelope** `{ ok: true, playlistId, playlistUrl, kept, skipped, failed? }`.
- **AC-TS2.2** — Given any export request fails, when the backend responds, then the body uses a **failure envelope** `{ ok: false, code, message, details? }` and the HTTP status reflects the failure class (4xx/5xx).
- **AC-TS2.3** — Given a failure occurs **after** some items were processed, when the backend responds, then it **passes through per-track outcomes** when available via `failed: [{ id, reason }]` and preserves `kept`/`skipped` counts computed so far.
- **AC-TS2.4** — Given the UI dispatches an export, when a request is **in-flight**, then the UI enters **loading** (controls disabled, progress visible) and transitions to **success** on `{ ok: true }` or **error** on `{ ok: false }`, showing `message` and a retry affordance.

---

## TS-03 — Per-track pipeline & 429 policy (Milestone C)

*Parent:* US-06 — Error handling  
*Non-user-visible:* Orchestrates server-side batch behavior; UI consumes results

- **AC-TS3.1** — Given tracks are ready to add, when sending to Spotify, then requests are **chunked ≤100 URIs** per call and executed sequentially per playlist to respect API limits while preserving input order.
- **AC-TS3.2** — Given the export completes (fully or partially), when the backend aggregates outcomes, then the response includes `{ kept, skipped, failed: [{ id, reason }] }` with **stable IDs** and reasons suitable for UI display and retry.
- **AC-TS3.3** — Given Spotify rejects a specific track (e.g., 404/not found or region-blocked), when processing that item, then it is recorded in `failed` with `reason` such as `NOT_FOUND` or `REGION_BLOCKED` without aborting the remaining batch.
- **AC-TS3.4** — Given Spotify returns **429**, when retrying, then the worker **honors `Retry-After`**, uses **bounded backoff** (e.g., capped total wait), and resumes; on exhaustion, remaining unprocessed items are marked `RATE_LIMIT` in `failed` and partial progress is returned.
- **AC-TS3.5** — Given repeated exports of the same input set, when processed, then the pipeline is **deterministic** in ordering of added tracks and in the shape of `failed`/`skipped`, barring external Spotify ranking variability.

---

## Notes & Constraints

- **Track Matching:** Given exported tracks must be resolved, when matching occurs, then Melodex uses stored metadata (Deezer-backed) and routes any unmatched tracks to the US-06 error path.  
- **Auth Architecture:** Given Authorization Code with PKCE is the selected approach, when implementing flows, then technical details are documented separately while ACs remain focused on observable outcomes.  
- **Ordering Guarantee:** Given a playlist is created, when tracks are added, then the playlist order mirrors the ranking order presented at the time of export.

# Acceptance Criteria

## US-01 — Authenticate with Spotify

- **AC-01.1** — Given I complete Spotify OAuth successfully, when Melodex receives the callback with a valid code and state/PKCE, then Melodex establishes a valid session (secure httpOnly, SameSite cookies) and redirects to the post-login route (e.g., `/rank`).
- **AC-01.2** — Given I am not authenticated, when I navigate to a protected route or attempt an export, then I am prompted to log in to Spotify first.
- **AC-01.3** — Given I cancel at Spotify (callback contains `error=access_denied`), when Melodex handles the callback, then no access/refresh tokens are stored anywhere and I remain unauthenticated.
- **AC-01.4** — Given a successful token exchange, when the app stores credentials, then access/refresh tokens are stored only in secure, httpOnly, SameSite cookies and never in web storage.
- **AC-01.5** — Given my access token expires, when a protected request returns 401, then the app attempts a single refresh and retries once on success or logs me out and prompts reconnect on failure.

---

## US-02 — Export ranked songs by current filter

- **AC-02.1** — Given I have ranked songs and an active filter, when I select “Export to Spotify,” then a new Spotify playlist is created containing only the songs that match the current filter.
- **AC-02.2** — Given the current filter matches no songs, when I attempt export, then I see a “No songs available for export” message and no playlist is created.
- **AC-02.3** — Given Melodex holds Deezer-backed metadata for my ranked list, when songs are exported to Spotify, then each exported track resolves to the correct Spotify track using the mapping rules and unmapped tracks follow error handling.
- **AC-02.4** — Given I removed or skipped some items in the review step, when I export, then only ranked and not-removed items are sent to Spotify.

---

## US-03 — Review & remove before export

- **AC-03.1** — Given I click “Export to Spotify,” when the export modal opens, then I can see the list of songs to be exported including song title and artist.
- **AC-03.2** — Given I remove one or more songs in the modal, when I proceed with export, then only the remaining songs are included in the playlist.
- **AC-03.3** — Given I change filters or close the modal, when I reopen the modal, then the list reflects the latest filter and prior removals are reset unless I explicitly saved changes, and counts/summary update accordingly.

---

## US-04 — Add playlist name/description

- **AC-04.1** — Given I am exporting a playlist, when I enter a name and/or description, then the created Spotify playlist uses those values.
- **AC-04.2** — Given I do not enter a name, when I confirm export, then the playlist name defaults to “Melodex Playlist YYYY-MM-DD.”

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

## Baseline — Ranking flows & filters

- **AC-F.1** — Given I adjust ranking filters, when I have not clicked Apply, then no background fetch occurs.
- **AC-F.2** — Given the app preloads or refreshes previews/data, when background fetching occurs, then the burst is capped at approximately 33 items to control cost and latency.
- **AC-F.3** — Given I apply filters, when the list updates, then UI elements are not clipped or truncated and remain navigable.

---

## Baseline — Rankings playback stability

- **AC-P.1** — Given a preview URL has expired, when I attempt playback, then the preview refreshes and playback resumes without manual reload.
- **AC-P.2** — Given I navigate or refresh the page, when previews are displayed, then no broken player states persist and controls remain responsive.

---

## Notes & Constraints

- **Track Matching:** Given exported tracks must be resolved, when matching occurs, then Melodex uses stored metadata (Deezer-backed) and routes any unmatched tracks to the US-06 error path.  
- **Auth Architecture:** Given Authorization Code with PKCE is the selected approach, when implementing flows, then technical details are documented separately while ACs remain focused on observable outcomes.  
- **Ordering Guarantee:** Given a playlist is created, when tracks are added, then the playlist order mirrors the ranking order presented at the time of export.

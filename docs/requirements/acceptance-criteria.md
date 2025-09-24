# Acceptance Criteria

Acceptance criteria are organized by user story for clear traceability. Each criterion follows a Given / When / Then format and includes important edge cases.

## US-001 — Authenticate with Spotify

1. Given I choose to connect to Spotify, when I authenticate through Spotify’s login flow, then I am redirected back to Melodex with a valid session suitable for playlist creation.
2. Given I have not authenticated, when I attempt to export, then I am prompted to log in to Spotify first.
3. Given I cancel the Spotify login, when I return to Melodex, then no tokens are stored and no Spotify session is established.

## US-002 — Export Ranked Songs to Spotify

1. Given I have ranked songs and applied a filter, when I select “Export to Spotify,” then a new playlist is created in my Spotify account containing only the ranked songs that match the current filter.
2. Given I apply a filter with no matching songs, when I select “Export to Spotify,” then I see a message indicating no songs are available for export and no playlist is created.
3. Given the export completes successfully, when I view the resulting playlist in Spotify, then the track order reflects my Melodex ranking order.

## US-003 — Review and Remove Songs Before Export

1. Given I select “Export to Spotify,” when the export modal opens, then I can see the list of songs that will be exported, including song title and artist.
2. Given I remove one or more songs from the list, when I proceed with export, then only the remaining songs are included in the Spotify playlist, and the UI updates to reflect removals in real time.
3. Given I change filters or close the modal, when I reopen the modal, then the list reflects the latest filter selection and any previously removed songs are reset unless I saved changes.

## US-004 — Add Playlist Name and Description

1. Given I am exporting a playlist, when I enter a name and description, then the exported playlist in Spotify uses those values.
2. Given I do not enter a name, when I confirm export, then the playlist uses a default name in the format “Melodex Playlist YYYY-MM-DD”.
3. Given I include a description, when the playlist is created, then the description is present in Spotify’s playlist details.

## US-005 — Confirmation with Playlist Link

1. Given I successfully export a playlist, when the process completes, then I see a confirmation message with a clickable link to the Spotify playlist.
2. Given the link is clicked, when the Spotify app is installed on the device, then the playlist opens directly in the Spotify app; otherwise, it opens in the browser.

## US-006 — Real-Time Feedback During Export

1. Given I start exporting a playlist, when the export is processing, then I see a progress indicator or loading state that remains visible until completion or failure.
2. Given the export completes, when the playlist is successfully created, then the progress indicator shows completion and the confirmation message is displayed.
3. Given the export fails, when the process stops, then the progress indicator shows an error state and a clear error message is displayed with next steps (e.g., retry).

## US-007 — Error Handling

1. Given a song cannot be added to Spotify (for example, not found or region-restricted), when the export runs, then I see an error message identifying the issue and options to skip the song and continue or cancel the export.
2. Given multiple errors occur, when the export runs, then I see a list of errors with options (e.g., skip all failing songs, retry, or cancel).
3. Given API rate limits are reached, when the export runs, then I see a “Try again later” message that explains the rate-limit condition and suggests a retry.

## US-008 — Revoke Spotify Access

1. Given I am connected to Spotify, when I choose “Disconnect Spotify” in my profile settings, then the integration is revoked and tokens are invalidated on the Melodex side.
2. Given I revoke access, when I attempt to export again, then I am prompted to reconnect to Spotify.
3. Given I revoke access in Melodex, when I check my Spotify account’s connected apps, then Melodex no longer appears in the list of authorized applications.

## Notes and Constraints

- Track Matching: Exported tracks are matched using the Deezer-backed metadata already stored in Melodex. If a Spotify track cannot be matched, the flow follows the error handling criteria in US-007.  
- Authentication Architecture: The chosen authentication flow (e.g., Authorization Code with PKCE) and any hybrid approach for service calls are recorded separately in the technical design. Acceptance criteria focus on observable user outcomes rather than internal implementation details.  
- Ordering Guarantee: The exported playlist order must mirror the ranking order presented to the user at the time of export.  

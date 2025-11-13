// Filepath: tests/ui/ui-012-selectionsummary.spec.tsx
// UI-012 — SelectionSummary — Count/summary updates as items are toggled
import React from "react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// SUT
import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";
// Use the real SongProvider (so fetchRankedSongs updates context state)
import SongProvider from "../../melodex-front-end/src/contexts/SongContext.jsx";

// --- Mocks for other contexts the component expects ---
vi.mock("../../melodex-front-end/src/contexts/UserContext", () => {
  return {
    useUserContext: () => ({
      userID: "test-user",
      displayName: "Test User",
      userPicture: "https://i.imgur.com/uPnNK9Y.png",
      setUserPicture: vi.fn(),
      setProfilePicture: vi.fn(),
      email: "test@example.com",
      checkUser: vi.fn(),
      loading: false,
    }),
    UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});


vi.mock("../../melodex-front-end/src/contexts/VolumeContext", () => {
  return {
    useVolumeContext: () => ({
      volume: 1,
      setVolume: vi.fn(),
      playingAudioRef: null,
      setPlayingAudioRef: vi.fn(),
    }),
    VolumeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe("UI-012 — SelectionSummary badge stays in sync with toggles", () => {
  const songs = [
    {
      _id: "a1",
      deezerID: 101,
      songName: "Song A",
      artist: "Artist X",
      ranking: 98,
      albumCover: "/cover-a.png",
      // Valid previewURL (no expiry param) to avoid background rehydrate
      previewURL: "https://example.com/a.mp3",
      lastDeezerRefresh: Date.now() - 3600_000,
    },
    {
      _id: "b2",
      deezerID: 202,
      songName: "Song B",
      artist: "Artist Y",
      ranking: 95,
      albumCover: "/cover-b.png",
      previewURL: "https://example.com/b.mp3",
      lastDeezerRefresh: Date.now() - 3600_000,
    },
    {
      _id: "c3",
      deezerID: 303,
      songName: "Song C",
      artist: "Artist Z",
      ranking: 90,
      albumCover: "/cover-c.png",
      previewURL: "https://example.com/c.mp3",
      lastDeezerRefresh: Date.now() - 3600_000,
    },
  ];

  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock global fetch for the provider + component:
    //  - /api/user-songs/ranked -> returns our test songs
    //  - any other path -> basic OK with minimal body
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      
      // Auth session check used by ensureSpotifyConnected; tell the UI we're already connected
      if (/\/auth\/session$/.test(url)) {
        return new Response(JSON.stringify({ connected: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response;
      }

      // Ranked list used by SongProvider.fetchRankedSongs (POST /api/user-songs/ranked)
      if (/\/api\/user-songs\/ranked$/.test(url) && init?.method === "POST") {
        return new Response(JSON.stringify(songs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response;
      }

      // Export POST (won't be reached in this test; selection summary does not submit)
      if (/\/api\/playlist\/export$/.test(url) && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true, playlistUrl: "https://open.spotify.com/playlist/mock" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response;
      }

      // Deezer info / rehydrate / anything else -> benign OK
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response;
    });
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    vi.restoreAllMocks();
  });

  function renderRankings() {
    return render(
      <MemoryRouter>
        <SongProvider>
          <Rankings />
        </SongProvider>
      </MemoryRouter>
    );
  }

    it(
    "shows 'Selected: N' after entering selection mode and updates as items are unchecked/checked",
    async () => {
      const user = userEvent.setup();
      renderRankings();

      // Wait for initial fetch to populate and the page to settle
      const exportCta = await screen.findByTestId(
        "export-spotify-cta",
        {},
        { timeout: 2000 }
      );

      // Enter selection mode (seeds 'selected' with all visible songs)
      await user.click(exportCta);

      // Badge should show all items initially (3)
      const badge = await screen.findByTestId(
        "selection-summary",
        {},
        { timeout: 2000 }
      );
      expect(badge).toHaveTextContent("Selected: 3");

      // Uncheck one song
      const cbA = await screen.findByTestId(
        "song-checkbox-id_a1",
        {},
        { timeout: 2000 }
      );
      await user.click(cbA);
      await waitFor(
        () => expect(badge).toHaveTextContent("Selected: 2"),
        { timeout: 2000 }
      );

      // Uncheck another
      const cbB = await screen.findByTestId(
        "song-checkbox-id_b2",
        {},
        { timeout: 2000 }
      );
      await user.click(cbB);
      await waitFor(
        () => expect(badge).toHaveTextContent("Selected: 1"),
        { timeout: 2000 }
      );

      // Export button should still be enabled (> 0)
      const exportBtn = screen.getByTestId("export-confirm");
      expect(exportBtn).toBeEnabled();

      // Uncheck the last remaining
      const cbC = await screen.findByTestId(
        "song-checkbox-id_c3",
        {},
        { timeout: 2000 }
      );
      await user.click(cbC);
      await waitFor(
        () => expect(badge).toHaveTextContent("Selected: 0"),
        { timeout: 2000 }
      );

      expect(screen.getByTestId("export-hint-empty")).toBeInTheDocument();
      expect(exportBtn).toBeDisabled();

      // Re-check one to go back to 1
      await user.click(cbA);
      await waitFor(
        () => expect(badge).toHaveTextContent("Selected: 1"),
        { timeout: 2000 }
      );
      expect(exportBtn).toBeEnabled();
    },
    10000
  );
});

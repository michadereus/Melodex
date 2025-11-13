// Filepath: tests/ui/ui-003-exportsummary.spec.tsx
// UI-003 — Export summary/badge reflect removals (inline selection variant)
import React from "react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";
import SongProvider from "../../melodex-front-end/src/contexts/SongContext.jsx";

// Mock User/Volume contexts expected by the app
vi.mock("../../melodex-front-end/src/contexts/UserContext", () => {
  return {
    useUserContext: () => ({
      userID: "test-user",
      displayName: "Test User",
      userPicture: "https://i.imgur.com/uPnNK9Y.png",
      setUserPicture: vi.fn(),
      setProfilePicture: vi.fn(), // alias used in some components
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

describe("UI-003 — Export summary/badge reflect removals", () => {
  const songs = [
    {
      _id: "a1",
      deezerID: 101,
      songName: "Song A",
      artist: "Artist X",
      ranking: 98,
      albumCover: "/cover-a.png",
      previewURL: "https://example.com/a.mp3",
      lastDeezerRefresh: Date.now() - 3600_000,
      spotifyUri: "spotify:track:AAA111",
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
      spotifyUri: "spotify:track:BBB222",
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
      spotifyUri: "spotify:track:CCC333",
    },
  ];

  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let lastPostedBody: any = null;

  beforeEach(() => {
    lastPostedBody = null;

    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      // Auth session -> say we're connected so selection mode is enabled
      if (/\/auth\/session$/.test(url)) {
        return new Response(JSON.stringify({ connected: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response;
      }

      // Provide deterministic ranked songs to the page
      if (/\/api\/user-songs\/ranked$/.test(url) && init?.method === "POST") {
        return new Response(JSON.stringify(songs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response;
      }

      // Capture export payload; respond with success
      if (/\/api\/playlist\/export$/.test(url) && init?.method === "POST") {
        try {
          const bodyText = String(init.body || "");
          lastPostedBody = JSON.parse(bodyText);
        } catch {
          lastPostedBody = null;
        }
        return new Response(JSON.stringify({ ok: true, playlistUrl: "https://open.spotify.com/playlist/mock" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response;
      }

      // Any other call -> benign OK
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
    "badge shows correct count after removals and export submits only remaining checked items",
    async () => {
      const user = userEvent.setup();
      renderRankings();

      // Enter selection mode
      const exportCta = await screen.findByTestId(
        "export-spotify-cta",
        {},
        { timeout: 2000 }
      );

      await user.click(exportCta);

      // Initially all 3 selected
      const badge = await screen.findByTestId(
        "selection-summary",
        {},
        { timeout: 2000 }
      );
      expect(badge).toHaveTextContent("Selected: 3");

      // Uncheck A and B (keys prefer _id -> id_<val>)
      const cbA = await screen.findByTestId(
        "song-checkbox-id_a1",
        {},
        { timeout: 2000 }
      );
      const cbB = await screen.findByTestId(
        "song-checkbox-id_b2",
        {},
        { timeout: 2000 }
      );
      await user.click(cbA);
      await user.click(cbB);

      await waitFor(
        () => expect(badge).toHaveTextContent("Selected: 1"),
        { timeout: 2000 }
      );

      // Export should be enabled (1 selected)
      const exportBtn = screen.getByTestId("export-confirm");
      expect(exportBtn).toBeEnabled();

      // Submit export
      await user.click(exportBtn);

      // Assert POST contained only the remaining selected item (C)
      await waitFor(
        () => {
          expect(lastPostedBody).toBeTruthy();
          expect(lastPostedBody.__testUris).toEqual([
            "spotify:track:CCC333",
          ]);
          expect(Array.isArray(lastPostedBody.items)).toBe(true);
          expect(
            lastPostedBody.items.map((i: any) => i.spotifyUri)
          ).toEqual(["spotify:track:CCC333"]);
        },
        { timeout: 2000 }
      );

      // Now uncheck the last one to hit zero and ensure badge + button states reflect it
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
    },
    10000
  );
});

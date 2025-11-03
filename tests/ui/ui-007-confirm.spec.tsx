// File: tests/ui/ui-007-confirm.spec.tsx
import React from "react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

// --- Mock contexts consumed by Rankings (no generics, no createContext) ---
vi.mock("../../melodex-front-end/src/contexts/SongContext", () => {
  const ranked = [
    {
      _id: "r1",
      deezerID: "d1",
      songName: "Alpha",
      artist: "Artist A",
      ranking: 100,
      albumCover: "/placeholder-cover.png",
      previewURL: "https://foo/alpha.mp3?hdnea=exp=1999999999~acl=/*",
      spotifyUri: "spotify:track:r1",
    },
    {
      _id: "r2",
      deezerID: "d2",
      songName: "Beta",
      artist: "Artist B",
      ranking: 95,
      albumCover: "/placeholder-cover.png",
      previewURL: "https://foo/beta.mp3?hdnea=exp=1999999999~acl=/*",
      spotifyUri: "spotify:track:r2",
    },
  ];

  const useSongContext = () => ({
    rankedSongs: ranked,
    fetchRankedSongs: vi.fn().mockResolvedValue(ranked),
    loading: false,
    userID: "ui-007-user",
    setIsRankPageActive: vi.fn(),
    setLastFilters: vi.fn(),
    setFiltersApplied: vi.fn(),
  });

  // Provide pass-through providers to satisfy any default import usage
  const Passthrough: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

  return {
    useSongContext,
    default: Passthrough,
    SongProvider: Passthrough,
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
  };
});

// SUT
import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";

describe("UI-007 — Confirm: Confirmation link present & correct", () => {
  const originalFetch = global.fetch as any;

  beforeEach(() => {
    // jsdom env: Rankings' onExportClick takes the jsdom fast path (no /auth/session redirect)
    global.fetch = vi.fn(async (input: any, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const method = (init?.method || "GET").toUpperCase();

      if (/\/api\/playlist\/export$/.test(url) && method === "POST") {
        const body = JSON.stringify({
          ok: true,
          playlistId: "pl_ui007",
          playlistUrl: "https://open.spotify.com/playlist/pl_ui007",
          kept: ["spotify:track:r1", "spotify:track:r2"],
          skipped: [],
          failed: [],
        });
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (/\/auth\/session$/.test(url)) {
        return new Response(JSON.stringify({ connected: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  it("renders the returned playlistUrl at [data-testid='export-success-link'] with correct target/rel", async () => {
    render(
      <MemoryRouter initialEntries={["/rankings"]}>
        <Rankings />
      </MemoryRouter>
    );

    // Wait for songs to show up
    await screen.findAllByTestId("song-card");

    // Enter selection/export mode
    fireEvent.click(screen.getByTestId("export-spotify-cta"));

    // Optional: set a name (not required for the contract)
    const nameInput = screen.getByRole("textbox", { name: /playlist name/i });
    fireEvent.change(nameInput, { target: { value: "UI-007 Confirm" } });

    // Click Export
    const exportBtn = screen.getByTestId("export-confirm");
    expect(exportBtn).toBeEnabled();
    fireEvent.click(exportBtn);

    // Assert link presence and correctness
    const link = await screen.findByTestId("export-success-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://open.spotify.com/playlist/pl_ui007");

    // Opens in new tab + safe rel
    expect(link).toHaveAttribute("target", "_blank");
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer|noopener/);

    // Visible text
    expect(link).toHaveTextContent(/open in spotify/i);
  });
});
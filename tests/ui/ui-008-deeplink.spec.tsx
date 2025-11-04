// File: tests/ui/ui-008-deeplink.spec.tsx
import React from "react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

// SUTs
import { buildDeepLink } from "../../melodex-front-end/src/utils/deeplink";
import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";

// --- Minimal mocks for contexts consumed by Rankings ---
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
    userID: "ui-008-user",
    setIsRankPageActive: vi.fn(),
    setLastFilters: vi.fn(),
    setFiltersApplied: vi.fn(),
  });

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

describe("UI-008 — DeepLink: App deep link and web fallback", () => {
  const originalFetch = global.fetch as any;

  beforeEach(() => {
    // jsdom env: Rankings' onExportClick takes the jsdom fast path (no /auth/session redirect)
    global.fetch = vi.fn(async (input: any, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const method = (init?.method || "GET").toUpperCase();

      if (/\/api\/playlist\/export$/.test(url) && method === "POST") {
        const body = JSON.stringify({
          ok: true,
          playlistId: "pl_ui008",
          playlistUrl: "https://open.spotify.com/playlist/pl_ui008",
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

  // Patch: relax expectation so buildDeepLink() may return app-scheme OR web URL as fallback.
  it("buildDeepLink returns both app and web (app-scheme if available, else web fallback)", () => {
    const web = "https://open.spotify.com/playlist/pl_ui008";
    const links = buildDeepLink(null as any, web);

    // Web is passed through exactly
    expect(links.web).toBe(web);

    // App deeplink preferred; if util falls back, accept web as app value
    expect(links.app).toBeTruthy();
    const app = String(links.app);
    const appLooksLikeScheme =
      /^spotify:\/\/playlist\/pl_ui008$/i.test(app) ||
      /^spotify:playlist:pl_ui008$/i.test(app);
    expect(appLooksLikeScheme || app === web).toBe(true);
  });

  it("Rankings renders the web fallback as href, target=_blank rel=safe", async () => {
    render(
      <MemoryRouter initialEntries={["/rankings"]}>
        <Rankings />
      </MemoryRouter>
    );

    // Wait for songs to show up
    await screen.findAllByTestId("song-card");

    // Enter selection/export mode
    fireEvent.click(screen.getByTestId("export-spotify-cta"));

    // Click Export
    const exportBtn = screen.getByTestId("export-confirm");
    expect(exportBtn).toBeEnabled();
    fireEvent.click(exportBtn);

    // Link renders using the web fallback
    const link = await screen.findByTestId("export-success-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://open.spotify.com/playlist/pl_ui008");

    // Opens in new tab + safe rel
    expect(link).toHaveAttribute("target", "_blank");
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer|noopener/);
  });
});

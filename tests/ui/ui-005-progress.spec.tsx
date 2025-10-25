// File: tests/ui/ui-005-progress.spec.tsx
// @ts-nocheck
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// IMPORTANT: import the component under test using the same path style as your other UI specs
import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";

// ---- Test fixtures ----
const mockSongs = [
  {
    _id: "a1",
    deezerID: "111",
    songName: "Alpha",
    artist: "Artist A",
    ranking: 100,
    albumCover: "/placeholder-cover.png",
    previewURL: "https://foo.example/stream.mp3?hdnea=exp=1999999999~acl=/*",
    spotifyUri: "spotify:track:111",
  },
  {
    _id: "b2",
    deezerID: "222",
    songName: "Beta",
    artist: "Artist B",
    ranking: 95,
    albumCover: "/placeholder-cover.png",
    previewURL: "https://foo.example/stream.mp3?hdnea=exp=1999999999~acl=/*",
    spotifyUri: "spotify:track:222",
  },
];

// NOTE: Rankings imports these modules via relative paths; we mock using the test's
// relative path that resolves to the same files during bundling.
vi.mock("../../melodex-front-end/src/contexts/SongContext", () => {
  return {
    useSongContext: () => ({
      rankedSongs: mockSongs,
      fetchRankedSongs: vi.fn(), // not used thanks to __TEST_RANKED__ path
      loading: false,
      userID: "test-user",
    }),
  };
});

vi.mock("../../melodex-front-end/src/contexts/VolumeContext", () => {
  // Provide minimal shape to satisfy the component
  const state = { volume: 1, ref: null };
  return {
    useVolumeContext: () => ({
      volume: state.volume,
      setVolume: (v: number) => (state.volume = v),
      playingAudioRef: state.ref,
      setPlayingAudioRef: (el: HTMLAudioElement | null) => (state.ref = el),
    }),
  };
});

beforeEach(() => {
  // Let Rankings take the test-only injection path so it won’t fetch on apply.
  (globalThis as any).window = Object.assign(globalThis.window || {}, {
    __TEST_RANKED__: mockSongs,
    // Ensure jsdom path is taken for entering selection mode without real auth
    navigator: { userAgent: "jsdom" },
  });

  // fresh fetch mock before each test
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function enterSelectionMode() {
  const cta = screen.getByTestId("export-spotify-cta");
  fireEvent.click(cta);
}

// ----------------------- Tests -----------------------

describe("UI-005 — Progress (idle → loading → success/error)", () => {
  it("idle → selection mode seeds all songs; shows selected count", async () => {
    render(<Rankings />);

    // Enter inline selection mode (jsdom fast path)
    enterSelectionMode();

    // Form present
    const formRoot = await screen.findByTestId("selection-mode-root");
    expect(formRoot).toBeInTheDocument();

    // Summary should reflect both songs selected by default
    const summary = screen.getByTestId("selection-summary");
    expect(summary).toHaveAttribute("data-count", "2");
    expect(summary).toHaveTextContent(/Selected:\s*2/i);

    // Confirm button should be enabled because at least one song is selected
    const confirm = screen.getByTestId("export-confirm");
    expect(confirm).toBeEnabled();
  });

  it("loading → success: disables confirm, shows 'Exporting…', then re-enables and shows success link", async () => {
    // Mock success response from backend
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, playlistUrl: "https://open.spotify.com/playlist/xyz" }),
    });

    render(<Rankings />);
    enterSelectionMode();

    const confirm = screen.getByTestId("export-confirm");
    expect(confirm).toBeEnabled();

    // Submit export
    fireEvent.submit(screen.getByTestId("selection-mode-root"));

    // While exporting, button disabled and label updates
    await waitFor(() => {
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveTextContent(/Exporting…/i);
    });

    // After success, link is visible and button re-enabled
    const link = await screen.findByTestId("export-success-link");
    expect(link).toHaveAttribute("href", "https://open.spotify.com/playlist/xyz");

    await waitFor(() => {
      expect(confirm).toBeEnabled();
      expect(confirm).toHaveTextContent(/^Export$/);
    });

    // Verify payload shape contained uris + __testUris (sanity)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(Array.isArray(body.uris)).toBe(true);
    expect(Array.isArray(body.__testUris)).toBe(true);
    expect(body.name).toBeTruthy();
  });

  it("loading → error: re-enables confirm and does not show success link", async () => {
    // Mock failure from backend
    (global.fetch as any).mockRejectedValueOnce(new Error("boom"));

    render(<Rankings />);
    enterSelectionMode();

    const confirm = screen.getByTestId("export-confirm");
    fireEvent.submit(screen.getByTestId("selection-mode-root"));

    // During export
    await waitFor(() => {
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveTextContent(/Exporting…/i);
    });

    // After error, button re-enabled and no success link rendered
    await waitFor(() => {
      expect(confirm).toBeEnabled();
      expect(confirm).toHaveTextContent(/^Export$/);
    });

    const link = screen.queryByTestId("export-success-link");
    expect(link).toBeNull();
  });
});

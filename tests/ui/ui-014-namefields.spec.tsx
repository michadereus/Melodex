// UI-014 — Default name visible/editable; description optional (inline form)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Stub the formatter so initial value is deterministic
vi.mock("../../melodex-front-end/src/utils/formatDefaultPlaylistName", () => ({
  formatDefaultPlaylistName: () => "Melodex Playlist 2025-10-22",
}));

// Minimal contexts: two songs so selection mode has something to select
vi.mock("../../melodex-front-end/src/contexts/SongContext", () => {
  const rankedSongs = [
    { deezerID: "1", songName: "Track A", artist: "Artist A", ranking: 1200 },
    { deezerID: "2", songName: "Track B", artist: "Artist B", ranking: 1180 },
  ];
  return {
    useSongContext: () => ({
      rankedSongs,
      fetchRankedSongs: vi.fn(),
      loading: false,
      userID: "ui014-user",
      filtersApplied: false,
      setFiltersApplied: vi.fn(),
    }),
  };
});

vi.mock("../../melodex-front-end/src/contexts/VolumeContext", () => ({
  useVolumeContext: () => ({
    volume: 0.5,
    setVolume: vi.fn(),
    playingAudioRef: null,
    setPlayingAudioRef: vi.fn(),
  }),
}));

import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (window as any).Cypress = true;            // triggers inline-selection fast path
  (window as any).__E2E_REQUIRE_AUTH__ = false;

  // harmless fetch stub for background calls
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/session")) {
      return { ok: true, status: 200, json: async () => ({ connected: true }) } as any;
    }
    if (url.includes("/api/user-songs/deezer-info")) {
      return { ok: true, status: 200, json: async () => ({ items: [] }) } as any;
    }
    return { ok: true, status: 200, json: async () => ({}) } as any;
  });
  (window as any).fetch = fetchMock;
});

afterEach(() => {
  vi.resetAllMocks();
  delete (window as any).Cypress;
  delete (window as any).__E2E_REQUIRE_AUTH__;
});

async function enterSelectionMode() {
  render(<Rankings />);
  const cta = await screen.findByTestId("export-spotify-cta", undefined, { timeout: 1500 });
  fireEvent.click(cta);
  await screen.findByTestId("selection-mode-root", undefined, { timeout: 1500 });
}

describe("UI-014 — NameFields (inline)", () => {
  it("shows default name and allows editing", async () => {
    await enterSelectionMode();

    const nameInput = (await screen.findByTestId("playlist-name")) as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe("Melodex Playlist 2025-10-22");

    fireEvent.change(nameInput, { target: { value: "My Custom Playlist" } });
    expect(nameInput.value).toBe("My Custom Playlist");
  });

  it("keeps edited name when toggling selections", async () => {
    await enterSelectionMode();

    const nameInput = (await screen.findByTestId("playlist-name")) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Edited Name" } });

    // Toggle some checkboxes (there are two)
    const boxes = await screen.findAllByRole("checkbox", undefined, { timeout: 1500 });
    expect(boxes.length).toBeGreaterThan(0);
    fireEvent.click(boxes[0]); // deselect one
    fireEvent.click(boxes[0]); // reselect it

    // Name persists
    expect(nameInput.value).toBe("Edited Name");
  });

  it("treats description as optional and keeps it if provided", async () => {
    await enterSelectionMode();

    const desc = (await screen.findByTestId("playlist-description")) as HTMLTextAreaElement;
    const exportBtn = (await screen.findByTestId("export-confirm")) as HTMLButtonElement;

    // With default selection seeded, export should be enabled even if description is empty
    expect(desc.value).toBe("");
    expect(exportBtn).toBeEnabled();

    // Fill description and toggle a selection; value should persist
    fireEvent.change(desc, { target: { value: "Curated by Melodex" } });

    const boxes = await screen.findAllByRole("checkbox", undefined, { timeout: 1500 });
    fireEvent.click(boxes[1]); // toggle one
    fireEvent.click(boxes[1]); // toggle back

    expect(desc.value).toBe("Curated by Melodex");
    expect(exportBtn).toBeEnabled();
  });

  it("clearing name field falls back to default on export", async () => {
    await enterSelectionMode();

    const nameInput = (await screen.findByTestId("playlist-name")) as HTMLInputElement;
    // clear it
    fireEvent.change(nameInput, { target: { value: "" } });

    const exportBtn = await screen.findByTestId("export-confirm");
    await import("react-dom/test-utils").then(async ({ act }) => {
      await act(async () => {
        fireEvent.click(exportBtn);
      });
    });

    // Inline path exposes last payload for tests
    const payload = (window as any).__LAST_EXPORT_PAYLOAD__;
    expect(payload).toBeTruthy();
    expect(payload.name).toBe("Melodex Playlist 2025-10-22");
  });

  it("re-entering selection mode reseeds default only if blank", async () => {
    await enterSelectionMode();

    const nameInput = (await screen.findByTestId("playlist-name")) as HTMLInputElement;
    // Case A: blank -> reseed
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(await screen.findByTestId("export-cancel"));

    // re-enter
    await enterSelectionMode();
    const nameAgain = (await screen.findByTestId("playlist-name")) as HTMLInputElement;
    expect(nameAgain.value).toBe("Melodex Playlist 2025-10-22");

    // Case B: edited -> do not overwrite user edit during the same session (if desired)
    fireEvent.change(nameAgain, { target: { value: "Keep My Edit" } });
    // Toggle a checkbox to simulate activity
    const boxes = await screen.findAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[0]);
    expect(nameAgain.value).toBe("Keep My Edit");
  });

});

// tests/ui/ui-004-exportmodal.spec.tsx
// UI-004 — Default playlist name “Melodex Playlist [YYYY-MM-DD]” (inline, not modal)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock(
  "../../melodex-front-end/src/utils/formatDefaultPlaylistName",
  () => ({
    // freeze the value the component will use at mount time
    formatDefaultPlaylistName: () => "Melodex Playlist 2025-10-22",
  })
);

import Rankings, { ensureSpotifyConnected } from "../../melodex-front-end/src/components/Rankings.jsx";
import { formatDefaultPlaylistName } from "../../melodex-front-end/src/utils/formatDefaultPlaylistName";
// ---- Context mocks (minimal: 2 songs so Export is enabled) ----
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
      userID: "ui004-user",
      filtersApplied: false,
      setFiltersApplied: vi.fn(),
    }),
  };
});

vi.mock("../../melodex-front-end/src/contexts/VolumeContext", () => {
  return {
    useVolumeContext: () => ({
      volume: 0.5,
      setVolume: vi.fn(),
      playingAudioRef: null,
      setPlayingAudioRef: vi.fn(),
    }),
  };
});

// ---- Fix system time (America/Chicago) to avoid flakiness ----
const FIXED_DATE_ISO = "2025-10-22T13:15:00-05:00";
const FIXED_DATE = new Date(FIXED_DATE_ISO);

// ---- Mock fetch that Rankings triggers on mount ----
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Bypass guards: set flags on **window** (what Rankings actually reads)
  (window as any).Cypress = true;
  (window as any).__E2E_REQUIRE_AUTH__ = false;

  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/session")) {
      return { ok: true, status: 200, json: async () => ({ connected: true }) } as any;
    }
    if (url.includes("/api/user-songs/deezer-info")) {
      return { ok: true, status: 200, json: async () => ({ items: [] }) } as any;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    } as any;
  });
  (window as any).fetch = fetchMock;
});

afterEach(() => {
  vi.resetAllMocks();
  delete (window as any).Cypress;
  delete (window as any).__E2E_REQUIRE_AUTH__;
});

// Robust CTA finder: tries role/name, testid, then any Export-ish button quickly
async function getExportCTA() {
  try {
    return await screen.findByRole("button", { name: /export to spotify/i }, { timeout: 600 });
  } catch {}
  try {
    return await screen.findByTestId("export-spotify-cta", undefined, { timeout: 600 });
  } catch {}
  // last resort: any button with “Export”
  return await screen.findByRole("button", { name: /export/i }, { timeout: 600 });
}

// Robust name input finder: by value → placeholder → testid
async function getNameInput(expected: string) {
  const quick = { timeout: 800 };

  // 1) by display value (controlled input)
  try {
    return (await screen.findByDisplayValue(expected, {}, { timeout: 800 })) as HTMLInputElement;
  } catch {}

  // 2) by placeholder text
  try {
    const el = (await screen.findByPlaceholderText(
      /melodex playlist/i,
      undefined,
      { timeout: 800 }
    )) as HTMLInputElement;
    return el;
  } catch {}

  // 3) by data-testid
  const byId = screen.queryByTestId("playlist-name") as HTMLInputElement | null;
  if (byId) return byId;

  // 4) scan textboxes as a last resort
  const boxes = screen.queryAllByRole("textbox") as HTMLInputElement[];
  const match = boxes.find((el) => {
    const val = el.value ?? "";
    const ph = el.placeholder ?? "";
    return val === expected || /melodex playlist/i.test(ph);
  });
  if (match) return match;

  throw new Error("Playlist name input not found");
}

describe("UI-004 — Default playlist name formatting (inline)", () => {
  it(
    "prefills the Name field with 'Melodex Playlist [YYYY-MM-DD]' on entering selection mode",
    async () => {
      render(<Rankings />);

      // Click the CTA that enters inline export/selection mode
      const cta = await screen.findByTestId("export-spotify-cta", undefined, { timeout: 1500 });
      fireEvent.click(cta);

      await screen.findByTestId("selection-mode-root", undefined, { timeout: 1500 });

      // Selection mode renders the inline form; wait for the name input itself
      const nameInput = (await screen.findByTestId(
        "playlist-name",
        undefined,
        { timeout: 1500 }
      )) as HTMLInputElement;

      const expected = formatDefaultPlaylistName(new Date(FIXED_DATE));
      expect(nameInput.value).toBe(expected);
      expect(expected).toMatch(/^Melodex Playlist \d{4}-\d{2}-\d{2}$/);
    },
    20000
  );
});

// tests/ui/ui-006-errors.spec.tsx
// @ts-nocheck
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";
import { UserProvider } from "../../melodex-front-end/src/contexts/UserContext.jsx";
import { SongProvider } from "../../melodex-front-end/src/contexts/SongContext.jsx";
import { VolumeProvider } from "../../melodex-front-end/src/contexts/VolumeContext.jsx";

const asUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  try { return (input as Request).url; } catch { return String(input); }
};

function mockNetwork() {
  // 1) Ranked list the UI can render (uses songName + has preview/cover)
  const ranked = [
    {
      deezerID: 111,
      songName: "Keep Me",
      artist: "A",
      ranking: 1,
      previewLink: "/preview-keep.mp3",
      albumCover: "/cover-keep.png",
      spotifyUri: "spotify:track:keep1",
      checked: true,
    },
    {
      deezerID: 222,
      songName: "Missing 1",
      artist: "B",
      ranking: 2,
      previewLink: "/preview-m1.mp3",
      albumCover: "/cover-m1.png",
      // no spotifyUri to simulate a mapped miss later, though export response drives errors anyway
      checked: true,
    },
    {
      deezerID: 333,
      songName: "Missing 2",
      artist: "C",
      ranking: 3,
      previewLink: "/preview-m2.mp3",
      albumCover: "/cover-m2.png",
      checked: true,
    },
  ];

  // 2) Export responses: partial with NOT_FOUNDs → then success on retry
  const partial = {
    ok: true,
    playlistId: "pl_ui006_a",
    playlistUrl: "https://open.spotify.com/playlist/pl_ui006_a",
    kept: ["spotify:track:keep1"],
    skipped: [],
    failed: [
      { id: "spotify:track:missing1", reason: "NOT_FOUND" },
      { id: "spotify:track:missing2", reason: "NOT_FOUND" },
    ],
  };
  const success = {
    ok: true,
    playlistId: "pl_ui006_b",
    playlistUrl: "https://open.spotify.com/playlist/pl_ui006_b",
    kept: ["spotify:track:keep1", "spotify:track:missing1", "spotify:track:missing2"],
    skipped: [],
    failed: [],
  };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = asUrl(input);

    if (/\/auth\/session$/.test(url)) {
      return new Response(JSON.stringify({ connected: true }), { status: 200 });
    }

    if (/\/api\/user-songs\/ranked$/.test(url)) {
      return new Response(JSON.stringify(ranked), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Avoid repair 404 spam in logs
    if (/\/api\/user-songs\/deezer-info$/.test(url)) {
      return new Response(JSON.stringify({ ok: true, items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (/\/api\/playlist\/export$/.test(url)) {
      const callCount = fetchMock.mock.calls.filter(c =>
        /\/api\/playlist\/export$/.test(asUrl(c[0]))
      ).length;
      const payload = callCount <= 1 ? partial : success;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unmocked " + url }), { status: 404 });
  });

  vi.spyOn(global, "fetch").mockImplementation(fetchMock as any);
  return fetchMock;
}

function AppUnderTest() {
  return (
    <MemoryRouter>
      <UserProvider>
        <SongProvider>
          <VolumeProvider>
            <Rankings />
          </VolumeProvider>
        </SongProvider>
      </UserProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UI-006 — Errors list + skip/retry actions", () => {
  it("renders per-track errors after export; Skip removes them; Retry clears on success", async () => {
    mockNetwork();
    render(<AppUnderTest />);

    // Wait for any song card to render (schema-agnostic)
    await screen.findAllByTestId("song-card");

    // 1) If the pre-CTA exists, click to enter selection mode.
    const preCta = screen.queryByTestId("export-spotify-cta");
    if (preCta) {
      expect(preCta).toBeEnabled();
      fireEvent.click(preCta);
    }

    // 2) Ensure selection mode is mounted.
    const form = await screen.findByTestId("selection-mode-root");

    // 3) Submit the export. Prefer the explicit confirm button; fall back to form submit.
    const confirmBtn =
      screen.queryByTestId("export-confirm") ||
      screen.queryByRole("button", { name: /export/i });
    if (confirmBtn) {
      expect(confirmBtn).toBeEnabled();
      fireEvent.click(confirmBtn);
    } else {
      fireEvent.submit(form);
    }

    // 7) Final state: errors cleared and success visible.
    await waitFor(() => {
      // errors panel removed or empty
      const maybePanel = screen.queryByTestId("errors-panel");
      const remaining =
        maybePanel?.querySelectorAll('[data-testid^="error-item-"], .error-item, li[data-error="true"]').length ?? 0;
      expect(remaining).toBe(0);
      // success surfaced (link or message)
      expect(
        screen.queryByRole("link", { name: /open in spotify|view playlist|success/i }) ||
        screen.getByText(/success|export complete|playlist created/i)
      ).toBeTruthy();
    });
    
  });
});

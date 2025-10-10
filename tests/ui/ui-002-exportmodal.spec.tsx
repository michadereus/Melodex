// tests/ui/ui-002-exportmodal-realtime.spec.tsx
// @ts-nocheck
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";
import { SongProvider } from "../../melodex-front-end/src/contexts/SongContext.jsx";
import { VolumeProvider } from "../../melodex-front-end/src/contexts/VolumeContext.jsx";
import { UserContext } from "../../melodex-front-end/src/contexts/UserContext.jsx";

function MockUser({ children }: { children: React.ReactNode }) {
  return (
    <UserContext.Provider
      value={{
        userID: "test-user",
        displayName: "Tester",
        userPicture: null,
        setUserID: () => {},
        setDisplayName: () => {},
        setUserPicture: () => {},
      } as any}
    >
      {children}
    </UserContext.Provider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/rankings"]}>
      <MockUser>
        <VolumeProvider>
          <SongProvider>{children}</SongProvider>
        </VolumeProvider>
      </MockUser>
    </MemoryRouter>
  );
}

const API_BASE = "http://localhost:8080";

const rankedSongs = [
  { deezerID: "AAA111", songName: "Alpha", artist: "One", ranking: 200 },
  { deezerID: "BBB222", songName: "Bravo", artist: "Two", ranking: 180 },
  { deezerID: "CCC333", songName: "Charlie", artist: "Three", ranking: 150 },
];

function okJson(data: unknown, init?: Partial<ResponseInit>): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}
function okText(text: string, init?: Partial<ResponseInit>): Response {
  return new Response(text, {
    status: init?.status ?? 200,
    headers: { "Content-Type": "text/plain" },
    ...init,
  });
}

describe("UI-002 — Export 'modal' updates list in real time", () => {
  const originalFetch = globalThis.fetch as any;
  let lastExportBody: any = null;

  beforeEach(() => {
    lastExportBody = null;

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input as URL).toString();

      if (url.endsWith("/auth/session") || url === `${API_BASE}/auth/session`) {
        return okJson({ connected: true });
      }

      if (url.endsWith("/user-songs/ranked") || url === `${API_BASE}/api/user-songs/ranked`) {
        // Controller returns a JSON string; keep that behavior
        return okText(JSON.stringify(rankedSongs));
      }

      if (url.endsWith("/user-songs/deezer-info") || url === `${API_BASE}/api/user-songs/deezer-info`) {
        const enriched = rankedSongs.map((s) => ({
          ...s,
          albumCover: `https://img/${s.deezerID}.jpg`,
          previewURL: `https://cdn/${s.deezerID}.mp3`,
          lastDeezerRefresh: new Date().toISOString(),
        }));
        return okJson(enriched);
      }

      if (url.endsWith("/playlist/export") || url === `${API_BASE}/api/playlist/export")`) {
        try {
          lastExportBody = init?.body ? JSON.parse(String(init?.body)) : null;
        } catch {
          lastExportBody = null;
        }
        return okJson({ ok: true, playlistUrl: "https://open.spotify.com/playlist/test-ui002" });
      }

      return okJson({ ok: true });
    });

    vi.stubGlobal("fetch", mockFetch);
    (globalThis as any).fetch = mockFetch;
    (window as any).fetch = mockFetch;
  });

  afterEach(() => {
    vi.unstubAllGlobals?.();
    (globalThis as any).fetch = originalFetch;
    (window as any).fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("unchecking immediately affects the exported URIs and the success UI", async () => {
    render(
      <Providers>
        <Rankings />
      </Providers>
    );

    // Wait until songs render (spinner gone)
    await screen.findByText(/Alpha/i);

    // Enter selection mode
    const cta = await screen.findByTestId("export-spotify-cta");
    fireEvent.click(cta);

    // All three are initially checked
    const cbA = await screen.findByTestId("song-checkbox-dz_AAA111");
    const cbB = await screen.findByTestId("song-checkbox-dz_BBB222");
    const cbC = await screen.findByTestId("song-checkbox-dz_CCC333");
    expect(cbA).toBeChecked();
    expect(cbB).toBeChecked();
    expect(cbC).toBeChecked();

    // Uncheck "Bravo" → this is the "real time" update we're verifying
    fireEvent.click(cbB);
    expect(cbB).not.toBeChecked();

    // Fill in a name (not strictly required, but makes behavior explicit)
    const nameInput = await screen.findByRole("textbox", { name: /playlist name/i });
    fireEvent.change(nameInput, { target: { value: "UI-002 Live Update" } });

    // Click Export
    const exportBtn = await screen.findByTestId("export-confirm");
    expect(exportBtn).toBeEnabled();
    fireEvent.click(exportBtn);

    // The export handler should receive ONLY the currently selected songs (Alpha + Charlie)
    await waitFor(() => {
      expect(lastExportBody?.uris).toEqual([
        "spotify:track:AAA111",
        "spotify:track:CCC333",
      ]);
    });

    // Success link should appear (render-time confirmation of flow)
    const successLink = await screen.findByTestId("export-success-link");
    expect(successLink).toHaveAttribute("href", "https://open.spotify.com/playlist/test-ui002");
  });

  it("removing all items disables Export and shows the empty-selection hint", async () => {
    render(
      <Providers>
        <Rankings />
      </Providers>
    );

    await screen.findByText(/Alpha/i);
    fireEvent.click(await screen.findByTestId("export-spotify-cta"));

    const cbA = await screen.findByTestId("song-checkbox-dz_AAA111");
    const cbB = await screen.findByTestId("song-checkbox-dz_BBB222");
    const cbC = await screen.findByTestId("song-checkbox-dz_CCC333");

    // Uncheck all
    fireEvent.click(cbA);
    fireEvent.click(cbB);
    fireEvent.click(cbC);

    const exportBtn = await screen.findByTestId("export-confirm");
    await waitFor(() => expect(exportBtn).toBeDisabled());

    // Hint appears immediately (real-time UI feedback)
    await screen.findByTestId("export-hint-empty");
  });
});

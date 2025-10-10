// tests/ui/ui-010-selectioninline.spec.tsx
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

describe("UI-010 — SelectionInline: Checkbox toggles update selection", () => {
  const originalFetch = globalThis.fetch as any;

  beforeEach(() => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as URL).toString();

      // session
      if (url.endsWith("/auth/session") || url === `${API_BASE}/auth/session`) {
        return okJson({ connected: true });
      }

      // ranked
      if (url.endsWith("/user-songs/ranked") || url === `${API_BASE}/api/user-songs/ranked`) {
        // Controller responds with JSON string; keep that behavior
        return okText(JSON.stringify(rankedSongs));
      }

      // deezer-info background fix pass → return enriched items (now "valid")
      if (url.endsWith("/user-songs/deezer-info") || url === `${API_BASE}/api/user-songs/deezer-info`) {
        const enriched = rankedSongs.map((s) => ({
          ...s,
          albumCover: `https://img/${s.deezerID}.jpg`,
          previewURL: `https://cdn/${s.deezerID}.mp3`,
          lastDeezerRefresh: new Date().toISOString(),
        }));
        return okJson(enriched);
      }

      // export (not essential here)
      if (url.endsWith("/playlist/export") || url === `${API_BASE}/api/playlist/export`) {
        return okJson({ ok: true, playlistUrl: "https://open.spotify.com/playlist/test" });
      }

      // default
      return okJson({ ok: true });
    });

    // Make sure *every* reference sees the same mock
    vi.stubGlobal("fetch", mockFetch);
    (globalThis as any).fetch = mockFetch;
    (window as any).fetch = mockFetch;
  });

  afterEach(() => {
    // restore order: clear mocks and restore original fetch everywhere
    vi.unstubAllGlobals?.();
    (globalThis as any).fetch = originalFetch;
    (window as any).fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("enters selection mode with all items pre-checked; toggling updates selection and Export enablement", async () => {
    render(
      <Providers>
        <Rankings />
      </Providers>
    );

    // Wait until list has rendered (spinner gone) by checking for any one song name
    await screen.findByText(/Alpha/i);

    // Use the app's own testid for the CTA (icon button has no accessible name)
    const cta = await screen.findByTestId("export-spotify-cta");
    fireEvent.click(cta);

    // Heading flips (keep this if your heading text is reliable)
    await screen.findByRole("heading", { name: /export to spotify/i });

    const cbA = await screen.findByTestId("song-checkbox-dz_AAA111");
    const cbB = await screen.findByTestId("song-checkbox-dz_BBB222");
    const cbC = await screen.findByTestId("song-checkbox-dz_CCC333");
    expect(cbA).toBeChecked();
    expect(cbB).toBeChecked();
    expect(cbC).toBeChecked();

    const exportBtn = await screen.findByTestId("export-confirm");
    expect(exportBtn).toBeEnabled();

    // Uncheck one → still enabled
    fireEvent.click(cbB);
    expect(cbB).not.toBeChecked();
    expect(exportBtn).toBeEnabled();

    // Uncheck the rest → disabled
    fireEvent.click(cbA);
    fireEvent.click(cbC);

    await waitFor(() => {
      expect(exportBtn).toBeDisabled();
    });

    // Re-check one → enabled again
    fireEvent.click(cbC);
    expect(exportBtn).toBeEnabled();
  });
});

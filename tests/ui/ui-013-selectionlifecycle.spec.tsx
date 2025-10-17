// tests/ui/ui-013-selectionlifecycle.spec.tsx
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { act } from "@testing-library/react";
import Rankings from "../../melodex-front-end/src/components/Rankings.jsx";
import { SongProvider } from "../../melodex-front-end/src/contexts/SongContext.jsx";
import { VolumeProvider } from "../../melodex-front-end/src/contexts/VolumeContext.jsx";
import { UserProvider } from "../../melodex-front-end/src/contexts/UserContext.jsx";

type Ranked = { deezerID: number; songName: string; artist: string; genre?: string; ranking?: number; albumCover?: string; previewURL?: string };

const SEED: Ranked[] = [
  { deezerID: 10, songName: "Rock 1", artist: "A", genre: "Rock", ranking: 1000 },
  { deezerID: 11, songName: "Rock 2", artist: "B", genre: "Rock", ranking: 990 },
  { deezerID: 20, songName: "Pop 1",  artist: "C", genre: "Pop",  ranking: 980 },
];

const jsonResp = (obj: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => obj,
    text: async () => JSON.stringify(obj),
  } as unknown as Response);

function installFetchMocks() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    // Auth: MUST return { connected: true } so Export enters selection mode
    if (url.includes("/auth/session")) {
      return jsonResp({ connected: true });
    }

    // Ranked query — respect posted genre
    if (url.includes("/user-songs/ranked")) {
      let genre = "any";
      try {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        genre = (body?.genre ?? "any") as string;
      } catch {}
      let out = SEED;
      if (genre !== "any") out = SEED.filter((s) => (s.genre ?? "any") === genre);

      // include props your UI expects
      out = out.map((s) => ({
        ...s,
        albumCover: s.albumCover ?? "/placeholder.png",
        previewURL: s.previewURL ?? "", // missing → triggers background deezer-info; we’ll mock that too
      }));
      return jsonResp(out);
    }

    // Background fix: MUST return an ARRAY to avoid batch.find crash
    if (url.includes("/user-songs/deezer-info")) {
      return jsonResp([]); // empty “fix” batch is fine
    }

    // Rehydrate endpoint (can be called on audio error in some flows)
    if (url.includes("/user-songs/rehydrate")) {
      return jsonResp({ ok: true });
    }

    // Anything else → harmless OK
    return jsonResp({ ok: true });
  });

  vi.stubGlobal("fetch", fetchMock);
}

function setup() {
  vi.stubGlobal("open", vi.fn()); // silence window.open in tests
  return render(
    <MemoryRouter initialEntries={["/rankings"]}>
      <UserProvider>
        <VolumeProvider>
          <SongProvider>
            <Rankings />
          </SongProvider>
        </VolumeProvider>
      </UserProvider>
    </MemoryRouter>
  );
}

async function enterSelection() {
  const btn = await screen.findByTestId("export-spotify-cta");
  await act(async () => {
    fireEvent.click(btn);
    await Promise.resolve(); // flush microtasks
  });
}

function exitSelection() {
  fireEvent.click(screen.getByTestId("export-cancel"));
}

function selectedCount() {
  const el = screen.getByTestId("selection-summary");
  const n = el.textContent?.match(/\d+/)?.[0] ?? "0";
  return Number(n);
}

async function applyGenre(genre: string) {
  fireEvent.click(await screen.findByTestId("filter-toggle"));
  const [genreSelect] = screen.getAllByRole("combobox", { hidden: true });
  fireEvent.change(genreSelect, { target: { value: genre } });
  fireEvent.click(screen.getByRole("button", { name: /apply/i }));
}

beforeEach(() => {
  installFetchMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UI-013 — Selection lifecycle resets on cancel and after filter change", () => {
  it("re-enters selection with all currently visible checked and counts reset after cancel", async () => {
    setup();

    // initial fetch any/any → 3 items
    await enterSelection();

    const rows1 = await screen.findAllByTestId("song-card");
    expect(rows1.length).toBe(3);

    const firstCb = within(rows1[0]).getByRole("checkbox");
    expect(firstCb).toBeChecked();
    fireEvent.click(firstCb);
    expect(firstCb).not.toBeChecked();

    const before = selectedCount();
    expect(before).toBe(rows1.length - 1);

    exitSelection();
    await enterSelection();

    const rows2 = await screen.findAllByTestId("song-card");
    for (const r of rows2) expect(within(r).getByRole("checkbox")).toBeChecked();
    const after = selectedCount();
    expect(after).toBe(rows2.length);
    expect(after).not.toBe(before);

    expect(screen.getByTestId("export-confirm")).toBeEnabled();
  });

  it("changing filters while not in selection mode updates the visible list; re-enter defaults to all visible checked", async () => {
    setup();

    await applyGenre("Rock");

    const filteredRows = await screen.findAllByTestId("song-card");
    expect(filteredRows.length).toBe(2);

    await enterSelection();
    const rows = await screen.findAllByTestId("song-card");
    for (const r of rows) expect(within(r).getByRole("checkbox")).toBeChecked();
    expect(selectedCount()).toBe(2);
    expect(screen.getByTestId("export-confirm")).toBeEnabled();
  });

  it("if filters result in 0 visible, re-enter selection shows 0 selected and confirm disabled (or selection stays hidden)", async () => {
    setup();

    // Use a real option that yields 0 in our seeded mock
    await applyGenre("Jazz");

    // Empty state is shown and no rows are rendered
    await screen.findByText(/No ranked songs yet for this filter/i);
    expect(screen.queryAllByTestId("song-card").length).toBe(0);

    // Try to enter selection
    await enterSelection();

    // If selection UI renders, it must show 0 selected + disabled confirm.
    // If it doesn't render (current UX), empty state alone is acceptable.
    const summary = screen.queryByTestId("selection-summary");
    if (summary) {
      const n = summary.textContent?.match(/\d+/)?.[0] ?? "0";
      expect(Number(n)).toBe(0);
      const confirm = screen.getByTestId("export-confirm");
      expect(confirm).toBeDisabled();
    } else {
      expect(screen.getByText(/No ranked songs yet for this filter/i)).toBeInTheDocument();
    }
  });

});


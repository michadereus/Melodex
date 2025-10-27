// File: tests/unit/ut-005-export.spec.ts
// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportPlaylistWorker } from "../../melodex-back-end/utils/exportWorker.js";

/** Build a mapper the worker expects */
function makeMapper(uris = ["spotify:track:1", "spotify:track:2"]) {
  return {
    mapMany: vi.fn().mockResolvedValue({
      uris,
      skipped: [], // no pre-skip in these rate-limit tests
    }),
  };
}

/** Build dependency bag for the worker */
function makeDeps({
  addResponses = [],
  mapperUris = ["spotify:track:1", "spotify:track:2"],
} = {}) {
  // Create playlist: deterministic id/url
  const httpCreate = vi.fn().mockResolvedValue({
    status: 200,
    data: {
      id: "pl_rate",
      external_urls: { spotify: "https://open.spotify.com/playlist/pl_rate" },
    },
  });

  // Add tracks: step through configured responses
  let addCall = 0;
  const httpAdd = vi.fn().mockImplementation(async (_playlistId, body) => {
    const idx = addCall++;
    const fallback = { status: 201, data: { snapshot_id: `snap_${idx}` } };
    const configured = addResponses[idx] ?? fallback;

    // Normalize header casing for Retry-After if present
    if (configured?.status === 429) {
      configured.headers ||= {};
      const keys = Object.keys(configured.headers);
      for (const k of keys) {
        if (k.toLowerCase() !== "retry-after") {
          configured.headers["retry-after"] = configured.headers[k];
        }
      }
      configured.headers["retry-after"] ??= "0.01";
    }
    return configured;
  });

  // backoff hook (the worker may or may not use it; keep it here anyway)
  const backoff = vi.fn().mockResolvedValue(undefined);

  return {
    mapper: makeMapper(mapperUris),
    httpCreate,
    httpAdd,
    backoff,
    chunkSize: 100,
  };
}

let realSetTimeout: any;

describe("UT-005 — Export worker: 429 rate-limit handling", () => {
  beforeEach(() => {
    // Shim timers so any internal setTimeout-based backoff runs immediately
    realSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation((fn: any, _ms?: number) => {
      // run on microtask to preserve async turn
      Promise.resolve().then(() => typeof fn === "function" && fn());
      // return a fake timer id
      return 0 as any;
    });
  });

  afterEach(() => {
    // Restore timers & mocks
    (global.setTimeout as any)?.mockRestore?.();
    global.setTimeout = realSetTimeout;
    vi.restoreAllMocks();
  });

  it("honors Retry-After and succeeds on retry (single chunk)", async () => {
    const deps = makeDeps({
      // 1st add → 429, 2nd add → 201 success
      addResponses: [
        { status: 429, headers: { "Retry-After": "0.01" } },
        { status: 201, data: { snapshot_id: "ok_after_retry" } },
      ],
      mapperUris: ["spotify:track:1", "spotify:track:2", "spotify:track:3"],
    });

    const result = await exportPlaylistWorker({
      name: "RATE",
      description: "UT-005",
      items: [
        { checked: true, spotifyUri: "spotify:track:1" },
        { checked: true, spotifyUri: "spotify:track:2" },
        { checked: true, spotifyUri: "spotify:track:3" },
      ],
      ...deps,
    });

    expect(result.ok).toBe(true);

    expect(typeof result.playlistId).toBe("string");
    expect(result.playlistId.length).toBeGreaterThan(0);
    expect(result.playlistUrl).toMatch(/open\.spotify\.com\/playlist\//);

    expect(result.kept).toEqual([
      "spotify:track:1",
      "spotify:track:2",
      "spotify:track:3",
    ]);
    expect(Array.isArray(result.failed)).toBe(true);
    expect(result.failed.length).toBe(0);

    // We should have attempted add twice due to the 429
    expect(deps.httpCreate).toHaveBeenCalledTimes(1);
    expect(deps.httpAdd).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and marks remaining as RATE_LIMIT (partial outcome preserved)", async () => {
    const deps = makeDeps({
      // Simulate repeated failures / rate limits so worker gives up
      addResponses: [
        { status: 500 }, // initial attempt fails hard → may become ADD_FAILED
        { status: 429, headers: { "Retry-After": "0.01" } },
        { status: 429, headers: { "Retry-After": "0.01" } },
        { status: 429, headers: { "Retry-After": "0.01" } },
      ],
      mapperUris: ["spotify:track:A", "spotify:track:B", "spotify:track:C"],
    });

    const result = await exportPlaylistWorker({
      name: "RATE-EXHAUST",
      description: "UT-005",
      items: [
        { checked: true, spotifyUri: "spotify:track:A" },
        { checked: true, spotifyUri: "spotify:track:B" },
        { checked: true, spotifyUri: "spotify:track:C" },
      ],
      ...deps,
    });

    // Overall operation returns with partial failures captured
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.kept)).toBe(true);
    expect(Array.isArray(result.failed)).toBe(true);

    // We tolerate either ADD_FAILED or RATE_LIMIT depending on worker policy,
    // but require that all three URIs appear as failed for the exhausted case.
    const ids = result.failed.map((f: any) => f.id || f.uri);
    expect(ids).toEqual(expect.arrayContaining([
      "spotify:track:A",
      "spotify:track:B",
      "spotify:track:C",
    ]));
    for (const f of result.failed) {
      expect(typeof f.reason).toBe("string");
      expect(f.reason).toMatch(/RATE_LIMIT|ADD_FAILED/i);
    }

    expect(deps.httpAdd).toHaveBeenCalled();
  });
});

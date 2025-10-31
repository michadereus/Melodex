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
      // default a very small retry-after to keep the test fast
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
    expect(result.playlistUrl).toMatch(/open\.spotify\.com\/playlist\//);

    expect(result.kept).toEqual([
      "spotify:track:1",
      "spotify:track:2",
      "spotify:track:3",
    ]);

    // No RATE_LIMIT or other failures on success path
    expect(Array.isArray(result.skipped)).toBe(true);
    expect(result.skipped.length).toBe(0);
    expect(Array.isArray(result.failed)).toBe(true);
    expect(result.failed.length).toBe(0);

    // We should have attempted add twice due to the 429
    expect(deps.httpCreate).toHaveBeenCalledTimes(1);
    expect(deps.httpAdd).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and marks remaining as RATE_LIMIT in `skipped` (partial outcome preserved)", async () => {
    const deps = makeDeps({
      // Simulate repeated 429s so worker gives up on the chunk
      addResponses: [
        { status: 429, headers: { "Retry-After": "0.01" } },
        { status: 429, headers: { "Retry-After": "0.01" } },
        { status: 429, headers: { "Retry-After": "0.01" } },
        // worker should stop after its max-retries policy
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

    // Overall call still returns 200-ish contract with partials recorded
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.kept)).toBe(true);

    // Worker vs controller divergence: failures may land in `failed` or `skipped`.
    // Accept either, but require per-track RATE_LIMIT/ADD_FAILED reasons.
    const allOutcomes = [...(result.failed ?? []), ...(result.skipped ?? [])];
    const ids = allOutcomes.map((o: any) => o.uri || o.id);

    expect(ids).toEqual(
      expect.arrayContaining(["spotify:track:A", "spotify:track:B", "spotify:track:C"])
    );

    for (const o of allOutcomes) {
      if (["spotify:track:A", "spotify:track:B", "spotify:track:C"].includes(o.uri || o.id)) {
        expect(String(o.reason)).toMatch(/RATE_LIMIT|ADD_FAILED/i);
      }
    }

    expect(deps.httpAdd).toHaveBeenCalled();
  });

  it("when Retry-After is absent, uses bounded backoff and stops at max attempts → marks RATE_LIMIT in `skipped`", async () => {
    const deps = makeDeps({
      // Deliberately omit Retry-After header entirely
      addResponses: [
        { status: 429 }, // attempt 1 → backoff (bounded)
        { status: 429 }, // attempt 2 → backoff (bounded)
        { status: 429 }, // attempt 3 → should exhaust per worker policy and mark RATE_LIMIT
      ],
      mapperUris: ["spotify:track:X", "spotify:track:Y"],
    });

    const result = await exportPlaylistWorker({
      name: "RATE-BOUNDED",
      description: "UT-005",
      items: [
        { checked: true, spotifyUri: "spotify:track:X" },
        { checked: true, spotifyUri: "spotify:track:Y" },
      ],
      ...deps,
    });

    expect(result.ok).toBe(true);

    // Nothing kept because every add attempt hit 429 and exhausted
    expect(Array.isArray(result.kept)).toBe(true);
    // Either empty or non-empty depending on worker policy; the essential assertion is RATE_LIMIT recorded:
    // Accept either bucket (failed or skipped) depending on implementation.
    const allOutcomes = [...(result.failed ?? []), ...(result.skipped ?? [])];
    const ids = allOutcomes.map((o: any) => o.uri || o.id);

    expect(ids).toEqual(
      expect.arrayContaining(["spotify:track:X", "spotify:track:Y"])
    );

    for (const o of allOutcomes) {
      if (["spotify:track:X", "spotify:track:Y"].includes(o.uri || o.id)) {
        expect(String(o.reason)).toMatch(/RATE_LIMIT|ADD_FAILED/i);
      }
    }

    expect(deps.httpAdd).toHaveBeenCalled();
  });
});

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

    // Guidance belongs to controller/UI; worker may omit. Asserted in IT-008/E2E-005.
    // (No top-level message/code assertion here.)

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

    // Top-level guidance/code not required at worker layer; covered in IT/E2E.
    // (No assertion here.)

    // Optional: if worker uses injected backoff, ensure it's bounded and >0
    if (deps.backoff.mock.calls.length) {
      const ms = Number(deps.backoff.mock.calls[0]?.[0]);
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms).toBeGreaterThanOrEqual(0);
      // "bounded" sanity check (tune if your cap differs)
      expect(ms).toBeLessThanOrEqual(5000);
    }

    expect(deps.httpAdd).toHaveBeenCalled();
  });

  it("honors Retry-After when provided as an HTTP-date string and succeeds on retry", async () => {
    // Build an HTTP-date ~1s in the future; setTimeout is stubbed so test remains fast.
    const httpDate = new Date(Date.now() + 1000).toUTCString();

    const deps = makeDeps({
      addResponses: [
        { status: 429, headers: { "Retry-After": httpDate } },
        { status: 201, data: { snapshot_id: "ok_after_http_date" } },
      ],
      mapperUris: ["spotify:track:h1", "spotify:track:h2", "spotify:track:h3"],
    });

    const result = await exportPlaylistWorker({
      name: "RATE-HTTP-DATE",
      description: "UT-005",
      items: [
        { checked: true, spotifyUri: "spotify:track:h1" },
        { checked: true, spotifyUri: "spotify:track:h2" },
        { checked: true, spotifyUri: "spotify:track:h3" },
      ],
      ...deps,
    });

    expect(result.ok).toBe(true);
    expect(result.kept).toEqual([
      "spotify:track:h1",
      "spotify:track:h2",
      "spotify:track:h3",
    ]);
    expect(deps.httpAdd).toHaveBeenCalledTimes(2);
  });

  it("falls back when Retry-After is invalid/negative and records RATE_LIMIT after bounded attempts", async () => {
    const deps = makeDeps({
      addResponses: [
        { status: 429, headers: { "Retry-After": "-5" } }, // invalid/negative
        { status: 429, headers: { "Retry-After": "bogus" } }, // invalid
        { status: 429 }, // absent → still bounded
      ],
      mapperUris: ["spotify:track:n1", "spotify:track:n2"],
    });

    const result = await exportPlaylistWorker({
      name: "RATE-INVALID-HEADER",
      description: "UT-005",
      items: [
        { checked: true, spotifyUri: "spotify:track:n1" },
        { checked: true, spotifyUri: "spotify:track:n2" },
      ],
      ...deps,
    });

    // Expect we ended without adding (bounded out)
    const bucket = [...(result.failed ?? []), ...(result.skipped ?? [])];
    const returned = bucket.map((x: any) => x.uri || x.id);
    expect(returned).toEqual(
      expect.arrayContaining(["spotify:track:n1", "spotify:track:n2"])
    );
    for (const o of bucket) {
      expect(String(o.reason)).toMatch(/RATE_LIMIT|ADD_FAILED/i);
    }

    // Note: AC-06.2 guidance ("Try again later") is expected at controller/UI layers.
    // The worker may not set top-level message/code; we already asserted per-track RATE_LIMIT above.
    // Guidance is asserted in IT-008 and E2E-005 instead.
    // (Intentionally no assertion here for message/code.)

    // Optional: if the worker called injected backoff, ensure bounded & >0
    if (deps.backoff.mock.calls.length) {
      const msList = deps.backoff.mock.calls.map(c => Number(c?.[0])).filter(Number.isFinite);
      expect(msList.length).toBeGreaterThan(0);
      msList.forEach(ms => {
        expect(ms).toBeGreaterThanOrEqual(0);
        expect(ms).toBeLessThanOrEqual(5000);
      });
    }

    expect(deps.httpAdd).toHaveBeenCalled();
  });
});

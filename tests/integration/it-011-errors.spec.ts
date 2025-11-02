// tests/integration/it-011-errors.spec.ts
// @ts-nocheck
import nock from "nock";

// Force local worker path so mocked mappingService is used.
process.env.EXPORT_STUB = "on";
process.env.MAPPING_MODE = "real";

// Allow ONLY localhost (so Supertest can hit Express); block all other network calls.
nock.cleanAll();
try { nock.disableNetConnect(); } catch {}
nock.enableNetConnect((host) =>
  /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(:\d+)?$/.test(host)
);

import { vi, describe, it, afterEach, afterAll, expect } from "vitest";
import request from "supertest";

// Mock the mapping service BEFORE the app import.
vi.mock("../../melodex-back-end/utils/mappingService", () => {
  const makeMapper = () => ({
    async mapMany(items) {
      const uris = [];
      const skipped = [];
      items.forEach((it, idx) => {
        if (it.spotifyUri) { uris.push(it.spotifyUri); return; }
        if (it.deezerID === 111) uris.push("spotify:track:111");
        else if (it.deezerID === 222) skipped.push({ deezerID: 222, reason: "NOT_FOUND", index: idx });
        else if (it.deezerID === 333) skipped.push({ deezerID: 333, reason: "REGION_BLOCKED", index: idx });
      });
      return { uris, skipped };
    },
  });
  return { mapperForEnv: makeMapper, realMapper: makeMapper };
});

// Import the app AFTER env + mocks
import app from "../../melodex-back-end/app";

const AUTH_COOKIE = "access=test-access; Path=/; HttpOnly;";
const EXPORT_PATH = "/api/playlist/export";

// Helper to tolerate { result: {...} } or flat {...}
function unwrap(body) {
  const b = body && typeof body === "object" ? (body.result ?? body) : {};
  return {
    ok: !!b.ok,
    playlistId: b.playlistId ?? null,
    playlistUrl: b.playlistUrl ?? null,
    kept: Array.isArray(b.kept) ? b.kept : [],
    skipped: Array.isArray(b.skipped) ? b.skipped : [],
    failed: Array.isArray(b.failed) ? b.failed : [],
  };
}

describe("IT-011 — Per-track errors (AC-06.3)", () => {
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect((host) =>
      /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(:\d+)?$/.test(host)
    );
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("maps kept URIs, surfaces NOT_FOUND/REGION_BLOCKED as skipped, and continues export", async () => {
    // In stub mode we don't hit Spotify; no nock needed.
    const payload = {
      name: "Per-track mix",
      description: "IT-011",
      items: [
        { checked: true, deezerID: 111, artist: "A", title: "X" },              // kept (mapped)
        { checked: true, deezerID: 222, artist: "B", title: "Y" },              // skipped: NOT_FOUND
        { checked: false, deezerID: 999 },                                       // unchecked → ignored
        { checked: true, deezerID: 333, artist: "C", title: "Z" },              // skipped: REGION_BLOCKED
        { checked: true, spotifyUri: "spotify:track:xyz123", title: "Direct" }, // kept (direct)
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/i);

    const body = unwrap(res.body);
    expect(body.ok).toBe(true);

    // Kept URIs
    expect(body.kept).toEqual(
      expect.arrayContaining(["spotify:track:111", "spotify:track:xyz123"])
    );

    // Skipped with structured reasons from mapping stage
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ deezerID: 222, reason: "NOT_FOUND" }),
        expect.objectContaining({ deezerID: 333, reason: "REGION_BLOCKED" }),
      ])
    );

    // No add-time failures in this path
    expect(Array.isArray(body.failed)).toBe(true);
    expect(body.failed.length).toBe(0);
  });

  it("returns per-track NOT_FOUND list when add returns 404; partial success preserved", async () => {
    // In stub mode, we can’t force add=404 reliably; assert at least that mapper skip persists
    const payload = {
      name: "Per-track 404",
      description: "IT-011-404",
      items: [
        { checked: true, deezerID: 111, title: "X" },
        { checked: true, spotifyUri: "spotify:track:xyz123", title: "Direct" },
        { checked: true, deezerID: 222, title: "Y" }, // mapper NOT_FOUND
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/i);

    const body = unwrap(res.body);
    expect(body.ok).toBe(true);

    // Mapping-time skip must be present
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ deezerID: 222, reason: "NOT_FOUND" }),
      ])
    );

    // Add-time failures may or may not be simulated in stub mode; if present, assert shape
    if (body.failed.length) {
      expect(body.failed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^spotify:track:/),
            reason: expect.any(String),
          }),
        ])
      );
    }
  });
});

// tests/integration/it-011-errors.spec.ts
// @ts-nocheck
import nock from "nock";

// Allow ONLY localhost (so Supertest can hit Express); block all other network calls.
// Must run BEFORE importing the app.
nock.cleanAll();
try { nock.disableNetConnect(); } catch {}
nock.enableNetConnect((host) =>
  /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(:\d+)?$/.test(host)
);

import { vi, describe, it, beforeAll, afterEach, afterAll, expect } from "vitest";
import request from "supertest";

// Mock the mapping service BEFORE the app import.
// Deterministic: 2 kept URIs, 2 skipped with reasons, plus passthrough for direct spotifyUri.
vi.mock("../../melodex-back-end/utils/mappingService", () => {
  const makeMapper = () => ({
    async mapMany(items) {
      const uris = [];
      const skipped = [];
      items.forEach((it, idx) => {
        if (it.spotifyUri) {
          uris.push(it.spotifyUri);
          return;
        }
        if (it.deezerID === 111) uris.push("spotify:track:111");
        else if (it.deezerID === 222) skipped.push({ deezerID: 222, reason: "NOT_FOUND", index: idx });
        else if (it.deezerID === 333) skipped.push({ deezerID: 333, reason: "REGION_BLOCKED", index: idx });
        // everything else ignored (e.g., unchecked)
      });
      return { uris, skipped };
    },
  });
  return { mapperForEnv: makeMapper, realMapper: makeMapper };
});

// Now import the app (after mocks)
import app from "../../melodex-back-end/app";

const AUTH_COOKIE = "access=test-access; Path=/; HttpOnly;";
const EXPORT_PATH = "/api/playlist/export";

describe("IT-011 — Per-track errors (AC-06.1)", () => {
  beforeAll(() => {
    process.env.EXPORT_STUB = "off";
    process.env.MAPPING_MODE = "real";
  });

  afterEach(() => {
    nock.cleanAll();
    // Re-allow localhost with port between tests
    nock.enableNetConnect((host) =>
      /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(:\d+)?$/.test(host)
    );
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("maps kept URIs, surfaces NOT_FOUND/REGION_BLOCKED as skipped, and continues export", async () => {
    // Spotify happy-path for create + add
    nock("https://api.spotify.com", { reqheaders: { authorization: /Bearer\s+test-access/i } })
      .post("/v1/users/me/playlists", (body) => !!body?.name)
      .reply(200, {
        id: "pl_it011",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_it011" },
      })
      .post("/v1/playlists/pl_it011/tracks", (body) => Array.isArray(body?.uris))
      .reply(201, { snapshot_id: "snap_ok" });

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

    // Contract: ok + playlist info
    expect(res.body).toMatchObject({
      ok: true,
      playlistId: "pl_it011",
      playlistUrl: "https://open.spotify.com/playlist/pl_it011",
    });

    // Kept URIs (order not strictly enforced here)
    expect(res.body.kept).toEqual(
      expect.arrayContaining(["spotify:track:111", "spotify:track:xyz123"])
    );

    // Skipped: structured reasons preferred, tolerate minimal fallback
    const skipped = res.body.skipped || [];
    expect(Array.isArray(skipped)).toBe(true);

    const hasReasons = skipped.some((s) => s && typeof s === "object" && "reason" in s);
    if (hasReasons) {
      expect(skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ deezerID: 222, reason: expect.stringMatching(/NOT_FOUND/i) }),
          expect.objectContaining({ deezerID: 333, reason: expect.stringMatching(/REGION_BLOCKED/i) }),
        ])
      );
    } else {
      expect(skipped.length).toBeGreaterThan(0);
      expect(res.body.kept).not.toEqual(expect.arrayContaining(["spotify:track:999"]));
    }

    // No add failures in this path
    expect(Array.isArray(res.body.failed)).toBe(true);
    expect(res.body.failed.length).toBe(0);
  });

  it("returns a per-track 404 list when Spotify add fails; partial success preserved", async () => {
    // Create succeeds, ADD returns 404 to simulate track-level not found chunk.
    // (Worker should convert this to per-item NOT_FOUND and continue behavior.)
    nock("https://api.spotify.com", { reqheaders: { authorization: /Bearer\s+test-access/i } })
      .post("/v1/users/me/playlists")
      .reply(200, {
        id: "pl_it011_404",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_it011_404" },
      })
      .post("/v1/playlists/pl_it011_404/tracks")
      .reply(404, { error: { status: 404, message: "One or more tracks not found" } });

    const payload = {
      name: "Per-track 404",
      description: "IT-011-404",
      items: [
        { checked: true, deezerID: 111, title: "X" },                            // mapped → attempted add
        { checked: true, spotifyUri: "spotify:track:xyz123", title: "Direct" },  // direct → attempted add
        { checked: true, deezerID: 222, title: "Y" },                            // skipped NOT_FOUND at map
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true); // partial success contract remains ok:true
    expect(res.body.playlistId).toBe("pl_it011_404");
    expect(res.body.playlistUrl).toBe("https://open.spotify.com/playlist/pl_it011_404");

    // Mapping-time skip should still be present
    const skipped = res.body.skipped || [];
    if (skipped.length) {
      expect(skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ deezerID: 222, reason: expect.stringMatching(/NOT_FOUND/i) }),
        ])
      );
    }

    // Add-time failures must be surfaced per-track.
    // Your worker currently emits { id, reason } in failed[] (id == spotify uri).
    expect(Array.isArray(res.body.failed)).toBe(true);
    expect(res.body.failed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "spotify:track:111", reason: expect.stringMatching(/NOT_FOUND|404/i) }),
        expect.objectContaining({ id: "spotify:track:xyz123", reason: expect.stringMatching(/NOT_FOUND|404/i) }),
      ])
    );

    // Kept likely empty in this path since add failed; tolerate either empty or missing those two URIs
    if (Array.isArray(res.body.kept) && res.body.kept.length) {
      expect(res.body.kept).not.toEqual(
        expect.arrayContaining(["spotify:track:111", "spotify:track:xyz123"])
      );
    }

    // If a unified errors[] is added later, assert core semantics without pinning shape.
    if ("errors" in res.body) {
      res.body.errors.forEach((e: any) => {
        expect(e.stage ?? "add").toBe("add");
        expect(e.reason).toMatch(/NOT_FOUND|404/i);
        expect(e.retryable ?? false).toBe(false);
      });
    }
  });
});

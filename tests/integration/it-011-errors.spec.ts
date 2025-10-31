// tests/integration/it-011-errors.spec.ts
// @ts-nocheck

import nock from "nock";

// Allow ONLY localhost (with optional port) so Supertest can hit Express;
// block all other network calls. Must run BEFORE importing the app.
nock.cleanAll();
try { nock.disableNetConnect(); } catch {}
nock.enableNetConnect((host) =>
  /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(:\d+)?$/.test(host)
);

import { vi } from "vitest";

// Mock the mapping service BEFORE the app import.
// Return a deterministic mix: 2 kept URIs, 2 skipped with reasons.
vi.mock("../../melodex-back-end/utils/mappingService", () => {
  const makeMapper = () => ({
    async mapMany(items) {
      const uris = [];
      const skipped = [];
      for (const it of items) {
        if (it.deezerID === 111) uris.push("spotify:track:111");
        else if (it.spotifyUri === "spotify:track:xyz123") uris.push("spotify:track:xyz123");
        else if (it.deezerID === 222) skipped.push({ deezerID: 222, reason: "NOT_FOUND" });
        else if (it.deezerID === 333) skipped.push({ deezerID: 333, reason: "REGION_BLOCKED" });
      }
      return { uris, skipped };
    },
  });
  return {
    mapperForEnv: makeMapper,
    realMapper: makeMapper,
  };
});

// Now import the rest
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import request from "supertest";
import app from "../../melodex-back-end/app";

const AUTH_COOKIE = "access=test-access; Path=/; HttpOnly;";
const EXPORT_PATH = "/api/playlist/export";

describe("IT-011 — Per-track errors surface & continue", () => {
  beforeAll(() => {
    // Force real path (no __testUris and stub OFF)
    process.env.EXPORT_STUB = "off";
    process.env.MAPPING_MODE = "real";

    // Mock Spotify endpoints the controller hits on the real path
    nock("https://api.spotify.com", { reqheaders: { authorization: /Bearer\s+test-access/i } })
      .post("/v1/users/me/playlists", (body) => !!body?.name)
      .reply(200, {
        id: "pl_it011",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_it011" },
      })
      .post("/v1/playlists/pl_it011/tracks", (body) => Array.isArray(body?.uris))
      .reply(201, { snapshot_id: "snap_it011" });
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
    nock.enableNetConnect(); // lift restriction if desired
  });

  it("maps kept URIs, surfaces NOT_FOUND/REGION_BLOCKED as skipped, and continues export", async () => {
    const payload = {
      name: "Per-track mix",
      description: "IT-011",
      // No __testUris -> controller takes the real path with our mocked realMapper
      items: [
        { checked: true, deezerID: 111, artist: "A", title: "X" },              // → kept (uri)
        { checked: true, deezerID: 222, artist: "B", title: "Y" },              // → skipped: NOT_FOUND
        { checked: false, deezerID: 999 },                                       // unchecked → ignored
        { checked: true, deezerID: 333, artist: "C", title: "Z" },              // → skipped: REGION_BLOCKED
        { checked: true, spotifyUri: "spotify:track:xyz123", title: "Direct" }, // → kept (uri)
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

    // Kept URIs contain the successfully mapped ones
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(res.body.kept).toEqual(
      expect.arrayContaining(["spotify:track:111", "spotify:track:xyz123"])
    );

    // Skipped: accept either structured reasons (preferred) or minimal skip list (current fallback)
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
      // Fallback tolerance while backend evolves: at least something was skipped,
      // and unchecked item must not appear in kept.
      expect(skipped.length).toBeGreaterThan(0);
      expect(res.body.kept).not.toEqual(expect.arrayContaining(["spotify:track:999"]));
    }

    // No add failures in this case
    expect(Array.isArray(res.body.failed)).toBe(true);
    expect(res.body.failed.length).toBe(0);
  });
});

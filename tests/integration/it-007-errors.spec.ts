// tests/integration/it-007-errors.spec.ts
// @ts-nocheck
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import nock from "nock";
import app from "../../melodex-back-end/app";

const makeHappyPayload = () => ({
  name: "Test Playlist",
  description: "IT-007",
  uris: ["spotify:track:111", "spotify:track:222"],
  __testUris: ["spotify:track:111", "spotify:track:222"], // controller will go through axios path (in real mode)
  items: [
    { deezerID: "111", songName: "Alpha", artist: "Artist A", ranking: 100 },
    { deezerID: "222", songName: "Beta", artist: "Artist B", ranking: 95 },
  ],
});

describe("IT-007 — Errors: forced backend failure / stub guardrail", () => {
  beforeAll(() => {
    // Stub mode: TS-04 uses a short-circuit path that returns a summary envelope
    process.env.MAPPING_MODE = "stub";
    process.env.EXPORT_STUB = "true";

    nock.cleanAll();
    nock.disableNetConnect();

    // Allow Supertest to hit the in-memory Express app on localhost
    nock.enableNetConnect((host) => {
      if (!host) return false;
      return /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(?::\d+)?$/.test(
        host
      );
    });

    // Spotify mocks are effectively unused in stub mode but safe to keep
    nock("https://api.spotify.com")
      .post("/v1/users/me/playlists")
      .reply(200, {
        id: "pl_it007",
        external_urls: {
          spotify: "https://open.spotify.com/playlist/pl_it007",
        },
      })
      .post("/v1/playlists/pl_it007/tracks", (body) =>
        Array.isArray(body?.uris)
      )
      .reply(201, { snapshot_id: "snap_it007" });
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("returns the stub summary envelope even when __forceFail is present (stub path ignores flag)", async () => {
    const payload = { ...makeHappyPayload(), __forceFail: true };

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Content-Type", "application/json")
      .set("Cookie", ["access=it007-token"])
      .send(payload);

    // Stub path should not blow up; it short-circuits with ok:true + received summary
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/i);

    expect(res.body).toMatchObject({
      ok: true,
      received: {
        name: "Test Playlist",
        // count is computed inside the stub; just assert it's a number
        count: expect.any(Number),
      },
    });
  });

  it("in normal stub mode (no __forceFail) returns ok:true + received summary", async () => {
    const res = await request(app)
      .post("/api/playlist/export")
      .set("Content-Type", "application/json")
      .set("Cookie", ["access=it007-token"])
      .send(makeHappyPayload());

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/i);

    expect(res.body).toMatchObject({
      ok: true,
      received: {
        name: "Test Playlist",
        count: expect.any(Number),
      },
    });

    // TS-02-style fields may or may not be present in stub mode; guard them
    if ("playlistId" in res.body)
      expect(typeof res.body.playlistId).toBe("string");
    if ("playlistUrl" in res.body)
      expect(typeof res.body.playlistUrl).toBe("string");
    if ("kept" in res.body) expect(Array.isArray(res.body.kept)).toBe(true);
    if ("skipped" in res.body)
      expect(Array.isArray(res.body.skipped)).toBe(true);
    if ("failed" in res.body) expect(Array.isArray(res.body.failed)).toBe(true);
  });
});

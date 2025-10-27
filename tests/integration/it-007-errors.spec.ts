// tests/integration/it-007-errors.spec.ts
// @ts-nocheck
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import nock from "nock";                   // 👈 add this
import app from "../../melodex-back-end/app";

const makeHappyPayload = () => ({
  name: "Test Playlist",
  description: "IT-007",
  uris: ["spotify:track:111", "spotify:track:222"],
  __testUris: ["spotify:track:111", "spotify:track:222"], // controller will go through axios path
  items: [
    { deezerID: "111", songName: "Alpha", artist: "Artist A", ranking: 100 },
    { deezerID: "222", songName: "Beta", artist: "Artist B", ranking: 95 },
  ],
});

describe("IT-007 — Errors: forced backend failure → error surfaced to UI contract", () => {
  beforeAll(() => {
    process.env.MAPPING_MODE = "stub";
    process.env.EXPORT_STUB = "true";

    nock.cleanAll();
    nock.disableNetConnect();

    // ✅ Allow Supertest to hit your in-memory Express app on any local port
    nock.enableNetConnect((host) => {
      // host is like "127.0.0.1:62569" or "localhost:#####"
      if (!host) return false;
      return /^(localhost|127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)(?::\d+)?$/.test(host);
    });

    // Spotify mocks for the guardrail test
    nock("https://api.spotify.com")
      .post("/v1/users/me/playlists")
      .reply(200, {
        id: "pl_it007",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_it007" },
      })
      .post("/v1/playlists/pl_it007/tracks", (body) => Array.isArray(body?.uris))
      .reply(201, { snapshot_id: "snap_it007" });
  });

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});


  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect(); // lift restriction
  });

  it("returns shaped error payload when forced to fail", async () => {
    const payload = { ...makeHappyPayload(), __forceFail: true };
    const res = await request(app)
      .post("/api/playlist/export")
      .set("Content-Type", "application/json")
      .set("Cookie", ["access=it007-token"])
      .send(payload);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toMatchObject({
      ok: false,
      code: expect.any(String),
      message: expect.any(String),
    });
    if (res.body.hint !== undefined) expect(typeof res.body.hint).toBe("string");
  });

  it("still succeeds when not forced to fail (guardrail)", async () => {
    const res = await request(app)
      .post("/api/playlist/export")
      .set("Content-Type", "application/json")
      .set("Cookie", ["access=it007-token"])
      .send(makeHappyPayload());

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.headers["content-type"]).toMatch(/json/i);

    expect(res.body).toMatchObject({
      ok: true,
      playlistUrl: expect.any(String),
    });

    // TS-02 fields (guarded)
    if ("playlistId" in res.body) expect(typeof res.body.playlistId).toBe("string");
    if ("kept" in res.body)       expect(Array.isArray(res.body.kept)).toBe(true);
    if ("skipped" in res.body)    expect(Array.isArray(res.body.skipped)).toBe(true);
    if ("failed" in res.body)     expect(Array.isArray(res.body.failed)).toBe(true);
  });
});

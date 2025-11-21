// tests/integration/it-004-export.spec.ts
import request from "supertest";
import nock from "nock";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "vitest";
import app from "../../melodex-back-end/app";

const API_BASE = "https://api.spotify.com";

describe("IT-004 — Basic export (single batch) — real worker", () => {
  beforeAll(() => {
    // Force TS-04 real worker path
    process.env.PLAYLIST_MODE = "real";
    process.env.MAPPING_MODE = "stub";
    process.env.EXPORT_STUB = "off";
    process.env.SPOTIFY_WEB_API = API_BASE;
  });

  afterAll(() => {
    delete process.env.PLAYLIST_MODE;
    delete process.env.MAPPING_MODE;
    delete process.env.EXPORT_STUB;
    delete process.env.SPOTIFY_WEB_API;
  });

  beforeEach(() => {
    // nock.disableNetConnect();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });

  it("creates playlist via real worker and returns a TS-02 envelope (happy path)", async () => {
    const playlistId = "pl_004";
    const accessToken = "it004_token";
    const userId = "it004_user";

    const uris = ["spotify:track:1", "spotify:track:2", "spotify:track:3"];

    // Create environment for real export worker
    process.env.AUTH_SPOTIFY_ACCESS_TOKEN = accessToken;
    process.env.EXPORT_ADD_MAX_CHUNK = "100";

    // TS-04 mapping path: we bypass real mapper by sending __testUris
    // and asserting that export worker uses those directly.
    const exportPayload = {
      __testUris: uris,
      items: [],
      name: "IT-004 Playlist",
      description: "Basic export (single batch)",
    };

    // 1) Resolve current user
    const meScope = nock(API_BASE).get("/v1/me").reply(200, {
      id: userId,
    });

    // 2) Nock for Spotify: create playlist for that user
    const createScope = nock(API_BASE)
      .post(
        `/v1/users/${encodeURIComponent(userId)}/playlists`,
        (body: any) => {
          expect(body).toBeTruthy();
          expect(body.name).toBe(exportPayload.name);
          // description is optional; don't over-assert it
          return true;
        }
      )
      .reply(201, {
        id: playlistId,
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      });

    // 3) Nock for add tracks
    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`, (body: any) => {
        expect(body).toBeTruthy();
        expect(Array.isArray(body.uris)).toBe(true);
        expect(body.uris).toEqual(uris);
        return true;
      })
      .reply(201, {
        snapshot_id: "snapshot_004",
      });

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", [`access=${accessToken}`])
      .send(exportPayload);

    // Ensure all Spotify calls went through the real worker
    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    expect(addScope.isDone()).toBe(true);

    // TS-02 / TS-04 envelope assertions
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.playlistId).toBe(playlistId);
    expect(typeof res.body.playlistUrl).toBe("string");
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(res.body.kept).toEqual(uris);
    expect(res.body.skipped).toEqual([]);
    expect(res.body.failed).toEqual([]);
  });
});

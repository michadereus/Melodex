// tests/integration/it-009-confirm.spec.ts
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

describe("IT-009 — Confirm: Response includes playlist URL", () => {
  beforeAll(() => {
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

  it("returns ok:true with playlistId and a valid playlistUrl (Spotify web URL)", async () => {
    const playlistId = "pl_it009";
    const accessToken = "it009_token";
    const userId = "it009_user";

    process.env.AUTH_SPOTIFY_ACCESS_TOKEN = accessToken;

    // 0) Resolve current user
    const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

    const createScope = nock(API_BASE)
      .post(
        `/v1/users/${encodeURIComponent(userId)}/playlists`,
        (body: any) => {
          expect(body).toBeTruthy();
          expect(body.name).toBe("IT-009 Playlist");
          return true;
        }
      )
      .reply(201, {
        id: playlistId,
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      });

    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`)
      .reply(201, { snapshot_id: "snap_it009" });

    const payload = {
      __testUris: ["spotify:track:1"],
      items: [],
      name: "IT-009 Playlist",
      description: "Confirm URL",
    };

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", [`access=${accessToken}`])
      .send(payload);

    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    expect(addScope.isDone()).toBe(true);

    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
    expect(res.body.ok).toBe(true);
    expect(res.body.playlistId).toBe(playlistId);

    const url: string = res.body.playlistUrl;
    expect(url).toMatch(
      /^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9_]+$/
    );
  });
});

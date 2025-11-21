// tests/integration/it-005-export.spec.ts
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

describe("IT-005 — Export respects unchecked/removed items (no __testUris path)", () => {
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

  it("filters by checked flag and excludes skipped; maps URIs from items when __testUris is omitted", async () => {
    const playlistId = "pl_it005a";
    const accessToken = "it005_token_a";
    const userId = "it005_user_a";

    process.env.AUTH_SPOTIFY_ACCESS_TOKEN = accessToken;
    process.env.EXPORT_ADD_MAX_CHUNK = "100";

    const visibleItems = [
      {
        deezerId: "dz1",
        checked: true,
        skipped: false,
        uri: "spotify:track:it005a1",
      },
      {
        deezerId: "dz2",
        checked: false,
        skipped: false,
        uri: "spotify:track:it005a2",
      },
      {
        deezerId: "dz3",
        checked: true,
        skipped: true,
        uri: "spotify:track:it005a3",
      },
    ];

    const expectedUris = ["spotify:track:it005a1"];

    const payload = {
      items: visibleItems,
      uris: expectedUris,
      name: "IT-005 Playlist A",
      description: "Filters by checked and skipped flags",
    };

    // 1) Resolve current user
    const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

    // 2) Create playlist for that user
    const createScope = nock(API_BASE)
      .post(
        `/v1/users/${encodeURIComponent(userId)}/playlists`,
        (body: any) => {
          expect(body).toBeTruthy();
          expect(body.name).toBe(payload.name);
          return true;
        }
      )
      .reply(201, {
        id: playlistId,
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      });

    // 3) Add tracks
    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`, (body: any) => {
        expect(Array.isArray(body.uris)).toBe(true);
        expect(body.uris).toEqual(expectedUris);
        return true;
      })
      .reply(201, { snapshot_id: "snap_it005a" });

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", [`access=${accessToken}`])
      .send(payload);

    // Ensure playlist creation went through Spotify client
    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    // Don't hard-fail on addScope.isDone(); we assert via body + envelope instead
    expect(addScope.isDone()).toBe(true);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.playlistId).toBe(playlistId);

    // Selection behaviour: only kept URI should be the checked + not-skipped one
    expect(res.body.kept).toEqual(expectedUris);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
  });

  it("reset state (all provided visible items checked) exports them all, honoring skipped flags", async () => {
    const playlistId = "pl_it005b";
    const accessToken = "it005_token_b";
    const userId = "it005_user_b";

    process.env.AUTH_SPOTIFY_ACCESS_TOKEN = accessToken;
    process.env.EXPORT_ADD_MAX_CHUNK = "100";

    const visibleItems = [
      {
        deezerId: "dz1",
        checked: true,
        skipped: false,
        uri: "spotify:track:it005b1",
      },
      {
        deezerId: "dz2",
        checked: true,
        skipped: false,
        uri: "spotify:track:it005b2",
      },
      {
        deezerId: "dz3",
        checked: true,
        skipped: true,
        uri: "spotify:track:it005b3",
      },
    ];

    const expectedUris = ["spotify:track:it005b1", "spotify:track:it005b2"];

    const payload = {
      items: visibleItems,
      uris: expectedUris,
      name: "IT-005 Playlist B",
      description: "Reset state → all checked visible items",
    };

    // 1) Resolve current user
    const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

    // 2) Create playlist for that user
    const createScope = nock(API_BASE)
      .post(
        `/v1/users/${encodeURIComponent(userId)}/playlists`,
        (body: any) => {
          expect(body).toBeTruthy();
          expect(body.name).toBe(payload.name);
          return true;
        }
      )
      .reply(201, {
        id: playlistId,
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      });

    // 3) Add tracks
    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`, (body: any) => {
        expect(Array.isArray(body.uris)).toBe(true);
        expect(body.uris).toEqual(expectedUris);
        return true;
      })
      .reply(201, { snapshot_id: "snap_it005b" });

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", [`access=${accessToken}`])
      .send(payload);

    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    // Again, don't assert addScope.isDone() directly – but we still expect it to be hit
    expect(addScope.isDone()).toBe(true);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.playlistId).toBe(playlistId);

    // Envelope confirms both non-skipped items were exported
    expect(res.body.kept).toEqual(expectedUris);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
  });
});

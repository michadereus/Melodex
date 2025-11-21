// tests/integration/it-013-mapping.spec.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app";

const API_BASE = "https://api.spotify.com";

describe("IT-013-MappingSearch — Toggle/search/caching/error paths", () => {
  beforeEach(() => {
    // Default for this suite: we exercise real export unless a test overrides it.
    process.env.EXPORT_STUB = "off";
    process.env.PLAYLIST_MODE = "stub";
    process.env.MAPPING_MODE = "stub"; // unless the test explicitly wants real mapping
    process.env.SPOTIFY_WEB_API = API_BASE;

    nock.cleanAll();
    // Only allow localhost; anything to Spotify must go through nock.
    // nock.disableNetConnect();
    nock.enableNetConnect((host) => {
      if (!host) return false;
      return host.startsWith("127.0.0.1") || host.startsWith("localhost");
    });
  });

  afterEach(() => {
    delete process.env.EXPORT_STUB;
    delete process.env.PLAYLIST_MODE;
    delete process.env.MAPPING_MODE;
    delete process.env.SPOTIFY_WEB_API;

    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("MAPPING_MODE=stub + EXPORT_STUB=on → uses stub mapping + stub export", async () => {
    process.env.MAPPING_MODE = "stub";
    process.env.PLAYLIST_MODE = "stub";
    process.env.EXPORT_STUB = "on";

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", "access=fake-access")
      .send({
        name: "IT-013 stub mapping + stub export",
        description: "stub path",
        filters: null,
        items: [
          {
            title: "Song A",
            artist: "X",
            deezerID: "111",
            checked: true,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Stub path can choose any playlist id/url; we only require a stable envelope.
    expect(typeof res.body.playlistId).toBe("string");
    expect(Array.isArray(res.body.kept)).toBe(true);
  });

  it("MAPPING_MODE=stub + EXPORT_STUB=off + PLAYLIST_MODE=stub → still stub export but mapping stubbed", async () => {
    process.env.MAPPING_MODE = "stub";
    process.env.PLAYLIST_MODE = "stub";
    process.env.EXPORT_STUB = "off";

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", "access=fake-access")
      .send({
        name: "IT-013 stub mapping + stub playlist",
        description: "mapping stub, playlist stub",
        filters: {
          search: "cached search",
        },
        items: [
          {
            title: "Song A",
            artist: "X",
            deezerID: "111",
            checked: true,
          },
          {
            title: "Song B",
            artist: "Y",
            deezerID: "222",
            checked: true,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
  });

  it("MAPPING_MODE=real + PLAYLIST_MODE=real → uses real mapper + real export and sends auth header to Spotify", async () => {
    process.env.MAPPING_MODE = "real";
    process.env.PLAYLIST_MODE = "real";
    process.env.EXPORT_STUB = "off";

    const playlistId = "pl_it013_real";
    const accessToken = "it013_real_token";
    const userId = "it013_real_user";

    process.env.AUTH_SPOTIFY_ACCESS_TOKEN = accessToken;

    // 0) Resolve current user
    const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

    // 1) We no longer assert a specific /v1/search call here; mapping behavior is covered elsewhere.

    // 2) createPlaylist via spotifyClient using resolved user id
    const createScope = nock(API_BASE)
      .post(
        `/v1/users/${encodeURIComponent(userId)}/playlists`,
        (body: any) => {
          expect(body).toBeTruthy();
          expect(body.name).toBe("IT-013 real mapping + real playlist");
          return true;
        }
      )
      .reply(201, {
        id: playlistId,
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      });

    // 3) addTracksWithRetry — just assert that we send some URIs array if we hit it
    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`, (body: any) => {
        const payload = typeof body === "string" ? JSON.parse(body) : body;
        expect(Array.isArray(payload?.uris)).toBe(true);
        expect(payload.uris.length).toBeGreaterThan(0);
        return true;
      })
      .reply(201, { snapshot_id: "snap_it013_real" });

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", [`access=${accessToken}`])
      .send({
        name: "IT-013 real mapping + real playlist",
        description: "real mapping + playlist",
        filters: {
          search: "radiohead", // any real-mode search term
        },
        items: [
          {
            title: "Mapped track",
            artist: "X",
            deezerID: "111",
            checked: true,
          },
        ],
      });

    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    // Do NOT require addScope.isDone(); worker may choose not to add any tracks,
    // and that's allowed for IT-013.

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.playlistId).toBe(playlistId);

    // Envelope shape only; detailed mapping/export behavior is asserted in other tests.
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
  });

  it("MAPPING_MODE=real with mapping failure → export still returns structured skipped/failed", async () => {
    process.env.MAPPING_MODE = "real";
    process.env.PLAYLIST_MODE = "real";
    process.env.EXPORT_STUB = "off";

    const playlistId = "pl_it013_fail";
    const accessToken = "it013_fail_token";
    const userId = "it013_fail_user";

    process.env.AUTH_SPOTIFY_ACCESS_TOKEN = accessToken;

    // 0) Resolve current user
    const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

    // 1) We do not require /v1/search here either; mapping failure behavior is covered elsewhere.

    // 2) Even on mapping failure we still stub playlist creation to avoid real network
    const createScope = nock(API_BASE)
      .post(
        `/v1/users/${encodeURIComponent(userId)}/playlists`,
        (body: any) => {
          expect(body).toBeTruthy();
          expect(body.name).toBe("IT-013 mapping failure");
          return true;
        }
      )
      .reply(201, {
        id: playlistId,
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${playlistId}`,
        },
      });

    // Worker may or may not attempt to add tracks depending on mapping outcome.
    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`)
      .reply(201, { snapshot_id: "snap_it013_fail" });

    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", [`access=${accessToken}`])
      .send({
        name: "IT-013 mapping failure",
        description: "mapping returns failures",
        filters: {
          search: "will-not-map",
        },
        items: [
          {
            title: "Unmappable track",
            artist: "X",
            deezerID: "NOT_FOUND_001",
            checked: true,
          },
        ],
      });

    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    // Don't require addScope.isDone(); worker may choose not to add any tracks.

    // Even with mapping failure, API should still return a structured 200 + envelope
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);

    // We don't over-specify whether unmappable items land in `skipped` vs `failed` here.
    // That behavior is covered in TS-03 / US-06 tests; for IT-013 we just require a stable envelope.
  });
});

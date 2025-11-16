// tests/integration/it-005-export.spec.ts
// IT-005 — Export respects removed/unchecked items (realistic path: no __testUris; server filters items[])

import {
  describe,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  expect,
} from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app";

const SPOTIFY_API = "https://api.spotify.com";
const EXPORT_PATH = "/api/playlist/export";
const AUTH_COOKIE = "access=test-access-token";

describe("IT-005 — Export respects unchecked/removed items (no __testUris path)", () => {
  /** @type {string[]} */
  let postedUris: string[] = [];
  let createdPlaylistBody: any = null;

  beforeAll(() => {
    // Force realistic export path that uses items[]
    process.env.EXPORT_STUB = "off";
    process.env.PLAYLIST_MODE = "real";
    process.env.MAPPING_MODE = "stub";

    // Block real net except localhost; stub Spotify
    nock.disableNetConnect();
    nock.enableNetConnect((host) =>
      /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)
    );
  });

  beforeEach(() => {
    postedUris = [];
    createdPlaylistBody = null;

    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);

    // 1) Create playlist — capture the body we send
    nock(SPOTIFY_API)
      .post(
        /\/v1\/(?:users\/me\/playlists|me\/playlists|playlists)$/,
        (body) => {
          createdPlaylistBody = body;
          return true;
        }
      )
      .reply(201, {
        id: "pl_123",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_123" },
      });

    // 2) Add tracks — capture the URIs we send (if any)
    nock(SPOTIFY_API)
      .post("/v1/playlists/pl_123/tracks")
      .reply(201, function (_uri, body) {
        try {
          const parsed = typeof body === "string" ? JSON.parse(body) : body;
          postedUris = Array.isArray(parsed?.uris) ? parsed.uris : [];
        } catch {
          postedUris = [];
        }
        return { snapshot_id: "snap_001" };
      });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("filters by checked flag and excludes skipped; maps URIs from items when __testUris is omitted", async () => {
    const payload = {
      name: "Realistic Export",
      description: "IT-005 (no __testUris)",
      items: [
        {
          deezerID: 111,
          songName: "A",
          artist: "X",
          checked: true,
          skipped: false,
          spotifyUri: "spotify:track:AAA111",
        },
        {
          deezerID: 222,
          songName: "B",
          artist: "Y",
          checked: false,
          skipped: false,
          spotifyUri: "spotify:track:BBB222",
        },
        {
          deezerID: 333,
          songName: "C",
          artist: "Z",
          checked: true,
          skipped: true,
          spotifyUri: "spotify:track:CCC333",
        },
        {
          deezerID: 444,
          songName: "D",
          artist: "W",
          checked: true,
          skipped: false,
        }, // fallback → spotify:track:444
        {
          deezerID: 555,
          songName: "E",
          artist: "V",
          checked: false,
          skipped: false,
        },
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);

    // Playlist metadata from worker/Spotify stub
    if (res.body?.playlistId !== undefined) {
      expect(res.body.playlistId).toBe("pl_123");
    }
    if (res.body?.playlistUrl !== undefined) {
      expect(String(res.body.playlistUrl)).toMatch(
        /open\.spotify\.com\/playlist\/pl_123/
      );
    }

    // Ensure we actually called Spotify with filtered/derived URIs
    expect(postedUris).toEqual(["spotify:track:AAA111", "spotify:track:444"]);

    // Name/description forwarded into playlist creation request
    expect(createdPlaylistBody?.name).toBe(payload.name);
    if (payload.description) {
      expect(createdPlaylistBody?.description).toBe(payload.description);
    }

    // Sanity: excluded paths are not present
    expect(postedUris).not.toContain("spotify:track:BBB222");
    expect(postedUris).not.toContain("spotify:track:CCC333");
    expect(postedUris).not.toContain("spotify:track:555");

    // Envelope shape sanity (TS-02 / TS-04)
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
  });

  it("empty selection via items[] returns the empty-selection contract and makes no Spotify calls", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send({
        name: "Empty Selection",
        description: "All unchecked",
        items: [
          { deezerID: 111, checked: false },
          { deezerID: 222, checked: false, skipped: true },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: expect.any(Boolean) });

    // In this path, nothing should be sent to Spotify
    expect(postedUris).toEqual([]);
  });

  it("requires auth cookie", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .send({ name: "Auth Check", items: [{ deezerID: 111, checked: true }] });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
    expect(postedUris).toEqual([]);
  });

  it("reset state (all provided visible items checked) exports them all, honoring skipped flags", async () => {
    const payload = {
      name: "Reset State Export",
      description: "All visible re-checked after re-enter",
      items: [
        {
          deezerID: 101,
          songName: "R1",
          artist: "AA",
          checked: true,
          skipped: false,
          spotifyUri: "spotify:track:R1",
        },
        {
          deezerID: 202,
          songName: "R2",
          artist: "BB",
          checked: true,
          skipped: false,
          spotifyUri: "spotify:track:R2",
        },
        {
          deezerID: 303,
          songName: "R3",
          artist: "CC",
          checked: true,
          skipped: true,
          spotifyUri: "spotify:track:R3",
        }, // logically excluded
        { deezerID: 404, songName: "R4", artist: "DD" }, // fallback → spotify:track:404
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);

    // We should have actually hit the add-tracks endpoint with the expected URIs
    expect(postedUris).toEqual([
      "spotify:track:R1",
      "spotify:track:R2",
      "spotify:track:404",
    ]);
    expect(postedUris).not.toContain("spotify:track:R3");

    if (res.body?.playlistId !== undefined) {
      expect(res.body.playlistId).toBe("pl_123");
    }
    if (res.body?.playlistUrl !== undefined) {
      expect(String(res.body.playlistUrl)).toMatch(
        /open\.spotify\.com\/playlist\/pl_123/
      );
    }

    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
  });
});

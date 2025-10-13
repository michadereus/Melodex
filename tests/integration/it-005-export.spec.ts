// Filepath: tests/integration/it-005-export.spec.ts
// IT-005 — Export respects removed items (realistic path: no __testUris; server filters items[])

import { describe, it, beforeEach, afterEach, beforeAll, vi, expect, afterAll } from "vitest";
import request from "supertest";
import nock from "nock";

const SPOTIFY_API = "https://api.spotify.com";
const EXPORT_PATH = "/api/playlist/export";
const AUTH_COOKIE = "access=test-access-token";

let app: any;

describe("IT-005 — Export respects unchecked/removed items (no __testUris path)", () => {
  let postedUris: string[] = [];
  let createdPlaylistBody: any = null;

  
  beforeAll(() => {
    // Force realistic branch (no __testUris path)
    vi.stubEnv("EXPORT_STUB", "off");

    // Ensure fresh require so the controller sees the env change
    vi.resetModules();

    // Load app AFTER env is set
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    app = require("../../melodex-back-end/app");
  });

  beforeEach(() => {
    postedUris = [];
    createdPlaylistBody = null;

    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);

    // 1) Create playlist — accept common Spotify endpoints
    nock(SPOTIFY_API)
      .post(/\/v1\/(?:users\/me\/playlists|me\/playlists|playlists)$/, (body) => {
        createdPlaylistBody = body;
        return true;
      })
      .reply(201, {
        id: "pl_123",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_123" },
      });

    // 2) Add tracks — capture URIs
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
    const pending = nock.pendingMocks();
    if (pending.length) {
      // console.warn("Pending nock mocks:", pending);
    }
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("filters by checked flag and excludes skipped; maps URIs from items when __testUris is omitted", async () => {
    const payload = {
      name: "Realistic Export",
      description: "IT-005 (no __testUris)",
      // No __testUris and no 'uris' — force server to use items[]
      items: [
        { deezerID: 111, songName: "A", artist: "X", checked: true,  skipped: false, spotifyUri: "spotify:track:AAA111" },
        { deezerID: 222, songName: "B", artist: "Y", checked: false, skipped: false, spotifyUri: "spotify:track:BBB222" },
        { deezerID: 333, songName: "C", artist: "Z", checked: true,  skipped: true,  spotifyUri: "spotify:track:CCC333" },
        { deezerID: 444, songName: "D", artist: "W", checked: true,  skipped: false }, // -> fallback "spotify:track:444"
        { deezerID: 555, songName: "E", artist: "V", checked: false, skipped: false },
      ],
    };

    const res = await request(app).post(EXPORT_PATH).set("Cookie", AUTH_COOKIE).send(payload);

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);

    // Either playlistId or playlistUrl (vendor detail)
    if (res.body?.playlistId !== undefined) {
      expect(res.body.playlistId).toBe("pl_123");
    }
    if (res.body?.playlistUrl !== undefined) {
      expect(String(res.body.playlistUrl)).toMatch(/open\.spotify\.com\/playlist\/pl_123/);
    }

    // Only kept items → ["spotify:track:AAA111", "spotify:track:444"]
    expect(postedUris).toEqual(["spotify:track:AAA111", "spotify:track:444"]);

    // Create-playlist payload passed through
    expect(createdPlaylistBody?.name).toBe(payload.name);
    if (payload.description) {
      expect(createdPlaylistBody?.description).toBe(payload.description);
    }

    // Ensure server did not re-add removed ones
    expect(postedUris).not.toContain("spotify:track:BBB222");
    expect(postedUris).not.toContain("spotify:track:CCC333"); // skipped
    expect(postedUris).not.toContain("spotify:track:555");
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
    expect(postedUris).toEqual([]); // no Spotify calls
  });

  it("requires auth cookie", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .send({ name: "Auth Check", items: [{ deezerID: 111, checked: true }] });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });
    expect(postedUris).toEqual([]);
  });
});


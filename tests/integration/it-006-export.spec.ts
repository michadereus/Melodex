// tests/integration/it-006-export.spec.ts
// IT-006 — Name and description in Spotify payload (real worker path)

import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
} from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app";

const SPOTIFY_API = "https://api.spotify.com";
const EXPORT_PATH = "/api/playlist/export";
const AUTH_COOKIE = "access=test-access-token";

describe("IT-006 — Name and description in Spotify payload", () => {
  let createdBody: any = null;

  beforeAll(() => {
    // Use the real worker path (TS-02 / TS-04)
    process.env.EXPORT_STUB = "off";
    process.env.PLAYLIST_MODE = "real";
    process.env.MAPPING_MODE = "stub";
    process.env.SPOTIFY_WEB_API = SPOTIFY_API;

    nock.disableNetConnect();
    nock.enableNetConnect((host) =>
      /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)
    );
  });

  beforeEach(() => {
    createdBody = null;

    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);

    // 0) Resolve current user for createPlaylist
    nock(SPOTIFY_API).get("/v1/me").reply(200, { id: "it006_user" });

    // 1) Capture the playlist create body so we can assert on name/description
    nock(SPOTIFY_API)
      .post(/\/v1\/users\/[^/]+\/playlists$/, (body) => {
        createdBody = body;
        return true;
      })
      .reply(201, {
        id: "pl_006",
        external_urls: {
          spotify: "https://open.spotify.com/playlist/pl_006",
        },
      });

    // 2) Add-tracks stub — per-track stuff is covered by other tests
    nock(SPOTIFY_API)
      .post("/v1/playlists/pl_006/tracks")
      .reply(201, { snapshot_id: "snap_006" });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterAll(() => {
    delete process.env.EXPORT_STUB;
    delete process.env.PLAYLIST_MODE;
    delete process.env.MAPPING_MODE;
    delete process.env.SPOTIFY_WEB_API;

    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("applies provided name/description on playlist create", async () => {
    const payload = {
      name: "My Custom Playlist",
      description: "Hand-picked test tracks",
      items: [
        {
          title: "Song A",
          artist: "X",
          checked: true,
          spotifyUri: "spotify:track:A",
        },
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // We should have actually created a playlist via Spotify API stub
    expect(createdBody).toBeTruthy();
    expect(typeof createdBody).toBe("object");
    expect(createdBody.name).toBe(payload.name);
    expect(createdBody.description).toBe(payload.description);
  });

  it("omitted name/description → backend rejects (FE must supply defaults)", async () => {
    const payload = {
      // no name/description here; frontend defaulting is out-of-scope for IT-006
      items: [
        {
          title: "Song A",
          artist: "X",
          checked: true,
          spotifyUri: "spotify:track:A",
        },
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    // Backend now requires a non-empty name; missing → 502 wrapper
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe("EXPORT_PLAYLIST_FAILED");

    // createPlaylist validates and bails before hitting Spotify
    expect(createdBody).toBeNull();
  });

  it("supports unicode/emoji in name and description (no mangling)", async () => {
    const payload = {
      name: "Vibes — 流行 🎧",
      description: "Hand-picked bops ✨🔥",
      items: [
        {
          title: "Song A",
          artist: "X",
          checked: true,
          spotifyUri: "spotify:track:A",
        },
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect(createdBody).toBeTruthy();
    expect(typeof createdBody).toBe("object");
    expect(createdBody.name).toBe(payload.name);
    expect(createdBody.description).toBe(payload.description);
  });

  it("whitespace-only name/description are treated as invalid (backend rejects; FE must trim/default)", async () => {
    const payload = {
      name: "   ",
      description: "   ",
      items: [
        {
          title: "Song A",
          artist: "X",
          checked: true,
          spotifyUri: "spotify:track:A",
        },
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    // Backend only sets name if trim() is non-empty; whitespace-only → error
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe("EXPORT_PLAYLIST_FAILED");

    // Validation fails before we ever call Spotify
    expect(createdBody).toBeNull();
  });

  it("handles overly long inputs (does not break; may truncate or pass-through within limits)", async () => {
    const longName = "N".repeat(400);
    const longDescription = "D".repeat(500);

    const payload = {
      name: longName,
      description: longDescription,
      items: [
        {
          title: "Song A",
          artist: "X",
          checked: true,
          spotifyUri: "spotify:track:A",
        },
      ],
    };

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    expect(createdBody).toBeTruthy();
    expect(typeof createdBody).toBe("object");
    // We just assert that long inputs don't break the call; exact truncation behavior is a UI concern.
  });

  it("requires auth cookie (no access token → 401/403)", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .send({
        name: "No Auth",
        items: [
          {
            title: "Song A",
            artist: "X",
            checked: true,
            spotifyUri: "spotify:track:A",
          },
        ],
      });

    expect([401, 403]).toContain(res.status);
  });
});

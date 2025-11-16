// tests/integration/it-004-export.spec.ts

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app";

describe("IT-004 — Basic export (single batch) — real worker", () => {
  beforeEach(() => {
    process.env.PLAYLIST_MODE = "real";
    process.env.MAPPING_MODE = "stub";

    nock.cleanAll();
  });

  it("creates playlist via real worker and returns a TS-02 envelope (happy path)", async () => {
    // 1) Stub real playlist creation
    const createScope = nock("https://api.spotify.com")
      // axios baseURL: https://api.spotify.com/v1 + url: /users/me/playlists
      .post("/v1/users/me/playlists")
      .reply(200, {
        id: "pl_004",
        external_urls: { spotify: "https://open.spotify.com/pl_004" },
      });

    // 2) Stub add-tracks (single batch). We keep this so any add-tracks calls
    // are safely handled, but we don't assert isDone() here — per-track
    // behavior is already covered by UT-005 / IT-006 / IT-008.
    nock("https://api.spotify.com")
      .post("/v1/playlists/pl_004/tracks")
      .reply(201, { snapshot_id: "snap_1" });

    // 3) Call our API with a fake Spotify token so requireSpotifyAuth passes.
    //    Items include spotifyUri so the inline mapper can operate.
    const res = await request(app)
      .post("/api/playlist/export")
      .set("Cookie", "access=fake-access")
      .send({
        name: "Test Playlist",
        description: "desc",
        filters: null,
        items: [
          {
            title: "Song A",
            artist: "X",
            spotifyUri: "spotify:track:A",
          },
          {
            title: "Song B",
            artist: "Y",
            spotifyUri: "spotify:track:B",
          },
        ],
      });

    // 4) Ensure we hit playlist creation via the real worker
    expect(createScope.isDone()).toBe(true);

    // 5) Envelope assertions (TS-02 / TS-04)
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.playlistId).toBe("pl_004");
    expect(typeof res.body.playlistUrl).toBe("string");

    // The current real-worker path returns `kept` as the URIs that were sent
    // to Spotify. Lock that in as the contract for this basic happy-path IT.
    expect(res.body.kept).toEqual(["spotify:track:A", "spotify:track:B"]);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);
    expect(res.body.skipped).toEqual([]);
    expect(res.body.failed).toEqual([]);
  });
});

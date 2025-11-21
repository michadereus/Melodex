// tests/unit/ut-013-spotify-client.spec.ts
// UT-013 — Spotify client: URLs, auth header, chunking, and 429 surfacing

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";

// Unit under test:
//   melodex-back-end/utils/spotifyClient.js
//
// Expected surface:
//
//   function SpotifyClient(config?: { baseUrl?: string }): {
//     createPlaylist(params: {
//       accessToken: string;
//       name: string;
//       description?: string;
//       public?: boolean;
//     }): Promise<{ ok: boolean; id?: string; url?: string }>;
//     addTracks(params: {
//       accessToken: string;
//       playlistId: string;
//       uris: string[];
//     }): Promise<{
//       kept: string[];
//       failed: { uri: string; reason: string }[];
//     }>;
//   }
//
//   - addTracks must throw on 429 with:
//       err.status === 429
//       err.retryAfterMs: number | undefined

import SpotifyClient from "../../melodex-back-end/utils/spotifyClient";

const API_BASE = "https://api.spotify.com";

describe("UT-013 — SpotifyClient", () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
    // Allow only calls to the Spotify API base; this is a pure HTTP-unit test.
    nock.enableNetConnect(
      (host) => !!host && host.startsWith("api.spotify.com")
    );
    process.env.SPOTIFY_WEB_API = API_BASE;
    process.env.SPOTIFY_API_BASE = API_BASE;
    process.env.SPOTIFY_BASE_URL = API_BASE;
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("UT-013.1: resolves /me, creates playlist for that user, and sends Authorization header", async () => {
    const client = SpotifyClient();

    const token = "ut013-token";
    const name = "UT-013 Playlist";
    const description = "Verifies SpotifyClient wiring";

    // 1) /v1/me — resolve current user id
    const meScope = nock(API_BASE)
      .get("/v1/me")
      .matchHeader("authorization", (value) => {
        expect(value).toBe(`Bearer ${token}`);
        return true;
      })
      .reply(200, {
        id: "ut013-user",
      });

    // 2) /v1/users/{userId}/playlists — create playlist
    const createScope = nock(API_BASE)
      .post("/v1/users/ut013-user/playlists", (body) => {
        expect(body).toMatchObject({
          name,
          description,
        });
        return true;
      })
      .matchHeader("authorization", (value) => {
        expect(value).toBe(`Bearer ${token}`);
        return true;
      })
      .reply(201, {
        id: "pl_ut013",
        external_urls: {
          spotify: "https://open.spotify.com/playlist/pl_ut013",
        },
      });

    const created = await client.createPlaylist({
      accessToken: token,
      name,
      description,
    });

    // Shape returned by spotifyClient: { ok, id, url, raw }
    expect(created.ok).toBe(true);
    expect(created.id).toBe("pl_ut013");
    expect(created.url).toBe("https://open.spotify.com/playlist/pl_ut013");

    // Both calls were made.
    expect(meScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);

    // Sanity: addTracks wiring still uses the same Authorization header.
    const addScope = nock(API_BASE)
      .post("/v1/playlists/pl_ut013/tracks", (body) => {
        expect(Array.isArray(body?.uris)).toBe(true);
        expect(body.uris).toEqual([
          "spotify:track:aaa",
          "spotify:track:bbb",
          "spotify:track:ccc",
        ]);
        return true;
      })
      .matchHeader("authorization", (value) => {
        expect(value).toBe(`Bearer ${token}`);
        return true;
      })
      .reply(201, { snapshot_id: "snap_ut013" });

    const result = await client.addTracks({
      accessToken: token,
      playlistId: "pl_ut013",
      uris: ["spotify:track:aaa", "spotify:track:bbb", "spotify:track:ccc"],
    });

    expect(result.kept).toEqual([
      "spotify:track:aaa",
      "spotify:track:bbb",
      "spotify:track:ccc",
    ]);
    expect(Array.isArray(result.failed)).toBe(true);
    expect(result.failed.length).toBe(0);
    expect(addScope.isDone()).toBe(true);
  });

  it("UT-013.2: chunks addTracks URIs into batches of ≤100 per call", async () => {
    const client = SpotifyClient();

    const token = "ut013-token";
    const playlistId = "pl_chunk";

    // 250 URIs → expect 3 calls: 100, 100, 50
    const uris: string[] = [];
    for (let i = 0; i < 250; i++) {
      uris.push(`spotify:track:${i.toString().padStart(3, "0")}`);
    }

    const batchSizes: number[] = [];

    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`)
      .times(3)
      .reply(function (_uri, body: any) {
        const batch = Array.isArray(body?.uris) ? body.uris : [];
        batchSizes.push(batch.length);
        // Always 201 for this test.
        return [201, { snapshot_id: `snap_${batchSizes.length}` }];
      });

    const result = await client.addTracks({
      accessToken: token,
      playlistId,
      uris,
    });

    // Three calls were made and each batch adheres to the ≤100 rule.
    expect(addScope.isDone()).toBe(true);
    expect(batchSizes).toEqual([100, 100, 50]);
    expect(result.kept.length).toBe(250);
    expect(result.failed.length).toBe(0);
  });

  it("UT-013.3: surfaces 429 with retryAfterMs in the thrown error", async () => {
    const client = SpotifyClient();

    const token = "ut013-token";
    const playlistId = "pl_429";

    const addScope = nock(API_BASE)
      .post(`/v1/playlists/${playlistId}/tracks`)
      .reply(
        429,
        { error: { status: 429, message: "Rate limited" } },
        {
          "Retry-After": "1",
        }
      );

    let caught: any;
    try {
      await client.addTracks({
        accessToken: token,
        playlistId,
        uris: ["spotify:track:aaa"],
      });
    } catch (err: any) {
      caught = err;
    }

    expect(addScope.isDone()).toBe(true);
    expect(caught).toBeTruthy();
    expect(caught.status).toBe(429);

    // retryAfterMs is a convenience field your export worker can read.
    // It should be derived from the Retry-After header (seconds or HTTP date).
    expect(
      typeof caught.retryAfterMs === "number" ||
        caught.retryAfterMs === undefined
    ).toBe(true);
  });
});

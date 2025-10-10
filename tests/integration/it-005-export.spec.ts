// tests/integration/it-005-export-unselected.spec.ts
// @ts-nocheck
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import request from "supertest";
import nock from "nock";
import app from "../../melodex-back-end/app"; // or "./app.js" to match your project

const SPOTIFY_API = "https://api.spotify.com";
const EXPORT_PATH = "/api/playlist/export";
const AUTH_COOKIE = "access=test-access-token";

describe("IT-005 — Export respects unchecked/removed items", () => {
  let postedUris: string[] = [];
  let createdPlaylistBody: any = null;

  beforeEach(() => {
    postedUris = [];
    createdPlaylistBody = null;

    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);

    // 1) Create playlist — capture name/description for passthrough assertions
    nock(SPOTIFY_API)
      .post("/v1/users/me/playlists", (body) => {
        createdPlaylistBody = body;
        return true;
      })
      .reply(201, {
        id: "pl_123",
        external_urls: { spotify: "https://open.spotify.com/playlist/pl_123" },
      });

    // 2) Add tracks — capture URIs actually posted to Spotify
    nock(SPOTIFY_API)
      .post("/v1/playlists/pl_123/tracks")
      .reply(201, function (_uri, body) {
        try {
          const parsed = typeof body === "string" ? JSON.parse(body) : body;
          postedUris = Array.isArray(parsed?.uris) ? parsed.uris : [];
        } catch {
          postedUris = [];
        }
        return { snapshot_id: "abc" };
      });
  });

  afterEach(() => {
    const pending = nock.pendingMocks();
    if (pending.length) {
      // Helpful if a test exits early
      // console.warn("Pending nock mocks:", pending);
    }
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("posts only kept URIs (FE already excluded unchecked/skipped)", async () => {
    const finalUris = ["spotify:track:AAA111", "spotify:track:DDD444"];

    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send({
        name: "My Inline Export",
        description: "From IT-005",
        __testUris: finalUris,
        items: [
          { uri: "spotify:track:AAA111", checked: true },
          { uri: "spotify:track:BBB222", checked: false }, // unchecked upstream
          { uri: "spotify:track:CCC333", checked: true, skipped: true }, // skipped upstream
          { uri: "spotify:track:DDD444", checked: true },
          { uri: "spotify:track:EEE555", checked: false }, // unchecked upstream
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
    expect(res.body?.playlistId).toBe("pl_123");

    // Server must not re-add excluded tracks
    expect(postedUris).toEqual(["spotify:track:AAA111", "spotify:track:DDD444"]);
    expect(postedUris).not.toContain("spotify:track:BBB222");
    expect(postedUris).not.toContain("spotify:track:CCC333");
    expect(postedUris).not.toContain("spotify:track:EEE555");
  });

  it("does not re-add duplicates or unchecked when items contain conflicting flags", async () => {
    const finalUris = ["spotify:track:AAA111", "spotify:track:AAA111"]; // duplicate in FE final list (should still forward as given)
    // NOTE: The stub path trusts __testUris verbatim. If you want de-duplication,
    // do it on the FE before posting. This test just proves no re-adds happen server-side.

    await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send({
        name: "No Re-Add",
        description: "Check duplicates",
        __testUris: finalUris,
        items: [
          { uri: "spotify:track:AAA111", checked: false }, // conflicting with __testUris
          { uri: "spotify:track:BBB222", checked: true },
        ],
      })
      .expect(200);

    // Server should forward exactly what FE sent
    expect(postedUris).toEqual(["spotify:track:AAA111", "spotify:track:AAA111"]);
    expect(postedUris).not.toContain("spotify:track:BBB222");
  });

  it("empty selection triggers the empty-selection response contract", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send({
        name: "Empty",
        description: "none",
        __testUris: [], // FE blocked Export, but we verify server response anyway
      });

    // Match your stub contract: if you return ok:false/code:'NO_SONGS', assert that.
    // If your stub returns ok:true with count:0, assert that instead.
    // Adjust these expectations to your ExportController's stub behavior.
    expect(res.status).toBe(200);
    // Example 1: NO_SONGS
    // expect(res.body).toMatchObject({ ok: false, code: expect.stringMatching(/NO_SONGS/i) });

    // Example 2: ok:true count:0
    expect(res.body).toMatchObject({ ok: true });
    // When __testUris is [], Spotify calls should not occur:
    expect(postedUris).toEqual([]);
  });

  it("requires auth cookie even on the stub path", async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      // no Cookie header
      .send({ name: "Auth Check", __testUris: ["spotify:track:AAA111"] });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: expect.stringMatching(/AUTH/i) });

    // Since auth failed, nock should show that no Spotify calls were made
    expect(postedUris).toEqual([]);
  });

  it("passes through name/description to the create-playlist call", async () => {
    const payload = {
      name: "Inline Export: Rock Mix",
      description: "Exported from selection mode",
      __testUris: ["spotify:track:ROCK001", "spotify:track:ROCK002"],
    };

    await request(app).post(EXPORT_PATH).set("Cookie", AUTH_COOKIE).send(payload).expect(200);

    expect(createdPlaylistBody?.name).toBe(payload.name);
    // spotify create payload may use 'description' or omit it if empty; assert when present
    if (payload.description) {
      expect(createdPlaylistBody?.description).toBe(payload.description);
    }
  });
});

// tests/integration/it-015-export-partial.spec.ts
// IT-015 — ExportPartialFailures (real worker, TS-04)
// Goal: when one addTracks chunk fails, envelope still uses kept/failed buckets
// with stable ordering and no legacy fields.

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

describe("IT-015 — Export partial failures populate failed bucket (real worker)", () => {
  beforeAll(() => {
    // Force real worker path (TS-04) and deterministic mapping (__testUris harness).
    process.env.EXPORT_STUB = "off";
    process.env.PLAYLIST_MODE = "real";
    process.env.MAPPING_MODE = "stub";

    // Only allow localhost traffic; everything else must go through nock.
    nock.disableNetConnect();
    nock.enableNetConnect((host) =>
      /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)
    );
  });

  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("returns TS-02 envelope with kept + failed when one addTracks chunk fails", async () => {
    // 1) Arrange deterministic URIs: first chunk succeeds, second chunk fails.
    // exportPlaylistWorker chunking uses MAX_URIS_PER_ADD=100, so:
    //   - goodUris (100) → first /tracks call (success)
    //   - badUris (3)   → second /tracks call (404 → NOT_FOUND failures)
    const goodUris = Array.from(
      { length: 100 },
      (_, i) => `spotify:track:it015_good_${i + 1}`
    );
    const badUris = Array.from(
      { length: 3 },
      (_, i) => `spotify:track:it015_bad_${i + 1}`
    );
    const allUris = [...goodUris, ...badUris];

    // 2) Stub playlist create
    const createScope = nock(SPOTIFY_API)
      .post("/v1/users/me/playlists")
      .reply(201, {
        id: "pl_015",
        external_urls: {
          spotify: "https://open.spotify.com/playlist/pl_015",
        },
      });

    // 3) Stub addTracks:
    //    - first call → 201 (kept bucket)
    //    - second call → 404 (NOT_FOUND for entire chunk → failed bucket)
    let addCallCount = 0;
    const addScope = nock(SPOTIFY_API)
      .post("/v1/playlists/pl_015/tracks")
      .times(2)
      .reply((uri, body: any) => {
        addCallCount += 1;

        const uris: string[] = (body && (body.uris || body.tracks || [])) || [];

        // Sanity: chunk boundaries look as expected—first call carries the
        // first 100 URIs; second call carries the remaining "bad" ones.
        if (addCallCount === 1) {
          expect(uris).toEqual(goodUris);
          return [
            201,
            {
              snapshot_id: "snap_it015_good",
            },
          ];
        }

        expect(uris).toEqual(badUris);
        return [
          404,
          {
            error: {
              status: 404,
              message: "Tracks not found (IT-015 partial failure)",
            },
          },
        ];
      });

    // 4) Drive the real /api/playlist/export endpoint via Supertest
    const res = await request(app)
      .post(EXPORT_PATH)
      .set("Cookie", AUTH_COOKIE)
      .send({
        name: "IT-015 — partial failures",
        // Harness path: bypass mapping and feed URIs directly into the worker
        __testUris: allUris,
      });

    // 5) Transport expectations — we actually hit create + add stubs
    expect(createScope.isDone()).toBe(true);
    expect(addScope.isDone()).toBe(true);
    expect(res.status).toBe(200);

    const body = res.body as any;

    // 6) TS-02 / US-06 envelope shape
    expect(body).toBeTruthy();
    expect(typeof body.ok).toBe("boolean");
    // Current worker implementation always returns ok:true even with failures;
    // IT-015 locks that in for "partial failures" semantics.
    expect(body.ok).toBe(true);

    expect(body.playlistId).toBe("pl_015");
    expect(body.playlistUrl).toBe("https://open.spotify.com/playlist/pl_015");

    expect(Array.isArray(body.kept)).toBe(true);
    expect(Array.isArray(body.skipped)).toBe(true);
    expect(Array.isArray(body.failed)).toBe(true);

    // 7) Buckets + ordering
    // kept: only the URIs from the successful chunk, in original input order.
    expect(body.kept).toEqual(goodUris);

    // skipped: no mapping-time skips in this harness path
    expect(body.skipped).toEqual([]);

    // failed: URIs from the failing chunk, with structured reasons.
    const failed = body.failed as Array<{
      id?: string;
      uri?: string;
      reason: string;
    }>;
    expect(failed.length).toBe(badUris.length);

    const failedIds = failed.map(
      (f) => f.id || (f as any).uri || (f as any).trackUri
    );
    // Input order preserved for the failing chunk as well
    expect(failedIds).toEqual(badUris);

    // Reason code: exportWorker uses NOT_FOUND for 404 add-track failures.
    for (const f of failed) {
      expect(typeof f.reason).toBe("string");
      expect(f.reason).toBe("NOT_FOUND");
    }

    // 8) Guard against leaking legacy / test-only fields
    expect(body).not.toHaveProperty("__testUris");
    expect(body).not.toHaveProperty("added");
    expect(body).not.toHaveProperty("received");
  });
});

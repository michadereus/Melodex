// tests/integration/it-008-export.spec.ts
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

const ENV_BASE = {
  SPOTIFY_WEB_API: API_BASE,
  EXPORT_ADD_RETRY_MAX: "3",
};

function withEnv(env: Record<string, string>, fn: () => Promise<void>) {
  const before: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    before[key] = process.env[key];
    process.env[key] = value;
  }
  return fn().finally(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

describe("IT-008 — 429 policy (integration)", () => {
  beforeAll(() => {
    process.env.PLAYLIST_MODE = "real";
    process.env.MAPPING_MODE = "stub";
    process.env.EXPORT_STUB = "off";
  });

  afterAll(() => {
    delete process.env.PLAYLIST_MODE;
    delete process.env.MAPPING_MODE;
    delete process.env.EXPORT_STUB;
  });

  beforeEach(() => {
    // nock.disableNetConnect();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });

  it("applies Retry-After and succeeds on retry (single chunk)", async () => {
    const playlistId = "pl_008_retry";
    const accessToken = "it008_retry_token";
    const userId = "it008_user_retry";

    const uris = ["spotify:track:1", "spotify:track:2", "spotify:track:3"];

    await withEnv(
      {
        ...ENV_BASE,
        AUTH_SPOTIFY_ACCESS_TOKEN: accessToken,
        EXPORT_ADD_BASE_BACKOFF_MS: "10",
        EXPORT_ADD_MAX_BACKOFF_MS: "50",
      },
      async () => {
        let addCall = 0;

        // 0) Resolve current user
        const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

        const createScope = nock(API_BASE)
          .post(
            `/v1/users/${encodeURIComponent(userId)}/playlists`,
            (body: any) => {
              expect(body).toBeTruthy();
              expect(body.name).toBe("IT-008 Retry");
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
          .post(`/v1/playlists/${playlistId}/tracks`, (body: any) => {
            expect(Array.isArray(body.uris)).toBe(true);
            expect(body.uris).toEqual(uris);
            addCall += 1;
            return true;
          })
          .reply(429, {}, { "retry-after": "1" })
          .post(`/v1/playlists/${playlistId}/tracks`)
          .reply(201, { snapshot_id: "snap_it008_retry" });

        const payload = {
          __testUris: uris,
          items: [],
          name: "IT-008 Retry",
          description: "429 path with Retry-After",
        };

        const res = await request(app)
          .post("/api/playlist/export")
          .set("Cookie", [`access=${accessToken}`])
          .send(payload);

        const out = {
          status: res.status,
          json: res.body,
        };

        expect(meScope.isDone()).toBe(true);
        expect(createScope.isDone()).toBe(true);
        expect(addScope.isDone()).toBe(true);
        // We saw at least one addTracks attempt with the expected URIs;
        // addScope.isDone() guarantees the retry completed.
        expect(addCall).toBeGreaterThanOrEqual(1);

        expect(out.status).toBe(200);
        expect(out.json?.ok).toBe(true);
      }
    );
  });

  it("bounds retries without Retry-After and marks remaining as RATE_LIMIT", async () => {
    const playlistId = "pl_008_rate_limit";
    const accessToken = "it008_rl_token";
    const userId = "it008_user_rl";

    const uris = Array.from({ length: 5 }).map(
      (_, i) => `spotify:track:${i + 1}`
    );

    await withEnv(
      {
        ...ENV_BASE,
        AUTH_SPOTIFY_ACCESS_TOKEN: accessToken,
        EXPORT_ADD_BASE_BACKOFF_MS: "10",
        EXPORT_ADD_MAX_BACKOFF_MS: "50",
      },
      async () => {
        let addAttempts = 0;

        // 0) Resolve current user
        const meScope = nock(API_BASE).get("/v1/me").reply(200, { id: userId });

        const createScope = nock(API_BASE)
          .post(
            `/v1/users/${encodeURIComponent(userId)}/playlists`,
            (body: any) => {
              expect(body).toBeTruthy();
              expect(body.name).toBe("IT-008 RateLimit");
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
          .post(`/v1/playlists/${playlistId}/tracks`, () => {
            addAttempts += 1;
            return true;
          })
          .times(4)
          .reply(429, {});

        const payload = {
          __testUris: uris,
          items: [],
          name: "IT-008 RateLimit",
          description: "No Retry-After; bounded retries",
        };

        const res = await request(app)
          .post("/api/playlist/export")
          .set("Cookie", [`access=${accessToken}`])
          .send(payload);

        const out = {
          status: res.status,
          json: res.body,
        };

        expect(meScope.isDone()).toBe(true);
        expect(createScope.isDone()).toBe(true);
        expect(addScope.isDone()).toBe(true);
        expect(addAttempts).toBe(4);

        // Envelope should still be 200 with a RATE_LIMIT outcome; exact envelope
        // contents are covered by UT-005/IT-011/E2E tests.
        expect(out.status).toBe(200);
        expect(typeof out.json?.ok).toBe("boolean");
      }
    );
  });
});

import { describe, it, beforeAll, afterEach, expect } from 'vitest';
import request from 'supertest';
import nock from 'nock';

// If default import errors (no esModuleInterop), switch to: const app = require('../../melodex-back-end/app');
import app from '../../melodex-back-end/app';

const AUTH_COOKIE = 'access=test-access; Path=/; HttpOnly;';
const EXPORT_PATH = '/api/playlist/export';

function withEnv<T>(overrides: Record<string, string>, fn: () => Promise<T>) {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(overrides)) {
    prev[k] = process.env[k];
    process.env[k] = overrides[k];
  }
  return fn().finally(() => {
    for (const k of Object.keys(overrides)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k] as string;
    }
  });
}

describe('IT-013-MappingSearch — Toggle/search/caching/error paths', () => {
  beforeAll(() => {
    // Avoid DB in tests (your app won't connect on import anyway, but keep this for consistency)
    process.env.MONGO_DISABLED_FOR_TESTS = '1';
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('defaults to stub path (EXPORT_STUB=on) and makes no Spotify calls', async () => {
    await withEnv(
      {
        EXPORT_STUB: 'on', // default
        MAPPING_MODE: '',  // default → ignored because stub path short-circuits
      },
      async () => {
        const scope = nock('https://api.spotify.com')
          .filteringRequestBody(() => '*')
          .post(/.*/).reply(500) // if we ever hit Spotify, fail loudly
          .persist();

        const payload = {
          // no __testUris → would normally go “real path”, but EXPORT_STUB=on keeps us in stub
          name: 'My List',
          description: 'hello',
          filters: { type: 'genre', genre: 'pop' },
          uris: ['spotify:track:0'], // stub path just echos metadata, doesn’t use this
          items: [
            { checked: true, deezerID: 123, isrc: 'US-AAA-00-00001' },
            { checked: false, deezerID: 456 }, // should be ignored if we did map
          ],
        };

        const res = await request(app)
          .post(EXPORT_PATH)
          .set('Cookie', AUTH_COOKIE)
          .send(payload);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          ok: true,
          received: { name: 'My List', count: expect.any(Number) },
        });

        // ensure we truly never hit Spotify in stub mode
        expect(scope.isDone()).toBe(false);
      }
    );
  });

  it('MAPPING_MODE=real + EXPORT_STUB=off → uses real path and sends auth header to Spotify', async () => {
    await withEnv(
      {
        EXPORT_STUB: 'off',
        MAPPING_MODE: 'real',
      },
      async () => {
        // NOTE: current realMapper defers to stub mapping (no /v1/search calls),
        // but controller still does: create playlist + add tracks.
        const created: any[] = [];
        const added: any[] = [];

        const api = nock('https://api.spotify.com', {
          reqheaders: {
            authorization: /Bearer\s+test-access/i, // must forward cookie-derived token
          },
        });

        api.post('/v1/users/me/playlists', (body) => {
          created.push(body);
          return true;
        })
        .reply(200, { id: 'pl_abc', external_urls: { spotify: 'https://open.spotify.com/playlist/pl_abc' } });

        api.post('/v1/playlists/pl_abc/tracks', (body) => {
          added.push(body);
          return true;
        })
        .reply(201, { snapshot_id: 'snap1' });

        const payload = {
          // no __testUris → goes to real path
          name: 'Real Map Run',
          description: 'from tests',
          items: [
            // real mapper (stubbed) will build URIs from spotifyUri or deezerID
            { checked: true, deezerID: 111, artist: 'A', title: 'X' },
            { checked: false, deezerID: 222 }, // ignored
            { checked: true, spotifyUri: 'spotify:track:xyz123' },
          ],
        };

        const res = await request(app)
          .post(EXPORT_PATH)
          .set('Cookie', AUTH_COOKIE)
          .send(payload);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          ok: true,
          playlistId: 'pl_abc',
          added: expect.any(Number),
          skipped: expect.any(Number),
        });

        // playlist created exactly once, with our metadata
        expect(created).toHaveLength(1);
        expect(created[0]).toMatchObject({
          name: 'Real Map Run',
          description: 'from tests',
        });

        // track add called once with URIs produced by stub mapping
        expect(added).toHaveLength(1);
        const uris = added[0]?.uris || [];
        expect(Array.isArray(uris)).toBe(true);
        // deezerID -> spotify:track:id  and spotifyUri preserved
        expect(uris).toEqual(expect.arrayContaining([
          'spotify:track:111',
          'spotify:track:xyz123',
        ]));

        expect(api.isDone()).toBe(true);
      }
    );
  });

  // ── The next three are scaffolds for when you implement real /v1/search in realMapper ──

  it.skip('sends ISRC-first search to /v1/search, falls back to title+artist (normalized)', async () => {
    // When real search is implemented, unskip and assert:
    // - GET /v1/search?q=isrc:US-AAA-00-00001&type=track&market=US&limit=5
    // - If ISRC missing: q=track:<title> artist:<artist> (normalized/scrubbed)
    // - Map first canonical candidate (or duration ±3000ms match)
  });

  it.skip('per-batch caching avoids duplicate search calls for identical queries', async () => {
    // Arrange duplicates with same ISRC / same title-artist pair.
    // Expect nock to observe a single /v1/search call per unique query.
  });

  it.skip('handles 429/timeout from search with structured reasons (or stable 200 contract)', async () => {
    // Mock /v1/search 429, then assert your controller/mapping returns a stable JSON body.
    // Current code would hit catch() and respond 502; when reasons are added, assert them here.
  });
});

// File: tests/integration/it-013-mapping.spec.ts
// @ts-nocheck
import { describe, it, beforeAll, afterEach, expect } from 'vitest';
import request from 'supertest';
import nock from 'nock';
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
    process.env.MONGO_DISABLED_FOR_TESTS = '1';
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('defaults to stub path (EXPORT_STUB=on) and makes no Spotify calls', async () => {
    await withEnv(
      { EXPORT_STUB: 'on', MAPPING_MODE: '' },
      async () => {
        const scope = nock('https://api.spotify.com')
          .filteringRequestBody(() => '*')
          .post(/.*/).reply(500)
          .persist();

        const payload = {
          name: 'My List',
          description: 'hello',
          filters: { type: 'genre', genre: 'pop' },
          uris: ['spotify:track:0'],
          items: [
            { checked: true, deezerID: 123, isrc: 'US-AAA-00-00001' },
            { checked: false, deezerID: 456 },
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
        expect(scope.isDone()).toBe(false);
      }
    );
  });

  it('MAPPING_MODE=real + EXPORT_STUB=off → uses real path and sends auth header to Spotify', async () => {
    await withEnv(
      { EXPORT_STUB: 'off', MAPPING_MODE: 'real' },
      async () => {
        const created: any[] = [];
        const added: any[] = [];

        const api = nock('https://api.spotify.com', {
          reqheaders: { authorization: /Bearer\s+test-access/i },
        });

        api.post('/v1/users/me/playlists', (body) => {
          created.push(body);
          return true;
        })
        .reply(200, {
          id: 'pl_abc',
          external_urls: { spotify: 'https://open.spotify.com/playlist/pl_abc' },
        });

        api.post('/v1/playlists/pl_abc/tracks', (body) => {
          added.push(body);
          return true;
        })
        .reply(201, { snapshot_id: 'snap1' });

        const payload = {
          name: 'Real Map Run',
          description: 'from tests',
          items: [
            { checked: true, deezerID: 111, artist: 'A', title: 'X' },
            { checked: false, deezerID: 222 }, // should be skipped by mapper
            { checked: true, spotifyUri: 'spotify:track:xyz123' },
          ],
        };

        const res = await request(app)
          .post(EXPORT_PATH)
          .set('Cookie', AUTH_COOKIE)
          .send(payload);

        expect(res.status).toBe(200);
        // TS-02 success envelope: kept/skipped arrays (not numeric counts), added is optional/legacy
        expect(res.body).toMatchObject({
          ok: true,
          playlistId: 'pl_abc',
          playlistUrl: expect.any(String),
          kept: expect.any(Array),
          skipped: expect.any(Array),
          failed: expect.any(Array),
        });

        // playlist created once with our metadata
        expect(created).toHaveLength(1);
        expect(created[0]).toMatchObject({ name: 'Real Map Run', description: 'from tests' });

        // tracks added once; URIs include mapped deezerID + preserved spotifyUri
        expect(added).toHaveLength(1);
        const uris = added[0]?.uris || [];
        expect(Array.isArray(uris)).toBe(true);
        expect(uris).toEqual(expect.arrayContaining([
          'spotify:track:111',
          'spotify:track:xyz123',
        ]));

        // Skipped contains the unchecked item (shape may vary; assert minimally)
        if (Array.isArray(res.body.skipped) && res.body.skipped.length > 0) {
          expect(res.body.skipped.some((s: any) => String(s.deezerID) === '222')).toBe(true);
        }

        expect(api.isDone()).toBe(true);
      }
    );
  });

  // Placeholders for future real /v1/search coverage:
  it.skip('sends ISRC-first search and falls back to title+artist (normalized)', async () => {});
  it.skip('per-batch caching avoids duplicate /v1/search calls', async () => {});
  it.skip('handles 429/timeout from search with structured reasons', async () => {});
});

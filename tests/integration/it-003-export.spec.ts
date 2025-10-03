// tests/integration/export/it-003-export.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import nock from 'nock';

const app = require('../../melodex-back-end/app');

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});
afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});
beforeEach(() => nock.cleanAll());

describe('IT-003-Export — Creates playlist with only filtered', () => {
  it('creates playlist then adds only matching URIs', async () => {
    // 1) Spotify create playlist
    const create = nock('https://api.spotify.com')
      .post(/\/v1\/users\/[^/]+\/playlists$/, (body: any) => {
        return body?.name === 'My Filtered Mix' && /desc/i.test(body?.description ?? '');
      })
      .reply(201, {
        id: 'pl_123',
        external_urls: { spotify: 'https://open.spotify.com/playlist/pl_123' },
      });

    // 2) Add tracks (only filtered)
    const add = nock('https://api.spotify.com')
      .post('/v1/playlists/pl_123/tracks', (body: any) => {
        return Array.isArray(body?.uris)
          && body.uris.length === 2
          && body.uris.every((u: string) => /^spotify:track:/.test(u));
      })
      .reply(201, { snapshot_id: 'snap' });

    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', ['access=acc-token'])
      .send({
        name: 'My Filtered Mix',
        description: 'desc here',
        filters: { type: 'genre', genre: 'rock' },
        // optional hint for server test mode:
        __testUris: ['spotify:track:AAA', 'spotify:track:BBB'],
      })
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      playlistId: 'pl_123',
      playlistUrl: 'https://open.spotify.com/playlist/pl_123',
      added: 2,
    });

    expect(create.isDone()).toBe(true);
    expect(add.isDone()).toBe(true);
  });
});

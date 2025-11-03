// File: tests/integration/it-009-confirm.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import nock from 'nock';

// Mount the same routers used by the app
import { apiRouter, authRouter } from '../../melodex-back-end/routes/api';

describe('IT-009 — Confirm: Response includes playlist URL', () => {
  let app: express.Express;

  beforeEach(() => {
    // fresh express app for each test
    app = express();
    app.use(express.json());
    // Mount routers (mirrors server wiring)
    app.use('/api', apiRouter);
    app.use('/', authRouter);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('returns ok:true with playlistId and a valid playlistUrl (Spotify web URL)', async () => {
    // Arrange: stub Spotify Web API calls made by the __testUris path
    const spotify = nock('https://api.spotify.com')
      .post('/v1/users/me/playlists', (body: any) => {
        // minimal shape check
        return typeof body?.name === 'string';
      })
      .reply(201, {
        id: 'pl_it009',
        external_urls: { spotify: 'https://open.spotify.com/playlist/pl_it009' },
      })
      .post('/v1/playlists/pl_it009/tracks', (body: any) => {
        return Array.isArray(body?.uris) && body.uris.length === 2;
      })
      .reply(201, { snapshot_id: 'snap_1' });

    // Body uses __testUris to hit the "test path" that simulates create+add (no mapping)
    const payload = {
      name: 'Confirm URL',
      description: 'IT-009',
      __testUris: ['spotify:track:foo', 'spotify:track:bar'],
    };

    // Act: POST /api/playlist/export with an access cookie (requireSpotifyAuth)
    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', ['access=test-access'])
      .send(payload);

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();

    // Assert contract
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.playlistId).toBe('string');
    expect(typeof res.body.playlistUrl).toBe('string');

    // URL shape: https Spotify playlist link
    const url: string = res.body.playlistUrl;
    expect(url).toMatch(/^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9_]+$/);

    // Id should match URL suffix when provided by Spotify
    const id: string = res.body.playlistId;
    if (id) {
      expect(url.endsWith(`/${id}`)).toBe(true);
    }

    // kept/skipped/failed are present with expected types (tolerant)
    expect(Array.isArray(res.body.kept)).toBe(true);
    expect(Array.isArray(res.body.skipped)).toBe(true);
    expect(Array.isArray(res.body.failed)).toBe(true);

    // Nock expectations met
    expect(spotify.isDone()).toBe(true);
  });
});

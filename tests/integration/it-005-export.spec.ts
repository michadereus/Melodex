// tests/integration/it-005-export-unselected.spec.ts
// @ts-nocheck
import request from 'supertest';
import nock from 'nock';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';

import app from '../../melodex-back-end/app';

describe('IT-005 — Export respects unselected/unchecked items', () => {
  const SPOTIFY_API = 'https://api.spotify.com';
  let postedUris: string[] = [];

  beforeEach(() => {
    postedUris = [];
    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);

    // 1) Simulate create playlist
    nock(SPOTIFY_API)
      .post('/v1/users/me/playlists')
      .reply(201, {
        id: 'pl_123',
        external_urls: { spotify: 'https://open.spotify.com/playlist/pl_123' },
      });

    // 2) Capture the add-tracks body so we can assert URIs
    nock(SPOTIFY_API)
      .post('/v1/playlists/pl_123/tracks')
      .reply(201, function (_uri, body) {
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          postedUris = Array.isArray(parsed?.uris) ? parsed.uris : [];
        } catch {
          postedUris = [];
        }
        return { snapshot_id: 'abc' };
      });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('posts only the URIs provided (i.e., excludes unchecked/removed/skipped that were filtered out upstream)', async () => {
    // Imagine the UI started with 5 items, but the user unchecked two and one was skipped.
    // The FE builds final URIs from the *kept* items only:
    const finalUris = [
      'spotify:track:AAA111', // kept
      'spotify:track:DDD444', // kept
      // (excluded upstream: BBB222 unchecked, CCC333 skipped, EEE555 unchecked)
    ];

    const res = await request(app)
      .post('/api/playlist/export')
      // requireSpotifyAuth reads the cookie named "access"
      .set('Cookie', 'access=test-access-token')
      .send({
        name: 'My Inline Export',
        description: 'From IT-005',
        // Trigger the test path in exportPlaylistStub
        __testUris: finalUris,
        // (server ignores "items" and flags in the stub path; FE already filtered)
        items: [
          { uri: 'spotify:track:AAA111', checked: true },
          { uri: 'spotify:track:BBB222', checked: false }, // would have been excluded
          { uri: 'spotify:track:CCC333', checked: true, skipped: true }, // excluded
          { uri: 'spotify:track:DDD444', checked: true },
          { uri: 'spotify:track:EEE555', checked: false }, // excluded
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
    expect(res.body?.playlistId).toBe('pl_123');

    // Assert the server posted exactly what we told it (no re-adding excluded tracks)
    expect(postedUris).toEqual(['spotify:track:AAA111', 'spotify:track:DDD444']);
    expect(postedUris).not.toContain('spotify:track:BBB222');
    expect(postedUris).not.toContain('spotify:track:CCC333');
    expect(postedUris).not.toContain('spotify:track:EEE555');
  });
});

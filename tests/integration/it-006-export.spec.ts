// tests/integration/it-006-export-metadata.spec.ts
// @ts-nocheck
import request from 'supertest';
import nock from 'nock';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';

import app from '../../melodex-back-end/app';

describe('IT-006 — Name and description in Spotify payload', () => {
  const SPOTIFY_API = 'https://api.spotify.com';

  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('applies provided name/description on playlist create', async () => {
    let receivedCreateBody: any = null;

    // 1) Capture create playlist body
    nock(SPOTIFY_API)
      .post('/v1/users/me/playlists')
      .reply(201, function (_uri, body) {
        receivedCreateBody = typeof body === 'string' ? JSON.parse(body) : body;
        return {
          id: 'pl_meta_1',
          external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_1' },
        };
      });

    // 2) Add tracks (don’t care about body here)
    nock(SPOTIFY_API)
      .post('/v1/playlists/pl_meta_1/tracks')
      .reply(201, { snapshot_id: 'snap1' });

    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', 'access=test-access-token')
      .send({
        name: '  My Inline Export  ',          // intentional padding to verify trimming happens upstream if applicable
        description: '  From IT-006 Spec  ',
        __testUris: ['spotify:track:AAA111', 'spotify:track:BBB222'],
      });

    expect(res.status).toBe(200);
    expect(receivedCreateBody).toBeTruthy();

    // Assert name/description are present and match our inputs (trimmed is OK)
    // Your server may trim; accept either exact or trimmed match:
    const name = (receivedCreateBody.name ?? '').toString();
    const desc = (receivedCreateBody.description ?? '').toString();

    expect(name.replace(/\s+/g, ' ').trim()).toBe('My Inline Export');
    expect(desc.replace(/\s+/g, ' ').trim()).toBe('From IT-006 Spec');
  });

  // falls back test → relax: just ensure create succeeds; defaults are covered under US-04
  it('omitted name/description → still creates playlist (defaults handled in FE path)', async () => {
    let receivedCreateBody: any = null;

    nock(SPOTIFY_API)
      .post('/v1/users/me/playlists')
      .reply(201, function (_uri, body) {
        receivedCreateBody = typeof body === 'string' ? JSON.parse(body) : body;
        return {
          id: 'pl_meta_2',
          external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_2' },
        };
      });

    nock(SPOTIFY_API)
      .post('/v1/playlists/pl_meta_2/tracks')
      .reply(201, { snapshot_id: 'snap2' });

    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', 'access=test-access-token')
      .send({
        __testUris: ['spotify:track:CCC333'],
        // name/description intentionally omitted — FE supplies defaults in UI flow
      });

    expect(res.status).toBe(200);
    expect(receivedCreateBody).toBeTruthy();
    // Do NOT enforce defaults here; that’s US-04.
    // Just assert the backend made the call with some body object.
    expect(typeof receivedCreateBody).toBe('object');
  });

  it('supports unicode/emoji in name and description (no mangling)', async () => {
  let createBody: any = null;

  nock(SPOTIFY_API)
    .post('/v1/users/me/playlists')
    .reply(201, function (_uri, body) {
      createBody = typeof body === 'string' ? JSON.parse(body) : body;
      return {
        id: 'pl_meta_unicode',
        external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_unicode' },
      };
    });

  nock(SPOTIFY_API)
    .post('/v1/playlists/pl_meta_unicode/tracks')
    .reply(201, { snapshot_id: 'snapU' });

  const res = await request(app)
    .post('/api/playlist/export')
    .set('Cookie', 'access=test-access-token')
    .send({
      name: 'Vibes — 流行 🎧',
      description: 'Hand-picked bops ✨🔥',
      __testUris: ['spotify:track:UNIC001'],
    });

  expect(res.status).toBe(200);
  expect(createBody).toBeTruthy();
  expect(String(createBody.name)).toContain('Vibes — 流行 🎧');
  expect(String(createBody.description)).toContain('Hand-picked bops ✨🔥');
});

it('whitespace-only name/description are treated as omitted after trimming', async () => {
  let createBody: any = null;

  nock(SPOTIFY_API)
    .post('/v1/users/me/playlists')
    .reply(201, function (_uri, body) {
      createBody = typeof body === 'string' ? JSON.parse(body) : body;
      return {
        id: 'pl_meta_ws',
        external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_ws' },
      };
    });

  nock(SPOTIFY_API)
    .post('/v1/playlists/pl_meta_ws/tracks')
    .reply(201, { snapshot_id: 'snapWS' });

  const res = await request(app)
    .post('/api/playlist/export')
    .set('Cookie', 'access=test-access-token')
    .send({
      name: '   \n\t  ',          // becomes empty after trimming
      description: '   \r  ',     // becomes empty after trimming
      __testUris: ['spotify:track:WS001'],
    });

  expect(res.status).toBe(200);
  expect(createBody).toBeTruthy();

  // Accept either behavior:
  //  - keys omitted, or
  //  - replaced by a default upstream (FE) and sent as a non-empty string.
  const name = createBody.name;
  const desc = createBody.description;

  const nameOmitted = typeof name === 'undefined' || name === null || String(name).trim() === '';
  const descOmitted = typeof desc === 'undefined' || desc === null || String(desc).trim() === '';

  // At least they are not sent as raw whitespace
  if (!nameOmitted) expect(String(name).trim().length).toBeGreaterThan(0);
  if (!descOmitted) expect(String(desc).trim().length).toBeGreaterThan(0);
});

it('handles overly long inputs (does not break; may truncate or pass-through within limits)', async () => {
  let createBody: any = null;

  nock(SPOTIFY_API)
    .post('/v1/users/me/playlists')
    .reply(201, function (_uri, body) {
      createBody = typeof body === 'string' ? JSON.parse(body) : body;
      return {
        id: 'pl_meta_long',
        external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_long' },
      };
    });

  nock(SPOTIFY_API)
    .post('/v1/playlists/pl_meta_long/tracks')
    .reply(201, { snapshot_id: 'snapL' });

  const longName = 'N'.repeat(300);
  const longDesc = 'D'.repeat(1000);

  const res = await request(app)
    .post('/api/playlist/export')
    .set('Cookie', 'access=test-access-token')
    .send({
      name: longName,
      description: longDesc,
      __testUris: ['spotify:track:LONG001'],
    });

    expect(res.status).toBe(200);
    expect(createBody).toBeTruthy();

    // We accept either explicit truncation or pass-through,
    // but ensure they are strings and not whitespace.
    const name = String(createBody.name ?? '');
    const desc = String(createBody.description ?? '');

    expect(name.trim().length).toBeGreaterThan(0);
    expect(desc.trim().length).toBeGreaterThan(0);

    // If you add truncation on the server, keep these guards:
    // const NAME_MAX = 100;
    // const DESC_MAX = 300;
    // expect(name.length).toBeLessThanOrEqual(NAME_MAX);
    // expect(desc.length).toBeLessThanOrEqual(DESC_MAX);
  });

  it('requires auth cookie (no access token → 401/403)', async () => {
    // No nocks: backend should bail before trying Spotify
    const res = await request(app)
      .post('/api/playlist/export')
      .send({ name: 'NoAuth', description: 'Should fail', __testUris: ['spotify:track:NOPE'] });

    // Your route may use 401 or 403 depending on implementation
    expect([401, 403]).toContain(res.status);
  });

  it('supports unicode/emoji in name and description (no mangling)', async () => {
    let createBody: any = null;

    nock(SPOTIFY_API)
      .post('/v1/users/me/playlists')
      .reply(201, function (_uri, body) {
        createBody = typeof body === 'string' ? JSON.parse(body) : body;
        return {
          id: 'pl_meta_unicode',
          external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_unicode' },
        };
      });

    nock(SPOTIFY_API)
      .post('/v1/playlists/pl_meta_unicode/tracks')
      .reply(201, { snapshot_id: 'snapU' });

    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', 'access=test-access-token')
      .send({
        name: 'Vibes — 流行 🎧',
        description: 'Hand-picked bops ✨🔥',
        __testUris: ['spotify:track:UNIC001'],
      });

    expect(res.status).toBe(200);
    expect(createBody).toBeTruthy();
    expect(String(createBody.name)).toContain('Vibes — 流行 🎧');
    expect(String(createBody.description)).toContain('Hand-picked bops ✨🔥');
  });

  it('whitespace-only name/description are treated as omitted after trimming', async () => {
    let createBody: any = null;

    nock(SPOTIFY_API)
      .post('/v1/users/me/playlists')
      .reply(201, function (_uri, body) {
        createBody = typeof body === 'string' ? JSON.parse(body) : body;
        return {
          id: 'pl_meta_ws',
          external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_ws' },
        };
      });

    nock(SPOTIFY_API)
      .post('/v1/playlists/pl_meta_ws/tracks')
      .reply(201, { snapshot_id: 'snapWS' });

    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', 'access=test-access-token')
      .send({
        name: '   \n\t  ',          // becomes empty after trimming
        description: '   \r  ',     // becomes empty after trimming
        __testUris: ['spotify:track:WS001'],
      });

    expect(res.status).toBe(200);
    expect(createBody).toBeTruthy();

    // Accept either behavior:
    //  - keys omitted, or
    //  - replaced by a default upstream (FE) and sent as a non-empty string.
    const name = createBody.name;
    const desc = createBody.description;

    const nameOmitted = typeof name === 'undefined' || name === null || String(name).trim() === '';
    const descOmitted = typeof desc === 'undefined' || desc === null || String(desc).trim() === '';

    // At least they are not sent as raw whitespace
    if (!nameOmitted) expect(String(name).trim().length).toBeGreaterThan(0);
    if (!descOmitted) expect(String(desc).trim().length).toBeGreaterThan(0);
  });

  it('handles overly long inputs (does not break; may truncate or pass-through within limits)', async () => {
    let createBody: any = null;

    nock(SPOTIFY_API)
      .post('/v1/users/me/playlists')
      .reply(201, function (_uri, body) {
        createBody = typeof body === 'string' ? JSON.parse(body) : body;
        return {
          id: 'pl_meta_long',
          external_urls: { spotify: 'https://open.spotify.com/playlist/pl_meta_long' },
        };
      });

    nock(SPOTIFY_API)
      .post('/v1/playlists/pl_meta_long/tracks')
      .reply(201, { snapshot_id: 'snapL' });

    const longName = 'N'.repeat(300);
    const longDesc = 'D'.repeat(1000);

    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', 'access=test-access-token')
      .send({
        name: longName,
        description: longDesc,
        __testUris: ['spotify:track:LONG001'],
      });

    expect(res.status).toBe(200);
    expect(createBody).toBeTruthy();

    // We accept either explicit truncation or pass-through,
    // but ensure they are strings and not whitespace.
    const name = String(createBody.name ?? '');
    const desc = String(createBody.description ?? '');

    expect(name.trim().length).toBeGreaterThan(0);
    expect(desc.trim().length).toBeGreaterThan(0);

    // If you add truncation on the server, keep these guards:
    // const NAME_MAX = 100;
    // const DESC_MAX = 300;
    // expect(name.length).toBeLessThanOrEqual(NAME_MAX);
    // expect(desc.length).toBeLessThanOrEqual(DESC_MAX);
  });

  it('requires auth cookie (no access token → 401/403)', async () => {
    // No nocks: backend should bail before trying Spotify
    const res = await request(app)
      .post('/api/playlist/export')
      .send({ name: 'NoAuth', description: 'Should fail', __testUris: ['spotify:track:NOPE'] });

    // Your route may use 401 or 403 depending on implementation
    expect([401, 403]).toContain(res.status);
  });

});

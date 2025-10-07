// tests/integration/it-004-export.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import nock from 'nock';
import app from "../../melodex-back-end/app.js";

const EXPORT_PATH = '/api/playlist/export';
const AUTH_COOKIE = 'access=it-test-access; Path=/; HttpOnly; SameSite=Lax';

describe('IT-004-Export — Empty filter message', () => {
  beforeAll(() => {
    // Block all external HTTP calls (except localhost)
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|::1|localhost)/);
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    // No external Spotify calls should be made for the empty path
    expect(nock.isDone()).toBe(true);
  });

  it('returns NO_SONGS when filters.type === "none" (no Spotify calls)', async () => {
    const res = await request(app)
      .post(EXPORT_PATH)
      .set('Cookie', AUTH_COOKIE) // satisfy requireSpotifyAuth (checks for "access=")
      .send({
        filters: { type: 'none' },
        name: 'Any',
        description: ''
      })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'NO_SONGS'
      })
    );
    if ('message' in res.body) {
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    }
  });

  it('is idempotent: repeated requests with type "none" return same contract', async () => {
    const payload = {
      filters: { type: 'none' },
      name: 'Irrelevant',
      description: 'Ignored on empty'
    };

    const first = await request(app).post(EXPORT_PATH).set('Cookie', AUTH_COOKIE).send(payload).expect(200);
    const second = await request(app).post(EXPORT_PATH).set('Cookie', AUTH_COOKIE).send(payload).expect(200);

    for (const res of [first, second]) {
      expect(res.body).toEqual(
        expect.objectContaining({
          ok: false,
          code: 'NO_SONGS'
        })
      );
    }
  });

  it('ignores name/description variations on empty (still NO_SONGS)', async () => {
    const variations = [
      { filters: { type: 'none' }, name: '', description: '' },
      { filters: { type: 'none' }, name: 'Custom', description: '' },
      { filters: { type: 'none' }, name: 'Custom', description: 'Desc' }
    ];

    for (const body of variations) {
      const res = await request(app).post(EXPORT_PATH).set('Cookie', AUTH_COOKIE).send(body).expect(200);
      expect(res.body).toEqual(expect.objectContaining({ ok: false, code: 'NO_SONGS' }));
    }
  });
});

// tests/integration/export/it-004-empty-filter.spec.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';

const app = require('../../melodex-back-end/app');

describe('IT-004-Export — Empty filter → no songs available', () => {
  it('returns NO_SONGS (no Spotify calls)', async () => {
    const res = await request(app)
      .post('/api/playlist/export')
      .set('Cookie', ['access=acc-token']) // passes requireSpotifyAuth
      .send({ name: 'Empty', filters: { type: 'none' } })
      .expect(200); // or 422 if you prefer; matches stub contract

    expect(res.body).toMatchObject({
      ok: false,
      code: 'NO_SONGS',
      message: expect.stringMatching(/no songs/i),
    });
  });
});

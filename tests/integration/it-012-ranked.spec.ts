// tests/integration/it-012-ranked.spec.ts
// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import { apiRouter, authRouter } from '../../melodex-back-end/routes/api';

// Build an in-process Express app using your real routers
let app: any;
let request: any;

beforeAll(async () => {
  const express = require('express');
  const supertest = require('supertest');

  // Minimal seed to make responses deterministic
  // NOTE: keep only documented/allowed fields for contract tests
  const SEED = [
    {
      _id: 'doc1',
      userID: 'e2e-user',
      deezerID: 1111,
      songName: 'Song A',
      artist: 'Artist A',
      ranking: 1200,
      genre: 'rock',
      subgenre: 'indie',
    },
    {
      _id: 'doc2',
      userID: 'e2e-user',
      deezerID: '2222',
      songName: 'Song B',
      artist: 'Artist B',
      ranking: 1100,
      genre: 'rock',
      subgenre: 'alt',
    },
    {
      _id: 'doc3',
      userID: 'someone-else',
      deezerID: 3333,
      songName: 'Ignore Me',
      artist: 'Other',
      ranking: 999,
      genre: 'jazz',
    },
  ];

  // Tiny in-memory "db" that matches the controller's expectations
  const dbStub = {
    collection(name: string) {
      if (name !== 'user_songs') {
        return {
          find() {
            return { toArray: async () => [] };
          },
        };
      }
      return {
        find(query: any) {
          // Controller builds: { userID, skipped: false, genre?, subgenre? }
          const {
            userID, genre, subgenre, skipped = false,
          } = query || {};
          const rows = SEED.filter((row) => {
            if (row.userID !== userID) return false;
            if (skipped !== false && row.skipped !== skipped) return false; // we never seed skipped=true
            if (subgenre && subgenre !== 'any') {
              if (row.subgenre !== subgenre) return false;
              if (genre && genre !== 'any' && row.genre !== genre) return false;
              return true;
            }
            if (genre && genre !== 'any') return row.genre === genre;
            return true;
          });
          return { toArray: async () => rows };
        },
      };
    },
  };

  // Assemble the app as your real server would
  app = express();
  app.use(express.json());
  app.locals.db = dbStub;            // <-- Required by UserSongsController
  app.use('/api', apiRouter);        // <-- Mount /api/*
  app.use(authRouter);               // <-- Mount /auth/*

  request = supertest(app);
});

// ---- Helpers & validators ----
const ENDPOINT = '/api/user-songs/ranked';
const STRICT = String(process.env.IT012_STRICT || '').toLowerCase() === 'true';

// Documented core fields:
const ALLOWED_FIELDS = new Set([
  'deezerID',
  'songName',
  'artist',
  'ranking',
  // tolerated optionals used by FE:
  '_id',
  'albumCover',
  'previewURL',
  'isrc',
  'genre',
  'subgenre',
  'decade',
  'lastDeezerRefresh',
]);

function isValidItemShape(x: any) {
  const hasDeezerID =
    x != null &&
    ('deezerID' in x) &&
    (typeof x.deezerID === 'string' || typeof x.deezerID === 'number');

  return (
    hasDeezerID &&
    typeof x.songName === 'string' &&
    typeof x.artist === 'string' &&
    typeof x.ranking === 'number'
  );
}

function checkNoUnexpectedFields(x: any) {
  const extras = Object.keys(x || {}).filter((k) => !ALLOWED_FIELDS.has(k));
  expect(extras, `Unexpected fields present: ${extras.join(', ')}`).toEqual([]);
}

// ---- Tests ----
describe('IT-012-Ranked — Ranked endpoint contract', () => {
  it('returns 200 and an array for a basic request', async () => {
    const userID = 'e2e-user';
    const res = await request.post(ENDPOINT).send({ userID }).set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const item of res.body) {
      expect(isValidItemShape(item)).toBe(true);
      if (STRICT) checkNoUnexpectedFields(item);
    }
  });

  it('supports optional filters (genre/subgenre) and still respects the schema', async () => {
    const userID = 'e2e-user';
    const res = await request
      .post(ENDPOINT)
      .send({ userID, genre: 'rock', subgenre: 'indie' })
      .set('Content-Type', 'application/json');

    expect([200, 204]).toContain(res.status);
    if (res.status === 204) return;

    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(isValidItemShape(item)).toBe(true);
      if (STRICT) checkNoUnexpectedFields(item);
    }
  });

  it('enforces ranking as number and deezerID as string|number for every item', async () => {
    const userID = 'e2e-user';
    const res = await request.post(ENDPOINT).send({ userID }).set('Content-Type', 'application/json');

    expect([200, 204]).toContain(res.status);
    if (res.status === 204) return;

    for (const item of res.body) {
      expect(typeof item.ranking).toBe('number');
      expect(['string', 'number']).toContain(typeof item.deezerID);
    }
  });

  it('does not require optional fields (ISRC, albumCover, previewURL) to be present', async () => {
    const userID = 'e2e-user';
    const res = await request.post(ENDPOINT).send({ userID }).set('Content-Type', 'application/json');

    expect([200, 204]).toContain(res.status);
    if (res.status === 204) return;

    for (const item of res.body) {
      if ('isrc' in item) expect(typeof item.isrc === 'string' || item.isrc == null).toBe(true);
      if ('albumCover' in item) expect(typeof item.albumCover === 'string' || item.albumCover == null).toBe(true);
      if ('previewURL' in item) expect(typeof item.previewURL === 'string' || item.previewURL == null).toBe(true);
    }
  });
});

// tests/unit/ut-011-export.spec.ts
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { selectRankedByRules } from '../../melodex-front-end/src/utils/spotifyExport';

const S = (over = {}) => ({
  deezerID: over.deezerID ?? 1,
  songName: over.songName ?? 'X',
  artist: over.artist ?? 'A',
  ranking: over.ranking ?? 1000,
  genre: over.genre ?? 'rock',
  subgenre: over.subgenre ?? 'indie',
  // Keep nulls as null if explicitly provided; only default when undefined
  decade: (over.decade === undefined) ? '1990s' : over.decade,
});

describe('UT-011 — Selector rules (genre/subgenre/decade)', () => {
  const base = [
    S({ deezerID: 1, genre: 'rock',  subgenre: 'indie', decade: '1990s' }),
    S({ deezerID: 2, genre: 'rock',  subgenre: 'alt',   decade: '2000s' }),
    S({ deezerID: 3, genre: 'jazz',  subgenre: 'bebop', decade: '1950s' }),
    S({ deezerID: 4, genre: 'pop',   subgenre: 'dance', decade: '2010s' }),
    S({ deezerID: 5, genre: 'rock',  subgenre: 'indie', decade: null     }),
    S({ deezerID: 6, genre: 'metal', subgenre: 'doom',  decade: 1995     }), // numeric year
  ];

  it('no filters → returns all', () => {
    const out = selectRankedByRules(base, { genre: 'any', subgenre: 'any', decade: 'all decades' });
    expect(out.map(s => s.deezerID)).toEqual([1,2,3,4,5,6]);
  });

  it('genre only → include items with matching genre', () => {
    const out = selectRankedByRules(base, { genre: 'rock', subgenre: 'any', decade: 'all decades' });
    expect(out.map(s => s.deezerID)).toEqual([1,2,5]);
  });

  it('subgenre only → include exact subgenre regardless of genre', () => {
    const out = selectRankedByRules(base, { genre: 'any', subgenre: 'indie', decade: 'all decades' });
    expect(out.map(s => s.deezerID)).toEqual([1,5]);
  });

  it('genre + subgenre → must match BOTH (prevents cross-genre subgenre collisions)', () => {
    const out = selectRankedByRules(base, { genre: 'rock', subgenre: 'indie', decade: 'all decades' });
    expect(out.map(s => s.deezerID)).toEqual([1,5]);
  });

  it('decade label (e.g., "1990s") → include only that decade', () => {
    const out = selectRankedByRules(base, { genre: 'any', subgenre: 'any', decade: '1990s' });
    // Accept label '1990s' OR numeric year within 1990..1999
    expect(out.map(s => s.deezerID)).toEqual([1,6]);
  });

  it('decade + genre → both constraints applied', () => {
    const out = selectRankedByRules(base, { genre: 'rock', subgenre: 'any', decade: '2000s' });
    expect(out.map(s => s.deezerID)).toEqual([2]);
  });

  it('unknown/empty decade when decade filter is set → exclude', () => {
    const out = selectRankedByRules(base, { genre: 'any', subgenre: 'any', decade: '2010s' });
    expect(out.map(s => s.deezerID)).toEqual([4]); // item 5 (null) excluded
  });

  it('case/space normalization on inputs', () => {
    const out = selectRankedByRules(base, { genre: '  RoCk  ', subgenre: '  InDiE ', decade: ' all decades ' });
    expect(out.map(s => s.deezerID)).toEqual([1,5]);
  });

  it('defensive: non-array input returns []', () => {
    expect(selectRankedByRules(null, { genre: 'any', subgenre: 'any', decade: 'all decades' })).toEqual([]);
  });

  it('decade range "1990-1999" → includes items within range', () => {
  const out = selectRankedByRules(base, { genre: 'any', subgenre: 'any', decade: '1990-1999' });
  // 1 = "1990s" (label) → inside; 6 = 1995 (number) → inside
  expect(out.map(s => s.deezerID)).toEqual([1, 6]);
  });

  it('single-year decade "1995" → matches numeric 1995 and string "1995"', () => {
    const local = [
      ...base,
      S({ deezerID: 7, genre: 'rock', subgenre: 'indie', decade: '1995' }),
    ];
    const out = selectRankedByRules(local, { genre: 'any', subgenre: 'any', decade: '1995' });
    // 6 = 1995 (number), 7 = "1995" (string)
    expect(out.map(s => s.deezerID)).toEqual([6, 7]);
  });

  it('invalid decade range "1999-1990" → returns empty (guard)', () => {
    const out = selectRankedByRules(base, { genre: 'any', subgenre: 'any', decade: '1999-1990' });
    expect(out).toEqual([]);
  });

  it('blank decade on item ("") is excluded when a decade filter is set', () => {
    const local = [
      ...base,
      S({ deezerID: 8, genre: 'rock', subgenre: 'indie', decade: '' }),
    ];
    const out = selectRankedByRules(local, { genre: 'any', subgenre: 'any', decade: '2010s' });
    // Only item 4 is 2010s; blank decade (8) is excluded
    expect(out.map(s => s.deezerID)).toEqual([4]);
  });

  it('decade input normalization (spaces/case) — "  1990-1999  " equals "1990-1999"', () => {
    const out = selectRankedByRules(base, { genre: 'any', subgenre: 'any', decade: '  1990-1999  ' });
    expect(out.map(s => s.deezerID)).toEqual([1, 6]);
  });

  it('requires exact subgenre when subgenre filter set; excludes items with empty subgenre', () => {
    const local = [
      ...base,
      S({ deezerID: 9, genre: 'rock', subgenre: '' }),
    ];
    const out = selectRankedByRules(local, { genre: 'any', subgenre: 'indie', decade: 'all decades' });
    // 1 & 5 are indie; 9 has empty subgenre → excluded
    expect(out.map(s => s.deezerID)).toEqual([1, 5]);
  });

  it('genre + subgenre intersection still respects decade constraints', () => {
    const local = [
      S({ deezerID: 10, genre: 'rock', subgenre: 'indie', decade: '1980s' }),
      S({ deezerID: 11, genre: 'rock', subgenre: 'indie', decade: '1990s' }),
      S({ deezerID: 12, genre: 'rock', subgenre: 'indie', decade: 1995 }),
    ];
    const out = selectRankedByRules(local, { genre: 'rock', subgenre: 'indie', decade: '1990-1999' });
    expect(out.map(s => s.deezerID)).toEqual([11, 12]);
  });

});

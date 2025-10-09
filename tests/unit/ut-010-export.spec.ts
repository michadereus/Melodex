// tests/unit/export/ut-010-empty-selection.spec.ts
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { buildFilters, selectRankedByRules } from '../../melodex-front-end/src/utils/spotifyExport';

const S = (over = {}) => ({
  deezerID: over.deezerID ?? 1,
  songName: over.songName ?? 'X',
  artist: over.artist ?? 'A',
  ranking: over.ranking ?? 1000,
  genre: over.genre ?? 'rock',
  subgenre: over.subgenre ?? 'indie',
  decade: (over.decade === undefined) ? '1990s' : over.decade,
});

describe('UT-010 — Selector empty result returns proper status', () => {
  const base = [
    S({ deezerID: 1, genre: 'rock',  subgenre: 'indie', decade: '1990s' }),
    S({ deezerID: 2, genre: 'rock',  subgenre: 'alt',   decade: '2000s' }),
    S({ deezerID: 3, genre: 'jazz',  subgenre: 'bebop', decade: '1950s' }),
  ];

  /** ---------- Path A: buildFilters signals "none" ---------- **/

  it('no genre & no subgenre → buildFilters returns { type: "none" }', () => {
    const f = buildFilters({}); // explicit empty selection
    expect(f).toEqual({ type: 'none' });
  });

  it('subgenre without genre → buildFilters returns { type: "none" }', () => {
    const f = buildFilters({ genre: '', subgenre: 'indie' });
    expect(f).toEqual({ type: 'none' });
  });

  it('whitespace-only inputs normalize to empty → { type: "none" }', () => {
    const f = buildFilters({ genre: '   ', subgenre: '   ' });
    expect(f).toEqual({ type: 'none' });
  });

  /** ---------- Path B: selector yields zero matches ---------- **/

  it('valid filter but zero matches → selectRankedByRules returns []', () => {
    const out = selectRankedByRules(base, { genre: 'metal', subgenre: 'doom', decade: '1990s' });
    expect(out).toEqual([]);
  });

  it('decade constraint eliminates all (items missing decade) → []', () => {
    const local = [
      S({ deezerID: 10, genre: 'rock', subgenre: 'indie', decade: null }),
      S({ deezerID: 11, genre: 'rock', subgenre: 'indie', decade: '' }),
    ];
    const out = selectRankedByRules(local, { genre: 'any', subgenre: 'any', decade: '1990s' });
    expect(out).toEqual([]);
  });

  it('case/space normalization still yields empty when nothing matches', () => {
    const out = selectRankedByRules(base, { genre: '  JaZz  ', subgenre: ' fusion ', decade: ' 2010s ' });
    expect(out).toEqual([]);
  });
});

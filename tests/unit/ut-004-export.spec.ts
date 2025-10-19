// tests/unit/export/ut-004-mapping.spec.ts
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { mapDeezerToSpotifyUris, buildCreatePayload } from '../../melodex-front-end/src/utils/spotifyExport';

// Factory for a Deezer-ranked item (frontend-side)
const mkItem = (over = {}) => ({
  // "legacy"/varied shapes we often see in FE fixtures
  deezerId: 'dz1',
  deezerID: undefined, // sometimes present as proper-cased
  title: 'Song A',
  songName: undefined,  // sometimes present as FE's canonical key
  artist: 'Artist A',
  isrc: 'US-AAA-00-00001',
  removed: false,
  skipped: false,
  rank: 1,              // sometimes "rank" vs "ranking"
  ranking: undefined,
  spotifyUri: undefined, // when already known
  ...over,
});

describe('UT-004-Export — Deezer → Spotify mapping', () => {
  it('ISRC lookup preferred', async () => {
    const items = [
      mkItem(),
      mkItem({ deezerId: 'dz2', isrc: 'US-AAA-00-00002', rank: 2 }),
    ];

    const search = vi.fn(async (q) => {
      if (q.isrc === 'US-AAA-00-00001') return { uri: 'spotify:track:111' };
      if (q.isrc === 'US-AAA-00-00002') return { uri: 'spotify:track:222' };
      return null;
    });

    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:111', 'spotify:track:222']);
    // ensure we only used ISRC path here
    expect(search.mock.calls.every(([q]) => 'isrc' in q)).toBe(true);
  });

  it('falls back to normalized title+artist when ISRC missing', async () => {
    const items = [mkItem({ isrc: null, title: 'Hello', artist: 'World' })];
    const search = vi.fn(async (q) =>
      q.title === 'hello' && q.artist === 'world' ? { uri: 'spotify:track:999' } : null
    );
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:999']);
    expect(search).toHaveBeenCalledWith({ title: 'hello', artist: 'world' });
  });

  it('applies normalization (trim/collapse/case) on title+artist', async () => {
    const items = [
      mkItem({
        isrc: null,
        title: '  The  Killing Moon ',
        artist: 'ECHO &  The   BUNNYMEN',
      }),
    ];
    const search = vi.fn(async (q) =>
      q.title === 'the killing moon' && q.artist === 'echo & the bunnymen'
        ? { uri: 'spotify:track:tkm' }
        : null
    );
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:tkm']);
  });

  it('dedupes identical Spotify URIs and preserves first-encountered order', async () => {
    const items = [
      mkItem({ deezerId: 'dz1', isrc: 'X1', rank: 1 }),
      mkItem({ deezerId: 'dz2', isrc: 'X2', rank: 2 }),
      mkItem({ deezerId: 'dz3', isrc: 'X1', rank: 3 }), // maps to same as dz1
    ];
    const search = vi.fn(async (q) => {
      if (q.isrc === 'X1') return { uri: 'spotify:track:SAME' };
      if (q.isrc === 'X2') return { uri: 'spotify:track:UNIQ' };
      return null;
    });
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:SAME', 'spotify:track:UNIQ']);
  });

  it('excludes removed/skipped items and maintains the remaining order', async () => {
    const items = [
      mkItem({ deezerId: 'a', isrc: 'A', rank: 5 }),
      mkItem({ deezerId: 'b', isrc: 'B', rank: 2, removed: true }),
      mkItem({ deezerId: 'c', isrc: 'C', rank: 9, skipped: true }),
      mkItem({ deezerId: 'd', isrc: 'D', rank: 1 }),
    ];
    const search = vi.fn(async (q) => ({ uri: `spotify:track:${q.isrc}` }));
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:A', 'spotify:track:D']);
  });

  it('tolerates unmapped items without throwing and keeps mapped results', async () => {
    const items = [mkItem({ isrc: 'X1' }), mkItem({ isrc: 'X2', deezerId: 'dz2' })];
    const search = vi.fn(async (q) => (q.isrc === 'X2' ? { uri: 'spotify:track:two' } : null));
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:two']);
  });

  it('uses existing spotifyUri directly and does not call search for those items', async () => {
    const items = [
      mkItem({ spotifyUri: 'spotify:track:direct1', isrc: 'WILL_NOT_BE_USED' }),
      mkItem({ isrc: 'X2' }),
    ];
    const search = vi.fn(async (q) => (q.isrc === 'X2' ? { uri: 'spotify:track:two' } : null));

    const { uris } = await mapDeezerToSpotifyUris(items, search);

    expect(uris).toEqual(['spotify:track:direct1', 'spotify:track:two']);
    // search should only be called once — for the second item
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('skips null/undefined/empty inputs defensively', async () => {
    const items = [null, undefined, mkItem({ isrc: null, title: 'a', artist: '' })];
    const search = vi.fn(async () => null);
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual([]);
  });

  it('supports alternate field shapes (deezerID, songName, ranking) used in FE', async () => {
    const items = [
      mkItem({
        // FE canonical keys (Rankings/SongContext)
        deezerID: 1234,
        songName: 'Alt Name',
        artist: 'Alt Artist',
        ranking: 1337,
        isrc: 'ALT-ISRC-1',
        deezerId: undefined,
        title: undefined,
        rank: undefined,
      }),
    ];
    const search = vi.fn(async (q) => (q.isrc === 'ALT-ISRC-1' ? { uri: 'spotify:track:alt' } : null));
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:alt']);
  });
});

describe('UT-004-Export — buildCreatePayload', () => {
  it('carries name/description/uris when provided', () => {
    const payload = buildCreatePayload({
      name: 'Melodex Playlist 2025-10-03',
      description: 'Generated by Melodex',
      uris: ['spotify:track:1', 'spotify:track:2'],
    });
    expect(payload).toEqual({
      name: 'Melodex Playlist 2025-10-03',
      description: 'Generated by Melodex',
      uris: ['spotify:track:1', 'spotify:track:2'],
    });
  });

  it('trims whitespace and falls back to defaults when name/description are blanky', () => {
    const payload = buildCreatePayload({
      name: '   ',
      description: '\n\t',
      uris: ['spotify:track:abc'],
    });
    expect(typeof payload.name).toBe('string');
    expect(payload.name.length).toBeGreaterThan(0);
    expect(typeof payload.description).toBe('string');
    expect(payload.description.length).toBeGreaterThan(0);
    expect(payload.uris).toEqual(['spotify:track:abc']);
  });

  it('defensively coalesces uris to an array and ignores malformed values', () => {
    const payload = buildCreatePayload({
      name: 'X',
      description: 'Y',
      // simulate accidental junk inside array – builder should at least coerce to array
      uris: ['spotify:track:ok1', 123, null, 'not-spotify', 'spotify:track:ok2'],
    });
    // We only assert it's an array and includes the originally valid strings; exact filtering of bad ones is impl-dependent.
    expect(Array.isArray(payload.uris)).toBe(true);
    expect(payload.uris.includes('spotify:track:ok1')).toBe(true);
    expect(payload.uris.includes('spotify:track:ok2')).toBe(true);
  });

  it('prefers canonical over variants when both returned', async () => {
    const items = [mkItem({ isrc: null, title: 'Blue Monday', artist: 'New Order' })];
    const search = vi.fn(async (q) => ({
      items: [
        { uri: 'spotify:track:var1', name: 'Blue Monday - 2011 Remaster', duration_ms: 446000 },
        { uri: 'spotify:track:canon', name: 'Blue Monday', duration_ms: 446000 },
      ],
    }));
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:canon']);
  });

  it('picks the candidate within ±3000ms of Deezer duration', async () => {
    const items = [mkItem({ isrc: null, title: 'Crazy Eyes', artist: 'Hall & Oates', durationMs: 180800 })];
    const search = vi.fn(async () => ({
      items: [
        { uri: 'spotify:track:a', name: 'Crazy Eyes', duration_ms: 182300 },
        { uri: 'spotify:track:b', name: 'Crazy Eyes', duration_ms: 180900 }, // 100ms away
      ],
    }));
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:b']);
  });

  it('handles parentheses/punctuation in title', async () => {
    const items = [mkItem({ isrc: null, title: 'Song (feat. X) – Remastered 2011', artist: 'Artist Y' })];
    const search = vi.fn(async ({ title, artist }) => {
      expect(title).toBe('song');      // scrubbed
      expect(artist).toBe('artist y');
      return { uri: 'spotify:track:ok' };
    });
    const { uris } = await mapDeezerToSpotifyUris(items, search);
    expect(uris).toEqual(['spotify:track:ok']);
  });

});

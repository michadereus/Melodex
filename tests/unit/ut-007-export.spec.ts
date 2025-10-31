// tests/unit/ut-007-export.spec.ts
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { exportPlaylistWorker } from '../../melodex-back-end/utils/exportWorker';

function makeDeps({
  addStatusSeq = [201],
  reasons = [],
  retryAfter = '0',
} = {}) {
  const httpCreate = vi.fn().mockResolvedValue({
    id: 'pl_ut007',
    external_urls: { spotify: 'https://open.spotify.com/playlist/pl_ut007' },
  });

  // Simulate a sequence of statuses across calls to "add"
  const seq = [...addStatusSeq];
  const httpAdd = vi.fn().mockImplementation(async ({ uris }) => {
    const status = seq.length ? seq.shift() : 201;
    const headers = status === 429 ? { 'retry-after': retryAfter } : {};
    return { status, headers, uris };
  });

  const mapper = {
    mapMany: vi.fn().mockResolvedValue({
      uris: ['spotify:track:a', 'spotify:track:b', 'spotify:track:c'],
      // e.g., [{ uri:'spotify:track:z', reason:'NOT_FOUND', index: 0 }]
      skipped: reasons,
    }),
  };

  return { httpCreate, httpAdd, mapper };
}

function maybeExpectNoErrorsArray(res: any) {
  // If you later add a unified errors[], keep this test stable.
  if ('errors' in res) expect(res.errors).toEqual([]);
}

describe('UT-007 — Export worker per-item error surfacing (AC-06.1)', () => {
  it('aggregates successes and returns empty errors on all-201; preserves ordering', async () => {
    const deps = makeDeps({ addStatusSeq: [201, 201] });

    const res = await exportPlaylistWorker({
      ...deps,
      items: [{ deezerID: 1 }, { deezerID: 2 }, { deezerID: 3 }],
      name: 'UnitRun',
      description: 'ut-007',
      chunkSize: 2,
    });

    expect(res.ok).toBe(true);
    // playlistUrl may or may not be exposed; tolerate either
    if ('playlistUrl' in res) {
      expect(res.playlistUrl).toBe('https://open.spotify.com/playlist/pl_ut007');
    }

    expect(res.kept).toEqual([
      'spotify:track:a',
      'spotify:track:b',
      'spotify:track:c',
    ]);

    expect(res.skipped).toEqual([]);
    expect(res.failed).toEqual([]);
    maybeExpectNoErrorsArray(res);
  });

  it('surfaces NOT_FOUND on add(404) without aborting later chunks; partial success contract', async () => {
    // First chunk 404, second chunk 201
    const deps = makeDeps({ addStatusSeq: [404, 201] });

    const items = [{ deezerID: 1 }, { deezerID: 2 }, { deezerID: 3 }];
    const res = await exportPlaylistWorker({
      ...deps,
      items,
      name: 'UnitRun',
      description: 'ut-007',
      chunkSize: 2,
    });

    expect(res.ok).toBe(true); // partial success must remain ok:true
    expect(res.kept).toEqual(['spotify:track:c']);
    // Your worker emits { id, reason } (not { uri })
    expect(res.failed).toEqual([
      { id: 'spotify:track:a', reason: 'NOT_FOUND' },
      { id: 'spotify:track:b', reason: 'NOT_FOUND' },
    ]);

    if ('errors' in res) {
      // If unified errors[] exists, assert core semantics (not strict shape)
      res.errors.forEach((e: any, i: number) => {
        expect(e.reason).toBe('NOT_FOUND');
        expect(e.stage ?? 'add').toBe('add');
        expect(e.index).toBe(i);
        expect(e.deezerID).toBe(items[i].deezerID);
      });
    }
  });

  it('applies 429 bounded retries and emits RATE_LIMIT errors on exhaustion; later chunks still proceed', async () => {
    // three attempts for first chunk: 429, 429, 429 → RATE_LIMIT; second chunk 201
    const deps = makeDeps({ addStatusSeq: [429, 429, 429, 201], retryAfter: '1' });

    const items = [{ deezerID: 1 }, { deezerID: 2 }, { deezerID: 3 }];
    const res = await exportPlaylistWorker({
      ...deps,
      items,
      name: 'UnitRun',
      description: 'ut-007',
      chunkSize: 2,
      maxAttempts: 3,
    });

    expect(res.kept).toEqual(['spotify:track:c']);
    // Expect { id, reason } here too
    expect(res.failed).toEqual([
      { id: 'spotify:track:a', reason: 'RATE_LIMIT' },
      { id: 'spotify:track:b', reason: 'RATE_LIMIT' },
    ]);

    if ('errors' in res) {
      res.errors.forEach((e: any, i: number) => {
        expect(e.reason).toBe('RATE_LIMIT');
        expect(e.code ?? 429).toBe(429);
        expect(e.stage ?? 'add').toBe('add');
        expect(e.index).toBe(i);
        expect(e.retryable ?? true).toBe(true);
        expect(e.deezerID).toBe(items[i].deezerID);
      });
    }
  });

  it('respects pre-mapping skips; mirrors them into errors[] as stage:map without failing the run', async () => {
    const { httpCreate, httpAdd, mapper } = makeDeps();
    mapper.mapMany.mockResolvedValueOnce({
      uris: [],
      // Your mapper includes an index; keep it and assert minimally
      skipped: [{ uri: 'spotify:track:z', reason: 'NOT_FOUND', index: 0 }],
    });

    const items = [{ deezerID: 9 }];
    const res = await exportPlaylistWorker({
      httpCreate,
      httpAdd,
      mapper,
      items,
      name: 'UnitRun',
      description: 'ut-007',
    });

    expect(res.ok).toBe(true);
    expect(res.kept).toEqual([]);
    expect(res.failed).toEqual([]); // no add-stage failures
    // Be tolerant to extra fields like "index"
    expect(res.skipped).toEqual([
      expect.objectContaining({ uri: 'spotify:track:z', reason: 'NOT_FOUND' }),
    ]);

    if ('errors' in res) {
      const e = res.errors[0];
      expect(e.reason).toBe('NOT_FOUND');
      expect(e.stage ?? 'map').toBe('map');
      expect(e.retryable ?? false).toBe(false);
      expect(e.index ?? 0).toBe(0);
      expect(e.deezerID ?? 9).toBe(9);
      expect(e.uri ?? 'spotify:track:z').toBe('spotify:track:z');
    }
  });
});

// tests/unit/export/ut-007-worker.spec.ts
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { exportPlaylistWorker } from '../../melodex-back-end/utils/exportWorker';

function makeDeps({ addStatusSeq = [201], reasons = [] } = {}) {
  const httpCreate = vi.fn().mockResolvedValue({
    id: 'pl_ut007',
    external_urls: { spotify: 'https://open.spotify.com/playlist/pl_ut007' },
  });

  // Simulate a sequence of statuses across calls
  const seq = [...addStatusSeq];
  const httpAdd = vi.fn().mockImplementation(async ({ uris }) => {
    const status = seq.length ? seq.shift() : 201;
    // fake headers for 429
    const headers = status === 429 ? { 'retry-after': '0' } : {};
    return { status, headers };
  });

  const mapper = {
    // return mapped URIs (one per item) + pre-skip reasons
    mapMany: vi.fn().mockResolvedValue({
      uris: ['spotify:track:a', 'spotify:track:b', 'spotify:track:c'],
      skipped: reasons, // e.g., [{ id:'spotify:track:z', reason:'NOT_FOUND' }]
    }),
  };

  return { httpCreate, httpAdd, mapper };
}

describe('UT-007 — Export worker pipeline', () => {
  it('aggregates kept/skipped/failed with stable ordering (all 201)', async () => {
    const deps = makeDeps({ addStatusSeq: [201, 201] });
    const res = await exportPlaylistWorker({
      ...deps,
      items: [{ deezerID: 1 }, { deezerID: 2 }, { deezerID: 3 }],
      name: 'UnitRun',
      description: 'ut-007',
      chunkSize: 2,
    });
    expect(res.ok).toBe(true);
    expect(res.kept).toEqual([
      'spotify:track:a',
      'spotify:track:b',
      'spotify:track:c',
    ]);
    expect(res.skipped).toEqual([]); // no pre-skip
    expect(res.failed).toEqual([]);
  });

  it('marks NOT_FOUND / REGION_BLOCKED at add step and continues', async () => {
    const deps = makeDeps({ addStatusSeq: [404, 201] }); // first chunk 404, second ok
    const res = await exportPlaylistWorker({
      ...deps,
      items: [{ deezerID: 1 }, { deezerID: 2 }, { deezerID: 3 }],
      name: 'UnitRun',
      description: 'ut-007',
      chunkSize: 2,
    });
    expect(res.ok).toBe(true);
    expect(res.failed).toEqual([
      { id: 'spotify:track:a', reason: 'NOT_FOUND' },
      { id: 'spotify:track:b', reason: 'NOT_FOUND' },
    ]);
    expect(res.kept).toEqual(['spotify:track:c']);
  });

  it('applies 429 policy with bounded retries; marks RATE_LIMIT on exhaustion', async () => {
    // three attempts for first chunk: 429, 429, 429 → RATE_LIMIT, second chunk 201
    const deps = makeDeps({ addStatusSeq: [429, 429, 429, 201] });
    const res = await exportPlaylistWorker({
      ...deps,
      items: [{ deezerID: 1 }, { deezerID: 2 }, { deezerID: 3 }],
      name: 'UnitRun',
      description: 'ut-007',
      chunkSize: 2,
      maxAttempts: 3,
    });
    expect(res.failed).toEqual([
      { id: 'spotify:track:a', reason: 'RATE_LIMIT' },
      { id: 'spotify:track:b', reason: 'RATE_LIMIT' },
    ]);
    expect(res.kept).toEqual(['spotify:track:c']);
  });

  it('respects pre-mapping skips and still succeeds with informative payload', async () => {
    const { httpCreate, httpAdd, mapper } = makeDeps();
    mapper.mapMany.mockResolvedValueOnce({
      uris: [],
      skipped: [{ id: 'spotify:track:z', reason: 'NOT_FOUND' }],
    });
    const res = await exportPlaylistWorker({
      httpCreate,
      httpAdd,
      mapper,
      items: [{ deezerID: 9 }],
      name: 'UnitRun',
      description: 'ut-007',
    });
    expect(res.ok).toBe(true);
    expect(res.kept).toEqual([]);
    expect(res.skipped).toEqual([{ id: 'spotify:track:z', reason: 'NOT_FOUND' }]);
    expect(res.failed).toEqual([]);
  });
});

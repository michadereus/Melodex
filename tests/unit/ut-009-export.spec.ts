// tests/unit/export/ut-009-chunking.spec.ts
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { postUrisInChunks } from '../../melodex-front-end/src/utils/spotifyExport';

function mk(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `spotify:track:${String(i + 1).padStart(6, '0')}`);
}

describe('UT-009 — Batch add in chunks of N', () => {
  it('exact multiple: 10 URIs in chunks of 5 → 2 batches (5,5), total 10', async () => {
    const uris = mk(10);
    const calls: string[][] = [];
    const postFn = vi.fn(async (batch: string[]) => { calls.push(batch); });

    const res = await postUrisInChunks(uris, 5, postFn);

    expect(res).toEqual({ batches: 2, total: 10 });
    expect(postFn).toHaveBeenCalledTimes(2);
    expect(calls[0]).toEqual(uris.slice(0, 5));
    expect(calls[1]).toEqual(uris.slice(5, 10));
    // Original array not mutated
    expect(uris.length).toBe(10);
  });

  it('remainder: 13 URIs in chunks of 5 → 3 batches (5,5,3), total 13', async () => {
    const uris = mk(13);
    const calls: string[][] = [];
    const postFn = vi.fn(async (batch: string[]) => { calls.push(batch); });

    const res = await postUrisInChunks(uris, 5, postFn);

    expect(res).toEqual({ batches: 3, total: 13 });
    expect(calls.map(b => b.length)).toEqual([5, 5, 3]);
    expect(calls.flat()).toEqual(uris); // order preserved across batches
  });

  it('single batch when chunkSize >= list length', async () => {
    const uris = mk(7);
    const postFn = vi.fn(async () => {});

    const res = await postUrisInChunks(uris, 999, postFn);

    expect(res).toEqual({ batches: 1, total: 7 });
    expect(postFn).toHaveBeenCalledTimes(1);
  });

  it('chunkSize = 1 → one call per URI (order preserved)', async () => {
    const uris = mk(3);
    const calls: string[][] = [];
    const postFn = vi.fn(async (batch: string[]) => { calls.push(batch); });

    const res = await postUrisInChunks(uris, 1, postFn);

    expect(res).toEqual({ batches: 3, total: 3 });
    expect(calls).toEqual([[uris[0]], [uris[1]], [uris[2]]]);
  });

  it('empty list → zero batches, zero total, no calls', async () => {
    const postFn = vi.fn(async () => {});
    const res = await postUrisInChunks([], 50, postFn);
    expect(res).toEqual({ batches: 0, total: 0 });
    expect(postFn).not.toHaveBeenCalled();
  });

  it('invalid chunkSize (<=0 or NaN) throws', async () => {
    const uris = mk(2);
    const postFn = vi.fn(async () => {});
    await expect(postUrisInChunks(uris, 0, postFn)).rejects.toThrow('chunkSize must be a positive integer');
    await expect(postUrisInChunks(uris, -5, postFn)).rejects.toThrow('chunkSize must be a positive integer');
    // @ts-expect-error
    await expect(postUrisInChunks(uris, 'nope', postFn)).rejects.toThrow();
  });
});

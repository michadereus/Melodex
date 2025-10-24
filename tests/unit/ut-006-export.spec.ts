// File: tests/unit/ut-006-export.spec.ts
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { formatDefaultPlaylistName } from '../../melodex-front-end/src/utils/formatDefaultPlaylistName';

// Helper: build a safe midday-UTC date to avoid timezone rollover issues
const utcMidday = (y, m1, d) => new Date(Date.UTC(y, m1 - 1, d, 12, 0, 0));

describe('UT-006 — formatDefaultPlaylistName (date → "Melodex Playlist YYYY-MM-DD")', () => {
  it('formats with leading zeros for month/day', () => {
    const date = utcMidday(2025, 3, 7); // 2025-03-07
    const name = formatDefaultPlaylistName(date);
    expect(name).toBe('Melodex Playlist 2025-03-07');
  });

  it('formats single-digit month/day correctly (e.g., 2023-01-02)', () => {
    const date = utcMidday(2023, 1, 2);
    const name = formatDefaultPlaylistName(date);
    expect(name).toBe('Melodex Playlist 2023-01-02');
  });

  it('is deterministic for the same input date', () => {
    const date = utcMidday(2024, 12, 31);
    const a = formatDefaultPlaylistName(date);
    const b = formatDefaultPlaylistName(date);
    expect(a).toBe(b);
  });

  it('works when called with “now” (no arg) — smoke test', () => {
    // We can’t assert the exact day without freezing timers,
    // just assert the stable prefix + YYYY-MM-DD shape.
    const name = formatDefaultPlaylistName();
    expect(name.startsWith('Melodex Playlist ')).toBe(true);
    expect(name.replace('Melodex Playlist ', '')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

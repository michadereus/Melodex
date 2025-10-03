// tests/unit/export/ut-003-filters.spec.ts
import { describe, it, expect } from 'vitest';
const { buildFilters } = require('@/export/filters');

describe('UT-003-Export — Filter builder', () => {
  it('empty -> type:none', () => {
    expect(buildFilters({})).toEqual({ type: 'none' });
    expect(buildFilters({ genre: null, subgenre: null })).toEqual({ type: 'none' });
  });

  it('genre only -> normalized genre', () => {
    expect(buildFilters({ genre: 'Alt', subgenre: null }))
      .toEqual({ type: 'genre', genre: 'alt' });
  });

  it('genre + subgenre -> both normalized', () => {
    expect(buildFilters({ genre: 'Rock', subgenre: 'Shoegaze ' }))
      .toEqual({ type: 'genre', genre: 'rock', subgenre: 'shoegaze' });
  });

  it('subgenre without genre -> none', () => {
    expect(buildFilters({ subgenre: 'shoegaze' }))
      .toEqual({ type: 'none' });
  });

  it('whitespace -> none', () => {
    expect(buildFilters({ genre: '   ' }))
      .toEqual({ type: 'none' });
  });

  it('stability across calls', () => {
    const a = buildFilters({ genre: 'Alt' });
    const b = buildFilters({ genre: 'alt' });
    expect(a).toEqual(b);
  });
});
import { describe, expect, it } from 'vitest';
import { pruneByPaths } from '../../src/youtube/prune';

describe('pruneByPaths', () => {
  it('removes ad placements and counts ad breaks while keeping video details', () => {
    const root = { adPlacements: [1, 2], videoDetails: {} };
    expect(pruneByPaths(root, ['adPlacements'])).toEqual({ removed: 1, adBreaks: 2 });
    expect(root).toEqual({ videoDetails: {} });
  });
  it('matches wildcard player responses', () => {
    const root = { a: { playerResponse: { playerAds: [] } } };
    expect(pruneByPaths(root, ['*.playerResponse.playerAds']).removed).toBe(1);
    expect(root).toEqual({ a: { playerResponse: {} } });
  });
  it('does not count a path that matches nothing', () => {
    expect(pruneByPaths({ videoDetails: {} }, ['adPlacements']).removed).toBe(0);
  });
  it('matches array indexes with a wildcard', () => {
    const root = { x: [{ adSlots: 1 }, { adSlots: 2 }] };
    expect(pruneByPaths(root, ['x.*.adSlots']).removed).toBe(2);
    expect(root).toEqual({ x: [{}, {}] });
  });
  it('returns zeros for primitive roots', () => {
    expect(pruneByPaths(42, ['adSlots'])).toEqual({ removed: 0, adBreaks: 0 });
  });
});

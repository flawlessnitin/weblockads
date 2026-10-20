import { describe, expect, it } from 'vitest';
import { formatAgo, formatCount, formatDuration } from '../../src/popup/format';

describe('popup formatting', () => {
  it.each([[48912, '48,912'], [0, '0']] as const)('formats count %s', (input, expected) => {
    expect(formatCount(input)).toBe(expected);
  });
  it.each([[22320, '6 h 12 m'], [600, '10 m'], [45, '45 s'], [0, '0 m']] as const)('formats duration %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
  it.each([[30000, 'just now'], [300000, '5 min ago'], [7200000, '2 h ago'], [259200000, '3 d ago']] as const)('formats age %s', (age, expected) => {
    const now = 1_800_000_000_000;
    expect(formatAgo(now - age, now)).toBe(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { getSiteKey } from '../../src/shared/domain';

describe('getSiteKey', () => {
  it('returns the YouTube registrable domain', () => {
    expect(getSiteKey('https://www.youtube.com/watch?v=x')).toBe('youtube.com');
  });
  it('handles multi-part public suffixes', () => {
    expect(getSiteKey('https://news.bbc.co.uk/a')).toBe('bbc.co.uk');
  });
  it('rejects non-http URLs', () => {
    expect(getSiteKey('chrome://extensions')).toBeNull();
  });
  it('rejects invalid URLs', () => {
    expect(getSiteKey('not a url')).toBeNull();
  });
});

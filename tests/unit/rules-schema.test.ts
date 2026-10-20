import { describe, expect, it } from 'vitest';
import bundled from '../../rules/rules.json';
import { validateRules } from '../../src/rules/schema';

describe('validateRules', () => {
  it('accepts bundled rules', () => {
    expect(validateRules(bundled)).toEqual(bundled);
  });
  it('rejects malformed rules', () => {
    for (const value of [
      { version: 1 }, { ...bundled, version: 0 }, { ...bundled, version: 1.5 },
      { ...bundled, youtube: { ...bundled.youtube, prunePaths: [1] } },
      { ...bundled, youtube: { ...bundled.youtube, hideSelectors: ['x'.repeat(301)] } },
      { ...bundled, youtube: { ...bundled.youtube, maxPlaybackRate: 32 } },
    ]) expect(validateRules(value)).toBeNull();
  });
  it('rejects oversized arrays and empty strings', () => {
    expect(validateRules({ ...bundled, youtube: { ...bundled.youtube, prunePaths: Array(501).fill('adSlots') } })).toBeNull();
    expect(validateRules({ ...bundled, youtube: { ...bundled.youtube, adShowingSelector: '' } })).toBeNull();
  });
  it('drops unknown keys', () => {
    expect(validateRules({ ...bundled, unexpected: 'discard', youtube: { ...bundled.youtube, unexpected: 'discard' } })).toEqual(bundled);
  });
});

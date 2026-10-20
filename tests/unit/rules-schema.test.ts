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
  it('defaults missing timerBoosts to an empty list', () => {
    const { timerBoosts: _omitted, ...older } = bundled.youtube;
    expect(validateRules({ ...bundled, youtube: older })?.youtube.timerBoosts).toEqual([]);
  });
  it('rejects invalid timerBoosts', () => {
    const boost = { delayMs: 17000, callbackIncludes: '[native code]', factor: 0.001 };
    for (const timerBoosts of [
      Array(21).fill(boost), [{ ...boost, delayMs: 0 }], [{ ...boost, delayMs: 1.5 }], [{ ...boost, delayMs: 600001 }],
      [{ ...boost, factor: 0 }], [{ ...boost, factor: 2 }], [{ ...boost, callbackIncludes: '' }], 'none',
    ]) expect(validateRules({ ...bundled, youtube: { ...bundled.youtube, timerBoosts } })).toBeNull();
  });
  it('drops unknown keys', () => {
    expect(validateRules({ ...bundled, unexpected: 'discard', youtube: { ...bundled.youtube, unexpected: 'discard' } })).toEqual(bundled);
  });
});

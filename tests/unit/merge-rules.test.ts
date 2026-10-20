import { describe, expect, it } from 'vitest';
import bundled from '../../rules/rules.json';
import { validateRules } from '../../src/rules/schema';
import { mergeYoutubeRules } from '../../src/youtube/merge-rules';

const base = validateRules(bundled)!.youtube;
const valid = (selector: string) => selector !== '###';

describe('mergeYoutubeRules', () => {
  it('cannot remove bundled rules when a page sends a spoofed event', () => {
    const spoofed = { ...base, prunePaths: ['nothing'], responseUrlIncludes: ['/nothing'], skipButtonSelectors: ['.none'], timerBoosts: [] };
    const merged = mergeYoutubeRules(base, spoofed, valid);
    for (const path of base.prunePaths) expect(merged.prunePaths).toContain(path);
    for (const part of base.responseUrlIncludes) expect(merged.responseUrlIncludes).toContain(part);
    for (const selector of base.skipButtonSelectors) expect(merged.skipButtonSelectors).toContain(selector);
    expect(merged.timerBoosts).toEqual(base.timerBoosts);
  });
  it('adds new remote rules without duplicates', () => {
    const merged = mergeYoutubeRules(base, { ...base, prunePaths: [...base.prunePaths, 'newAds'] }, valid);
    expect(merged.prunePaths).toEqual([...base.prunePaths, 'newAds']);
  });
  it('keeps the bundled ad selector and adds a valid new one', () => {
    expect(mergeYoutubeRules(base, { ...base, adShowingSelector: '###' }, valid).adShowingSelector).toBe(base.adShowingSelector);
    expect(mergeYoutubeRules(base, { ...base, adShowingSelector: '.new-ad' }, valid).adShowingSelector)
      .toBe(`${base.adShowingSelector}, .new-ad`);
  });
});

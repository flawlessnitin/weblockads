import { expect, it } from 'vitest';
import { ringGradient } from '../../src/popup/ring';

it('uses proportional segments in the approved color order', () => {
  expect(ringGradient({ videoAds: 1, adsTrackers: 1, popups: 2 })).toBe('conic-gradient(#ef4444 0% 25%, #f59e0b 25% 50%, #8b5cf6 50% 100%)');
});
it('uses the grey ring for all zeros', () => {
  expect(ringGradient({ videoAds: 0, adsTrackers: 0, popups: 0 })).toBe('conic-gradient(#e2e8f0 0 100%)');
});

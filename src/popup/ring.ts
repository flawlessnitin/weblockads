import type { TabCounts } from '../shared/storage';

export function ringGradient(c: TabCounts): string {
  const total = c.videoAds + c.adsTrackers + c.popups;
  if (total === 0) return 'conic-gradient(#e2e8f0 0 100%)';
  const video = Number((c.videoAds / total * 100).toFixed(6));
  const ads = Number(((c.videoAds + c.adsTrackers) / total * 100).toFixed(6));
  return `conic-gradient(#ef4444 0% ${video}%, #f59e0b ${video}% ${ads}%, #8b5cf6 ${ads}% 100%)`;
}

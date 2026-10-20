import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeChrome, type FakeChrome } from '../helpers/fake-chrome';

describe('blocked-item statistics', () => {
  let fake: FakeChrome;
  let stats: typeof import('../../src/background/stats');
  beforeEach(async () => {
    vi.useFakeTimers(); vi.resetModules();
    fake = installFakeChrome();
    stats = await import('../../src/background/stats');
    await import('../../src/background/index');
  });
  afterEach(async () => { if (stats) await stats.flushStats(); vi.clearAllTimers(); vi.useRealTimers(); });
  it('counts 3 blocked-by-client requests on tab 7 and in totals', async () => {
    for (let i = 0; i < 3; i++) await fake.fire('webRequest.onErrorOccurred', { tabId: 7, error: 'net::ERR_BLOCKED_BY_CLIENT' });
    expect((await stats.getTabCountsNow(7)).adsTrackers).toBe(3);
    expect((await stats.getTotalsNow()).adsTrackers).toBe(3);
  });
  it('ignores connection reset errors', async () => {
    await fake.fire('webRequest.onErrorOccurred', { tabId: 7, error: 'net::ERR_CONNECTION_RESET' });
    expect((await stats.getTotalsNow()).adsTrackers).toBe(0);
  });
  it('ignores tabId -1 entirely', async () => {
    await fake.fire('webRequest.onErrorOccurred', { tabId: -1, error: 'net::ERR_BLOCKED_BY_CLIENT' });
    stats.recordVideoAds(-1, 2, 30);
    expect(await stats.getTabCountsNow(-1)).toEqual({ videoAds: 0, adsTrackers: 0, popups: 0 });
    expect(await stats.getTotalsNow()).toEqual({ videoAds: 0, adsTrackers: 0, popups: 0, adSecondsSkipped: 0 });
  });
  it('records 2 video ads and 30 seconds', async () => {
    stats.recordVideoAds(7, 2, 30);
    expect((await stats.getTabCountsNow(7)).videoAds).toBe(2);
    expect(await stats.getTotalsNow()).toEqual({ videoAds: 2, adsTrackers: 0, popups: 0, adSecondsSkipped: 30 });
  });
  it('resets page counts on a URL change and keeps totals', async () => {
    stats.recordVideoAds(7, 2, 30);
    await fake.fire('tabs.onUpdated', 7, { url: 'https://www.youtube.com/watch?v=next' }, { id: 7 });
    expect(await stats.getTabCountsNow(7)).toEqual({ videoAds: 0, adsTrackers: 0, popups: 0 });
    expect((await stats.getTotalsNow()).videoAds).toBe(2);
  });
  it('shows pending increments before a flush', async () => {
    stats.recordVideoAds(7, 2, 30);
    expect((await stats.getTotalsNow()).videoAds).toBe(2);
    expect(await fake.storage.local.get('totals')).toEqual({});
  });
  it('saves after the 1000 ms debounce', async () => {
    stats.recordVideoAds(7, 2, 30);
    await stats.getTotalsNow();
    await vi.advanceTimersByTimeAsync(1000);
    await stats.flushStats();
    expect((await fake.storage.local.get('totals')).totals).toEqual({ videoAds: 2, adsTrackers: 0, popups: 0, adSecondsSkipped: 30 });
  });
});

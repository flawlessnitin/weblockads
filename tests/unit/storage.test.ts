import { beforeEach, describe, expect, it } from 'vitest';
import { installFakeChrome } from '../helpers/fake-chrome';
import { getSettings, getStoredRules, getTabCounts, getTotals, updateSettings } from '../../src/shared/storage';

describe('storage', () => {
  beforeEach(() => { installFakeChrome(); });
  it('returns defaults when empty', async () => {
    expect(await getSettings()).toEqual({ disabledSites: [], youtubeEnabled: true, customHides: {} });
    expect(await getTotals()).toEqual({ videoAds: 0, adsTrackers: 0, popups: 0, adSecondsSkipped: 0 });
    expect(await getTabCounts(7)).toEqual({ videoAds: 0, adsTrackers: 0, popups: 0 });
    expect(await getStoredRules()).toBeNull();
  });
  it('persists a settings patch while keeping other fields', async () => {
    expect(await updateSettings({ youtubeEnabled: false })).toEqual({
      disabledSites: [], youtubeEnabled: false, customHides: {},
    });
    expect(await getSettings()).toEqual({ disabledSites: [], youtubeEnabled: false, customHides: {} });
  });
});

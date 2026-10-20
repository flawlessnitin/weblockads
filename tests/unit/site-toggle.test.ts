import { beforeEach, describe, expect, it } from 'vitest';
import { installFakeChrome } from '../helpers/fake-chrome';
import { ALLOW_PRIORITY, setSiteEnabled, syncSiteRules } from '../../src/background/site-toggle';
import { getSettings } from '../../src/shared/storage';

describe('site toggle', () => {
  beforeEach(() => { installFakeChrome(); });
  it('creates an allowAllRequests rule for a disabled site and removes it when enabled', async () => {
    await setSiteEnabled('youtube.com', false);
    expect(await chrome.declarativeNetRequest.getDynamicRules()).toEqual([{
      id: 1, priority: ALLOW_PRIORITY, action: { type: 'allowAllRequests' },
      condition: { requestDomains: ['youtube.com'], resourceTypes: ['main_frame', 'sub_frame'] },
    }]);
    expect((await getSettings()).disabledSites).toEqual(['youtube.com']);
    await setSiteEnabled('youtube.com', true);
    expect(await chrome.declarativeNetRequest.getDynamicRules()).toEqual([]);
    expect((await getSettings()).disabledSites).toEqual([]);
  });
  it('rejects more than 5000 disabled sites', async () => {
    await expect(syncSiteRules(Array.from({ length: 5001 }, (_, i) => `site${i}.com`))).rejects.toThrow('too many disabled sites');
  });
});

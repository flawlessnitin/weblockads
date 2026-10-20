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
  it('keeps both sites when two are turned off at the same time', async () => {
    await Promise.all([setSiteEnabled('a.com', false), setSiteEnabled('b.com', false)]);
    expect((await getSettings()).disabledSites.sort()).toEqual(['a.com', 'b.com']);
    expect((await chrome.declarativeNetRequest.getDynamicRules()).flatMap((rule) => rule.condition.requestDomains).sort())
      .toEqual(['a.com', 'b.com']);
  });
  it('rejects more than 5000 disabled sites', async () => {
    await expect(syncSiteRules(Array.from({ length: 5001 }, (_, i) => `site${i}.com`))).rejects.toThrow('too many disabled sites');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { installFakeChrome } from '../helpers/fake-chrome';
import { excludeMatchesFor, syncContentScripts } from '../../src/background/content-scripts';
import { getSettings } from '../../src/shared/storage';

describe('content script registration', () => {
  beforeEach(() => { installFakeChrome(); });
  it('builds exact and subdomain exclude patterns', () => {
    expect(excludeMatchesFor(['example.com'])).toEqual(['*://example.com/*', '*://*.example.com/*']);
  });
  it('registers only cosmetics when youtubeEnabled is false', async () => {
    await syncContentScripts({ ...await getSettings(), youtubeEnabled: false });
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    expect(scripts.map((script) => script.id)).toEqual(['cosmetics']);
  });
  it('survives overlapping syncs without duplicate registrations', async () => {
    const settings = await getSettings();
    await Promise.all([syncContentScripts(settings), syncContentScripts({ ...settings, disabledSites: ['example.com'] })]);
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    expect(scripts.map((script) => script.id)).toEqual(['cosmetics', 'yt-main', 'yt-bridge']);
    expect(scripts[0].excludeMatches).toEqual(['*://example.com/*', '*://*.example.com/*']);
  });
  it('adds disabled site exclude patterns to all registered scripts', async () => {
    await syncContentScripts({ ...await getSettings(), disabledSites: ['example.com'] });
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    expect(scripts.map((script) => script.id)).toEqual(['cosmetics', 'yt-main', 'yt-bridge']);
    for (const script of scripts) expect(script.excludeMatches).toEqual(['*://example.com/*', '*://*.example.com/*']);
  });
});

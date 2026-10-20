import { FiltersEngine } from '@ghostery/adblocker';
import { beforeEach, describe, expect, it } from 'vitest';
import { installFakeChrome, type FakeChrome } from '../helpers/fake-chrome';
import { handleCosmeticsRequest, loadEngine } from '../../src/background/cosmetics';
import type { Settings } from '../../src/shared/storage';

const req = { lifecycle: 'start' as const, classes: ['generic-ad'], ids: [], hrefs: [] };
const settings: Settings = { disabledSites: [], youtubeEnabled: true, customHides: {} };
const sender = { url: 'https://example.com/', tabId: 7, frameId: 0 };
const engine = () => loadEngine(FiltersEngine.parse('example.com##.ad-banner\n##.generic-ad').serialize());

describe('cosmetic filtering', () => {
  let fake: FakeChrome;
  beforeEach(() => { fake = installFakeChrome(); });
  it('inserts domain-specific and generic ad CSS', async () => {
    await handleCosmeticsRequest(engine(), req, sender, { settings, youtubeHideSelectors: [] });
    const injection = fake.scripting.insertCSS.mock.calls[0][0];
    expect(injection.css).toContain('.ad-banner');
    expect(injection.css).toContain('.generic-ad');
    expect(injection.target).toEqual({ tabId: 7, frameIds: [0] });
    expect(injection.origin).toBe('USER');
  });
  it('does not insert CSS for a disabled site', async () => {
    const response = await handleCosmeticsRequest(engine(), req, sender, {
      settings: { ...settings, disabledSites: ['example.com'] }, youtubeHideSelectors: [],
    });
    expect(fake.scripting.insertCSS).not.toHaveBeenCalled();
    expect(response.active).toBe(false);
  });
  it('appends custom hides', async () => {
    await handleCosmeticsRequest(engine(), req, sender, {
      settings: { ...settings, customHides: { 'example.com': ['#promo'] } }, youtubeHideSelectors: [],
    });
    expect(fake.scripting.insertCSS.mock.calls[0][0].css).toContain('#promo{display:none!important}');
  });
  it('appends YouTube hide selectors', async () => {
    await handleCosmeticsRequest(engine(), req, { ...sender, url: 'https://www.youtube.com/' }, {
      settings, youtubeHideSelectors: ['ytd-ad-slot-renderer'],
    });
    expect(fake.scripting.insertCSS.mock.calls[0][0].css).toContain('ytd-ad-slot-renderer{display:none!important}');
  });
  it('returns no scriptlets', async () => {
    const response = await handleCosmeticsRequest(engine(), req, sender, { settings, youtubeHideSelectors: [] });
    expect(response.scripts).toEqual([]);
  });
  it('does not reinsert persistent hides when scrolling adds new DOM features', async () => {
    const filterEngine = loadEngine(FiltersEngine.parse('##.new-ad').serialize());
    const context = { settings: { ...settings, customHides: { 'youtube.com': ['#promo'] } }, youtubeHideSelectors: ['ytd-ad-slot-renderer'] };
    const youtube = { ...sender, url: 'https://www.youtube.com/' };
    await handleCosmeticsRequest(filterEngine, { lifecycle: 'start', classes: [], ids: [], hrefs: [] }, youtube, context);
    const update = await handleCosmeticsRequest(filterEngine, { lifecycle: 'dom-update', classes: ['new-ad'], ids: [], hrefs: [] }, youtube, context);
    expect(update.styles).toContain('.new-ad');
    expect(update.styles).not.toContain('#promo');
    expect(update.styles).not.toContain('ytd-ad-slot-renderer');
    const unchanged = await handleCosmeticsRequest(filterEngine, { lifecycle: 'dom-update', classes: ['new-card'], ids: [], hrefs: [] }, youtube, context);
    expect(unchanged.styles).toBe('');
    expect(fake.scripting.insertCSS).toHaveBeenCalledTimes(2);
  });
  it('skips repeated generic CSS but applies it again in a new document or frame', async () => {
    const filterEngine = loadEngine(FiltersEngine.parse('##.new-ad').serialize());
    const context = { settings, youtubeHideSelectors: [] };
    await handleCosmeticsRequest(filterEngine, { lifecycle: 'start', classes: [], ids: [], hrefs: [] }, sender, context);
    const update = { lifecycle: 'dom-update' as const, classes: ['new-ad'], ids: [], hrefs: [] };
    await handleCosmeticsRequest(filterEngine, update, sender, context);
    await handleCosmeticsRequest(filterEngine, update, sender, context);
    expect(fake.scripting.insertCSS).toHaveBeenCalledTimes(1);
    await handleCosmeticsRequest(filterEngine, update, { ...sender, frameId: 2 }, context);
    expect(fake.scripting.insertCSS).toHaveBeenCalledTimes(2);
    await handleCosmeticsRequest(filterEngine, { ...update, lifecycle: 'start' }, sender, context);
    expect(fake.scripting.insertCSS).toHaveBeenCalledTimes(3);
  });
});

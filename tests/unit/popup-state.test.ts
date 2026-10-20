import { beforeEach, expect, it, vi } from 'vitest';
import bundled from '../../rules/rules.json';
import { installFakeChrome } from '../helpers/fake-chrome';
import { updateSettings } from '../../src/shared/storage';
import { getPopupState } from '../../src/background/popup-state';

beforeEach(() => {
  installFakeChrome();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bundled))));
});
it('returns site:null for chrome://newtab', async () => {
  expect((await getPopupState({ id: 7, url: 'chrome://newtab' })).site).toBeNull();
});
it('returns enabled:false for a disabled youtube.com', async () => {
  await updateSettings({ disabledSites: ['youtube.com'] });
  expect((await getPopupState({ id: 7, url: 'https://www.youtube.com/watch?v=x' })).enabled).toBe(false);
});

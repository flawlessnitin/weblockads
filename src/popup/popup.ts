import { PRODUCT_NAME } from '../shared/config';
import type { PopupState } from '../background/popup-state';
import { formatAgo, formatCount, formatDuration } from './format';
import { ringGradient } from './ring';

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const setText = (id: string, text: string) => { element(id).textContent = text; };
const siteSwitch = element<HTMLButtonElement>('site-switch');
document.title = PRODUCT_NAME;
setText('product-name', PRODUCT_NAME);

function showError(): void {
  setText('status', "Couldn't load blocking status. Reopen the extension to try again.");
  element('status').hidden = false;
}

async function initialize(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const state: PopupState = await chrome.runtime.sendMessage({ type: 'popup:getState' });
  if (!state || !state.tab || !state.totals) throw new Error('No popup state');
  setText('site', state.site ?? '');
  element('site').title = state.site ?? '';
  siteSwitch.disabled = state.site === null || tab?.id === undefined;
  siteSwitch.setAttribute('aria-checked', String(state.enabled));
  element('hero').hidden = state.site === null;
  element('unavailable').hidden = state.site !== null;
  element('ring').style.background = ringGradient(state.tab);
  setText('page-total', formatCount(state.tab.videoAds + state.tab.adsTrackers + state.tab.popups));
  setText('video-count', formatCount(state.tab.videoAds));
  setText('ads-count', formatCount(state.tab.adsTrackers));
  setText('popups-count', formatCount(state.tab.popups));
  setText('all-total', formatCount(state.totals.videoAds + state.totals.adsTrackers + state.totals.popups));
  setText('time-saved', formatDuration(state.totals.adSecondsSkipped));
  setText('rules-age', `● Rules updated ${formatAgo(state.rulesReceivedAt)}`);
  setText('version', `v${state.version}`);
  siteSwitch.addEventListener('click', () => {
    void (async () => {
      siteSwitch.disabled = true;
      const enabled = siteSwitch.getAttribute('aria-checked') !== 'true';
      const result = await chrome.runtime.sendMessage({ type: 'popup:setSiteEnabled', site: state.site, enabled });
      if (result?.error) throw new Error(result.error);
      siteSwitch.setAttribute('aria-checked', String(enabled));
      await chrome.tabs.reload(tab!.id!);
    })().catch(showError).finally(() => { siteSwitch.disabled = false; });
  });
}
element('settings').addEventListener('click', () => { void chrome.runtime.openOptionsPage().catch(showError); });
void initialize().catch(showError);

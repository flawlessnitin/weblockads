import { getSettings } from '../shared/storage';
import { syncSiteRules } from './site-toggle';
import { syncContentScripts } from './content-scripts';
import { getCosmeticEngine, handleCosmeticsRequest } from './cosmetics';
import type { Message } from '../shared/messages';

async function initialize(): Promise<void> {
  const settings = await getSettings();
  await syncSiteRules(settings.disabledSites);
  await syncContentScripts(settings);
}

const initializeSafely = () => initialize().catch((error: unknown) => console.error('Initialization failed', error));
chrome.runtime.onInstalled.addListener(initializeSafely);
chrome.runtime.onStartup.addListener(initializeSafely);

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type !== 'cosmetics' || sender.tab?.id === undefined || !sender.url) return;
  const frame = { url: sender.url, tabId: sender.tab.id, frameId: sender.frameId ?? 0 };
  Promise.all([getCosmeticEngine(), getSettings()])
    .then(([engine, settings]) => handleCosmeticsRequest(engine, message.req, frame, { settings, youtubeHideSelectors: [] }))
    .then(sendResponse)
    .catch((error: unknown) => {
      console.error('Cosmetic filtering failed', error);
      sendResponse({ active: false, styles: '', scripts: [], extended: [] });
    });
  return true;
});

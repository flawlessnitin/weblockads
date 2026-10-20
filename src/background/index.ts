import { getSettings } from '../shared/storage';
import { syncSiteRules } from './site-toggle';
import { syncContentScripts } from './content-scripts';
import { getCosmeticEngine, handleCosmeticsRequest } from './cosmetics';
import type { Message } from '../shared/messages';
import { checkForUpdate, getActiveRules } from '../rules/updater';

async function initialize(): Promise<void> {
  const settings = await getSettings();
  await syncSiteRules(settings.disabledSites);
  await syncContentScripts(settings);
  await chrome.alarms.create('rules-update', { periodInMinutes: 1440 });
  await checkForUpdate();
}

const initializeSafely = () => initialize().catch((error: unknown) => console.error('Initialization failed', error));
chrome.runtime.onInstalled.addListener(initializeSafely);
chrome.runtime.onStartup.addListener(initializeSafely);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'rules-update') return checkForUpdate();
});

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === 'rules:get' || message.type === 'rules:checkNow') {
    const response = message.type === 'rules:get' ? getActiveRules() : checkForUpdate();
    response.then(sendResponse).catch((error: unknown) => {
      console.error('Rules request failed', error);
      sendResponse(null);
    });
    return true;
  }
  if (message.type !== 'cosmetics' || sender.tab?.id === undefined || !sender.url) return;
  const frame = { url: sender.url, tabId: sender.tab.id, frameId: sender.frameId ?? 0 };
  Promise.all([getCosmeticEngine(), getSettings(), getActiveRules()])
    .then(([engine, settings, active]) => handleCosmeticsRequest(engine, message.req, frame, { settings, youtubeHideSelectors: active.rules.youtube.hideSelectors }))
    .then(sendResponse)
    .catch((error: unknown) => {
      console.error('Cosmetic filtering failed', error);
      sendResponse({ active: false, styles: '', scripts: [], extended: [] });
    });
  return true;
});

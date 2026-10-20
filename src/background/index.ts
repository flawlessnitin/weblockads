import { getSettings } from '../shared/storage';
import { syncSiteRules } from './site-toggle';
import { syncContentScripts } from './content-scripts';

async function initialize(): Promise<void> {
  const settings = await getSettings();
  await syncSiteRules(settings.disabledSites);
  await syncContentScripts(settings);
}

const initializeSafely = () => initialize().catch((error: unknown) => console.error('Initialization failed', error));
chrome.runtime.onInstalled.addListener(initializeSafely);
chrome.runtime.onStartup.addListener(initializeSafely);

import { injectCosmetics } from '@ghostery/adblocker-webextension-cosmetics';

const inactive = { active: false, styles: '', scripts: [], extended: [] };

injectCosmetics(window, true, async (req) => {
  try {
    return await chrome.runtime.sendMessage({ type: 'cosmetics', req }) ?? inactive;
  } catch {
    // Reloading/updating the extension disconnects scripts in existing tabs.
    // Let the library stop its old DOM monitor; a tab refresh starts a new one.
    return inactive;
  }
});

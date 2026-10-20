import { injectCosmetics } from '@ghostery/adblocker-webextension-cosmetics';

injectCosmetics(window, true, (req) => chrome.runtime.sendMessage({ type: 'cosmetics', req }));

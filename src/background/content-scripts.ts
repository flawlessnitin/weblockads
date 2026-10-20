import { YOUTUBE_MATCHES } from '../shared/config';
import type { Settings } from '../shared/storage';

export function excludeMatchesFor(sites: string[]): string[] {
  return sites.flatMap((site) => [`*://${site}/*`, `*://*.${site}/*`]);
}

export async function syncContentScripts(settings: Settings): Promise<void> {
  await chrome.scripting.unregisterContentScripts();
  const common = { excludeMatches: excludeMatchesFor(settings.disabledSites), allFrames: true, runAt: 'document_start' as const };
  const scripts: chrome.scripting.RegisteredContentScript[] = [{
    ...common, id: 'cosmetics', js: ['content/cosmetics.js'], matches: ['<all_urls>'],
    world: 'ISOLATED' as chrome.scripting.ExecutionWorld,
  }];
  if (settings.youtubeEnabled) {
    scripts.push(
      { ...common, id: 'yt-main', js: ['youtube/main.js'], matches: YOUTUBE_MATCHES, world: 'MAIN' as chrome.scripting.ExecutionWorld },
      { ...common, id: 'yt-bridge', js: ['youtube/bridge.js'], matches: YOUTUBE_MATCHES, world: 'ISOLATED' as chrome.scripting.ExecutionWorld },
    );
  }
  await chrome.scripting.registerContentScripts(scripts);
}

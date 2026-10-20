import { FiltersEngine } from '@ghostery/adblocker';
import type { IBackgroundCallback, IMessageFromBackground } from '@ghostery/adblocker-content';
import { getSiteKey } from '../shared/domain';
import type { Settings } from '../shared/storage';

export function loadEngine(bytes: Uint8Array): FiltersEngine {
  return FiltersEngine.deserialize(bytes);
}

let enginePromise: Promise<FiltersEngine> | undefined;
export function getCosmeticEngine(): Promise<FiltersEngine> {
  enginePromise ??= fetch(chrome.runtime.getURL('filters/cosmetic-engine.bin'))
    .then(async (response) => {
      if (!response.ok) throw new Error(`Cosmetic engine: HTTP ${response.status}`);
      return loadEngine(new Uint8Array(await response.arrayBuffer()));
    }).catch((error: unknown) => { enginePromise = undefined; throw error; });
  return enginePromise;
}

export async function handleCosmeticsRequest(
  engine: FiltersEngine,
  req: IBackgroundCallback,
  sender: { url: string; tabId: number; frameId: number },
  ctx: { settings: Settings; youtubeHideSelectors: string[] },
): Promise<IMessageFromBackground> {
  const empty: IMessageFromBackground = { active: false, styles: '', scripts: [], extended: [] };
  const site = getSiteKey(sender.url);
  if (site === null || ctx.settings.disabledSites.includes(site)) return empty;
  const result = engine.getCosmeticsFilters({
    url: sender.url, hostname: new URL(sender.url).hostname, domain: site,
    classes: req.classes, ids: req.ids, hrefs: req.hrefs,
    getBaseRules: req.lifecycle === 'start',
    getRulesFromHostname: req.lifecycle === 'start',
    getRulesFromDOM: true, getInjectionRules: false, getExtendedRules: false,
  });
  const extra = [...ctx.settings.customHides[site] ?? []];
  if (site === 'youtube.com' && ctx.settings.youtubeEnabled) extra.push(...ctx.youtubeHideSelectors);
  const css = result.styles + extra.map((selector) => `${selector}{display:none!important}`).join('\n');
  if (css) {
    await chrome.scripting.insertCSS({ target: { tabId: sender.tabId, frameIds: [sender.frameId] }, css, origin: 'USER' as chrome.scripting.StyleOrigin });
  }
  return { ...result, styles: css, scripts: [], extended: [] };
}

import { FiltersEngine } from '@ghostery/adblocker';
import type { IBackgroundCallback, IMessageFromBackground } from '@ghostery/adblocker-content';
import { getSiteKey } from '../shared/domain';
import type { Settings } from '../shared/storage';

export function loadEngine(bytes: Uint8Array): FiltersEngine {
  return FiltersEngine.deserialize(bytes);
}

let enginePromise: Promise<FiltersEngine> | undefined;
// A bounded last-sheet cache avoids repeatedly inserting generic matches that
// the library can return for different newly discovered links/classes.
const lastStyles = new Map<string, string>();
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
  const frameKey = `${sender.tabId}:${sender.frameId}`;
  if (req.lifecycle === 'start') lastStyles.delete(frameKey);
  const site = getSiteKey(sender.url);
  if (site === null || ctx.settings.disabledSites.includes(site)) return empty;
  const result = engine.getCosmeticsFilters({
    url: sender.url, hostname: new URL(sender.url).hostname, domain: site,
    classes: req.classes, ids: req.ids, hrefs: req.hrefs,
    getBaseRules: req.lifecycle === 'start',
    getRulesFromHostname: req.lifecycle === 'start',
    getRulesFromDOM: true, getInjectionRules: false, getExtendedRules: false,
  });
  // USER styles persist for this document and automatically match new nodes.
  // Re-inserting them on every DOM update forces needless style recalculation.
  const extra = req.lifecycle === 'start' ? [...ctx.settings.customHides[site] ?? []] : [];
  if (req.lifecycle === 'start' && site === 'youtube.com' && ctx.settings.youtubeEnabled) extra.push(...ctx.youtubeHideSelectors);
  const css = result.styles + extra.map((selector) => `${selector}{display:none!important}`).join('\n');
  if (css && lastStyles.get(frameKey) !== css) {
    if (css.length <= 64_000) {
      lastStyles.delete(frameKey);
      lastStyles.set(frameKey, css);
      if (lastStyles.size > 256) lastStyles.delete(lastStyles.keys().next().value!);
    }
    try {
      await chrome.scripting.insertCSS({ target: { tabId: sender.tabId, frameIds: [sender.frameId] }, css, origin: 'USER' as chrome.scripting.StyleOrigin });
    } catch (error) {
      if (lastStyles.get(frameKey) === css) lastStyles.delete(frameKey);
      throw error;
    }
  }
  return { ...result, styles: css, scripts: [], extended: [] };
}

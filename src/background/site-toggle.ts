import { getSettings, updateSettings } from '../shared/storage';
import { syncContentScripts } from './content-scripts';

export const ALLOW_PRIORITY = 2_000_000_000;

export async function syncSiteRules(disabledSites: string[]): Promise<void> {
  if (disabledSites.length > 5000) throw new Error('too many disabled sites');
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: current.map((rule) => rule.id),
    addRules: disabledSites.map((site, i) => ({
      id: i + 1, priority: ALLOW_PRIORITY,
      action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
      condition: { requestDomains: [site], resourceTypes: ['main_frame', 'sub_frame'] as chrome.declarativeNetRequest.ResourceType[] },
    })),
  });
}

// Each change reads and rewrites the whole list, so changes run one at a time
// to avoid losing a site when two are toggled together.
let toggleQueue: Promise<void> = Promise.resolve();
export function setSiteEnabled(site: string, enabled: boolean): Promise<void> {
  const run = toggleQueue.then(() => applySiteEnabled(site, enabled));
  toggleQueue = run.catch(() => {});
  return run;
}

async function applySiteEnabled(site: string, enabled: boolean): Promise<void> {
  const settings = await getSettings();
  const disabledSites = enabled ? settings.disabledSites.filter((entry) => entry !== site)
    : [...new Set([...settings.disabledSites, site])];
  if (disabledSites.length > 5000) throw new Error('too many disabled sites');
  const next = await updateSettings({ disabledSites });
  await syncSiteRules(next.disabledSites);
  await syncContentScripts(next);
}

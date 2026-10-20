import { getSiteKey } from '../shared/domain';
import { getSettings, type TabCounts, type Totals } from '../shared/storage';
import { getActiveRules } from '../rules/updater';
import { flushStats, getTabCountsNow, getTotalsNow } from './stats';

export interface PopupState {
  site: string | null; enabled: boolean; tab: TabCounts; totals: Totals; rulesReceivedAt: number; version: string;
}
export async function getPopupState(tab: { id: number; url?: string }): Promise<PopupState> {
  await flushStats();
  const [settings, counts, totals, active] = await Promise.all([
    getSettings(), getTabCountsNow(tab.id), getTotalsNow(), getActiveRules(),
  ]);
  const site = getSiteKey(tab.url ?? '');
  return {
    site, enabled: site !== null && !settings.disabledSites.includes(site), tab: counts, totals,
    rulesReceivedAt: active.receivedAt, version: chrome.runtime.getManifest().version,
  };
}

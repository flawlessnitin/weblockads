import type { RemoteRules } from '../rules/schema';

export interface Settings {
  disabledSites: string[];
  youtubeEnabled: boolean;
  customHides: Record<string, string[]>;
}
export interface Totals { videoAds: number; adsTrackers: number; popups: number; adSecondsSkipped: number }
export interface TabCounts { videoAds: number; adsTrackers: number; popups: number }
export interface StoredRules { rules: RemoteRules; receivedAt: number }

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get<{ settings?: Partial<Settings> }>('settings');
  return { disabledSites: [], youtubeEnabled: true, customHides: {}, ...settings };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const settings = { ...await getSettings(), ...patch };
  await chrome.storage.local.set({ settings });
  return settings;
}

export async function getTotals(): Promise<Totals> {
  const { totals } = await chrome.storage.local.get<{ totals?: Totals }>('totals');
  return totals ?? { videoAds: 0, adsTrackers: 0, popups: 0, adSecondsSkipped: 0 };
}
export async function saveTotals(t: Totals): Promise<void> {
  await chrome.storage.local.set({ totals: t });
}
export async function getTabCounts(tabId: number): Promise<TabCounts> {
  const key = `tab:${tabId}`;
  const result = await chrome.storage.session.get<Record<string, TabCounts | undefined>>(key);
  return result[key] ?? { videoAds: 0, adsTrackers: 0, popups: 0 };
}
export async function saveTabCounts(tabId: number, c: TabCounts): Promise<void> {
  await chrome.storage.session.set({ [`tab:${tabId}`]: c });
}
export async function getStoredRules(): Promise<StoredRules | null> {
  const { storedRules } = await chrome.storage.local.get<{ storedRules?: StoredRules }>('storedRules');
  return storedRules ?? null;
}
export async function saveStoredRules(s: StoredRules): Promise<void> {
  await chrome.storage.local.set({ storedRules: s });
}

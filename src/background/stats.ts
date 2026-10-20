import { getTabCounts, getTotals, saveTabCounts, saveTotals, type TabCounts, type Totals } from '../shared/storage';

const emptyTab = (): TabCounts => ({ videoAds: 0, adsTrackers: 0, popups: 0 });
const emptyTotals = (): Totals => ({ ...emptyTab(), adSecondsSkipped: 0 });
let pendingTotals = emptyTotals();
const pendingTabs = new Map<number, TabCounts>();
let timer: ReturnType<typeof setTimeout> | undefined;
let queue: Promise<void> = Promise.resolve();

function ordered<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.then(() => {}, () => {});
  return result;
}
function addTab(a: TabCounts, b: TabCounts): TabCounts {
  return { videoAds: a.videoAds + b.videoAds, adsTrackers: a.adsTrackers + b.adsTrackers, popups: a.popups + b.popups };
}
function addTotals(a: Totals, b: Totals): Totals {
  return { ...addTab(a, b), adSecondsSkipped: a.adSecondsSkipped + b.adSecondsSkipped };
}
function schedule(): void {
  clearTimeout(timer);
  timer = setTimeout(() => { void flushStats().catch((error: unknown) => console.error('Stats save failed', error)); }, 1000);
}
function record(tabId: number, delta: Totals): void {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  void ordered(async () => {
    pendingTotals = addTotals(pendingTotals, delta);
    pendingTabs.set(tabId, addTab(pendingTabs.get(tabId) ?? emptyTab(), delta));
    schedule();
  });
}

export function recordAdsTrackers(tabId: number): void {
  record(tabId, { videoAds: 0, adsTrackers: 1, popups: 0, adSecondsSkipped: 0 });
}
export function recordVideoAds(tabId: number, count: number, seconds: number): void {
  if (!Number.isSafeInteger(count) || count < 0 || !Number.isFinite(seconds) || seconds < 0) return;
  record(tabId, { videoAds: count, adsTrackers: 0, popups: 0, adSecondsSkipped: seconds });
}
export function resetTab(tabId: number): Promise<void> {
  return ordered(async () => {
    pendingTabs.delete(tabId);
    await saveTabCounts(tabId, emptyTab());
  });
}
export function flushStats(): Promise<void> {
  return ordered(async () => {
    clearTimeout(timer); timer = undefined;
    if (Object.values(pendingTotals).some((value) => value !== 0)) {
      await saveTotals(addTotals(await getTotals(), pendingTotals));
      pendingTotals = emptyTotals();
    }
    for (const [tabId, delta] of pendingTabs) {
      await saveTabCounts(tabId, addTab(await getTabCounts(tabId), delta));
      pendingTabs.delete(tabId);
    }
  });
}
export function getTabCountsNow(tabId: number): Promise<TabCounts> {
  return ordered(async () => addTab(await getTabCounts(tabId), pendingTabs.get(tabId) ?? emptyTab()));
}
export function getTotalsNow(): Promise<Totals> {
  return ordered(async () => addTotals(await getTotals(), pendingTotals));
}

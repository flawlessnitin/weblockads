import { BUILD_TIME, RULES_URL } from '../shared/config';
import { getStoredRules, saveStoredRules, type StoredRules } from '../shared/storage';
import { validateRules, type RemoteRules } from './schema';

let bundledPromise: Promise<RemoteRules> | undefined;
function getBundledRules(): Promise<RemoteRules> {
  bundledPromise ??= fetch(chrome.runtime.getURL('bundled-rules.json'))
    .then(async (response) => {
      if (!response.ok) throw new Error(`Bundled rules: HTTP ${response.status}`);
      const rules = validateRules(await response.json());
      if (rules === null) throw new Error('Invalid bundled rules');
      return rules;
    }).catch((error: unknown) => { bundledPromise = undefined; throw error; });
  return bundledPromise;
}

export async function getActiveRules(): Promise<StoredRules> {
  const [bundled, stored] = await Promise.all([getBundledRules(), getStoredRules()]);
  const valid = stored && validateRules(stored.rules);
  if (valid && valid.version >= bundled.version) {
    return { rules: valid, receivedAt: Number.isFinite(stored!.receivedAt) ? stored!.receivedAt : BUILD_TIME };
  }
  return { rules: bundled, receivedAt: BUILD_TIME };
}

let updateQueue: Promise<void> = Promise.resolve();
export async function checkForUpdate(fetchFn: typeof fetch = fetch): Promise<'updated' | 'unchanged' | 'failed'> {
  const result = updateQueue.then(() => performUpdate(fetchFn));
  updateQueue = result.then(() => {});
  return result;
}

async function performUpdate(fetchFn: typeof fetch): Promise<'updated' | 'unchanged' | 'failed'> {
  try {
    const response = await fetchFn(RULES_URL, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return 'failed';
    const rules = validateRules(await response.json());
    if (rules === null) return 'failed';
    const active = await getActiveRules();
    if (rules.version <= active.rules.version) return 'unchanged';
    await saveStoredRules({ rules, receivedAt: Date.now() });
    return 'updated';
  } catch {
    return 'failed';
  }
}

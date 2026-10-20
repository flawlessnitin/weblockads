import { validateRules } from '../rules/schema';
import { RULES_EVENT, STATS_EVENT } from './events';

document.addEventListener(STATS_EVENT, (event) => {
  const detail: unknown = (event as CustomEvent).detail;
  if (typeof detail !== 'string') return;
  try {
    const value: unknown = JSON.parse(detail);
    if (!value || typeof value !== 'object') return;
    const { count, seconds } = value as Record<string, unknown>;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0
      || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return;
    void chrome.runtime.sendMessage({ type: 'stats:youtubeAds', count, seconds }).catch(() => {});
  } catch { /* Ignore malformed page events. */ }
});

void chrome.runtime.sendMessage({ type: 'rules:get' }).then((active) => {
  const rules = validateRules(active?.rules);
  if (rules) document.dispatchEvent(new CustomEvent(RULES_EVENT, { detail: JSON.stringify(rules.youtube) }));
}).catch((error: unknown) => console.warn('Using bundled player rules', error));

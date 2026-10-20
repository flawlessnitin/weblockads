import bundled from '../../rules/rules.json';
import { validateRules } from '../rules/schema';
import { AVERAGE_AD_SECONDS } from '../shared/config';
import { RULES_EVENT, STATS_EVENT, type YoutubeRulesPayload, type YoutubeStatsPayload } from './events';
import { installPlayerHooks } from './player-hooks';

let activeRules: YoutubeRulesPayload = bundled.youtube;
document.addEventListener(RULES_EVENT, (event) => {
  const detail: unknown = (event as CustomEvent).detail;
  if (typeof detail !== 'string') return;
  try {
    const parsed = validateRules({ version: 1, youtube: JSON.parse(detail) });
    if (parsed) activeRules = parsed.youtube;
  } catch { /* Ignore malformed page events. */ }
}, { once: true });

function report(adBreaks: number): void {
  if (adBreaks <= 0) return;
  const payload: YoutubeStatsPayload = { count: adBreaks, seconds: adBreaks * AVERAGE_AD_SECONDS };
  document.dispatchEvent(new CustomEvent(STATS_EVENT, { detail: JSON.stringify(payload) }));
}
installPlayerHooks(window, () => activeRules, report);
// The fallback is wired in Task 9.

import bundled from '../../rules/rules.json';
import { validateRules } from '../rules/schema';
import { AVERAGE_AD_SECONDS } from '../shared/config';
import { RULES_EVENT, STATS_EVENT, type YoutubeRulesPayload, type YoutubeStatsPayload } from './events';
import { installPlayerHooks } from './player-hooks';
import { startFallback } from './fallback';
import { mergeYoutubeRules } from './merge-rules';
import { installTimerBoosts } from './timers';

const isValidSelector = (selector: string) => {
  try { document.createDocumentFragment().querySelector(selector); return true; } catch { return false; }
};
let activeRules: YoutubeRulesPayload = validateRules(bundled)!.youtube;
document.addEventListener(RULES_EVENT, (event) => {
  const detail: unknown = (event as CustomEvent).detail;
  if (typeof detail !== 'string') return;
  try {
    const parsed = validateRules({ version: 1, youtube: JSON.parse(detail) });
    if (parsed) activeRules = mergeYoutubeRules(activeRules, parsed.youtube, isValidSelector);
  } catch { /* Ignore malformed page events. */ }
});
installTimerBoosts(window, () => activeRules.timerBoosts);

function report(adBreaks: number): void {
  if (adBreaks <= 0) return;
  const payload: YoutubeStatsPayload = { count: adBreaks, seconds: adBreaks * AVERAGE_AD_SECONDS };
  document.dispatchEvent(new CustomEvent(STATS_EVENT, { detail: JSON.stringify(payload) }));
}
installPlayerHooks(window, () => activeRules, report);
startFallback(document, () => activeRules, (seconds) => {
  const payload: YoutubeStatsPayload = { count: 1, seconds };
  document.dispatchEvent(new CustomEvent(STATS_EVENT, { detail: JSON.stringify(payload) }));
});

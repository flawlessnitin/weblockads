import type { RemoteRules } from '../rules/schema';

type YoutubeRules = RemoteRules['youtube'];

function union<T>(base: T[], incoming: T[], key: (value: T) => string = String): T[] {
  const seen = new Set(base.map(key));
  return [...base, ...incoming.filter((value) => !seen.has(key(value)) && seen.add(key(value)))];
}

// The page can dispatch the same DOM event as our bridge, so incoming rules may
// only add to what we already trust; they can never remove a bundled rule.
export function mergeYoutubeRules(
  base: YoutubeRules,
  incoming: YoutubeRules,
  isValidSelector: (selector: string) => boolean,
): YoutubeRules {
  const extraSelector = incoming.adShowingSelector !== base.adShowingSelector && isValidSelector(incoming.adShowingSelector);
  return {
    prunePaths: union(base.prunePaths, incoming.prunePaths),
    responseUrlIncludes: union(base.responseUrlIncludes, incoming.responseUrlIncludes),
    hideSelectors: union(base.hideSelectors, incoming.hideSelectors),
    adShowingSelector: extraSelector ? `${base.adShowingSelector}, ${incoming.adShowingSelector}` : base.adShowingSelector,
    skipButtonSelectors: union(base.skipButtonSelectors, incoming.skipButtonSelectors),
    maxPlaybackRate: incoming.maxPlaybackRate,
    timerBoosts: union(base.timerBoosts, incoming.timerBoosts, (boost) => JSON.stringify(boost)),
  };
}

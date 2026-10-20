export interface TimerBoost { delayMs: number; callbackIncludes: string; factor: number }

export interface RemoteRules {
  version: number;
  youtube: {
    prunePaths: string[];
    responseUrlIncludes: string[];
    hideSelectors: string[];
    adShowingSelector: string;
    skipButtonSelectors: string[];
    maxPlaybackRate: number;
    timerBoosts: TimerBoost[];
  };
}

function record(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
function validString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0 && x.length <= 300;
}
function strings(x: unknown): x is string[] {
  return Array.isArray(x) && x.length <= 500 && x.every(validString);
}

// Optional for compatibility with stored rules written before timer boosts existed.
function timerBoosts(x: unknown): TimerBoost[] | null {
  if (x === undefined) return [];
  if (!Array.isArray(x) || x.length > 20) return null;
  const boosts: TimerBoost[] = [];
  for (const entry of x) {
    if (!record(entry) || !Number.isSafeInteger(entry.delayMs) || (entry.delayMs as number) < 1
      || (entry.delayMs as number) > 600_000 || !validString(entry.callbackIncludes)
      || typeof entry.factor !== 'number' || !(entry.factor > 0 && entry.factor <= 1)) return null;
    boosts.push({ delayMs: entry.delayMs as number, callbackIncludes: entry.callbackIncludes, factor: entry.factor });
  }
  return boosts;
}

export function validateRules(x: unknown): RemoteRules | null {
  if (!record(x) || !Number.isSafeInteger(x.version) || (x.version as number) < 1 || !record(x.youtube)) return null;
  const y = x.youtube;
  const boosts = timerBoosts(y.timerBoosts);
  if (!strings(y.prunePaths) || !strings(y.responseUrlIncludes) || !strings(y.hideSelectors)
    || !validString(y.adShowingSelector) || !strings(y.skipButtonSelectors)
    || typeof y.maxPlaybackRate !== 'number' || !Number.isFinite(y.maxPlaybackRate)
    || y.maxPlaybackRate < 1 || y.maxPlaybackRate > 16 || boosts === null) return null;
  return {
    version: x.version as number,
    youtube: {
      prunePaths: [...y.prunePaths], responseUrlIncludes: [...y.responseUrlIncludes],
      hideSelectors: [...y.hideSelectors], adShowingSelector: y.adShowingSelector,
      skipButtonSelectors: [...y.skipButtonSelectors], maxPlaybackRate: y.maxPlaybackRate,
      timerBoosts: boosts,
    },
  };
}

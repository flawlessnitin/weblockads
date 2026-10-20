export interface RemoteRules {
  version: number;
  youtube: {
    prunePaths: string[];
    responseUrlIncludes: string[];
    hideSelectors: string[];
    adShowingSelector: string;
    skipButtonSelectors: string[];
    maxPlaybackRate: number;
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

export function validateRules(x: unknown): RemoteRules | null {
  if (!record(x) || !Number.isSafeInteger(x.version) || (x.version as number) < 1 || !record(x.youtube)) return null;
  const y = x.youtube;
  if (!strings(y.prunePaths) || !strings(y.responseUrlIncludes) || !strings(y.hideSelectors)
    || !validString(y.adShowingSelector) || !strings(y.skipButtonSelectors)
    || typeof y.maxPlaybackRate !== 'number' || !Number.isFinite(y.maxPlaybackRate)
    || y.maxPlaybackRate < 1 || y.maxPlaybackRate > 16) return null;
  return {
    version: x.version as number,
    youtube: {
      prunePaths: [...y.prunePaths], responseUrlIncludes: [...y.responseUrlIncludes],
      hideSelectors: [...y.hideSelectors], adShowingSelector: y.adShowingSelector,
      skipButtonSelectors: [...y.skipButtonSelectors], maxPlaybackRate: y.maxPlaybackRate,
    },
  };
}
